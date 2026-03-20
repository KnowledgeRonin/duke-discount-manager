# API Reference — /api/templates

All routes are Next.js App Router route handlers that talk directly to Supabase via the server-side client. They return JSON unless noted otherwise.

Base path: `/api/templates`

---

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/templates` | List all templates (lightweight) |
| `POST` | `/api/templates` | Create a new template |
| `GET` | `/api/templates/:id` | Fetch a single template (with scene graph) |
| `PUT` | `/api/templates/:id` | Update a template |
| `DELETE` | `/api/templates/:id` | Delete a template |

---

## GET /api/templates

Returns a lightweight list of all templates — **does not include `scene_graph`** to keep the payload small for dashboard display.

### Response `200 OK`

```json
[
  {
    "id": "uuid",
    "name": "Summer Sale",
    "thumbnail": "https://…/thumbnails/abc.png",
    "created_at": "2025-03-01T10:00:00Z"
  }
]
```

Results are ordered by `created_at DESC` (newest first).

---

## POST /api/templates

Creates a new template.

### Request body

```json
{
  "name": "Summer Sale",
  "scene_graph": { "type": "group", "objects": [ … ] },
  "thumbnail": "https://…/thumbnails/abc.png"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Display name |
| `scene_graph` | GroupNode | Yes | Full scene graph JSON |
| `thumbnail` | string | No | Public URL of uploaded thumbnail image |

### Response `201 Created`

```json
{
  "id": "uuid",
  "name": "Summer Sale",
  "scene_graph": { … },
  "thumbnail": "https://…",
  "created_at": "2025-03-01T10:00:00Z"
}
```

### Error `400 Bad Request`

```json
{ "error": "name and scene_graph are required" }
```

---

## GET /api/templates/:id

Fetches a single template including the full `scene_graph`. Used when opening the editor for an existing template.

### Path parameter

| Param | Description |
|---|---|
| `id` | UUID of the template |

### Response `200 OK`

```json
{
  "id": "uuid",
  "name": "Summer Sale",
  "scene_graph": { "type": "group", "objects": [ … ] },
  "thumbnail": "https://…",
  "created_at": "2025-03-01T10:00:00Z",
  "updated_at": "2025-03-10T14:23:00Z"
}
```

### Error `404 Not Found`

```json
{ "error": "Template not found" }
```

---

## PUT /api/templates/:id

Updates one or more fields on an existing template. All body fields are optional — only provided fields are updated. `updated_at` is always set to the current timestamp.

### Path parameter

| Param | Description |
|---|---|
| `id` | UUID of the template |

### Request body

```json
{
  "name": "Winter Sale",
  "scene_graph": { "type": "group", "objects": [ … ] },
  "thumbnail": "https://…/thumbnails/new.png"
}
```

All fields are optional. Send only what changed.

### Response `200 OK`

Returns the updated template object (same shape as `GET /api/templates/:id`).

### Error `500 Internal Server Error`

```json
{ "error": "Failed to update template" }
```

---

## DELETE /api/templates/:id

Deletes a template. Does not delete the associated thumbnail from Supabase Storage.

### Path parameter

| Param | Description |
|---|---|
| `id` | UUID of the template |

### Response `204 No Content`

Empty body.

### Error `500 Internal Server Error`

```json
{ "error": "Failed to delete template" }
```

---

## Calling from the client

Do not call these endpoints directly from React components. Use the helper functions in `src/lib/supabase/templates.ts`:

```ts
import {
  getTemplates,       // GET /api/templates
  getTemplate,        // GET /api/templates/:id
  saveTemplate,       // POST /api/templates (also uploads thumbnail)
  updateTemplate,     // PUT /api/templates/:id (also uploads thumbnail)
  deleteTemplate,     // DELETE /api/templates/:id
} from '@/lib/supabase/templates';
```

These helpers handle thumbnail upload to Supabase Storage before calling the API, and return typed objects.

---

## Database Schema

```sql
create table templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  scene_graph jsonb not null,
  thumbnail   text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
```

The `scene_graph` column stores a serialized `GroupNode` (see [Scene Graph Architecture](../architecture/scene-graph.md)).
