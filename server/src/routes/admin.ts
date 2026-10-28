import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma, wrap, requireAdmin, parse, slugify, publicUser } from "../lib.js";
import { indexLesson } from "../search.js";

const r = Router();
r.use(requireAdmin);

// ---------- Stats ----------
r.get(
  "/stats",
  wrap(async (_req, res) => {
    const [users, premium, levels, subjects, chapters, lessons, quizzes, questions, attempts] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { plan: "PREMIUM" } }),
      prisma.level.count(),
      prisma.subject.count(),
      prisma.chapter.count(),
      prisma.lesson.count(),
      prisma.quiz.count(),
      prisma.question.count(),
      prisma.quizAttempt.count(),
    ]);
    const topLessons = await prisma.lesson.findMany({
      orderBy: { views: "desc" },
      take: 5,
      include: { chapter: { include: { levelSubject: { include: { level: true, subject: true } } } } },
    });
    const recentUsers = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { level: true } });
    res.json({
      counts: { users, premium, levels, subjects, chapters, lessons, quizzes, questions, attempts },
      topLessons: topLessons.map((l) => ({
        id: l.id,
        title: l.title,
        views: l.views,
        level: l.chapter.levelSubject.level.name,
        subject: l.chapter.levelSubject.subject.name,
      })),
      recentUsers: recentUsers.map(publicUser),
    });
  })
);

// ---------- Cycles ----------
const cycleSchema = z.object({ name: z.string().min(2), description: z.string().optional(), order: z.number().int().optional() });
r.get("/cycles", wrap(async (_req, res) => res.json(await prisma.cycle.findMany({ orderBy: { order: "asc" }, include: { levels: { orderBy: { order: "asc" } } } }))));
r.post(
  "/cycles",
  wrap(async (req, res) => {
    const b = parse(cycleSchema, req.body);
    res.status(201).json(await prisma.cycle.create({ data: { ...b, slug: slugify(b.name) } }));
  })
);
r.put(
  "/cycles/:id",
  wrap(async (req, res) => {
    const b = parse(cycleSchema.partial(), req.body);
    res.json(await prisma.cycle.update({ where: { id: req.params.id }, data: b }));
  })
);
r.delete("/cycles/:id", wrap(async (req, res) => res.json(await prisma.cycle.delete({ where: { id: req.params.id } }))));

// ---------- Levels ----------
const levelSchema = z.object({
  cycleId: z.string(),
  name: z.string().min(2),
  shortName: z.string().optional(),
  track: z.string().optional(),
  description: z.string().optional(),
  order: z.number().int().optional(),
});
r.get(
  "/levels",
  wrap(async (_req, res) =>
    res.json(
      await prisma.level.findMany({
        orderBy: [{ cycle: { order: "asc" } }, { order: "asc" }],
        include: { cycle: true, subjects: { include: { subject: true }, orderBy: { order: "asc" } } },
      })
    )
  )
);
r.post(
  "/levels",
  wrap(async (req, res) => {
    const b = parse(levelSchema, req.body);
    let slug = slugify(b.name);
    if (await prisma.level.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    res.status(201).json(await prisma.level.create({ data: { ...b, slug } }));
  })
);
r.put(
  "/levels/:id",
  wrap(async (req, res) => {
    const b = parse(levelSchema.partial(), req.body);
    res.json(await prisma.level.update({ where: { id: req.params.id }, data: b }));
  })
);
r.delete("/levels/:id", wrap(async (req, res) => res.json(await prisma.level.delete({ where: { id: req.params.id } }))));

// Attach / detach a subject to a level
r.post(
  "/levels/:id/subjects",
  wrap(async (req, res) => {
    const b = parse(z.object({ subjectId: z.string(), order: z.number().int().optional() }), req.body);
    const count = await prisma.levelSubject.count({ where: { levelId: req.params.id } });
    const ls = await prisma.levelSubject.upsert({
      where: { levelId_subjectId: { levelId: req.params.id, subjectId: b.subjectId } },
      create: { levelId: req.params.id, subjectId: b.subjectId, order: b.order ?? count },
      update: { order: b.order ?? undefined },
      include: { subject: true },
    });
    res.status(201).json(ls);
  })
);
r.delete(
  "/level-subjects/:id",
  wrap(async (req, res) => res.json(await prisma.levelSubject.delete({ where: { id: req.params.id } })))
);
r.get(
  "/level-subjects/:id",
  wrap(async (req, res) => {
    const ls = await prisma.levelSubject.findUnique({
      where: { id: req.params.id },
      include: {
        level: { include: { cycle: true } },
        subject: true,
        chapters: {
          orderBy: [{ semester: "asc" }, { order: "asc" }],
          include: {
            lessons: { orderBy: { order: "asc" } },
            quizzes: { orderBy: { order: "asc" }, include: { _count: { select: { questions: true } } } },
          },
        },
      },
    });
    if (!ls) return res.status(404).json({ error: "Introuvable" });
    res.json(ls);
  })
);

// ---------- Subjects ----------
const subjectSchema = z.object({ name: z.string().min(2), icon: z.string().optional(), color: z.string().optional() });
r.get("/subjects", wrap(async (_req, res) => res.json(await prisma.subject.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { levels: true } } } }))));
r.post(
  "/subjects",
  wrap(async (req, res) => {
    const b = parse(subjectSchema, req.body);
    let slug = slugify(b.name);
    if (await prisma.subject.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    res.status(201).json(await prisma.subject.create({ data: { ...b, slug } }));
  })
);
r.put(
  "/subjects/:id",
  wrap(async (req, res) => {
    const b = parse(subjectSchema.partial(), req.body);
    res.json(await prisma.subject.update({ where: { id: req.params.id }, data: b }));
  })
);
r.delete("/subjects/:id", wrap(async (req, res) => res.json(await prisma.subject.delete({ where: { id: req.params.id } }))));

// ---------- Chapters ----------
const chapterSchema = z.object({
  levelSubjectId: z.string(),
  title: z.string().min(2),
  semester: z.number().int().min(1).max(2).optional(),
  order: z.number().int().optional(),
});
r.post(
  "/chapters",
  wrap(async (req, res) => {
    const b = parse(chapterSchema, req.body);
    const count = await prisma.chapter.count({ where: { levelSubjectId: b.levelSubjectId } });
    res.status(201).json(await prisma.chapter.create({ data: { ...b, order: b.order ?? count } }));
  })
);
r.put(
  "/chapters/:id",
  wrap(async (req, res) => {
    const b = parse(chapterSchema.partial(), req.body);
    res.json(await prisma.chapter.update({ where: { id: req.params.id }, data: b }));
  })
);
r.delete("/chapters/:id", wrap(async (req, res) => res.json(await prisma.chapter.delete({ where: { id: req.params.id } }))));

// ---------- Lessons ----------
const lessonSchema = z.object({
  chapterId: z.string(),
  title: z.string().min(2),
  type: z.enum(["COURSE", "SUMMARY", "EXERCISE", "EXAM", "VIDEO"]).optional(),
  content: z.string().optional(),
  videoUrl: z.string().optional(),
  fileUrl: z.string().optional(),
  durationMin: z.number().int().min(1).optional(),
  isPremium: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  order: z.number().int().optional(),
});
r.get(
  "/lessons",
  wrap(async (req, res) => {
    const q = String(req.query.q || "");
    const list = await prisma.lesson.findMany({
      where: q ? { title: { contains: q } } : {},
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { chapter: { include: { levelSubject: { include: { level: true, subject: true } } } } },
    });
    res.json(list);
  })
);
r.get(
  "/lessons/:id",
  wrap(async (req, res) => {
    const l = await prisma.lesson.findUnique({
      where: { id: req.params.id },
      include: { chapter: { include: { levelSubject: { include: { level: true, subject: true } } } } },
    });
    if (!l) return res.status(404).json({ error: "Introuvable" });
    res.json(l);
  })
);
r.post(
  "/lessons",
  wrap(async (req, res) => {
    const b = parse(lessonSchema, req.body);
    const count = await prisma.lesson.count({ where: { chapterId: b.chapterId } });
    const lesson = await prisma.lesson.create({ data: { ...b, order: b.order ?? count } });
    await indexLesson(lesson.id);
    res.status(201).json(lesson);
  })
);
r.put(
  "/lessons/:id",
  wrap(async (req, res) => {
    const b = parse(lessonSchema.partial(), req.body);
    const lesson = await prisma.lesson.update({ where: { id: req.params.id }, data: b });
    await indexLesson(lesson.id);
    res.json(lesson);
  })
);
r.delete("/lessons/:id", wrap(async (req, res) => res.json(await prisma.lesson.delete({ where: { id: req.params.id } }))));

// ---------- Quizzes (with nested questions) ----------
const questionSchema = z.object({
  text: z.string().min(1),
  explanation: z.string().optional(),
  options: z
    .array(z.object({ text: z.string().min(1), isCorrect: z.boolean() }))
    .min(2)
    .refine((o) => o.some((x) => x.isCorrect), "Au moins une option correcte requise"),
});
const quizSchema = z.object({
  chapterId: z.string(),
  title: z.string().min(2),
  description: z.string().optional(),
  durationMin: z.number().int().min(1).optional(),
  isPremium: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  order: z.number().int().optional(),
  questions: z.array(questionSchema).optional(),
});
r.get(
  "/quizzes",
  wrap(async (_req, res) =>
    res.json(
      await prisma.quiz.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          _count: { select: { questions: true, attempts: true } },
          chapter: { include: { levelSubject: { include: { level: true, subject: true } } } },
        },
      })
    )
  )
);
r.get(
  "/quizzes/:id",
  wrap(async (req, res) => {
    const q = await prisma.quiz.findUnique({
      where: { id: req.params.id },
      include: {
        chapter: { include: { levelSubject: { include: { level: true, subject: true } } } },
        questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } },
      },
    });
    if (!q) return res.status(404).json({ error: "Introuvable" });
    res.json(q);
  })
);
r.post(
  "/quizzes",
  wrap(async (req, res) => {
    const { questions = [], ...b } = parse(quizSchema, req.body);
    const count = await prisma.quiz.count({ where: { chapterId: b.chapterId } });
    const quiz = await prisma.quiz.create({
      data: {
        ...b,
        order: b.order ?? count,
        questions: {
          create: questions.map((q, i) => ({
            text: q.text,
            explanation: q.explanation ?? "",
            order: i,
            options: { create: q.options.map((o, j) => ({ ...o, order: j })) },
          })),
        },
      },
      include: { questions: { include: { options: true } } },
    });
    res.status(201).json(quiz);
  })
);
r.put(
  "/quizzes/:id",
  wrap(async (req, res) => {
    const { questions, ...b } = parse(quizSchema.partial(), req.body);
    const quiz = await prisma.$transaction(async (tx) => {
      if (questions) {
        await tx.question.deleteMany({ where: { quizId: req.params.id } });
        for (const [i, q] of questions.entries()) {
          await tx.question.create({
            data: {
              quizId: req.params.id,
              text: q.text,
              explanation: q.explanation ?? "",
              order: i,
              options: { create: q.options.map((o, j) => ({ ...o, order: j })) },
            },
          });
        }
      }
      return tx.quiz.update({
        where: { id: req.params.id },
        data: b,
        include: { questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } } },
      });
    });
    res.json(quiz);
  })
);
r.delete("/quizzes/:id", wrap(async (req, res) => res.json(await prisma.quiz.delete({ where: { id: req.params.id } }))));

// ---------- Users ----------
r.get(
  "/users",
  wrap(async (req, res) => {
    const q = String(req.query.q || "");
    const users = await prisma.user.findMany({
      where: q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {},
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { level: true, _count: { select: { attempts: true, progress: true } } },
    });
    res.json(users.map(publicUser));
  })
);
r.put(
  "/users/:id",
  wrap(async (req, res) => {
    const b = parse(
      z.object({
        role: z.enum(["STUDENT", "ADMIN"]).optional(),
        plan: z.enum(["FREE", "PREMIUM"]).optional(),
        premiumUntil: z.string().nullable().optional(),
        password: z.string().min(6).optional(),
      }),
      req.body
    );
    const data: any = { ...b };
    if (b.premiumUntil !== undefined) data.premiumUntil = b.premiumUntil ? new Date(b.premiumUntil) : null;
    if (b.password) data.password = await bcrypt.hash(b.password, 10);
    res.json(publicUser(await prisma.user.update({ where: { id: req.params.id }, data, include: { level: true } })));
  })
);
r.delete(
  "/users/:id",
  wrap(async (req, res) => {
    if (req.params.id === req.user!.id) return res.status(400).json({ error: "Impossible de supprimer votre propre compte" });
    res.json(publicUser(await prisma.user.delete({ where: { id: req.params.id } })));
  })
);

export default r;
