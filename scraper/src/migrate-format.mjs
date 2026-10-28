#!/usr/bin/env node
/**
 * Met les cours déjà produits (repository/final) au format courant de style/format-cours.md :
 *   - chaque solution est placée juste sous son exercice, dans un bloc repliable « > **Solution de l'exercice n.m.** » ;
 *     la partie « Solutions des exercices » disparaît ;
 *   - le surlignage ==…== est réduit : un seul par bloc Définition / Théorème, dix au plus par cours, aucun ailleurs ;
 *   - le sommaire en tête de cours est retiré (la page affiche déjà le sien à droite).
 *
 *   node src/migrate-format.mjs [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { ROOT } from "./repository.mjs";
import { foldLeakedAnswers, log, separateFoldedLabels, stripToc, unmarkInMath } from "./util.mjs";

const { values: opts } = parseArgs({ options: { "dry-run": { type: "boolean", default: false } } });

const walk = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : d.name.endsWith(".md") ? [path.join(dir, d.name)] : []))
    : [];

const SOLUTIONS_HEADING = /^##\s+(?:[IVX]+\.?\s*)?Solutions?\b/i;
const SOLUTION_ITEM = /^###\s+Solution(?:s)? de l['’]exercice\s+(\d+(?:\.\d+)*)/i;
const EXERCISE_START = /^>\s*\*\*Exercice\s+(\d+(?:\.\d+)*)/i;

const quote = (lines) => lines.map((l) => (l.trim() ? `> ${l}` : ">"));

function moveSolutions(body) {
  const lines = body.split("\n");
  const start = lines.findIndex((l) => SOLUTIONS_HEADING.test(l));
  if (start < 0) return { body, moved: 0, leftover: 0 };

  // The solutions part runs to the end of the document or to the next "##" heading.
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i]) && !SOLUTIONS_HEADING.test(lines[i])) {
      end = i;
      break;
    }
  }
  const section = lines.slice(start + 1, end);
  const solutions = new Map();
  let current = null;
  const intro = [];
  for (const line of section) {
    const m = line.match(SOLUTION_ITEM);
    if (m) {
      current = { number: m[1], lines: [] };
      solutions.set(m[1], current);
    } else if (current) current.lines.push(line);
    else intro.push(line);
  }
  for (const s of solutions.values()) {
    while (s.lines.length && !s.lines[s.lines.length - 1].trim()) s.lines.pop();
    while (s.lines.length && !s.lines[0].trim()) s.lines.shift();
    s.lines = s.lines.filter((l) => !/^---+\s*$/.test(l));
  }

  const block = (s) => ["", ...quote([`**Solution de l'exercice ${s.number}.**`, "", ...s.lines])];
  const before = lines.slice(0, start);
  const out = [];
  let moved = 0;
  let inExercise = null;
  const flush = () => {
    if (inExercise && solutions.has(inExercise)) {
      out.push(...block(solutions.get(inExercise)));
      solutions.delete(inExercise);
      moved++;
    }
    inExercise = null;
  };
  for (const line of before) {
    const m = line.match(EXERCISE_START);
    if (m) {
      flush();
      inExercise = m[1];
    } else if (inExercise && !line.startsWith(">")) flush();
    out.push(line);
  }
  flush();

  const rest = lines.slice(end);
  // Solutions whose exercise could not be found stay at the end, still folded.
  const leftover = [...solutions.values()];
  const tail = leftover.length ? ["", "## Solutions complémentaires", ...leftover.flatMap(block)] : [];
  while (out.length && !out[out.length - 1].trim()) out.pop();
  return { body: [...out, ...tail, "", ...rest].join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n", moved, leftover: leftover.length };
}

const KEEP_FIRST = /^>\s*\*\*(Définition|Théorème|Propriété|Proposition|Corollaire)/;
const MAX_HIGHLIGHTS = 10;

/** Only the most important points stay highlighted: the first mark of a Définition / Théorème-type block, 10 per course. */
function thinHighlights(source) {
  const body = unmarkInMath(source);
  let removed = (source.match(/==(?:[^=\n]|=(?!=))+?==/g) || []).length - (body.match(/==(?:[^=\n]|=(?!=))+?==/g) || []).length;
  let kept = 0;
  const out = body.split(/(\n{2,})/).map((chunk) => {
    if (!/==(?:[^=\n]|=(?!=))+?==/.test(chunk)) return chunk;
    let seen = 0;
    const keep = KEEP_FIRST.test(chunk.trim());
    return chunk.replace(/==((?:[^=\n]|=(?!=))+?)==/g, (_m, inner) => {
      seen++;
      if (keep && seen === 1 && kept < MAX_HIGHLIGHTS) {
        kept++;
        return `==${inner}==`;
      }
      removed++;
      return inner;
    });
  });
  return { body: out.join(""), removed };
}

let files = 0;
for (const file of walk(path.join(ROOT, "final"))) {
  const text = fs.readFileSync(file, "utf8");
  const m = text.match(/^---\n[\s\S]*?\n---\n/);
  const head = m ? m[0] : "";
  const original = text.slice(head.length);
  const a = moveSolutions(original);
  const b = thinHighlights(a.body);
  const c = foldLeakedAnswers(separateFoldedLabels(stripToc(b.body)).text);
  const body = c.text;
  if (body === original) continue;
  files++;
  log(`${path.relative(ROOT, file)} — ${a.moved} solution(s) repliée(s)${a.leftover ? `, ${a.leftover} à la fin` : ""}, ${b.removed} surlignage(s) retiré(s), ${c.leaks} correction(s) visible(s) remise(s) dans leur bloc`);
  if (!opts["dry-run"]) fs.writeFileSync(file, head + body);
}
log(`${files} fichier(s) mis au format${opts["dry-run"] ? " (simulation)" : ""}.`);
