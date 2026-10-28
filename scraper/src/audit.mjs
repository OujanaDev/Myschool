#!/usr/bin/env node
/**
 * Vérifie que les cours reformulés (repository/final) sont complets.
 *
 *   node src/audit.mjs [--json repository/audit.json] [--requeue]
 *
 * Un cours est signalé quand il se termine au milieu d'une phrase ou d'un bloc, qu'une formule ou un bloc de code
 * n'est pas fermé, qu'un exercice n'a pas sa solution (ou un « Testez-vous » sa réponse), qu'un cours complet n'a
 * pas de partie Exercices, ou qu'il est beaucoup plus court que son document source.
 * --requeue remet les cours signalés en file d'attente : reformulate.mjs les réécrira (même fichier, même leçon).
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { findEntry, loadIndex, readCourse, ROOT, saveIndex } from "./repository.mjs";
import { foldLeakedAnswers, log, wordCount } from "./util.mjs";

const { values: opts } = parseArgs({
  options: { json: { type: "string" }, requeue: { type: "boolean", default: false } },
});

const count = (text, re) => (text.match(re) || []).length;

/** Returns the reasons why a course looks incomplete (empty when it looks complete). */
export function incompleteness(text, entry, sourceWords) {
  const problems = [];
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
  const words = wordCount(body);

  // Unbalanced delimiters: the text stopped inside a formula or a code block.
  const withoutCode = body.replace(/```[\s\S]*?```/g, "");
  if (count(body, /^```/gm) % 2) problems.push("bloc de code (schéma) non fermé");
  if (count(withoutCode, /\$\$/g) % 2) problems.push("formule $$ non fermée");

  // A long last line ending on a word or a comma stopped mid-sentence (a letter's signature or "Yours faithfully," is short).
  const lines = body.split("\n").map((l) => l.replace(/^>\s?/, "").trim()).filter(Boolean);
  const last = lines[lines.length - 1] || "";
  if (last.length > 30 && /[\p{L}\p{N},]$/u.test(last)) problems.push(`fin abrupte : « ${last.slice(-60)} »`);

  // Corrections shown in clear: unquoted text between a solution and the next exercise.
  if (foldLeakedAnswers(body).leaks) problems.push("correction visible hors de son bloc");

  const exercises = count(body, /^> \*\*Exercice\b/gm);
  const solutions = count(body, /^> \*\*Solution\b/gm);
  if (solutions < exercises) problems.push(`${exercises - solutions} exercice(s) sans solution`);
  const quizzes = count(body, /^> \*\*Testez-vous\b/gm);
  const answers = count(body, /^> \*\*Réponse\b/gm);
  if (answers < quizzes) problems.push(`${quizzes - answers} « Testez-vous » sans réponse`);
  // A solution label with nothing after it.
  if (/^> \*\*Solution[^\n]*\*\*\s*\n(?:>\s*\n)*(?!>)/m.test(body + "\n\n")) problems.push("solution vide");

  if (entry.type === "COURSE" && words > 1200 && !exercises) problems.push("aucun exercice dans un cours complet");
  if (!/^## /m.test(body)) problems.push("aucune partie ##");

  // Much shorter than the source: parts of the document were probably left out.
  // Same thresholds as reformulate.mjs (a summary may be much shorter than its source).
  const ratio = entry.type === "SUMMARY" ? 0.25 : 0.45;
  if (!entry.part && sourceWords >= 2000 && words < sourceWords * ratio) problems.push(`trop court : ${words} mots pour ${sourceWords} dans la source`);
  if (words < 600) problems.push(`très court (${words} mots)`);
  return problems;
}

const index = loadIndex();
const finals = index.entries.filter((e) => e.sourceId && e.file);
const report = [];
for (const entry of finals) {
  const file = path.join(ROOT, entry.file);
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  const source = findEntry(index, entry.sourceId);
  let sourceWords = 0;
  if (source) {
    try {
      sourceWords = wordCount(readCourse(source).body);
    } catch {
      /* source file missing: no length comparison */
    }
  }
  const problems = incompleteness(text, entry, sourceWords);
  if (problems.length) report.push({ id: entry.id, sourceId: entry.sourceId, title: entry.title, file: entry.file, problems });
}

const tally = {};
for (const r of report) for (const p of r.problems) {
  const k = p.replace(/[«:].*$/, "").replace(/\d+/g, "n").trim();
  tally[k] = (tally[k] || 0) + 1;
}
log(`${finals.length} cours vérifiés, ${report.length} incomplet(s)`);
for (const [k, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) log(`  ${String(n).padStart(4)} × ${k}`);
if (opts.json) fs.writeFileSync(opts.json, JSON.stringify(report, null, 2));

if (opts.requeue) {
  let n = 0;
  for (const r of report) {
    const src = findEntry(index, r.sourceId);
    if (!src) continue;
    src.rewrite = r.id; // reformulate.mjs rewrites this final course in place
    src.reformulateFailures = 0;
    n++;
  }
  saveIndex(index);
  log(`${n} cours remis en file d'attente pour être réécrits`);
}
