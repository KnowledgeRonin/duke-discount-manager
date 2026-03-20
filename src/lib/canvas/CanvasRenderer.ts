import * as fabric from 'fabric'
import type {
  SceneNode,
  GroupNode,
  TextNode,
  RectNode,
  CircleNode,
  LineNode,
  PolygonNode,
  PathNode,
} from './types'

// ─────────────────────────────────────────────
// Event callback types
// ─────────────────────────────────────────────

type NodeSelectedCallback = (nodeId: string) => void
type NodeDeselectedCallback = () => void
type NodeModifiedCallback = (
  nodeId: string,
  changes: Partial<SceneNode>
) => void

interface RendererEvents {
  'node:selected': Set<NodeSelectedCallback>
  'node:deselected': Set<NodeDeselectedCallback>
  'node:modified': Set<NodeModifiedCallback>
}

// ─────────────────────────────────────────────
// CanvasRenderer
// ─────────────────────────────────────────────

export class CanvasRenderer {
  private canvas: fabric.Canvas
  private objectMap: Map<string, fabric.FabricObject> = new Map()
  private listeners: RendererEvents = {
    'node:selected': new Set(),
    'node:deselected': new Set(),
    'node:modified': new Set(),
  }

  /**
   * Flag to prevent feedback loops:
   * When we sync state → canvas, Fabric fires events that would
   * dispatch back to the store. This flag suppresses that.
   */
  private _isSyncing = false

  constructor(canvasElement: HTMLCanvasElement, options?: fabric.TOptions<fabric.CanvasOptions>) {
    this.canvas = new fabric.Canvas(canvasElement, {
      preserveObjectStacking: true,
      selection: true,
      ...options,
    })

    this.setupEventListeners()
  }

  // ─────────────────────────────────────────────
  // Initialization
  // ─────────────────────────────────────────────

  /**
   * Initializes the canvas from a complete Scene Graph root.
   * Clears existing objects and rebuilds from scratch.
   */
  initialize(root: GroupNode): void {
    this._isSyncing = true
    this.canvas.clear()
    this.objectMap.clear()

    // The root GroupNode's children become top-level canvas objects
    for (const child of root.objects) {
      const fabricObj = this.createFabricObject(child)
      if (fabricObj) {
        this.canvas.add(fabricObj)
      }
    }

    this.canvas.requestRenderAll()
    this._isSyncing = false
  }

  // ─────────────────────────────────────────────
  // Sync: State → Canvas (partial update)
  // ─────────────────────────────────────────────

  /**
   * Synchronizes a single node's properties to its Fabric object.
   * Only updates changed properties — does NOT re-create or re-add.
   */
  syncNode(node: SceneNode): void {
    const fabricObject = this.objectMap.get(node.id)

    if (!fabricObject) {
      console.warn(`[CanvasRenderer] Fabric object not found for node "${node.id}"`)
      return
    }

    this._isSyncing = true

    // Common properties (BaseNode)
    fabricObject.set({
      left: node.left,
      top: node.top,
      width: node.width,
      height: node.height,
      angle: node.angle,
      scaleX: node.scaleX,
      scaleY: node.scaleY,
      originX: node.originX,
      originY: node.originY,
      flipX: node.flipX,
      flipY: node.flipY,
      skewX: node.skewX,
      skewY: node.skewY,
      opacity: node.opacity,
      visible: node.visible,
      fill: this.resolveFill(node.fill),
      stroke: node.stroke ?? undefined,
      strokeWidth: node.strokeWidth,
      strokeDashArray: node.strokeDashArray ?? undefined,
      shadow: node.shadow
        ? new fabric.Shadow({
          color: node.shadow.color,
          blur: node.shadow.blur,
          offsetX: node.shadow.offsetX,
          offsetY: node.shadow.offsetY,
        })
        : null,
      selectable: node.selectable,
      evented: node.evented,
      lockMovementX: node.lockMovementX,
      lockMovementY: node.lockMovementY,
      lockScalingX: node.lockScalingX,
      lockScalingY: node.lockScalingY,
      lockRotation: node.lockRotation,
      hasControls: node.hasControls,
      hasBorders: node.hasBorders,
    })

    // Text-specific properties
    if (node.type === 'textbox' && fabricObject instanceof fabric.Textbox) {
      fabricObject.set({
        text: node.text,
        fontFamily: node.fontFamily,
        fontSize: node.fontSize,
        fontWeight: node.fontWeight as string | number,
        fontStyle: node.fontStyle,
        underline: node.underline,
        linethrough: node.linethrough,
        overline: node.overline,
        charSpacing: node.charSpacing,
        lineHeight: node.lineHeight,
        textAlign: node.textAlign,
      })
    }

    // Rect-specific
    if (node.type === 'rect' && fabricObject instanceof fabric.Rect) {
      fabricObject.set({
        rx: node.rx,
        ry: node.ry,
      })
    }

    // Circle-specific
    if (node.type === 'circle' && fabricObject instanceof fabric.Circle) {
      fabricObject.set({
        radius: node.radius,
      })
    }

    // Line-specific
    if (node.type === 'line' && fabricObject instanceof fabric.Line) {
      fabricObject.set({
        x1: node.x1,
        y1: node.y1,
        x2: node.x2,
        y2: node.y2,
      })
    }

    fabricObject.setCoords()
    this.canvas.requestRenderAll()

    this._isSyncing = false
  }

  /**
   * Synchronizes the entire tree incrementally.
   * - Removes Fabric objects whose nodes no longer exist in the tree.
   * - Updates existing Fabric objects in-place via syncNode.
   * - Creates and adds new Fabric objects for nodes not yet on the canvas.
   */
  syncTree(root: GroupNode): void {
    this._isSyncing = true

    // 1. Collect all node IDs currently in the new tree
    const newNodeIds = new Set<string>()
    this.collectNodeIds(root, newNodeIds)

    // 2. Check if any currently selected Fabric objects will be removed.
    //    If so, discard the active selection BEFORE removing them so Fabric
    //    doesn't hold a stale reference to a non-existent object.
    const activeObjects = this.canvas.getActiveObjects()
    const willLoseSelection = activeObjects.some((obj) => {
      const id = (obj as fabric.FabricObject & { id?: string }).id
      return id !== undefined && !newNodeIds.has(id)
    })
    if (willLoseSelection || activeObjects.length === 0 && this.canvas.getActiveObject()) {
      this.canvas.discardActiveObject()
    }

    // 3. Remove Fabric objects whose nodes were deleted from the tree
    for (const [id, fabricObj] of this.objectMap) {
      if (!newNodeIds.has(id)) {
        this.canvas.remove(fabricObj)
        this.objectMap.delete(id)
      }
    }

    // 3. Update existing objects or create new ones
    for (const child of root.objects) {
      this.syncOrCreateNode(child)
    }

    // 4. Sync z-order: reorder canvas/group objects to match scene graph
    root.objects.forEach((node, targetIndex) => {
      const fabricObj = this.objectMap.get(node.id)
      if (fabricObj) this.canvas.moveObjectTo(fabricObj, targetIndex)
    })
    this.syncGroupZOrder(root)

    this.canvas.requestRenderAll()
    this._isSyncing = false
  }

  /**
   * Recursively reorders children inside Fabric Groups to match
   * the scene graph order. Call after syncOrCreateNode completes.
   */
  private syncGroupZOrder(groupNode: GroupNode): void {
    for (const child of groupNode.objects) {
      if (child.type !== 'group') continue
      const fabricGroup = this.objectMap.get(child.id)
      if (fabricGroup instanceof fabric.Group) {
        child.objects.forEach((grandchild, idx) => {
          const fabricChild = this.objectMap.get(grandchild.id)
          if (fabricChild) fabricGroup.moveObjectTo(fabricChild, idx)
        })
      }
      this.syncGroupZOrder(child)
    }
  }

  /**
   * Recursively collects all node IDs from a scene tree.
   */
  private collectNodeIds(node: SceneNode, ids: Set<string>): void {
    ids.add(node.id)
    if (node.type === 'group') {
      for (const child of node.objects) {
        this.collectNodeIds(child, ids)
      }
    }
  }

  /**
   * If a Fabric object already exists for this node, updates it in-place.
   * Otherwise, creates a new Fabric object and adds it to the canvas.
   */
  private syncOrCreateNode(node: SceneNode): void {
    const existing = this.objectMap.get(node.id)

    if (existing) {
      // Update in-place — reuse syncNode logic
      this.syncNode(node)
    } else {
      // Brand-new node — create and add to canvas
      const fabricObj = this.createFabricObject(node)
      if (fabricObj) {
        this.canvas.add(fabricObj)
      }
    }

    // Recurse into group children
    if (node.type === 'group') {
      for (const child of node.objects) {
        this.syncOrCreateNode(child)
      }
    }
  }

  // ─────────────────────────────────────────────
  // Object creation (SceneNode → FabricObject)
  // ─────────────────────────────────────────────

  private createFabricObject(node: SceneNode): fabric.FabricObject | null {
    let fabricObject: fabric.FabricObject

    const baseProps = this.getBaseProps(node)

    switch (node.type) {
      case 'textbox':
        fabricObject = this.createTextbox(node, baseProps)
        break
      case 'rect':
        fabricObject = this.createRect(node, baseProps)
        break
      case 'circle':
        fabricObject = this.createCircle(node, baseProps)
        break
      case 'line':
        fabricObject = this.createLine(node, baseProps)
        break
      case 'polygon':
        fabricObject = this.createPolygon(node, baseProps)
        break
      case 'path':
        fabricObject = this.createPath(node, baseProps)
        break
      case 'group':
        fabricObject = this.createGroup(node, baseProps)
        break
      default:
        console.warn(`[CanvasRenderer] Unknown node type: ${(node as SceneNode).type}`)
        return null
    }

    // Store the node id on the Fabric object for reverse lookups
    ; (fabricObject as fabric.FabricObject & { id?: string }).id = node.id

    // Register in O(1) lookup map
    this.objectMap.set(node.id, fabricObject)

    return fabricObject
  }

  private getBaseProps(node: SceneNode): Partial<fabric.FabricObjectProps> {
    return {
      left: node.left,
      top: node.top,
      width: node.width,
      height: node.height,
      angle: node.angle,
      scaleX: node.scaleX,
      scaleY: node.scaleY,
      originX: node.originX,
      originY: node.originY,
      flipX: node.flipX,
      flipY: node.flipY,
      skewX: node.skewX,
      skewY: node.skewY,
      opacity: node.opacity,
      visible: node.visible,
      fill: this.resolveFill(node.fill),
      stroke: node.stroke ?? undefined,
      strokeWidth: node.strokeWidth,
      strokeDashArray: (node as any).strokeDashArray ?? undefined,
      shadow: node.shadow
        ? new fabric.Shadow({
          color: node.shadow.color,
          blur: node.shadow.blur,
          offsetX: node.shadow.offsetX,
          offsetY: node.shadow.offsetY,
        })
        : undefined,
      selectable: node.selectable,
      evented: node.evented,
      lockMovementX: node.lockMovementX,
      lockMovementY: node.lockMovementY,
      lockScalingX: node.lockScalingX,
      lockScalingY: node.lockScalingY,
      lockRotation: node.lockRotation,
      hasControls: node.hasControls,
      hasBorders: node.hasBorders,
    }
  }

  private createTextbox(
    node: TextNode,
    baseProps: Partial<fabric.FabricObjectProps>
  ): fabric.Textbox {
    return new fabric.Textbox(node.text, {
      ...baseProps,
      fontFamily: node.fontFamily,
      fontSize: node.fontSize,
      fontWeight: node.fontWeight as string | number,
      fontStyle: node.fontStyle,
      underline: node.underline,
      linethrough: node.linethrough,
      overline: node.overline,
      charSpacing: node.charSpacing,
      lineHeight: node.lineHeight,
      textAlign: node.textAlign,
      editable: node.editable,
      splitByGrapheme: node.splitByGrapheme,
    })
  }

  private createRect(
    node: RectNode,
    baseProps: Partial<fabric.FabricObjectProps>
  ): fabric.Rect {
    return new fabric.Rect({
      ...baseProps,
      rx: node.rx,
      ry: node.ry,
    })
  }

  private createCircle(
    node: CircleNode,
    baseProps: Partial<fabric.FabricObjectProps>
  ): fabric.Circle {
    return new fabric.Circle({
      ...baseProps,
      radius: node.radius,
    })
  }

  private createLine(
    node: LineNode,
    baseProps: Partial<fabric.FabricObjectProps>
  ): fabric.Line {
    return new fabric.Line([node.x1, node.y1, node.x2, node.y2], {
      ...baseProps,
    })
  }

  private createPolygon(
    node: PolygonNode,
    baseProps: Partial<fabric.FabricObjectProps>
  ): fabric.Polygon {
    return new fabric.Polygon(node.points, {
      ...baseProps,
    })
  }

  private createPath(
    node: PathNode,
    baseProps: Partial<fabric.FabricObjectProps>
  ): fabric.Path {
    // Convert PathCommand[] to Fabric path string
    const pathString = node.path
      .map((cmd) => cmd.join(' '))
      .join(' ')

    return new fabric.Path(pathString, {
      ...baseProps,
    })
  }

  private createGroup(
    node: GroupNode,
    baseProps: Partial<fabric.FabricObjectProps>
  ): fabric.Group {
    const children: fabric.FabricObject[] = []

    for (const child of node.objects) {
      const childObj = this.createFabricObject(child)
      if (childObj) {
        children.push(childObj)
      }
    }

    return new fabric.Group(children, {
      ...baseProps,
      subTargetCheck: true,
      interactive: true,
    })
  }

  // ─────────────────────────────────────────────
  // Fabric → Store event listeners
  // ─────────────────────────────────────────────

  private setupEventListeners(): void {
    // Selection events
    const handleSelection = (e: { selected?: fabric.FabricObject[] }) => {
      if (this._isSyncing) return

      const selected = e.selected?.[0]
      if (!selected) return

      const id = this.resolveNodeId(selected)
      if (id) {
        this.emit('node:selected', id)
      }
    }

    this.canvas.on('selection:created', handleSelection)
    this.canvas.on('selection:updated', handleSelection)

    this.canvas.on('selection:cleared', () => {
      if (this._isSyncing) return
      this.emitDeselected()
    })

    // Object modified (after drag/scale/rotate)
    this.canvas.on('object:modified', (e) => {
      if (this._isSyncing) return

      const target = e.target
      if (!target) return

      const id = this.resolveNodeId(target)
      if (!id) return

      const changes: Partial<SceneNode> = {
        left: target.left,
        top: target.top,
        scaleX: target.scaleX,
        scaleY: target.scaleY,
        angle: target.angle,
      }

      this.emit('node:modified', id, changes)
    })

    // Text editing exited — sync the edited text content back to the store
    this.canvas.on('text:editing:exited', (e) => {
      if (this._isSyncing) return

      const target = e.target
      if (!target || !(target instanceof fabric.Textbox)) return

      const id = this.resolveNodeId(target)
      if (!id) return

      this.emit('node:modified', id, { text: target.text } as Partial<SceneNode>)
    })

  }

  /**
   * Resolves the SceneNode ID from a Fabric object.
   * If the object doesn't have an id, checks its parent group.
   */
  private resolveNodeId(obj: fabric.FabricObject): string | null {
    const withId = obj as fabric.FabricObject & { id?: string }
    if (withId.id) return withId.id

    // Check parent group
    const group = (obj as unknown as { group?: fabric.FabricObject & { id?: string } }).group
    if (group?.id) return group.id

    return null
  }

  // ─────────────────────────────────────────────
  // Event emitter
  // ─────────────────────────────────────────────

  on(event: 'node:selected', callback: NodeSelectedCallback): void
  on(event: 'node:deselected', callback: NodeDeselectedCallback): void
  on(event: 'node:modified', callback: NodeModifiedCallback): void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: keyof RendererEvents, callback: any): void {
    const set = this.listeners[event]
    if (set) {
      set.add(callback)
    }
  }

  off(event: 'node:selected', callback: NodeSelectedCallback): void
  off(event: 'node:deselected', callback: NodeDeselectedCallback): void
  off(event: 'node:modified', callback: NodeModifiedCallback): void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: keyof RendererEvents, callback: any): void {
    const set = this.listeners[event]
    if (set) {
      set.delete(callback)
    }
  }

  private emit(event: 'node:selected', nodeId: string): void
  private emit(event: 'node:deselected'): void
  private emit(event: 'node:modified', nodeId: string, changes: Partial<SceneNode>): void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private emit(event: keyof RendererEvents, ...args: any[]): void {
    const set = this.listeners[event]
    if (!set) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    set.forEach((cb: any) => cb(...args))
  }

  private emitDeselected(): void {
    this.listeners['node:deselected'].forEach((cb) => cb())
  }

  // ─────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────

  /**
   * Resolves fill value — converts GradientFill to Fabric Gradient,
   * or passes through color strings.
   */
  private resolveFill(
    fill: string | { type: string; coords: Record<string, number>; colorStops: Array<{ offset: number; color: string }> }
  ): string | fabric.Gradient<'linear'> | fabric.Gradient<'radial'> {
    if (typeof fill === 'string') return fill

    const stops = fill.colorStops.map((stop) => ({
      offset: stop.offset,
      color: stop.color,
    }))

    if (fill.type === 'radial') {
      return new fabric.Gradient<'radial'>({
        type: 'radial',
        coords: fill.coords as fabric.GradientCoords<'radial'>,
        colorStops: stops,
      })
    }

    return new fabric.Gradient<'linear'>({
      type: 'linear',
      coords: fill.coords as fabric.GradientCoords<'linear'>,
      colorStops: stops,
    })
  }

  /**
   * Returns the underlying Fabric Canvas instance.
   * Use sparingly — prefer working through the renderer API.
   */
  getCanvas(): fabric.Canvas {
    return this.canvas
  }

  /**
   * Finds a Fabric object by node ID (O(1) lookup).
   */
  findFabricObject(nodeId: string): fabric.FabricObject | undefined {
    return this.objectMap.get(nodeId)
  }

  /**
   * Discards the active Fabric selection.
   */
  discardSelection(): void {
    this.canvas.discardActiveObject()
    this.canvas.requestRenderAll()
  }

  /**
   * Sets the active Fabric object by node ID.
   */
  setActiveObject(nodeId: string): void {
    const obj = this.objectMap.get(nodeId)
    if (obj) {
      this.canvas.setActiveObject(obj)
      this.canvas.requestRenderAll()
    }
  }

  /**
   * Adjusts zoom and viewport so all objects fit within the visible canvas area.
   */
  fitToScreen(): void {
    const objects = this.canvas.getObjects()
    if (objects.length === 0) return

    // Calculate the bounding box of all objects (in canvas coordinates, before zoom)
    const bounds = objects.reduce(
      (acc, obj) => {
        const r = obj.getBoundingRect()
        return {
          left: Math.min(acc.left, r.left),
          top: Math.min(acc.top, r.top),
          right: Math.max(acc.right, r.left + r.width),
          bottom: Math.max(acc.bottom, r.top + r.height),
        }
      },
      { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
    )

    const contentW = bounds.right - bounds.left
    const contentH = bounds.bottom - bounds.top

    if (contentW <= 0 || contentH <= 0) return

    const canvasW = this.canvas.getWidth()
    const canvasH = this.canvas.getHeight()

    // Zoom to fit with padding
    const padding = 180
    const zoom = Math.min(
      (canvasW - padding * 2) / contentW,
      (canvasH - padding * 2) / contentH
    )

    // Center the content
    const vpX = (canvasW - contentW * zoom) / 2 - bounds.left * zoom
    const vpY = (canvasH - contentH * zoom) / 2 - bounds.top * zoom

    this.canvas.setZoom(zoom)
    this.canvas.setViewportTransform([zoom, 0, 0, zoom, vpX, vpY])
    this.canvas.requestRenderAll()
  }

  /**
   * Resizes the canvas to fill its container.
   */
  resize(width: number, height: number): void {
    this.canvas.setDimensions({ width, height })
    this.canvas.calcOffset()
    this.canvas.requestRenderAll()
  }

  /**
   * Returns the canvas as a base64 data URL without triggering a download.
   * Used internally for thumbnail generation before saving to the DB.
   */
  getThumbnailDataURL(multiplier = 1): string {
    this.canvas.discardActiveObject()
    this.canvas.renderAll()
    return this.canvas.toDataURL({ format: 'png', multiplier, quality: 0.8 })
  }

  /**
   * Exports the canvas as a PNG or JPEG and triggers a browser download.
   * Deselects all active objects before capturing so handles don't appear.
   */
  exportImage(options?: { format?: 'png' | 'jpeg'; multiplier?: number; quality?: number }): void {
    const { format = 'png', multiplier = 2, quality = 1 } = options ?? {}

    this.canvas.discardActiveObject()
    this.canvas.renderAll()

    const dataURL = this.canvas.toDataURL({ format, multiplier, quality })
    const date = new Date().toISOString().slice(0, 10)
    const filename = `discount-template-${date}.${format}`

    const link = document.createElement('a')
    link.href = dataURL
    link.download = filename
    link.click()
  }

  /**
   * Cleans up all resources.
   */
  dispose(): void {
    this.canvas.dispose()
    this.objectMap.clear()
    this.listeners['node:selected'].clear()
    this.listeners['node:deselected'].clear()
    this.listeners['node:modified'].clear()
  }
}
