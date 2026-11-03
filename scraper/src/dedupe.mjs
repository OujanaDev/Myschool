#!/usr/bin/env node
/**
 * Supprime les cours en double : deux documents AlloSchool au texte identique dans le même niveau et la même matière
 * (le même PDF publié dans deux chapitres, ou deux fois dans le même), et deux cours finaux au contenu identique.
 * Le premier reformulé (et importé) est gardé ; les autres sources sont marquées `duplicateOf` (reformulate.mjs les
 * ignore), leurs cours finaux retirés du dépôt (fichier supprimé, `file: null`) et leurs leçons supprimées du site.
 * Les copies d'un même cours dans des filières différentes (reusedFrom) sont normales et ne sont pas touchées.
 *
 *   node src/dedupe.mjs [--dry-run] [--level <slug>] [--subject <slug>] [--password ...]
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { createHash } from "node:crypto";
import { loadIndex, readCourse, ROOT, saveIndex } from "./repository.mjs";
import { log } from "./util.mjs";

const { values: opts } = parseArgs({
  options: {
    api: { type: "string", default: process.env.MYSCHOOL_API || "http://localhost:4000/api" },
    email: { type: "string", default: process.env.MYSCHOOL_ADMIN_EMAIL || "admin@myschool.ma" },
    password: { type: "string", default: process.env.MYSCHOOL_ADMIN_PASSWORD || "" },
    level: { type: "string" },
    subject: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});
if (!opts.password && !opts["dry-run"]) {
  console.error("Mot de passe admin manquant : --password ... ou MYSCHOOL_ADMIN_PASSWORD.");
  process.exit(1);
}

let token = "";
async function api(method, route, body) {
  const res = await fetch(opts.api.replace(/\/$/, "") + route, {
    method,
    headers: { "content-type": "application/json", connection: "close", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 404) throw new Error(`${method} ${route} → ${res.status} ${data.error || ""}`);
  return data;
}

/** Same fingerprint as the reuse step of reformulate.mjs: the text without its "Document PDF d'origine" line. */
export function contentKey(entry) {
  try {
    const text = readCourse(entry).body.replace(/^> Document PDF d.origine.*$/m, "").replace(/\s+/g, " ").trim();
    return text ? createHash("md5").update(text).digest("hex") : null;
  } catch {
    return null;
  }
}

const index = loadIndex();
const inScope = (e) => (!opts.level || e.level === opts.level) && (!opts.subject || e.subject === opts.subject);
const finalsOf = (source) => index.entries.filter((e) => e.site === "final" && e.sourceId === source.id);
const at = (e) => Date.parse(e.importedAt || e.fetchedAt || 0) || Infinity;

/** Groups entries of one level/subject by identical content. */
function groups(entries) {
  const map = new Map();
  for (const e of entries) {
    const key = contentKey(e);
    if (!key) continue;
    const k = `${e.level}|${e.subject}|${key}`;
    (map.get(k) ?? map.set(k, []).get(k)).push(e);
  }
  return [...map.values()].filter((g) => g.length > 1);
}

const removedLessons = [];
const removedFinals = [];
function dropFinal(final, keeper) {
  if (final.importedLessonId) removedLessons.push(final.importedLessonId);
  removedFinals.push(final);
  if (!opts["dry-run"]) {
    if (final.file) {
      try {
        fs.unlinkSync(path.join(ROOT, final.file));
      } catch {
        /* already gone */
      }
    }
    final.file = null;
    final.importedLessonId = null;
    final.duplicateOf = keeper.id;
  }
}

// 1. Identical AlloSchool sources in the same level/subject: keep the one already reformulated (and imported first).
const sources = index.entries.filter((e) => e.site === "alloschool" && e.file && !e.duplicateOf && (e.words || 0) >= 120 && inScope(e));
let markedSources = 0;
for (const g of groups(sources)) {
  const rank = (e) => {
    const finals = finalsOf(e).filter((f) => f.file);
    const imported = finals.filter((f) => f.importedLessonId);
    return [imported.length ? 0 : finals.length ? 1 : e.reformulatedId ? 2 : 3, Math.min(...imported.map(at), Infinity), at(e)];
  };
  const sorted = [...g].sort((a, b) => {
    const [ra, rb] = [rank(a), rank(b)];
    return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2];
  });
  const keeper = sorted[0];
  log(`\n[${keeper.level} / ${keeper.subject}] gardé : ${keeper.chapter} | ${keeper.title} (${keeper.id})`);
  for (const dup of sorted.slice(1)) {
    log(`  ✗ doublon : ${dup.chapter} | ${dup.title} (${dup.id})${dup.reformulatedId ? " — déjà reformulé" : ""}`);
    markedSources++;
    if (!opts["dry-run"]) dup.duplicateOf = keeper.id;
    for (const f of finalsOf(dup).filter((f) => f.file)) {
      log(`    ✗ cours final ${f.id}${f.importedLessonId ? ` (leçon ${f.importedLessonId})` : ""} : ${f.title}`);
      dropFinal(f, finalsOf(keeper)[0] ?? keeper);
    }
  }
}

// 2. Identical final courses in the same level/subject (copies made before this script): keep the first imported.
const finals = index.entries.filter((e) => e.site === "final" && e.file && inScope(e));
let dupFinals = 0;
for (const g of groups(finals)) {
  const sorted = [...g].sort((a, b) => (a.importedLessonId ? 0 : 1) - (b.importedLessonId ? 0 : 1) || at(a) - at(b));
  const keeper = sorted[0];
  log(`\n[${keeper.level} / ${keeper.subject}] cours gardé : ${keeper.title} (${keeper.id}${keeper.importedLessonId ? `, leçon ${keeper.importedLessonId}` : ""})`);
  for (const dup of sorted.slice(1)) {
    log(`  ✗ cours identique ${dup.id}${dup.importedLessonId ? ` (leçon ${dup.importedLessonId})` : ""} : ${dup.title}`);
    dupFinals++;
    dropFinal(dup, keeper);
    const src = index.entries.find((e) => e.id === dup.sourceId);
    if (src && !opts["dry-run"] && !src.duplicateOf && src.id !== keeper.sourceId) {
      src.duplicateOf = keeper.sourceId;
      markedSources++;
    }
  }
}

// 3. Lessons of the site with identical content in the same level/subject that the index does not know about
// (an import interrupted and relaunched created the lesson twice): keep the one the index points to, else the oldest.
let siteDups = 0;
if (opts.password) {
  const login = await api("POST", "/auth/login", { email: opts.email, password: opts.password });
  token = login.token;
  if (login.user.role !== "ADMIN") {
    console.error("Ce compte n'est pas administrateur.");
    process.exit(1);
  }
  const known = new Set(index.entries.map((e) => e.importedLessonId).filter(Boolean));
  const textKey = (s) => createHash("md5").update(s.replace(/\s+/g, " ").trim()).digest("hex");
  const dropping = new Set(removedLessons);
  for (const level of await api("GET", "/admin/levels")) {
    if (opts.level && level.slug !== opts.level) continue;
    for (const ls of level.subjects) {
      if (opts.subject && ls.subject.slug !== opts.subject) continue;
      const detail = await api("GET", `/admin/level-subjects/${ls.id}`);
      const map = new Map();
      for (const ch of detail.chapters || []) {
        for (const l of ch.lessons) {
          if ((l.content || "").length < 200 || dropping.has(l.id)) continue;
          const k = textKey(l.content);
          (map.get(k) ?? map.set(k, []).get(k)).push({ ...l, chapterTitle: ch.title });
        }
      }
      for (const g of [...map.values()].filter((x) => x.length > 1)) {
        g.sort((a, b) => (known.has(a.id) ? 0 : 1) - (known.has(b.id) ? 0 : 1) || Date.parse(a.createdAt) - Date.parse(b.createdAt));
        log(`\n[${level.slug} / ${ls.subject.slug}] leçon gardée ${g[0].id} : ${g[0].chapterTitle} | ${g[0].title}`);
        for (const dup of g.slice(1)) {
          log(`  ✗ leçon identique ${dup.id} : ${dup.chapterTitle} | ${dup.title}`);
          siteDups++;
          removedLessons.push(dup.id);
          const final = index.entries.find((e) => e.importedLessonId === dup.id);
          if (final && !opts["dry-run"]) dropFinal(final, index.entries.find((e) => e.importedLessonId === g[0].id) ?? g[0]);
        }
      }
    }
  }
}

if (opts["dry-run"]) {
  log(`\nSimulation : ${markedSources} source(s) en double, ${removedFinals.length} cours final(s) à retirer, ${new Set(removedLessons).size} leçon(s) à supprimer du site (dont ${siteDups} inconnue(s) du dépôt).`);
  process.exit(0);
}

let deleted = 0;
for (const id of new Set(removedLessons)) {
  await api("DELETE", `/admin/lessons/${id}`);
  deleted++;
}
saveIndex(index);
log(`\nTerminé : ${markedSources} source(s) marquée(s) en double, ${removedFinals.length} cours final(s) retiré(s), ${deleted} leçon(s) supprimée(s) du site.`);
