#!/usr/bin/env node
/**
 * Reformule les cours du dépôt (texte extrait des PDF / pages AlloSchool) en cours Myschool originaux,
 * au format décrit dans style/format-cours.md (définitions surlignées, blocs, exercices corrigés),
 * et les range dans repository/final/<niveau>/<matière>/<chapitre>/.
 *
 *   npm run reformulate -- [--level 2bac-pc] [--subject mathematiques] [--chapter "<regex>"] [--course "<regex>"]
 *                          [--type COURSE,SUMMARY] [--max <n>] [--only <id>] [--lang fr|auto] [--source-lang fr|ar|all]
 *                          [--force] [--dry-run] [--model claude-opus-5-5] [--effort high] [--concurrency 2]
 *                          [--mode chapter|document]
 *
 * Mode chapter (défaut) : les documents d'un chapitre (ou les cours déjà écrits à partir d'eux, un par document)
 * deviennent 2 à 3 cours complets et complémentaires, chacun suivi de son résumé ; --max compte des chapitres.
 * Mode document : un document, un cours (ancien comportement).
 *
 * Authentification : ANTHROPIC_API_KEY (ou un profil `ant auth login`).
 * --dry-run liste la sélection et estime le coût sans appeler l'API.
 * Les cours produits sont marqués rights: "original" et importables tels quels avec `npm run import -- --site final`.
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { ROOT, findEntry, loadIndex, parseFrontMatter, readCourse, saveCourse, saveIndex } from "./repository.mjs";
import { chapterKey, foldLeakedAnswers, fold, separateFoldedLabels, idForUrl, log, slugify, stripToc, unmarkInMath, wordCount, singleInstance, killTree } from "./util.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STYLE_DIR = path.join(HERE, "..", "style");
const FORMAT = fs.readFileSync(path.join(STYLE_DIR, "format-cours.md"), "utf8");
const REFERENCE = fs.readFileSync(path.join(STYLE_DIR, "reference-elements-de-logique.md"), "utf8");

// Opus 5.5 list prices (USD per million tokens), for the running cost estimate only.
const PRICE = { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 };

const { values: opts } = parseArgs({
  options: {
    level: { type: "string" },
    subject: { type: "string" },
    chapter: { type: "string" },
    course: { type: "string" },
    type: { type: "string", default: "COURSE,SUMMARY" },
    max: { type: "string" },
    only: { type: "string" },
    lang: { type: "string", default: "fr" },
    "source-lang": { type: "string", default: "fr" },
    force: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    engine: { type: "string", default: "cli" },
    model: { type: "string" },
    effort: { type: "string", default: "high" },
    concurrency: { type: "string", default: "2" },
    // chapter (default): the documents of a chapter become 2-3 complementary courses, each with its summary.
    // document: one document, one course (the former behaviour).
    mode: { type: "string", default: "chapter" },
    // Chapter mode: the chapters whose documents all have their course already (one per document) are left as they
    // are, instead of being regrouped into 2-3 courses.
    "no-regroup": { type: "boolean", default: false },
    // Chapter mode: at least this many courses per chapter; with --no-regroup, a chapter already reformulated into
    // fewer courses than this is still rewritten.
    "min-courses": { type: "string", default: "1" },
    // Chapter mode: the chapters of these levels (slugs, comma-separated) that have no real lesson on the site and no
    // document in the repository are written from the model's knowledge of the official programme (2 courses with
    // their summaries and the exercises). Needs the admin API (--api, --email, --password / MYSCHOOL_ADMIN_PASSWORD).
    "empty-levels": { type: "string", default: "" },
    api: { type: "string", default: process.env.MYSCHOOL_API || "http://localhost:4000/api" },
    email: { type: "string", default: process.env.MYSCHOOL_ADMIN_EMAIL || "admin@myschool.ma" },
    password: { type: "string", default: process.env.MYSCHOOL_ADMIN_PASSWORD || "" },
    // Extra rules appended to the system prompt (e.g. style/regles-manuel.md); they win over the format when they differ.
    rules: { type: "string" },
    help: { type: "boolean", short: "h", default: false },
  },
});
if (!["chapter", "document"].includes(opts.mode)) {
  console.error('--mode doit valoir "chapter" ou "document".');
  process.exit(1);
}
// cli: the local Claude Code CLI (`claude -p`, uses your Claude Code login, no API key).
// api: the Anthropic API (needs ANTHROPIC_API_KEY).
if (!["cli", "api"].includes(opts.engine)) {
  console.error('--engine doit valoir "cli" ou "api".');
  process.exit(1);
}
opts.model ||= opts.engine === "cli" ? "opus" : "claude-opus-5-5";
if (!opts.only && !opts["dry-run"]) singleInstance("reformulate");
if (opts.help) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0].replace(/^(#!.*\n)?\/\*\*?/, ""));
  process.exit(0);
}

// ---------- selection ----------

const index = loadIndex();

// Re-register finished courses whose index entry was lost (files in repository/final are the source of truth).
{
  const walk = (dir) =>
    fs.existsSync(dir)
      ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : d.name.endsWith(".md") ? [path.join(dir, d.name)] : []))
      : [];
  let restored = 0;
  for (const file of walk(path.join(ROOT, "final"))) {
    const { meta } = parseFrontMatter(fs.readFileSync(file, "utf8"));
    if (!meta.id || findEntry(index, meta.id)) continue;
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    index.entries.push({ ...meta, file: rel, dir: rel.split("/").slice(0, -1).join("/"), slug: path.basename(file, ".md"), importedLessonId: null });
    const src = meta.sourceId && findEntry(index, meta.sourceId);
    if (src) src.reformulatedId = meta.id;
    restored++;
  }
  if (restored) {
    saveIndex(index);
    log(`${restored} cours final(aux) ré-indexé(s) depuis repository/final`);
  }
}

const types =new Set(opts.type.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean));
const re = (s) => (s ? new RegExp(s, "i") : null);
const reChapter = re(opts.chapter);
const reCourse = re(opts.course);

let sources = index.entries.filter((e) => e.site === "alloschool" && e.rights === "reserved");
if (opts.only) sources = [findEntry(index, opts.only)].filter(Boolean);
else {
  sources = sources.filter(
    (e) =>
      (!opts.level || e.level === opts.level) &&
      (!opts.subject || e.subject === opts.subject) &&
      (!reChapter || reChapter.test(e.chapter || "") || reChapter.test(e.title || "")) &&
      (!reCourse || reCourse.test(`${e.category || ""} / ${e.course || ""}`)) &&
      types.has(e.type)
  );
}
if (opts["source-lang"] !== "all") sources = sources.filter((e) => (e.lang || "fr") === opts["source-lang"]);
const tooShort = sources.filter((e) => (e.words || 0) < 120);
sources = sources.filter((e) => (e.words || 0) >= 120);
sources = sources.filter((e) => ((e.reformulateFailures || 0) < 2 && !e.unreadable) || opts.force || opts.only);
// `duplicateOf` (set below or by dedupe.mjs): the same document already exists in this level and subject.
const duplicates = sources.filter((e) => e.duplicateOf && !opts.only);
sources = sources.filter((e) => !e.duplicateOf || opts.only);
// Chapter mode groups every readable document of a chapter, done or not.
const eligible = sources;
// `rewrite` (set by audit.mjs --requeue): the finished course was found incomplete and is written again in place.
const already = sources.filter((e) => e.reformulatedId && !opts.force && !e.rewrite);
sources = sources.filter((e) => !e.reformulatedId || opts.force || e.rewrite);

// ---------- reuse ----------

// AlloSchool publishes the same document in several filières (the anglais or maths of PC, SVT, STE...): a source whose
// text is identical to one already reformulated gets a copy of that course instead of a new model call.
function sourceKey(entry) {
  try {
    const text = readCourse(entry).body.replace(/^> Document PDF d.origine.*$/m, "").replace(/\s+/g, " ").trim();
    return createHash("md5").update(text).digest("hex");
  } catch {
    return null;
  }
}

/** Copies the course(s) reformulated from `twin` (every part of a long document) for `entry`, in its own level. */
function reuseCourse(entry, twin) {
  const finals = index.entries.filter((e) => e.site === "final" && e.sourceId === twin.id && e.file);
  for (const f of finals) {
    const n = f.part ? Number(f.part.split("/")[0]) : 1;
    const id = idForUrl(n > 1 ? `final:${entry.id}#${n}` : `final:${entry.id}`);
    const final = {
      ...f,
      id,
      url: `final:${entry.id}`,
      slug: `${slugify(f.title).slice(0, 70)}-${id}`,
      dir: ["final", slugify(entry.level), slugify(entry.subject), slugify(entry.chapter || "general")].join("/"),
      level: entry.level,
      subject: entry.subject,
      chapter: entry.chapter,
      type: entry.type,
      tags: ["cours-myschool", entry.level, entry.subject],
      description: `${entry.chapter} — ${f.title}`,
      sourceId: entry.id,
      reusedFrom: f.id,
      fetchedAt: new Date().toISOString(),
      importedLessonId: null,
    };
    delete final.importedAt;
    final.file = saveCourse(final, readCourse(f).body.trim());
    const existing = findEntry(index, id);
    if (existing) Object.assign(existing, final);
    else index.entries.push(final);
  }
  if (finals.length) entry.reformulatedId = idForUrl(`final:${entry.id}`);
  return finals.length;
}

if (!opts.force && sources.length && opts.mode === "document") {
  const twins = new Map();
  for (const e of index.entries) {
    if (e.site !== "alloschool" || !e.reformulatedId) continue;
    const key = sourceKey(e);
    if (key && !twins.has(key)) twins.set(key, e);
  }
  const pending = new Map();
  let reused = 0;
  let copies = 0;
  let waiting = 0;
  let dropped = 0;
  const samePlace = (a, b) => a.level === b.level && a.subject === b.subject;
  sources = sources.filter((e) => {
    const key = sourceKey(e);
    if (!key || e.rewrite) return true;
    const twin = twins.get(key);
    if (twin) {
      // The same document twice in one level and subject (two chapters, or listed twice): one course is enough.
      if (samePlace(e, twin)) {
        if (!opts["dry-run"]) e.duplicateOf = twin.id;
        dropped++;
        return false;
      }
      if (!opts["dry-run"]) {
        const n = reuseCourse(e, twin);
        if (!n) return true;
        copies += n;
      }
      reused++;
      return false;
    }
    // Two identical sources in this run: reformulate the first, the other reuses it on the next run.
    const first = pending.get(key);
    if (first) {
      if (samePlace(e, first)) {
        if (!opts["dry-run"]) e.duplicateOf = first.id;
        dropped++;
      } else waiting++;
      return false;
    }
    pending.set(key, e);
    return true;
  });
  if ((reused || dropped) && !opts["dry-run"]) saveIndex(index);
  if (reused || waiting) {
    log(`${reused} document(s) identique(s) à un cours déjà reformulé : ${opts["dry-run"] ? "seraient réutilisés" : `${copies} cours réutilisé(s) sans appel au modèle`}${waiting ? ` ; ${waiting} doublon(s) attendront la reformulation de leur jumeau` : ""}`);
  }
  if (dropped) log(`${dropped} document(s) en double dans leur niveau et matière : ignorés (duplicateOf)`);
}
if (duplicates.length) log(`${duplicates.length} document(s) déjà marqué(s) en double : ignorés`);

const max = Number(opts.max || 0);
if (opts.mode === "document") {
  if (max > 0) sources = sources.slice(0, max);
  log(`${sources.length} document(s) à reformuler (${already.length} déjà fait(s), ${tooShort.length} trop court(s) ignoré(s))`);
  if (!sources.length) process.exit(0);
}

// ---------- prompt ----------

const RULES = opts.rules ? fs.readFileSync(opts.rules, "utf8").trim() : "";
const SYSTEM = `Tu es un professeur agrégé marocain qui rédige des cours pour Myschool, une plateforme éducative en ligne (programmes officiels marocains, du primaire aux classes préparatoires). À partir des notes brutes fournies (texte extrait d'un document existant, souvent mal mis en forme, avec des formules manquantes ou abîmées), tu écris un cours complet, original, clair et rigoureux, exactement au format ci-dessous.

Tu reformules entièrement avec tes propres mots et ta propre progression : tu ne recopies pas de phrases, tu complètes ce qui manque (définitions, formules, exemples, démonstrations courtes, exercices et solutions) grâce à tes connaissances du programme, et tu corriges les erreurs éventuelles. Les formules illisibles ou absentes du texte source sont reconstituées.

=== FORMAT À RESPECTER ===
${FORMAT}

=== POLYCOPIÉ DE RÉFÉRENCE (modèle de ton, de progression et de rigueur ; thème différent, ne pas réutiliser son contenu) ===
${REFERENCE}
=== FIN DU POLYCOPIÉ DE RÉFÉRENCE ===

N'écris pas de sommaire : contrairement au polycopié, le cours commence directement par le titre puis par la partie « ## I. ».

Le cours doit être COMPLET : chaque partie, notion, définition, propriété, méthode et exercice présent dans les notes brutes apparaît dans ton cours (reformulé, jamais résumé au point de disparaître). Ne t'arrête pas avant la fin : la dernière partie (Exercices) et la solution du dernier exercice sont entièrement rédigées. Un long document donne un long cours.

Le titre « # » est précis : le nom du chapitre, puis « : » et ce que traite ce document (ex. « Limites et continuité : rappels, formes indéterminées et TVI », « Suites numériques : l'essentiel à retenir », « Dérivation : exercices corrigés de synthèse »). Plusieurs documents existent sur un même chapitre : leurs titres doivent se distinguer.

N'utilise jamais le nom, le prénom ni l'adresse e-mail de la personne qui t'utilise ou de son compte : dans les exemples (lettres, e-mails, dialogues), prends des prénoms et noms marocains fictifs.

Réponds uniquement par le cours en Markdown, sans préambule ni commentaire.` + (RULES ? `\n\n=== RÈGLES SUPPLÉMENTAIRES (prioritaires sur le format) ===\n${RULES}` : "");

function userMessage(entry, body) {
  const langLine =
    opts.lang === "auto"
      ? "Rédige dans la langue du document source."
      : opts.lang === "fr"
        ? "Rédige en français, même si le document source est en arabe (traduis et reformule)."
        : `Rédige en ${opts.lang}.`;
  const typeLine = {
    COURSE: "Il s'agit d'un cours complet sur ce chapitre.",
    SUMMARY: "Il s'agit d'un résumé de cours : plus condensé, mais avec toutes les définitions, propriétés et méthodes, quelques exemples et 2 ou 3 exercices corrigés.",
    EXERCISE: "Il s'agit d'une série d'exercices : un rappel de cours très court (définitions et méthodes utiles) puis les exercices, tous corrigés en détail.",
    EXAM: "Il s'agit d'un sujet d'examen : présente les exercices du sujet, puis une solution rédigée et commentée pour chacun.",
  }[entry.type] || "";
  return `Niveau : ${entry.tags?.slice(1).join(" / ") || entry.level}
Matière : ${entry.subject}
Chapitre : ${entry.chapter}
Titre indicatif du document : ${entry.title}
${entry.part ? `Ce texte est la partie ${entry.part.n} sur ${entry.part.of} d'un long document : rédige un cours complet sur le contenu de cette partie uniquement, sans mentionner les autres parties.
` : ""}Type : ${entry.type}. ${typeLine}
${langLine}

=== NOTES BRUTES ===
${body}
=== FIN DES NOTES ===`;
}

// ---------- validation ----------

/**
 * Author names to keep out of the course: only those introduced as the document's teacher or author.
 * "M.", "Mme" or "Par" are not enough (they also introduce scientists, characters of a novel, or "Par : Justifier"),
 * and a name the source uses many times is subject matter (Curie, Vautrin), not a signature.
 */
function forbiddenNames(sourceText) {
  const names = new Set();
  const re = /\b(?:Professeure?|Prof\.?|Pr\.|Enseignante?|(?:Réalisée?|Préparée?|Rédigée?|Proposée?) par)\s*:?\s+([A-ZÉÈÂÎÔÛ][\p{L}'-]+(?:\s+[A-ZÉÈÂÎÔÛ][\p{L}'-]+){0,2})/gu;
  let m;
  while ((m = re.exec(sourceText))) {
    const name = m[1].trim();
    if (name.length < 4 || /^(Cours|Exercice|Série|Résumé|Chapitre|Partie|Séance|Justifier|Montrer|Calculer|Déterminer)$/i.test(name)) continue;
    const uses = fold(sourceText).split(fold(name)).length - 1;
    if (uses <= 3) names.add(name);
  }
  return [...names];
}

function violations(rawText, names) {
  // The namespace declaration of an SVG diagram is not a link.
  const text = rawText.replace(/\sxmlns(?::\w+)?\s*=\s*["']http:\/\/www\.w3\.org\/[^"']*["']/g, "");
  const found = [];
  if (/allo\s*-?\s*school/i.test(text)) found.push("alloschool");
  if (/\b0[5-7](?:[ .-]?\d{2}){4}\b/.test(text)) found.push("numéro de téléphone");
  if (/[\w.-]+@[\w.-]+\.\w{2,}/.test(text)) found.push("adresse e-mail");
  if (/https?:\/\//i.test(text)) found.push("lien");
  // A signature ("Professeur : M. Alaoui"), not a dialogue line ("Professeur : Bonjour à tous").
  if (/\b([Pp]rofesseure?|[Ee]nseignante?|PROFESSEURE?|ENSEIGNANTE?)\s*:\s*(?:(?:M\.|Mme|Mlle|Mr|Mrs|Pr\.?)\s+[A-Z]|[A-ZÉÈ]{2,}\b|[A-ZÉÈ][\p{Ll}'-]+\s+[A-ZÉÈ][\p{L}'-]+)/u.test(text)) {
    found.push("mention de professeur");
  }
  if (/\bs[ée]ance\s+\d+(?:-\d+)+/i.test(text)) found.push("numéro de séance");
  // Platform wording only: "premium" or "vidéo" alone are ordinary words (premium quality, enregistrement vidéo, video games).
  if (/\babonnement\b|\b(contenu|version|offre|accès|compte)\s+premium\b|\bt[ée]l[ée]charg(?:e[rz]?|ement)\b|\b(regarde[rz]?|visionne[rz]?|voir)\s+(la|cette|notre|une)\s+vid[ée]o\b|\bvid[ée]o\s+(du|de ce)\s+cours\b/i.test(text)) {
    found.push("mention premium/vidéo/téléchargement");
  }
  for (const n of names) if (fold(text).includes(fold(n))) found.push(`nom « ${n} »`);
  // The CLI runs under the operator's account and sees its name: it must never reach a published course.
  for (const n of (process.env.MYSCHOOL_PRIVATE_NAMES || "Oujana").split(",").map((s) => s.trim()).filter(Boolean)) {
    if (fold(text).includes(fold(n))) found.push("nom du compte utilisateur");
  }
  return found;
}

const SVG_UNSAFE = /<script|<foreignObject|<iframe|\son\w+\s*=|javascript:|(?:href|src)\s*=\s*["']?(?:https?:|\/\/)/i;

/** Checks the produced course follows scraper/style/format-cours.md (solutions folded, sparse highlights, safe SVG). */
function structureProblems(text) {
  const problems = [];
  if (/^#{1,3}\s*(?:[IVX]+\.?\s*)?Solutions? des exercices/im.test(text)) {
    problems.push("partie « Solutions des exercices » séparée (la solution doit suivre chaque exercice)");
  }
  const exercises = (text.match(/^> \*\*Exercice\b/gm) || []).length;
  const solutions = (text.match(/^> \*\*Solution\b/gm) || []).length;
  if (exercises > 0 && solutions < exercises) problems.push(`${exercises} exercice(s) mais ${solutions} solution(s) repliable(s)`);

  // Every "Testez-vous" question has its folded answer.
  const quizzes = (text.match(/^> \*\*Testez-vous\b/gm) || []).length;
  const answers = (text.match(/^> \*\*Réponse\b/gm) || []).length;
  if (answers < quizzes) problems.push(`${quizzes} « Testez-vous » mais ${answers} réponse(s) repliable(s)`);

  // Completeness: the text must not stop inside a formula, a figure or a sentence.
  if ((text.match(/^```/gm) || []).length % 2) problems.push("cours incomplet : schéma non fermé");
  if ((text.replace(/```[\s\S]*?```/g, "").match(/\$\$/g) || []).length % 2) problems.push("cours incomplet : formule $$ non fermée");
  const lastLine = text.trim().split("\n").pop().replace(/^>\s?/, "").trim();
  if (lastLine.length > 30 && /[\p{L}\p{N},]$/u.test(lastLine)) problems.push(`cours incomplet : fin abrupte « ${lastLine.slice(-50)} »`);

  // Highlights: only the most important points, one per Définition / Théorème-type block at most.
  // Small excesses are thinned after the fact (thinHighlights) rather than paying for a new draft.
  return problems.concat(svgProblems(text));
}

/** A long source turned into a much shorter course has lost parts of the chapter (a summary may be shorter). */
function coverageProblems(text, source, entry) {
  const sourceWords = wordCount(source);
  const words = wordCount(text);
  const ratio = entry.coverageRatio ?? (entry.type === "SUMMARY" ? 0.25 : 0.45);
  return sourceWords >= 2000 && words < sourceWords * ratio ? [`cours incomplet : ${words} mots pour ${sourceWords} dans la source`] : [];
}

const HIGHLIGHT_BLOCK =/^> \*\*(Définition|Théorème|Propriété|Proposition|Corollaire)/;
const MAX_HIGHLIGHTS = 10;

/** Keeps the first highlight of each Définition / Théorème-type block, up to MAX_HIGHLIGHTS; unmarks the rest. */
function thinHighlights(text) {
  let kept = 0;
  return unmarkInMath(text)
    .split(/(\n{2,})/)
    .map((block) => {
      let inBlock = 0;
      const allowed = HIGHLIGHT_BLOCK.test(block.trim());
      return block.replace(/==((?:[^=\n]|=(?!=))+?)==/g, (_m, inner) => {
        inBlock++;
        if (allowed && inBlock === 1 && kept < MAX_HIGHLIGHTS) {
          kept++;
          return `==${inner}==`;
        }
        return inner;
      });
    })
    .join("");
}

function svgProblems(text) {
  const problems = [];
  for (const m of text.matchAll(/```svg\n([\s\S]*?)\n```/g)) {
    const svg = m[1].trim();
    if (!/^<svg[\s>]/i.test(svg)) problems.push("bloc svg qui ne commence pas par <svg>");
    if (SVG_UNSAFE.test(svg)) problems.push("svg contenant du code ou une ressource externe");
    if (!/<\/svg>$/i.test(svg)) problems.push("svg non fermé");
  }
  return problems;
}

function cleanOutput(text) {
  let out = text.trim();
  out = out.replace(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/i, "$1").trim();
  out = stripToc(out);
  // The manual-style rules forbid highlighting: a stray marker is removed rather than refused.
  if (RULES && /AUCUN surlignage/i.test(RULES)) out = out.replace(/==/g, "");
  out = thinHighlights(out);
  out = foldLeakedAnswers(separateFoldedLabels(out).text).text;
  out = out.replace(/\n{3,}/g, "\n\n");
  return out;
}

// ---------- API ----------

const client = opts["dry-run"] || opts.engine !== "api" ? null : new Anthropic();
let totalCost = 0;

const CACHE_DIR = path.join(ROOT, "_cache");
const SYSTEM_FILE = path.join(CACHE_DIR, "reformulate-system.md");

/** Runs one prompt through the local Claude Code CLI in print mode, without tools or project context. */
/**
 * Joins a message cut by the output limit with its continuation. The continuation either picks up mid-word, or
 * starts the interrupted line over: then the unfinished tail of the first part (a prefix of the continuation) is dropped.
 */
export function joinContinuation(a, b) {
  if (!b) return a;
  const from = Math.max(0, a.length - 600);
  for (let p = from; p < a.length - 8; p++) {
    if (b.startsWith(a.slice(p))) return a.slice(0, p) + b;
  }
  return a + b;
}

function runClaudeCli(prompt, systemFile = SYSTEM_FILE) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  if (!fs.existsSync(SYSTEM_FILE) || fs.readFileSync(SYSTEM_FILE, "utf8") !== SYSTEM) fs.writeFileSync(SYSTEM_FILE, SYSTEM);
  const args = [
    "-p",
    // stream-json lists every assistant message: a course longer than one message is rebuilt from all of them.
    "--output-format", "stream-json",
    "--verbose",
    "--system-prompt-file", JSON.stringify(systemFile),
    "--tools", '""',
    "--strict-mcp-config",
    "--no-session-persistence",
    "--model", opts.model,
  ];
  return new Promise((resolve, reject) => {
    // shell: true so Windows resolves claude.cmd; the prompt goes through stdin (no command-line length limit).
    // A long course must come out in one message: past the CLI's default output limit it continues in a new
    // message and "result" only holds that last part (a course starting mid-way, at a late solution).
    const env = { ...process.env, CLAUDE_CODE_MAX_OUTPUT_TOKENS: process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS || "64000" };
    const child = spawn("claude", args, { cwd: CACHE_DIR, shell: true, windowsHide: true, env });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      killTree(child);
      reject(new Error("délai dépassé (45 min)"));
    }, 45 * 60 * 1000);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(new Error(`impossible de lancer claude : ${e.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      let json;
      try {
        const events = out.split("\n").filter((l) => l.trim().startsWith("{")).map((l) => JSON.parse(l));
        json = events.findLast((e) => e.type === "result");
        if (!json) throw new Error("pas de résultat");
        // Past the output limit the CLI continues in a new message, mid-word: the parts join as they are.
        const parts = events
          .filter((e) => e.type === "assistant")
          .map((e) => (e.message?.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join(""));
        if (parts.length > 1) json = { ...json, result: parts.reduce(joinContinuation) };
      } catch {
        return reject(new Error(`réponse illisible de claude (code ${code}) : ${(err || out).slice(0, 300)}`));
      }
      if (json.is_error) return reject(Object.assign(new Error(`claude : ${String(json.result || json.subtype || "erreur").slice(0, 300)}`), { cli: json }));
      resolve(json);
    });
    child.stdin.end(prompt);
  });
}

const PART_THRESHOLD = 9000;
const PART_WORDS = 5500;

/**
 * A source too long to become one complete course is cut into parts of about PART_WORDS words, on page boundaries
 * ("<!-- page n -->" markers of the PDF extraction), or on paragraphs when there are none. Shorter sources: one part.
 */
function splitSource(entry) {
  const { body } = readCourse(entry);
  const source = body.replace(/^>.*\n+/, "").trim();
  if (wordCount(source) <= PART_THRESHOLD) return [source];
  const pieces = /<!-- page \d+ -->/.test(source) ? source.split(/(?=<!-- page \d+ -->)/) : source.split(/\n{2,}/);
  const parts = [];
  let current = "";
  for (const piece of pieces) {
    if (current && wordCount(current) + wordCount(piece) > PART_WORDS) {
      parts.push(current.trim());
      current = "";
    }
    current += (current ? "\n\n" : "") + piece;
  }
  if (current.trim()) {
    // A short tail joins the previous part rather than becoming a thin lesson.
    if (parts.length && wordCount(current) < PART_WORDS / 3) parts[parts.length - 1] += "\n\n" + current.trim();
    else parts.push(current.trim());
  }
  return parts;
}

async function reformulateOne(entry, part) {
  const { body } = readCourse(entry);
  const source = part ?? body.replace(/^>.*\n+/, "").trim(); // drop the repository note line
  if (source.length > 150_000) throw new Error(`source trop longue (${source.length} caractères) : à découper`);
  // Scanned or badly encoded PDFs yield mostly symbols: not worth a model call.
  // Fill-in blanks ("_______", "........") and page markers are not garbage: leave them out of the measure.
  const compact = source.replace(/<!--[\s\S]*?-->/g, "").replace(/[_.…\-–—=*|#]{3,}/g, "").replace(/\s+/g, "");
  const letters = (compact.match(/\p{L}/gu) || []).length;
  if (compact.length > 0 && letters / compact.length < 0.55) throw new Error("texte source illisible (extraction PDF défaillante)");
  const names = forbiddenNames(source);

  if (opts["dry-run"]) {
    const tokens = Math.round((SYSTEM.length + source.length) / 3.2);
    log(`~ ${entry.level} / ${entry.subject} / ${entry.chapter} / ${entry.title} — ~${tokens} tokens d'entrée${names.length ? ` — noms à bannir : ${names.join(", ")}` : ""}`);
    return null;
  }

  return produce(userMessage(entry, source), source, entry, names);
}

// The course starts with its "# " title; a style marker comment (regles-manuel.md) may come first.
const TITLE_FIRST = /^(?:<!--[^>]*-->\s*)?#\s+\S/;

/** One model call (CLI or API) and the checks every produced course goes through; `source` is what it must cover. */
async function produce(prompt, source, entry, names = forbiddenNames(source)) {
  if (opts.engine === "cli") {
    const json = await runClaudeCli(prompt);
    const cost = json.total_cost_usd || 0;
    totalCost += cost;
    if (json.stop_reason === "max_tokens") throw new Error("sortie tronquée (max_tokens)");
    const text = cleanOutput(String(json.result || ""));
    if (text.length < 400 && /usage limit|limit reached|rate limit|overloaded/i.test(text)) {
      throw Object.assign(new Error(`limite d'utilisation : ${text.slice(0, 160)}`), { cli: json });
    }
    if (!TITLE_FIRST.test(text)) throw new Error(`la sortie ne commence pas par un titre : ${text.slice(0, 120)}`);
    const bad = violations(text, names);
    if (bad.length) throw new Error(`contenu interdit : ${bad.join(", ")}`);
    const shape = structureProblems(text).concat(coverageProblems(text, source, entry));
    if (shape.length) throw new Error(`format non respecté : ${shape.join(" ; ")}`);
    warnNoQuiz(text);
    return { text, cost, usage: json.usage };
  }

  const stream = client.beta.messages.stream({
    model: opts.model,
    max_tokens: 32000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: opts.effort },
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: prompt }],
  });
  const message = await stream.finalMessage();

  const u = message.usage || {};
  const cost =
    ((u.input_tokens || 0) * PRICE.input +
      (u.output_tokens || 0) * PRICE.output +
      (u.cache_creation_input_tokens || 0) * PRICE.cacheWrite +
      (u.cache_read_input_tokens || 0) * PRICE.cacheRead) /
    1e6;
  totalCost += cost;

  if (message.stop_reason === "refusal") throw new Error(`refus du modèle (${message.stop_details?.category || "?"})`);
  if (message.stop_reason === "max_tokens") throw new Error("sortie tronquée (max_tokens)");
  const text = cleanOutput(message.content.filter((b) => b.type === "text").map((b) => b.text).join("\n"));
  if (!TITLE_FIRST.test(text)) throw new Error("la sortie ne commence pas par un titre de chapitre");
  const bad = violations(text, names);
  if (bad.length) throw new Error(`contenu interdit : ${bad.join(", ")}`);
  const shape = structureProblems(text).concat(coverageProblems(text, source, entry));
  if (shape.length) throw new Error(`format non respecté : ${shape.join(" ; ")}`);
  warnNoQuiz(text);
  return { text, cost, usage: u };
}

/** A long course should end each part with a « Testez-vous » block; its absence is logged, the course is kept. */
function warnNoQuiz(text) {
  if (!/^> \*\*Testez-vous\b/m.test(text) && text.split(/\s+/).length > 1500) log("  ! cours long sans « Testez-vous » (conservé)");
}

function saveFinal(entry, text, part) {
  const heading = (text.match(/^#\s+(.+)$/m) || [])[1]?.trim() || entry.title;
  const title = part ? `${heading} (partie ${part.n}/${part.of})` : heading;
  const id = idForUrl(part && part.n > 1 ? `final:${entry.id}#${part.n}` : `final:${entry.id}`);
  const dir = ["final", slugify(entry.level), slugify(entry.subject), slugify(entry.chapter || "general")].join("/");
  const existing = findEntry(index, id);
  const final = {
    id,
    url: `final:${entry.id}`,
    finalUrl: "",
    site: "final",
    title,
    slug: existing?.slug || `${slugify(title).slice(0, 70)}-${entry.id}`,
    dir,
    level: entry.level,
    subject: entry.subject,
    chapter: entry.chapter,
    type: entry.type,
    tags: ["cours-myschool", entry.level, entry.subject],
    lang: opts.lang === "auto" ? entry.lang : opts.lang,
    license: "Contenu original Myschool",
    rights: "original",
    description: `${entry.chapter} — ${title}`,
    sourceId: entry.id,
    ...(part ? { part: `${part.n}/${part.of}` } : {}),
    model: opts.model,
    fetchedAt: new Date().toISOString(),
    words: wordCount(text),
    importedLessonId: existing?.importedLessonId || null,
  };
  final.file = saveCourse(final, text);
  if (existing) Object.assign(existing, final);
  else index.entries.push(final);
  if (!part || part.n === part.of) {
    entry.reformulatedId = part ? idForUrl(`final:${entry.id}`) : id;
    // false, not deleted: saveIndex would bring back a missing or null field from the copy on disk
    if (entry.rewrite) entry.rewrite = false;
  }
  saveIndex(index);
  return final;
}

// ---------- failures shared by both modes ----------

const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * What to do after a failed model call: "retry" (the item goes back to the front of the queue after a wait),
 * "stop" (the queue is emptied), or false (a failure of this item).
 */
async function recoverable(err, title, queue, item) {
  if (err instanceof Anthropic.AuthenticationError) {
    log("✗ clé API invalide ou absente : définissez ANTHROPIC_API_KEY.");
    process.exit(1);
  }
  // Network down (no DNS, connection reset): not the course's fault. Wait, then try the same item again.
  if (/ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|Can't reach the API|fetch failed|socket hang up|network/i.test(err.message)) {
    log(`! réseau indisponible, nouvel essai dans 5 min : ${title}`);
    queue.unshift(item);
    await sleepMs(5 * 60 * 1000);
    return "retry";
  }
  // Subscription usage limit: wait for the window to reset and carry on, without counting a failure.
  if (err.cli && /limit|quota|rate|overloaded/i.test(err.message) && !/log ?in|auth|credit/i.test(err.message)) {
    log(`! limite d'utilisation atteinte, reprise dans 15 min : ${err.message.slice(0, 160)}`);
    queue.unshift(item);
    await sleepMs(15 * 60 * 1000);
    return "retry";
  }
  if (err.cli && /credit|log ?in|auth/i.test(err.message)) {
    log(`✗ arrêt : ${err.message}`);
    log("  Relancez la même commande plus tard : les cours déjà produits sont conservés et ignorés.");
    queue.length = 0;
    return "stop";
  }
  if (err instanceof Anthropic.RateLimitError) {
    log(`! limite de débit atteinte, nouvel essai dans 30 s : ${title}`);
    await sleepMs(30000);
    queue.unshift(item);
    return "retry";
  }
  return false;
}

// ---------- chapter mode ----------
// The documents of one chapter (AlloSchool courses and summaries, or the courses already written from them one by
// one) become 2 or 3 complete, complementary courses that share the chapter without repeating each other, each
// followed by its own summary. The courses written one document at a time are retired once the chapter is redone.

const GROUP_MAX_COURSES = 3;
const MIN_COURSES = Math.max(1, Math.min(GROUP_MAX_COURSES, Number(opts["min-courses"]) || 1));
// Programme descriptions and teaching sheets are not chapters: --min-courses does not apply to them.
const ADMIN_CHAPTER = /programme p[ée]dagogique|fiches? p[ée]dagogiques?/i;
// Published courses per chapter of the site: level|subject|chapterKey → number of COURSE finals online.
const siteCourses = new Map();
for (const f of index.entries) {
  if (f.site !== "final" || !f.file || f.type !== "COURSE" || f.superseded) continue;
  const k = `${f.level}|${f.subject}|${chapterKey(f.chapter || "general")}`;
  siteCourses.set(k, (siteCourses.get(k) || 0) + 1);
}
const GROUP_WORDS_PER_COURSE = 5000; // words of material per course: 2 courses from 6 000 words, 3 from 10 000
const MATERIAL_CAP = 28000; // words of material sent to one model call
const GROUP_STATE = path.join(ROOT, ".group-state.json");
const groupState = fs.existsSync(GROUP_STATE) ? JSON.parse(fs.readFileSync(GROUP_STATE, "utf8")) : {};
const saveGroupState = () => fs.writeFileSync(GROUP_STATE, JSON.stringify(groupState));

const groupKeyOf = (e) => `${e.level}|${e.subject}|${e.chapter || "general"}`;
const oldFinalsOf = (source) => index.entries.filter((f) => f.site === "final" && f.sourceId === source.id && f.file && !f.group);
const groupFinalsOf = (key) => index.entries.filter((f) => f.site === "final" && f.group === key && f.file);
const sameSet = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

/** The text that stands for a document today: the course(s) already written from it (clean), else the raw document. */
function materialOf(source) {
  const finals = oldFinalsOf(source).sort((a, b) => String(a.part || "").localeCompare(String(b.part || ""), undefined, { numeric: true }));
  if (finals.length) {
    const text = finals.map((f) => readCourse(f).body.replace(/```(?:svg|lab)\n[\s\S]*?```/g, "").trim()).join("\n\n");
    return { source, title: source.title, type: source.type, text, raw: false };
  }
  const { body } = readCourse(source);
  return { source, title: source.title, type: source.type, text: body.replace(/^>.*\n+/, "").trim(), raw: true };
}

const chapterJobs = [];
const onlyGroup = opts.mode === "chapter" && opts.only ? index.entries.find((e) => e.id === opts.only && e.group && e.file) || null : null;
if (opts.only && opts.mode === "chapter" && !onlyGroup) {
  console.error("--only attend l'identifiant d'un cours de chapitre (entrée finale avec \"group\").");
  process.exit(1);
}
if (opts.mode === "chapter") {
  const groups = new Map();
  const pool = onlyGroup ? index.entries.filter((e) => e.site === "alloschool" && onlyGroup.groupDocs.includes(e.id)) : eligible;
  for (const e of pool) (groups.get(groupKeyOf(e)) ?? groups.set(groupKeyOf(e), []).get(groupKeyOf(e))).push(e);
  for (const [key, all] of groups) {
    // The same document twice in the chapter: one copy is enough (dedupe.mjs marks the others for good).
    const seen = new Set();
    const docs = all.filter((e) => {
      const k = sourceKey(e);
      if (k && seen.has(k)) return false;
      if (k) seen.add(k);
      return true;
    });
    const finals = groupFinalsOf(key);
    const started = finals.length > 0 && finals.every((f) => sameSet(f.groupDocs || [], docs.map((d) => d.id)));
    const done = started && finals.some((f) => f.type === "EXERCISE");
    // Courses of this chapter on the site today (old one-per-document courses and chapter courses, same chapter key).
    const existingCourses = siteCourses.get(`${all[0].level}|${all[0].subject}|${chapterKey(all[0].chapter || "general")}`) || 0;
    const enough = existingCourses >= MIN_COURSES || ADMIN_CHAPTER.test(all[0].chapter || "");
    if (done && enough && !opts.force && !onlyGroup) continue;
    const state = groupState[key];
    if ((state?.failures || 0) >= 2 && !opts.force && !opts.only) continue;
    const material = [];
    for (const d of docs) {
      try {
        const m = materialOf(d);
        const compact = m.text.replace(/<!--[\s\S]*?-->/g, "").replace(/[_.…\-–—=*|#]{3,}/g, "").replace(/\s+/g, "");
        const letters = (compact.match(/\p{L}/gu) || []).length;
        if (compact.length > 0 && letters / compact.length < 0.55) {
          d.unreadable = true;
          continue;
        }
        material.push(m);
      } catch {
        /* missing file */
      }
    }
    if (!material.length) continue;
    const words = material.reduce((n, m) => n + wordCount(m.text), 0);
    const count = Math.max(1, Math.min(GROUP_MAX_COURSES, Math.max(MIN_COURSES, Math.ceil(words / GROUP_WORDS_PER_COURSE))));
    const first = docs[0];
    chapterJobs.push({
      key,
      id: idForUrl(`final:group:${key}`),
      level: first.level,
      subject: first.subject,
      chapter: first.chapter || "general",
      tags: first.tags,
      lang: first.lang,
      docs,
      material,
      words,
      count,
      fresh: material.some((m) => m.raw),
      // Chapter courses already written for these documents but no exercises yet (a course or summary was refused):
      // the run resumes it even with --no-regroup, the existing courses and summaries are kept.
      partial: started && !done,
      existingCourses,
      enough,
      onlyN: onlyGroup ? onlyGroup.n : 0,
      signature: docs.map(sourceKey).filter(Boolean).sort().join(","),
    });
  }
  if (opts["empty-levels"] && !onlyGroup) chapterJobs.push(...(await emptyChapterJobs()));
  if (opts["no-regroup"] && !onlyGroup) {
    const kept = chapterJobs.filter((c) => c.fresh || !c.enough || c.partial);
    if (kept.length < chapterJobs.length) log(`${chapterJobs.length - kept.length} chapitre(s) déjà reformulé(s) laissé(s) tel(s) quel(s) (--no-regroup)`);
    chapterJobs.splice(0, chapterJobs.length, ...kept);
  }
  // Chapters with documents never reformulated first, then the ones to regroup.
  chapterJobs.sort((a, b) => Number(b.fresh) - Number(a.fresh));
  // Twin chapters (same documents, or the same knowledge chapter of another filière) are not written twice in one
  // run: the first is written, the others are copied from it on a later run (reuseGroup).
  if (!onlyGroup) {
    const seenSignature = new Set();
    const unique = chapterJobs.filter((c) => !c.signature || !seenSignature.has(c.signature) && seenSignature.add(c.signature));
    chapterJobs.splice(0, chapterJobs.length, ...unique);
  }
  const total = chapterJobs.length;
  if (max > 0) chapterJobs.splice(max);
  log(`${total} chapitre(s) à reformuler (${chapterJobs.filter((c) => c.fresh).length} avec de nouveaux documents, ${total - chapterJobs.filter((c) => c.fresh).length} à regrouper)${max ? `, ${chapterJobs.length} dans ce lot` : ""}`);
  if (!chapterJobs.length) process.exit(0);
}

/** Seed placeholders of server/prisma/seed.ts (same test as clean-chapters.mjs). */
function isPlaceholder(lesson) {
  return /Ce cours est en cours de rédaction par l'équipe pédagogique de Myschool|\*Corrigé détaillé disponible prochainement\.\*|\*Contenu premium en cours de rédaction\.\*/.test(lesson.content || "");
}

/**
 * Chapters of the site (levels of --empty-levels) without any real published lesson: written from the model's
 * knowledge of the programme, as a chapter job without documents (job.knowledge). A chapter whose title matches a
 * chapter of the repository (even one not yet reformulated) is left to the documents.
 */
async function emptyChapterJobs() {
  if (!opts.password) throw new Error("--empty-levels demande le mot de passe admin (--password ou MYSCHOOL_ADMIN_PASSWORD)");
  const base = opts.api.replace(/\/$/, "");
  const call = async (route, token) => {
    const res = await fetch(base + route, { headers: { "content-type": "application/json", connection: "close", ...(token ? { authorization: `Bearer ${token}` } : {}) }, method: route === "/auth/login" ? "POST" : "GET", body: route === "/auth/login" ? JSON.stringify({ email: opts.email, password: opts.password }) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${route} → ${res.status} ${data.error || ""}`);
    return data;
  };
  const { token } = await call("/auth/login");
  const wanted = new Set(opts["empty-levels"].split(",").map((s) => s.trim()).filter(Boolean));
  // Languages and humanities have one programme for every filière of a year (the anglais of 2 Bac PC, SVT, Éco…):
  // a chapter written from knowledge for one filière is copied to the others (same signature → reuseGroup) instead
  // of being written again. Sciences differ between filières and stay per level.
  const SHARED_PROGRAMME = new Set(["anglais", "francais", "philosophie", "arabe", "education-islamique", "histoire-geographie", "informatique"]);
  const cycleOf = (slug) => slug.split("-")[0];
  const repoChapters = new Set(index.entries.filter((e) => e.site === "alloschool" && e.chapter).map((e) => `${e.level}|${e.subject}|${chapterKey(e.chapter)}`));
  const jobs = [];
  const reChapter = opts.chapter ? new RegExp(opts.chapter, "i") : null;
  for (const level of await call("/admin/levels", token)) {
    if (!wanted.has(level.slug) || (opts.level && opts.level !== level.slug)) continue;
    for (const ls of level.subjects || []) {
      if (opts.subject && opts.subject !== ls.subject.slug) continue;
      const detail = await call(`/admin/level-subjects/${ls.id}`, token);
      for (const ch of detail.chapters || []) {
        if (ADMIN_CHAPTER.test(ch.title) || (reChapter && !reChapter.test(ch.title))) continue;
        if (repoChapters.has(`${level.slug}|${ls.subject.slug}|${chapterKey(ch.title)}`)) continue;
        const key = `${level.slug}|${ls.subject.slug}|${ch.title}`;
        const finals = groupFinalsOf(key);
        if (finals.length && finals.some((f) => f.type === "EXERCISE") && !opts.force) continue; // written in an earlier run, waiting for import
        // A chapter started from knowledge (its first courses are already online) but without exercises yet: resumed.
        const partial = finals.length > 0;
        if (!partial && ch.lessons.some((l) => l.isPublished && !isPlaceholder(l))) continue;
        if ((groupState[key]?.failures || 0) >= 2 && !opts.force) continue;
        jobs.push({
          key,
          id: idForUrl(`final:group:${key}`),
          level: level.slug,
          subject: ls.subject.slug,
          chapter: ch.title,
          tags: ["myschool", level.name, ls.subject.name],
          lang: "fr",
          docs: [],
          material: [],
          words: 0,
          count: Math.max(2, MIN_COURSES),
          fresh: true,
          enough: false,
          existingCourses: 0,
          knowledge: true,
          onlyN: 0,
          signature: SHARED_PROGRAMME.has(ls.subject.slug) ? `knowledge:${cycleOf(level.slug)}|${ls.subject.slug}|${chapterKey(ch.title)}` : "",
        });
      }
    }
  }
  if (jobs.length) log(`${jobs.length} chapitre(s) vide(s) sans document à rédiger de A à Z (--empty-levels)`);
  return jobs;
}

const PLAN_KNOWLEDGE_SYSTEM = `Tu es un professeur agrégé marocain. On te donne un chapitre du programme officiel marocain (niveau, matière, titre du chapitre), sans document. Tu répartis TOUT le contenu attendu de ce chapitre dans le programme officiel en K cours complets et complémentaires, dans l'ordre pédagogique, sans qu'une notion soit traitée deux fois.

Réponds uniquement par un objet JSON, sans commentaire :
{"courses": [{"title": "<Chapitre> : <ce que traite ce cours>", "covers": ["notion 1", "notion 2", ...]}]}

Règles : exactement K éléments dans "courses" ; chaque définition, propriété, méthode et type d'exercice au programme de ce chapitre figure dans "covers" d'un seul cours ; les cours sont de taille comparable ; les titres sont précis et distincts.`;

const PLAN_SYSTEM = `Tu es un professeur agrégé marocain. On te donne les documents disponibles sur un chapitre (cours et résumés, souvent redondants entre eux). Tu répartis TOUT le contenu du chapitre en K cours complets et complémentaires, dans l'ordre pédagogique du programme, sans qu'une notion soit traitée deux fois.

Réponds uniquement par un objet JSON, sans commentaire :
{"courses": [{"title": "<Chapitre> : <ce que traite ce cours>", "covers": ["notion 1", "notion 2", ...], "docs": [<numéros des documents utiles à ce cours>]}]}

Règles : exactement K éléments dans "courses" ; chaque définition, propriété, méthode et type d'exercice présent dans les documents figure dans "covers" d'un seul cours ; les cours sont de taille comparable ; "docs" liste les numéros (à partir de 1) des documents dont ce cours tire sa matière (un document peut servir à plusieurs cours) ; les titres sont précis et distincts.`;

function planPrompt(job) {
  const per = Math.max(800, Math.floor(MATERIAL_CAP / job.material.length));
  const docs = job.material.map((m, i) => {
    const w = m.text.split(/\s+/);
    const text = w.length > per ? w.slice(0, per).join(" ") + "\n[…]" : m.text;
    return `=== Document ${i + 1} : ${m.title} (${m.type === "SUMMARY" ? "résumé" : "cours"}, ${w.length} mots) ===\n${text}`;
  });
  return `Niveau : ${job.tags?.slice(1).join(" / ") || job.level}\nMatière : ${job.subject}\nChapitre : ${job.chapter}\nK = ${job.count}\n\n${docs.join("\n\n")}`;
}

function parsePlan(text, job) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("plan illisible");
  const plan = JSON.parse(m[0]);
  const courses = Array.isArray(plan.courses) ? plan.courses : [];
  if (courses.length !== job.count) throw new Error(`plan de ${courses.length} cours au lieu de ${job.count}`);
  return courses.map((c, i) => {
    const docs = [...new Set((Array.isArray(c.docs) ? c.docs : []).map(Number).filter((n) => n >= 1 && n <= job.material.length))];
    return {
      title: String(c.title || `${job.chapter} : partie ${i + 1}`).trim().slice(0, 160),
      covers: (Array.isArray(c.covers) ? c.covers : []).map((s) => String(s).trim()).filter(Boolean),
      docs: docs.length ? docs : job.material.map((_, n) => n + 1),
    };
  });
}

async function planFor(job) {
  const state = groupState[job.key];
  if (state?.plan && state.count === job.count && sameSet(state.docs || [], job.docs.map((d) => d.id))) return state.plan;
  if (job.count === 1) {
    const plan = [{ title: `${job.chapter} : cours complet`, covers: [], docs: job.material.map((_, n) => n + 1) }];
    groupState[job.key] = { ...state, plan, count: 1, docs: job.docs.map((d) => d.id) };
    saveGroupState();
    return plan;
  }
  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const answer = job.knowledge
      ? await askModel(PLAN_KNOWLEDGE_SYSTEM, `Niveau : ${job.tags.slice(1).join(" / ")}\nMatière : ${job.subject}\nChapitre : ${job.chapter}\nK = ${job.count}`)
      : await askModel(PLAN_SYSTEM, planPrompt(job));
    try {
      const plan = parsePlan(answer.text, job);
      groupState[job.key] = { ...state, plan, count: job.count, docs: job.docs.map((d) => d.id) };
      saveGroupState();
      return plan;
    } catch (err) {
      lastErr = err;
      log(`  ! plan refusé (essai ${attempt}) : ${job.chapter} — ${err.message}`);
    }
  }
  throw lastErr;
}

/** One short model call with its own system prompt (the plan), through the same engine as the courses. */
async function askModel(system, prompt) {
  if (opts.engine === "cli") {
    const file = path.join(CACHE_DIR, `system-${createHash("md5").update(system).digest("hex").slice(0, 8)}.md`);
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    if (!fs.existsSync(file)) fs.writeFileSync(file, system);
    const json = await runClaudeCli(prompt, file);
    totalCost += json.total_cost_usd || 0;
    const text = String(json.result || "");
    if (text.length < 400 && /usage limit|limit reached|rate limit|overloaded/i.test(text)) {
      throw Object.assign(new Error(`limite d'utilisation : ${text.slice(0, 160)}`), { cli: json });
    }
    return { text };
  }
  const message = await client.messages.create({ model: opts.model, max_tokens: 4000, system, messages: [{ role: "user", content: prompt }] });
  const u = message.usage || {};
  totalCost += ((u.input_tokens || 0) * PRICE.input + (u.output_tokens || 0) * PRICE.output) / 1e6;
  return { text: message.content.filter((b) => b.type === "text").map((b) => b.text).join("\n") };
}

function coursePrompt(job, plan, i) {
  const c = plan[i];
  const others = plan.map((o, j) => (j === i ? null : `- cours ${j + 1} « ${o.title} » : ${o.covers.join(", ") || "le reste du chapitre"}`)).filter(Boolean);
  let budget = MATERIAL_CAP;
  const notes = c.docs.map((n) => {
    const m = job.material[n - 1];
    const w = m.text.split(/\s+/);
    const keep = Math.min(w.length, budget);
    budget -= keep;
    return `=== Document ${n} : ${m.title} ===\n${keep < w.length ? w.slice(0, keep).join(" ") + "\n[…]" : m.text}`;
  });
  return `Niveau : ${job.tags?.slice(1).join(" / ") || job.level}
Matière : ${job.subject}
Chapitre : ${job.chapter}
${plan.length > 1 ? `Ce chapitre est découpé en ${plan.length} cours complémentaires. Tu rédiges le cours ${i + 1} : « ${c.title} ».
Il traite exactement : ${c.covers.join(" ; ") || "le contenu des documents fournis"}.
Les autres cours du chapitre traitent (ne les traite pas ici et ne répète pas leur contenu, un simple renvoi suffit) :
${others.join("\n")}
` : `Ce chapitre tient en un seul cours : « ${c.title} ». Il couvre tout le contenu des documents fournis.
`}Titre « # » du cours : « ${c.title} ».
${job.knowledge ? `Type : COURSE. Il s'agit d'un cours complet. Aucun document n'est fourni : tu rédiges ce cours à partir de ta connaissance du programme officiel marocain de ce niveau et de cette matière (contenu, vocabulaire, notations, niveau de difficulté et types d'exercices attendus en classe et au contrôle), avec la même richesse qu'un cours écrit à partir d'un polycopié : définitions, propriétés, méthodes, exemples détaillés, exercices corrigés. Un cours de ${job.subject === "philosophie" ? "philosophie suit le programme marocain (axes, problématiques, positions des auteurs, textes de référence) " : ""}3 000 à 5 000 mots.
Rédige en français${/^(anglais|english)/i.test(job.subject) ? " pour les explications, avec les contenus, exemples et exercices en anglais" : ""}. Dans les exemples (tableaux, fiches, courriers, formulaires), n'écris jamais de numéro de téléphone, d'adresse e-mail, d'adresse postale ni d'URL, même fictifs : remplace-les par des mentions génériques (« téléphone », « e-mail »).` : `Type : COURSE. Il s'agit d'un cours complet : tout ce que les documents disent sur ces notions y est, reformulé, complété et sans redite.
Rédige en français, même si un document est en arabe (traduis et reformule).

=== NOTES BRUTES ===
${notes.join("\n\n")}
=== FIN DES NOTES ===`}`;
}

function summaryPrompt(job, title, courseText) {
  return `Niveau : ${job.tags?.slice(1).join(" / ") || job.level}
Matière : ${job.subject}
Chapitre : ${job.chapter}
Titre « # » du résumé : « ${title} : l'essentiel à retenir ».
Type : SUMMARY. Il s'agit de la fiche de révision simplifiée du cours ci-dessous, organisée en parties : « Définitions et formules à connaître » (chaque définition, propriété, formule et méthode du cours, reformulée en une ou deux phrases simples, sans démonstration), « Remarques » (les remarques et cas particuliers importants du cours, en une phrase chacune), « Astuces » (moyens mnémotechniques, raccourcis de calcul, réflexes à avoir devant un exercice) et « Pièges à éviter » (bloc \`> **Attention !**\` par erreur classique d'élève, avec la bonne façon de faire). Un exemple très court par notion importante au plus, pas de partie Exercices, aucun labo ni schéma (pas de bloc \`\`\`lab ni \`\`\`svg). Ne traite rien qui ne soit pas dans ce cours.
Rédige en français.

=== NOTES BRUTES ===
${courseText}
=== FIN DES NOTES ===`;
}

function exercisesPrompt(job, plan, courseTexts) {
  let budget = MATERIAL_CAP;
  const notes = courseTexts.map((t, i) => {
    const w = t.replace(/```(?:svg|lab)\n[\s\S]*?```/g, "").split(/\s+/);
    const keep = Math.min(w.length, budget);
    budget -= keep;
    return `=== Cours ${i + 1} : ${plan[i].title} ===\n${w.slice(0, keep).join(" ")}${keep < w.length ? "\n[…]" : ""}`;
  });
  return `Niveau : ${job.tags?.slice(1).join(" / ") || job.level}
Matière : ${job.subject}
Chapitre : ${job.chapter}
Titre « # » : « ${job.chapter} : exercices corrigés ».
Type : EXERCISE. Il s'agit de la série d'exercices corrigés du chapitre : un rappel très court des formules utiles (sans réexpliquer le cours), puis 8 à 12 exercices progressifs qui couvrent toutes les notions des ${plan.length} cours ci-dessous (du calcul direct au problème de synthèse, dans l'esprit des contrôles et de l'examen marocain), chacun suivi de sa solution détaillée repliée (\`> **Solution de l'exercice n.**\`). Pas de « Testez-vous ».
Rédige en français.

=== NOTES BRUTES ===
${notes.join("\n\n")}
=== FIN DES NOTES ===`;
}

/** The chapter's « exercices corrigés » lesson, written from its courses unless it already exists for these documents. */
async function ensureExercises(job, plan, courseTexts) {
  const existing = findEntry(index, idForUrl(`final:group:${job.key}#exercices`));
  if (existing?.file && sameSet(existing.groupDocs || [], job.docs.map((d) => d.id)) && !opts.force) return;
  if (!courseTexts.length) return;
  const result = await produce(exercisesPrompt(job, plan, courseTexts), courseTexts.join("\n\n"), { type: "EXERCISE", coverageRatio: 0.1 });
  const final = saveGroupFinal(job, 0, "EXERCISE", result.text, job.material.map((_, i) => i + 1));
  ok++;
  log(`✓ ${final.title} — ${final.words} mots, ${result.cost.toFixed(3)} $ → repository/${final.file}`);
}

function saveGroupFinal(job, n, type, text, docNumbers) {
  const kind = type === "SUMMARY" ? "résumé" : type === "EXERCISE" ? "exercices" : "cours";
  const heading = (text.match(/^#\s+(.+)$/m) || [])[1]?.trim() || `${job.chapter} ${kind} ${n}`;
  const id = idForUrl(`final:group:${job.key}#${type === "EXERCISE" ? "exercices" : n + (type === "SUMMARY" ? "-resume" : "")}`);
  const dir = ["final", slugify(job.level), slugify(job.subject), slugify(job.chapter)].join("/");
  const existing = findEntry(index, id);
  const sourceIds = docNumbers.map((k) => job.material[k - 1].source.id);
  const final = {
    id,
    url: `final:group:${job.id}#${type === "EXERCISE" ? "exercices" : n + (type === "SUMMARY" ? "-resume" : "")}`,
    finalUrl: "",
    site: "final",
    title: heading,
    slug: existing?.slug || `${slugify(heading).slice(0, 70)}-${id}`,
    dir,
    level: job.level,
    subject: job.subject,
    chapter: job.chapter,
    type,
    tags: ["cours-myschool", job.level, job.subject],
    lang: "fr",
    license: "Contenu original Myschool",
    rights: "original",
    description: `${job.chapter} — ${heading}`,
    sourceId: sourceIds[0] || job.docs[0]?.id || null,
    ...(job.knowledge ? { knowledge: true } : {}),
    sourceIds,
    group: job.key,
    groupDocs: job.docs.map((d) => d.id),
    groupSignature: job.signature,
    n,
    model: opts.model,
    fetchedAt: new Date().toISOString(),
    words: wordCount(text),
    importedLessonId: existing?.importedLessonId || null,
  };
  delete final.importedAt;
  final.file = saveCourse(final, text);
  if (existing) Object.assign(existing, final);
  else index.entries.push(final);
  saveIndex(index);
  return final;
}

/** The courses of this chapter are done: its documents count as reformulated, the one-document courses retire. */
function finishGroup(job) {
  for (const d of job.docs) {
    d.reformulatedId = job.id;
    for (const f of oldFinalsOf(d)) {
      try {
        fs.unlinkSync(path.join(ROOT, f.file));
      } catch {
        /* already gone */
      }
      f.file = null;
      f.superseded = job.id; // import.mjs removes its lesson from the site
    }
  }
  delete groupState[job.key];
  saveGroupState();
  saveIndex(index);
}

/** Copies the courses of a chapter already done elsewhere from the very same documents (another filière). */
function reuseGroup(job) {
  if (!job.signature) return 0;
  let twin = index.entries.find((f) => f.site === "final" && f.group && f.group !== job.key && f.file && f.groupSignature === job.signature && !f.reusedFrom);
  // Shared programme (languages, philosophy): the same chapter finished for another filière of the same year, from
  // its documents or from knowledge, is copied rather than written again.
  const shared = /^knowledge:([^|]+)\|/.exec(job.signature);
  if (!twin && shared) {
    const cycle = shared[1];
    const key = chapterKey(job.chapter);
    twin = index.entries.find(
      (f) => f.site === "final" && f.group && f.group !== job.key && f.file && f.type === "EXERCISE" && !f.reusedFrom && f.subject === job.subject && (f.level || "").split("-")[0] === cycle && chapterKey(f.chapter || "") === key
    );
  }
  if (!twin) return 0;
  const finals = groupFinalsOf(twin.group).filter((f) => !f.reusedFrom);
  // A twin with fewer courses than required (one-course chapter of an older run) would leave this chapter short at
  // every pass: it is written anew instead, and the twin will be copied from it later.
  if (finals.filter((f) => f.type === "COURSE").length < MIN_COURSES && !ADMIN_CHAPTER.test(job.chapter || "")) return 0;
  let copied = 0;
  for (const f of finals) {
    const id = idForUrl(`final:group:${job.key}#${f.type === "EXERCISE" ? "exercices" : f.n + (f.type === "SUMMARY" ? "-resume" : "")}`);
    const existing = findEntry(index, id);
    const final = {
      ...f,
      id,
      url: `final:group:${job.id}#${f.type === "EXERCISE" ? "exercices" : f.n + (f.type === "SUMMARY" ? "-resume" : "")}`,
      slug: existing?.slug || `${slugify(f.title).slice(0, 70)}-${id}`,
      dir: ["final", slugify(job.level), slugify(job.subject), slugify(job.chapter)].join("/"),
      level: job.level,
      subject: job.subject,
      chapter: job.chapter,
      tags: ["cours-myschool", job.level, job.subject],
      description: `${job.chapter} — ${f.title}`,
      sourceId: job.docs[0]?.id || null,
      sourceIds: job.docs.map((d) => d.id),
      group: job.key,
      groupDocs: job.docs.map((d) => d.id),
      reusedFrom: f.id,
      fetchedAt: new Date().toISOString(),
      importedLessonId: existing?.importedLessonId || null,
    };
    delete final.importedAt;
    delete final.labs;
    delete final.labsAt;
    delete final.labsPlan;
    final.file = saveCourse(final, readCourse(f).body.trim());
    if (existing) Object.assign(existing, final);
    else index.entries.push(final);
    copied++;
  }
  if (copied) finishGroup(job);
  return copied;
}

async function runChapter(job) {
  if (opts["dry-run"]) {
    const twin = job.signature && index.entries.some((f) => f.site === "final" && f.group && f.group !== job.key && f.file && f.groupSignature === job.signature);
    log(`~ ${job.level} / ${job.subject} / ${job.chapter} — ${job.material.length} document(s) (${job.material.filter((m) => m.raw).length} brut(s)), ${job.words} mots → ${job.count} cours + ${job.count} résumé(s) + exercices${twin ? " (copie d'une autre filière)" : ""}`);
    return;
  }
  const copied = job.onlyN ? 0 : reuseGroup(job);
  if (copied) {
    ok += copied;
    log(`✓ ${job.level} / ${job.subject} / ${job.chapter} : ${copied} cours copié(s) d'une autre filière sans appel au modèle`);
    const courses = groupFinalsOf(job.key).filter((f) => f.type === "COURSE" && f.file).sort((a, b) => (a.n || 0) - (b.n || 0));
    await ensureExercises(job, courses.map((f) => ({ title: f.title, docs: f.groupDocs || [] })), courses.map((f) => readCourse(f).body.trim()));
    return;
  }
  const plan = await planFor(job);
  const courseTexts = [];
  for (const [i, c] of plan.entries()) {
    const n = i + 1;
    if (job.onlyN && n !== job.onlyN) continue;
    const courseId = idForUrl(`final:group:${job.key}#${n}`);
    const existing = findEntry(index, courseId);
    let courseText;
    if (existing?.file && sameSet(existing.groupDocs || [], job.docs.map((d) => d.id)) && !opts.force && !job.onlyN) {
      courseText = readCourse(existing).body.trim(); // written in an interrupted run
    } else if (plan.length === 1 && job.material.length === 1 && !job.material[0].raw && oldFinalsOf(job.docs[0]).length === 1) {
      // One document, one course already written from it: it stays as it is, only the summary is new.
      const old = oldFinalsOf(job.docs[0])[0];
      courseText = readCourse(old).body.trim();
      const final = saveGroupFinal(job, n, "COURSE", courseText, [1]);
      if (old.labs !== undefined) Object.assign(final, { labs: old.labs, labsAt: old.labsAt, labsPlan: old.labsPlan });
      log(`= ${final.title} — cours existant conservé`);
    } else {
      const notes = c.docs.map((k) => job.material[k - 1].text).join("\n\n");
      const result = await produce(coursePrompt(job, plan, i), notes, { type: "COURSE", coverageRatio: 0.45 / Math.max(1, plan.filter((o) => o.docs.some((d) => c.docs.includes(d))).length) });
      const final = saveGroupFinal(job, n, "COURSE", result.text, c.docs);
      courseText = result.text;
      ok++;
      log(`✓ ${final.title} — ${final.words} mots, ${result.cost.toFixed(3)} $ → repository/${final.file}`);
    }
    courseTexts.push(courseText);
    if (job.onlyN) continue; // one course redone: its summary stays
    const summaryId = idForUrl(`final:group:${job.key}#${n}-resume`);
    const existingSummary = findEntry(index, summaryId);
    if (existingSummary?.file && sameSet(existingSummary.groupDocs || [], job.docs.map((d) => d.id)) && !opts.force) continue;
    // A summary is a simplified sheet: 15 % of a long course is enough (a 1 371-word sheet of a 6 883-word course was refused at 20 %).
    const result = await produce(summaryPrompt(job, c.title, courseText), courseText, { type: "SUMMARY", coverageRatio: 0.15 });
    const final = saveGroupFinal(job, n, "SUMMARY", result.text, c.docs);
    ok++;
    log(`✓ ${final.title} — ${final.words} mots, ${result.cost.toFixed(3)} $ → repository/${final.file}`);
  }
  if (job.onlyN) return;
  await ensureExercises(job, plan, courseTexts);
  // Courses of an earlier, larger plan for this chapter (fewer documents now): retire them.
  for (const f of groupFinalsOf(job.key)) {
    if ((f.n || 0) > plan.length) {
      try {
        fs.unlinkSync(path.join(ROOT, f.file));
      } catch {
        /* already gone */
      }
      f.file = null;
      f.superseded = job.id;
    }
  }
  finishGroup(job);
}

async function chapterWorker() {
  while (chapterJobs.length) {
    const job = chapterJobs.shift();
    try {
      await runChapter(job);
    } catch (err) {
      failed++;
      const r = await recoverable(err, job.chapter, chapterJobs, job);
      if (r === "retry") failed--;
      if (r) continue;
      log(`✗ ${job.level} / ${job.subject} / ${job.chapter} : ${err.message}`);
      const state = groupState[job.key] || {};
      groupState[job.key] = { ...state, failures: (state.failures || 0) + 1 };
      saveGroupState();
    }
  }
}

// ---------- run ----------

let ok = 0;
let failed = 0;
const queue = [...sources];
const concurrency = Math.max(1, Number(opts.concurrency) || 1);

async function worker() {
  while (queue.length) {
    const entry = queue.shift();
    try {
      const parts = splitSource(entry);
      if (parts.length > 1) {
        for (const [i, text] of parts.entries()) {
          const part = { n: i + 1, of: parts.length };
          const done = findEntry(index, idForUrl(part.n > 1 ? `final:${entry.id}#${part.n}` : `final:${entry.id}`));
          if (done?.part === `${part.n}/${part.of}` && !opts.force && !entry.rewrite) continue; // finished in an earlier run
          const result = await reformulateOne({ ...entry, part }, text);
          if (!result) continue;
          const final = saveFinal(entry, result.text, part);
          ok++;
          log(`✓ ${final.title} — ${final.words} mots, ${(result.cost).toFixed(3)} $ → repository/${final.file}`);
        }
        continue;
      }
      const result = await reformulateOne(entry);
      if (!result) continue;
      const final = saveFinal(entry, result.text);
      ok++;
      log(`✓ ${final.title} — ${final.words} mots, ${(result.cost).toFixed(3)} $ → repository/${final.file}`);
    } catch (err) {
      failed++;
      const r = await recoverable(err, entry.title, queue, entry);
      if (r === "retry") failed--;
      if (r) continue;
      log(`✗ ${entry.title} : ${err.message}`);
      entry.reformulateFailures = (entry.reformulateFailures || 0) + 1;
      // A scanned PDF stays unreadable: no second try.
      if (/^texte source illisible/.test(err.message)) entry.unreadable = true;
      saveIndex(index);
    }
  }
}

if (opts.mode === "chapter") {
  const jobs = [...chapterJobs];
  await Promise.all(Array.from({ length: concurrency }, chapterWorker));
  if (opts["dry-run"]) {
    const calls = jobs.reduce((n, j) => n + (j.count > 1 ? 1 : 0) + 2 * j.count + 1, 0);
    const words = jobs.reduce((n, j) => n + j.words * (1 + 1 / j.count), 0);
    const est = calls * 0.06 + (words / 0.75 / 1e6) * PRICE.input;
    log(`Simulation : ${jobs.length} chapitre(s), ${jobs.reduce((n, j) => n + j.count, 0)} cours + autant de résumés, ${calls} appel(s). Coût estimé ≈ ${est.toFixed(2)} $ (Opus 5.5, hors cache).`);
    process.exit(0);
  }
} else await Promise.all(Array.from({ length: concurrency }, worker));
if (opts["dry-run"]) {
  const words = sources.reduce((a, e) => a + (e.words || 0), 0);
  const est = sources.length * (0.02 + 0.05) + (words / 0.75 / 1e6) * PRICE.input;
  log(`Simulation : ${sources.length} document(s), ${words} mots source. Coût estimé ≈ ${est.toFixed(2)} $ (Opus 5.5, hors cache).`);
} else {
  log(`Terminé : ${ok} cours produit(s), ${failed} échec(s). Coût total ≈ ${totalCost.toFixed(2)} $.`);
}
process.exit(failed && !ok ? 1 : 0);
