#!/usr/bin/env node
/**
 * Titres courts et numérotés pour les cours reformulés, chapitre par chapitre :
 *   « <chapitre> cours n », « <chapitre> cours n – partie m » pour les parties d'un même long document,
 *   « <chapitre> résumé n » pour les résumés.
 * La numérotation suit l'ordre des leçons du chapitre sur la plateforme (ordre de création) ; les cours passent avant
 * les résumés. Le titre détaillé devient un sous-titre en italique sous le titre du cours. Met à jour le fichier du
 * cours puis la leçon (titre, contenu, ordre). Sans appel au modèle ; relancer ne change que les nouveaux cours.
 *
 *   node src/number-titles.mjs --password ... [--level 2bac-pc] [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { ROOT, loadIndex, readCourse, saveCourse, saveIndex } from "./repository.mjs";
import { fold, log } from "./util.mjs";

const { values: opts } = parseArgs({
  options: {
    api: { type: "string", default: process.env.MYSCHOOL_API || "http://localhost:4000/api" },
    email: { type: "string", default: process.env.MYSCHOOL_ADMIN_EMAIL || "admin@myschool.ma" },
    password: { type: "string", default: process.env.MYSCHOOL_ADMIN_PASSWORD || "" },
    level: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});
if (!opts.password) {
  console.error("Mot de passe admin manquant : --password ... ou MYSCHOOL_ADMIN_PASSWORD.");
  process.exit(1);
}

let token = "";
async function api(method, route, body) {
  let res;
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

const PART = /\s*\(partie (\d+)\/(\d+)\)\s*$/i;

/** The detailed title, minus "(partie n/N)" and the chapter name it often starts with: "Onde sinusoïdale et déphasage". */
function subtitleOf(longTitle, chapter) {
  let s = String(longTitle || "").replace(PART, "").trim();
  const f = fold(s);
  const c = fold(chapter);
  if (c && f.startsWith(c)) s = s.slice(chapter.length).replace(/^\s*[:—–-]\s*/, "").trim();
  if (!s || fold(s) === c) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Replaces the course's "# " heading by the new title, followed by the subtitle line. */
function retitleBody(body, title, subtitle) {
  const lines = body.trim().split("\n");
  const h = lines.findIndex((l) => /^#\s+\S/.test(l));
  const head = [`# ${title}`, ...(subtitle ? ["", `*${subtitle}*`] : [])];
  if (h < 0) return [...head, "", ...lines].join("\n");
  // Drop a subtitle line written by an earlier run, so that a run never stacks two of them.
  let end = h + 1;
  while (end < lines.length && !lines[end].trim()) end++;
  if (end < lines.length && /^\*[^*].*\*$/.test(lines[end].trim()) && end <= h + 2) end++;
  else end = h + 1;
  return [...lines.slice(0, h), ...head, ...lines.slice(end)].join("\n");
}

const STATE = path.join(ROOT, ".import-state.json");
const importState = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : {};

const login = await api("POST", "/auth/login", { email: opts.email, password: opts.password });
token = login.token;
const levels = (await api("GET", "/admin/levels")).filter((l) => !opts.level || l.slug === opts.level);
const index = loadIndex();
const byLesson = new Map(index.entries.filter((e) => e.site === "final" && e.importedLessonId && e.file).map((e) => [e.importedLessonId, e]));

let renamed = 0;
let unchanged = 0;
let failed = 0;
for (const level of levels) {
  for (const ls of level.subjects || []) {
    const detail = await api("GET", `/admin/level-subjects/${ls.id}`);
    for (const chapter of detail.chapters || []) {
      const lessons = (chapter.lessons || []).filter((l) => byLesson.has(l.id));
      if (!lessons.length) continue;
      // One number per document: the parts of a long document share theirs.
      const docs = new Map();
      const count = { cours: 0, résumé: 0 };
      for (const l of lessons) {
        const e = byLesson.get(l.id);
        const key = e.part ? `src:${e.sourceId}` : e.id;
        if (!docs.has(key)) {
          const kind = e.type === "SUMMARY" ? "résumé" : "cours";
          docs.set(key, { kind, n: ++count[kind] });
        }
      }
      for (const l of lessons) {
        const e = byLesson.get(l.id);
        const doc = docs.get(e.part ? `src:${e.sourceId}` : e.id);
        const part = e.part ? Number(String(e.part).split("/")[0]) : 0;
        const title = `${chapter.title} ${doc.kind} ${doc.n}${part ? ` – partie ${part}` : ""}`;
        const order = (doc.kind === "cours" ? 1000 : 2000) + doc.n * 10 + part;
        try {
          const { meta, body } = readCourse(e);
          // The detailed title is kept once, before the first renaming.
          if (!e.longTitle) e.longTitle = meta.title && meta.title !== title ? meta.title : e.title;
          const subtitle = subtitleOf(e.longTitle, chapter.title);
          const content = retitleBody(body, title, subtitle);
          if (meta.title === title && content === body.trim() && l.title === title && l.order === order) {
            unchanged++;
            continue;
          }
          if (opts["dry-run"]) {
            log(`~ ${level.shortName || level.name} / ${ls.subject.name} : « ${l.title} » → « ${title} »${subtitle ? ` (sous-titre : ${subtitle})` : ""}`);
            renamed++;
            continue;
          }
          e.title = title;
          saveCourse(e, content);
          await api("PUT", `/admin/lessons/${l.id}`, { title, content, order });
          e.importedAt = new Date().toISOString();
          importState[e.id] = e.importedAt;
          renamed++;
          log(`✓ ${l.title}  →  ${title}`);
        } catch (err) {
          failed++;
          log(`✗ ${l.title} : ${err.message}`);
        }
      }
    }
  }
  if (!opts["dry-run"]) {
    saveIndex(index);
    fs.writeFileSync(STATE, JSON.stringify(importState));
  }
}
log(`Terminé : ${renamed} cours ${opts["dry-run"] ? "à renommer" : "renommé(s)"}, ${unchanged} déjà à jour, ${failed} échec(s).`);
