# Repository Onboarding for AI Agents

## What this repository does

TheLeb Creations is a French-language, static storefront for handmade products.
It is built with Astro and managed through TinaCMS so non-technical editors can update content.

Primary goals:

- Fully static output
- Simple content editing for French-speaking users
- Product browsing, filtering, and contact workflow

## Architecture

- Rendering model: Astro static build (`output: 'static'`)
- Styling: Tailwind CSS v4 through Vite plugin + DaisyUI + custom CSS
- Content source: Markdown files in `content/` validated by Astro content collections
- CMS layer: TinaCMS schema in `tina/config.ts` editing repo-backed Markdown
- Search: Pagefind index generated at build time + client modal in `SearchModal.astro`
- Contact: EmailJS client-side submission in `ContactForm.astro`
- Deployment: GitHub Actions builds `dist/` and publishes to `gh-pages`

### Runtime behavior that must stay aligned

- Product status values are stored as `disponible`, `reserve`, `vendu`.
- Product CTA on product pages stays active for all statuses and links to `/contact?sujet=...`.
- Contact prefill currently reads query parameter `sujet`.
- Search indexes only product pages (`/boutique/[slug]`).
- Search requires at least 3 characters before querying.
- Search ranks `disponible` results ahead of `reserve` and `vendu`.
- Root-relative links are used throughout and assume root-domain deployment.

## Repository layout

```text
.
|- content/
|  |- articles/              # Product markdown files
|  |- singletons/            # accueil.md, a-propos.md
|- public/
|  |- admin/                 # Tina admin build output/assets
|  |- uploads/               # Product images
|- scripts/
|  |- vinted-ingest.mjs      # CLI to ingest one Vinted listing into content + images
|  |- sync-articles-vedette.mjs # Sync accueil articlesVedette with vedette: true articles
|- src/
|  |- content.config.ts       # Astro content schemas and enum validation
|  |- components/
|  |  |- SearchModal.astro     # Client search modal using Pagefind runtime API
|  |- layouts/
|  |- pages/
|  |- styles/
|- tina/
|  |- config.ts               # Tina schema, enums, editor configuration
|  |- __generated__/
|- astro.config.mjs
|- README.md
|- SPEC.md
|- AGENTS.md
```

## Technology stack

| Component | Choice |
|---|---|
| Runtime | Node.js >= 22.12.0 |
| Framework | Astro 6 |
| Language mode | TypeScript strict |
| Styling | Tailwind CSS v4 + DaisyUI |
| CMS | TinaCMS |
| Form delivery | EmailJS browser SDK |
| Hosting | GitHub Pages |

## Key content model rules

- Articles live in `content/articles/*.md`.
- Singletons live in `content/singletons/accueil.md` and `content/singletons/a-propos.md`.
- Article images are repo files under `public/uploads/`.
- Keep enum values synchronized between `tina/config.ts` and `src/content.config.ts`.
- Slugs are filename-based and used by route `/boutique/[slug]`.
- `quantite` must be an integer >= 1.

Supported enum keys:

- `categorie`: `accessoires-telephone`, `hygiene-et-soin`, `porte-cles`, `sacs`, `essuie-mains`, `bavoirs`, `porte-monnaies`, `decorations`, `socquettes`, `doudous`, `autre`
- `theme`: `ludique`, `breton`, `nature`, `animaux`, `mer`, `poissons`, `noel`, `dinosaures`, `bonhommes`, `sante`, `musique`, `voyage`, `abstrait`, `carreaux`, `pois`, `autre`
- `statut`: `disponible`, `reserve`, `vendu`

## Working conventions for agents

- Prefer minimal, localized edits over broad refactors.
- Keep all user-facing copy in French unless a task explicitly requests otherwise.
- Do not introduce SSR or server-only behavior.
- Do not change routing semantics (`/boutique`, `/boutique/[slug]`, `/contact`, `/a-propos`) unless requested.
- Preserve `/contact?sujet=...` integration when adjusting product/contact flows.
- When changing enums or schema fields, update both Tina schema and Astro content schema in the same change.
- Do not hardcode secrets; EmailJS and Tina credentials come from environment variables/secrets.
- Avoid editing generated/vendor-like files unless necessary (`tina/__generated__`, large hashed assets under `public/admin/assets`).

## Commands

Install dependencies:

```bash
npm install
```

Run local development (Astro + TinaCMS):

```bash
npm run dev
```

Build production output:

```bash
npm run build
```

Notes:

- Build runs `tinacms build`, `astro build`, then Pagefind indexing into `dist/pagefind/`.
- Search is not available in `npm run dev` because index generation is build-time only.

Preview production build:

```bash
npm run preview
```

Ingest one Vinted listing into content and images:

```bash
npm run ingest:vinted -- --url <vinted-url> --slug <slug> --quantite <n> --categorie <key> --theme <key> [--vedette true|false] [--dry-run]
```

Synchronize featured homepage references with `vedette: true` article flags:

```bash
npm run sync:articlesVedette
```

Notes:

- Ingest validates `categorie` and `theme` against `tina/config.ts`.
- Slug collisions are blocked.
- Description formatting is sentence-by-sentence with Markdown hard breaks.
- `sync:articlesVedette` rewrites `content/singletons/accueil.md` only when counts differ between `vedette: true` articles and `articlesVedette` entries.

## Validation guidance

After code changes, run at least:

```bash
npm run build
```

For functional UI/content updates, also verify manually in dev mode:

- Catalogue filtering and status badges
- Product page CTA behavior by status
- Contact subject prefill via `?sujet=`
- Tina admin access at `/admin/index.html`

For search-related updates, verify in preview mode (`npm run build` + `npm run preview`):

- Search opens from nav and focuses input
- Minimum query length gating (3 characters)
- Results include only product pages
- Status-priority ordering (`disponible` > `reserve` > `vendu`)

If you modify docs-relevant behavior, update README.md and AGENTS.md accordingly.

## Deployment and environment notes

- CI expects Tina and EmailJS variables in GitHub Actions secrets.
- Build must produce `dist/admin/index.html` for Tina admin.
- Current config assumes site root deployment (`https://thelebcreations.github.io`).
  If deployment target changes to a subpath, update Astro `base` and internal links.

## Trust these instructions

This file is intended to be the authoritative guide for an agent working in this repository.
- Use it first for project scope, layout, and validation.
- Avoid extra exploration unless the repo changes or the task cannot be completed with the information here.