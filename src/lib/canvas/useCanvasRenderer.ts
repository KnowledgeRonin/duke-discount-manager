'use client'

import { useEffect, useRef, useCallback } from 'react'
import { CanvasRenderer } from './CanvasRenderer'
import { useCanvasStore } from './store'
import type { SceneNode } from './types'

/**
 * React hook that bridges the Zustand store ↔ CanvasRenderer.
 *
 * Responsibilities:
 * 1. Creates and manages the CanvasRenderer lifecycle.
 * 2. Subscribes to store changes and calls syncTree / syncNode.
 * 3. Listens to canvas events and dispatches actions back to the store.
 *
 * @param canvasRef - A React ref to the <canvas> element.
 * @param options   - Optional Fabric.js canvas configuration.
 */
export function useCanvasRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  options?: { width?: number; height?: number; backgroundColor?: string }
) {
  const rendererRef = useRef<CanvasRenderer | null>(null)

  // Store selectors — stable references
  const updateMultipleProperties = useCanvasStore(
    (s) => s.updateMultipleProperties
  )
  const selectNode = useCanvasStore((s) => s.selectNode)
  const clearSelection = useCanvasStore((s) => s.clearSelection)

  // Track the previous root reference to detect changes
  const prevRootRef = useRef<ReturnType<typeof useCanvasStore.getState>['root']>(null)

  // ─────────────────────────────────────────────
  // 1. Initialize renderer on mount
  // ─────────────────────────────────────────────
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return

    const renderer = new CanvasRenderer(el, {
      width: options?.width,
      height: options?.height,
      backgroundColor: options?.backgroundColor ?? '#F9FAFB',
    })
    rendererRef.current = renderer

    // Wire up canvas → store events
    renderer.on('node:selected', (nodeId: string) => {
      selectNode(nodeId)
    })

    renderer.on('node:deselected', () => {
      clearSelection()
    })

    renderer.on('node:modified', (nodeId: string, changes: Partial<SceneNode>) => {
      const safeChanges: Record<string, unknown> = {}
      if (changes.left !== undefined) safeChanges.left = changes.left
      if (changes.top !== undefined) safeChanges.top = changes.top
      if (changes.scaleX !== undefined) safeChanges.scaleX = changes.scaleX
      if (changes.scaleY !== undefined) safeChanges.scaleY = changes.scaleY
      if (changes.angle !== undefined) safeChanges.angle = changes.angle

      if (Object.keys(safeChanges).length > 0) {
        updateMultipleProperties(nodeId, safeChanges)
      }
    })

    // If the store already has a root, initialize the canvas
    const currentRoot = useCanvasStore.getState().root
    if (currentRoot) {
      renderer.initialize(currentRoot)
      prevRootRef.current = currentRoot
    }

    return () => {
      renderer.dispose()
      rendererRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef])

  // ─────────────────────────────────────────────
  // 2. Subscribe to store root changes → sync canvas
  // ─────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = useCanvasStore.subscribe((state, prevState) => {
      const renderer = rendererRef.current
      if (!renderer || !state.root) return

      // Root reference changed → full tree re-sync
      // This covers undo/redo, loadFromJSON, and structural changes
      if (state.root !== prevState.root) {
        renderer.syncTree(state.root)
      }
    })

    return unsubscribe
  }, [])

  // ─────────────────────────────────────────────
  // 3. Expose imperative API
  // ─────────────────────────────────────────────

  /**
   * Sync a single node to the canvas without full re-initialization.
   * Call this after targeted property changes for better performance.
   */
  const syncNode = useCallback((node: SceneNode) => {
    rendererRef.current?.syncNode(node)
  }, [])

  /**
   * Resize the canvas renderer to new dimensions.
   */
  const resize = useCallback((width: number, height: number) => {
    rendererRef.current?.resize(width, height)
  }, [])

  /**
   * Get the underlying CanvasRenderer instance.
   * Use sparingly — prefer the hook's API.
   */
  const getRenderer = useCallback(() => {
    return rendererRef.current
  }, [])

  return {
    rendererRef,
    syncNode,
    resize,
    getRenderer,
  }
}
