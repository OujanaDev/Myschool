import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const fold = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const CHAPTER_STOP_WORDS = new Set(["le", "la", "les", "l", "de", "des", "du", "d", "et", "en", "dans", "un", "une", "a", "au", "aux", "sur"]);

/**
 * Identity of a chapter across sources: AlloSchool and the curriculum write the same chapter with or without an
 * article or a "Unité 1 :" / "Module 2 :" prefix, and the number sets as N, IN, ℕ or $\mathbb{N}$.
 * "Arithmétique dans IN" and "Arithmétique dans N" have the same key.
 */
export const chapterKey = (title) =>
  fold(title)
    .replace(/^(unite|module|chapitre|partie|lecon|sequence)\s*\d+\s*[:.\-–—]\s*/, "")
    .replace(/\$?\\mathbb\{([a-z])\}\$?/g, " $1 ")
    .replace(/ℕ/g, " n ")
    .replace(/ℤ/g, " z ")
    .replace(/ℚ/g, " q ")
    .replace(/ℝ/g, " r ")
    .replace(/ℂ/g, " c ")
    .replace(/\bi([nzqrc])\b/g, " $1 ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((w) => w && !CHAPTER_STOP_WORDS.has(w))
    .join(" ");

// Keeps letters of any script (Arabic titles stay readable in file names); accents are already folded away.
export const slugify = (s) =>
  fold(s)
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "") || "sans-titre";

export const idForUrl = (url) => crypto.createHash("sha1").update(url).digest("hex").slice(0, 12);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const wordCount = (text) => (text.match(/[\p{L}\p{N}]+/gu) || []).length;

// A table of contents written at the top of a course: the lesson page already shows one on the right.
const TOC =
  /^(?:\*\*(?:Sommaire|Plan(?: du cours)?|Table des matières)\*\*|#{2,3}\s*(?:Sommaire|Plan(?: du cours)?|Table des matières))[ \t]*:?[ \t]*\n(?:[ \t]*\n)?(?:[ \t]*(?:[-*+]|\d+[.)]|[IVX]+[.)])\s.*\n?)+\n*/im;
export const stripToc = (text) => text.replace(TOC, "");

export function log(...args) {
  console.log(new Date().toISOString().slice(11, 19), ...args);
}

/** "==" inside a formula is not a highlight: KaTeX would print it. Removes the marks found in $…$ and $$…$$. */
export function unmarkInMath(text) {
  return text.replace(/\$\$[\s\S]+?\$\$|\$[^$\n]+\$/g, (math) => math.replace(/==((?:[^=\n]|=(?!=))+?)==/g, "$1"));
}

const FOLDED_LABEL = /^>\s*\*\*(Solution|Corrigé|Réponse|Indice)s?\b/i;
const SOLUTION_LABEL = /^>\s*\*\*(Solution|Corrigé)s?\b/i;
const EXERCISES_HEADING = /^##\s.*\b(exercices|exercises|problèmes|sujet)\b/i;

/**
 * Keeps answers folded. Markdown ends a quote at a blank line, so a correction written after a blank line without
 * its "> " prefix shows in clear under the exercise. Two cases are moved back into the folded block:
 *   - a Solution / Réponse / Indice label standing alone, followed by its unquoted content;
 *   - in the Exercises part, anything unquoted between a solution and the next exercise or heading.
 */
export function foldLeakedAnswers(text) {
  const blocks = text.split(/(\n{2,})/);
  let leaks = 0;
  let inExercises = false;
  for (let i = 0; i < blocks.length; i += 2) {
    const block = blocks[i].trim();
    if (/^##\s/.test(block)) inExercises = EXERCISES_HEADING.test(block);
    if (!FOLDED_LABEL.test(block)) continue;
    const labelOnly = block.split("\n").every((l, j) => j === 0 || /^>\s*$/.test(l));
    if (!labelOnly && !(inExercises && SOLUTION_LABEL.test(block))) continue;
    let j = i + 2;
    let moved = false;
    while (j < blocks.length && blocks[j].trim() && !/^\s*(>|#)/.test(blocks[j])) {
      blocks[j - 1] = "\n>\n";
      blocks[j] = blocks[j].split("\n").map((l) => (l.trim() ? "> " + l : ">")).join("\n");
      moved = true;
      j += 2;
    }
    if (moved) leaks++;
  }
  return { text: blocks.join(""), leaks };
}

const FOLDED_LINE = /^>\s*\*\*((?:Solution|Corrigé|Réponse|Indice)s?\b[^*]*)\*\*\s*(.*)$/i;

/**
 * "> **Réponse.**" followed on the next line by the answer makes one Markdown paragraph: the answer would show in
 * the button label. Each folded label becomes its own quote line, separated from the content by an empty "> " line,
 * from the block before it by a blank line, and the unprefixed lines of its paragraph get their "> " back.
 */
export function separateFoldedLabels(text) {
  const lines = text.split("\n");
  const out = [];
  let fixes = 0;
  let inFolded = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(FOLDED_LINE);
    if (m) {
      const prev = out[out.length - 1] ?? "";
      if (/^>\s*\S/.test(prev)) {
        out.push("");
        fixes++;
      }
      out.push(`> **${m[1].trim()}**`);
      const next = lines[i + 1] ?? "";
      if (m[2].trim()) {
        out.push(">", `> ${m[2].trim()}`);
        fixes++;
      } else if (next.trim() && !/^>\s*$/.test(next)) {
        out.push(">");
        fixes++;
      }
      inFolded = true;
      continue;
    }
    if (!line.trim()) inFolded = false;
    if (inFolded && !line.startsWith(">")) {
      out.push(`> ${line}`);
      fixes++;
      continue;
    }
    out.push(line);
  }
  return { text: out.join("\n"), fixes };
}

/**
 * One run at a time for a long job: a second launch (manual or from a relaunch loop) exits at once instead of
 * doing the same work twice. The lock holds the pid; a lock left by a dead process is taken over.
 */
export function singleInstance(name) {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "repository", `.${name}.lock`);
  try {
    const pid = Number(fs.readFileSync(file, "utf8"));
    if (pid && pid !== process.pid) {
      process.kill(pid, 0); // throws when that process is gone
      console.log(`${name} déjà en cours (processus ${pid}) : rien à faire.`);
      process.exit(0);
    }
  } catch {
    /* no lock, or a stale one */
  }
  fs.writeFileSync(file, String(process.pid));
  process.on("exit", () => {
    try {
      if (Number(fs.readFileSync(file, "utf8")) === process.pid) fs.unlinkSync(file);
    } catch {
      /* already gone */
    }
  });
}

/**
 * Stops a process started with `shell: true` and everything it launched: on Windows child.kill() only stops the
 * cmd.exe in between, and the claude.exe behind it would keep running (and using the quota) with no one reading it.
 */
export function killTree(child) {
  if (process.platform === "win32" && child.pid) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true });
  else child.kill();
}
