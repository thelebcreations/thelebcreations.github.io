import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const articlesDir = path.join(repoRoot, "content", "articles");
const accueilPath = path.join(repoRoot, "content", "singletons", "accueil.md");

function getFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match?.[1] ?? "";
}

function getNewline(text) {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

function getVedetteReferencesFromAccueil(frontmatter) {
  const refs = [];
  const refRegex = /^\s*-\s*article:\s*(.+)\s*$/gm;
  let match = refRegex.exec(frontmatter);

  while (match) {
    refs.push(match[1]);
    match = refRegex.exec(frontmatter);
  }

  return refs;
}

function getTitreFromAccueil(frontmatter) {
  const match = frontmatter.match(/^titre:\s*(.+)\s*$/m);
  return match?.[1] ?? "Accueil";
}

async function getVedetteArticleReferences() {
  const entries = await fs.readdir(articlesDir, { withFileTypes: true });

  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const refs = [];

  for (const fileName of markdownFiles) {
    const filePath = path.join(articlesDir, fileName);
    const content = await fs.readFile(filePath, "utf8");
    const frontmatter = getFrontmatter(content);

    if (/^vedette:\s*true\s*$/m.test(frontmatter)) {
      refs.push(`content/articles/${fileName}`);
    }
  }

  return refs;
}

async function main() {
  const [vedetteRefs, accueilRaw] = await Promise.all([
    getVedetteArticleReferences(),
    fs.readFile(accueilPath, "utf8"),
  ]);

  const accueilFrontmatter = getFrontmatter(accueilRaw);
  const accueilRefs = getVedetteReferencesFromAccueil(accueilFrontmatter);

  if (vedetteRefs.length === accueilRefs.length) {
    console.log(
      `[sync:articlesVedette] No update needed (${vedetteRefs.length} items in both sources).`
    );
    return;
  }

  const newline = getNewline(accueilRaw);
  const titre = getTitreFromAccueil(accueilFrontmatter);

  const lines = [
    "---",
    `titre: ${titre}`,
    "articlesVedette:",
    ...vedetteRefs.map((ref) => `  - article: ${ref}`),
    "---",
    "",
  ];

  const nextContent = lines.join(newline);
  await fs.writeFile(accueilPath, nextContent, "utf8");

  console.log(
    `[sync:articlesVedette] Updated content/singletons/accueil.md (${accueilRefs.length} -> ${vedetteRefs.length} items).`
  );
}

main().catch((error) => {
  console.error("[sync:articlesVedette] Failed:", error);
  process.exitCode = 1;
});
