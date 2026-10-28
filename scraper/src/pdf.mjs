import { createRequire } from "node:module";

// pdf-parse 1.x runs a self-test when loaded through its package entry; the lib file avoids that.
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

/** Rebuilds lines from positioned text items (pdf-parse's default joins everything with spaces). */
async function renderPage(pageData) {
  const content = await pageData.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
  let out = "";
  let lastY = null;
  for (const item of content.items) {
    const y = Math.round(item.transform[5]);
    if (lastY !== null && Math.abs(y - lastY) > 2) out += "\n";
    else if (lastY !== null && out && !out.endsWith(" ")) out += " ";
    out += item.str;
    lastY = y;
  }
  return out;
}

/** Maps "Mathematical Alphanumeric Symbols" (𝑥, 𝐀, 𝟑…) used by Word/MathType PDFs back to plain letters and digits. */
function plainMath(s) {
  return s.replace(/[\u{1D400}-\u{1D7FF}]/gu, (ch) => {
    const cp = ch.codePointAt(0);
    if (cp <= 0x1d6a3) {
      const i = (cp - 0x1d400) % 52;
      return String.fromCharCode(i < 26 ? 65 + i : 97 + i - 26);
    }
    if (cp >= 0x1d7ce) return String((cp - 0x1d7ce) % 10);
    return ch; // Greek letters: keep as is
  });
}

const cleanLine = (l) => plainMath(l).replace(/[\t ]+/g, " ").replace(/ {2,}/g, " ").trim();

/** Heuristic: short lines that look like headings in course hand-outs become Markdown headings. */
function headingLevel(line) {
  if (line.length > 70) return 0;
  if (/^(sommaire|introduction|conclusion|résumé|exercices?|applications?|corrig[ée]s?)\s*:?$/i.test(line)) return 2;
  if (/^(chapitre|partie|séance|seance)\s+\d/i.test(line)) return 2;
  if (/^[IVX]+\s*[-–.)]\s*\S/.test(line)) return 2; // I- Limites d'une fonction
  if (/^\d+(\.\d+)*\s*[-–/).]\s*\S/.test(line) && !/[.;:]$/.test(line)) return 3; // 1-1/ Rappels
  if (/^(définition|proposition|théorème|theoreme|propriété|propriete|remarque|preuve|démonstration|exemple|application|méthode|corollaire|lemme)s?\s*\d*\s*:?$/i.test(line)) return 4;
  return 0;
}

/**
 * @param {Buffer} buffer
 * @returns {Promise<{ markdown: string, pages: number, info: object, text: string }>}
 */
export async function pdfToMarkdown(buffer) {
  const pages = [];
  // pdf.js prints font-table warnings ("TT: undefined function") for many generated PDFs; they are harmless.
  const warn = console.warn;
  const logFn = console.log;
  console.warn = (...a) => (/^Warning: /.test(String(a[0])) ? undefined : warn(...a));
  console.log = (...a) => (/^Warning: /.test(String(a[0])) ? undefined : logFn(...a));
  let result;
  try {
    result = await pdfParse(buffer, {
      pagerender: async (pageData) => {
        pages.push(await renderPage(pageData));
        return "";
      },
    });
  } finally {
    console.warn = warn;
    console.log = logFn;
  }

  const blocks = [];
  pages.forEach((page, index) => {
    const lines = page.split("\n").map(cleanLine).filter(Boolean);
    const paragraphs = [];
    let current = [];
    for (const line of lines) {
      const level = headingLevel(line);
      if (level) {
        if (current.length) paragraphs.push(current.join(" "));
        current = [];
        paragraphs.push(`${"#".repeat(level)} ${line.replace(/\s*:$/, "")}`);
      } else if (/^[-•·▪●]\s*/.test(line) || /^\d+[.)]\s+/.test(line)) {
        if (current.length) paragraphs.push(current.join(" "));
        current = [];
        paragraphs.push(line.replace(/^[•·▪●]\s*/, "- "));
      } else if (/[.;:!?]$/.test(line) || line.length < 40) {
        current.push(line);
        paragraphs.push(current.join(" "));
        current = [];
      } else {
        current.push(line);
      }
    }
    if (current.length) paragraphs.push(current.join(" "));
    if (paragraphs.length) blocks.push(`<!-- page ${index + 1} -->\n\n${paragraphs.join("\n\n")}`);
  });

  const markdown = blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
  return { markdown, pages: result.numpages, info: result.info || {}, text: pages.join("\n\n") };
}
