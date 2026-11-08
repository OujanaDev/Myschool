import { prisma, wrap } from "./lib.js";
import { OPEN_CYCLES } from "./comingSoon.js";

// /sitemap.xml, built from the database because the catalogue changes with every import. It lists only the pages a
// visitor without an account can read: open cycles, published and free content, no seed placeholder. Premium lessons
// show a paywall and "Bientôt disponible" cycles a notice, which search engines treat as thin pages.

export const SITE_URL = (process.env.APP_URL || "https://naja7school.com").replace(/\/+$/, "");
const CACHE_MS = 60 * 60 * 1000;
const STATIC_PAGES = ["/", "/explorer", "/premium", "/confidentialite"];
export const PLACEHOLDER_MARKERS = [
  "Ce cours est en cours de rédaction par l'équipe pédagogique",
  "*Corrigé détaillé disponible prochainement.*",
  "*Contenu premium en cours de rédaction.*",
];

const entry = (path: string, lastmod?: Date) => {
  const loc = (SITE_URL + encodeURI(path)).replace(/&/g, "&amp;");
  return `<url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : ""}</url>`;
};

async function buildSitemap() {
  const inOpenCycle = { levelSubject: { level: { cycle: { slug: { in: OPEN_CYCLES } } } } };
  const place = { chapter: { select: { levelSubject: { select: { level: { select: { slug: true } }, subject: { select: { slug: true } } } } } } };
  const [lessons, quizzes] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        isPublished: true,
        isPremium: false,
        content: { not: "" },
        NOT: PLACEHOLDER_MARKERS.map((marker) => ({ content: { contains: marker } })),
        chapter: inOpenCycle,
      },
      select: { id: true, updatedAt: true, ...place },
      orderBy: { id: "asc" },
    }),
    prisma.quiz.findMany({
      where: { isPublished: true, isPremium: false, questions: { some: {} }, chapter: inOpenCycle },
      select: { id: true, ...place },
      orderBy: { id: "asc" },
    }),
  ]);

  // A level or subject page is listed once it holds at least one listed lesson or QCM.
  const catalogue = new Map<string, Date | undefined>();
  const addPage = (path: string, updatedAt?: Date) => {
    const known = catalogue.get(path);
    catalogue.set(path, known && (!updatedAt || known > updatedAt) ? known : updatedAt ?? known);
  };
  const addPlace = ({ chapter }: (typeof quizzes)[number], updatedAt?: Date) => {
    const { level, subject } = chapter.levelSubject;
    addPage(`/niveau/${level.slug}`, updatedAt);
    addPage(`/niveau/${level.slug}/${subject.slug}`, updatedAt);
  };
  for (const lesson of lessons) addPlace(lesson, lesson.updatedAt);
  for (const quiz of quizzes) addPlace(quiz);

  // Quiz has no updatedAt and a refreshed QCM keeps its createdAt: no <lastmod> rather than a wrong one.
  const urls = [
    ...STATIC_PAGES.map((path) => entry(path)),
    ...[...catalogue].map(([path, updatedAt]) => entry(path, updatedAt)),
    ...lessons.map((l) => entry(`/cours/${l.id}`, l.updatedAt)),
    ...quizzes.map((q) => entry(`/qcm/${q.id}`)),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

let cache: { at: number; xml: Promise<string> } | null = null;

function cachedSitemap() {
  if (!cache || Date.now() - cache.at > CACHE_MS) {
    const fresh = { at: Date.now(), xml: buildSitemap() };
    cache = fresh;
    fresh.xml.catch(() => {
      if (cache === fresh) cache = null; // a failed build is not kept for an hour
    });
  }
  return cache.xml;
}

export const sitemapHandler = wrap(async (_req, res) => {
  const xml = await cachedSitemap();
  res.type("application/xml").setHeader("Cache-Control", "public, max-age=3600");
  res.send(xml);
});
