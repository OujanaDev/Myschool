#!/usr/bin/env node
/**
 * Importe les cours du dépôt dans Myschool via l'API d'administration.
 * Les leçons sont créées NON publiées : relisez-les dans /admin/cours avant de les publier.
 *
 *   npm run import -- [--api http://localhost:4000/api] [--email admin@myschool.ma] [--password ...]
 *                      [--only <id|slug|url>] [--level <slug>] [--publish] [--dry-run] [--update]
 *
 * Variables d'environnement équivalentes : MYSCHOOL_API, MYSCHOOL_ADMIN_EMAIL, MYSCHOOL_ADMIN_PASSWORD.
 * Pour chaque cours : niveau (slug) → matière (slug) → chapitre (par titre, créé s'il n'existe pas) → leçon.
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { findEntry, loadIndex, readCourse, ROOT, saveIndex } from "./repository.mjs";
import { chapterKey, fold, log } from "./util.mjs";

const { values: opts } = parseArgs({
  options: {
    api: { type: "string", default: process.env.MYSCHOOL_API || "http://localhost:4000/api" },
    email: { type: "string", default: process.env.MYSCHOOL_ADMIN_EMAIL || "admin@myschool.ma" },
    password: { type: "string", default: process.env.MYSCHOOL_ADMIN_PASSWORD || "" },
    only: { type: "string" },
    site: { type: "string" },
    level: { type: "string" },
    publish: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    force: { type: "boolean", default: false },
    "allow-reserved": { type: "boolean", default: false },
    update: { type: "boolean", default: false },
    // Updates only the lessons whose course file changed since their last import (rewritten or corrected).
    changed: { type: "boolean", default: false },
  },
});

if (!opts.password) {
  console.error("Mot de passe admin manquant : --password ... ou MYSCHOOL_ADMIN_PASSWORD.");
  process.exit(1);
}

let token = "";
async function api(method, route, body) {
  let res;
  // "fetch failed" right after a success: a kept-alive connection the server had just closed. Retry on a new one.
  for (let attempt = 1; ; attempt++) {
    try {
      res = await fetch(opts.api.replace(/\/$/, "") + route, {
        method,
        headers: { "content-type": "application/json", connection: "close", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      break;
    } catch (err) {
      if (attempt >= 4) throw err;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${route} → ${res.status} ${data.error || ""}`);
  return data;
}

const index = loadIndex();

// Last import time per course, kept outside index.json: a running reformulate.mjs saves its own older copy of the
// index, which would wipe importedAt and make every run update every lesson again.
const STATE = path.join(ROOT, ".import-state.json");
const importState = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : {};
function markImported(entry) {
  importState[entry.id] = entry.importedAt;
  fs.writeFileSync(STATE, JSON.stringify(importState));
}
let entries = index.entries;
if (opts.only) entries = [findEntry(index, opts.only)].filter(Boolean);
if (opts.site) entries = entries.filter((e) => (e.site || "web") === opts.site);
if (opts.level) entries = entries.filter((e) => e.level === opts.level);
if (!entries.length) {
  console.error("Aucun cours à importer avec ces filtres.");
  process.exit(1);
}

const login = await api("POST", "/auth/login", { email: opts.email, password: opts.password });
token = login.token;
if (login.user.role !== "ADMIN") {
  console.error("Ce compte n'est pas administrateur.");
  process.exit(1);
}
const levels = await api("GET", "/admin/levels");
const levelSubjectCache = new Map();

async function chaptersOf(levelSubjectId) {
  if (!levelSubjectCache.has(levelSubjectId)) {
    const ls = await api("GET", `/admin/level-subjects/${levelSubjectId}`);
    levelSubjectCache.set(levelSubjectId, ls.chapters || []);
  }
  return levelSubjectCache.get(levelSubjectId);
}

let done = 0;
let skipped = 0;
let failed = 0;
for (const entry of entries) {
  let update = opts.update;
  if (entry.importedLessonId && opts.changed && !update) {
    const file = entry.file && path.join(ROOT, entry.file);
    const modified = file && fs.existsSync(file) ? fs.statSync(file).mtimeMs : 0;
    update = modified > Math.max(Date.parse(entry.importedAt || 0), Date.parse(importState[entry.id] || 0));
  }
  if (entry.importedLessonId && !opts.force && !update) {
    log(`= déjà importé (${entry.importedLessonId}) : ${entry.title}`);
    skipped++;
    continue;
  }
  if (entry.rights === "reserved" && !opts["allow-reserved"]) {
    log(`= droits réservés, non importé (--allow-reserved pour forcer, à vos risques) : ${entry.title}`);
    skipped++;
    continue;
  }
  try {
    const level = levels.find((l) => l.slug === entry.level);
    if (!level) throw new Error(`niveau "${entry.level}" introuvable dans Myschool`);
    const ls = level.subjects.find((s) => s.subject.slug === entry.subject);
    if (!ls) throw new Error(`matière "${entry.subject}" non rattachée au niveau ${level.name}`);

    const chapterTitle = entry.chapter || entry.title;
    const chapters = await chaptersOf(ls.id);
    // Same title first, then the same chapter written differently (N / IN / ℕ, article, "Unité 1 :")
    let chapter =
      chapters.find((c) => fold(c.title) === fold(chapterTitle)) ??
      chapters.find((c) => chapterKey(c.title) === chapterKey(chapterTitle));
    if (!chapter) {
      log(`  + création du chapitre « ${chapterTitle} » (${level.shortName || level.name} / ${ls.subject.name})`);
      if (!opts["dry-run"]) {
        chapter = await api("POST", "/admin/chapters", { levelSubjectId: ls.id, title: chapterTitle });
        chapters.push(chapter);
      } else chapter = { id: "dry-run" };
    }

    const { body, meta } = readCourse(entry);
    // Original (reformulated) courses are published as-is; scraped content carries its source attribution.
    const attribution =
      entry.rights === "original"
        ? ""
        : `> Source : [${entry.url}](${entry.url})${entry.license ? ` — licence : ${entry.license}` : ""}. Contenu à relire et adapter avant publication.\n\n`;
    const lesson = {
      chapterId: chapter.id,
      // The course file is the reference: a title renamed by retitle.mjs may still be stale in the index.
      title: meta.title || entry.title,
      type: entry.type,
      content: attribution + body.trim(),
      durationMin: Math.max(5, Math.min(120, Math.round(entry.words / 150))),
      isPremium: false,
      isPublished: opts.publish,
      ...(entry.video ? { videoUrl: entry.video } : {}),
      ...(entry.pdfUrl ? { fileUrl: entry.pdfUrl } : {}),
    };
    if (opts["dry-run"]) {
      log(`~ (simulation) leçon « ${lesson.title} » → ${level.name} / ${ls.subject.name} / ${chapterTitle}`);
    } else {
      if (entry.importedLessonId && update) {
        // Same lesson, new content (e.g. after a change of course format): keep its id, progress and favourites.
        await api("PUT", `/admin/lessons/${entry.importedLessonId}`, lesson);
        entry.importedAt = new Date().toISOString();
        markImported(entry);
        saveIndex(index);
        log(`✓ leçon mise à jour ${entry.importedLessonId} : ${lesson.title}`);
        done++;
        continue;
      }
      const created = await api("POST", "/admin/lessons", lesson);
      entry.importedLessonId = created.id;
      entry.importedAt = new Date().toISOString();
      markImported(entry);
      saveIndex(index);
      log(`✓ leçon créée ${created.id} (${opts.publish ? "publiée" : "brouillon"}) : ${lesson.title}`);
    }
    done++;
  } catch (err) {
    log(`✗ ${entry.title} : ${err.message}`);
    failed++;
  }
}
log(`Terminé : ${done} importé(s), ${skipped} ignoré(s), ${failed} échec(s).`);
process.exit(failed && !done ? 1 : 0);
