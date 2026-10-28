import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { MathMLToLaTeX } from "mathml-to-latex";

// Elements that are never part of the course text.
const NOISE = [
  "script", "style", "noscript", "iframe", "svg", "canvas", "button", "input", "select", "textarea",
  "nav", "header", "footer", "aside", "template",
  "[role=navigation]", "[role=banner]", "[role=contentinfo]", "[role=complementary]", "[aria-hidden=true]",
  ".sidebar", ".menu", ".navbar", ".breadcrumb", ".breadcrumbs", ".ads", ".ad", ".advert", ".cookie",
  ".comments", ".comment", ".share", ".social", ".related", ".pagination", ".toc", "#toc", ".noprint",
  // Wikipedia / MediaWiki chrome
  ".mw-editsection", ".mw-jump-link", ".navbox", ".reference", ".references", ".reflist", ".mw-references-wrap",
  "#references", ".printfooter", ".catlinks", ".infobox", ".metadata", ".hatnote", ".bandeau", ".mw-indicators",
  ".sistersitebox", ".magnify", ".bandeau-portail", "#bandeau-portail", ".bandeau-container", ".noviewer",
  ".mw-authority-control", ".autorite", ".portal-bar",
];

// Trailing sections that are not course material: cut the Markdown from the first of these headings.
const TRAILING_HEADINGS = /^#{1,6}\s*(notes?( et références)?|références?|voir aussi|annexes?|bibliographie|liens? externes?|articles? connexes?|sources?)\s*$/im;

// Where the main text usually lives, most specific first.
const CANDIDATES = [
  "[itemprop=articleBody]", "article", "main", "#mw-content-text .mw-parser-output", "#mw-content-text",
  "#content", "#main", ".entry-content", ".post-content", ".article-content", ".content", ".course", ".cours", ".lesson",
];

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "_",
});
turndown.use(gfm);
turndown.remove(["style", "script"]);
// LaTeX injected by convertMath() is emitted verbatim. The TeX lives in the span's TEXT (not an attribute):
// Turndown drops text-less elements as "blank" before any custom rule can see them.
turndown.addRule("latex", {
  filter: (node) => node.nodeName === "SPAN" && node.getAttribute("data-latex") === "1",
  replacement: (_content, node) => node.textContent,
});

// Exponents and indices written as <sup>/<sub> in HTML: keep them readable and KaTeX-renderable.
turndown.addRule("supsub", {
  filter: ["sup", "sub"],
  replacement: (content, node) => {
    const text = content.trim();
    if (!text || text.length > 12) return content;
    return node.nodeName === "SUP" ? `$^{${text}}$` : `$_{${text}}$`;
  },
});

const escapeText = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const latexSpan = (tex, display) =>
  `<span data-latex="1">${escapeText(display ? `\n\n$$\n${tex}\n$$\n\n` : `$${tex}$`)}</span>`;

const cleanTex = (raw) =>
  String(raw || "")
    .replace(/^\{\\displaystyle\s*([\s\S]*)\}$/, "$1")
    .replace(/\\,\s*$/, "")
    .replace(/\{\{=\}\}/g, "=") // MediaWiki template artefact
    .trim();

/** Turn MathJax / MathML / Wikipedia formulas into $...$ so KaTeX renders them in Myschool. */
function convertMath($) {
  $("script[type^='math/tex']").each((_, el) => {
    const display = /mode\s*=\s*display/.test($(el).attr("type") || "");
    $(el).replaceWith(latexSpan(cleanTex($(el).text()), display));
  });
  $(".mwe-math-element").each((_, el) => {
    const $el = $(el);
    // Wikipedia keeps the original TeX source in data-mw; fall back to MathML alttext / image alt.
    let tex = "";
    try {
      tex = JSON.parse($el.attr("data-mw") || "{}").body?.extsrc || "";
    } catch {
      tex = "";
    }
    tex = cleanTex(tex || $el.find("math").attr("alttext") || $el.find("img").attr("alt"));
    if (!tex) return $el.remove();
    const display =
      $el.is(".mwe-math-element-block") ||
      $el.find(".mwe-math-mathml-display, img.mwe-math-fallback-image-display").length > 0 ||
      $el.parent().is("dd");
    $el.replaceWith(latexSpan(tex, display));
  });
  $("math[alttext]").each((_, el) => {
    $(el).replaceWith(latexSpan(cleanTex($(el).attr("alttext")), false));
  });
  // Plain MathML (no TeX source): convert it.
  $("math").each((_, el) => {
    const display = ($(el).attr("display") || "") === "block";
    try {
      const tex = MathMLToLaTeX.convert($.html(el).replace(/&nbsp;| /g, " "))
        .replace(/&nbsp;| /g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
      if (tex) $(el).replaceWith(latexSpan(tex, display));
      else $(el).remove();
    } catch {
      $(el).replaceWith(`<span>${$(el).text()}</span>`);
    }
  });
}

function absolutize($, base) {
  $("a[href]").each((_, el) => {
    try {
      $(el).attr("href", new URL($(el).attr("href"), base).href);
    } catch {
      $(el).removeAttr("href");
    }
  });
  $("img[src]").each((_, el) => {
    try {
      $(el).attr("src", new URL($(el).attr("src"), base).href);
    } catch {
      $(el).remove();
    }
  });
}

/** Layout tables (one cell) are unwrapped; data tables without a heading row get one, otherwise Turndown keeps them as raw HTML. */
function normalizeTables($) {
  $("table").each((_, el) => {
    const $t = $(el);
    const rows = $t.find("tr");
    const cells = $t.find("td, th");
    if (rows.length === 1 && cells.length === 1) return $t.replaceWith(`<div>${cells.first().html() || ""}</div>`);
    if (rows.length === 0) return $t.remove();
    const first = rows.first();
    if (first.find("th").length === 0) {
      first.find("td").each((__, td) => {
        $(td).replaceWith(`<th>${$(td).html() || ""}</th>`);
      });
    }
  });
}

function pickMain($) {
  for (const sel of CANDIDATES) {
    const el = $(sel).first();
    if (el.length && el.text().trim().length > 400) return el;
  }
  // Fallback: the block with the most non-link text and at least two paragraphs.
  let best = null;
  let bestScore = 0;
  $("div, section, td").each((_, el) => {
    const $el = $(el);
    const score = $el.text().trim().length - $el.find("a").text().trim().length * 2;
    if (score > bestScore && $el.find("p").length >= 2) {
      best = $el;
      bestScore = score;
    }
  });
  return best || $("body");
}

/**
 * @param {string} html
 * @param {string} url
 * @param {{ root?: string }} [options] root: CSS selector of the block holding the content (skips the auto-detection)
 * @returns {{ title: string, description: string, lang: string, license: string, markdown: string }}
 */
export function extract(html, url, options = {}) {
  const $ = cheerio.load(html);
  const title = ($('meta[property="og:title"]').attr("content") || $("h1").first().text() || $("title").text() || "Sans titre")
    .replace(/\s+/g, " ")
    .replace(/\s*[-–—|]\s*Wikip[ée]dia.*$/i, "")
    .trim();
  const description = (
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    ""
  ).trim();
  const lang = $("html").attr("lang") || "";
  const license = $('link[rel="license"]').attr("href") || $('a[rel="license"]').attr("href") || "";

  $(NOISE.join(",")).remove();
  $("form").each((_, f) => $(f).replaceWith($(f).html() || "")); // keep what forms wrap (online exercises), drop the form itself
  convertMath($);
  normalizeTables($);
  absolutize($, url);
  const main = options.root && $(options.root).length ? $(options.root).first() : pickMain($);
  main.find("h1").first().remove(); // the title is stored in the front matter
  main.find("img").each((_, el) => {
    if (!$(el).attr("alt")) $(el).attr("alt", "illustration");
  });

  let markdown = turndown
    .turndown(main.html() || "")
    .replace(/\[(modifier|edit)[^\]]*\]\([^)]*\)/gi, "")
    .replace(/\\\[\d+\\\]/g, "") // [12] citation markers
    .replace(/\?utm_[^)\s"]*/g, "") // tracking params on image URLs
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const cut = markdown.search(TRAILING_HEADINGS);
  if (cut > 200) markdown = markdown.slice(0, cut).trim();

  return { title, description, lang, license, markdown };
}
