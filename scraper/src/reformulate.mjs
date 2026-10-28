#!/usr/bin/env node
/**
 * Reformule les cours du dépôt (texte extrait des PDF / pages AlloSchool) en cours Myschool originaux,
 * au format décrit dans style/format-cours.md (définitions surlignées, blocs, exercices corrigés),
 * et les range dans repository/final/<niveau>/<matière>/<chapitre>/.
 *
 *   npm run reformulate -- [--level 2bac-pc] [--subject mathematiques] [--chapter "<regex>"] [--course "<regex>"]
 *                          [--type COURSE,SUMMARY] [--max <n>] [--only <id>] [--lang fr|auto] [--source-lang fr|ar|all]
 *                          [--force] [--dry-run] [--model claude-opus-5-5] [--effort high] [--concurrency 2]
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
import { foldLeakedAnswers, fold, separateFoldedLabels, idForUrl, log, slugify, stripToc, unmarkInMath, wordCount, singleInstance, killTree } from "./util.mjs";

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
    help: { type: "boolean", short: "h", default: false },
  },
});
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

if (!opts.force && sources.length) {
  const twins = new Map();
  for (const e of index.entries) {
    if (e.site !== "alloschool" || !e.reformulatedId) continue;
    const key = sourceKey(e);
    if (key && !twins.has(key)) twins.set(key, e);
  }
  const pending = new Set();
  let reused = 0;
  let copies = 0;
  let waiting = 0;
  sources = sources.filter((e) => {
    const key = sourceKey(e);
    if (!key || e.rewrite) return true;
    const twin = twins.get(key);
    if (twin) {
      if (!opts["dry-run"]) {
        const n = reuseCourse(e, twin);
        if (!n) return true;
        copies += n;
      }
      reused++;
      return false;
    }
    // Two identical sources in this run: reformulate the first, the other reuses it on the next run.
    if (pending.has(key)) {
      waiting++;
      return false;
    }
    pending.add(key);
    return true;
  });
  if (reused && !opts["dry-run"]) saveIndex(index);
  if (reused || waiting) {
    log(`${reused} document(s) identique(s) à un cours déjà reformulé : ${opts["dry-run"] ? "seraient réutilisés" : `${copies} cours réutilisé(s) sans appel au modèle`}${waiting ? ` ; ${waiting} doublon(s) attendront la reformulation de leur jumeau` : ""}`);
  }
}

const max = Number(opts.max || 0);
if (max > 0) sources = sources.slice(0, max);

log(`${sources.length} document(s) à reformuler (${already.length} déjà fait(s), ${tooShort.length} trop court(s) ignoré(s))`);
if (!sources.length) process.exit(0);

// ---------- prompt ----------

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

Réponds uniquement par le cours en Markdown, sans préambule ni commentaire.`;

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
  if (!quizzes && text.split(/\s+/).length > 1500) problems.push("aucun « Testez-vous » dans un cours long");

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
  const ratio = entry.type === "SUMMARY" ? 0.25 : 0.45;
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

function runClaudeCli(prompt) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  if (!fs.existsSync(SYSTEM_FILE) || fs.readFileSync(SYSTEM_FILE, "utf8") !== SYSTEM) fs.writeFileSync(SYSTEM_FILE, SYSTEM);
  const args = [
    "-p",
    // stream-json lists every assistant message: a course longer than one message is rebuilt from all of them.
    "--output-format", "stream-json",
    "--verbose",
    "--system-prompt-file", JSON.stringify(SYSTEM_FILE),
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

  if (opts.engine === "cli") {
    const json = await runClaudeCli(userMessage(entry, source));
    const cost = json.total_cost_usd || 0;
    totalCost += cost;
    if (json.stop_reason === "max_tokens") throw new Error("sortie tronquée (max_tokens)");
    const text = cleanOutput(String(json.result || ""));
    if (text.length < 400 && /usage limit|limit reached|rate limit|overloaded/i.test(text)) {
      throw Object.assign(new Error(`limite d'utilisation : ${text.slice(0, 160)}`), { cli: json });
    }
    if (!/^#\s+\S/.test(text)) throw new Error(`la sortie ne commence pas par un titre : ${text.slice(0, 120)}`);
    const bad = violations(text, names);
    if (bad.length) throw new Error(`contenu interdit : ${bad.join(", ")}`);
    const shape = structureProblems(text).concat(coverageProblems(text, source, entry));
    if (shape.length) throw new Error(`format non respecté : ${shape.join(" ; ")}`);
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
    messages: [{ role: "user", content: userMessage(entry, source) }],
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
  if (!/^#\s+\S/.test(text)) throw new Error("la sortie ne commence pas par un titre de chapitre");
  const bad = violations(text, names);
  if (bad.length) throw new Error(`contenu interdit : ${bad.join(", ")}`);
  const shape = structureProblems(text).concat(coverageProblems(text, source, entry));
  if (shape.length) throw new Error(`format non respecté : ${shape.join(" ; ")}`);
  return { text, cost, usage: u };
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
      if (err instanceof Anthropic.AuthenticationError) {
        log("✗ clé API invalide ou absente : définissez ANTHROPIC_API_KEY.");
        process.exit(1);
      }
      // Network down (no DNS, connection reset): not the course's fault. Wait, then try the same course again.
      if (/ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|Can't reach the API|fetch failed|socket hang up|network/i.test(err.message)) {
        log(`! réseau indisponible, nouvel essai dans 5 min : ${entry.title}`);
        queue.unshift(entry);
        failed--;
        await new Promise((r) => setTimeout(r, 5 * 60 * 1000));
        continue;
      }
      // Subscription usage limit: wait for the window to reset and carry on, without counting a failure.
      if (err.cli && /limit|quota|rate|overloaded/i.test(err.message) && !/log ?in|auth|credit/i.test(err.message)) {
        log(`! limite d'utilisation atteinte, reprise dans 15 min : ${err.message.slice(0, 160)}`);
        queue.unshift(entry);
        failed--;
        await new Promise((r) => setTimeout(r, 15 * 60 * 1000));
        continue;
      }
      if (err.cli && /credit|log ?in|auth/i.test(err.message)) {
        log(`✗ arrêt : ${err.message}`);
        log("  Relancez la même commande plus tard : les cours déjà produits sont conservés et ignorés.");
        queue.length = 0;
        continue;
      }
      if (err instanceof Anthropic.RateLimitError) {
        log(`! limite de débit atteinte, nouvel essai dans 30 s : ${entry.title}`);
        await new Promise((r) => setTimeout(r, 30000));
        queue.unshift(entry);
        failed--;
        continue;
      }
      log(`✗ ${entry.title} : ${err.message}`);
      entry.reformulateFailures = (entry.reformulateFailures || 0) + 1;
      // A scanned PDF stays unreadable: no second try.
      if (/^texte source illisible/.test(err.message)) entry.unreadable = true;
      saveIndex(index);
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));
if (opts["dry-run"]) {
  const words = sources.reduce((a, e) => a + (e.words || 0), 0);
  const est = sources.length * (0.02 + 0.05) + (words / 0.75 / 1e6) * PRICE.input;
  log(`Simulation : ${sources.length} document(s), ${words} mots source. Coût estimé ≈ ${est.toFixed(2)} $ (Opus 5.5, hors cache).`);
} else {
  log(`Terminé : ${ok} cours produit(s), ${failed} échec(s). Coût total ≈ ${totalCost.toFixed(2)} $.`);
}
process.exit(failed && !ok ? 1 : 0);
