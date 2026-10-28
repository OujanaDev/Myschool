#!/usr/bin/env node
/**
 * Ajoute un QCM « Tester mes connaissances » aux chapitres qui contiennent des cours reformulés et n'ont pas encore
 * de QCM. Claude rédige les questions à partir des cours du chapitre (4 propositions, une seule bonne réponse,
 * une explication), le script vérifie le QCM puis le crée via l'API d'administration (publié).
 *
 *   node src/qcm.mjs [--api http://localhost:4000/api] [--password ...] [--questions 12] [--max <n>] [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { askClaude, parseJson } from "./claude-cli.mjs";
import { ROOT, loadIndex, readCourse } from "./repository.mjs";
import { fold, log, singleInstance } from "./util.mjs";

const { values: opts } = parseArgs({
  options: {
    api: { type: "string", default: process.env.MYSCHOOL_API || "http://localhost:4000/api" },
    email: { type: "string", default: process.env.MYSCHOOL_ADMIN_EMAIL || "admin@myschool.ma" },
    password: { type: "string", default: process.env.MYSCHOOL_ADMIN_PASSWORD || "" },
    questions: { type: "string", default: "12" },
    max: { type: "string", default: "0" },
    model: { type: "string", default: "sonnet" },
    concurrency: { type: "string", default: "3" },
    "dry-run": { type: "boolean", default: false },
  },
});
if (!opts.password) {
  console.error("Mot de passe admin manquant : --password ... ou MYSCHOOL_ADMIN_PASSWORD.");
  process.exit(1);
}
const N = Math.max(5, Math.min(20, Number(opts.questions)));
if (!opts["dry-run"]) singleInstance("qcm");

let token = "";
async function api(method, route, body) {
  let res;
  // A kept-alive connection closed by the server fails at once: retry on a new connection.
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

const SYSTEM = `Tu es professeur et tu rédiges le QCM « Tester mes connaissances » d'un chapitre pour Myschool, une plateforme de cours marocaine (programmes officiels). À partir des cours fournis, écris exactement ${N} questions qui vérifient la compréhension des notions essentielles du chapitre : définitions, propriétés, méthodes, calculs courts, pièges classiques. Progression du plus simple au plus exigeant ; chaque question se résout en moins de deux minutes.

Règles :
- 4 propositions par question, exactement UNE correcte ; les mauvaises réponses sont plausibles (erreurs typiques d'élève), jamais absurdes ; la position de la bonne réponse varie.
- Chaque question a une explication de 1 à 3 phrases qui justifie la bonne réponse (et, si utile, pourquoi le piège est faux).
- Formules en LaTeX KaTeX entre $…$ (jamais $$). Pas d'image, pas de lien, pas de référence au « cours ci-dessus » ni à un exercice numéroté.
- Langue : celle des cours (un chapitre d'anglais peut avoir ses questions en anglais avec l'explication en français).
- Aucune mention de site, de professeur, de nom de personne réelle.

Réponds uniquement par un objet JSON :
{"title": "QCM : <chapitre>", "description": "<une phrase>", "questions": [{"text": "...", "explanation": "...", "options": [{"text": "...", "isCorrect": true}, {"text": "...", "isCorrect": false}, ...]}]}`;

const DISPLAY_MATH = /\$\$([\s\S]+?)\$\$/g;

/** A display formula has no place in a one-line question or option: $$…$$ becomes $…$. */
function inlineMath(text) {
  return String(text ?? "").replace(DISPLAY_MATH, (_m, tex) => "$" + tex.trim() + "$");
}

/** Comparison key of an option: text folded, formulas kept as written ($F'(x)=f(x)$ and $f'(x)=F(x)$ differ). */
const optionKey = (text) =>
  String(text)
    .split(/(\$[^$]*\$)/)
    .map((p, i) => (i % 2 ? p.replace(/\s+/g, "") : fold(p)))
    .join("");

/** Rejects a QCM that would not work as a test: wrong counts, several or no correct answers, duplicated options. */
function problems(q) {
  const out = [];
  if (!Array.isArray(q?.questions) || q.questions.length < Math.min(N, 8)) out.push(`${q?.questions?.length || 0} question(s)`);
  for (const [i, x] of (q?.questions || []).entries()) {
    const options = x.options || [];
    if (!String(x.text || "").trim()) out.push(`question ${i + 1} vide`);
    if (options.length !== 4) out.push(`question ${i + 1} : ${options.length} propositions`);
    if (options.filter((o) => o.isCorrect === true).length !== 1) out.push(`question ${i + 1} : pas exactement une bonne réponse`);
    if (new Set(options.map((o) => optionKey(o.text))).size !== options.length)
      out.push(`question ${i + 1} : propositions en double (${options.map((o) => o.text).join(" | ").slice(0, 200)})`);
  }
  return out;
}

// ---------- chapters without a quiz ----------

const login = await api("POST", "/auth/login", { email: opts.email, password: opts.password });
token = login.token;
const levels = await api("GET", "/admin/levels");
const index = loadIndex();
const finals = index.entries.filter((e) => e.sourceId && e.importedLessonId && e.file);
const byLesson = new Map(finals.map((e) => [e.importedLessonId, e]));

// Chapters whose QCM was refused on two runs in a row: skipped until they get new courses, so that a loop calling
// this script does not pay for the same failure every time.
const STATE = path.join(ROOT, ".qcm-state.json");
const failures = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : {};
const saveFailures = () => opts["dry-run"] || fs.writeFileSync(STATE, JSON.stringify(failures));

const targets = [];
let given = 0;
for (const level of levels) {
  for (const ls of level.subjects || []) {
    const detail = await api("GET", `/admin/level-subjects/${ls.id}`);
    for (const ch of detail.chapters || []) {
      if ((ch.quizzes || []).length) continue;
      const courses = (ch.lessons || []).map((l) => byLesson.get(l.id)).filter(Boolean);
      const f = failures[ch.id];
      if (f && f.runs >= 2 && f.courses === courses.length) {
        given++;
        continue;
      }
      if (courses.length) targets.push({ level, subject: ls.subject, chapter: ch, courses });
    }
  }
}
const max = Number(opts.max || 0);
const queue = max > 0 ? targets.slice(0, max) : targets;
log(`${targets.length} chapitre(s) sans QCM avec des cours reformulés${max ? `, ${queue.length} traité(s)` : ""}${given ? ` (${given} écarté(s) après 2 échecs)` : ""}`);

let made = 0;
let failed = 0;
let cost = 0;

async function makeQuiz(t) {
  // Course and summary texts first (they hold the notions), up to ~60 000 characters for the whole chapter.
  const rank = (e) => ({ COURSE: 0, SUMMARY: 1 })[e.type] ?? 2;
  const ordered = [...t.courses].sort((a, b) => rank(a) - rank(b));
  let material = "";
  for (const e of ordered) {
    const { body } = readCourse(e);
    const text = body.replace(/```svg[\s\S]*?```/g, "").trim();
    if (material.length + text.length > 60000) {
      material += `\n\n=== ${e.title} (extrait) ===\n${text.slice(0, Math.max(0, 60000 - material.length))}`;
      break;
    }
    material += `\n\n=== ${e.title} ===\n${text}`;
  }
  const prompt = `Niveau : ${t.level.name}\nMatière : ${t.subject.name}\nChapitre : ${t.chapter.title}\n\n=== COURS DU CHAPITRE ===${material}\n=== FIN DES COURS ===`;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const answer = await askClaude(SYSTEM, prompt, { model: opts.model });
    cost += answer.cost;
    let quiz;
    try {
      quiz = parseJson(answer.text);
    } catch {
      log(`  ! réponse illisible (essai ${attempt}) : ${t.chapter.title}`);
      continue;
    }
    for (const q of quiz.questions || []) {
      q.text = inlineMath(q.text);
      q.explanation = inlineMath(q.explanation);
      for (const o of q.options || []) o.text = inlineMath(o.text);
    }
    const bad = problems(quiz);
    if (bad.length) {
      log(`  ! QCM refusé (essai ${attempt}) : ${t.chapter.title} — ${bad.slice(0, 3).join(" ; ")}`);
      continue;
    }
    const body = {
      chapterId: t.chapter.id,
      title: String(quiz.title || `QCM : ${t.chapter.title}`).slice(0, 120),
      description: String(quiz.description || "").slice(0, 300),
      durationMin: Math.max(10, Math.round(quiz.questions.length * 1.5)),
      isPremium: false,
      isPublished: true,
      questions: quiz.questions.map((q) => ({
        text: String(q.text).trim(),
        explanation: String(q.explanation || "").trim(),
        options: q.options.map((o) => ({ text: String(o.text).trim(), isCorrect: o.isCorrect === true })),
      })),
    };
    if (opts["dry-run"]) {
      log(`~ (simulation) ${body.title} — ${body.questions.length} questions → ${t.level.shortName || t.level.name} / ${t.subject.name}`);
    } else {
      const created = await api("POST", "/admin/quizzes", body);
      log(`✓ ${body.title} — ${body.questions.length} questions (${created.id}) → ${t.level.shortName || t.level.name} / ${t.subject.name}`);
    }
    made++;
    if (failures[t.chapter.id]) {
      delete failures[t.chapter.id];
      saveFailures();
    }
    return;
  }
  failed++;
  const f = failures[t.chapter.id];
  failures[t.chapter.id] = { runs: (f?.courses === t.courses.length ? f.runs : 0) + 1, courses: t.courses.length };
  saveFailures();
  log(`✗ ${t.chapter.title} : pas de QCM valide après 2 essais`);
}

async function worker() {
  while (queue.length) {
    const t = queue.shift();
    try {
      await makeQuiz(t);
    } catch (err) {
      failed++;
      log(`✗ ${t.chapter.title} : ${err.message}`);
    }
  }
}
await Promise.all(Array.from({ length: Math.max(1, Number(opts.concurrency)) }, worker));
log(`Terminé : ${made} QCM créé(s), ${failed} échec(s). Coût ≈ ${cost.toFixed(2)} $.`);
