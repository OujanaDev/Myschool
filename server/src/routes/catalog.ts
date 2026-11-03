import { Router } from "express";
import { z } from "zod";
import { prisma, wrap, isPremiumUser, requireAuth, parse } from "../lib.js";
import { contextOf, fold, rank, score, searchLessons, textMatch, tokenize } from "../search.js";
import { COMING_SOON, isComingSoon } from "../comingSoon.js";

// 423 for content of a cycle that is not open yet; admins keep access to review it.
const comingSoonFor = (req: { user?: { role: string } | null }, cycleSlug: string | undefined | null) => isComingSoon(cycleSlug) && req.user?.role !== "ADMIN";

const r = Router();

// Cycles + levels
r.get(
  "/cycles",
  wrap(async (_req, res) => {
    const cycles = await prisma.cycle.findMany({
      orderBy: { order: "asc" },
      include: { levels: { orderBy: { order: "asc" }, include: { _count: { select: { subjects: true } } } } },
    });
    res.json(cycles.map((c) => ({ ...c, comingSoon: isComingSoon(c.slug) })));
  })
);

r.get(
  "/subjects",
  wrap(async (_req, res) => {
    res.json(await prisma.subject.findMany({ orderBy: { name: "asc" } }));
  })
);

// Level page: subjects with counts
r.get(
  "/levels/:slug",
  wrap(async (req, res) => {
    const level = await prisma.level.findUnique({
      where: { slug: req.params.slug },
      include: {
        cycle: true,
        subjects: {
          orderBy: { order: "asc" },
          include: {
            subject: true,
            chapters: { include: { _count: { select: { lessons: true, quizzes: true } } } },
          },
        },
      },
    });
    if (!level) return res.status(404).json({ error: "Niveau introuvable" });
    if (comingSoonFor(req, level.cycle.slug)) return res.status(423).json({ error: COMING_SOON, comingSoon: true });
    res.json({
      ...level,
      subjects: level.subjects.map((ls) => ({
        id: ls.id,
        subject: ls.subject,
        chapters: ls.chapters.length,
        lessons: ls.chapters.reduce((a, c) => a + c._count.lessons, 0),
        quizzes: ls.chapters.reduce((a, c) => a + c._count.quizzes, 0),
      })),
    });
  })
);

// Subject page inside a level: chapters with lessons and quizzes
r.get(
  "/levels/:slug/subjects/:subjectSlug",
  wrap(async (req, res) => {
    const level = await prisma.level.findUnique({ where: { slug: req.params.slug }, include: { cycle: true } });
    const subject = await prisma.subject.findUnique({ where: { slug: req.params.subjectSlug } });
    if (!level || !subject) return res.status(404).json({ error: "Introuvable" });
    if (comingSoonFor(req, level.cycle.slug)) return res.status(423).json({ error: COMING_SOON, comingSoon: true });
    const ls = await prisma.levelSubject.findUnique({
      where: { levelId_subjectId: { levelId: level.id, subjectId: subject.id } },
      include: {
        chapters: {
          orderBy: [{ semester: "asc" }, { order: "asc" }],
          include: {
            lessons: {
              where: { isPublished: true },
              orderBy: { order: "asc" },
              select: { id: true, title: true, type: true, isPremium: true, durationMin: true, views: true },
            },
            quizzes: {
              where: { isPublished: true },
              orderBy: { order: "asc" },
              select: { id: true, title: true, isPremium: true, durationMin: true, _count: { select: { questions: true } } },
            },
          },
        },
      },
    });
    if (!ls) return res.status(404).json({ error: "Matière non disponible pour ce niveau" });
    let completed: string[] = [];
    if (req.user) {
      const p = await prisma.progress.findMany({ where: { userId: req.user.id }, select: { lessonId: true } });
      completed = p.map((x) => x.lessonId);
    }
    res.json({ level, subject, chapters: ls.chapters, completed });
  })
);

// Lesson detail (premium gate)
r.get(
  "/lessons/:id",
  wrap(async (req, res) => {
    const lesson = await prisma.lesson.findUnique({
      where: { id: req.params.id },
      include: {
        chapter: {
          include: {
            levelSubject: { include: { level: { include: { cycle: true } }, subject: true } },
            lessons: {
              where: { isPublished: true },
              orderBy: { order: "asc" },
              select: { id: true, title: true, type: true, isPremium: true },
            },
            quizzes: { where: { isPublished: true }, select: { id: true, title: true, isPremium: true } },
          },
        },
      },
    });
    if (lesson && comingSoonFor(req, lesson.chapter.levelSubject.level.cycle.slug)) return res.status(423).json({ error: COMING_SOON, comingSoon: true });
    if (!lesson || (!lesson.isPublished && req.user?.role !== "ADMIN"))
      return res.status(404).json({ error: "Cours introuvable" });
    const premium = await isPremiumUser(req.user?.id);
    const locked = lesson.isPremium && !premium;
    await prisma.lesson.update({ where: { id: lesson.id }, data: { views: { increment: 1 } } });
    let completed = false;
    let bookmarked = false;
    if (req.user) {
      completed = !!(await prisma.progress.findUnique({
        where: { userId_lessonId: { userId: req.user.id, lessonId: lesson.id } },
      }));
      bookmarked = !!(await prisma.bookmark.findUnique({
        where: { userId_lessonId: { userId: req.user.id, lessonId: lesson.id } },
      }));
    }
    res.json({
      ...lesson,
      locked,
      completed,
      bookmarked,
      content: locked ? lesson.content.slice(0, 400) + "\n\n..." : lesson.content,
      videoUrl: locked ? "" : lesson.videoUrl,
      fileUrl: locked ? "" : lesson.fileUrl,
    });
  })
);

// Quiz (questions without answers)
r.get(
  "/quizzes/:id",
  wrap(async (req, res) => {
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id },
      include: {
        chapter: { include: { levelSubject: { include: { level: { include: { cycle: true } }, subject: true } } } },
        questions: {
          orderBy: { order: "asc" },
          include: { options: { orderBy: { order: "asc" }, select: { id: true, text: true } } },
        },
      },
    });
    if (!quiz || (!quiz.isPublished && req.user?.role !== "ADMIN"))
      return res.status(404).json({ error: "QCM introuvable" });
    if (comingSoonFor(req, quiz.chapter.levelSubject.level.cycle.slug)) return res.status(423).json({ error: COMING_SOON, comingSoon: true });
    const premium = await isPremiumUser(req.user?.id);
    const locked = quiz.isPremium && !premium;
    res.json({ ...quiz, locked, questions: locked ? [] : quiz.questions });
  })
);

r.post(
  "/quizzes/:id/attempts",
  requireAuth,
  wrap(async (req, res) => {
    const body = parse(z.object({ answers: z.record(z.string()) }), req.body);
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id },
      include: { questions: { include: { options: true }, orderBy: { order: "asc" } } },
    });
    if (!quiz) return res.status(404).json({ error: "QCM introuvable" });
    if (quiz.isPremium && !(await isPremiumUser(req.user!.id)))
      return res.status(402).json({ error: "Ce QCM est réservé aux membres Premium" });
    let score = 0;
    const review = quiz.questions.map((q) => {
      const correct = q.options.find((o) => o.isCorrect);
      const chosen = body.answers[q.id];
      const ok = !!correct && chosen === correct.id;
      if (ok) score++;
      return { questionId: q.id, chosen, correctOptionId: correct?.id, correct: ok, explanation: q.explanation };
    });
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: req.user!.id,
        quizId: quiz.id,
        score,
        total: quiz.questions.length,
        answers: JSON.stringify(body.answers),
      },
    });
    res.status(201).json({ attempt, review });
  })
);

// Home page: live counts, the richest chapters of each cycle, the concours levels and one free QCM to try.
// Cached in memory: all of it changes only when content is published.
let homeCache: { at: number; data: unknown } | null = null;
const HOME_TTL = 10 * 60 * 1000;
r.get(
  "/home",
  wrap(async (_req, res) => {
    if (homeCache && Date.now() - homeCache.at < HOME_TTL) return res.json(homeCache.data);
    const published = { isPublished: true };
    const [levels, subjects, lessons, quizzes, questions, cycles, chapters, chapterStats, concours, demoQuiz] = await Promise.all([
      prisma.level.count(),
      prisma.subject.count(),
      prisma.lesson.count({ where: published }),
      prisma.quiz.count({ where: published }),
      prisma.question.count({ where: { quiz: published } }),
      prisma.cycle.findMany({ orderBy: { order: "asc" }, include: { _count: { select: { levels: true } } } }),
      prisma.chapter.findMany({
        select: {
          id: true,
          title: true,
          order: true,
          levelSubject: { select: { level: { include: { cycle: { select: { slug: true } } } }, subject: true } },
          _count: { select: { quizzes: { where: published } } },
        },
      }),
      // The written size of a chapter tells a real course from the seed's placeholder lessons.
      prisma.$queryRaw<{ chapterId: string; lessons: number | bigint; minutes: number | bigint; chars: number | bigint }[]>`
        SELECT chapterId, COUNT(*) AS lessons, SUM(durationMin) AS minutes, SUM(LENGTH(content)) AS chars
        FROM Lesson WHERE isPublished = 1 GROUP BY chapterId`,
      prisma.level.findMany({
        where: { slug: { startsWith: "concours-" } },
        orderBy: { order: "asc" },
        include: { subjects: { orderBy: { order: "asc" }, select: { subject: { select: { name: true } } } } },
      }),
      prisma.quiz.findFirst({
        where: { ...published, isPremium: false, questions: { some: {} }, chapter: { levelSubject: { level: { cycle: { slug: "lycee" } } } } },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          chapter: { select: { levelSubject: { select: { level: { select: { name: true } }, subject: { select: { name: true } } } } } },
          questions: {
            orderBy: { order: "asc" },
            take: 5,
            select: { id: true, text: true, explanation: true, options: { orderBy: { order: "asc" }, select: { id: true, text: true, isCorrect: true } } },
          },
        },
      }),
    ]);

    // Three chapters per cycle, the most written ones, spread over different subjects when possible.
    const statsOf = new Map(chapterStats.map((s) => [s.chapterId, { lessons: Number(s.lessons), minutes: Number(s.minutes), chars: Number(s.chars) }]));
    const byCycle = new Map<string, typeof chapters>();
    for (const c of chapters) {
      // A seed placeholder chapter weighs ~2 000 characters; a written course starts well above that.
      if ((statsOf.get(c.id)?.chars ?? 0) < 5000) continue;
      const slug = c.levelSubject.level.cycle.slug;
      byCycle.set(slug, [...(byCycle.get(slug) ?? []), c]);
    }
    const weight = (c: (typeof chapters)[number]) => statsOf.get(c.id)!.chars;
    const byWeight = (a: (typeof chapters)[number], b: (typeof chapters)[number]) => weight(b) - weight(a) || a.order - b.order;
    const picked = cycles.flatMap((cy) => {
      const sorted = (byCycle.get(cy.slug) ?? []).sort(byWeight);
      const chosen: typeof chapters = [];
      for (const c of sorted) if (chosen.length < 3 && !chosen.some((x) => x.levelSubject.subject.id === c.levelSubject.subject.id)) chosen.push(c);
      for (const c of sorted) if (chosen.length < 3 && !chosen.includes(c)) chosen.push(c);
      return chosen;
    });
    // Twelve cards in all: the cycles without written content leave room for more of the others, one chapter per level and subject.
    const rest = [...byCycle.values()].flat().filter((c) => !picked.includes(c)).sort(byWeight);
    for (const c of rest) {
      if (picked.length >= 12) break;
      const seen = picked.some((x) => x.title === c.title || (x.levelSubject.level.id === c.levelSubject.level.id && x.levelSubject.subject.id === c.levelSubject.subject.id));
      if (!seen) picked.push(c);
    }
    for (const c of rest) if (picked.length < 12 && !picked.includes(c)) picked.push(c);
    // The hero's lesson card: the first free course of the most written lycée science chapter.
    const lycee = picked.filter((c) => c.levelSubject.level.cycle.slug === "lycee");
    const lead = lycee.find((c) => /math|physique|chimie|vie et de la terre/i.test(c.levelSubject.subject.name)) ?? lycee[0] ?? picked[0];
    const spotlight = lead
      ? await prisma.lesson.findFirst({
          where: { ...published, type: "COURSE", isPremium: false, chapterId: lead.id },
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            durationMin: true,
            content: true,
            videoUrl: true,
            chapter: { select: { title: true, levelSubject: { select: { level: true, subject: true } } } },
          },
        })
      : null;
    // One line of the lesson's own mathematics for the card: the first short formula, display math preferred.
    const formulaOf = (md: string) => {
      const display = md.match(/\$\$\s*([^$\n]{3,60}?)\s*\$\$/);
      const inline = md.match(/(?<![\\$])\$([^$\n]{3,40}?)\$/);
      const f = display?.[1] ?? inline?.[1];
      return f ? `$${f}$` : null;
    };

    const data = {
      stats: { levels, subjects, lessons, quizzes, questions },
      cycles: cycles.map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, levels: c._count.levels, comingSoon: isComingSoon(c.slug) })),
      spotlight: spotlight && {
        id: spotlight.id,
        title: spotlight.title,
        durationMin: spotlight.durationMin,
        formula: formulaOf(spotlight.content),
        hasVideo: !!spotlight.videoUrl,
        chapter: spotlight.chapter.title,
        subject: spotlight.chapter.levelSubject.subject,
        level: spotlight.chapter.levelSubject.level,
      },
      featured: picked.map((c) => ({
        id: c.id,
        title: c.title,
        cycle: c.levelSubject.level.cycle.slug,
        lessons: statsOf.get(c.id)?.lessons ?? 0,
        quizzes: c._count.quizzes,
        minutes: statsOf.get(c.id)?.minutes ?? 0,
        subject: c.levelSubject.subject,
        level: c.levelSubject.level,
      })),
      concours: concours.map((l) => ({ ...l, subjects: l.subjects.map((s) => s.subject.name) })),
      demoQuiz: demoQuiz && {
        id: demoQuiz.id,
        title: demoQuiz.title,
        subject: demoQuiz.chapter.levelSubject.subject.name,
        level: demoQuiz.chapter.levelSubject.level.name,
        questions: demoQuiz.questions,
      },
    };
    homeCache = { at: Date.now(), data };
    res.json(data);
  })
);

// Search (see ../search.ts)
r.get(
  "/search",
  wrap(async (req, res) => {
    const q = String(req.query.q || "").trim();
    const levelSlug = String(req.query.level || "");
    const tokens = tokenize(q);
    const phrase = fold(q);
    if (phrase.length < 2 || tokens.length === 0)
      return res.json({ lessons: [], quizzes: [], chapters: [], subjects: [], levels: [] });

    const levelFilter = levelSlug ? { levelSubject: { level: { slug: levelSlug } } } : {};
    const [lessons, quizzes, chapters, levels, subjects] = await Promise.all([
      searchLessons(tokens, phrase, levelSlug),
      prisma.quiz.findMany({
        where: { isPublished: true, chapter: levelFilter },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          isPremium: true,
          chapter: { select: { title: true, levelSubject: { select: { level: true, subject: true } } } },
          _count: { select: { questions: true } },
        },
      }),
      prisma.chapter.findMany({
        where: levelFilter,
        orderBy: [{ semester: "asc" }, { order: "asc" }],
        select: {
          id: true,
          title: true,
          semester: true,
          levelSubject: { select: { level: true, subject: true } },
          _count: { select: { lessons: true, quizzes: true } },
        },
      }),
      prisma.level.findMany({ include: { cycle: true }, orderBy: { order: "asc" } }),
      prisma.subject.findMany({ orderBy: { name: "asc" } }),
    ]);

    res.json({
      lessons,
      quizzes: rank(
        quizzes,
        (x) => score(tokens, phrase, { title: x.title, context: contextOf(x.chapter.levelSubject, x.chapter.title), content: textMatch(x.description, tokens, phrase) }),
        15
      ).map((x) => ({
        id: x.id,
        title: x.title,
        isPremium: x.isPremium,
        questions: x._count.questions,
        chapter: x.chapter.title,
        level: x.chapter.levelSubject.level,
        subject: x.chapter.levelSubject.subject,
      })),
      // Chapters: only when the chapter title itself matches (scores 0-2).
      chapters: rank(
        chapters,
        (c) => {
          const s = score(tokens, phrase, { title: c.title, context: contextOf(c.levelSubject, "") });
          return s === null || s > 2 ? null : s;
        },
        12
      ).map((c) => ({
        id: c.id,
        title: c.title,
        semester: c.semester,
        lessons: c._count.lessons,
        quizzes: c._count.quizzes,
        level: c.levelSubject.level,
        subject: c.levelSubject.subject,
      })),
      levels: rank(levels, (lv) => score(tokens, phrase, { title: lv.name, context: [lv.shortName, lv.track, lv.cycle.name].join(" ") }), 8),
      subjects: rank(subjects, (s) => score(tokens, phrase, { title: s.name, context: "" }), 8),
    });
  })
);

export default r;
