# SPEC.md — Boutique Créations Faites Main

> Version 1.0 — Static shop website built with Astro, hosted on GitHub Pages.

---

## 1. Objectifs & Contraintes

| Contrainte | Détail |
|---|---|
| Coût | Zéro — setup et opération |
| Hébergement | GitHub Pages (URL par défaut `username.github.io/repo`) |
| Rendu | 100% statique — zéro SSR |
| Éditeurs | 2 éditeurs non-techniques, francophones |
| Langue | Français uniquement |

---

## 2. Stack Technique

| Couche | Outil | Justification |
|---|---|---|
| Framework | [Astro](https://astro.build) (latest stable) | Static-first, excellent DX, génération de pages statiques |
| Language | TypeScript (strict) | Types auto-générés par TinaCMS, erreurs détectées au build |
| Styling | Tailwind CSS + DaisyUI | Zéro runtime CSS, composants prêts (cards, badges, filtres) |
| CMS | TinaCMS + Tina Cloud (free tier) | UI éditoriale pour non-techniciens, commits directs sur `main` |
| Formulaire | EmailJS (free tier — 200 emails/mois) | Client-side only, pré-remplissage depuis les pages articles |
| Images | Repo-based (`/public/uploads/`) | Zéro dépendance externe, optimisation via `<Image>` Astro |
| CI/CD | GitHub Actions → GitHub Pages | Déclenchement automatique sur push `main` |
| Analytics | Aucune | Zéro dépendance, zéro cookie banner |

---

## 3. Modèle de Contenu

### 3.1 Collection — `articles`

Chaque article est un fichier géré par TinaCMS. Les slugs sont auto-générés depuis `titre`.

| Champ | Type | Requis | Notes |
|---|---|---|---|
| `titre` | `string` | ✅ | Nom de l'article |
| `description` | `rich-text` | ✅ | Description libre |
| `prix` | `number` | ✅ | En euros, ex: `5.00` |
| `catégorie` | `enum` | ✅ | Voir valeurs §3.3 |
| `thème` | `enum` | ✅ | Voir valeurs §3.4 |
| `statut` | `enum` | ✅ | `disponible` / `réservé` / `vendu` |
| `quantité` | `number` | ✅ | Entier ≥ 1 |
| `images` | `image[]` | ✅ | 1 à 6 images, stockées dans `/public/uploads/` |
| `vedette` | `boolean` | ✅ | Défaut `false` — contrôle l'apparition en page d'accueil |

### 3.2 Singletons

| Singleton | Champs |
|---|---|
| `accueil` | Liste ordonnée de références vers des `articles` (sélection éditoriale) |
| `a-propos` | `texte` (rich-text), `photo` (image), `nom` (string) |

### 3.3 Valeurs — `catégorie`

```
Accessoires téléphone
Hygiène et soin
Porte-clés
Sacs
Essuie-mains
Bavoirs
Porte-monnaies
Décorations
Socquettes
Doudous
Autre
```

### 3.4 Valeurs — `thème`

```
Ludique
Breton
Nature
Animaux
Mer
Poissons
Noël
Dinosaures
Bonhommes
Santé
Musique
Voyage
Abstrait
Carreaux
Pois
Autre
```

---

## 4. Pages

### 4.1 Vue d'ensemble du routing

```
/                       → Accueil
/boutique               → Catalogue complet
/boutique/[slug]        → Page individuelle article
/contact                → Formulaire de contact
/a-propos               → Présentation de la créatrice
/404                    → Page d'erreur custom
```

### 4.2 `/` — Accueil

- Hero section : titre, accroche, CTA → `/boutique`
- Grille d'articles en vedette : articles dont `vedette = true`, ordonnés selon le singleton `accueil`
- Lien "Voir tout le catalogue" → `/boutique`

### 4.3 `/boutique` — Catalogue

- Grille de tous les articles, toutes catégories confondues
- **Filtres client-side** (zéro rechargement de page) :
  - Par `catégorie` (sélecteur)
  - Par `thème` (sélecteur)
  - Par `statut` (sélecteur : tous / disponible / réservé / vendu)
- **Tri client-side** :
  - Prix croissant
  - Prix décroissant
- Les articles avec `statut = vendu` restent visibles mais affichés en grisé avec un badge "Vendu"
- Les articles avec `statut = réservé` affichent un badge "Réservé"

### 4.4 `/boutique/[slug]` — Article

- Galerie d'images (1–6 photos)
- Tous les champs : titre, description, prix, catégorie, thème, statut, quantité
- Badge statut (disponible / réservé / vendu)
- Bouton **"Je suis intéressé(e)"** → redirige vers `/contact?item=[slug]`
  - Désactivé si `statut = vendu`

### 4.5 `/contact` — Formulaire

Géré par EmailJS. Champs :

| Champ | Type | Requis | Notes |
|---|---|---|---|
| `nom` | text | ✅ | |
| `email` | email | ✅ | |
| `téléphone` | text | ❌ | Optionnel |
| `sujet` | text | ✅ | Pré-rempli via `?item=slug` avec `"Intérêt pour : [titre]"` |
| `message` | textarea | ✅ | |

Comportement :
- À l'arrivée sur `/contact?item=slug`, le champ `sujet` est pré-rempli via `URLSearchParams` côté client
- Soumission via EmailJS JS SDK — aucun backend requis
- Feedback visuel après envoi (succès / erreur)

### 4.6 `/a-propos`

- Contenu entièrement géré via le singleton TinaCMS `a-propos`
- Photo, nom, texte libre

### 4.7 `/404`

- Page custom `src/pages/404.astro`
- GitHub Pages sert automatiquement `404.html` pour les routes inexistantes

---

## 5. Architecture des Données

### 5.1 TinaCMS — structure des fichiers générés

```
content/
├── articles/
│   ├── bavoir-espace-rose.md
│   ├── lingette-animaux.md
│   └── ...
└── singletons/
    ├── accueil.md
    └── a-propos.md
```

### 5.2 Images

```
public/
└── uploads/
    ├── bavoir-espace-rose-1.jpg
    ├── bavoir-espace-rose-2.jpg
    └── ...
```

- Toutes les images passent par le composant Astro `<Image>` pour optimisation au build (WebP, resize, lazy loading)
- Limite recommandée : 6 images par article, < 2MB par image (à documenter dans TinaCMS via `ui.description`)

---

## 6. Configuration Astro

### 6.1 `astro.config.mjs`

```ts
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import tinacms from '@tinacms/astro';

export default defineConfig({
  site: 'https://thelebcreations.github.io',
  // pas de `base` — le site est servi à la racine
  output: 'static',
  integrations: [tailwind(), tinacms()],
});
```

> ⚠️ Tous les liens internes et chemins d'assets doivent utiliser le helper `base` d'Astro pour être correctement préfixés.

### 6.2 TypeScript

```json
// tsconfig.json
{
  "extends": "astro/tsconfigs/strict"
}
```

---

## 7. Pipeline CI/CD

### 7.1 Flux

```
Éditeur (TinaCMS UI)
  → commit sur main (via Tina Cloud)
    → GitHub Actions déclenché
      → npm ci
      → npm run build
        → dist/ uploadé sur gh-pages branch
          → GitHub Pages sert le site
```

### 7.2 GitHub Actions workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - run: npm run build
        env:
          TINA_CLIENT_ID: ${{ secrets.TINA_CLIENT_ID }}
          TINA_TOKEN: ${{ secrets.TINA_TOKEN }}

      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 7.3 Secrets GitHub requis

| Secret | Valeur |
|---|---|
| `TINA_CLIENT_ID` | Depuis Tina Cloud dashboard |
| `TINA_TOKEN` | Depuis Tina Cloud dashboard |
| `PUBLIC_EMAILJS_SERVICE_ID` | Depuis EmailJS dashboard |
| `PUBLIC_EMAILJS_TEMPLATE_ID` | Depuis EmailJS dashboard |
| `PUBLIC_EMAILJS_PUBLIC_KEY` | Depuis EmailJS dashboard |

> Les variables préfixées `PUBLIC_` sont exposées côté client par Astro. EmailJS n'a pas besoin d'être secret (clé publique uniquement).

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

### 8.2 Intégration

- SDK chargé via `<script>` dans le composant contact
- Initialisation avec `PUBLIC_EMAILJS_PUBLIC_KEY`
- Appel `emailjs.send(serviceId, templateId, templateParams)` sur submit
- Validation HTML5 native + feedback post-envoi géré en state local

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
│   └── uploads/
├── src/
│   ├── components/
│   │   ├── ArticleCard.astro       # Carte article (catalogue + accueil)
│   │   ├── ArticleGallery.astro    # Galerie images page article
│   │   ├── CatalogueFilters.astro  # Filtres + tri client-side
│   │   ├── ContactForm.astro       # Formulaire EmailJS
│   │   └── StatusBadge.astro       # Badge disponible/réservé/vendu
│   ├── layouts/
│   │   └── Base.astro              # Layout principal (nav, footer)
│   ├── pages/
│   │   ├── index.astro             # Accueil
│   │   ├── boutique/
│   │   │   ├── index.astro         # Catalogue
│   │   │   └── [slug].astro        # Page article
│   │   ├── contact.astro
│   │   ├── a-propos.astro
│   │   └── 404.astro
│   └── styles/
│       └── global.css              # Imports Tailwind
├── tina/
│   └── config.ts                   # Schéma TinaCMS
├── astro.config.mjs
├── tailwind.config.mjs
└── tsconfig.json
```

---

## 10. Limites & Points de Vigilance

| Point | Détail |
|---|---|
| Repo size | Images stockées dans le repo — surveiller la taille (limite GitHub : 1GB). Archiver les articles vendus anciens si nécessaire. |
| Tina Cloud free tier | Vérifier les limites actuelles (utilisateurs, records) avant tout changement d'éditeurs. |
| EmailJS free tier | 200 emails/mois. Suffisant pour un petit shop, à surveiller en cas de croissance. |
| GitHub Pages `base` path | Tout lien relatif doit utiliser le helper `base` d'Astro — à documenter pour les futurs contributeurs. |
| Filtres client-side | Tous les articles sont chargés en une fois. Performance acceptable jusqu'à ~500 articles. Au-delà, envisager une pagination statique. |
| TinaCMS build | Le build Astro consomme les tokens Tina Cloud — `TINA_CLIENT_ID` et `TINA_TOKEN` doivent être présents en CI. |
