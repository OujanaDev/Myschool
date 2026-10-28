import { prisma } from "./lib.js";

// Search helpers. Accent- and case-insensitive, multi-word, ranked: title matches first, then chapter / subject /
// level, then content. Lesson contents are folded once into LessonSearch (refreshed when a lesson is written through
// the API, completed at startup) instead of being read and folded on every query.

export const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const tokenize = (q: string) => Array.from(new Set(fold(q).split(" ").filter((t) => t.length >= 2))).slice(0, 8);

// Lower score = better. Returns null when there is no match. `content` tells, when known, whether the folded
// content holds the whole phrase and which tokens it holds.
export function score(
  tokens: string[],
  phrase: string,
  fields: { title: string; context: string; content?: { phrase: boolean; tokens: Set<string> } }
) {
  const title = fold(fields.title);
  const context = fold(fields.context);
  if (title.startsWith(phrase)) return 0;
  if (title.includes(phrase)) return 1;
  if (tokens.every((t) => title.includes(t))) return 2;
  const titleAndContext = title + " " + context;
  if (tokens.every((t) => titleAndContext.includes(t))) return 3;
  if (fields.content) {
    if (fields.content.phrase) return 4;
    if (tokens.every((t) => fields.content!.tokens.has(t) || titleAndContext.includes(t))) return 5;
  }
  return null;
}

/** Which of the query words (and whether the whole phrase) a short text holds, for score(). */
export function textMatch(text: string, tokens: string[], phrase: string) {
  const folded = fold(text);
  return { phrase: folded.includes(phrase), tokens: new Set(tokens.filter((t) => folded.includes(t))) };
}

type LevelSubjectRef = { level: { name: string; shortName: string; track: string }; subject: { name: string } };
export const contextOf = (ls: LevelSubjectRef, chapter: string) =>
  [chapter, ls.subject.name, ls.level.name, ls.level.shortName, ls.level.track].join(" ");

export function rank<T>(items: T[], getScore: (item: T) => number | null, take: number): T[] {
  return items
    .map((item, index) => ({ item, index, s: getScore(item) }))
    .filter((x): x is { item: T; index: number; s: number } => x.s !== null)
    .sort((a, b) => a.s - b.s || a.index - b.index)
    .slice(0, take)
    .map((x) => x.item);
}

/** (Re)builds the search row of one lesson; call it after every create or update of a lesson. */
export async function indexLesson(id: string) {
  const l = await prisma.lesson.findUnique({
    where: { id },
    select: { id: true, chapterId: true, title: true, type: true, isPremium: true, isPublished: true, order: true, content: true },
  });
  if (!l) return;
  const { id: lessonId, content, ...fields } = l;
  const row = { ...fields, text: fold(content) };
  await prisma.lessonSearch.upsert({ where: { lessonId }, create: { lessonId, ...row }, update: row });
}

/** Indexes the lessons that have no search row yet (created by the seed or before the index existed). */
export async function ensureSearchIndex() {
  const missing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM Lesson WHERE id NOT IN (SELECT lessonId FROM LessonSearch)`
  );
  for (const { id } of missing) await indexLesson(id);
  if (missing.length) console.log(`Index de recherche : ${missing.length} leçon(s) indexée(s).`);
}

const LESSON_RESULTS = 30;

/**
 * Published lessons matching the query, best first. Titles and chapter / subject / level are scored first; the
 * contents are only scanned (one SQL pass over the folded texts) when those matches do not fill the results.
 */
export async function searchLessons(tokens: string[], phrase: string, levelSlug: string) {
  const [rows, chapters] = await Promise.all([
    prisma.lessonSearch.findMany({
      where: { isPublished: true },
      orderBy: { order: "asc" },
      select: { lessonId: true, chapterId: true, title: true, type: true, isPremium: true },
    }),
    prisma.chapter.findMany({
      where: levelSlug ? { levelSubject: { level: { slug: levelSlug } } } : {},
      select: { id: true, title: true, levelSubject: { select: { level: true, subject: true } } },
    }),
  ]);
  const chapterById = new Map(chapters.map((c) => [c.id, c]));
  const lessons = rows.flatMap((l) => {
    const chapter = chapterById.get(l.chapterId);
    return chapter ? [{ ...l, chapter, context: contextOf(chapter.levelSubject, chapter.title) }] : [];
  });

  let found = rank(lessons, (l) => score(tokens, phrase, { title: l.title, context: l.context }), LESSON_RESULTS);
  if (found.length < LESSON_RESULTS) {
    const needles = [phrase, ...tokens];
    const flags = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT lessonId, ${needles.map((_, i) => `instr(text, ?) > 0 AS f${i}`).join(", ")}
       FROM LessonSearch WHERE isPublished = 1 AND (${needles.map(() => "instr(text, ?) > 0").join(" OR ")})`,
      ...needles,
      ...needles
    );
    const content = new Map(
      flags.map((f) => [
        f.lessonId as string,
        { phrase: Number(f.f0) === 1, tokens: new Set(tokens.filter((_, i) => Number(f[`f${i + 1}`]) === 1)) },
      ])
    );
    found = rank(
      lessons,
      (l) => score(tokens, phrase, { title: l.title, context: l.context, content: content.get(l.lessonId) }),
      LESSON_RESULTS
    );
  }
  return found.map((l) => ({
    id: l.lessonId,
    title: l.title,
    type: l.type,
    isPremium: l.isPremium,
    chapter: l.chapter.title,
    level: l.chapter.levelSubject.level,
    subject: l.chapter.levelSubject.subject,
  }));
}
