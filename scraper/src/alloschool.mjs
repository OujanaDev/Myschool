#!/usr/bin/env node
/**
 * Adaptateur AlloSchool (www.alloschool.com) : explore une catégorie (ex. Lycée), ses sous-catégories
 * (niveaux / filières), leurs cours (matières), les chapitres (thèmes) et les documents PDF.
 *
 *   npm run alloschool -- discover <url-categorie|url-cours>     construit / complète le manifeste (arborescence + documents)
 *   npm run alloschool -- download [filtres] [options]            télécharge les PDF du manifeste et extrait le texte
 *   npm run alloschool -- status                                  avancement (catégories, cours, documents, téléchargés)
 *   npm run alloschool -- list <url-cours>                        chapitres + documents d'un cours, sans rien enregistrer
 *
 * Filtres (expressions régulières, insensibles à la casse) :
 *   --category "<regex>"   sur le chemin de catégorie (ex. "2ème Bac.*Physiques")
 *   --course "<regex>"     sur le titre du cours (ex. "Math")
 *   --chapter "<regex>"    sur le chapitre ou le titre du document
 *   --type COURSE|SUMMARY|EXERCISE|EXAM  --max <n> (documents)   --limit-courses <n>
 * Options : --videos (URL YouTube des vidéos gratuites)  --no-text (PDF seulement)  --force  --refresh (discover : re-lit les cours déjà connus)
 *
 * Dépôt : repository/alloschool/<catégorie…>/<cours>/<chapitre>/<document>.md + .pdf, et manifeste repository/alloschool/manifest.json.
 * Le robots.txt du site impose 10 s entre requêtes : ~15 s par document, ~10 s par page explorée.
 * Les documents sont « © AlloSchool — Tous droits réservés » : rangés pour référence, refusés par `npm run import` sans --allow-reserved.
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import { fetchBinary, fetchHtml } from "./fetcher.mjs";
import { extract } from "./extract.mjs";
import { pdfToMarkdown } from "./pdf.mjs";
import { ROOT, findEntry, loadIndex, saveCourse, saveIndex } from "./repository.mjs";
import { fold, idForUrl, log, slugify, wordCount } from "./util.mjs";

const SITE = "https://www.alloschool.com";
const RIGHTS = "© AlloSchool — Tous droits réservés (usage de référence uniquement)";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ALLO_DIR = path.join(ROOT, "alloschool");
const MANIFEST = path.join(ALLO_DIR, "manifest.json");
const MAP = JSON.parse(fs.readFileSync(path.join(HERE, "..", "alloschool-map.json"), "utf8"));

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    category: { type: "string" },
    course: { type: "string" },
    chapter: { type: "string" },
    type: { type: "string" },
    max: { type: "string" },
    "limit-courses": { type: "string" },
    videos: { type: "boolean", default: false },
    "no-text": { type: "boolean", default: false },
    force: { type: "boolean", default: false },
    refresh: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

const [command, arg] = positionals;
const usage = () => console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0].replace(/^(#!.*\n)?\/\*\*?/, ""));
if (opts.help || !["discover", "download", "status", "list"].includes(command)) {
  usage();
  process.exit(opts.help ? 0 : 1);
}

// ---------- helpers ----------

const text = ($el) => $el.text().replace(/\s+/g, " ").trim();
const elementId = (href) => (String(href || "").match(/\/element\/(\d+)/) || [])[1] || null;
const canon = (href) => {
  const u = new URL(href, SITE);
  u.search = "";
  u.hash = "";
  return u.href.replace(/\/$/, "");
};
const lastSlug = (url) => url.split("/").filter(Boolean).pop();
const regex = (s) => (s ? new RegExp(s, "i") : null);

function guessType(title) {
  const t = fold(title);
  if (/examen|concours|\bbac\b|national|rattrapage|session|امتحان|الوطني|الجهوي|مباراة/.test(t)) return "EXAM";
  if (/exercice|serie|devoir|controle|\btd\b|evaluation|qcm|تمرين|تمارين|سلسلة|فرض|مراقبة|تقويم/.test(t)) return "EXERCISE";
  if (/resume|fiche|formulaire|lexique|memo|synthese|sommaire|ملخص|جذاذة|معجم/.test(t)) return "SUMMARY";
  return "COURSE";
}

function mapLevel(categoryUrl, fallbackTitle) {
  return MAP.categories[lastSlug(categoryUrl)] || slugify(fallbackTitle);
}
function mapSubject(courseTitle) {
  const t = fold(courseTitle);
  for (const [key, slug] of Object.entries(MAP.subjects)) if (t.includes(key)) return slug;
  return slugify(courseTitle);
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST)) return { categories: {}, courses: {} };
  return JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
}
function saveManifest(m) {
  fs.mkdirSync(ALLO_DIR, { recursive: true });
  m.updatedAt = new Date().toISOString();
  fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + "\n");
}

// ---------- parsing ----------

/** Category page: direct sub-categories (with their embedded sub-tree) and courses. */
function parseCategory($) {
  const title = text($(".main-content h1").first()) || text($("h1").first()) || text($("title")).replace(/\s*-\s*AlloSchool.*$/, "");
  const main = $(".main-content");
  const walk = (ul) =>
    ul
      .children("li.category-u")
      .map((_, li) => {
        const a = $(li).children("a.t").first();
        return {
          url: canon(a.attr("href")),
          title: text(a.find("h2, h3, h4").first()) || text(a) || a.attr("title") || "",
          children: $(li)
            .children("ul.ul-timeline")
            .map((_, u) => walk($(u)))
            .get()
            .flat(),
        };
      })
      .get();
  const children = walk(main.children("ul.ul-timeline").first());
  const courses = [];
  const seen = new Set();
  main.find("a[href*='/course/']").each((_, a) => {
    const href = canon($(a).attr("href"));
    const t = text($(a));
    if (seen.has(href) || !t || /\/course\/vocabulary$/.test(href)) return;
    seen.add(href);
    courses.push({ url: href, title: t });
  });
  return { title, children, courses };
}

/**
 * Course page. Two layouts coexist: free sections (<li id="sections-N"> with an <h2> title and element links)
 * and a "premium" table (chapter rows h4.prm-head, then séance rows with Doc / PDF / Vidéo links).
 */
function parseCourse($) {
  const title = text($("h1").first()) || text($("title")).replace(/\s*-\s*AlloSchool.*$/, "");
  const crumbs = $(".breadcrumb li").map((_, li) => text($(li))).get().filter(Boolean);
  const items = [];
  const seen = new Set();
  const push = (item) => {
    if (!item.id || seen.has(item.id)) return;
    seen.add(item.id);
    items.push(item);
  };
  $("li[id^='sections-']").each((_, section) => {
    const chapter = text($(section).find("h2").first());
    $(section)
      .find("ul.section-elements > li.element > a[href*='/element/']")
      .each((_, a) => {
        const $a = $(a);
        if ($a.find(".mdi-youtube, .mdi-video, .mdi-play").length) return;
        push({ id: elementId($a.attr("href")), title: text($a), chapter, pdfUrl: null, needsElementPage: true, videoId: null, videoFree: false });
      });
  });
  let chapter = "";
  $("table tr").each((_, tr) => {
    const $tr = $(tr);
    const head = $tr.find("h4.prm-head");
    if (head.length) {
      chapter = text(head).replace(/^chapitre\s*\d+\s*:\s*/i, "");
      return;
    }
    const pdfLink = $tr.find("a[href*='/element/'][href$='/pdf']").first();
    if (!pdfLink.length) return;
    const videoLink = $tr
      .find("a[href*='/element/']")
      .filter((_, a) => /vid/i.test(text($(a))))
      .first();
    push({
      id: elementId(pdfLink.attr("href")),
      title: text($tr.find("td").first()),
      chapter,
      pdfUrl: new URL(pdfLink.attr("href"), SITE).href,
      needsElementPage: false,
      videoId: videoLink.length ? elementId(videoLink.attr("href")) : null,
      videoFree: videoLink.length ? /\*/.test(text(videoLink)) : false, // asterisk = free video on AlloSchool
    });
  });
  // Breadcrumb ends with "… / <level> / <course>": the level is the penultimate crumb.
  return { title, level: (crumbs.length >= 2 ? crumbs.at(-2) : crumbs.at(-1)) || "", items };
}

/** Element page: direct PDF link and/or YouTube embed. */
function parseElement($) {
  const pdf = $("a[href$='.pdf'], a[href*='.pdf?']").first().attr("href") || null;
  const yt = $("iframe[src*='youtube.com/embed/'], iframe[src*='youtu.be/']").first().attr("src") || "";
  const vid = (yt.match(/embed\/([\w-]+)/) || [])[1];
  return { pdfUrl: pdf ? new URL(pdf, SITE).href : null, videoUrl: vid ? `https://www.youtube.com/watch?v=${vid}` : null };
}

async function loadPage(url) {
  return cheerio.load((await fetchHtml(url)).html);
}

// ---------- discover ----------

async function discover(startUrl) {
  const manifest = loadManifest();
  const start = canon(startUrl);
  const queue = [];

  const registerCategory = (url, title, parentUrl) => {
    const parent = parentUrl ? manifest.categories[parentUrl] : null;
    const existing = manifest.categories[url];
    const resolvedTitle = title || existing?.title || lastSlug(url);
    manifest.categories[url] = {
      ...(existing || {}),
      url,
      title: resolvedTitle,
      slug: lastSlug(url),
      parent: parentUrl || existing?.parent || null,
      path: parent ? [...parent.path, resolvedTitle] : [resolvedTitle],
      children: existing?.children || [],
      courses: existing?.courses || [],
      fetchedAt: existing?.fetchedAt || null,
    };
    return manifest.categories[url];
  };

  if (/\/course\//.test(start)) {
    queue.push({ kind: "course", url: start, categoryUrl: null });
  } else {
    registerCategory(start, null, null);
    queue.push({ kind: "category", url: start });
  }

  let pages = 0;
  let coursesRead = 0;
  while (queue.length) {
    const job = queue.shift();
    try {
      if (job.kind === "category") {
        const cat = manifest.categories[job.url];
        if (cat.fetchedAt && !opts.refresh) {
          for (const c of cat.children) queue.push({ kind: "category", url: c });
          for (const c of cat.courses) queue.push({ kind: "course", url: c, categoryUrl: job.url });
          continue;
        }
        log(`→ catégorie ${cat.path.join(" / ")}`);
        const page = parseCategory(await loadPage(job.url));
        pages++;
        if (!cat.title || cat.title === cat.slug) {
          cat.title = page.title || cat.title;
          cat.path = [...(cat.parent ? manifest.categories[cat.parent].path : []), cat.title];
        }
        const addTree = (nodes, parentUrl) => {
          for (const n of nodes) {
            const parent = manifest.categories[parentUrl];
            if (!parent.children.includes(n.url)) parent.children.push(n.url);
            registerCategory(n.url, n.title, parentUrl);
            addTree(n.children, n.url);
          }
        };
        addTree(page.children, job.url);
        for (const c of page.courses) {
          if (!cat.courses.includes(c.url)) cat.courses.push(c.url);
          const known = manifest.courses[c.url] || { url: c.url, title: c.title };
          // Parent pages (e.g. "Tronc Commun") also list their children's courses: the deepest category wins.
          const current = known.categoryUrl ? manifest.categories[known.categoryUrl] : null;
          if (!current || current.path.length < cat.path.length) {
            known.categoryUrl = job.url;
            if (known.items) {
              known.path = cat.path;
              known.level = mapLevel(cat.url, cat.title);
            }
          }
          manifest.courses[c.url] = known;
        }
        cat.fetchedAt = new Date().toISOString();
        saveManifest(manifest);
        log(`  ${page.children.length} sous-catégorie(s), ${page.courses.length} cours`);
        for (const c of cat.children) queue.push({ kind: "category", url: c });
        for (const c of cat.courses) queue.push({ kind: "course", url: c, categoryUrl: job.url });
      } else {
        const known = manifest.courses[job.url];
        if (known?.fetchedAt && !opts.refresh) continue;
        if (opts["limit-courses"] && coursesRead >= Number(opts["limit-courses"])) continue;
        const $ = await loadPage(job.url);
        pages++;
        coursesRead++;
        const course = parseCourse($);
        const categoryUrl = known?.categoryUrl || job.categoryUrl; // the manifest holds the deepest category seen so far
        const cat = categoryUrl ? manifest.categories[categoryUrl] : null;
        manifest.courses[job.url] = {
          url: job.url,
          title: course.title || known?.title || lastSlug(job.url),
          shortTitle: known?.title || course.title,
          categoryUrl,
          path: cat ? cat.path : [course.level].filter(Boolean),
          level: cat ? mapLevel(cat.url, cat.title) : "non-classe",
          subject: mapSubject(known?.title || course.title),
          lang: /[؀-ۿ]/.test(course.title) ? "ar" : "fr", // Arabic-programme courses have an Arabic heading
          items: course.items,
          fetchedAt: new Date().toISOString(),
        };
        saveManifest(manifest);
        log(`✓ cours ${manifest.courses[job.url].path.join(" / ")} / ${manifest.courses[job.url].shortTitle} — ${course.items.length} document(s)`);
      }
    } catch (err) {
      log(`✗ ${job.url} : ${err.message}`);
    }
  }
  saveManifest(manifest);
  status(manifest);
}

// ---------- download ----------

function selectDocuments(manifest, index) {
  const reCat = regex(opts.category);
  const reCourse = regex(opts.course);
  const reChap = regex(opts.chapter);
  const type = opts.type ? opts.type.toUpperCase() : null;
  const docs = [];
  for (const course of Object.values(manifest.courses)) {
    if (!course.items) continue;
    const catPath = (course.path || []).join(" / ");
    if (reCat && !reCat.test(catPath)) continue;
    if (reCourse && !reCourse.test(course.shortTitle || course.title)) continue;
    for (const it of course.items) {
      if (reChap && !reChap.test(it.chapter) && !reChap.test(it.title)) continue;
      if (type && guessType(it.title) !== type) continue;
      docs.push({ course, it, existing: findEntry(index, `${SITE}/element/${it.id}`) });
    }
  }
  return docs;
}

/** Strips AlloSchool page chrome from an element page and flattens its "timeline" list so the exercises read as sections. */
function cleanElementHtml(html) {
  const $ = cheerio.load(html);
  const main = $(".main-content.element");
  main.find(".list-inline, .icon, .anchor, .breadcrumb, a[href*='sharer.php'], a[href*='twitter.com/share'], audio, .modal").remove();
  main.find("a").filter((_, a) => /^(retour|back)$/i.test($(a).text().trim())).remove();
  main.find("input[type=hidden], .exam-timer, .countdown").remove();
  main.find("ul.ul-timeline").each((_, ul) => {
    $(ul).children("li").each((_, li) => $(li).replaceWith(`<div>${$(li).html() || ""}</div>`));
    $(ul).replaceWith(`<div>${$(ul).html() || ""}</div>`);
  });
  return $.html();
}

function baseEntry(course, it, existing, elementUrl, dir, slug) {
  return {
    id: existing?.id || idForUrl(elementUrl),
    url: elementUrl,
    finalUrl: elementUrl,
    site: "alloschool",
    category: (course.path || []).join(" / "),
    course: course.shortTitle || course.title,
    sourceCourse: course.url,
    title: it.title,
    slug,
    dir,
    level: course.level || "non-classe",
    subject: course.subject || "non-classe",
    chapter: it.chapter || course.shortTitle || course.title,
    type: guessType(it.title),
    tags: ["alloschool", ...(course.path || [])],
    lang: course.lang || "fr",
    license: RIGHTS,
    rights: "reserved",
    description: `${course.title} — ${it.chapter || ""}`.trim(),
    fetchedAt: new Date().toISOString(),
    importedLessonId: existing?.importedLessonId || null,
  };
}

async function download() {
  const manifest = loadManifest();
  const index = loadIndex();
  let docs = selectDocuments(manifest, index);
  const total = docs.length;
  const present = docs.filter((d) => d.existing).length;
  if (!opts.force) docs = docs.filter((d) => !d.existing);
  const max = Number(opts.max || 0);
  if (max > 0) docs = docs.slice(0, max);
  log(`${total} document(s) sélectionné(s), ${present} déjà présent(s), ${docs.length} à télécharger (~${Math.round((docs.length * 15) / 60)} min)`);

  let ok = 0;
  let failed = 0;
  for (const { course, it, existing } of docs) {
    const elementUrl = `${SITE}/element/${it.id}`;
    const dir = ["alloschool", ...(course.path || []).map(slugify), slugify(course.shortTitle || course.title), slugify(it.chapter || "general")].join("/");
    log(`→ ${(course.path || []).join(" / ")} / ${course.shortTitle} / ${it.chapter || "—"} / ${it.title}`);
    try {
      let pdfUrl = it.pdfUrl;
      let videoUrl = null;
      let elementHtml = null;
      if (it.needsElementPage) {
        elementHtml = (await fetchHtml(elementUrl)).html;
        const page = parseElement(cheerio.load(elementHtml));
        pdfUrl = page.pdfUrl;
        videoUrl = page.videoUrl;
      }
      // The element id keeps file names unique: titles repeat within a course ("Doc", "Série 1"…).
      const slug = existing?.slug || `${slugify(it.title).slice(0, 70)}-${it.id}`;
      const absDir = path.join(ROOT, ...dir.split("/"));

      if (!pdfUrl) {
        // No PDF: some elements (online exams, exercises with solutions) are HTML pages with MathML formulas.
        if (!elementHtml) elementHtml = (await fetchHtml(elementUrl)).html;
        const page = extract(cleanElementHtml(elementHtml), elementUrl, { root: ".main-content.element" });
        if (wordCount(page.markdown) < 30) throw new Error("aucun PDF ni texte sur cette page");
        const entry = {
          ...baseEntry(course, it, existing, elementUrl, dir, slug),
          format: "html",
          video: videoUrl,
          words: wordCount(page.markdown),
        };
        entry.file = saveCourse(entry, `> Page d'origine : ${elementUrl} (contenu HTML, formules converties en LaTeX).\n\n${page.markdown}`);
        if (existing) Object.assign(existing, entry);
        else index.entries.push(entry);
        saveIndex(index);
        log(`✓ page HTML, ${entry.words} mots → repository/${entry.file}${videoUrl ? " + vidéo" : ""}`);
        ok++;
        continue;
      }

      const file = await fetchBinary(pdfUrl);
      if (!file.buffer.subarray(0, 5).toString().startsWith("%PDF")) throw new Error(`le lien ne renvoie pas un PDF (${file.contentType})`);

      fs.mkdirSync(absDir, { recursive: true });
      const pdfPath = path.join(absDir, `${slug}.pdf`);
      fs.writeFileSync(pdfPath, file.buffer);

      let markdown = "";
      let pages = 0;
      if (!opts["no-text"]) {
        try {
          ({ markdown, pages } = await pdfToMarkdown(file.buffer));
        } catch (err) {
          log(`  ! texte non extrait (${err.message}) — PDF conservé`);
        }
      }
      if (opts.videos && it.videoId && it.videoFree && !videoUrl) {
        try {
          videoUrl = parseElement(await loadPage(`${SITE}/element/${it.videoId}`)).videoUrl;
        } catch (err) {
          log(`  ! vidéo non relevée : ${err.message}`);
        }
      }

      const relPdf = `${dir}/${slug}.pdf`;
      const note = `> Document PDF d'origine : ${relPdf} (${pages || "?"} page(s)). Les formules mathématiques, rendues en images dans le PDF, ne sont pas toutes reprises dans ce texte.\n\n`;
      const entry = {
        ...baseEntry(course, it, existing, elementUrl, dir, slug),
        format: "pdf",
        pdf: relPdf,
        pdfUrl,
        pdfPages: pages,
        video: videoUrl,
        words: wordCount(markdown),
      };
      entry.file = saveCourse(entry, note + (markdown || "_Texte non extrait : voir le PDF._"));
      if (existing) Object.assign(existing, entry);
      else index.entries.push(entry);
      saveIndex(index);
      log(`✓ ${pages} page(s), ${entry.words} mots → repository/${entry.file}${videoUrl ? " + vidéo" : ""}`);
      ok++;
    } catch (err) {
      log(`✗ ${it.title} : ${err.message}`);
      failed++;
    }
  }
  log(`Terminé : ${ok} téléchargé(s), ${failed} échec(s). Dépôt : ${index.entries.length} documents.`);
  process.exit(failed && !ok ? 1 : 0);
}

// ---------- status / list ----------

function status(manifest = loadManifest()) {
  const index = loadIndex();
  const have = new Set(index.entries.filter((e) => e.site === "alloschool").map((e) => e.url));
  const cats = Object.values(manifest.categories);
  const courses = Object.values(manifest.courses);
  const rows = [];
  let totalDocs = 0;
  let totalHave = 0;
  for (const c of courses) {
    const n = c.items?.length || 0;
    const h = (c.items || []).filter((it) => have.has(`${SITE}/element/${it.id}`)).length;
    totalDocs += n;
    totalHave += h;
    if (n) rows.push({ catégorie: (c.path || []).join(" / "), cours: c.shortTitle || c.title, chapitres: new Set(c.items.map((i) => i.chapter)).size, documents: n, téléchargés: h });
  }
  console.log(`Catégories : ${cats.length} (${cats.filter((c) => c.fetchedAt).length} explorées) · Cours : ${courses.length} (${courses.filter((c) => c.fetchedAt).length} lus) · Documents : ${totalDocs} (${totalHave} téléchargés)`);
  if (rows.length) console.table(rows);
  if (!cats.length) console.log("Manifeste vide : lancez `npm run alloschool -- discover https://www.alloschool.com/category/high-school`.");
}

async function list(courseUrl) {
  const course = parseCourse(await loadPage(courseUrl));
  console.log(`${course.title} — ${course.items.length} document(s)`);
  let last = null;
  for (const it of course.items) {
    if (it.chapter !== last) {
      console.log(`\n# ${it.chapter || "(sans chapitre)"}`);
      last = it.chapter;
    }
    console.log(`  [${it.id}] ${it.title}  ${it.pdfUrl ? "PDF" : "doc"}${it.videoId ? it.videoFree ? " + vidéo gratuite" : " + vidéo (premium)" : ""}`);
  }
}

// ---------- main ----------

if (command === "discover") {
  if (!arg || !/^https?:\/\/(www\.)?alloschool\.com\/(category|course)\//.test(arg)) {
    console.error("discover attend une URL de catégorie ou de cours AlloSchool.");
    process.exit(1);
  }
  await discover(arg);
} else if (command === "download") {
  await download();
} else if (command === "status") {
  status();
} else if (command === "list") {
  if (!arg || !/\/course\//.test(arg)) {
    console.error("list attend une URL de cours AlloSchool.");
    process.exit(1);
  }
  await list(arg);
}
