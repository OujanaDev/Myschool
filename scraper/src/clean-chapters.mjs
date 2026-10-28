#!/usr/bin/env node
/**
 * Tidies the chapters of the platform after the imports:
 *  1. Merges the chapters of one level / subject that are the same chapter written differently (chapterKey:
 *     "Arithmétique dans N" from the curriculum and "Arithmétique dans IN" created by an import). The curriculum
 *     chapter (the first in order) is kept; the other one's lessons and QCM move into it, then the empty chapter is
 *     deleted. import.mjs uses the same key, so no new duplicate is created.
 *  2. Unpublishes the placeholder lessons of the seed ("Cours : …", "Série d'exercices : …", "Résumé du
 *     chapitre : …", generic text "en cours de rédaction") in every chapter that has real published lessons.
 *     Nothing is deleted: a lesson can be published again from the admin.
 *
 *   node src/clean-chapters.mjs [--apply] [--password ...]      (without --apply: shows what would change)
 */
import { parseArgs } from "node:util";
import { chapterKey, log } from "./util.mjs";

const { values: opts } = parseArgs({
  options: {
    api: { type: "string", default: process.env.MYSCHOOL_API || "http://localhost:4000/api" },
    email: { type: "string", default: process.env.MYSCHOOL_ADMIN_EMAIL || "admin@myschool.ma" },
    password: { type: "string", default: process.env.MYSCHOOL_ADMIN_PASSWORD || "" },
    apply: { type: "boolean", default: false },
  },
});
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

    // 2. Placeholders next to real lessons.
    for (const chapter of byKey.values()) {
      const real = chapter.lessons.filter((l) => l.isPublished && !isPlaceholder(l));
      const placeholders = chapter.lessons.filter((l) => l.isPublished && isPlaceholder(l));
      if (!placeholders.length) continue;
      if (!real.length) {
        placeholderOnly++;
        continue;
      }
      for (const lesson of placeholders) {
        if (opts.apply) await api("PUT", `/admin/lessons/${lesson.id}`, { isPublished: false });
        hidden++;
      }
    }
  }
}

log(
  `${mode}Terminé : ${merged} chapitre(s) fusionné(s), ${moved} cours déplacé(s), ${hidden} leçon(s) de départ dépubliée(s). ` +
    `${placeholderOnly} chapitre(s) n'ont encore que des leçons de départ (laissées en ligne).`
);
