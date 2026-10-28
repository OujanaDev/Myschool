#!/usr/bin/env node
/**
 * Ajoute des labos interactifs (blocs ```lab, cf. style/labos.md) aux cours reformulés de physique-chimie, SVT et
 * mathématiques. Pour chaque cours, Claude choisit les 1 ou 2 notions les plus importantes et les plus difficiles à
 * comprendre, écrit le labo adapté et indique où l'insérer ; chaque labo est vérifié par le code même du site
 * (web/src/components/labs/check.js) avant d'être inséré. Les copies d'un même cours dans d'autres filières
 * reçoivent les mêmes labos, sans nouvel appel. Les leçons sont ensuite mises à jour par `import --changed`.
 * --unpublished traite les cours qui ne sont pas encore sur la plateforme (le lot qui vient d'être reformulé, pour
 * qu'il soit publié avec ses labos) ; sans cette option, seuls les cours déjà publiés sont traités (rattrapage). Les
 * deux modes ne touchent jamais le même cours et peuvent donc tourner en même temps.
 *
 *   node src/labs.mjs [--unpublished] [--level 2bac-pc] [--subject mathematiques] [--max 20] [--only <id>]
 *                     [--model sonnet] [--concurrency 3] [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { askClaude, parseJson } from "./claude-cli.mjs";
import { findEntry, loadIndex, readCourse, saveCourse, saveIndex } from "./repository.mjs";
import { fold, log, singleInstance } from "./util.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { checkLab } = await import(pathToFileURL(path.join(HERE, "..", "..", "web", "src", "components", "labs", "check.js")).href);
const GUIDE = fs.readFileSync(path.join(HERE, "..", "style", "labos.md"), "utf8");

const { values: opts } = parseArgs({
  options: {
    level: { type: "string" },
    subject: { type: "string" },
    only: { type: "string" },
    max: { type: "string", default: "0" },
    model: { type: "string", default: "sonnet" },
    concurrency: { type: "string", default: "3" },
    unpublished: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
  },
});
if (!opts["dry-run"]) singleInstance(opts.unpublished ? "labs-new" : "labs");

const SUBJECTS = new Set(["physique-chimie", "svt", "mathematiques"]);

const SYSTEM = `Tu es professeur et concepteur de simulations pédagogiques pour Myschool, une plateforme de cours marocaine (programmes officiels). On te donne un cours, lignes numérotées. Tu choisis les notions les plus importantes et les plus difficiles à comprendre de ce cours qui gagnent à être manipulées, et pour chacune tu écris un labo interactif en suivant exactement le guide ci-dessous.

=== GUIDE DES LABOS ===
${GUIDE}
=== FIN DU GUIDE ===

Réponds uniquement par un objet JSON :
{"labos": [{"ligne": <numéro de la première ligne du bloc ou du paragraphe après lequel placer le labo>, "debut": "<les premiers mots de cette ligne>", "pourquoi": "<la notion difficile illustrée, en une phrase>", "bloc": {<le labo>}}]}
Au plus 2 labos ; {"labos": []} si aucune notion du cours ne s'y prête vraiment.`;

/** Index of the line right after the block that starts at line i (paragraph, blockquote, or fenced figure + caption). */
function insertionIndex(lines, i) {
  let fence = false;
  for (let k = 0; k < i; k++) if (/^\s*```/.test(lines[k])) fence = !fence;
  if (fence || /^#{1,6}\s/.test(lines[i])) return -1;
  let j = i;
  if (/^\s*```/.test(lines[i])) {
    j = i + 1;
    while (j < lines.length && !/^\s*```/.test(lines[j])) j++;
    let k = j + 1;
    while (k < lines.length && !lines[k].trim()) k++;
    if (k < lines.length && /^\*[^*].*\*$/.test(lines[k].trim())) j = k;
  } else {
    const quote = lines[i].startsWith(">");
    while (j + 1 < lines.length && lines[j + 1].trim() && (quote ? lines[j + 1].startsWith(">") : !lines[j + 1].startsWith(">") && !/^\s*```/.test(lines[j + 1]) && !/^#/.test(lines[j + 1]))) j++;
  }
  // Never between a question and its folded answer, solution or hint: go past them.
  for (;;) {
    let k = j + 1;
    while (k < lines.length && !lines[k].trim()) k++;
    if (k >= lines.length || !/^>\s*\*\*(Réponse|Reponse|Solution|Corrigé|Corrige|Indice)/i.test(lines[k])) break;
    j = k;
    while (j + 1 < lines.length && lines[j + 1].startsWith(">")) j++;
  }
  // Nor inside an exercise or a solution: the label is on the first line of the box the anchor belongs to.
  let start = i;
  while (lines[start].startsWith(">") && start > 0 && lines[start - 1].startsWith(">")) start--;
  const label = (lines[start].match(/^>\s*\*\*([^*.]+)/) || [])[1] || "";
  if (/^(Exercice|Problème|Probleme|Solution|Réponse|Indice|Corrigé)/i.test(label)) return -1;
  return j + 1;
}

/** How many lines identical to lines[i] come before it: "> **Remarque.**" may appear several times in a course. */
const occurrenceOf = (lines, i) => lines.slice(0, i).filter((l) => l === lines[i]).length;

/**
 * Inserts the labs into a course body; each is placed by the text of its anchor line and its occurrence, so that
 * the copies of the course (another title, the same text) get them at the same place. Returns the body and the count.
 */
function insertLabs(body, plan) {
  const lines = body.trim().split("\n");
  const spots = [];
  for (const { anchor, occurrence = 0, bloc } of plan) {
    let i = -1;
    for (let seen = -1, k = 0; k < lines.length && seen < occurrence; k++) {
      if (lines[k] === anchor && ++seen === occurrence) i = k;
    }
    const at = i < 0 ? -1 : insertionIndex(lines, i);
    if (at > 0 && !spots.some((s) => s.at === at)) spots.push({ at, bloc });
  }
  spots.sort((a, b) => b.at - a.at);
  for (const { at, bloc } of spots) lines.splice(at, 0, "", "```lab", JSON.stringify(bloc, null, 2), "```");
  return { body: lines.join("\n"), count: spots.length };
}

const index = loadIndex();
let sources = index.entries.filter(
  (e) =>
    e.site === "final" && e.file && !e.reusedFrom && SUBJECTS.has(e.subject) && e.labs === undefined &&
    !e.importedLessonId === opts.unpublished &&
    (!opts.level || e.level === opts.level) && (!opts.subject || e.subject === opts.subject)
);
if (opts.only) sources = [findEntry(index, opts.only)].filter(Boolean);
const max = Number(opts.max);
if (max > 0) sources = sources.slice(0, max);
log(`${sources.length} cours à enrichir de labos`);

let added = 0;
let courses = 0;
let failed = 0;
let cost = 0;
let unsaved = 0;
let stopped = false;
const queue = [...sources];

function save(force = false) {
  if (opts["dry-run"]) return;
  if (force || ++unsaved >= 10) {
    saveIndex(index);
    unsaved = 0;
  }
}

async function planFor(entry) {
  const { body } = readCourse(entry);
  const lines = body.trim().split("\n");
  if (lines.some((l) => /^```lab\b/.test(l))) return { lines, plan: null };
  const numbered = lines.map((l, i) => `${i + 1}| ${l}`).join("\n");
  const prompt = `Niveau : ${entry.level}\nMatière : ${entry.subject}\nChapitre : ${entry.chapter}\n\n=== COURS ===\n${numbered}\n=== FIN DU COURS ===`;
  let best = [];
  let feedback = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const answer = await askClaude(SYSTEM, prompt + feedback, { model: opts.model });
    cost += answer.cost;
    let labs;
    try {
      labs = parseJson(answer.text).labos;
      if (!Array.isArray(labs)) throw new Error("pas de liste labos");
    } catch (err) {
      feedback = `\n\nTa réponse précédente n'était pas un JSON valide (${err.message}). Réponds uniquement par l'objet JSON demandé.`;
      continue;
    }
    const good = [];
    const problems = [];
    for (const [k, lab] of labs.slice(0, 2).entries()) {
      const i = Number(lab.ligne) - 1;
      const issues = checkLab(lab.bloc);
      if (!(i >= 0 && i < lines.length)) issues.push(`ligne ${lab.ligne} inexistante`);
      else if (lab.debut && !fold(lines[i].replace(/^[>\s*#]+/, "")).startsWith(fold(String(lab.debut).replace(/^[>\s*#]+/, "")).slice(0, 12))) issues.push(`la ligne ${lab.ligne} ne commence pas par « ${lab.debut} »`);
      else if (insertionIndex(lines, i) < 0) issues.push(`la ligne ${lab.ligne} est un titre, un exercice ou une solution : choisis le bloc qui énonce la notion`);
      if (issues.length) problems.push(`labo ${k + 1} : ${issues.join(" ; ")}`);
      else good.push({ anchor: lines[i], occurrence: occurrenceOf(lines, i), bloc: lab.bloc, why: lab.pourquoi });
    }
    if (good.length >= best.length) best = good;
    if (!problems.length) return { lines, plan: good };
    feedback = `\n\nCertains labos de ta réponse précédente sont refusés :\n- ${problems.join("\n- ")}\nCorrige-les et renvoie l'objet JSON complet.`;
  }
  return { lines, plan: best };
}

async function worker() {
  while (queue.length && !stopped) {
    const entry = queue.shift();
    try {
      const { lines, plan } = await planFor(entry);
      courses++;
      if (plan === null) {
        entry.labs = lines.filter((l) => /^```lab\b/.test(l)).length;
        save();
        continue;
      }
      const clones = index.entries.filter((c) => c.reusedFrom === entry.id && c.file);
      if (opts["dry-run"]) {
        log(`~ ${entry.title} : ${plan.length} labo(s)${plan.map((p) => `\n    · ${p.bloc.labo} « ${p.bloc.titre} » après « ${p.anchor.slice(0, 70)} » — ${p.why ?? ""}`).join("")}`);
        continue;
      }
      let count = 0;
      for (const e of [entry, ...clones]) {
        const { body } = readCourse(e);
        const out = insertLabs(body, plan);
        if (out.count) saveCourse(e, out.body);
        e.labs = out.count;
        e.labsAt = new Date().toISOString();
        if (e === entry) count = out.count;
      }
      entry.labsPlan = plan.map(({ anchor, occurrence, bloc }) => ({ anchor, occurrence, bloc }));
      added += count;
      save();
      log(`✓ ${entry.title} : ${count} labo(s)${count ? ` (${plan.map((p) => p.bloc.labo).join(", ")})` : ""}${clones.length ? `, ${clones.length} copie(s)` : ""}`);
    } catch (err) {
      // Usage limit: wait and try the same course again. Login lost: stop, nothing is marked.
      if (/authenticat|log ?in|OAuth|credit/i.test(err.message)) {
        log(`✗ arrêt : ${err.message}`);
        stopped = true;
        continue;
      }
      if (/limit|quota|rate|overloaded/i.test(err.message)) {
        log(`! limite d'utilisation, reprise dans 15 min : ${err.message.slice(0, 120)}`);
        queue.unshift(entry);
        await new Promise((r) => setTimeout(r, 15 * 60 * 1000));
        continue;
      }
      failed++;
      log(`✗ ${entry.title} : ${err.message}`);
    }
  }
}

await Promise.all(Array.from({ length: Math.max(1, Number(opts.concurrency)) }, worker));
save(true);
log(`Terminé : ${added} labo(s) ajouté(s) dans ${courses} cours, ${failed} échec(s). Coût ≈ ${cost.toFixed(2)} $.`);
