# Plan d'implémentation — thelebcreations.github.io

> Référence : lire [`SPEC.md`](./SPEC.md) pour le contexte de chaque décision.
> État de départ : projet Astro 6 créé, Node 22 LTS, `tinacms` et `@tinacms/cli` installés.

---

## Étape 1 — Finaliser la configuration du projet

### 1.1 Mettre à jour `package.json`

Remplacer la section `scripts` par :

```json
"scripts": {
  "dev":     "tinacms dev -c \"astro dev\"",
  "build":   "tinacms build && astro build",
  "preview": "astro preview"
}
```

### 1.2 Mettre à jour `astro.config.mjs`

```ts
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://thelebcreations.github.io',
  output: 'static',
  integrations: [tailwind()],
});
```

> Note : l'intégration `@tinacms/astro` n'est pas nécessaire avec `@tinacms/cli` —
> TinaCMS est lancé en parallèle d'Astro via le script `dev`.

### 1.3 Installer DaisyUI

```bash
npm install daisyui
```

Mettre à jour `tailwind.config.mjs` :

```js
import daisyui from 'daisyui';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  plugins: [daisyui],
  daisyui: {
    themes: ['light'],   // un seul thème pour commencer
  },
};
```

### 1.4 Mettre à jour `.gitignore`

Ajouter :

```
tina/__generated__
.env
.env.local
```

### 1.5 Créer le fichier `.env.local` (jamais commité)

```env
TINA_CLIENT_ID=      # à remplir à l'étape 4
TINA_TOKEN=          # à remplir à l'étape 4
PUBLIC_EMAILJS_SERVICE_ID=    # à remplir à l'étape 6
PUBLIC_EMAILJS_TEMPLATE_ID=   # à remplir à l'étape 6
PUBLIC_EMAILJS_PUBLIC_KEY=    # à remplir à l'étape 6
```

---

## Étape 2 — Configurer TinaCMS

### 2.1 Créer la structure des dossiers

```
mkdir tina
mkdir tina\__generated__
type nul > tina\__generated__\.gitkeep

mkdir content
mkdir content\articles
mkdir content\singletons
```

### 2.2 Placer `tina/config.ts`

Copier le fichier `tina/config.ts` généré précédemment dans ce projet.

> ⚠️ Vérifier ligne 78 que le router est bien :
> ```ts
> router: ({ document }) => `/boutique/${document._sys.filename}`,
> ```

### 2.3 Créer les fichiers singletons initiaux

TinaCMS ne crée pas les fichiers vides automatiquement.
Créer `content/singletons/accueil.md` :

```md
---
titre: Accueil
articlesVedette: []
---
```

Créer `content/singletons/a-propos.md` :

```md
---
nom: Prénom Nom
photo: ''
---

Présentation de la créatrice à compléter.
```

### 2.4 Vérifier le lancement local de TinaCMS

```bash
npm run dev
```

Ouvrir `http://localhost:4321/admin` — l'interface TinaCMS doit s'afficher.

> En local sans `TINA_CLIENT_ID`, TinaCMS tourne en mode "local filesystem"
> (pas de Tina Cloud) — parfait pour le développement.

---

## Étape 3 — Configurer Astro Content Collections

### 3.1 Placer `src/content/config.ts`

Copier le fichier `src/content/config.ts` généré précédemment dans `src/content/`.

### 3.2 Vérifier la génération des types

```bash
npm run dev
```

Astro génère `.astro/types.d.ts` au démarrage.
Si des erreurs TypeScript apparaissent sur le schéma, les corriger avant de continuer.

---

## Étape 4 — Configurer Tina Cloud

### 4.1 Créer un compte Tina Cloud

Aller sur https://app.tina.io → créer un compte gratuit.

### 4.2 Créer un projet

- Cliquer "New Project"
- Connecter le repo GitHub `thelebcreations/thelebcreations.github.io`
- Branche : `main`

### 4.3 Récupérer les credentials

Dans le dashboard du projet → "Overview" :
- Copier `Client ID` → coller dans `.env.local` comme `TINA_CLIENT_ID`
- Générer un token → coller dans `.env.local` comme `TINA_TOKEN`

### 4.4 Ajouter les credentials aux secrets GitHub

Dans le repo GitHub → Settings → Secrets and variables → Actions :

| Nom du secret | Valeur |
|---|---|
| `TINA_CLIENT_ID` | Client ID depuis Tina Cloud |
| `TINA_TOKEN` | Token depuis Tina Cloud |

---

## Étape 5 — Implémenter les pages et composants

Ordre recommandé : layout de base → composants atomiques → pages.

### 5.1 Layout de base — `src/layouts/Base.astro`

Contient :
- `<html lang="fr">`
- `<head>` avec meta SEO (titre, description, og:image depuis les props)
- Navigation : logo/nom + lien "Boutique" + lien "À propos" + lien "Contact"
- `<slot />` pour le contenu de la page
- Footer : nom de la boutique + lien vers `/contact`

```astro
---
interface Props {
  titre: string;
  description?: string;
  image?: string;
}
const { titre, description = '', image } = Astro.props;
---
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <title>{titre} — TheLeb Créations</title>
    {description && <meta name="description" content={description} />}
    {image && <meta property="og:image" content={image} />}
    <meta property="og:title" content={titre} />
  </head>
  <body>
    <nav><!-- navigation --></nav>
    <main>
      <slot />
    </main>
    <footer><!-- footer --></footer>
  </body>
</html>
```

### 5.2 Composant `StatusBadge.astro`

Badge DaisyUI coloré selon le statut de l'article.

```astro
---
import type { ArticleStatut } from '../content/config';

interface Props { statut: ArticleStatut; }
const { statut } = Astro.props;

const config = {
  disponible: { label: 'Disponible', class: 'badge-success' },
  reserve:    { label: 'Réservé',    class: 'badge-warning' },
  vendu:      { label: 'Vendu',      class: 'badge-error'   },
};
const { label, class: cls } = config[statut];
---
<span class={`badge ${cls}`}>{label}</span>
```

### 5.3 Composant `ArticleCard.astro`

Carte utilisée dans le catalogue et la page d'accueil.

Props : `titre`, `prix`, `statut`, `images`, `slug`, `categorie`, `theme`

Comportement :
- Image principale (`images[0]`) avec `<img>` (public folder)
- Titre, prix, badge statut
- Lien vers `/boutique/[slug]`
- Opacité réduite si `statut === 'vendu'`

### 5.4 Composant `CatalogueFilters.astro`

Filtres et tri — entièrement client-side.

Contient :
- `<select>` pour `catégorie` (toutes les valeurs + "Toutes")
- `<select>` pour `thème` (toutes les valeurs + "Tous")
- `<select>` pour `statut` (tous / disponible / réservé / vendu)
- `<select>` pour tri (prix croissant / prix décroissant)

Implémentation JavaScript (`<script>`) :
```js
// Lire les filtres actifs
// Filtrer/trier le tableau d'articles (data-attributes sur les cards)
// Afficher/masquer les cards selon les filtres
```

> Les articles sont rendus côté serveur avec des `data-*` attributes
> (data-categorie, data-theme, data-statut, data-prix) pour que le JS
> puisse filtrer sans aucun appel réseau.

### 5.5 Composant `ArticleGallery.astro`

Galerie d'images pour la page article individuel.

- Image principale grande
- Miniatures cliquables pour changer l'image principale
- Implémenté avec JS vanilla ou CSS uniquement

### 5.6 Composant `ContactForm.astro`

Formulaire EmailJS. Voir détails à l'étape 6.

### 5.7 Page d'accueil — `src/pages/index.astro`

```astro
---
import Base from '../layouts/Base.astro';
import ArticleCard from '../components/ArticleCard.astro';
import { getEntry, getEntries } from 'astro:content';

// Charger le singleton accueil
const accueil = await getEntry('accueil', 'accueil');
const refs = accueil.data.articlesVedette ?? [];

// Résoudre les slugs en entrées complètes
const articlesVedette = await Promise.all(
  refs.map(({ article }) => getEntry('article', article))
).then(entries => entries.filter(Boolean));
---
<Base titre="Accueil">
  <!-- Hero section -->
  <section>
    <h1>TheLeb Créations</h1>
    <p>Créations faites main avec amour.</p>
    <a href="/boutique" class="btn btn-primary">Voir la boutique</a>
  </section>

  <!-- Articles en vedette -->
  <section>
    <h2>Nos créations</h2>
    <div class="grid ...">
      {articlesVedette.map(article => (
        <ArticleCard
          slug={article.id}
          {...article.data}
        />
      ))}
    </div>
    <a href="/boutique">Voir tout le catalogue →</a>
  </section>
</Base>
```

### 5.8 Page catalogue — `src/pages/boutique/index.astro`

```astro
---
import Base from '../../layouts/Base.astro';
import ArticleCard from '../../components/ArticleCard.astro';
import CatalogueFilters from '../../components/CatalogueFilters.astro';
import { getCollection } from 'astro:content';

const articles = await getCollection('article');
// Tri par défaut : aucun ordre imposé (ordre TinaCMS = ordre des fichiers)
---
<Base titre="Boutique">
  <h1>Boutique</h1>
  <CatalogueFilters />
  <div id="catalogue-grid" class="grid ...">
    {articles.map(article => (
      <ArticleCard
        slug={article.id}
        {...article.data}
        data-categorie={article.data.categorie}
        data-theme={article.data.theme}
        data-statut={article.data.statut}
        data-prix={article.data.prix}
      />
    ))}
  </div>
</Base>
```

### 5.9 Page article — `src/pages/boutique/[slug].astro`

```astro
---
import Base from '../../layouts/Base.astro';
import ArticleGallery from '../../components/ArticleGallery.astro';
import StatusBadge from '../../components/StatusBadge.astro';
import { getCollection, render } from 'astro:content';

export async function getStaticPaths() {
  const articles = await getCollection('article');
  return articles.map(article => ({
    params: { slug: article.id },
    props:  { article },
  }));
}

const { article } = Astro.props;
const { Content } = await render(article);
const { titre, prix, quantite, categorie, theme, statut, images } = article.data;
---
<Base titre={titre} image={images[0]}>
  <ArticleGallery images={images} />

  <h1>{titre}</h1>
  <StatusBadge statut={statut} />
  <p>{prix} €</p>
  <p>Quantité disponible : {quantite}</p>
  <p>Catégorie : {categorie} — Thème : {theme}</p>

  <Content />   <!-- description Markdown rendue -->

  <a
    href={`/contact?item=${article.id}&sujet=Intérêt pour : ${encodeURIComponent(titre)}`}
    class={`btn btn-primary ${statut === 'vendu' ? 'btn-disabled' : ''}`}
    aria-disabled={statut === 'vendu'}
  >
    Je suis intéressé(e)
  </a>
</Base>
```

### 5.10 Page contact — `src/pages/contact.astro`

```astro
---
import Base from '../layouts/Base.astro';
import ContactForm from '../components/ContactForm.astro';
---
<Base titre="Contact">
  <h1>Contact</h1>
  <ContactForm />
</Base>
```

### 5.11 Page à propos — `src/pages/a-propos.astro`

```astro
---
import Base from '../layouts/Base.astro';
import { getEntry, render } from 'astro:content';

const aPropos = await getEntry('aPropos', 'a-propos');
const { Content } = await render(aPropos);
const { nom, photo } = aPropos.data;
---
<Base titre="À propos">
  <h1>{nom}</h1>
  {photo && <img src={photo} alt={`Photo de ${nom}`} />}
  <Content />
</Base>
```

### 5.12 Page 404 — `src/pages/404.astro`

```astro
---
import Base from '../layouts/Base.astro';
---
<Base titre="Page introuvable">
  <h1>404 — Page introuvable</h1>
  <a href="/">Retour à l'accueil</a>
</Base>
```

---

## Étape 6 — Configurer EmailJS

### 6.1 Créer un compte EmailJS

Aller sur https://www.emailjs.com → créer un compte gratuit.

### 6.2 Créer un service email

- Dashboard → Email Services → Add New Service
- Choisir Gmail (ou autre)
- Suivre les instructions de connexion
- Noter le **Service ID**

### 6.3 Créer un template

- Dashboard → Email Templates → Create New Template
- Contenu suggéré :

```
Sujet : {{sujet}}

Nom      : {{nom}}
Email    : {{email}}
Tél.     : {{telephone}}

Message :
{{message}}
```

- Noter le **Template ID**

### 6.4 Récupérer la clé publique

- Dashboard → Account → General → Public Key
- Noter la **Public Key**

### 6.5 Remplir `.env.local`

```env
PUBLIC_EMAILJS_SERVICE_ID=service_xxxxxxx
PUBLIC_EMAILJS_TEMPLATE_ID=template_xxxxxxx
PUBLIC_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxx
```

### 6.6 Implémenter `ContactForm.astro`

```astro
---
// Pas de logique serveur — tout est client-side
---

<form id="contact-form" novalidate>
  <div>
    <label for="nom">Nom *</label>
    <input type="text" id="nom" name="nom" required />
  </div>

  <div>
    <label for="email">Email *</label>
    <input type="email" id="email" name="email" required />
  </div>

  <div>
    <label for="telephone">Téléphone</label>
    <input type="tel" id="telephone" name="telephone" />
  </div>

  <div>
    <label for="sujet">Sujet *</label>
    <input type="text" id="sujet" name="sujet" required />
  </div>

  <div>
    <label for="message">Message *</label>
    <textarea id="message" name="message" required></textarea>
  </div>

  <button type="submit" class="btn btn-primary">Envoyer</button>
  <p id="form-success" hidden>Message envoyé ! Nous vous répondrons rapidement.</p>
  <p id="form-error"   hidden>Une erreur est survenue. Veuillez réessayer.</p>
</form>

<script>
  import emailjs from '@emailjs/browser';

  const SERVICE_ID  = import.meta.env.PUBLIC_EMAILJS_SERVICE_ID;
  const TEMPLATE_ID = import.meta.env.PUBLIC_EMAILJS_TEMPLATE_ID;
  const PUBLIC_KEY  = import.meta.env.PUBLIC_EMAILJS_PUBLIC_KEY;

  emailjs.init(PUBLIC_KEY);

  // Pré-remplir le sujet depuis l'URL (?sujet=...)
  const params = new URLSearchParams(window.location.search);
  const sujetParam = params.get('sujet');
  if (sujetParam) {
    (document.getElementById('sujet') as HTMLInputElement).value =
      decodeURIComponent(sujetParam);
  }

  document.getElementById('contact-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const btn  = form.querySelector('button[type="submit"]') as HTMLButtonElement;

    btn.disabled = true;
    btn.textContent = 'Envoi en cours…';

    try {
      await emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, form);
      document.getElementById('form-success')!.hidden = false;
      form.reset();
    } catch {
      document.getElementById('form-error')!.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Envoyer';
    }
  });
</script>
```

### 6.7 Installer le package EmailJS

```bash
npm install @emailjs/browser
```

---

## Étape 7 — Configurer GitHub Actions

### 7.1 Créer le workflow

Créer `.github/workflows/deploy.yml` :

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
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          TINA_CLIENT_ID: ${{ secrets.TINA_CLIENT_ID }}
          TINA_TOKEN:     ${{ secrets.TINA_TOKEN }}

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir:  ./dist
```

### 7.2 Ajouter les secrets EmailJS à GitHub

Dans le repo GitHub → Settings → Secrets and variables → Actions,
ajouter également :

| Nom du secret | Valeur |
|---|---|
| `PUBLIC_EMAILJS_SERVICE_ID` | Service ID EmailJS |
| `PUBLIC_EMAILJS_TEMPLATE_ID` | Template ID EmailJS |
| `PUBLIC_EMAILJS_PUBLIC_KEY` | Public Key EmailJS |

Et mettre à jour l'étape `Build` du workflow :

```yaml
      - name: Build
        run: npm run build
        env:
          TINA_CLIENT_ID:               ${{ secrets.TINA_CLIENT_ID }}
          TINA_TOKEN:                   ${{ secrets.TINA_TOKEN }}
          PUBLIC_EMAILJS_SERVICE_ID:    ${{ secrets.PUBLIC_EMAILJS_SERVICE_ID }}
          PUBLIC_EMAILJS_TEMPLATE_ID:   ${{ secrets.PUBLIC_EMAILJS_TEMPLATE_ID }}
          PUBLIC_EMAILJS_PUBLIC_KEY:    ${{ secrets.PUBLIC_EMAILJS_PUBLIC_KEY }}
```

### 7.3 Configurer GitHub Pages

Dans le repo GitHub → Settings → Pages :
- Source : `Deploy from a branch`
- Branch : `gh-pages` / `/ (root)`

---

## Étape 8 — Premier déploiement

### 8.1 Créer le repo GitHub

```bash
git init
git remote add origin https://github.com/thelebcreations/thelebcreations.github.io.git
```

> ⚠️ Le repo doit être nommé exactement `thelebcreations.github.io`
> pour être servi à la racine du domaine.

### 8.2 Premier commit et push

```bash
git add .
git commit -m "feat: initial project setup"
git push -u origin main
```

### 8.3 Vérifier le déploiement

- Aller sur l'onglet **Actions** du repo GitHub
- Le workflow `Deploy to GitHub Pages` doit s'exécuter automatiquement
- Une fois terminé (✅), ouvrir https://thelebcreations.github.io

---

## Étape 9 — Vérifications finales

### 9.1 Checklist fonctionnelle

- [ ] Page d'accueil s'affiche avec les articles en vedette
- [ ] Catalogue affiche tous les articles
- [ ] Filtres (catégorie, thème, statut) fonctionnent sans rechargement
- [ ] Tri par prix fonctionne
- [ ] Clic sur un article ouvre la page individuelle
- [ ] Bouton "Je suis intéressé(e)" pré-remplit le sujet du formulaire
- [ ] Formulaire de contact envoie un email via EmailJS
- [ ] Bouton désactivé si statut = vendu
- [ ] Page À propos s'affiche
- [ ] Page 404 s'affiche sur une URL inconnue
- [ ] Interface TinaCMS accessible sur `/admin` (en prod, avec Tina Cloud)
- [ ] Un éditeur peut créer un article depuis `/admin` et le voir en ligne après build

### 9.2 Checklist technique

- [ ] Aucune erreur TypeScript (`npx tsc --noEmit`)
- [ ] Build local réussit (`npm run build`)
- [ ] Aucun lien absolu sans le préfixe du site
- [ ] Images correctement référencées depuis `/uploads/`
- [ ] Variables d'environnement non committées (vérifier `.gitignore`)

---

## Récapitulatif des services tiers

| Service | Usage | Limite gratuite | URL dashboard |
|---|---|---|---|
| Tina Cloud | CMS éditorial | 2 users | https://app.tina.io |
| EmailJS | Envoi du formulaire | 200 emails/mois | https://dashboard.emailjs.com |
| GitHub Actions | CI/CD | 2000 min/mois | GitHub repo → Actions |
| GitHub Pages | Hébergement | Illimité (sites publics) | GitHub repo → Settings → Pages |

---

## Ordre de travail recommandé

```
Étape 1  → Configuration projet          (30 min)
Étape 2  → TinaCMS local                 (30 min)
Étape 3  → Content Collections           (15 min)
Étape 4  → Tina Cloud                    (20 min)
Étape 5  → Pages et composants           (3–5h)
Étape 6  → EmailJS                       (30 min)
Étape 7  → GitHub Actions                (20 min)
Étape 8  → Premier déploiement           (15 min)
Étape 9  → Vérifications                 (30 min)
─────────────────────────────────────────────────
Total estimé                             (6–8h)
```
