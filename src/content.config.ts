/**
 * src/content/config.ts
 *
 * Schéma Astro Content Collections — valide les fichiers Markdown
 * générés par TinaCMS au moment du build.
 *
 * Utilise l'API Content Layer d'Astro 5+ (glob loader) pour lire
 * les fichiers depuis content/ à la racine du projet, là où TinaCMS
 * écrit par défaut.
 *
 * ⚠️  Les valeurs des enums doivent rester en sync avec tina/config.ts.
 *     En cas de modification d'un enum, mettre à jour les deux fichiers.
 */

import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// ---------------------------------------------------------------------------
// Enums — miroir exact des valeurs définies dans tina/config.ts
// ---------------------------------------------------------------------------

const Categorie = z.enum([
  "accessoires-telephone",
  "hygiene-et-soin",
  "porte-cles",
  "sacs",
  "essuie-mains",
  "bavoirs",
  "porte-monnaies",
  "decorations",
  "socquettes",
  "doudous",
  "autre",
]);

const Theme = z.enum([
  "ludique",
  "breton",
  "nature",
  "animaux",
  "mer",
  "poissons",
  "noel",
  "dinosaures",
  "bonhommes",
  "sante",
  "musique",
  "voyage",
  "abstrait",
  "carreaux",
  "pois",
  "autre",
]);

const Statut = z.enum(["disponible", "reserve", "vendu"]);

// ---------------------------------------------------------------------------
// Types exportés — utilisables dans les composants Astro sans redéfinition
// ---------------------------------------------------------------------------

export type ArticleCategorie = z.infer<typeof Categorie>;
export type ArticleTheme     = z.infer<typeof Theme>;
export type ArticleStatut    = z.infer<typeof Statut>;

// ---------------------------------------------------------------------------
// Helper — extrait le slug depuis un chemin de référence TinaCMS
//
// TinaCMS stocke les références sous la forme :
//   "content/articles/bavoir-espace-rose.md"
//
// Astro Content Layer identifie les entrées par leur id (= nom de fichier
// sans extension) :
//   "bavoir-espace-rose"
//
// Ce transform permet d'utiliser getEntry('article', slug) directement.
// ---------------------------------------------------------------------------

const tinaRefToSlug = z
  .string()
  .transform((path) =>
    path.replace(/^content\/articles\//, "").replace(/\.md$/, "")
  );

// ---------------------------------------------------------------------------
// COLLECTION : article
//
// Chaque fichier dans content/articles/*.md est un article de la boutique.
// Le frontmatter YAML est validé par ce schéma.
// Le corps Markdown du fichier = description de l'article (isBody: true).
// ---------------------------------------------------------------------------

const article = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base:    "./content/articles",
  }),

  schema: z.object({
    titre:     z.string(),
    prix:      z.number().positive(),
    quantite:  z.number().int().min(1),
    categorie: Categorie,
    theme:     Theme,
    statut:    Statut,

    // 1 à 6 chemins d'images stockées dans /public/uploads/.
    // Utilisables directement comme attribut src dans <img>.
    images: z.array(z.string()).min(1).max(6),

    // Si true, l'article peut apparaître dans la sélection de l'accueil.
    vedette: z.boolean().default(false),
  }),
});

// ---------------------------------------------------------------------------
// SINGLETON : accueil
//
// Un seul fichier : content/singletons/accueil.md
// Contient la liste ordonnée des articles en vedette sur la page d'accueil.
// Les références TinaCMS sont transformées en slugs via tinaRefToSlug.
// ---------------------------------------------------------------------------

const accueil = defineCollection({
  loader: glob({
    pattern: "accueil.md",
    base:    "./content/singletons",
  }),

  schema: z.object({
    // Champ interne TinaCMS (hidden) — ignoré côté Astro.
    titre: z.string().optional(),

    // Liste ordonnée de slugs d'articles.
    articlesVedette: z
      .array(
        z.object({
          article: tinaRefToSlug,
        })
      )
      .default([]),
  }),
});

// ---------------------------------------------------------------------------
// SINGLETON : aPropos
//
// Un seul fichier : content/singletons/a-propos.md
// Le corps Markdown = présentation de la créatrice (isBody: true).
// ---------------------------------------------------------------------------

const aPropos = defineCollection({
  loader: glob({
    pattern: "a-propos.md",
    base:    "./content/singletons",
  }),

  schema: z.object({
    nom:   z.string(),
    // Chemin vers l'image dans /public/uploads/ — optionnel.
    photo: z.string().optional(),
  }),
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const collections = {
  article,
  accueil,
  aPropos,
};
