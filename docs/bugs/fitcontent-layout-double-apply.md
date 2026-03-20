# Bug: FitContentLayout Double-Apply in CanvasRenderer

**Status:** Open (deferred post-MVP)
**Affected file:** `src/lib/canvas/CanvasRenderer.ts` — `createGroup()` method
**Symptom:** Objects inside groups (e.g. dashed border rects, vertical lines) render at wrong positions on the canvas. Reloading the page or viewing the sidebar thumbnail shows the correct positions.

---

## What the bug looks like

When a JSON template is added to the test canvas (`/test`), elements that should appear on the right side of the voucher (e.g. dashed border lines in `json5.tsx`) appear near the center instead. The sidebar thumbnail and the production canvas (`canvas.tsx`) show them correctly.

---

## Root cause

### Fabric.js v7 group serialization

When a `fabric.Group` is serialized with `group.toObject()`, each child's `left` and `top` are stored **relative to the group's center** (not the canvas origin). For example, a child at group-center + 45px gets stored as `left: 45`.

### The double-apply problem

`CanvasRenderer.createGroup()` reconstructs a group like this:

```typescript
// src/lib/canvas/CanvasRenderer.ts ~line 469
return new fabric.Group(children, {
  ...baseProps,
  subTargetCheck: true,
  interactive: true,
})
```

The `new fabric.Group(children, opts)` constructor triggers **FitContentLayout** by default. FitContentLayout:
1. Takes all children's current `left/top` values
2. Treats them as absolute canvas coordinates (not group-relative offsets)
3. Computes a bounding box from those values
4. Repositions the group and re-centers all children relative to the new bounding box center

Since the children's `left/top` were already group-relative offsets from the serialized JSON, FitContentLayout applies a second transformation on top of correct data — corrupting all child positions.

---

## Why the thumbnail and production canvas look correct

| Rendering path | How groups are created | Result |
|---|---|---|
| `FabricThumbnail` (`fabricThumbnail.tsx`) | `fabric.util.enlivenObjects([jsonData])` | Restores objects as-is, FitContentLayout does **not** re-run → **correct** |
| Production canvas (`canvas.tsx`) | `fabric.util.enlivenObjects([block.jsonData!])` | Same as above → **correct** |
| Test canvas (`/test` via `CanvasRenderer`) | `new fabric.Group(children, opts)` | FitContentLayout runs → **wrong** |

---

## Why reloading the page appears to fix it

On reload, Zustand rehydrates the `root` node from `localStorage` (saved by the `persist` middleware). The `syncTree` call in `useCanvasRenderer` runs `createGroup` again with the same buggy FitContentLayout — so the positions are still wrong. The perceived "fix" on reload is related to font loading timing:

- **Initial load:** Google Fonts are not yet cached → textbox objects use fallback font metrics → wrong dimensions → FitContentLayout computes a shifted bounding box center → all children shift visually
- **After reload:** Fonts are cached → correct textbox dimensions → FitContentLayout's bounding box is computed correctly (coincidentally matching the stored offsets) → visual output looks right

This means the bug is masked on reload by a secondary font-timing effect, not actually fixed.

---

## The fix (blocked by linter auto-revert)

Pass a `FixedLayout` strategy to the `fabric.Group` constructor. `FixedLayout` skips position recalculation entirely and preserves children's `left/top` values as-is:

```typescript
// In CanvasRenderer.createGroup():
const groupOptions: Partial<fabric.GroupProps> = {
  ...(baseProps as Partial<fabric.GroupProps>),
  layoutManager: new fabric.LayoutManager(new fabric.FixedLayout()),
  subTargetCheck: true,
  interactive: true,
}
return new fabric.Group(children, groupOptions)
```

`fabric.FixedLayout` and `fabric.LayoutManager` are available at runtime (confirmed with fabric v7.1.0). The fix was applied twice but was reverted each time by the linter or IDE auto-fix before it could be tested. The exact linter rule causing the revert was not identified.

---

## What to investigate when fixing

1. **Why the linter reverts the fix.** Check if `layoutManager` on the inline object literal causes a TypeScript error due to `baseProps` being typed as `Partial<fabric.FabricObjectProps>` instead of `Partial<fabric.GroupProps>`. The explicit cast `baseProps as Partial<fabric.GroupProps>` should resolve this.

2. **Alternative: use `enlivenObjects` in CanvasRenderer.** Instead of `new fabric.Group(children, opts)`, use `fabric.util.enlivenObjects` to reconstruct groups from the stored node data, the same way the thumbnail and production canvas do. This would be a more consistent architecture but requires more refactoring.

3. **json5.tsx dashed rect position.** The dashed border rect in `json5.tsx` has `left: -8.7282` with `originX: "center"`. This places its center only ~8.7px left of the group center, which means it spans nearly the full voucher width. Verify whether this value was incorrectly generated during the SVG-to-JSON conversion (`parseSVGToGroupNode`). If the original SVG has the dashed border centered (covering the whole voucher), then the stored value is correct and only the CanvasRenderer rendering bug makes it look wrong. If it should be offset to the right, the JSON data itself also needs to be regenerated.

---

## Files involved

| File | Role |
|---|---|
| `src/lib/canvas/CanvasRenderer.ts` | `createGroup()` at ~line 456 — where the fix goes |
| `src/lib/canvas/useCanvasRenderer.ts` | Calls `renderer.syncTree(state.root)` on store changes → triggers `createGroup` |
| `src/utils/fabricThumbnail.tsx` | Uses `enlivenObjects` → works correctly |
| `src/components/canvas/canvas.tsx` | Uses `enlivenObjects` → works correctly |
| `src/mockData/json5.tsx` | Template data with the dashed border rect at `left: -8.7282` |
