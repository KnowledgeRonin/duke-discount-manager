# Canvas Scene Graph Architecture

The canvas is driven by a **scene graph** — a typed tree of nodes that serves as the single source of truth for both rendering and persistence. Fabric.js is a rendering detail; everything meaningful lives in the scene graph.

---

## Node Types

All nodes share a common `BaseNode` and are discriminated by a `type` field. The full set of types is defined in `src/lib/canvas/types.ts` using Zod schemas.

```
SceneNode
├── TextNode      (type: "textbox")
├── RectNode      (type: "rect")
├── CircleNode    (type: "circle")
├── LineNode      (type: "line")
├── PathNode      (type: "path")
├── PolygonNode   (type: "polygon")
├── ImageNode     (type: "image")
└── GroupNode     (type: "group")  ← also the root of the tree
```

### BaseNode — shared properties

| Category | Fields |
|---|---|
| Identity | `id` (nanoid), `type`, `name?` |
| Geometry | `left`, `top`, `width`, `height`, `angle` |
| Transform | `scaleX`, `scaleY`, `originX`, `originY`, `flipX`, `flipY`, `skewX`, `skewY` |
| Appearance | `opacity`, `fill` (color or `GradientFill`), `stroke`, `strokeWidth` |
| Shadow | `shadow?: Shadow` |
| Interaction | `locked`, `visible`, `selectable`, `evented` |

### TextNode — extends BaseNode

Extra fields: `text`, `fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `textAlign`, `lineHeight`, `charSpacing`, `textDecoration`, `textTransform` (none | uppercase | lowercase | capitalize).

`textTransform` is applied by `CanvasRenderer` at render time — it is **not** stored in the actual text string.

### GroupNode — the root and grouping unit

```ts
type GroupNode = BaseNode & {
  type: "group";
  objects: SceneNode[];         // child nodes (recursive)
  layoutManager?: string;       // optional Fabric layout manager hint
};
```

The root of the entire scene is always a `GroupNode`. Child groups represent grouped elements on the canvas.

### GradientFill

```ts
type GradientFill = {
  type: "linear" | "radial";
  colorStops: Array<{ offset: number; color: string }>;
  coords: { x1: number; y1: number; x2: number; y2: number };
};
```

`fill` on any node can be a plain color string or a `GradientFill` object.

---

## Constraints

Defined in `types.ts` and enforced by `validateTree()` at load time:

| Constraint | Value |
|---|---|
| `MAX_TREE_DEPTH` | 10 |
| `MAX_NODE_COUNT` | 1000 |
| Node IDs must be unique | enforced by `validateUniqueIds()` |

---

## Zustand Store

**File:** `src/lib/canvas/store.ts`

The store owns the live scene graph and all mutations.

### State shape

```ts
{
  root: GroupNode | null;
  selectedNodeIds: string[];
  history: { past: GroupNode[]; future: GroupNode[] };  // max 50 entries
  _nodeIndex: Map<string, SceneNode>;   // O(1) node lookup
  _liveUpdateSnapshot: GroupNode | null; // snapshot before a drag starts
}
```

### Key actions

| Action | Description |
|---|---|
| `updateNodeProperty(id, prop, value)` | Validated write + history entry |
| `updateNodePropertyLive(id, prop, value)` | Validated write, no history (for dragging) |
| `commitLiveUpdate()` | Pushes `_liveUpdateSnapshot` as one undo step |
| `updateMultipleProperties(id, updates)` | Atomic multi-prop write + history |
| `addNode(node)` | Appends to root's objects |
| `deleteNode(id)` | Removes node anywhere in tree |
| `bringToFront / sendToBack / bringForward / sendBackward` | Z-index reordering |
| `centerNode(id)` | Centers node within parent |
| `undo() / redo()` | History navigation |
| `loadScene(json)` | Parses Fabric JSON → tree, sets root, clears history |
| `exportToJSON()` | Returns Fabric-compatible JSON |

### Selectors

```ts
useSelectedNode()               // returns first selected SceneNode or null
useNodeProperty(id, property)   // reactive single-property selector
useCanvasActions()              // returns stable action references
```

### Persistence

The store uses Zustand `persist` middleware with a **400 ms debounce** to write `root` to `localStorage`. This is the auto-save for the current working session — it survives page refreshes but is separate from Supabase persistence.

---

## CanvasRenderer

**File:** `src/lib/canvas/CanvasRenderer.ts`

A plain class (not a React component) that owns the `fabric.Canvas` instance and keeps it in sync with the scene graph.

### Lifecycle

```
new CanvasRenderer(canvasEl)   → creates fabric.Canvas
  .initialize(root)            → full rebuild from scene graph
  .syncTree(root)              → re-sync after structural change (add/delete/reorder)
  .syncNode(node)              → update single Fabric object (property change)
  .dispose()                   → tears down canvas and event listeners
```

### Feedback loop prevention

When Fabric fires an event (e.g. `object:modified` after a drag), the renderer needs to push the new position back to the store. But that store update would trigger `syncNode`, which would write back to Fabric, causing an infinite loop.

The renderer uses an `_isSyncing` boolean flag. While processing a Fabric event, `_isSyncing = true` so that store subscription callbacks skip the Fabric write.

### Events emitted

The renderer emits custom events on the canvas element that `useCanvasRenderer` listens to:

| Event | Payload | When |
|---|---|---|
| `node:selected` | `{ nodeId }` | User clicks an object |
| `node:deselected` | — | User clicks empty canvas |
| `node:modified` | `{ nodeId, changes }` | User drags / transforms object |

---

## useCanvasRenderer Hook

**File:** `src/lib/canvas/useCanvasRenderer.ts`

The React bridge between the Zustand store and `CanvasRenderer`. This is the only place that should create or interact with the renderer.

```
Editor mounts
  → useCanvasRenderer(canvasRef)
      → new CanvasRenderer(canvasRef.current)
      → store.subscribe(root → syncTree / syncNode)
      → canvas.on('node:selected'  → store.selectNode)
      → canvas.on('node:modified'  → store.commitLiveUpdate)
Editor unmounts
      → renderer.dispose()
      → store.unsubscribe
```

The hook returns: `{ resize, exportImage, getThumbnailDataURL, syncNode, getRenderer }`.

---

## Data Flow Diagram

```
User interaction
      │
      ▼
  React component
      │  calls store action
      ▼
  Zustand store  ──────────────────────────────────────────┐
      │                                                     │
      │  subscription fires                        store.selectNode()
      ▼                                            store.commitLiveUpdate()
  useCanvasRenderer                                        ▲
      │  calls                                             │
      ▼                                                    │
  CanvasRenderer                                   canvas events
      │  reads/writes                         (node:selected, node:modified)
      ▼
  Fabric.js
      │  renders to
      ▼
  <canvas> element
```

---

## Parser

**File:** `src/lib/canvas/parser.ts`

Converts a raw Fabric.js JSON export (`{ objects: [...], ... }`) into a validated `GroupNode` tree.

Steps:
1. Extract `objects` array from Fabric JSON
2. Sanitize each object — strip Fabric-internal fields, assign `nanoid` IDs, apply type defaults
3. Wrap in a root `GroupNode`
4. Run `validateTree()` — throws if constraints are violated

**File:** `src/lib/canvas/svgParser.ts`

Converts an SVG string into a `GroupNode`. Used when dragging SVG items from the library panel.

Key step: `collapseTspans()` — preprocesses SVG text elements so each `<tspan>` line becomes a separate Fabric `Textbox` node rather than trying to reconstruct `lineHeight` from coordinate offsets.
