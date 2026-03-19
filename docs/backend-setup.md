# Backend Setup — Duke Discount Manager

## Overview

The backend consists of three layers:

```
Next.js API Routes  ←→  Supabase SDK  ←→  Supabase (PostgreSQL + Storage)
```

- **Next.js API Routes** — the "windows" the frontend talks to
- **Supabase SDK** (`@supabase/supabase-js`) — the client that connects to Supabase
- **Supabase** — hosts the PostgreSQL database and the file storage bucket

No separate server is needed. Everything runs inside the Next.js project.

---

## 1. Supabase Project

### Create the project
1. Sign up at [supabase.com](https://supabase.com)
2. Click **New project**, give it a name, set a database password, choose a region
3. Wait ~2 minutes for provisioning

### Get the API keys
In **Settings → API**:
- **Project URL** — `https://<project-ref>.supabase.co`
- **anon public key** — the `eyJ...` string under "Project API keys"

---

## 2. Environment Variables

Create `.env.local` in the project root (never commit this file):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

`.env.local` is already in `.gitignore` by default in Next.js projects.

---

## 3. Supabase SDK

### Install

```bash
npm install @supabase/supabase-js
```

### Client singleton

`src/lib/supabase/client.ts` — created once and imported everywhere:

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

The `!` tells TypeScript these values are guaranteed to exist at runtime.

---

## 4. Database

### Table: `templates`

Run in the **Supabase SQL Editor**:

```sql
create table templates (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  scene_graph  jsonb not null,
  thumbnail    text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
```

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Auto-generated unique identifier |
| `name` | text | Name given by the user |
| `scene_graph` | jsonb | The full Scene Graph (`store.root`) — **not** Fabric.js JSON |
| `thumbnail` | text | Public URL pointing to the image in Supabase Storage |
| `created_at` | timestamptz | Set automatically on insert |
| `updated_at` | timestamptz | Updated manually on edit |

> **Why `scene_graph` and not Fabric JSON?**
> The Scene Graph is the project's own data abstraction, independent of Fabric.js.
> Saving Fabric JSON would couple the database to the rendering library — making future
> renderer changes require a data migration.

### Row Level Security (RLS)

Supabase enables RLS on all tables by default, which blocks every operation until you add policies. For the MVP (no auth yet), allow all operations:

```sql
alter table templates enable row level security;

create policy "Allow all for now"
on templates
for all
using (true)
with check (true);
```

> **When auth is added**, replace `true` with `auth.uid() = user_id` and add a
> `user_id uuid references auth.users` column to the table.

---

## 5. Storage

### Create the bucket

In **Supabase → Storage → New bucket**:
- **Name:** `thumbnails`
- **Public bucket:** ON

Thumbnails are not sensitive data — making the bucket public means URLs work directly
in `<img>` tags without requiring authenticated signed URLs.

### Storage RLS policy

```sql
create policy "Allow all uploads"
on storage.objects
for all
using (bucket_id = 'thumbnails')
with check (bucket_id = 'thumbnails');
```

---

## 6. API Routes

All endpoints live under `src/app/api/templates/` and use Next.js App Router conventions.

### `GET /api/templates`
Returns all templates without `scene_graph` (keeps the list response light).

### `POST /api/templates`
Creates a new template. Expects `{ name, scene_graph, thumbnail }`.

### `GET /api/templates/[id]`
Returns one full template including `scene_graph`. Used when opening the editor.

### `PUT /api/templates/[id]`
Partially updates a template. Only sends the fields that changed.

### `DELETE /api/templates/[id]`
Deletes a template. Returns `204 No Content`.

---

## 7. Template Service

`src/lib/supabase/templates.ts` — abstracts all template operations so components
never call `fetch` directly.

| Function | What it does |
|---|---|
| `saveTemplate(name, sceneGraph, thumbnailDataURL)` | Uploads thumbnail to Storage, then POSTs to API |
| `getTemplates()` | Fetches all templates for the Dashboard |
| `getTemplate(id)` | Fetches one template including scene_graph for the editor |
| `deleteTemplate(id)` | Deletes a template by ID |

### Thumbnail upload flow

```
canvas.getThumbnailDataURL()     → base64 data URL
        ↓
dataURLtoBlob()                  → converts to binary Blob
        ↓
supabase.storage.upload()        → uploads to 'thumbnails' bucket
        ↓
supabase.storage.getPublicUrl()  → returns the public URL
        ↓
saved as 'thumbnail' column in DB
```

---

## 8. Full Save Flow

```
User types name → clicks Save
        ↓
BlockEditor calls onSave(name)          [sidebar.tsx]
        ↓
Reads store.root → scene_graph          [page.tsx / Editor.tsx]
Reads canvas thumbnail → data URL
        ↓
saveTemplate(name, sceneGraph, dataURL) [templates.ts]
        ↓
Upload PNG → Supabase Storage → URL
POST /api/templates → Supabase DB
        ↓
Button shows "Saved!" for 2 seconds
```

---

## 9. File Reference

```
src/
├── lib/
│   └── supabase/
│       ├── client.ts          Supabase client singleton
│       └── templates.ts       Save, fetch, delete operations
│
└── app/
    └── api/
        └── templates/
            ├── route.ts       GET (list), POST (create)
            └── [id]/
                └── route.ts   GET (one), PUT (update), DELETE
```
