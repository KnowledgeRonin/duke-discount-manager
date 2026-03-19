# Canvas Store: Replace `persist` middleware with explicit save + patch-based undo history

**Labels:** `performance`, `architecture`, `canvas`, `tech-debt`
**Milestone:** Post-MVP / Before multi-select or large template support

---

## Context

The canvas store (`src/lib/canvas/store.ts`) currently uses Zustand's `persist` middleware to automatically save the scene graph (`root`) to `localStorage` after every state change. It also uses `JSON.parse(JSON.stringify(...))` to create full deep-clone snapshots of the entire tree for each undo/redo history entry.

This approach was fine for getting the editor working, but has three concrete failure modes that will become blockers as the project grows.

---

## Problem 1 — `persist` middleware will hit localStorage's size limit

### What happens today
Every time the user commits a change (moves an object, changes a color on blur, undoes, redoes), the entire `root` tree is serialized to JSON and written to `localStorage`.

### Why it will break
`localStorage` has a hard limit of ~5 MB in most browsers. A template with many SVG path nodes (each with potentially hundreds of path commands in `node.path`) can easily produce a multi-MB JSON. Once the payload exceeds the limit, `localStorage.setItem()` throws a `QuotaExceededError`. Zustand's `persist` middleware does **not** catch this error by default, so:

- The write silently fails
- On the next page load, the stored data could be partially corrupted or missing entirely
- The user loses their work with no warning

The debounce added in [this commit] reduces the frequency of writes during live dragging, but does not protect against size overflow on any individual committed action.

### What the fix looks like
Remove the `persist` middleware entirely. Manage persistence explicitly:

1. **Save on `beforeunload`** — writes to `localStorage` exactly once when the tab closes.
2. **Save on explicit user action** — a "Save" button (or auto-save after a committed change with a long debounce, e.g. 2 seconds).
3. **Rehydrate on mount** — read from `localStorage` once when the canvas component mounts.
4. **Wrap the write in a try/catch** — if `QuotaExceededError` is thrown, show a toast warning the user instead of silently failing.

```ts
// lib/canvas/persistence.ts

const STORAGE_KEY = 'canvas-scene'

export function saveScene(root: GroupNode): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ root }))
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      // Notify user — toast, alert, etc.
      console.error('[Canvas] localStorage quota exceeded — scene not saved.')
    }
  }
}

export function loadSavedScene(): GroupNode | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw).root ?? null
  } catch {
    return null
  }
}
```

Future upgrade path: swap `localStorage` for `IndexedDB` (async, no size limit) without changing the rest of the code.

---

## Problem 2 — Undo/redo history stores 50 full deep-clones of the tree (memory leak)

### What happens today
Every action that supports undo (`updateNodeProperty`, `updateMultipleProperties`, `deleteNode`, `addNode`, `bringToFront`, etc.) does:

```ts
draft.history.past.push(
  JSON.parse(JSON.stringify(draft.root)) as GroupNode
)
```

With `HISTORY_MAX_SIZE = 50`, there are up to **50 full copies of the entire scene** in memory simultaneously. For a template with 40 complex path objects, a single snapshot can be 200–500 KB. 50 of them = 10–25 MB just for undo history.

This also means that `JSON.parse(JSON.stringify(...))` runs synchronously on the main thread on every single committed action, which will cause noticeable jank on large templates.

### Why it will get worse
As templates grow in complexity (more SVG paths, more text nodes with style data, etc.), the cost of each deep-clone grows linearly. At 100+ objects per template the undo stack will be a real memory and performance problem.

### What the fix looks like
Replace full snapshots with **Immer patches**, which record only what changed between states (a diff), not the full tree.

Immer has built-in support for this via `produceWithPatches`:

```ts
import { produceWithPatches, applyPatches, type Patch } from 'immer'

// Instead of storing GroupNode snapshots:
interface HistoryEntry {
  patches: Patch[]      // forward patch (redo)
  inversePatches: Patch[] // reverse patch (undo)
}
```

A patch for "change fill of one node" is a few bytes instead of a full tree copy. This makes the undo stack ~100x smaller for typical edits.

The trade-off: patches are harder to inspect/debug than full snapshots. Not worth implementing until the snapshot approach actually causes measurable problems.

---

## Problem 3 — `_liveUpdateNodeId` only supports one live-updating node at a time

### What happens today
`updateNodePropertyLive` sets `state._liveUpdateNodeId` to signal the canvas subscriber to call the fast `syncNode()` instead of the full `syncTree()`. This is a `string | null`.

### Why it will break
If multi-select is implemented and the user bulk-changes a property on N selected nodes simultaneously (e.g. "change fill of all selected objects"), calling `updateNodePropertyLive` N times will set `_liveUpdateNodeId` to a different node ID each time. The canvas subscriber will only sync the last one; the other N-1 nodes won't update until the next full `syncTree`.

### What the fix looks like
Change `_liveUpdateNodeId: string | null` to `_liveUpdateNodeIds: Set<string>` (or `string[]`). The store clears the set after each render cycle, and the canvas subscriber iterates over it:

```ts
// In store state
_liveUpdateNodeIds: Set<string>

// In updateNodePropertyLive
draft._liveUpdateNodeIds = new Set([...draft._liveUpdateNodeIds, nodeId])

// In useCanvasRenderer subscriber
if (state._liveUpdateNodeIds.size > 0) {
  for (const id of state._liveUpdateNodeIds) {
    const node = state._nodeIndex.get(id)
    if (node) renderer.syncNode(node)
  }
  return
}
```

This is a small change and low risk. Worth doing at the same time as multi-select.

---

## Recommended order of implementation

| Priority | Problem | When to fix |
|---|---|---|
| High | Problem 1 — `persist` size limit + no error handling | Before shipping to real users or when templates start being complex |
| Medium | Problem 3 — `_liveUpdateNodeId` single node | When implementing multi-select |
| Low | Problem 2 — deep-clone undo history | When measurable memory pressure or jank is observed on large templates |

---

## Files affected

- `src/lib/canvas/store.ts` — all three problems live here
- `src/lib/canvas/useCanvasRenderer.ts` — Problem 3 subscriber logic
- New file: `src/lib/canvas/persistence.ts` — explicit save/load logic (Problem 1)
