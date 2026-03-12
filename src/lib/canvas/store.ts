import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import type {
  SceneNode,
  GroupNode,
  HistoryState,
  FabricJSON,
  NodeType,
} from './types'
import {
  NodeNotFoundError,
  InvalidOperationError,
  getSchemaForNodeType,
  validateTree,
  SceneNodeSchema,
} from './types'

// ─────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────

/**
 * Depth-first search for a node by ID within an Immer draft tree.
 * Returns the mutable draft reference so Immer can track mutations.
 */
function findNodeInTree(root: SceneNode, nodeId: string): SceneNode | null {
  if (root.id === nodeId) return root

  if (root.type === 'group') {
    for (const child of root.objects) {
      const found = findNodeInTree(child, nodeId)
      if (found) return found
    }
  }

  return null
}

/**
 * Builds a flat Map<id, SceneNode> index from a tree.
 * Used to populate the _nodeIndex for O(1) lookups on immutable snapshots.
 */
function buildNodeIndex(root: SceneNode): Map<string, SceneNode> {
  const index = new Map<string, SceneNode>()

  function traverse(node: SceneNode): void {
    index.set(node.id, node)
    if (node.type === 'group') {
      node.objects.forEach(traverse)
    }
  }

  traverse(root)
  return index
}

/**
 * Collects the path of node IDs from root to the target node.
 * Returns an array like ['root-id', 'parent-id', 'target-id'], or empty if not found.
 */
function getNodePathInTree(
  root: SceneNode,
  targetId: string,
  currentPath: string[] = []
): string[] {
  const path = [...currentPath, root.id]

  if (root.id === targetId) return path

  if (root.type === 'group') {
    for (const child of root.objects) {
      const result = getNodePathInTree(child, targetId, path)
      if (result.length > 0) return result
    }
  }

  return []
}

/**
 * Finds the parent GroupNode of a given node via DFS.
 * Returns null if the node is the root or not found.
 */
function findParentNode(
  root: SceneNode,
  targetId: string
): (SceneNode & { type: 'group' }) | null {
  if (root.type !== 'group') return null

  for (const child of root.objects) {
    if (child.id === targetId) return root as SceneNode & { type: 'group' }

    if (child.type === 'group') {
      const found = findParentNode(child, targetId)
      if (found) return found
    }
  }

  return null
}

// ─────────────────────────────────────────────
// State & Actions Interfaces
// ─────────────────────────────────────────────

const HISTORY_MAX_SIZE = 50

interface CanvasState {
  /** Root node of the Scene Graph (always a GroupNode or null) */
  root: GroupNode | null

  /** Currently selected node IDs */
  selectedNodeIds: string[]

  /** Undo/Redo history */
  history: HistoryState

  /** Flat index for O(1) node lookups — rebuilt after each tree mutation */
  _nodeIndex: Map<string, SceneNode>
}

interface CanvasActions {
  // ── Node mutations ──────────────────────────

  /**
   * Updates a single property on a node, with Zod validation.
   * Throws NodeNotFoundError if node doesn't exist.
   * Throws ZodError if value fails schema validation.
   */
  updateNodeProperty: (
    nodeId: string,
    property: string,
    value: unknown
  ) => void

  /**
   * Updates multiple properties on a node in a single atomic operation.
   * Each value is validated individually against the node's Zod schema.
   */
  updateMultipleProperties: (
    nodeId: string,
    updates: Record<string, unknown>
  ) => void

  /**
   * Deletes a node from the tree by ID.
   * Throws NodeNotFoundError if node doesn't exist.
   * Throws InvalidOperationError if trying to delete the root.
   */
  deleteNode: (nodeId: string) => void

  // ── Selection ───────────────────────────────

  selectNode: (nodeId: string) => void
  selectMultipleNodes: (nodeIds: string[]) => void
  clearSelection: () => void

  // ── Z-Index ─────────────────────────────────

  /** Moves node to the end of its parent's objects array (visually on top). */
  bringToFront: (nodeId: string) => void
  /** Moves node to the start of its parent's objects array (visually behind). */
  sendToBack: (nodeId: string) => void
  /** Moves node one position forward in its parent's objects array. */
  bringForward: (nodeId: string) => void
  /** Moves node one position backward in its parent's objects array. */
  sendBackward: (nodeId: string) => void

  // ── Layout ──────────────────────────────────

  /** Centers a node within its parent, accounting for scale and origin. */
  centerNode: (nodeId: string) => void

  // ── History ─────────────────────────────────

  undo: () => void
  redo: () => void

  // ── Queries ─────────────────────────────────

  findNodeById: (nodeId: string) => SceneNode | null
  getNodePath: (nodeId: string) => string[]

  // ── Serialization ───────────────────────────

  exportToJSON: () => FabricJSON | null

  // ── Initialization ──────────────────────────

  /**
   * Loads and validates an external Fabric.js JSON tree into the store.
   * Resets history and rebuilds the node index.
   */
  loadFromJSON: (json: unknown) => void
}

export type CanvasStore = CanvasState & CanvasActions

// ─────────────────────────────────────────────
// Store Creation
// ─────────────────────────────────────────────

export const useCanvasStore = create<CanvasStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // ── Initial state ───────────────────────

        root: null,
        selectedNodeIds: [],
        history: {
          past: [],
          present: null as unknown as GroupNode,
          future: [],
          maxSize: HISTORY_MAX_SIZE,
        },
        _nodeIndex: new Map(),

        // ── Node mutations ──────────────────────

        updateNodeProperty: (
          nodeId: string,
          property: string,
          value: unknown
        ) => {
          const state = get()
          if (!state.root) {
            throw new InvalidOperationError('Scene Graph is not initialized')
          }

          // 1. Verify node exists (read from immutable snapshot)
          const existingNode = state._nodeIndex.get(nodeId)
          if (!existingNode) {
            throw new NodeNotFoundError(nodeId)
          }

          // 2. Validate the new value against the node's Zod schema
          //    Build a clone of the node with the updated property and parse it
          const updatedSnapshot = { ...existingNode, [property]: value }
          const parseResult = SceneNodeSchema.safeParse(updatedSnapshot)
          if (!parseResult.success) {
            throw parseResult.error
          }

          // 3. Apply mutation inside Immer draft
          set((draft) => {
            const draftNode = findNodeInTree(draft.root!, nodeId)
            if (!draftNode) return

            // Mutate the draft (Immer tracks this)
            ;(draftNode as Record<string, unknown>)[property] = value

            // Push current root to history.past for undo
            // NOTE: draft.history is also an Immer draft, so push mutates safely
            draft.history.past.push(
              JSON.parse(JSON.stringify(draft.root)) as GroupNode
            )
            draft.history.future = []

            // Trim history to max size
            if (draft.history.past.length > draft.history.maxSize) {
              draft.history.past.shift()
            }
          })

          // 4. Rebuild the flat index after the tree changed
          const newState = get()
          if (newState.root) {
            set({ _nodeIndex: buildNodeIndex(newState.root) })
          }
        },

        updateMultipleProperties: (
          nodeId: string,
          updates: Record<string, unknown>
        ) => {
          const state = get()
          if (!state.root) {
            throw new InvalidOperationError('Scene Graph is not initialized')
          }

          const existingNode = state._nodeIndex.get(nodeId)
          if (!existingNode) {
            throw new NodeNotFoundError(nodeId)
          }

          // Validate all updates together against the full schema
          const updatedSnapshot = { ...existingNode, ...updates }
          const parseResult = SceneNodeSchema.safeParse(updatedSnapshot)
          if (!parseResult.success) {
            throw parseResult.error
          }

          set((draft) => {
            const draftNode = findNodeInTree(draft.root!, nodeId)
            if (!draftNode) return

            for (const [prop, val] of Object.entries(updates)) {
              ;(draftNode as Record<string, unknown>)[prop] = val
            }

            draft.history.past.push(
              JSON.parse(JSON.stringify(draft.root)) as GroupNode
            )
            draft.history.future = []

            if (draft.history.past.length > draft.history.maxSize) {
              draft.history.past.shift()
            }
          })

          const newState = get()
          if (newState.root) {
            set({ _nodeIndex: buildNodeIndex(newState.root) })
          }
        },

        deleteNode: (nodeId: string) => {
          const state = get()
          if (!state.root) {
            throw new InvalidOperationError('Scene Graph is not initialized')
          }

          if (state.root.id === nodeId) {
            throw new InvalidOperationError('Cannot delete the root node')
          }

          if (!state._nodeIndex.has(nodeId)) {
            throw new NodeNotFoundError(nodeId)
          }

          set((draft) => {
            // Save snapshot for undo before deletion
            draft.history.past.push(
              JSON.parse(JSON.stringify(draft.root)) as GroupNode
            )
            draft.history.future = []

            if (draft.history.past.length > draft.history.maxSize) {
              draft.history.past.shift()
            }

            // Recursively search and remove the node from its parent
            function removeFromParent(parent: SceneNode): boolean {
              if (parent.type !== 'group') return false

              const idx = parent.objects.findIndex((c) => c.id === nodeId)
              if (idx !== -1) {
                parent.objects.splice(idx, 1)
                return true
              }

              return parent.objects.some(removeFromParent)
            }

            if (draft.root) {
              removeFromParent(draft.root)
            }
          })

          // Rebuild index and clear selection if deleted node was selected
          const newState = get()
          if (newState.root) {
            set((draft) => {
              draft._nodeIndex = buildNodeIndex(newState.root!)
              draft.selectedNodeIds = draft.selectedNodeIds.filter(
                (id) => id !== nodeId
              )
            })
          }
        },

        // ── Selection ───────────────────────────

        selectNode: (nodeId: string) => {
          set((draft) => {
            draft.selectedNodeIds = [nodeId]
          })
        },

        selectMultipleNodes: (nodeIds: string[]) => {
          set((draft) => {
            draft.selectedNodeIds = nodeIds
          })
        },

        clearSelection: () => {
          set((draft) => {
            draft.selectedNodeIds = []
          })
        },

        // ── Z-Index ──────────────────────────────

        bringToFront: (nodeId: string) => {
          const state = get()
          if (!state.root) throw new InvalidOperationError('Scene Graph is not initialized')
          if (state.root.id === nodeId) throw new InvalidOperationError('Cannot reorder the root node')
          if (!state._nodeIndex.has(nodeId)) throw new NodeNotFoundError(nodeId)

          // Find parent in immutable tree to check if already at front
          const parent = findParentNode(state.root, nodeId)
          if (!parent) throw new InvalidOperationError('Node has no parent group')

          const currentIndex = parent.objects.findIndex((n) => n.id === nodeId)
          if (currentIndex === parent.objects.length - 1) return // already at front

          set((draft) => {
            // Snapshot for undo
            draft.history.past.push(JSON.parse(JSON.stringify(draft.root)) as GroupNode)
            draft.history.future = []
            if (draft.history.past.length > draft.history.maxSize) draft.history.past.shift()

            const draftParent = findParentNode(draft.root!, nodeId)
            if (!draftParent) return

            const idx = draftParent.objects.findIndex((n) => n.id === nodeId)
            const [removed] = draftParent.objects.splice(idx, 1)
            draftParent.objects.push(removed)
          })

          const newState = get()
          if (newState.root) set({ _nodeIndex: buildNodeIndex(newState.root) })
        },

        sendToBack: (nodeId: string) => {
          const state = get()
          if (!state.root) throw new InvalidOperationError('Scene Graph is not initialized')
          if (state.root.id === nodeId) throw new InvalidOperationError('Cannot reorder the root node')
          if (!state._nodeIndex.has(nodeId)) throw new NodeNotFoundError(nodeId)

          const parent = findParentNode(state.root, nodeId)
          if (!parent) throw new InvalidOperationError('Node has no parent group')

          const currentIndex = parent.objects.findIndex((n) => n.id === nodeId)
          if (currentIndex === 0) return // already at back

          set((draft) => {
            draft.history.past.push(JSON.parse(JSON.stringify(draft.root)) as GroupNode)
            draft.history.future = []
            if (draft.history.past.length > draft.history.maxSize) draft.history.past.shift()

            const draftParent = findParentNode(draft.root!, nodeId)
            if (!draftParent) return

            const idx = draftParent.objects.findIndex((n) => n.id === nodeId)
            const [removed] = draftParent.objects.splice(idx, 1)
            draftParent.objects.unshift(removed)
          })

          const newState = get()
          if (newState.root) set({ _nodeIndex: buildNodeIndex(newState.root) })
        },

        bringForward: (nodeId: string) => {
          const state = get()
          if (!state.root) throw new InvalidOperationError('Scene Graph is not initialized')
          if (state.root.id === nodeId) throw new InvalidOperationError('Cannot reorder the root node')
          if (!state._nodeIndex.has(nodeId)) throw new NodeNotFoundError(nodeId)

          const parent = findParentNode(state.root, nodeId)
          if (!parent) throw new InvalidOperationError('Node has no parent group')

          const currentIndex = parent.objects.findIndex((n) => n.id === nodeId)
          if (currentIndex === parent.objects.length - 1) return // already last

          set((draft) => {
            draft.history.past.push(JSON.parse(JSON.stringify(draft.root)) as GroupNode)
            draft.history.future = []
            if (draft.history.past.length > draft.history.maxSize) draft.history.past.shift()

            const draftParent = findParentNode(draft.root!, nodeId)
            if (!draftParent) return

            const idx = draftParent.objects.findIndex((n) => n.id === nodeId)
            // Swap with the next sibling
            const temp = draftParent.objects[idx + 1]
            draftParent.objects[idx + 1] = draftParent.objects[idx]
            draftParent.objects[idx] = temp
          })

          const newState = get()
          if (newState.root) set({ _nodeIndex: buildNodeIndex(newState.root) })
        },

        sendBackward: (nodeId: string) => {
          const state = get()
          if (!state.root) throw new InvalidOperationError('Scene Graph is not initialized')
          if (state.root.id === nodeId) throw new InvalidOperationError('Cannot reorder the root node')
          if (!state._nodeIndex.has(nodeId)) throw new NodeNotFoundError(nodeId)

          const parent = findParentNode(state.root, nodeId)
          if (!parent) throw new InvalidOperationError('Node has no parent group')

          const currentIndex = parent.objects.findIndex((n) => n.id === nodeId)
          if (currentIndex === 0) return // already first

          set((draft) => {
            draft.history.past.push(JSON.parse(JSON.stringify(draft.root)) as GroupNode)
            draft.history.future = []
            if (draft.history.past.length > draft.history.maxSize) draft.history.past.shift()

            const draftParent = findParentNode(draft.root!, nodeId)
            if (!draftParent) return

            const idx = draftParent.objects.findIndex((n) => n.id === nodeId)
            // Swap with the previous sibling
            const temp = draftParent.objects[idx - 1]
            draftParent.objects[idx - 1] = draftParent.objects[idx]
            draftParent.objects[idx] = temp
          })

          const newState = get()
          if (newState.root) set({ _nodeIndex: buildNodeIndex(newState.root) })
        },

        // ── Layout ───────────────────────────────

        centerNode: (nodeId: string) => {
          const state = get()
          if (!state.root) throw new InvalidOperationError('Scene Graph is not initialized')
          if (!state._nodeIndex.has(nodeId)) throw new NodeNotFoundError(nodeId)

          const node = state._nodeIndex.get(nodeId)!
          const nodePath = getNodePathInTree(state.root, nodeId)

          // Determine the parent to center within
          let parent: SceneNode
          if (nodePath.length > 1) {
            const parentId = nodePath[nodePath.length - 2]
            parent = state._nodeIndex.get(parentId)!
          } else {
            // Node is root — center within itself makes no sense
            throw new InvalidOperationError('Cannot center the root node')
          }

          // Calculate effective dimensions (width × scaleX, height × scaleY)
          const effectiveWidth = node.width * node.scaleX
          const effectiveHeight = node.height * node.scaleY

          // Base centered position (assumes originX='left', originY='top')
          let centerX = (parent.width / 2) - (effectiveWidth / 2)
          let centerY = (parent.height / 2) - (effectiveHeight / 2)

          // Adjust for originX
          if (node.originX === 'center') {
            centerX = centerX + (effectiveWidth / 2)
          } else if (node.originX === 'right') {
            centerX = centerX + effectiveWidth
          }

          // Adjust for originY
          if (node.originY === 'center') {
            centerY = centerY + (effectiveHeight / 2)
          } else if (node.originY === 'bottom') {
            centerY = centerY + effectiveHeight
          }

          set((draft) => {
            draft.history.past.push(JSON.parse(JSON.stringify(draft.root)) as GroupNode)
            draft.history.future = []
            if (draft.history.past.length > draft.history.maxSize) draft.history.past.shift()

            const draftNode = findNodeInTree(draft.root!, nodeId)
            if (!draftNode) return

            ;(draftNode as Record<string, unknown>).left = centerX
            ;(draftNode as Record<string, unknown>).top = centerY
          })

          const newState = get()
          if (newState.root) set({ _nodeIndex: buildNodeIndex(newState.root) })
        },

        // ── History ─────────────────────────────

        undo: () => {
          const state = get()
          if (state.history.past.length === 0) return

          set((draft) => {
            const previousRoot = draft.history.past.pop()
            if (!previousRoot) return

            // Save current state to future for redo
            if (draft.root) {
              draft.history.future.push(
                JSON.parse(JSON.stringify(draft.root)) as GroupNode
              )
            }

            draft.root = previousRoot
          })

          // Rebuild index
          const newState = get()
          if (newState.root) {
            set({ _nodeIndex: buildNodeIndex(newState.root) })
          }
        },

        redo: () => {
          const state = get()
          if (state.history.future.length === 0) return

          set((draft) => {
            const nextRoot = draft.history.future.pop()
            if (!nextRoot) return

            // Save current state to past for undo
            if (draft.root) {
              draft.history.past.push(
                JSON.parse(JSON.stringify(draft.root)) as GroupNode
              )
            }

            draft.root = nextRoot
          })

          // Rebuild index
          const newState = get()
          if (newState.root) {
            set({ _nodeIndex: buildNodeIndex(newState.root) })
          }
        },

        // ── Queries ─────────────────────────────

        findNodeById: (nodeId: string): SceneNode | null => {
          return get()._nodeIndex.get(nodeId) ?? null
        },

        getNodePath: (nodeId: string): string[] => {
          const root = get().root
          if (!root) return []
          return getNodePathInTree(root, nodeId)
        },

        // ── Serialization ───────────────────────

        exportToJSON: (): FabricJSON | null => {
          const root = get().root
          if (!root) return null

          return {
            version: '7.0.0',
            objects: root.objects as unknown[],
          }
        },

        // ── Initialization ──────────────────────

        loadFromJSON: (json: unknown) => {
          // Validate the full tree with Zod + structural checks
          const validatedRoot = validateTree(json)

          set((draft) => {
            draft.root = validatedRoot as GroupNode
            draft.selectedNodeIds = []
            draft.history = {
              past: [],
              present: validatedRoot as GroupNode,
              future: [],
              maxSize: HISTORY_MAX_SIZE,
            }
          })

          // Build the flat index for O(1) lookups
          set({ _nodeIndex: buildNodeIndex(validatedRoot) })
        },
      })),
      {
        name: 'canvas-storage',
        // Only persist the root tree, not transient state like selection or index
        partialize: (state) => ({ root: state.root }),
      }
    ),
    { name: 'CanvasEditorStore' }
  )
)

// ─────────────────────────────────────────────
// Selector Hooks (convenience)
// ─────────────────────────────────────────────

/**
 * Returns the first selected node, or null.
 */
export function useSelectedNode(): SceneNode | null {
  return useCanvasStore((state) => {
    const id = state.selectedNodeIds[0]
    return id ? state._nodeIndex.get(id) ?? null : null
  })
}

/**
 * Returns a specific property value from a node.
 * Uses shallow comparison to avoid unnecessary re-renders.
 */
export function useNodeProperty<T>(
  nodeId: string,
  property: string
): T | undefined {
  return useCanvasStore((state) => {
    const node = state._nodeIndex.get(nodeId)
    return node ? (node as Record<string, unknown>)[property] as T : undefined
  })
}

/**
 * Returns only the action functions (stable references, no re-renders).
 */
export function useCanvasActions() {
  return useCanvasStore((state) => ({
    updateNodeProperty: state.updateNodeProperty,
    updateMultipleProperties: state.updateMultipleProperties,
    deleteNode: state.deleteNode,
    selectNode: state.selectNode,
    selectMultipleNodes: state.selectMultipleNodes,
    clearSelection: state.clearSelection,
    bringToFront: state.bringToFront,
    sendToBack: state.sendToBack,
    bringForward: state.bringForward,
    sendBackward: state.sendBackward,
    centerNode: state.centerNode,
    undo: state.undo,
    redo: state.redo,
    loadFromJSON: state.loadFromJSON,
    exportToJSON: state.exportToJSON,
  }))
}
