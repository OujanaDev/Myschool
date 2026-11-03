---
version: 1
slug: "web-src-pages-home-tsx"
primary_target: "web/src/pages/Home.tsx"
related_targets: ["web/src/components/Layout.tsx","web/src/components/HomeQuiz.tsx"]
---

# Surface: home page (`/`, web/src/pages/Home.tsx) with the shared nav and footer (web/src/components/Layout.tsx)

Mode: Persuade. Audience: a pupil, student or parent arriving for the first time. Job: understand what Myschool is, find their level, try a lesson or a QCM, see what Premium adds. Primary action: « Découvrir les cours » (→ /explorer). Proof: live counts and content from `/api/home` (levels, lessons, QCM, questions; the richest chapters per cycle; the three concours levels; one free QCM to play). Constraints: Myschool name and mark; real prices (49 DH / 399 DH); no user counts or testimonials; French, tutoiement on this surface only.

Chosen direction: the user pinned the taalim model (`C:\Users\simou\OneDrive\Documents\ChatGPT\taalim\index.html` + `styles.css`); its composition is reproduced with Myschool's truth. Memorable moment: the QCM panel that actually works on the home page.

Unresolved: whether the Arabic-letter brand mark of the model should inspire a new Myschool mark (kept the existing roof mark).

## Direction contract

THESIS: The home page proves Myschool is a complete Moroccan-curriculum school in the browser: a real lesson card, a QCM you can answer on the spot, and the catalogue's real counts, instead of the category's grid of icon-plus-text feature cards.

OWN-WORLD: Cream paper ground (#fbf8f0, nav #fffdf8), deep teal for ink and action (#0b7d76, ink #173435), apricot accent (#f7aa73 → #d87941) for warmth. Outfit display, tight-tracked; DM Sans body. White cards with soft teal-tinted drop shadows, 13–15 px radii. Dashed orbit rings and math scribbles are the only ornament; one pastel tinted panel per cycle (apricot, sky, lilac, mint); a full-bleed teal band for the QCM; a mint panel for Premium; a deep-teal footer.

STORY: The visitor recognises their level in the four cycle cards, sees a lesson card and a live QCM, understands free vs Premium (49 DH), and leaves toward Explorer, a chapter, or the QCM.

FIRST VIEWPORT: 78 px cream nav (mark + wordmark, five links, login + teal « Commencer → »). Hero: left 52 % copy — eyebrow with pulse dot, 61 px Outfit headline « Ton avenir commence / ici. » with teal « ici. », 17 px lead, teal primary « Découvrir les cours → » beside a play-style « Essayer un QCM », proof line with real counts. Right 48 %: a 330 px lesson card tilted −2°, apricot video panel with a formula, progress ring, over two dashed orbits and three scribbles, with floating « QCM terminé » and « 18/20 » cards. Below the fold: a mint trust strip.

FORM: brief-pinned model, position 1 of 1. The concept-seed roll was not consulted for this direction: the user pinned the model file and asked to proceed without questions; a later `--check-seed` attempt produced an unrelated surface roll that was not used. seed: none (unavailable)

Deviations from the model, cited: the nav keeps the site-wide search field (PRODUCT.md: searchable instantly); the play button opens the QCM section because no video is hosted; the lesson card shows "Lire · n min" with a reading bar instead of video chrome unless the lesson has a videoUrl; the proof line uses real counts and four subject tiles instead of a user-avatar pile; the "+" suffixes were dropped because the counts are exact; the Premium badge reads "Sans engagement" because popularity is not evidenced; the catalogue shows at most nine chapters (six on a phone) with a link to the full library.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
