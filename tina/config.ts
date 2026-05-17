import { defineConfig } from "tinacms";

// ---------------------------------------------------------------------------
// Constantes — Enums partagés
// ---------------------------------------------------------------------------

const CATEGORIE_OPTIONS = [
  { value: "accessoires-telephone", label: "Accessoires téléphone" },
  { value: "hygiene-et-soin",       label: "Hygiène et soin" },
  { value: "porte-cles",            label: "Porte-clés" },
  { value: "sacs",                  label: "Sacs" },
  { value: "essuie-mains",          label: "Essuie-mains" },
  { value: "bavoirs",               label: "Bavoirs" },
  { value: "porte-monnaies",        label: "Porte-monnaies" },
  { value: "decorations",           label: "Décorations" },
  { value: "socquettes",            label: "Socquettes" },
  { value: "doudous",               label: "Doudous" },
  { value: "autre",                 label: "Autre" },
] as const;

const THEME_OPTIONS = [
  { value: "ludique",     label: "Ludique" },
  { value: "breton",      label: "Breton" },
  { value: "nature",      label: "Nature" },
  { value: "animaux",     label: "Animaux" },
  { value: "mer",         label: "Mer" },
  { value: "poissons",    label: "Poissons" },
  { value: "noel",        label: "Noël" },
  { value: "dinosaures",  label: "Dinosaures" },
  { value: "bonhommes",   label: "Bonhommes" },
  { value: "sante",       label: "Santé" },
  { value: "musique",     label: "Musique" },
  { value: "voyage",      label: "Voyage" },
  { value: "abstrait",    label: "Abstrait" },
  { value: "carreaux",    label: "Carreaux" },
  { value: "pois",        label: "Pois" },
  { value: "autre",       label: "Autre" },
] as const;

const STATUT_OPTIONS = [
  { value: "disponible", label: "Disponible" },
  { value: "reserve",    label: "Réservé" },
  { value: "vendu",      label: "Vendu" },
] as const;

// ---------------------------------------------------------------------------
// Helper — slugification pour les noms de fichiers
// Convertit un titre français en slug ASCII valide.
// Ex : "Bavoir Espace Rose" → "bavoir-espace-rose"
// ---------------------------------------------------------------------------

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---------------------------------------------------------------------------
// Configuration principale
// ---------------------------------------------------------------------------

export default defineConfig({
  branch: process.env.GITHUB_BRANCH ?? "main",
  clientId: process.env.TINA_CLIENT_ID,
  token:    process.env.TINA_TOKEN,

  build: {
    outputFolder: "admin",
    publicFolder: "public",
  },

  media: {
    tina: {
      mediaRoot:    "uploads",
      publicFolder: "public",
    },
  },

  schema: {
    collections: [

      // -----------------------------------------------------------------------
      // COLLECTION : Articles
      // -----------------------------------------------------------------------
      {
        name:   "article",
        label:  "Articles",
        path:   "content/articles",
        format: "md",

        ui: {
          defaultItem: {
            statut:   "disponible",
            vedette:  false,
            quantite: 1,
          },

          router: ({ document }) => `/boutique/${document._sys.filename}`,

          filename: {
            readonly: false,
            slugify: (values) =>
              values?.titre ? slugify(values.titre) : "article",
          },
        },

        fields: [
          {
            type:     "string",
            name:     "titre",
            label:    "Titre",
            isTitle:  true,
            required: true,
          },
          {
            type:   "rich-text",
            name:   "description",
            label:  "Description",
            isBody: true,
          },
          {
            type:     "number",
            name:     "prix",
            label:    "Prix (€)",
            required: true,
            ui: {
              description: "Montant en euros. Exemple : 5 ou 12.50",
            },
          },
          {
            type:     "number",
            name:     "quantite",
            label:    "Quantité disponible",
            required: true,
            ui: {
              description: "Nombre d'exemplaires disponibles (entier ≥ 1).",
            },
          },
          {
            type:     "string",
            name:     "categorie",
            label:    "Catégorie",
            required: true,
            options:  CATEGORIE_OPTIONS,
          },
          {
            type:     "string",
            name:     "theme",
            label:    "Thème",
            required: true,
            options:  THEME_OPTIONS,
          },
          {
            type:     "string",
            name:     "statut",
            label:    "Statut",
            required: true,
            options:  STATUT_OPTIONS,
          },
          {
            type:  "image",
            name:  "images",
            label: "Images",
            list:  true,
            ui: {
              description:
                "Entre 1 et 6 photos. Taille recommandée : moins de 2 Mo par image. " +
                "La première image est utilisée comme miniature dans le catalogue.",
            },
          },
          {
            type:  "boolean",
            name:  "vedette",
            label: "Mettre en avant sur la page d'accueil",
            ui: {
              description:
                "Si activé, cet article peut apparaître dans la sélection de la page d'accueil. " +
                "L'ordre est géré dans la section « Page d'accueil ».",
            },
          },
        ],
      },

      // -----------------------------------------------------------------------
      // SINGLETON : Page d'accueil
      // -----------------------------------------------------------------------
      {
        name:   "accueil",
        label:  "Page d'accueil",
        path:   "content/singletons",
        format: "md",

        match: { include: "accueil" },

        ui: {
          allowedActions: { create: false, delete: false },
          global: true,
        },

        fields: [
          {
            type:     "string",
            name:     "titre",
            label:    "Titre (interne)",
            isTitle:  true,
            required: true,
            ui: { component: "hidden" },
          },
          {
            type:  "object",
            name:  "articlesVedette",
            label: "Articles en vedette",
            list:  true,
            ui: {
              description:
                "Glisser-déposer pour réordonner. Maximum recommandé : 6 articles.",
              itemProps: (item) => ({
                label: item?.article ?? "Article non sélectionné",
              }),
            },
            fields: [
              {
                type:        "reference",
                name:        "article",
                label:       "Article",
                collections: ["article"],
              },
            ],
          },
        ],
      },

      // -----------------------------------------------------------------------
      // SINGLETON : À propos
      // -----------------------------------------------------------------------
      {
        name:   "aPropos",
        label:  "À propos",
        path:   "content/singletons",
        format: "md",

        match: { include: "a-propos" },

        ui: {
          allowedActions: { create: false, delete: false },
          global: true,
        },

        fields: [
          {
            type:     "string",
            name:     "nom",
            label:    "Nom de la créatrice",
            isTitle:  true,
            required: true,
          },
          {
            type:  "image",
            name:  "photo",
            label: "Photo",
            ui: {
              description: "Photo de profil ou de l'atelier. Taille recommandée : moins de 2 Mo.",
            },
          },
          {
            type:   "rich-text",
            name:   "texte",
            label:  "Présentation",
            isBody: true,
            ui: {
              description: "Texte libre de présentation.",
            },
          },
        ],
      },

    ],
  },
});
