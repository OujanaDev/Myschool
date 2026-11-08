#!/usr/bin/env node
/**
 * Tidies the chapters of the platform after the imports:
 *  1. Merges the chapters of one level / subject that are the same chapter written differently (chapterKey:
 *     "Arithmétique dans N" from the curriculum and "Arithmétique dans IN" created by an import). The curriculum
 *     chapter (the first in order) is kept; the other one's lessons and QCM move into it, then the empty chapter is
 *     deleted. import.mjs uses the same key, so no new duplicate is created.
 *  2. Deletes the placeholder lessons of the seed ("Cours : …", "Série d'exercices : …", "Résumé du
 *     chapitre : …", generic text "en cours de rédaction") in every chapter that has real published lessons;
 *     a chapter with placeholders only keeps them until its real lessons arrive.
 *
 *   node src/clean-chapters.mjs [--apply] [--password ...]      (without --apply: shows what would change)
 */
import { parseArgs } from "node:util";
import { askClaude, parseJson } from "./claude-cli.mjs";
import { chapterKey, log } from "./util.mjs";

const { values: opts } = parseArgs({
  options: {
    api: { type: "string", default: process.env.MYSCHOOL_API || "http://localhost:4000/api" },
    email: { type: "string", default: process.env.MYSCHOOL_ADMIN_EMAIL || "admin@myschool.ma" },
    password: { type: "string", default: process.env.MYSCHOOL_ADMIN_PASSWORD || "" },
    apply: { type: "boolean", default: false },
    // 3. (--map) A curriculum chapter still empty whose topic is covered by chapters created by the imports under
    //    another name ("Techniques d'exploration du milieu" / "Les techniques adaptatives à l'étude écologique sur
    //    le terrain"): the model pairs them. One imported chapter takes the empty one's place as in 1b; several
    //    (they are the official chapters themselves) make the approximate empty chapter redundant: it is deleted.
    //    Only for the levels of --level (slugs, comma-separated). One model call per subject, even without --apply.
    map: { type: "boolean", default: false },
    level: { type: "string", default: "" },
    model: { type: "string", default: "sonnet" },
  },
});
const mapLevels = new Set(opts.level.split(",").map((s) => s.trim()).filter(Boolean));
if (!opts.password) {
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
  if (!res.ok) throw new Error(`${method} ${route} → ${res.status} ${data.error || ""}`);
  return data;
}

/** Placeholder written by server/prisma/seed.ts (genericLessons) for chapters without detailed content. */
const isPlaceholder = (lesson) =>
  /Ce cours est en cours de rédaction par l'équipe pédagogique de Myschool|\*Corrigé détaillé disponible prochainement\.\*|\*Contenu premium en cours de rédaction\.\*/.test(
    lesson.content || ""
  );

const PAIR_SYSTEM = `Tu es un professeur marocain qui connaît les programmes officiels du lycée. On te donne, pour une matière et un niveau, la liste A des chapitres du programme encore vides et la liste B des chapitres importés (avec les titres de leurs cours). Tu indiques quels chapitres de B traitent le sujet d'un chapitre de A.

Réponds uniquement par un objet JSON, sans commentaire : {"<numéro A>": [<numéros B>, ...], ...}

Règles : un chapitre de B figure au plus une fois ; ne rattache un chapitre de B que si son sujet est bien celui du chapitre de A (même notion du programme, éventuellement une partie de celle-ci ou formulée autrement) ; un chapitre de A sans correspondance est omis ; un chapitre de B général (« Le programme pédagogique », « Fiches pédagogiques », examens, révisions) n'est rattaché à rien.`;

const GENERIC_CHAPTER = /^\s*(units?|lessons?|grammar|writing|functions?|summaries|vocabulary|reading|exercices?|cours|résumés?)\s*$/i;

/** Asks the model which imported chapters (reals) cover each empty curriculum chapter: Map<empty, real[]>. */
async function pairChapters(where, empties, reals) {
  const titles = (c) => c.lessons.filter((l) => l.isPublished && !isPlaceholder(l) && l.type === "COURSE").slice(0, 4).map((l) => l.title.replace(/\s*[—–-]\s*cours \d+.*$/i, ""));
  const prompt =
    `${where}\n\nA. Chapitres du programme encore vides :\n${empties.map((c, i) => `A${i + 1}. ${c.title}`).join("\n")}\n\n` +
    `B. Chapitres importés :\n${reals.map((c, i) => `B${i + 1}. ${c.title} (${c.lessons.length} cours : ${titles(c).join(" ; ")})`).join("\n")}`;
  const pairs = new Map();
  try {
    const { text, cost } = await askClaude(PAIR_SYSTEM, prompt, { model: opts.model, timeoutMin: 5 });
    const used = new Set();
    for (const [a, bs] of Object.entries(parseJson(text))) {
      const empty = empties[Number(String(a).replace(/\D/g, "")) - 1];
      if (!empty || !Array.isArray(bs)) continue;
      const found = bs.map((b) => reals[Number(String(b).replace(/\D/g, "")) - 1]).filter((c) => c && !used.has(c));
      found.forEach((c) => used.add(c));
      if (found.length) pairs.set(empty, found);
    }
    log(`${where} : ${pairs.size} chapitre(s) vide(s) sur ${empties.length} rattaché(s) (${cost.toFixed(2)} $)`);
  } catch (e) {
    log(`✗ ${where} : rattachement impossible : ${e.message}`);
  }
  return pairs;
}

token = (await api("POST", "/auth/login", { email: opts.email, password: opts.password })).token;
const levels = await api("GET", "/admin/levels");
const mode = opts.apply ? "" : "(simulation) ";
let merged = 0;
let moved = 0;
let hidden = 0;
let placeholderOnly = 0;

for (const level of levels) {
  for (const ls of level.subjects) {
    const detail = await api("GET", `/admin/level-subjects/${ls.id}`);
    const chapters = [...detail.chapters].sort((a, b) => a.order - b.order);
    const where = `${level.shortName || level.name} / ${ls.subject.name}`;

    // 1. Duplicates: the first chapter of a key keeps everything.
    const byKey = new Map();
    for (const chapter of chapters) {
      const key = chapterKey(chapter.title);
      if (!key) continue;
      const kept = byKey.get(key);
      if (!kept) {
        byKey.set(key, chapter);
        continue;
      }
      log(`${mode}= ${where} : « ${chapter.title} » (${chapter.lessons.length} cours, ${chapter.quizzes.length} QCM) → « ${kept.title} »`);
      let order = Math.max(-1, ...kept.lessons.map((l) => l.order)) + 1;
      let quizOrder = Math.max(-1, ...kept.quizzes.map((q) => q.order)) + 1;
      for (const lesson of chapter.lessons) {
        if (opts.apply) await api("PUT", `/admin/lessons/${lesson.id}`, { chapterId: kept.id, order: order++ });
        kept.lessons.push({ ...lesson, chapterId: kept.id });
        moved++;
      }
      for (const quiz of chapter.quizzes) {
        if (opts.apply) await api("PUT", `/admin/quizzes/${quiz.id}`, { chapterId: kept.id, order: quizOrder++ });
        kept.quizzes.push(quiz);
      }
      if (opts.apply) {
        const left = (await api("GET", `/admin/level-subjects/${ls.id}`)).chapters.find((c) => c.id === chapter.id);
        if (left && !left.lessons.length && !left.quizzes.length) await api("DELETE", `/admin/chapters/${chapter.id}`);
        else log(`  ! « ${chapter.title} » n'est pas vide, conservé`);
      }
      merged++;
    }

    // 1b. A curriculum chapter with placeholders only, whose words all appear in the title of exactly one chapter
    // with real lessons ("Chute libre verticale" / "Chute libre verticale d'un solide"): the real chapter takes its
    // place in the curriculum (order, semester) and keeps its own title, which later imports look for; the
    // placeholders follow it, unpublished below, and the emptied chapter is deleted.
    const words = (c) => new Set(chapterKey(c.title).split(" ").filter(Boolean));
    const hasReal = (c) => c.lessons.some((l) => l.isPublished && !isPlaceholder(l));
    for (const empty of [...byKey.values()]) {
      if (hasReal(empty) || !empty.lessons.length || empty.quizzes.length) continue;
      const need = words(empty);
      const targets = [...byKey.values()].filter((c) => c !== empty && hasReal(c) && [...need].every((w) => words(c).has(w)));
      if (targets.length !== 1) continue;
      const [real] = targets;
      log(`${mode}≈ ${where} : « ${real.title} » prend la place de « ${empty.title} » (leçons de départ seulement)`);
      let order = Math.max(-1, ...real.lessons.map((l) => l.order)) + 1;
      for (const lesson of empty.lessons) {
        if (opts.apply) await api("PUT", `/admin/lessons/${lesson.id}`, { chapterId: real.id, order: order++ });
        real.lessons.push({ ...lesson, chapterId: real.id });
      }
      if (opts.apply) {
        await api("PUT", `/admin/chapters/${real.id}`, { order: empty.order, semester: empty.semester });
        const left = (await api("GET", `/admin/level-subjects/${ls.id}`)).chapters.find((c) => c.id === empty.id);
        if (left && !left.lessons.length && !left.quizzes.length) await api("DELETE", `/admin/chapters/${empty.id}`);
      }
      byKey.delete(chapterKey(empty.title));
      merged++;
    }

    // 1c. (--map) Empty curriculum chapters whose topic the imported chapters cover under another title.
    if (opts.map && mapLevels.has(level.slug)) {
      const empties = [...byKey.values()].filter((c) => !hasReal(c) && c.lessons.length);
      // Catch-all chapters of an import ("Units", "Lessons", "Grammar"…) cover every unit at once: they never take
      // the place of one precise chapter of the programme.
      const reals = [...byKey.values()].filter((c) => hasReal(c) && !GENERIC_CHAPTER.test(c.title));
      if (empties.length && reals.length) {
        const pairs = await pairChapters(where, empties, reals);
        for (const [empty, found] of pairs) {
          // Several imported chapters cover it: they already are the chapters of the official programme (AlloSchool
          // uses its titles), the approximate empty chapter is removed rather than swallowing them.
          if (found.length > 1) {
            log(`${mode}− ${where} : « ${empty.title} » supprimé, couvert par ${found.map((c) => `« ${c.title} »`).join(", ")}`);
            if (opts.apply) {
              let quizOrder = Math.max(-1, ...found[0].quizzes.map((q) => q.order)) + 1;
              for (const quiz of empty.quizzes) await api("PUT", `/admin/quizzes/${quiz.id}`, { chapterId: found[0].id, order: quizOrder++ });
              for (const lesson of empty.lessons) await api("DELETE", `/admin/lessons/${lesson.id}`).catch((err) => { if (!/404/.test(err.message)) throw err; });
              await api("DELETE", `/admin/chapters/${empty.id}`);
            }
            hidden += empty.lessons.length;
            byKey.delete(chapterKey(empty.title));
            merged++;
            continue;
          }
          // One imported chapter: as in 1b, it takes the empty chapter's place and keeps its own (official) title.
          const [real] = found;
          log(`${mode}≈ ${where} : « ${real.title} » (${real.lessons.length} cours) prend la place de « ${empty.title} »`);
          let order = Math.max(-1, ...real.lessons.map((l) => l.order)) + 1;
          let quizOrder = Math.max(-1, ...real.quizzes.map((q) => q.order)) + 1;
          for (const lesson of empty.lessons) {
            if (opts.apply) await api("PUT", `/admin/lessons/${lesson.id}`, { chapterId: real.id, order: order++ });
            real.lessons.push({ ...lesson, chapterId: real.id });
          }
          for (const quiz of empty.quizzes) {
            if (opts.apply) await api("PUT", `/admin/quizzes/${quiz.id}`, { chapterId: real.id, order: quizOrder++ });
            real.quizzes.push(quiz);
          }
          if (opts.apply) {
            await api("PUT", `/admin/chapters/${real.id}`, { order: empty.order, semester: empty.semester });
            const left = (await api("GET", `/admin/level-subjects/${ls.id}`)).chapters.find((c) => c.id === empty.id);
            if (left && !left.lessons.length && !left.quizzes.length) await api("DELETE", `/admin/chapters/${empty.id}`);
          }
          byKey.delete(chapterKey(empty.title));
          merged++;
        }
      }
    }

    // 2. Placeholders next to real lessons.
    for (const chapter of byKey.values()) {
      const real = chapter.lessons.filter((l) => l.isPublished && !isPlaceholder(l));
      const placeholders = chapter.lessons.filter(isPlaceholder);
      if (!placeholders.length) continue;
      if (!real.length) {
        placeholderOnly++;
        continue;
      }
      for (const lesson of placeholders) {
        if (opts.apply) await api("DELETE", `/admin/lessons/${lesson.id}`).catch((err) => { if (!/404/.test(err.message)) throw err; });
        hidden++;
      }
    }
  }
}

log(
  `${mode}Terminé : ${merged} chapitre(s) fusionné(s), ${moved} cours déplacé(s), ${hidden} leçon(s) de départ supprimée(s). ` +
    `${placeholderOnly} chapitre(s) n'ont encore que des leçons de départ (laissées en ligne).`
);
