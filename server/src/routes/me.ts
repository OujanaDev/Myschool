import { Router } from "express";
import { z } from "zod";
import { prisma, wrap, requireAuth, parse, publicUser } from "../lib.js";

const r = Router();
r.use(requireAuth);

// Mark lesson as completed / uncompleted
r.post(
  "/progress/:lessonId",
  wrap(async (req, res) => {
    const lesson = await prisma.lesson.findUnique({ where: { id: req.params.lessonId } });
    if (!lesson) return res.status(404).json({ error: "Cours introuvable" });
    const p = await prisma.progress.upsert({
      where: { userId_lessonId: { userId: req.user!.id, lessonId: lesson.id } },
      create: { userId: req.user!.id, lessonId: lesson.id },
      update: {},
    });
    res.json(p);
  })
);
r.delete(
  "/progress/:lessonId",
  wrap(async (req, res) => {
    await prisma.progress.deleteMany({ where: { userId: req.user!.id, lessonId: req.params.lessonId } });
    res.json({ ok: true });
  })
);

// Bookmarks
r.post(
  "/bookmarks/:lessonId",
  wrap(async (req, res) => {
    const existing = await prisma.bookmark.findUnique({
      where: { userId_lessonId: { userId: req.user!.id, lessonId: req.params.lessonId } },
    });
    if (existing) {
      await prisma.bookmark.delete({ where: { id: existing.id } });
      return res.json({ bookmarked: false });
    }
    await prisma.bookmark.create({ data: { userId: req.user!.id, lessonId: req.params.lessonId } });
    res.json({ bookmarked: true });
  })
);
r.get(
  "/bookmarks",
  wrap(async (req, res) => {
    const list = await prisma.bookmark.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: {
        lesson: { include: { chapter: { include: { levelSubject: { include: { level: true, subject: true } } } } } },
      },
    });
    res.json(list.map((b) => ({ id: b.id, lesson: b.lesson, createdAt: b.createdAt })));
  })
);

// Dashboard: stats, recent attempts, recommendations
r.get(
  "/dashboard",
  wrap(async (req, res) => {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { level: { include: { cycle: true } } } });
    const [completedCount, attempts, bookmarks] = await Promise.all([
      prisma.progress.count({ where: { userId } }),
      prisma.quizAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { quiz: { include: { chapter: { include: { levelSubject: { include: { subject: true, level: true } } } } } } },
      }),
      prisma.bookmark.count({ where: { userId } }),
    ]);

    // Per-subject performance from attempts
    const perSubject: Record<string, { subject: any; score: number; total: number; attempts: number }> = {};
    for (const a of attempts) {
      const s = a.quiz.chapter.levelSubject.subject;
      perSubject[s.id] ??= { subject: s, score: 0, total: 0, attempts: 0 };
      perSubject[s.id].score += a.score;
      perSubject[s.id].total += a.total;
      perSubject[s.id].attempts += 1;
    }
    const performance = Object.values(perSubject)
      .map((p) => ({ ...p, rate: p.total ? Math.round((p.score / p.total) * 100) : 0 }))
      .sort((a, b) => a.rate - b.rate);

    // Recommendations: unfinished lessons in user's level, weakest subjects first
    let recommendations: any[] = [];
    let levelProgress = { completed: 0, total: 0 };
    if (user?.levelId) {
      const completedIds = (await prisma.progress.findMany({ where: { userId }, select: { lessonId: true } })).map((p) => p.lessonId);
      const lessons = await prisma.lesson.findMany({
        where: { isPublished: true, chapter: { levelSubject: { levelId: user.levelId } } },
        include: { chapter: { include: { levelSubject: { include: { subject: true, level: true } } } } },
        orderBy: { order: "asc" },
      });
      levelProgress = { completed: lessons.filter((l) => completedIds.includes(l.id)).length, total: lessons.length };
      const weakOrder = performance.map((p) => p.subject.id);
      recommendations = lessons
        .filter((l) => !completedIds.includes(l.id))
        .sort((a, b) => {
          const ia = weakOrder.indexOf(a.chapter.levelSubject.subjectId);
          const ib = weakOrder.indexOf(b.chapter.levelSubject.subjectId);
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        })
        .slice(0, 6)
        .map((l) => ({
          id: l.id,
          title: l.title,
          type: l.type,
          isPremium: l.isPremium,
          durationMin: l.durationMin,
          subject: l.chapter.levelSubject.subject,
          chapter: l.chapter.title,
          reason: weakOrder.includes(l.chapter.levelSubject.subjectId) ? "Matière à renforcer" : "À découvrir",
        }));
    }

    // Weekly activity (last 7 days)
    const since = new Date(Date.now() - 6 * 86400000);
    since.setHours(0, 0, 0, 0);
    const recentProgress = await prisma.progress.findMany({ where: { userId, completedAt: { gte: since } } });
    const activity = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(since.getTime() + i * 86400000);
      const key = d.toISOString().slice(0, 10);
      return {
        date: key,
        lessons: recentProgress.filter((p) => p.completedAt.toISOString().slice(0, 10) === key).length,
        quizzes: attempts.filter((a) => a.createdAt.toISOString().slice(0, 10) === key).length,
      };
    });

    res.json({
      user: publicUser(user),
      stats: {
        completedLessons: completedCount,
        quizAttempts: attempts.length,
        averageScore: attempts.length
          ? Math.round((attempts.reduce((s, a) => s + a.score / Math.max(1, a.total), 0) / attempts.length) * 100)
          : 0,
        bookmarks,
      },
      levelProgress,
      performance,
      recentAttempts: attempts.slice(0, 5).map((a) => ({
        id: a.id,
        score: a.score,
        total: a.total,
        createdAt: a.createdAt,
        quiz: { id: a.quiz.id, title: a.quiz.title },
        subject: a.quiz.chapter.levelSubject.subject,
      })),
      recommendations,
      activity,
    });
  })
);

// Study plan (personalised preparation)
r.get(
  "/study-plan",
  wrap(async (req, res) => {
    const plan = await prisma.studyPlan.findUnique({ where: { userId: req.user!.id } });
    if (!plan) return res.json(null);
    res.json({ ...plan, subjectIds: JSON.parse(plan.subjectIds), plan: JSON.parse(plan.plan) });
  })
);

r.post(
  "/study-plan",
  wrap(async (req, res) => {
    const body = parse(
      z.object({
        goal: z.string().min(2),
        examDate: z.string().optional(),
        hoursPerWeek: z.number().int().min(1).max(60),
        subjectIds: z.array(z.string()).min(1),
      }),
      req.body
    );
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user?.levelId) return res.status(400).json({ error: "Choisissez d'abord votre niveau dans votre profil" });

    const completedIds = (await prisma.progress.findMany({ where: { userId: user.id }, select: { lessonId: true } })).map((p) => p.lessonId);
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId: user.id },
      include: { quiz: { include: { chapter: { select: { levelSubjectId: true } } } } },
    });
    const rateByLs: Record<string, { s: number; t: number }> = {};
    for (const a of attempts) {
      const k = a.quiz.chapter.levelSubjectId;
      rateByLs[k] ??= { s: 0, t: 0 };
      rateByLs[k].s += a.score;
      rateByLs[k].t += a.total;
    }

    const levelSubjects = await prisma.levelSubject.findMany({
      where: { levelId: user.levelId, subjectId: { in: body.subjectIds } },
      include: {
        subject: true,
        chapters: {
          orderBy: [{ semester: "asc" }, { order: "asc" }],
          include: {
            lessons: { where: { isPublished: true }, orderBy: { order: "asc" } },
            quizzes: { where: { isPublished: true }, orderBy: { order: "asc" } },
          },
        },
      },
    });

    // Build task list: weakest subjects get priority; unfinished lessons then quizzes per chapter
    const weighted = levelSubjects
      .map((ls) => {
        const r = rateByLs[ls.id];
        return { ls, rate: r && r.t ? r.s / r.t : 0.5 };
      })
      .sort((a, b) => a.rate - b.rate);

    type Task = { kind: "lesson" | "quiz"; id: string; title: string; subject: string; subjectColor: string; chapter: string; minutes: number };
    const tasks: Task[] = [];
    for (const { ls } of weighted) {
      for (const ch of ls.chapters) {
        for (const l of ch.lessons) {
          if (completedIds.includes(l.id)) continue;
          tasks.push({ kind: "lesson", id: l.id, title: l.title, subject: ls.subject.name, subjectColor: ls.subject.color, chapter: ch.title, minutes: l.durationMin });
        }
        for (const q of ch.quizzes) {
          tasks.push({ kind: "quiz", id: q.id, title: q.title, subject: ls.subject.name, subjectColor: ls.subject.color, chapter: ch.title, minutes: q.durationMin });
        }
      }
    }

    // Interleave subjects so a week isn't monotonous
    const bySubject = new Map<string, Task[]>();
    for (const t of tasks) bySubject.set(t.subject, [...(bySubject.get(t.subject) ?? []), t]);
    const interleaved: Task[] = [];
    const queues = [...bySubject.values()];
    while (queues.some((q) => q.length)) for (const q of queues) if (q.length) interleaved.push(q.shift()!);

    const weeksAvailable = body.examDate
      ? Math.max(1, Math.ceil((new Date(body.examDate).getTime() - Date.now()) / (7 * 86400000)))
      : 8;
    const minutesPerWeek = body.hoursPerWeek * 60;
    const weeks: { week: number; minutes: number; tasks: Task[] }[] = [];
    let cur = { week: 1, minutes: 0, tasks: [] as Task[] };
    for (const t of interleaved) {
      if (cur.minutes + t.minutes > minutesPerWeek && cur.tasks.length) {
        weeks.push(cur);
        if (weeks.length >= weeksAvailable) break;
        cur = { week: weeks.length + 1, minutes: 0, tasks: [] };
      }
      cur.tasks.push(t);
      cur.minutes += t.minutes;
    }
    if (cur.tasks.length && weeks.length < weeksAvailable) weeks.push(cur);

    const plan = await prisma.studyPlan.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        goal: body.goal,
        examDate: body.examDate ? new Date(body.examDate) : null,
        hoursPerWeek: body.hoursPerWeek,
        subjectIds: JSON.stringify(body.subjectIds),
        plan: JSON.stringify(weeks),
      },
      update: {
        goal: body.goal,
        examDate: body.examDate ? new Date(body.examDate) : null,
        hoursPerWeek: body.hoursPerWeek,
        subjectIds: JSON.stringify(body.subjectIds),
        plan: JSON.stringify(weeks),
      },
    });
    res.json({ ...plan, subjectIds: body.subjectIds, plan: weeks, coverage: { planned: weeks.reduce((a, w) => a + w.tasks.length, 0), total: tasks.length } });
  })
);

// Billing (simulated checkout — to be replaced by CMI / Stripe / PayPal integration). Off in production, where it
// would hand Premium out for free, unless SIMULATED_PAYMENTS=true.
const simulatedPayments = (process.env.SIMULATED_PAYMENTS ?? (process.env.NODE_ENV === "production" ? "false" : "true")) === "true";
r.post(
  "/billing/upgrade",
  wrap(async (req, res) => {
    if (!simulatedPayments) return res.status(503).json({ error: "Le paiement en ligne n'est pas encore disponible." });
    const body = parse(z.object({ plan: z.enum(["monthly", "yearly"]) }), req.body);
    const months = body.plan === "yearly" ? 12 : 1;
    const until = new Date();
    until.setMonth(until.getMonth() + months);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { plan: "PREMIUM", premiumUntil: until },
      include: { level: { include: { cycle: true } } },
    });
    res.json(publicUser(user));
  })
);

r.get(
  "/attempts",
  wrap(async (req, res) => {
    const list = await prisma.quizAttempt.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { quiz: { include: { chapter: { include: { levelSubject: { include: { subject: true, level: true } } } } } } },
    });
    res.json(list);
  })
);

export default r;
