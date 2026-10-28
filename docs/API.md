# Myschool — API REST

Base URL (dev) : `http://localhost:4000/api` — Auth : header `Authorization: Bearer <token>` (JWT, 30 jours).
Toutes les réponses sont en JSON. Erreur : `{ "error": "message" }` avec code HTTP 400/401/402/403/404/409/500.

## Auth
| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| POST | `/auth/register` | `{ name, email, password, levelId? }` | `{ token, user }` |
| POST | `/auth/login` | `{ email, password }` | `{ token, user }` |
| GET | `/auth/me` | — (auth) | `user` |
| PATCH | `/auth/me` | `{ name?, levelId? }` (auth) | `user` |

`user` = `{ id, email, name, role: "STUDENT"|"ADMIN", plan: "FREE"|"PREMIUM", premiumUntil, levelId, level: { id, name, slug, shortName, cycle } }`

## Catalogue (public, auth optionnelle)
| Méthode | Route | Réponse |
|---|---|---|
| GET | `/cycles` | `[{ id, name, slug, description, order, levels: [{ id, name, shortName, slug, track, description, _count: { subjects } }] }]` |
| GET | `/subjects` | `[{ id, name, slug, icon, color }]` |
| GET | `/levels/:slug` | `{ id, name, slug, track, description, cycle, subjects: [{ id, subject, chapters, lessons, quizzes }] }` |
| GET | `/levels/:slug/subjects/:subjectSlug` | `{ level, subject, chapters: [{ id, title, semester, order, lessons: [{ id, title, type, isPremium, durationMin, views }], quizzes: [{ id, title, isPremium, durationMin, _count: { questions } }] }], completed: [lessonId] }` |
| GET | `/lessons/:id` | `{ id, title, type, content (markdown+LaTeX), videoUrl, fileUrl, durationMin, isPremium, locked, completed, bookmarked, chapter: { id, title, levelSubject: { level, subject }, lessons: [...], quizzes: [...] } }`. Si `locked` est vrai, `content` est tronqué (aperçu). |
| GET | `/quizzes/:id` | `{ id, title, description, durationMin, isPremium, locked, chapter, questions: [{ id, text, explanation, options: [{ id, text }] }] }` (pas de `isCorrect`) |
| POST | `/quizzes/:id/attempts` (auth) | corps `{ answers: { [questionId]: optionId } }` → `{ attempt: { id, score, total }, review: [{ questionId, chosen, correctOptionId, correct, explanation }] }` (402 si premium requis) |
| GET | `/search?q=...&level=slug?` | Recherche insensible à la casse et aux accents, multi-mots, triée par pertinence (titre > chapitre / matière / niveau > contenu). → `{ lessons: [{ id, title, type, isPremium, chapter, level, subject }], quizzes: [{ id, title, isPremium, questions, chapter, level, subject }], chapters: [{ id, title, semester, lessons, quizzes, level, subject }], levels, subjects }` |

Types de leçon : `COURSE`, `SUMMARY`, `EXERCISE`, `EXAM`, `VIDEO`.

## Espace élève (auth requise) — préfixe `/me`
| Méthode | Route | Description |
|---|---|---|
| POST / DELETE | `/me/progress/:lessonId` | marquer / démarquer une leçon terminée |
| POST | `/me/bookmarks/:lessonId` | toggle favori → `{ bookmarked }` |
| GET | `/me/bookmarks` | `[{ id, lesson, createdAt }]` |
| GET | `/me/dashboard` | `{ user, stats: { completedLessons, quizAttempts, averageScore, bookmarks }, levelProgress: { completed, total }, performance: [{ subject, rate, attempts }], recentAttempts, recommendations: [{ id, title, type, subject, chapter, reason }], activity: [{ date, lessons, quizzes }] }` |
| GET | `/me/attempts` | historique des QCM |
| GET | `/me/study-plan` | plan actuel ou `null` |
| POST | `/me/study-plan` | `{ goal, examDate?, hoursPerWeek, subjectIds: [] }` → `{ goal, examDate, hoursPerWeek, plan: [{ week, minutes, tasks: [{ kind: "lesson"|"quiz", id, title, subject, subjectColor, chapter, minutes }] }], coverage }` |
| POST | `/me/billing/upgrade` | `{ plan: "monthly"|"yearly" }` → `user` (paiement simulé) |

## Administration (rôle ADMIN) — préfixe `/admin`
| Ressource | Routes |
|---|---|
| Stats | `GET /admin/stats` |
| Cycles | `GET /admin/cycles`, `POST /admin/cycles { name, description?, order? }`, `PUT /admin/cycles/:id`, `DELETE /admin/cycles/:id` |
| Niveaux | `GET /admin/levels`, `POST /admin/levels { cycleId, name, shortName?, track?, description?, order? }`, `PUT /admin/levels/:id`, `DELETE /admin/levels/:id` |
| Matières d'un niveau | `POST /admin/levels/:id/subjects { subjectId }`, `DELETE /admin/level-subjects/:id`, `GET /admin/level-subjects/:id` (chapitres + leçons + QCM) |
| Matières | `GET /admin/subjects`, `POST /admin/subjects { name, icon?, color? }`, `PUT /admin/subjects/:id`, `DELETE /admin/subjects/:id` |
| Chapitres | `POST /admin/chapters { levelSubjectId, title, semester?, order? }`, `PUT /admin/chapters/:id`, `DELETE /admin/chapters/:id` |
| Leçons | `GET /admin/lessons?q=`, `GET /admin/lessons/:id`, `POST /admin/lessons { chapterId, title, type?, content?, videoUrl?, fileUrl?, durationMin?, isPremium?, isPublished?, order? }`, `PUT /admin/lessons/:id`, `DELETE /admin/lessons/:id` |
| QCM | `GET /admin/quizzes`, `GET /admin/quizzes/:id`, `POST /admin/quizzes { chapterId, title, description?, durationMin?, isPremium?, isPublished?, questions: [{ text, explanation?, options: [{ text, isCorrect }] }] }`, `PUT /admin/quizzes/:id` (remplace les questions si fournies), `DELETE /admin/quizzes/:id` |
| Utilisateurs | `GET /admin/users?q=`, `PUT /admin/users/:id { role?, plan?, premiumUntil?, password? }`, `DELETE /admin/users/:id` |

## Comptes de démonstration
- Admin : `admin@myschool.ma` / `Admin1234!`
- Élève (gratuit, 2 Bac PC) : `eleve@myschool.ma` / `Eleve1234!`
- Élève premium (3AC) : `premium@myschool.ma` / `Premium1234!`
