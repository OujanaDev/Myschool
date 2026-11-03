#!/usr/bin/env node
/**
 * Removes the interactive labs (``` ```lab ``` blocks) written into the summaries: a summary is a plain revision
 * sheet (definitions, remarks, tips, traps). The cleaned text replaces the published lesson when there is one.
 *
 *   node src/strip-summary-labs.mjs [--password ...] [--dry-run]
 */
import { parseArgs } from "node:util";
import { loadIndex, saveIndex, readCourse, saveCourse } from "./repository.mjs";
import { log } from "./util.mjs";

const { values: opts } = parseArgs({
  options: {
    api: { type: "string", default: process.env.MYSCHOOL_API || "http://localhost:4000/api" },
    email: { type: "string", default: process.env.MYSCHOOL_ADMIN_EMAIL || "admin@myschool.ma" },
    password: { type: "string", default: process.env.MYSCHOOL_ADMIN_PASSWORD || "" },
    "dry-run": { type: "boolean", default: false },
  },
});

let token = "";
async function api(method, route, body) {
  const res = await fetch(opts.api.replace(/\/$/, "") + route, {
    method,
    headers: { "content-type": "application/json", connection: "close", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${route} → ${res.status} ${data.error || ""}`);
  return data;
}

const LAB = /\n*```lab\n[\s\S]*?\n```\n*/g;
const index = loadIndex();
const targets = index.entries.filter((e) => e.site === "final" && e.file && e.type === "SUMMARY");
if (!opts["dry-run"]) {
  if (!opts.password) {
    console.error("Mot de passe admin manquant : --password ... ou MYSCHOOL_ADMIN_PASSWORD.");
    process.exit(1);
  }
  token = (await api("POST", "/auth/login", { email: opts.email, password: opts.password })).token;
}

let cleaned = 0;
let pushed = 0;
let failed = 0;
for (const e of targets) {
  let body;
  try {
    body = readCourse(e).body;
  } catch {
    continue;
  }
  if (!/^```lab\b/m.test(body)) {
    if (e.labs) e.labs = 0;
    continue;
  }
  const out = body.replace(LAB, "\n\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  cleaned++;
  if (opts["dry-run"]) continue;
  saveCourse(e, out);
  e.labs = 0;
  delete e.labsPlan;
  if (e.importedLessonId) {
    try {
      await api("PUT", `/admin/lessons/${e.importedLessonId}`, { content: out });
      pushed++;
    } catch (err) {
      failed++;
      log(`✗ ${e.title} : ${err.message}`);
    }
  }
}
if (!opts["dry-run"]) saveIndex(index);
log(`${opts["dry-run"] ? "(simulation) " : ""}Terminé : ${cleaned} résumé(s) nettoyé(s), ${pushed} leçon(s) mise(s) à jour, ${failed} échec(s).`);
