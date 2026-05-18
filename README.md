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

### 3. Build for production
```bash
npm run build
```