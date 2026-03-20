# Duke Discount Manager

A Canva-style coupon and discount template editor. Create, edit, and manage discount templates with a drag-and-drop canvas interface backed by a persistent database.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Further Reading](#further-reading)

---

## Project Overview

Duke Discount Manager lets a single authenticated user:

- Build discount/coupon templates on a Fabric.js canvas
- Drag shapes, text, and pre-made SVG elements from a sidebar library
- Adjust properties (fill, stroke, opacity, font, shadow, etc.) via a property panel
- Save and reload templates from Supabase (PostgreSQL + file storage)
- Undo / redo any canvas change

The canvas state is modelled as a **scene graph** — a typed, Zod-validated tree of nodes (text, rect, circle, path, group, …). This tree is the single source of truth for both rendering and persistence.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Canvas | Fabric.js 7 |
| State management | Zustand 5 + Immer |
| Schema validation | Zod 4 |
| Drag-and-drop | dnd-kit |
| Database | Supabase (PostgreSQL) |
| File storage | Supabase Storage (thumbnails) |
| Runtime | Node.js 18+ |
| Dev bundler | Turbopack (via `next dev`) |

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- A [Supabase](https://supabase.com) project with:
  - A `templates` table (see [Environment Variables](#environment-variables))
  - A `thumbnails` storage bucket (public read)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd duke-discount-manager

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Both variables are prefixed with `NEXT_PUBLIC_` so they are available in the browser as well as in server-side route handlers.

You can find these values in your Supabase project under **Settings → API**.

### Database Setup

Run the following SQL in the Supabase SQL editor to create the required table:

```sql
create table templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scene_graph jsonb not null,
  thumbnail text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Create a public storage bucket named `thumbnails` under **Storage** in your Supabase dashboard.

### Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Development Workflow

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with Turbopack (hot reload) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

### Branches

| Branch | Purpose |
|---|---|
| `main` | Stable, production-ready code |
| `scene-graph-experiments` | Active canvas architecture work |

### Key development patterns

- **All canvas mutations go through the Zustand store** — never modify Fabric objects directly.
- **`updateNodePropertyLive` + `commitLiveUpdate`** for drag interactions (keeps undo history clean — one entry per drag, not one per pixel).
- **Zod validates every node write** — `updateNodeProperty` will throw if you pass a value that fails the schema.
- **`useCanvasRenderer`** is the only place that bridges the store to Fabric.js. Keep canvas logic out of React components.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard — lists saved templates
│   ├── editor/
│   │   ├── page.tsx                # New blank template editor
│   │   └── [id]/page.tsx           # Edit existing template
│   └── api/
│       └── templates/
│           ├── route.ts            # GET (list) + POST (create)
│           └── [id]/route.ts       # GET / PUT / DELETE by ID
├── components/
│   ├── canvas/
│   │   ├── CanvasV2.tsx            # Fabric.js canvas React wrapper
│   │   └── FabricThumbnail.tsx     # Read-only thumbnail renderer
│   ├── editor/
│   │   └── Editor.tsx              # Main editor layout + drag-drop
│   └── sidebar/
│       └── sidebar.tsx             # Property panels + save/load UI
└── lib/
    ├── canvas/
    │   ├── types.ts                # Zod schemas for all node types
    │   ├── store.ts                # Zustand store (state + actions)
    │   ├── CanvasRenderer.ts       # Fabric.js rendering engine
    │   ├── useCanvasRenderer.ts    # React hook: store ↔ renderer bridge
    │   ├── parser.ts               # Fabric JSON → Scene Graph
    │   └── svgParser.ts            # SVG string → Scene Graph
    └── supabase/
        ├── client.ts               # Supabase client singleton
        └── templates.ts            # save / update / get / delete helpers
```

---

## Further Reading

- [Scene Graph Architecture](docs/architecture/scene-graph.md)
- [Template Save / Load Flow](docs/architecture/template-flow.md)
- [API Reference — /api/templates](docs/api/templates.md)
