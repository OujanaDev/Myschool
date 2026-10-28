import { Router } from "express";
import { z } from "zod";
import { prisma, wrap, isPremiumUser, requireAuth, parse } from "../lib.js";
import { contextOf, fold, rank, score, searchLessons, textMatch, tokenize } from "../search.js";

const r = Router();

// Cycles + levels
r.get(
  "/cycles",
  wrap(async (_req, res) => {
    const cycles = await prisma.cycle.findMany({
      orderBy: { order: "asc" },
      include: { levels: { orderBy: { order: "asc" }, include: { _count: { select: { subjects: true } } } } },
    });
    res.json(cycles);
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
        chapter: { include: { levelSubject: { include: { level: true, subject: true } } } },
        questions: {
          orderBy: { order: "asc" },
          include: { options: { orderBy: { order: "asc" }, select: { id: true, text: true } } },
        },
      },
    });
    if (!quiz || (!quiz.isPublished && req.user?.role !== "ADMIN"))
      return res.status(404).json({ error: "QCM introuvable" });
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
