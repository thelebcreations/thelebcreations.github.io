# TheLeb Créations

Boutique Créations Faites Main — a static e-commerce website for handmade creations. Built for zero-cost operation and easy content management.

## 🚀 Tech Stack

- **Framework:** [Astro](https://astro.build)
- **Styling:** Tailwind CSS + DaisyUI
- **CMS:** TinaCMS (for non-technical editors)
- **Forms:** EmailJS
- **Hosting:** GitHub Pages

## 📂 Features & Pages

- **`/` (Accueil):** Hero section, featured creations, and quick links.
- **`/boutique` (Catalogue):** Complete catalog with client-side filtering and sorting.
- **`/boutique/[slug]` (Article):** Individual item details, image gallery, and availability status.
- **Search modal:** Client-side search powered by Pagefind (indexed at build time).
- **`/a-propos` (À propos):** Presentation of the creator.
- **`/contact`:** Contact form integrated with EmailJS.
- **`/404`:** Custom error page.

## 🛠️ Local Development

### 1. Install dependencies
```bash
npm install
```

### 2. Start the development server
```bash
npm run dev
```

The site will be available at `http://localhost:4321`.
This command also starts the TinaCMS development server, which is available at `http://localhost:4321/admin/index.html`.

Note: Search indexing is build-time only, so search is not available in `npm run dev` mode.

### 3. Build for production
```bash
npm run build
```

This build command also generates the Pagefind index in `dist/pagefind/`.

### 4. Preview the production build (including search)
```bash
npm run preview
```

Use this mode to test search behavior locally.

## Search Behavior (Pagefind)

- Search scope is product detail pages only (`/boutique/[slug]`).
- Query length must be at least 3 characters.
- Results prioritize `disponible` articles over `reserve` and `vendu`.

## Ingest A Vinted Article

Use the CLI to create one new article markdown file and download its images.

### Dry-run (no file writes)
```powershell
npm run ingest:vinted -- `
  --url https://www.vinted.fr/items/8619691696-sac-fourre-tout `
  --slug sac-fourre-tout-guitare-breton `
  --quantite 1 `
  --categorie sacs `
  --theme musique `
  --vedette true `
  --dry-run
```

### Write files
```powershell
npm run ingest:vinted -- `
  --url https://www.vinted.fr/items/8619691696-sac-fourre-tout `
  --slug sac-fourre-tout-guitare-breton `
  --quantite 1 `
  --categorie sacs `
  --theme musique `
  --vedette true
```

Notes:
- `categorie` and `theme` are validated against allowed values from `tina/config.ts`.
- The body text is formatted sentence by sentence (split on `.`), with two trailing spaces and a newline per sentence for markdown line breaks.
- Slug collisions are blocked (existing article file causes an error).

## Sync Featured Articles

Keep `content/singletons/accueil.md` aligned with articles that have `vedette: true`:

```bash
npm run sync:articlesVedette
```

Behavior:
- Reads all files in `content/articles/*.md` with `vedette: true`.
- Compares that count with entries under `articlesVedette` in `content/singletons/accueil.md`.
- If counts match, no file is changed.
- If counts differ, rewrites `articlesVedette` with the current `vedette: true` list.