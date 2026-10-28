export type Cycle = { id: string; name: string; slug: string; description: string; order: number; levels: Level[] };
export type Level = {
  id: string;
  cycleId?: string;
  name: string;
  shortName: string;
  slug: string;
  track: string;
  description: string;
  order: number;
  cycle?: Cycle;
  _count?: { subjects: number };
};
export type Subject = { id: string; name: string; slug: string; icon: string; color: string; _count?: { levels: number } };
export type User = {
  id: string;
  email: string;
  name: string;
  role: "STUDENT" | "ADMIN";
  plan: "FREE" | "PREMIUM";
  premiumUntil: string | null;
  levelId: string | null;
  level?: Level | null;
  createdAt?: string;
  _count?: { attempts: number; progress: number };
};
export type LessonType = "COURSE" | "SUMMARY" | "EXERCISE" | "EXAM" | "VIDEO";
export type LessonLite = { id: string; title: string; type: LessonType; isPremium: boolean; durationMin?: number; views?: number };
export type QuizLite = { id: string; title: string; isPremium: boolean; durationMin?: number; _count?: { questions: number } };
export type Chapter = { id: string; title: string; semester: number; order: number; lessons: LessonLite[]; quizzes: QuizLite[] };
export type Lesson = LessonLite & {
  content: string;
  videoUrl: string;
  fileUrl: string;
  durationMin: number;
  isPublished?: boolean;
  locked: boolean;
  completed: boolean;
  bookmarked: boolean;
  chapterId: string;
  chapter: {
    id: string;
    title: string;
    levelSubject: { level: Level; subject: Subject };
    lessons: LessonLite[];
    quizzes: QuizLite[];
  };
};
export type QuizQuestion = { id: string; text: string; explanation?: string; options: { id: string; text: string; isCorrect?: boolean }[] };
export type Quiz = {
  id: string;
  title: string;
  description: string;
  durationMin: number;
  isPremium: boolean;
  isPublished?: boolean;
  locked: boolean;
  chapterId: string;
  chapter: { id: string; title: string; levelSubject: { level: Level; subject: Subject } };
  questions: QuizQuestion[];
};
export type AttemptResult = {
  attempt: { id: string; score: number; total: number };
  review: { questionId: string; chosen?: string; correctOptionId?: string; correct: boolean; explanation: string }[];
};
export type Dashboard = {
  user: User;
  stats: { completedLessons: number; quizAttempts: number; averageScore: number; bookmarks: number };
  levelProgress: { completed: number; total: number };
  performance: { subject: Subject; rate: number; attempts: number; score: number; total: number }[];
  recentAttempts: { id: string; score: number; total: number; createdAt: string; quiz: { id: string; title: string }; subject: Subject }[];
  recommendations: { id: string; title: string; type: LessonType; isPremium: boolean; durationMin: number; subject: Subject; chapter: string; reason: string }[];
  activity: { date: string; lessons: number; quizzes: number }[];
};
export type StudyTask = { kind: "lesson" | "quiz"; id: string; title: string; subject: string; subjectColor: string; chapter: string; minutes: number };
export type StudyPlan = {
  goal: string;
  examDate: string | null;
  hoursPerWeek: number;
  subjectIds: string[];
  plan: { week: number; minutes: number; tasks: StudyTask[] }[];
  coverage?: { planned: number; total: number };
};
export type SearchResult = {
  lessons: { id: string; title: string; type: LessonType; isPremium: boolean; chapter: string; level: Level; subject: Subject }[];
  quizzes: { id: string; title: string; isPremium: boolean; questions: number; chapter: string; level: Level; subject: Subject }[];
  chapters: { id: string; title: string; semester: number; lessons: number; quizzes: number; level: Level; subject: Subject }[];
  levels: Level[];
  subjects: Subject[];
};
