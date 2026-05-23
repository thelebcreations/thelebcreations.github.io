#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

const ROOT = process.cwd();
const ARTICLES_DIR = path.join(ROOT, "content", "articles");
const UPLOADS_DIR = path.join(ROOT, "public", "uploads");
const TINA_OPTIONS_PATH = path.join(ROOT, "tina", "options.ts");

async function main() {
  const args = withNpmConfigFallback(parseArgs(process.argv.slice(2)));

  if (args.help) {
    printHelp();
    return;
  }

  const required = ["url", "slug", "quantite", "categorie", "theme"];
  for (const key of required) {
    if (args[key] === undefined || args[key] === "") {
      fail(`Missing required argument --${key}. Run with --help for usage.`);
    }
  }

  const quantite = Number.parseInt(String(args.quantite), 10);
  if (!Number.isInteger(quantite) || quantite < 1) {
    fail("quantite must be an integer >= 1.");
  }

  const vedetteRaw = args.vedette === undefined || args.vedette === ""
    ? "false"
    : args.vedette;
  const vedette = parseBoolean(vedetteRaw);
  if (vedette === null) {
    fail("vedette must be true/false, 1/0, yes/no, or on/off.");
  }

  const maxImages = args["max-images"] !== undefined
    ? Number.parseInt(String(args["max-images"]), 10)
    : 6;
  if (!Number.isInteger(maxImages) || maxImages < 1 || maxImages > 6) {
    fail("max-images must be an integer between 1 and 6.");
  }

  const slug = String(args.slug).trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    fail("slug must be kebab-case lowercase ASCII (letters, numbers, hyphens).");
  }

  const articlePath = path.join(ARTICLES_DIR, `${slug}.md`);
  if (await exists(articlePath)) {
    fail(`Slug collision: ${path.relative(ROOT, articlePath)} already exists.`);
  }

  const optionsSource = await readRequiredFile(TINA_OPTIONS_PATH);
  const allowedCategories = getAllowedValuesFromOptions(optionsSource, "CATEGORIE_OPTIONS");
  const allowedThemes = getAllowedValuesFromOptions(optionsSource, "THEME_OPTIONS");

  const categorie = String(args.categorie).trim();
  const theme = String(args.theme).trim();

  validateAllowedValue("categorie", categorie, allowedCategories);
  validateAllowedValue("theme", theme, allowedThemes);

  const itemUrl = parseAndValidateVintedItemUrl(String(args.url).trim());
  const referer = `${itemUrl.origin}/`;

  console.log("Fetching Vinted page...");
  const html = await fetchHtmlWithRetry(itemUrl.toString(), referer);

  const extracted = extractVintedData(html);
  if (!extracted.title) {
    fail("Could not extract title from Vinted page.");
  }
  if (!extracted.priceRaw) {
    fail("Could not extract price from Vinted page.");
  }

  const prix = parseFrenchPrice(extracted.priceRaw);
  if (!Number.isFinite(prix) || prix <= 0) {
    fail(`Could not parse a valid price from: ${extracted.priceRaw}`);
  }

  const descriptionSource = extracted.description || "";
  const formattedBody = formatDescriptionBody(descriptionSource);
  const material = cleanText(extracted.material || "");
  const finalBody = appendMaterialToBody(formattedBody, material);

  const dedupedImages = dedupeImageUrls(extracted.images)
    .filter((imageUrl) => imageUrl.includes(".webp"))
    .slice(0, maxImages);

  if (dedupedImages.length === 0) {
    fail("Could not extract any .webp image URL from the listing.");
  }

  const imageRefs = dedupedImages.map((_, i) => `/uploads/${slug}-${i + 1}.webp`);
  const targetImagePaths = dedupedImages.map((_, i) => path.join(UPLOADS_DIR, `${slug}-${i + 1}.webp`));

  for (const target of targetImagePaths) {
    if (await exists(target)) {
      fail(`Image target already exists: ${path.relative(ROOT, target)}.`);
    }
  }

  const markdown = buildMarkdown({
    titre: extracted.title,
    prix,
    quantite,
    categorie,
    theme,
    vedette,
    images: imageRefs,
    body: finalBody,
  });

  const dryRun = Boolean(args["dry-run"]);
  if (dryRun) {
    printDryRun({
      url: itemUrl.toString(),
      slug,
      quantite,
      categorie,
      theme,
      vedette,
      titre: extracted.title,
      prix,
      material,
      imageUrls: dedupedImages,
      imageRefs,
      articlePath,
      formattedBody: finalBody,
    });
    return;
  }

  await fs.mkdir(ARTICLES_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "vinted-ingest-"));
  try {
    const tempFiles = [];
    for (let i = 0; i < dedupedImages.length; i += 1) {
      const imageUrl = dedupedImages[i];
      const tempPath = path.join(tempDir, `${slug}-${i + 1}.webp`);
      await downloadBinary(imageUrl, tempPath, referer);
      tempFiles.push(tempPath);
    }

    for (let i = 0; i < tempFiles.length; i += 1) {
      await moveFileCrossDeviceSafe(tempFiles[i], targetImagePaths[i]);
    }

    await fs.writeFile(articlePath, markdown, "utf8");

    console.log("Ingestion complete.");
    console.log(`Created article: ${path.relative(ROOT, articlePath)}`);
    for (const target of targetImagePaths) {
      console.log(`Created image:   ${path.relative(ROOT, target)}`);
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function withNpmConfigFallback(args) {
  const merged = { ...args };
  const positional = Array.isArray(args._) ? [...args._] : [];
  const npmArgvFallback = parseNpmConfigArgvArgs();
  let positionalIndex = 0;
  const keys = ["url", "slug", "quantite", "categorie", "theme", "vedette", "max-images"];

  for (const key of keys) {
    if (merged[key] !== undefined && merged[key] !== "") {
      continue;
    }

    const envKey = `npm_config_${key.replace(/-/g, "_")}`;
    const envValue = process.env[envKey];
    if (envValue !== undefined && envValue !== "") {
      if ((envValue === "true" || envValue === "false") && positionalIndex < positional.length) {
        merged[key] = positional[positionalIndex];
        positionalIndex += 1;
      } else {
        merged[key] = envValue;
      }
      continue;
    }

    if (positionalIndex < positional.length) {
      merged[key] = positional[positionalIndex];
      positionalIndex += 1;
    }

    if ((merged[key] === undefined || merged[key] === "") && npmArgvFallback[key] !== undefined && npmArgvFallback[key] !== "") {
      merged[key] = npmArgvFallback[key];
    }
  }

  if (merged["dry-run"] !== true) {
    const dryRunEnv = process.env.npm_config_dry_run;
    if (dryRunEnv !== undefined && dryRunEnv !== "") {
      const parsed = parseBoolean(dryRunEnv);
      merged["dry-run"] = parsed === null ? true : parsed;
    }

    if (merged["dry-run"] !== true && npmArgvFallback["dry-run"] === true) {
      merged["dry-run"] = true;
    }
  }

  return merged;
}

function parseNpmConfigArgvArgs() {
  const raw = process.env.npm_config_argv;
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    const original = Array.isArray(parsed?.original) ? parsed.original : [];
    if (original.length === 0) {
      return {};
    }

    const separatorIndex = original.indexOf("--");
    const candidateTokens = separatorIndex >= 0
      ? original.slice(separatorIndex + 1)
      : original.filter((token) => String(token).startsWith("--"));

    if (candidateTokens.length === 0) {
      return {};
    }

    return parseArgs(candidateTokens);
  } catch {
    return {};
  }
}

function parseArgs(argv) {
  const args = { _: [] };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }

    const keyValue = token.slice(2);
    if (keyValue === "help") {
      args.help = true;
      continue;
    }
    if (keyValue === "dry-run") {
      args["dry-run"] = true;
      continue;
    }

    const eqIndex = keyValue.indexOf("=");
    if (eqIndex !== -1) {
      const key = keyValue.slice(0, eqIndex);
      const value = keyValue.slice(eqIndex + 1);
      args[key] = value;
      continue;
    }

    const key = keyValue;
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "";
    } else {
      args[key] = next;
      i += 1;
    }
  }

  return args;
}

function printHelp() {
  console.log("Vinted ingestion CLI");
  console.log("");
  console.log("Required arguments:");
  console.log("  --url         Vinted item URL");
  console.log("  --slug        Slug used for markdown and image names");
  console.log("  --quantite    Integer >= 1");
  console.log("  --categorie   Must match Tina categorie options");
  console.log("  --theme       Must match Tina theme options");
  console.log("  --vedette     true/false (also 1/0, yes/no, on/off). Default: false");
  console.log("");
  console.log("Optional:");
  console.log("  --dry-run     Show parsed result without writing files");
  console.log("  --max-images  1..6 (default: 6)");
  console.log("");
  console.log("Example:");
  console.log("  node scripts/vinted-ingest.mjs --url https://www.vinted.fr/items/8619691696-sac-fourre-tout --slug sac-fourre-tout-guitare-breton --quantite 1 --categorie sacs --theme musique --vedette true --dry-run");
}

function parseBoolean(value) {
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n", "off"].includes(normalized)) {
    return false;
  }
  return null;
}

async function readRequiredFile(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    fail(`Cannot read required file: ${path.relative(ROOT, filePath)}. ${error.message}`);
  }
}

function getAllowedValuesFromOptions(optionsSource, constName) {
  const optionBlock = extractConstArrayBlock(optionsSource, constName);
  const valueRegex = /value:\s*["']([^"']+)["']/g;
  const values = [];
  let match;
  while ((match = valueRegex.exec(optionBlock)) !== null) {
    values.push(match[1]);
  }

  if (values.length === 0) {
    fail(`No option values found in '${constName}' within tina/options.ts.`);
  }

  return values;
}

function extractConstArrayBlock(source, constName) {
  const startRegex = new RegExp(`const\\s+${escapeRegExp(constName)}\\s*=\\s*\\[`, "m");
  const startMatch = source.match(startRegex);
  if (!startMatch || startMatch.index === undefined) {
    fail(`Could not resolve options constant '${constName}' in tina/options.ts.`);
  }

  const startIndex = startMatch.index + startMatch[0].length - 1;
  let depth = 0;
  let endIndex = -1;

  for (let i = startIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "[") {
      depth += 1;
    } else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        endIndex = i;
        break;
      }
    }
  }

  if (endIndex === -1) {
    fail(`Could not parse array values for constant '${constName}'.`);
  }

  return source.slice(startIndex, endIndex + 1);
}

function validateAllowedValue(fieldName, value, allowedValues) {
  if (!allowedValues.includes(value)) {
    fail(
      `Invalid ${fieldName}: '${value}'. Allowed values: ${allowedValues.join(", ")}.`,
    );
  }
}

async function fetchHtmlWithRetry(url, referer) {
  const effectiveReferer = referer || `${new URL(url).origin}/`;
  const headers = {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "accept-language": "fr-FR,fr;q=0.9,en;q=0.8",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    referer: effectiveReferer,
  };

  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
        redirect: "follow",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }

  fail(`Failed to fetch Vinted page: ${lastError?.message || "unknown error"}`);
}

function parseAndValidateVintedItemUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    fail("url must be a valid absolute URL.");
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "https:") {
    fail("url must use https.");
  }

  const host = parsed.hostname.toLowerCase();
  const isVintedHost = /^(?:www\.)?vinted\.[a-z.]+$/.test(host);
  if (!isVintedHost) {
    fail("url must target a Vinted domain, e.g. https://www.vinted.fr/items/... .");
  }

  if (!parsed.pathname.startsWith("/items/")) {
    fail("url must target a Vinted item page, e.g. https://www.vinted.fr/items/... .");
  }

  return parsed;
}

function extractVintedData(html) {
  const jsonLd = extractJsonLdProduct(html);

  const title = cleanText(
    jsonLd?.name
    || readMetaContent(html, "property", "og:title")
    || readTagText(html, "h1"),
  );

  const priceRaw = cleanText(
    valueFromOffer(jsonLd?.offers)
    || readMetaContent(html, "property", "product:price:amount")
    || readMetaContent(html, "name", "twitter:data1")
    || firstMatchGroup(html, /(\d+[\d\s]*(?:[.,]\d{1,2})?)\s*€/i, 1),
  );

  const description = cleanText(
    jsonLd?.description
    || readMetaContent(html, "property", "og:description")
    || "",
  );

  const material = cleanText(
    extractMaterialFromMarker(html) || "",
  );

  const imagesFromJsonLd = dedupeImageUrls(normalizeImages(jsonLd?.image));
  const imagesFromHtml = extractImageUrlsFromHtml(html, title);
  const images = choosePreferredListingImages(imagesFromJsonLd, imagesFromHtml);

  return { title, priceRaw, description, material, images };
}

function extractMaterialFromMarker(html) {
  const markerIndex = html.indexOf("item-attributes-material");
  if (markerIndex === -1) {
    return "";
  }

  const window = html.slice(markerIndex, markerIndex + 1600);
  const ddValue = firstMatchGroup(window, /<dd[^>]*>([\s\S]*?)<\/dd>/i, 1);
  if (ddValue) {
    const cleanedDd = cleanText(decodeHtml(stripTags(ddValue)));
    if (cleanedDd && !isMaterialLabel(cleanedDd)) {
      return cleanedDd;
    }
  }

  const spanRegex = /<span[^>]*>([\s\S]*?)<\/span>/gi;
  let match;
  while ((match = spanRegex.exec(window)) !== null) {
    const cleanedSpan = cleanText(decodeHtml(stripTags(match[1])));
    if (cleanedSpan && !isMaterialLabel(cleanedSpan)) {
      return cleanedSpan;
    }
  }

  return "";
}

function isMaterialLabel(value) {
  const normalized = cleanText(value).replace(/[:：]\s*$/, "");
  return /^(Mati[eè]re|Material)$/i.test(normalized);
}

function extractJsonLdProduct(html) {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const candidates = [];
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    const raw = match[1].trim();
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw);
      collectObjects(parsed, candidates);
    } catch {
      continue;
    }
  }

  for (const obj of candidates) {
    const type = obj?.["@type"];
    const typeList = Array.isArray(type) ? type : [type];
    if (typeList.some((t) => String(t).toLowerCase() === "product")) {
      return obj;
    }
  }

  for (const obj of candidates) {
    if (obj?.name && (obj?.image || obj?.offers || obj?.description)) {
      return obj;
    }
  }

  return null;
}

function collectObjects(input, out) {
  if (!input) {
    return;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      collectObjects(item, out);
    }
    return;
  }

  if (typeof input === "object") {
    out.push(input);
    for (const value of Object.values(input)) {
      collectObjects(value, out);
    }
  }
}

function valueFromOffer(offers) {
  if (!offers) {
    return "";
  }

  if (Array.isArray(offers)) {
    for (const offer of offers) {
      const value = valueFromOffer(offer);
      if (value) {
        return value;
      }
    }
    return "";
  }

  if (typeof offers === "object") {
    return String(offers.price ?? offers.priceSpecification?.price ?? "");
  }

  return "";
}

function normalizeImages(imageField) {
  if (!imageField) {
    return [];
  }

  const values = Array.isArray(imageField) ? imageField : [imageField];
  const urls = [];

  for (const entry of values) {
    if (typeof entry === "string") {
      urls.push(entry);
    } else if (entry && typeof entry === "object") {
      if (typeof entry.url === "string") {
        urls.push(entry.url);
      }
      if (typeof entry.contentUrl === "string") {
        urls.push(entry.contentUrl);
      }
    }
  }

  return urls.filter((url) => /^https?:\/\//.test(url));
}

function extractImageUrlsFromHtml(html, title) {
  const imgTagRegex = /<img\b[^>]*>/gi;
  const titleMatched = [];
  const allCandidates = [];
  let match;

  while ((match = imgTagRegex.exec(html)) !== null) {
    const imgTag = match[0];
    const alt = cleanText(decodeHtml(getTagAttribute(imgTag, "alt") || ""));
    const candidateUrls = [
      getTagAttribute(imgTag, "src"),
      ...extractUrlsFromSrcset(getTagAttribute(imgTag, "srcset") || ""),
    ]
      .filter(Boolean)
      .map((value) => normalizePotentialUrl(value))
      .filter(isVintedImageUrl);

    for (const imageUrl of candidateUrls) {
      allCandidates.push(imageUrl);
      if (isLikelyListingImageAlt(alt, title)) {
        titleMatched.push(imageUrl);
      }
    }
  }

  const uniqueTitleMatched = dedupeImageUrls(titleMatched);
  if (uniqueTitleMatched.length >= 2) {
    return uniqueTitleMatched;
  }

  const uniqueCandidates = dedupeImageUrls(allCandidates);
  const dominantGroup = selectDominantImageGroup(uniqueCandidates);
  if (dominantGroup.length > 0) {
    return dominantGroup;
  }

  const rawTextCandidates = dedupeImageUrls(extractAllVintedImageUrlsFromText(html));
  const dominantFromRawText = selectDominantImageGroup(rawTextCandidates);
  if (dominantFromRawText.length > 0) {
    return dominantFromRawText;
  }

  return rawTextCandidates.filter((url) => /\/f\d+\//.test(url));
}

function extractAllVintedImageUrlsFromText(html) {
  const imageRegex = /https:\/\/images\d?\.vinted\.net\/[^"'\s<>]+/gi;
  const urls = [];
  let match;

  while ((match = imageRegex.exec(html)) !== null) {
    urls.push(match[0]);
  }

  return urls;
}

function choosePreferredListingImages(jsonLdImages, fallbackImages) {
  const jsonLd = dedupeImageUrls(jsonLdImages);
  const fallback = dedupeImageUrls(fallbackImages);

  if (jsonLd.length >= 2) {
    return jsonLd;
  }

  if (jsonLd.length === 1 && fallback.length >= 2) {
    return fallback;
  }

  if (jsonLd.length > 0) {
    return jsonLd;
  }

  return fallback;
}

function getTagAttribute(tag, attrName) {
  const regex = new RegExp(`${escapeRegExp(attrName)}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i");
  const match = tag.match(regex);
  return match ? decodeHtml(match[2]) : "";
}

function extractUrlsFromSrcset(srcset) {
  if (!srcset) {
    return [];
  }

  return String(srcset)
    .split(",")
    .map((entry) => entry.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function normalizePotentialUrl(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  if (text.startsWith("//")) {
    return `https:${text}`;
  }

  return text;
}

function isVintedImageUrl(url) {
  return /^https:\/\/images\d?\.vinted\.net\//.test(url);
}

function isLikelyListingImageAlt(alt, title) {
  const cleanAlt = cleanText(alt);
  const cleanTitle = cleanText(title);

  if (!cleanAlt || !cleanTitle) {
    return false;
  }

  const escapedTitle = escapeRegExp(cleanTitle);
  return new RegExp(`^${escapedTitle}(?:\\s+\\d+)?$`, "i").test(cleanAlt);
}

function selectDominantImageGroup(urls) {
  const groups = new Map();

  for (const url of urls) {
    const id = extractImageAssetId(url);
    if (!id) {
      continue;
    }

    const bucket = groups.get(id) || [];
    bucket.push(url);
    groups.set(id, bucket);
  }

  let best = [];
  for (const bucket of groups.values()) {
    if (bucket.length > best.length) {
      best = bucket;
    }
  }

  return best.length >= 2 ? dedupeImageUrls(best) : [];
}

function extractImageAssetId(url) {
  const match = String(url).match(/\/(\d+)\.webp(?:\?|$)/i);
  return match ? match[1] : "";
}

function dedupeImageUrls(items) {
  const seen = new Set();
  const out = [];

  for (const raw of items) {
    const imageUrl = normalizePotentialUrl(raw);
    if (!imageUrl) {
      continue;
    }

    const key = imageUrl.split(/[?#]/)[0];
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    out.push(imageUrl);
  }

  return out;
}

function readMetaContent(html, attrName, attrValue) {
  const escaped = escapeRegExp(attrValue);
  const regex = new RegExp(
    `<meta[^>]*${attrName}=["']${escaped}["'][^>]*content=["']([\\s\\S]*?)["'][^>]*>`,
    "i",
  );
  const match = html.match(regex);
  return match ? decodeHtml(match[1]) : "";
}

function readTagText(html, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = html.match(regex);
  if (!match) {
    return "";
  }

  return decodeHtml(stripTags(match[1]));
}

function firstMatchGroup(text, regex, groupIndex) {
  const match = text.match(regex);
  if (!match) {
    return "";
  }
  return match[groupIndex] || "";
}

function parseFrenchPrice(value) {
  const cleaned = String(value)
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, "")
    .replace(/€/g, "")
    .replace(/,/g, ".");

  const numberMatch = cleaned.match(/\d+(?:\.\d{1,2})?/);
  if (!numberMatch) {
    return Number.NaN;
  }

  return Number.parseFloat(numberMatch[0]);
}

function formatDescriptionBody(rawDescription) {
  const normalized = cleanText(rawDescription)
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  const sentences = normalized
    .split(".")
    .map((fragment) => fragment.trim())
    .filter(Boolean)
    .map((fragment) => `${fragment.replace(/\.+$/g, "")}.  `);

  if (sentences.length === 0) {
    return "";
  }

  return `${sentences.join("\n")}\n`;
}

function appendMaterialToBody(body, material) {
  const cleanMaterial = cleanText(material).replace(/\.+$/g, "");
  if (!cleanMaterial) {
    return body || "";
  }

  const base = body && body.trim().length > 0
    ? `${body.replace(/\n+$/g, "")}\n\n`
    : "\n";

  return `${base}Matière: ${cleanMaterial}.  \n\n`;
}

function buildMarkdown({ titre, prix, quantite, categorie, theme, vedette, images, body }) {
  const frontmatterLines = [
    "---",
    `titre: ${yamlQuoted(titre)}`,
    `prix: ${formatNumber(prix)}`,
    `quantite: ${quantite}`,
    `categorie: ${categorie}`,
    `theme: ${theme}`,
    "statut: disponible",
    "images:",
    ...images.map((img) => `  - ${img}`),
    `vedette: ${vedette ? "true" : "false"}`,
    "---",
    "",
  ];

  const contentBody = body || "";
  return `${frontmatterLines.join("\n")}${contentBody}`;
}

function yamlQuoted(value) {
  const escaped = String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function formatNumber(value) {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(2).replace(/0+$/g, "").replace(/\.$/, "");
}

function printDryRun({
  url,
  slug,
  quantite,
  categorie,
  theme,
  vedette,
  titre,
  prix,
  material,
  imageUrls,
  imageRefs,
  articlePath,
  formattedBody,
}) {
  console.log("Dry run enabled. No files will be written.");
  console.log("");
  console.log(`URL:        ${url}`);
  console.log(`Slug:       ${slug}`);
  console.log(`Titre:      ${titre}`);
  console.log(`Prix:       ${formatNumber(prix)}`);
  console.log(`Quantite:   ${quantite}`);
  console.log(`Categorie:  ${categorie}`);
  console.log(`Theme:      ${theme}`);
  console.log(`Vedette:    ${vedette}`);
  console.log(`Matiere:    ${material || "(not found)"}`);
  console.log(`Article:    ${path.relative(ROOT, articlePath)}`);
  console.log("Images:");

  for (let i = 0; i < imageUrls.length; i += 1) {
    console.log(`  ${imageRefs[i]} <= ${imageUrls[i]}`);
  }

  console.log("");
  console.log("Body preview:");
  if (!formattedBody) {
    console.log("  (empty)");
  } else {
    for (const line of formattedBody.split("\n")) {
      console.log(`  ${line}`);
    }
  }
}

async function downloadBinary(url, targetPath, referer) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      referer: referer || "https://www.vinted.fr/",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download image ${url} (HTTP ${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(targetPath, Buffer.from(arrayBuffer));
}

async function moveFileCrossDeviceSafe(sourcePath, targetPath) {
  try {
    await fs.rename(sourcePath, targetPath);
    return;
  } catch (error) {
    if (error?.code !== "EXDEV") {
      throw error;
    }
  }

  await fs.copyFile(sourcePath, targetPath);
  await fs.unlink(sourcePath);
}

function dedupePreserveOrder(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!item || seen.has(item)) {
      continue;
    }
    seen.add(item);
    out.push(item);
  }
  return out;
}

function stripTags(value) {
  return String(value).replace(/<[^>]+>/g, " ");
}

function decodeHtml(value) {
  return String(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanText(value) {
  return String(value || "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fail(message) {
  throw new Error(message);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
