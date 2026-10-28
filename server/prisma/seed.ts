import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { cycles, subjects, levels, chapters } from "./curriculum.js";
import { content, type LessonDef } from "./content.js";

const prisma = new PrismaClient();

function genericLessons(chapterTitle: string, subjectName: string, levelName: string): LessonDef[] {
  const course = `# ${chapterTitle}

> Cours de **${subjectName}** — ${levelName}

## Objectifs du chapitre
- Comprendre les notions fondamentales de « ${chapterTitle} ».
- Savoir appliquer les définitions et propriétés dans des exercices types.
- Se préparer aux questions d'examen portant sur ce chapitre.

## Plan du cours
1. Introduction et définitions
2. Propriétés essentielles
3. Méthodes et exemples résolus
4. Exercices d'application

## Contenu
Ce cours est en cours de rédaction par l'équipe pédagogique de Myschool. Il sera enrichi prochainement avec des explications détaillées, des exemples et des schémas.

En attendant, vous pouvez consulter la série d'exercices associée et tester vos connaissances avec les QCM du chapitre.
`;
  const exercises = `# Série d'exercices — ${chapterTitle}

## Exercice 1
Rappeler les définitions et propriétés principales du chapitre « ${chapterTitle} ».

## Exercice 2
Application directe du cours : traiter un exemple simple en justifiant chaque étape.

## Exercice 3
Problème de synthèse mobilisant plusieurs notions du chapitre.

*Corrigé détaillé disponible prochainement.*
`;
  return [
    { title: `Cours : ${chapterTitle}`, type: "COURSE", content: course, durationMin: 25, isPremium: false },
    { title: `Série d'exercices : ${chapterTitle}`, type: "EXERCISE", content: exercises, durationMin: 40, isPremium: false },
    {
      title: `Résumé du chapitre : ${chapterTitle}`,
      type: "SUMMARY",
      content: `# Résumé — ${chapterTitle}\n\nFiche de synthèse (définitions, formules et méthodes clés) du chapitre « ${chapterTitle} ».\n\n*Contenu premium en cours de rédaction.*`,
      durationMin: 10,
      isPremium: true,
    },
  ];
}

async function main() {
  console.log("Nettoyage…");
  await prisma.quizAttempt.deleteMany();
  await prisma.progress.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.studyPlan.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.levelSubject.deleteMany();
  await prisma.user.deleteMany();
  await prisma.level.deleteMany();
  await prisma.cycle.deleteMany();
  await prisma.subject.deleteMany();

  console.log("Cycles, niveaux, matières…");
  const cycleMap: Record<string, string> = {};
  for (const c of cycles) {
    const created = await prisma.cycle.create({ data: c });
    cycleMap[c.slug] = created.id;
  }
  const subjectMap: Record<string, { id: string; name: string }> = {};
  for (const s of subjects) {
    const created = await prisma.subject.create({ data: s });
    subjectMap[s.slug] = { id: created.id, name: s.name };
  }

  const lsMap: Record<string, string> = {}; // "level/subject" -> levelSubjectId
  const levelMap: Record<string, { id: string; name: string }> = {};
  for (const l of levels) {
    const { cycle, subjects: subjSlugs, ...data } = l;
    const created = await prisma.level.create({ data: { ...data, cycleId: cycleMap[cycle] } });
    levelMap[l.slug] = { id: created.id, name: l.name };
    for (const [i, ss] of subjSlugs.entries()) {
      const ls = await prisma.levelSubject.create({ data: { levelId: created.id, subjectId: subjectMap[ss].id, order: i } });
      lsMap[`${l.slug}/${ss}`] = ls.id;
    }
  }

  console.log("Chapitres, cours, QCM…");
  let lessonCount = 0;
  let quizCount = 0;
  for (const [key, list] of Object.entries(chapters)) {
    const lsId = lsMap[key];
    if (!lsId) {
      console.warn("Pas de LevelSubject pour", key);
      continue;
    }
    const [levelSlug, subjectSlug] = key.split("/");
    for (const [i, c] of list.entries()) {
      const chapter = await prisma.chapter.create({ data: { levelSubjectId: lsId, title: c.t, semester: c.s, order: i } });
      const detailed = content[`${key}/${c.t}`];
      const lessons = detailed?.lessons?.length
        ? detailed.lessons
        : genericLessons(c.t, subjectMap[subjectSlug].name, levelMap[levelSlug].name);
      for (const [j, l] of lessons.entries()) {
        await prisma.lesson.create({
          data: {
            chapterId: chapter.id,
            title: l.title,
            type: l.type ?? "COURSE",
            content: l.content,
            durationMin: l.durationMin ?? 20,
            isPremium: l.isPremium ?? false,
            videoUrl: l.videoUrl ?? "",
            order: j,
            views: Math.floor(Math.random() * 400),
          },
        });
        lessonCount++;
      }
      for (const [j, q] of (detailed?.quizzes ?? []).entries()) {
        await prisma.quiz.create({
          data: {
            chapterId: chapter.id,
            title: q.title,
            description: q.description ?? "",
            durationMin: q.durationMin ?? 10,
            isPremium: q.isPremium ?? false,
            order: j,
            questions: {
              create: q.questions.map((qq, k) => ({
                text: qq.text,
                explanation: qq.explanation ?? "",
                order: k,
                options: { create: qq.options.map(([text, isCorrect], m) => ({ text, isCorrect, order: m })) },
              })),
            },
          },
        });
        quizCount++;
      }
    }
  }

  console.log("Utilisateurs…");
  const admin = await prisma.user.create({
    data: { name: "Administrateur Myschool", email: "admin@myschool.ma", password: await bcrypt.hash("Admin1234!", 10), role: "ADMIN", plan: "PREMIUM" },
  });
  const student = await prisma.user.create({
    data: { name: "Yassine El Amrani", email: "eleve@myschool.ma", password: await bcrypt.hash("Eleve1234!", 10), levelId: levelMap["2bac-pc"].id },
  });
  const premium = await prisma.user.create({
    data: {
      name: "Salma Benjelloun",
      email: "premium@myschool.ma",
      password: await bcrypt.hash("Premium1234!", 10),
      plan: "PREMIUM",
      premiumUntil: new Date(Date.now() + 365 * 86400000),
      levelId: levelMap["3ac"].id,
    },
  });

  // A bit of activity for the demo student
  const someLessons = await prisma.lesson.findMany({ where: { chapter: { levelSubject: { levelId: levelMap["2bac-pc"].id } }, isPremium: false }, take: 4 });
  for (const l of someLessons) await prisma.progress.create({ data: { userId: student.id, lessonId: l.id } });
  const quiz = await prisma.quiz.findFirst({ where: { chapter: { levelSubject: { levelId: levelMap["2bac-pc"].id } } }, include: { questions: true } });
  if (quiz) await prisma.quizAttempt.create({ data: { userId: student.id, quizId: quiz.id, score: 5, total: quiz.questions.length } });

  console.log(`Seed terminé : ${levels.length} niveaux, ${lessonCount} cours, ${quizCount} QCM.`);
  console.log(`Admin: ${admin.email} / Admin1234!  |  Élève: ${student.email} / Eleve1234!  |  Premium: ${premium.email} / Premium1234!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
