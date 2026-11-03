# Product

<!-- impeccable:product-schema 1 -->

<!-- Written from the codebase and the redesign brief without an interview (the user asked to proceed without questions). Facts marked (inferred) were not confirmed by the user. -->

## Platform

web

## Users

Moroccan pupils and students, from 1ère année primaire to CPGE and the concours d'accès (médecine, ENSA/ENSAM, ENCG), revising for exams on a phone or a laptop, mostly in French. Parents choosing a platform for their child (inferred). Content is currently concentrated on Tronc commun and 1ère Bac SM / SEx.

## Product Purpose

Naja7School gives every level of the Moroccan school system its courses, exercise series, QCM and a personal study plan in one place, on web, Android and iOS. Success: a student finds their level and chapter in seconds, works through the lesson, checks themselves with the QCM, and comes back.

## Positioning

Content follows the official Moroccan programmes chapter by chapter (numbered « chapitre cours n »), reformulated by Naja7School with labs for the hardest notions, searchable instantly with or without accents. The essential content is free; Premium (49 DH/month or 399 DH/year) adds summaries, corrected mock exams, advanced QCM and the full study plan.

## Operating Context

Catalogue: cycle → level → subject → chapter → lessons (cours, résumé, exercices, examen, vidéo) and QCM. Live counts in October 2026: 4 cycles, 30 levels, 17 subjects, ~930 chapters, ~5 000 published lessons, ~570 QCM, ~6 800 questions. Lessons are Markdown + LaTeX with callouts and interactive labs. Students have a dashboard, bookmarks, progress and a weekly study plan. Content arrives through a PC pipeline and the admin API.

## Capabilities and Constraints

React 18 + Vite + Tailwind v4 web app, Express + Prisma (SQLite) API, Expo mobile app that embeds lessons via `/embed/lecon`. Routes: `/explorer`, `/niveau/:slug`, `/niveau/:slug/:subjectSlug`, `/cours/:id`, `/qcm/:id`, `/recherche`, `/premium`, `/tableau-de-bord`, `/plan-etude`. No video hosting (lessons may link to a `videoUrl`). No Google login. Payment is simulated in this version; production will use CMI / card / mobile payment. No language switcher (French UI; some Arabic subject content).

## Brand Commitments

Name: Naja7School (naja7 = « réussite » in Moroccan darija; domain naja7school.com). Mark: mortarboard with apricot tassel, apricot star, pupil with open arms rising from an open book with teal covers and apricot pages; wordmark "Naja7School" in Outfit with an apricot 7. Renamed from Myschool on 2026-11-01. The user pinned a visual model for the home page: `C:\Users\simou\OneDrive\Documents\ChatGPT\taalim\index.html` + `styles.css` (cream ground, teal, apricot accent, Outfit + DM Sans, tilted lesson card hero, cycle cards, catalogue with search, live QCM panel, concours cards, Premium card). Tutoiement on the marketing home (from the model); the app pages use vouvoiement.

## Evidence on Hand

Real catalogue counts and content in `server/prisma/dev.db` (served by `/api/home`). Real prices and feature lists in `web/src/pages/PremiumPage.tsx`. No user counts, testimonials, pass rates or partner schools: never claim them.

## Product Principles

- Prove with the real catalogue: counts, chapters, a working QCM, never invented numbers.
- Every level of the Moroccan system is a first-class entry point.
- Free content is genuinely useful; Premium is the next step, not a wall.
- The same progression everywhere: web, Android, iOS.
