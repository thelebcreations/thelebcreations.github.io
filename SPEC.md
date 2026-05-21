# SPEC.md — Boutique Créations Faites Main

> Version 1.1 — Spécification alignée sur l'implémentation actuelle (Astro + TinaCMS + GitHub Pages).

---

## 1. Objectifs & Contraintes

| Contrainte | Détail |
|---|---|
| Coût | Zéro — setup et opération |
| Hébergement | GitHub Pages (site servi à la racine `https://thelebcreations.github.io`) |
| Rendu | 100% statique — zéro SSR |
| Éditeurs | 2 éditeurs non-techniques, francophones |
| Langue | Français uniquement |

---

## 2. Stack Technique

| Couche | Outil | Notes d'implémentation |
|---|---|---|
| Framework | [Astro](https://astro.build) | Build statique (`output: 'static'`) |
| Language | TypeScript (strict) | `astro/tsconfigs/strict` + validation de contenu Astro |
| Styling | Tailwind CSS v4 + DaisyUI + CSS custom | Tailwind injecté via plugin Vite `@tailwindcss/vite` |
| CMS | TinaCMS + Tina Cloud | Schéma dans `tina/config.ts`, build via CLI Tina |
| Formulaire | EmailJS (`@emailjs/browser`) | Client-side only, envoi via `emailjs.sendForm(...)` |
| Images | Repo-based (`/public/uploads/`) | Rendu actuel via `<img>` (lazy/eager), pas via `<Image>` Astro |
| CI/CD | GitHub Actions → GitHub Pages | Déploiement sur `gh-pages` à chaque push `main` |
| Analytics | Aucune | Zéro dépendance, zéro cookie banner |

---

## 3. Modèle de Contenu

### 3.1 Collection articles

Notes de nommage :
- Dossier de contenu : `content/articles/`
- Nom de collection TinaCMS : `article` (singulier)
- Nom de collection Astro Content : `article` (singulier)

Chaque article est un fichier Markdown géré par TinaCMS. Le slug (nom de fichier) est auto-généré depuis `titre`.

| Clé de donnée | Type | Requis | Notes |
|---|---|---|---|
| `titre` | `string` | ✅ | Nom de l'article |
| `description` | `rich-text` (body markdown) | ✅ éditorialement | Stocké dans le corps markdown |
| `prix` | `number` | ✅ | En euros |
| `categorie` | `enum` | ✅ | Voir valeurs §3.3 |
| `theme` | `enum` | ✅ | Voir valeurs §3.4 |
| `statut` | `enum` | ✅ | `disponible` / `reserve` / `vendu` |
| `quantite` | `number` | ✅ | Entier ≥ 1 |
| `images` | `image[]` | ✅ | 1 à 6 images dans `/public/uploads/` |
| `vedette` | `boolean` | ✅ | Défaut `false` |

### 3.2 Singletons

| Singleton | Champs |
|---|---|
| `accueil` | `articlesVedette[]` (liste ordonnée de références vers des `article`) |
| `a-propos` | `nom` (string), `photo` (image), `texte` (rich-text body) |

### 3.3 Valeurs `categorie` (clés stockées)

```
accessoires-telephone
hygiene-et-soin
porte-cles
sacs
essuie-mains
bavoirs
porte-monnaies
decorations
socquettes
doudous
autre
```

### 3.4 Valeurs `theme` (clés stockées)

```
ludique
breton
nature
animaux
mer
poissons
noel
dinosaures
bonhommes
sante
musique
voyage
abstrait
carreaux
pois
autre
```

---

## 4. Pages

### 4.1 Routing

```
/                       → Accueil
/boutique               → Catalogue complet
/boutique/[slug]        → Page individuelle article
/contact                → Formulaire de contact
/a-propos               → Présentation de la créatrice
/404                    → Page d'erreur custom
```

### 4.2 `/` — Accueil

- Hero + CTA vers `/boutique`
- Sélection en vedette priorisée par le singleton `accueil`
- Complément automatique avec les articles `vedette: true` non déjà référencés
- Les visuels des cartes en vedette utilisent un affichage portrait en ratio `3:4`, aligné sur les images source (600x800)
- Lien vers le catalogue complet

### 4.3 `/boutique` — Catalogue

- Grille de tous les articles
- Filtres client-side :
  - `categorie`
  - `theme`
  - `statut` (`disponible` / `reserve` / `vendu`)
- Tri client-side : prix croissant / décroissant
- Les articles `vendu` restent visibles, affichés en grisé avec badge/overlay
- Les articles `reserve` affichent un badge "Réservé"

### 4.4 `/boutique/[slug]` — Article

- Galerie d'images (1 à 6)
- La galerie principale et les miniatures respectent un affichage portrait en ratio `3:4`, sans recadrage haut/bas des visuels source (600x800)
- Affichage : titre, description, prix, catégorie, thème, statut, quantité
- Badge de statut
- CTA contextuel **toujours actif** :
  - `disponible` → "Commander"
  - `reserve` → "Signaler votre intérêt"
  - `vendu` → "Signaler votre intérêt"
- Redirection vers `/contact?sujet=...` (pas `?item=`)

### 4.5 `/contact` — Formulaire

Champs :

| Champ | Type | Requis | Notes |
|---|---|---|---|
| `nom` | text | ✅ | |
| `email` | email | ✅ | |
| `telephone` | text | ❌ | Optionnel |
| `sujet` | text | ✅ | Pré-rempli via `?sujet=...` |
| `message` | textarea | ✅ | |

Comportement :
- Pré-remplissage du `sujet` via `URLSearchParams` (`?sujet=`)
- Validation client-side custom (messages d'erreur par champ)
- Soumission via `emailjs.sendForm(...)`
- Feedback visuel succès / erreur + état de chargement

### 4.6 `/a-propos`

- Contenu piloté par le singleton `a-propos`
- Affichage conditionnel de la photo
- Rendu du body markdown (`texte`)

### 4.7 `/404`

- Page custom `src/pages/404.astro`
- GitHub Pages sert `404.html` pour les routes inexistantes

---

## 5. Architecture des Données

### 5.1 Fichiers de contenu

```
content/
├── articles/
│   ├── *.md
│   └── ...
└── singletons/
    ├── accueil.md
    └── a-propos.md
```

### 5.2 Images

```
public/
└── uploads/
    ├── <slug>-1.webp
    ├── <slug>-2.webp
    └── ...
```

- Les images sont servies depuis le repo (aucun CDN externe)
- Le rendu actuel utilise des balises `<img>` avec lazy/eager loading selon le contexte
- Limite recommandée : 6 images par article, < 2 Mo/image

---

## 6. Configuration Astro

### 6.1 `astro.config.mjs`

```ts
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://thelebcreations.github.io',
  output: 'static',
  vite: {
    plugins: [tailwindcss()]
  }
});
```

### 6.2 TypeScript

```json
// tsconfig.json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

### 6.3 Liens internes et `base`

- Le site est actuellement servi à la racine du domaine (`site` sans `base`).
- Les liens sont implémentés en chemins racine (`/boutique`, `/contact`, etc.).
- Si le site est migré vers un sous-chemin (`username.github.io/repo`), il faudra introduire `base` et adapter les liens.

---

## 7. Pipeline CI/CD

### 7.1 Flux

```
Éditeur (TinaCMS UI)
  → commit sur main
    → GitHub Actions déclenché
      → npm ci
      → npm run build (tinacms build && astro build)
        → vérification de dist/admin/index.html
          → suppression de dist/admin/.gitignore
            → publication de dist/ sur gh-pages
```

### 7.2 Workflow actuel

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v6.0.2

      - name: Setup Node.js
        uses: actions/setup-node@v6.4.0
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NODE_OPTIONS: "--max-old-space-size=6144"
          TINA_CLIENT_ID: ${{ secrets.TINA_CLIENT_ID }}
          TINA_TOKEN: ${{ secrets.TINA_TOKEN }}
          PUBLIC_EMAILJS_SERVICE_ID: ${{ secrets.PUBLIC_EMAILJS_SERVICE_ID }}
          PUBLIC_EMAILJS_TEMPLATE_ID: ${{ secrets.PUBLIC_EMAILJS_TEMPLATE_ID }}
          PUBLIC_EMAILJS_PUBLIC_KEY: ${{ secrets.PUBLIC_EMAILJS_PUBLIC_KEY }}

      - name: Verify Tina Admin Output
        shell: bash
        run: |
          if [ ! -f "dist/admin/index.html" ]; then
            echo "ERROR: dist/admin/index.html is missing. Tina admin was not generated."
            echo "dist/ contents:" && ls -la dist || true
            exit 1
          fi

      - name: Unignore Tina Admin Files For Publish
        shell: bash
        run: |
          rm -f dist/admin/.gitignore

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4.1.0
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          publish_branch: gh-pages
```

### 7.3 Secrets GitHub requis

| Secret | Usage |
|---|---|
| `TINA_CLIENT_ID` | Build TinaCMS |
| `TINA_TOKEN` | Build TinaCMS |
| `PUBLIC_EMAILJS_SERVICE_ID` | Service EmailJS (client) |
| `PUBLIC_EMAILJS_TEMPLATE_ID` | Template EmailJS (client) |
| `PUBLIC_EMAILJS_PUBLIC_KEY` | Clé publique EmailJS |

---

## 8. EmailJS

### 8.1 Template recommandé

```
Sujet : {{sujet}}

Nom     : {{nom}}
Email   : {{email}}
Tél.    : {{telephone}}

Message :
{{message}}
```

### 8.2 Intégration actuelle

- SDK importé dans le script du composant `ContactForm.astro`
- Initialisation avec `PUBLIC_EMAILJS_PUBLIC_KEY`
- Envoi via `emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, form)`
- Gestion des états : validation, loading, succès, erreur

---

## 9. Structure du Projet

```
/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── content/
│   ├── articles/
│   └── singletons/
├── public/
│   ├── admin/
│   └── uploads/
├── scripts/
│   └── vinted-ingest.mjs
├── src/
│   ├── content.config.ts          # Validation Astro Content Collections
│   ├── components/
│   │   ├── ArticleCard.astro
│   │   ├── ArticleGallery.astro
│   │   ├── CatalogueFilters.astro
│   │   ├── ContactForm.astro
│   │   └── StatusBadge.astro
│   ├── layouts/
│   │   └── Base.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── boutique/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   ├── contact.astro
│   │   ├── a-propos.astro
│   │   └── 404.astro
│   └── styles/
│       └── global.css
├── tina/
│   ├── config.ts
│   └── __generated__/
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

---

## 10. Limites & Points de Vigilance

| Point | Détail |
|---|---|
| Taille du repo | Images stockées dans le repo : surveiller la croissance (limite soft GitHub) |
| Tina Cloud free tier | Vérifier régulièrement les quotas/limites |
| EmailJS free tier | 200 emails/mois : surveiller si volume en hausse |
| Liens racine | Le projet suppose un déploiement à la racine du domaine ; migration vers un sous-chemin = ajustements nécessaires |
| Filtres client-side | Tous les articles sont chargés en une fois ; au-delà de quelques centaines, envisager pagination/segmentation |
| Build Tina | `npm run build` dépend de `TINA_CLIENT_ID` et `TINA_TOKEN` en CI |
