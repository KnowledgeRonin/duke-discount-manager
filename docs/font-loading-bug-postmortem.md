# Font Loading Bug: Thumbnails Rendering with Times New Roman

## Summary

Canvas thumbnails in the editor sidebar were rendering with Times New Roman instead of the
correct custom fonts (Big Shoulders Display, Poppins). The bug was intermittent in local
development but happened consistently in production on Vercel, especially with cache disabled.

---

## Context

The project is a Canva-like coupon template editor built with:
- **Next.js 15** (App Router)
- **Fabric.js** — renders canvas objects (text, shapes, groups)
- **Zustand** — canvas state store
- **Supabase** — stores saved templates and thumbnail images

There are two places thumbnails are generated:
1. **`FabricThumbnail.tsx`** — renders sidebar library items (static SVG/JSON templates) using an offscreen `fabric.StaticCanvas`
2. **`CanvasRenderer.getThumbnailDataURL()`** — captures the live canvas at save time; the result is stored in Supabase and displayed on the dashboard

---

## The Problem

When a user saves a template, `getThumbnailDataURL()` was called synchronously — it captured
the canvas before the custom fonts had finished downloading. Fabric.js fell back to Times New
Roman, which is the browser's default serif font.

The same issue applied to `FabricThumbnail.tsx`: fonts were not awaited before
`enlivenObjects` reconstructed the Fabric objects and `toDataURL` exported the image.

---

## Root Cause Investigation

### Wrong assumption: it was a Google Fonts network issue

Initial theory was that Google Fonts requests were timing out in production. Several
approaches were tried to force font loading before thumbnail capture:

- Retry loop: `document.fonts.load()` polled 20 × 50ms — always exhausted with cache disabled
- `document.fonts.ready` — a one-shot promise that doesn't wait for dynamically injected fonts
- `FontFace` API with `font-weight: "100 900"` variable range — silently failed in some browsers

None of these reliably worked.

### Root cause: `next/font/google` registers fonts under internal names

Next.js's `next/font/google` self-hosts Google Fonts at build time (no runtime network
requests). However, it registers each font under an **internal hashed class name**
(e.g. `__Big_Shoulders_Display_abc123`), not under the original family name.

```ts
// layout.tsx
const bigShoulders = Big_Shoulders_Display({
  subsets: ['latin'],
  weight: ['100', ..., '900'],
  variable: '--font-big-shoulders'  // CSS variable, NOT the font family name
});
```

Fabric.js text objects store `fontFamily: "Big Shoulders Display"` in JSON. When the canvas
renders, the browser looks for a font registered under that exact name. Because Next.js
registered it under an internal name, the browser had no match and fell back to Times New Roman.

`document.fonts.check('"Big Shoulders Display"')` returned `false` — confirming the font
wasn't registered under its original name. `document.fonts.load('"Big Shoulders Display"')`
returned an empty array `[]`, meaning there was nothing to load.

### Secondary issue: `getThumbnailDataURL()` was synchronous

Even after identifying the font naming problem, the thumbnail capture was synchronous — it
called `canvas.toDataURL()` immediately without waiting for any font loading to complete.

---

## Solution

### 1. Host fonts locally with explicit `@font-face` rules

Downloaded the woff2 files and placed them in `/public/fonts/`. Added `@font-face` rules in
`globals.css` using the **original family names** that Fabric.js expects:

```css
/* globals.css */
@font-face {
  font-family: "Big Shoulders Display";
  src: url("../../public/fonts/bigshouldersdisplay-extrabold-webfont.woff2") format("woff2");
  font-weight: 800;
  font-style: normal;
  font-display: swap;
}
```

This bridges the gap: the browser now knows `"Big Shoulders Display"` as a font family, and
`document.fonts.load('800 12px "Big Shoulders Display"')` resolves correctly.

### 2. Make `getThumbnailDataURL()` async and await fonts before capture

Updated `CanvasRenderer.ts` to collect the exact `family + weight` of every Textbox on the
canvas and call `document.fonts.load()` for each before capturing:

```ts
async getThumbnailDataURL(multiplier = 1): Promise<string> {
  const systemFonts = new Set(['Arial', 'Helvetica', 'Times New Roman', ...])
  const fontPairs: Array<{ family: string; weight: string | number }> = []

  const collectFonts = (objects: fabric.FabricObject[]) => {
    objects.forEach((obj) => {
      if (obj instanceof fabric.Textbox && obj.fontFamily) {
        const family = obj.fontFamily.split(',')[0].trim()
        if (!systemFonts.has(family)) {
          fontPairs.push({ family, weight: obj.fontWeight ?? 400 })
        }
      }
      if (obj instanceof fabric.Group) collectFonts(obj.getObjects())
    })
  }
  collectFonts(this.canvas.getObjects())

  if (fontPairs.length > 0) {
    await Promise.allSettled(
      fontPairs.map(({ family, weight }) =>
        document.fonts.load(`${weight} 12px "${family}"`)
      )
    )
  }

  this.canvas.discardActiveObject()
  this.canvas.renderAll()
  return this.canvas.toDataURL({ format: 'png', multiplier, quality: 0.8 })
}
```

Key decisions:
- **`Promise.allSettled` instead of `Promise.all`** — one font failing doesn't block the others
- **Weight is included in the load string** — `document.fonts.load('400 12px "Poppins"')` and
  `document.fonts.load('800 12px "Poppins"')` are different requests; omitting weight loads
  only the 400 variant and canvas still falls back for other weights

### 3. Same fix in `FabricThumbnail.tsx`

Applied the same pattern to the offscreen canvas used for sidebar thumbnails. Traverse the
JSON before calling `enlivenObjects` to collect font pairs, await `document.fonts.load()`,
then render:

```ts
async function ensureFontsLoaded(objects: any[]): Promise<void> {
  const pairs = collectFontPairs(objects) // traverses JSON for fontFamily + fontWeight
  if (pairs.length === 0) return
  await Promise.allSettled(
    pairs.map(({ family, weight }) =>
      document.fonts.load(`${weight} 12px "${family}"`)
    )
  )
}
```

Also fixed a subtle double-render bug: `fabric.util.enlivenObjects` in Fabric.js v6+ returns
a Promise **and** accepts a callback. Both were firing `renderAndExport`, causing `toDataURL`
to be called after the canvas had already been disposed. Added a `rendered` boolean flag to
guard against this.

### 4. Removed `fontLoader.ts` (the Google Fonts loader)

The file that fetched Google Fonts CSS at runtime, injected a `<style>` tag, and called
`document.fonts.forEach()` was deleted entirely. All font loading now goes through
`document.fonts.load()` against the locally hosted `@font-face` registrations.

---

## Why It Was Intermittent in Development

- In dev mode, fonts were often already cached from a previous page load, so `document.fonts`
  already had them ready — the bug didn't trigger
- With DevTools open and "Disable cache" checked, fonts were never cached — the bug appeared
  on every reload, which is how it was consistently reproduced
- In Vercel production, cold starts and CDN cache misses made the timing gap more pronounced

---

## Key Takeaways

| Lesson | Detail |
|--------|--------|
| `next/font/google` ≠ original font family names | It self-hosts fonts but registers them under internal names, not the names stored in Fabric.js JSON |
| Canvas capture must be async | `toDataURL()` is synchronous — fonts must be fully loaded before calling it |
| Include font weight in `document.fonts.load()` | Each weight is a separate font face; loading `400` doesn't guarantee `800` is ready |
| `Promise.allSettled` over `Promise.all` | One missing font file shouldn't break the entire thumbnail |
| Test with cache disabled | Intermittent font bugs only reliably reproduce with network cache disabled |
