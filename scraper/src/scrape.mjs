#!/usr/bin/env node
/**
 * Récupère une ou plusieurs pages de cours et les range dans ./repository.
 *
 *   npm run scrape                                  -> toutes les entrées de sources.json
 *   npm run scrape -- <url> [<url>...] [options]    -> ces URLs seulement
 *
 * Options : --level <slug> --subject <slug> --chapter "<titre>" --type COURSE|SUMMARY|EXERCISE|EXAM|VIDEO
 *           --tags a,b,c   --force (re-télécharge même si déjà présent)   --sources <fichier.json>
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { fetchHtml } from "./fetcher.mjs";
import { extract } from "./extract.mjs";
import { findEntry, loadIndex, saveCourse, saveIndex } from "./repository.mjs";
import { idForUrl, log, slugify, wordCount } from "./util.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TYPES = ["COURSE", "SUMMARY", "EXERCISE", "EXAM", "VIDEO"];

const { values: opts, positionals: urls } = parseArgs({
  allowPositionals: true,
  options: {
    level: { type: "string" },
    subject: { type: "string" },
    chapter: { type: "string" },
    type: { type: "string" },
    tags: { type: "string" },
    force: { type: "boolean", default: false },
    sources: { type: "string", default: path.join(HERE, "..", "sources.json") },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (opts.help) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0].replace(/^(#!.*\n)?\/\*\*?/, ""));
  process.exit(0);
}

const sourcesFile = JSON.parse(fs.readFileSync(opts.sources, "utf8"));
const defaults = { level: "non-classe", subject: "non-classe", type: "COURSE", tags: [], ...(sourcesFile.defaults || {}) };

const jobs = urls.length
  ? urls.map((url) => ({ url, level: opts.level, subject: opts.subject, chapter: opts.chapter, type: opts.type, tags: opts.tags?.split(",") }))
  : sourcesFile.sources || [];

if (!jobs.length) {
  console.error("Aucune URL : passez des URLs en argument ou remplissez sources.json.");
  process.exit(1);
}

const index = loadIndex();
let ok = 0;
let skipped = 0;
let failed = 0;

for (const job of jobs) {
  const url = String(job.url || "").trim();
  if (!/^https?:\/\//.test(url)) {
    log(`✗ URL invalide ignorée : ${url}`);
    failed++;
    continue;
  }
  const type = String(job.type || defaults.type).toUpperCase();
  if (!TYPES.includes(type)) {
    log(`✗ ${url} : type inconnu "${type}" (attendu : ${TYPES.join(", ")})`);
    failed++;
    continue;
  }
  if (/^https?:\/\/(www\.)?alloschool\.com\//.test(url)) {
    log(`✗ ${url} : les cours AlloSchool sont des PDF, utilisez "npm run alloschool -- <url-cours>"`);
    failed++;
    continue;
  }
  const existing = findEntry(index, url);
  if (existing && !opts.force) {
    log(`= déjà présent, ignoré (--force pour refaire) : ${existing.file}`);
    skipped++;
    continue;
  }

  log(`→ ${url}`);
  try {
    const { html, finalUrl } = await fetchHtml(url);
    const page = extract(html, finalUrl);
    if (wordCount(page.markdown) < 50) throw new Error("contenu trop court, extraction probablement ratée");

    const entry = {
      id: existing?.id || idForUrl(url),
      url,
      finalUrl,
      title: page.title,
      slug: existing?.slug || slugify(page.title),
      level: job.level || defaults.level,
      subject: job.subject || defaults.subject,
      chapter: job.chapter || "",
      type,
      tags: job.tags?.length ? job.tags : defaults.tags,
      lang: page.lang,
      license: page.license,
      description: page.description,
      fetchedAt: new Date().toISOString(),
      words: wordCount(page.markdown),
      importedLessonId: existing?.importedLessonId || null,
    };
    entry.file = saveCourse(entry, page.markdown);
    if (existing) Object.assign(existing, entry);
    else index.entries.push(entry);
    saveIndex(index);
    log(`✓ ${entry.title} (${entry.words} mots) → repository/${entry.file}`);
    ok++;
  } catch (err) {
    log(`✗ ${url} : ${err.message}`);
    failed++;
  }
}

log(`Terminé : ${ok} récupéré(s), ${skipped} ignoré(s), ${failed} échec(s). Dépôt : ${index.entries.length} cours.`);
process.exit(failed && !ok ? 1 : 0);
