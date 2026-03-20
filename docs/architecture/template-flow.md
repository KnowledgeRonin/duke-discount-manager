# Template Save / Load Flow

Templates are persisted in Supabase. The `scene_graph` column stores the full `GroupNode` JSON; thumbnails are uploaded to Supabase Storage.

All Supabase calls go through the helper functions in `src/lib/supabase/templates.ts`. React components never call Supabase directly.

---

## Data Types

```ts
// Lightweight — returned by the list endpoint
type SavedTemplate = {
  id: string;
  name: string;
  thumbnail: string | null;  // public URL from Supabase Storage
  created_at: string;
};

// Full — returned by the single-item endpoint
type SavedTemplateDetail = SavedTemplate & {
  scene_graph: GroupNode;
  updated_at: string;
};
```

---

## Save Flow (new template)

```
User clicks "Save" in Sidebar
        │
        ▼
sidebar.tsx
  saveTemplate(name, sceneGraph, thumbnailDataURL)    ← lib/supabase/templates.ts
        │
        ├─ [if thumbnail] dataURLtoBlob(thumbnailDataURL)
        │       │
        │       └─ supabase.storage
        │              .from('thumbnails')
        │              .upload(`${nanoid()}.png`, blob)
        │              → get public URL
        │
        └─ POST /api/templates
               body: { name, scene_graph: GroupNode, thumbnail: url | null }
                      │
                      ▼
               app/api/templates/route.ts
                 validates required fields
                 supabase.from('templates').insert(...)
                 returns 201 + template row
```

**Zustand localStorage auto-save** runs in parallel (independent of Supabase) — the store debounces writes to `localStorage` every 400 ms, providing session-level durability.

---

## Update Flow (existing template)

```
User clicks "Save" on an already-saved template
        │
        ▼
sidebar.tsx
  updateTemplate(id, name, sceneGraph, thumbnailDataURL)
        │
        ├─ [if new thumbnail] upload to Supabase Storage → get URL
        │
        └─ PUT /api/templates/:id
               body: { name?, scene_graph?, thumbnail? }
                      │
                      ▼
               app/api/templates/[id]/route.ts
                 supabase.from('templates').update({ ...fields, updated_at: now() })
                 returns updated template row
```

---

## Load Flow — Dashboard

```
User opens http://localhost:3000 (app/page.tsx)
        │
        ▼
useEffect → getTemplates()    ← lib/supabase/templates.ts
        │
        └─ GET /api/templates
                │
                ▼
           app/api/templates/route.ts
             SELECT id, name, thumbnail, created_at   ← no scene_graph (performance)
             ORDER BY created_at DESC
             returns SavedTemplate[]
        │
        ▼
Template cards rendered with thumbnails
User clicks a card → navigate to /editor/:id
```

---

## Load Flow — Editor

```
User opens /editor/:id (app/editor/[id]/page.tsx)
        │
        ▼
useEffect → getTemplate(id)    ← lib/supabase/templates.ts
        │
        └─ GET /api/templates/:id
                │
                ▼
           app/api/templates/[id]/route.ts
             SELECT *    ← includes full scene_graph
             returns SavedTemplateDetail (or 404)
        │
        ▼
store.loadScene(template.scene_graph)
  ├─ parser.loadFromFabricJSON(json)   → validates + builds GroupNode tree
  ├─ sets store.root
  ├─ rebuilds _nodeIndex (O(1) lookup map)
  └─ clears undo/redo history
        │
        ▼
useCanvasRenderer subscribes to store
  └─ root changed → CanvasRenderer.initialize(root)
        ├─ clears Fabric canvas
        ├─ creates Fabric objects from each SceneNode
        └─ calls fitToScreen()
```

---

## Delete Flow

```
User clicks "Delete" on a template card
        │
        ▼
deleteTemplate(id)    ← lib/supabase/templates.ts
        │
        └─ DELETE /api/templates/:id
                │
                ▼
           app/api/templates/[id]/route.ts
             supabase.from('templates').delete().eq('id', id)
             returns 204 No Content
```

Note: deleting a template does **not** delete its thumbnail from Supabase Storage. Cleanup must be done manually or via a Supabase storage lifecycle policy.

---

## localStorage vs Supabase

| | localStorage | Supabase |
|---|---|---|
| Scope | Current browser session | Permanent |
| Trigger | Automatic (Zustand persist, 400 ms debounce) | Manual (user clicks Save) |
| Content | Active `root` scene graph only | All saved templates + thumbnails |
| Survives page refresh | Yes | Yes |
| Survives clearing browser data | No | Yes |
| Used for | Recovery if user forgets to save | Real persistence and sharing |
