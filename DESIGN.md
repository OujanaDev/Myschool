---
name: Naja7School
description: Cream paper, deep teal and apricot; a Moroccan-curriculum school in the browser, warm and legible on a phone.
colors:
  teal: "#0b7d76"
  teal-deep: "#0a6761"
  teal-bright: "#1f8f86"
  teal-soft: "#4fa699"
  teal-wash: "#eef6f4"
  teal-tint: "#d9ece6"
  teal-band: "#157b74"
  teal-night: "#123c3b"
  apricot: "#ee8d51"
  apricot-light: "#f7aa73"
  apricot-deep: "#d87941"
  ink: "#173435"
  muted: "#647576"
  on-tint: "#3f5752"
  on-mint: "#4f6560"
  surface: "#fbf8f0"
  paper: "#fffdf8"
  white: "#ffffff"
  line: "#eee9de"
  line-field: "#dce5df"
  line-card: "#e0e7e1"
  mint: "#e8efea"
  mint-panel: "#e5eee9"
  chip-ground: "#edf2ee"
  tint-apricot: "#fee8d7"
  tint-sky: "#dfeef4"
  tint-lilac: "#e9e2f5"
  tint-mint: "#dcefe6"
  success: "#3ca876"
  success-wash: "#e5f5ea"
  error: "#dc7474"
  error-wash: "#ffeaea"
  on-night-muted: "#bdd2ca"
typography:
  display:
    fontFamily: "Outfit, DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(44px, 4.25vw, 61px)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Outfit, DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(34px, 2.8vw, 40px)"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Outfit, DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "normal"
  numeral:
    fontFamily: "Outfit, DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
  lead:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  body:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
rounded:
  tag: "5px"
  control: "7px"
  outline: "8px"
  button: "9px"
  tile: "10px"
  panel: "13px"
  card: "15px"
  band: "19px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "20px"
  lg: "24px"
  xl: "40px"
  section: "80px"
  section-lg: "100px"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.white}"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    padding: "12px 16px"
  button-primary-hover:
    backgroundColor: "{colors.teal-deep}"
    textColor: "{colors.white}"
  button-accent:
    backgroundColor: "{colors.apricot}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "10px 16px"
  button-accent-hover:
    backgroundColor: "{colors.apricot-light}"
    textColor: "{colors.ink}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.outline}"
    padding: "12px 16px"
  button-outline-hover:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
  button-on-teal:
    backgroundColor: "{colors.white}"
    textColor: "{colors.teal}"
    rounded: "{rounded.outline}"
    padding: "13px 18px"
  button-on-teal-hover:
    backgroundColor: "{colors.teal-wash}"
    textColor: "{colors.teal}"
  chip-filter:
    backgroundColor: "{colors.chip-ground}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  chip-filter-active:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  card-catalogue:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "20px"
  card-concours:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "24px"
  panel-cycle:
    backgroundColor: "{colors.tint-apricot}"
    textColor: "{colors.on-tint}"
    rounded: "{rounded.panel}"
    padding: "20px"
  panel-quiz:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "24px"
  input-search:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "0 14px"
    height: "48px"
  nav-link:
    textColor: "{colors.muted}"
    typography: "{typography.body}"
    padding: "8px 10px"
  nav-link-active:
    textColor: "{colors.teal}"
    typography: "{typography.body}"
    padding: "8px 10px"
  answer-option:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  answer-option-correct:
    backgroundColor: "{colors.success-wash}"
    textColor: "{colors.ink}"
  answer-option-wrong:
    backgroundColor: "{colors.error-wash}"
    textColor: "{colors.ink}"
  tag-level:
    backgroundColor: "{colors.chip-ground}"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "4px 8px"
  badge-premium:
    backgroundColor: "{colors.apricot-deep}"
    textColor: "{colors.white}"
    rounded: "{rounded.tile}"
    padding: "4px 10px"
---

# Design System: Naja7School

## Overview

**Creative North Star: "The Cahier on the Kitchen Table"**

Naja7School looks like a well-kept school notebook left open on a warm table: a cream paper ground, deep teal ink for everything that speaks or acts, and a single apricot warmth for the mark's dot, the brand's full stop and the occasional pastel panel. The page is not a dashboard and not a SaaS landing; it is a place where a real lesson card, a real QCM and the real catalogue counts sit on paper. Depth comes from soft, teal-tinted shadows that read as a card lifted off that paper, never from grey system shadows or hard outlines.

Density is calm. Sections breathe at 80 to 100 px, headlines are large and tightly tracked in Outfit, body copy is DM Sans at 14 to 17 px with generous leading, and no text drops below 11 px. Colour is tonal rather than loud: one deep-teal band for the QCM, one mint panel for Premium, one deep-teal footer, and four pastel cycle tints. Ornament is limited to dashed orbit rings and a few mathematical glyphs (∑, π, x²) drawn in the display face. Icons are Lucide line icons at 14 to 28 px, never icon fonts.

**Key Characteristics:**
- Cream paper ground (`surface`) with a slightly whiter `paper` for the nav and concours cards; white only for lifted cards.
- Deep teal is the only action colour; apricot is warmth, not a second CTA colour.
- Outfit display at negative tracking for every headline and numeral; DM Sans for all running text.
- Teal-tinted blur shadows (rgba of the teal family, 0.12 to 0.33 alpha) with large vertical offset and larger blur.
- One secondary grey (`muted`) on white and cream; darker `on-tint` / `on-mint` greys on pastel grounds; white at 85–90 % on teal.
- Radii live between 5 and 19 px; pills only for filter chips, avatars and the progress ring.
- Motion is slow and ambient (orbit 60 s, drift 3.2 s) and switches off under `prefers-reduced-motion`.

## Colors

A warm neutral paper carries one cool action hue (teal) and one warm accent (apricot); every grey is a teal-leaning grey, never a blue slate.

### Primary
- **Deep Teal** (`teal`): buttons, active nav, links, the brand mark, selected states, the highlighted word in the hero (« ici. »). Hover deepens to **Teal Deep**.
- **Teal Band** (`teal-band`): the full-bleed QCM section ground; copy on it is white at 100 % (headline), 90 % (paragraph) or 85 % (captions).
- **Teal Night** (`teal-night`): the footer ground; copy uses `on-night-muted`.
- **Teal Wash / Teal Tint** (`teal-wash`, `teal-tint`): hover grounds on white buttons, the explanation box under a QCM answer, the progress ring track, the subject icon chip inside the lesson card.
- **Teal Soft / Teal Bright** (`teal-soft`, `teal-bright`): the QCM progress bar fill and the π scribble; never text.

### Secondary
- **Apricot** (`apricot`, `apricot-light`, `apricot-deep`): the pages, tassel and star of the mark, the 7 in « Naja7School », the ∑ and x² scribbles, the lesson card's video panel (as `#f2bb90`), the hero pulse dot, the `btn-accent` Premium button for logged-in free users, and (as `apricot-deep`, for contrast under white text) the « SANS ENGAGEMENT » badge.

### Tertiary
- **Cycle tints** (`tint-apricot`, `tint-sky`, `tint-lilac`, `tint-mint`): one pastel panel per cycle, in catalogue order (primaire, collège, lycée, supérieur). They carry `ink` headings, `on-tint` secondary text and a 100 px white-55 % numeral.
- **Success / Error** (`success`, `success-wash`, `error`, `error-wash`): QCM answer correction only.

### Neutral
- **Ink** (`ink`): all headings and primary text, including on the cycle tints and inside white cards.
- **Muted** (`muted`): every secondary text on white or cream: leads, descriptions, card metadata, level tags, placeholders, nav links (as `#637171`), the QCM header and result copy. It is the only secondary grey on light grounds.
- **On-tint / On-mint** (`on-tint`, `on-mint`): darker teal-greys for secondary text on the pastel cycle tints (`on-tint`) and the mint trust strip (`on-mint` for the sentence, `on-tint` for the bold claims), where `muted` would fall short of contrast.
- **Surface / Paper / White** (`surface`, `paper`, `white`): page ground, nav and concours cards, lifted cards.
- **Line / Line-field / Line-card** (`line`, `line-field`, `line-card`): nav border and mobile menu, search and input borders, catalogue card borders.
- **Mint / Mint Panel / Chip Ground** (`mint`, `mint-panel`, `chip-ground`): trust strip, Premium panel, idle filter chips and level tags.

### Named Rules
**The One Ink Rule.** Teal is the only colour that means "act". Apricot never sits on a primary button and never colours a link.
**The Teal Grey Rule.** Every grey on the surface leans teal (`muted`, `on-tint`, `line-*`). Blue-slate greys are drift, not system.
**The One Muted Rule.** Secondary text on white or cream is `muted` and nothing paler; on a pastel ground it steps down to `on-tint`; on teal it is white at 85–90 %.
**The One Band Rule.** A page carries at most one full-bleed deep-teal band; everything else stays on paper or in a tinted panel.

## Typography

**Display Font:** Outfit (500–800 loaded; with DM Sans, system-ui fallback)
**Body Font:** DM Sans (400–700 loaded; with system-ui fallback)
**Math:** KaTeX, rendered inline in the display face's context at 1.1 em where a formula is the hero (lesson card).

**Character:** Outfit's geometric, tightly tracked bold gives headlines and numerals a confident, friendly weight; DM Sans keeps running text plain and readable at small sizes on a phone. Numbers that matter (49 DH, 18/20, 6 780+) are always set in Outfit.

### Hierarchy
- **Display** (700, 44 → 52 → 61 px at sm/lg, 1.05, −0.03 em): the hero headline only, one highlighted word in teal.
- **Headline** (700, 34 → 40 px, 1.12, −0.03 em): every section lead-in, two lines with a hard break. On the teal band it steps to 36 → 45 px at 1.1.
- **Title** (600–700, 19–24 px, snug): card titles (19 semibold), cycle names (24 bold), concours names (23 bold).
- **Numeral** (700, 23 / 40 / 56 px, 1): stats on the band (23), the price (40), the QCM result (56). Units beside a numeral drop to DM Sans 13 px medium.
- **Lead** (400, 17 px, 1.65): the hero paragraph, max 460 px.
- **Body** (400, 13–15 px, 1.6): descriptions (14), QCM question answers (13), band paragraph (15). Max width 310–480 px beside a headline.
- **Label** (400–700, 11 px, 1.4–1.55): card metadata, level tags, stat captions, chip and tag text, the lesson card's reading bar. 11 px is the floor; bold 11 px with 1 px tracking appears only on the « NAJA7SCHOOL PREMIUM » product label.

### Named Rules
**The Outfit Numeral Rule.** Any number the visitor is meant to feel is set in Outfit bold; its unit is DM Sans, smaller and lighter.
**The Eleven-Pixel Floor Rule.** No text renders below 11 px. The only sub-floor glyphs are a numeral's unit suffix (« /20 ») and the ring's « % ».
**The Two-Line Headline Rule.** Section headlines are written as two short lines with an explicit break, never a wrapped paragraph.

## Layout

Content lives in a 1210 px max column with 20 px side padding (the nav and footer use 1280 px with 20 → 36 px). Sections stack vertically at 80 px padding on mobile and 100–105 px at `lg` (1024 px). Section headers are a two-column row at `lg`: headline left, a 310–450 px description or secondary link right-aligned to the baseline; they stack with 16–20 px gap below `lg`.

Grids: cycles 1 → 2 → 4 columns (sm 640, lg 1024) at 16 px gap; catalogue 1 → 2 → 3 at 16 px, capped at six cards below `lg` and nine at `lg`, followed by a centred outline « Voir toute la bibliothèque » button at 32 px; concours 1 → 3 at `md` (768) at 18 px. The hero is a 52 / 48 split at `lg` with 60 px gutter and a 610 px minimum height; below that the preview stacks under the copy at 390 px height. The teal band and the Premium panel are two-column at `lg` and stack centred below.

The nav is a sticky 78 px bar on `paper` at 95 % with backdrop blur, 12 px item gap on phones and 24 px from `md`; links hide below `lg`, search below `md`, and a hamburger opens an inline menu on `paper`. The footer is a single row (logo, tagline, links) that stacks on mobile.

## Elevation & Depth

Hybrid: tonal panels for grouping, teal-tinted blur shadows for lift. Flat elements (cycle tints, trust strip, Premium panel, band) sit in the page; white cards lift off the paper with a shadow whose colour is a dark teal, never neutral black. Rest shadows are reserved for hero and showcase cards; list cards gain their shadow only on hover with a 2–4 px rise.

### Shadow Vocabulary
- **Button lift** (`box-shadow: 0 5px 12px rgba(11,125,118,0.15)`): primary buttons in the nav, hero and Premium panel.
- **Card hover** (`box-shadow: 0 15px 28px rgba(43,75,66,0.12)` with `translateY(-2px)`): catalogue cards; concours cards use `0 14px 30px rgba(28,58,48,0.12)` and −4 px.
- **Showcase rest** (`box-shadow: 0 15px 35px rgba(50,83,76,0.12)`): the Premium price card.
- **Hero card** (`box-shadow: 0 22px 55px rgba(40,73,66,0.17)`): the tilted lesson card.
- **Float chip** (`box-shadow: 0 12px 30px rgba(40,73,66,0.15)`): the drifting « QCM terminé » and score cards.
- **On teal** (`box-shadow: 0 25px 50px rgba(8,70,66,0.33)`): the QCM panel on the band, where the shadow must read against dark teal.

### Named Rules
**The Teal Shadow Rule.** Shadow colour is always a teal-family rgba; offset is vertical only and blur is at least twice the offset.
**The Earned Lift Rule.** Only hero and showcase cards carry a shadow at rest; grid cards earn theirs on hover.

## Shapes

Softly rounded rectangles throughout, scaled to the element: 5 px tags, 7 px QCM controls and answer rows, 8 px outline and on-teal buttons, 9 px primary buttons and search fields, 10 px icon tiles, float chips and the Premium badge, 13 px panels (cycle, catalogue, QCM), 15 px the hero lesson card, 19 px the Premium band. Pills are reserved for filter chips, avatars, the play button and the progress ring. Borders are 1 px in a teal-grey (`line-card`, `line-field`, `#b8c9c3` on outline buttons); the progress ring is a 3 px teal-tint circle with a teal top segment. The hero lesson card is rotated −2°, the only tilted element. Ornament geometry is dashed circles (orbits, 330 / 380–450 px, border #cbd8d0) and a 600 px white-15 % circle bleeding off the teal band.

## Components

### Buttons
- **Shape:** softly rounded (9 px primary on the home page and nav; 8 px outline and on-teal; the shared `btn` utility defaults to 12 px and is overridden down on the new surfaces).
- **Primary:** teal ground, white text, 600 weight 14–15 px, 12–16 px vertical by 16–20 px horizontal, trailing 16–18 px arrow; hover to teal deep; carries the button-lift shadow when it is the surface's main call.
- **Accent:** apricot ground, ink text; hover to apricot light. Used for the Premium upsell in the nav only.
- **Outline:** transparent on cream, 1 px `#b8c9c3` border, 8 px radius, 13 px bold ink text, teal arrow, 12 × 14–16 px; hover ground white. Used for section-level secondary links (« Voir tout le supérieur », « Voir toute la bibliothèque »).
- **On teal:** white ground, teal text, 8 px radius; hover to teal wash.
- **Play link:** text link in ink with a 34 px white circle containing a filled play icon; hover text to teal.
- **Focus:** 2 px teal outline at 2 px offset (global `:focus-visible`). Disabled: 50 % opacity.

### Chips
- **Style:** pill, 12 px semibold, 8 × 14 px; idle on `chip-ground` with `muted` text, hover to teal tint.
- **State:** active is teal ground with white text (`aria-pressed`). Level tags are the 5 px, 11 px-text, non-interactive cousin in `muted` on `#f1f4f1`.

### Cards / Containers
- **Catalogue card:** 13 px radius, white, 1 px `line-card` border, 20 px padding; 42 px subject icon tile top-left, level tag top-right, 19 px Outfit title, 12 px `muted` subject line, 11 px `muted` meta row (lessons, duration, QCM) with 12 px Lucide icons above a top rule, bold 12 px teal link at the bottom.
- **Concours card:** as above on `paper`, 24 px padding, a 48 px tinted 10 px tile (mint, lavender or rose pairs) holding a 24 px Lucide icon, 11 px uppercase 0.5 px-tracked `muted` track label, 23 px title, 11 px `muted` tag list.
- **Cycle panel:** 13 px radius on one of the four tints, 20 px padding, 285 px minimum at `lg`, 28 px line icon, 11 px `on-tint` level count, 24 px Outfit name, 12 px `on-tint` description, a 100 px white-55 % Outfit numeral bleeding past the bottom right.
- **Showcase cards:** white, 14–15 px radius, 28 px padding, showcase-rest shadow (Premium) or hero shadow (lesson card). The Premium card wears an `apricot-deep` 10 px-text badge at its top-right edge.

### Inputs / Fields
- **Style:** white, 1 px `line-field` border, 9 px radius, 40 px (nav) or 48 px (catalogue) tall, teal search icon, 14 px ink text, `muted` placeholder, teal caret.
- **Focus:** border to teal bright plus a 2 px teal-bright 20 % ring.

### Navigation
- Sticky 78 px bar on `paper` 95 % with blur and a 1 px `line` bottom border. Logo: 48 × 40 px Naja7School mark (teal ink, apricot pages, tassel and star), 25 px Outfit wordmark « Naja7School » with an apricot 7. Links 14 px DM Sans medium in `#637171`, hover teal, active bold teal. Right side: 224 px search, « Se connecter » text link, primary « Commencer → ». Footer: `teal-night` ground, `on-night-muted` 14 px text, white logo, hover links to white.

### Lesson card (signature)
A 300–330 px white 15 px-radius card tilted −2° with the hero shadow: 11 px bold subject header with a teal-wash icon chip, a 190 px apricot (`#f2bb90`) panel carrying a pale ∿ glyph, the lesson's first KaTeX formula (or chapter title) in 17 px Outfit semibold `#286360`, and a white reading bar (book or play icon, 3 px progress line, « Lire · n min » at 11 px semibold); below, an 11 px two-line title with `muted` level line and a 38 px progress ring. Two drifting 10 px-radius chips (« QCM terminé ! », « 18/20 ») float beside it.

### QCM panel (signature)
A 385–400 px white 13 px-radius panel on the teal band with the on-teal shadow: 11 px `muted` header, 5 px progress bar (teal tint track, teal soft fill, 300 ms width), Outfit 18 px question, answer rows at 7 px radius with a teal letter prefix; selected rows go teal-bordered on `#ebf7f3`, corrected rows go success or error washes; explanation in teal wash with teal night text; full-width 7 px primary button. The result state shows a 56 px Outfit teal score with a `muted` denominator.

## Do's and Don'ts

### Do:
- **Do** set every headline and numeral in Outfit 700 with −0.03 em tracking, and every paragraph in DM Sans.
- **Do** tint shadows teal (`rgba(40,73,66,…)` family), vertical offset only, blur ≥ 2 × offset.
- **Do** keep `surface` as the page ground and lift content on white cards; use `paper` for the nav and quiet cards.
- **Do** use `muted` for all secondary text on white and cream, `on-tint` on pastel panels, and white at 85–90 % on teal.
- **Do** write section headlines as two short lines with a hard break.
- **Do** use 13 px for panels, 9 px for primary buttons and 8 px for outline buttons on new surfaces; reserve pills for chips, avatars and rings.
- **Do** gate ambient motion (orbit, drift, fade-up) behind `prefers-reduced-motion`.

### Don't:
- **Don't** use slate or blue-grey utilities for text, borders or shadows; every grey leans teal.
- **Don't** introduce a grey paler than `muted` for text, and don't set text below 11 px.
- **Don't** put apricot on a primary action or a link; it is warmth and punctuation only.
- **Don't** add a second full-bleed teal band to a page.
- **Don't** give grid cards a shadow at rest; they earn it on hover.
- **Don't** render icons as fonts or glyphs; use Lucide SVG line icons at 14–28 px.
- **Don't** invent stats, testimonials or user counts; every number shown is from `/api/home`.
