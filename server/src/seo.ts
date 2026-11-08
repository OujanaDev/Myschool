import fs from "node:fs/promises";
import type { RequestHandler } from "express";
import { prisma, wrap } from "./lib.js";
import { isComingSoon } from "./comingSoon.js";
import { PLACEHOLDER_MARKERS, SITE_URL } from "./sitemap.js";

// The site is a single-page app: without this, every URL answers 200 with the same <title> and description. The
// server knows the page from its URL, so it writes its title, description and canonical URL into index.html, and
// answers 404 for what does not exist. The app still renders on a 404 (an admin can preview an unpublished lesson;
// an unknown URL is sent back to the home page by the router).

type PageMeta = { status: number; title?: string; description?: string; canonical?: string; noindex?: boolean };

const SITE_NAME = "Naja7School";
const DESCRIPTION_LENGTH = 155;
const NOT_FOUND: PageMeta = { status: 404, noindex: true };
const LESSON_TYPES: Record<string, string> = { COURSE: "Cours", SUMMARY: "Résumé", EXERCISE: "Exercices corrigés", EXAM: "Examen corrigé", VIDEO: "Cours en vidéo" };

const STATIC_PAGES: Record<string, Pick<PageMeta, "title" | "description">> = {
  "/": {},
  "/explorer": { title: `Explorer les cours par niveau | ${SITE_NAME}`, description: "Tous les niveaux et toutes les matières du lycée marocain : cours, résumés, exercices corrigés et QCM, du tronc commun au 2ème Bac." },
  "/premium": { title: `Offre Premium | ${SITE_NAME}`, description: "Accédez à tous les cours, résumés et exercices corrigés du programme marocain avec l'offre Premium de Naja7School." },
  "/confidentialite": { title: `Politique de confidentialité | ${SITE_NAME}`, description: "Quelles données Naja7School collecte, pourquoi, combien de temps elles sont conservées, et quels sont vos droits." },
};
// Real pages of the app, of no use in a search result (also listed in robots.txt).
const PRIVATE_PAGE = /^\/(admin(\/.*)?|tableau-de-bord|plan-etude|profil|connexion|inscription|recherche|labo|embed\/lecon)$/;

const clip = (text: string) => (text.length <= DESCRIPTION_LENGTH ? text : `${text.slice(0, DESCRIPTION_LENGTH).replace(/\s+\S*$/, "")}…`);

/** The first plain paragraph of a lesson, or "" when it opens with headings, boxes and formulas only. */
function excerpt(markdown: string) {
  const text = markdown.replace(/```[\s\S]*?```/g, "").replace(/<!--[\s\S]*?-->/g, "").replace(/\$\$[\s\S]*?\$\$/g, "");
  for (const block of text.split(/\n\s*\n/)) {
    const line = block.replace(/\s+/g, " ").trim();
    if (!/^[\p{L}«]/u.test(line)) continue; // headings, boxes, tables, lists, figures
    const plain = line
      .replace(/<\/?(?:sup|sub|br|em|strong|u|i|b)\s*\/?>/g, "")
      .replace(/\$([^$\\{}^_]{1,12})\$/g, "$1") // a short formula reads as text ($f$); any other rules the paragraph out
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*`]/g, "");
    if (plain.length >= 80 && !plain.includes("$")) return plain;
  }
  return "";
}

async function dynamicPage(path: string): Promise<PageMeta | null> {
  const page = /^\/(niveau|cours|qcm)\/([^/]+)(?:\/([^/]+))?$/.exec(path);
  if (!page) return null;
  const [, kind, id, subjectSlug] = page;

  if (kind === "niveau" && !subjectSlug) {
    const level = await prisma.level.findUnique({ where: { slug: id }, include: { cycle: true } });
    if (!level) return NOT_FOUND;
    return {
      status: 200,
      canonical: path,
      noindex: isComingSoon(level.cycle.slug),
      title: `${level.name} : cours, résumés et QCM | ${SITE_NAME}`,
      description: `${level.name} : cours, résumés, exercices corrigés et QCM par matière, conformes au programme marocain.`,
    };
  }
  if (kind === "niveau") {
    const row = await prisma.levelSubject.findFirst({
      where: { level: { slug: id }, subject: { slug: subjectSlug } },
      include: { level: { include: { cycle: true } }, subject: true },
    });
    if (!row) return NOT_FOUND;
    return {
      status: 200,
      canonical: path,
      noindex: isComingSoon(row.level.cycle.slug),
      title: `${row.subject.name} ${row.level.shortName} : cours, exercices et QCM | ${SITE_NAME}`,
      description: `${row.subject.name} en ${row.level.name} : tous les chapitres avec cours, résumés, exercices corrigés et QCM, conformes au programme marocain.`,
    };
  }
  if (subjectSlug) return NOT_FOUND;

  const place = {
    chapter: { select: { title: true, levelSubject: { select: { level: { select: { name: true, shortName: true, cycle: { select: { slug: true } } } }, subject: { select: { name: true } } } } } },
  };
  if (kind === "cours") {
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      select: { title: true, type: true, content: true, isPremium: true, isPublished: true, ...place },
    });
    if (!lesson?.isPublished) return NOT_FOUND;
    const { level, subject } = lesson.chapter.levelSubject;
    const { content } = lesson;
    return {
      status: 200,
      canonical: path,
      noindex: isComingSoon(level.cycle.slug) || PLACEHOLDER_MARKERS.some((marker) => content.includes(marker)),
      title: `${lesson.title} | ${level.shortName} | ${SITE_NAME}`,
      // Exercises open on a statement, and a Premium lesson's text is not given away.
      description:
        (lesson.type !== "EXERCISE" && !lesson.isPremium && excerpt(content)) ||
        `${LESSON_TYPES[lesson.type] ?? "Cours"} de ${subject.name}, ${level.name} : ${lesson.chapter.title}. Conforme au programme marocain.`,
    };
  }
  const quiz = await prisma.quiz.findUnique({
    where: { id },
    select: { title: true, isPublished: true, ...place, _count: { select: { questions: true } } },
  });
  if (!quiz?.isPublished) return NOT_FOUND;
  const { level, subject } = quiz.chapter.levelSubject;
  return {
    status: 200,
    canonical: path,
    noindex: isComingSoon(level.cycle.slug) || quiz._count.questions === 0,
    title: `${quiz.title} | ${level.shortName} | ${SITE_NAME}`,
    description: `QCM de ${quiz._count.questions} questions sur ${quiz.chapter.title}, ${subject.name}, ${level.name} : testez vos connaissances et préparez vos examens.`,
  };
}

async function pageMeta(rawPath: string): Promise<PageMeta> {
  const path = rawPath.replace(/\/+$/, "") || "/";
  if (STATIC_PAGES[path]) return { status: 200, canonical: path, ...STATIC_PAGES[path] };
  if (PRIVATE_PAGE.test(path)) return { status: 200, noindex: true };
  return (await dynamicPage(path)) ?? NOT_FOUND;
}

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function applyMeta(html: string, meta: PageMeta) {
  let page = html;
  // Replacer functions: a title may contain "$", which a replacement string would interpret.
  if (meta.title) {
    const title = escapeHtml(meta.title);
    page = page
      .replace(/<title>[^<]*<\/title>/, () => `<title>${title}</title>`)
      .replace(/<meta property="og:title" content="[^"]*"/, () => `<meta property="og:title" content="${title}"`);
  }
  if (meta.description) {
    const description = escapeHtml(clip(meta.description));
    page = page
      .replace(/<meta name="description" content="[^"]*"/, () => `<meta name="description" content="${description}"`)
      .replace(/<meta property="og:description" content="[^"]*"/, () => `<meta property="og:description" content="${description}"`);
  }
  const url = meta.canonical && !meta.noindex ? escapeHtml(SITE_URL + (meta.canonical === "/" ? "/" : encodeURI(decodeURI(meta.canonical)))) : "";
  const extra = meta.noindex ? `<meta name="robots" content="noindex" />` : url ? `<link rel="canonical" href="${url}" />\n    <meta property="og:url" content="${url}" />` : "";
  return extra ? page.replace("</head>", () => `  ${extra}\n  </head>`) : page;
}

/** Sends the app's index.html with the title, description, canonical URL and status of the requested page. */
export const servePage = (indexFile: string): RequestHandler =>
  wrap(async (req, res) => {
    const html = await fs.readFile(indexFile, "utf8");
    let meta: PageMeta = { status: 200 };
    try {
      meta = await pageMeta(req.path);
    } catch (err) {
      console.error("SEO :", err); // the page still has to open, with the default title
    }
    res.status(meta.status).setHeader("Cache-Control", "no-cache");
    res.type("html").send(applyMeta(html, meta));
  });

// www.naja7school.com answers the same pages as naja7school.com: a permanent redirect leaves one address per page.
// The API is left out: a redirect would turn a POST into a GET for a client calling it on www.
const WWW_HOST = `www.${SITE_URL.replace(/^https?:\/\//, "")}`;
export const redirectWww: RequestHandler = (req, res, next) => {
  const isPage = (req.method === "GET" || req.method === "HEAD") && !req.path.startsWith("/api");
  if (isPage && req.headers.host?.toLowerCase() === WWW_HOST) return res.redirect(301, SITE_URL + req.originalUrl);
  next();
};
