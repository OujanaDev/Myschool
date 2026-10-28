#!/usr/bin/env node
/**
 * Donne un titre distinct à chaque cours d'un même chapitre : plusieurs cours reformulés s'appelaient tous
 * « Limites et continuité ». Pour chaque groupe de titres identiques, Claude propose un titre précis tiré du contenu
 * (« Limites et continuité : rappels et formes indéterminées ») ; les parties d'un même long document gardent leur
 * « (partie n/N) ». Le titre de la fiche et le titre # du cours sont mis à jour ; `import --changed` publie le changement.
 *
 *   node src/retitle.mjs [--dry-run] [--model sonnet]
 */
import { parseArgs } from "node:util";
import { askClaude, parseJson } from "./claude-cli.mjs";
import { loadIndex, readCourse, saveCourse, saveIndex } from "./repository.mjs";
import { fold, log, singleInstance } from "./util.mjs";

const { values: opts } = parseArgs({
  options: { "dry-run": { type: "boolean", default: false }, model: { type: "string", default: "sonnet" } },
});
if (!opts["dry-run"]) singleInstance("retitle");

const SYSTEM = `Tu es éditeur pédagogique pour Myschool, une plateforme de cours marocaine. On te donne plusieurs cours d'un même chapitre qui portent le même titre. Pour chacun, tu proposes un titre distinct, précis et court (45 à 80 caractères), qui commence par le nom du chapitre puis « : » et précise ce que ce cours traite d'après ses parties (ex. « Limites et continuité : rappels, formes indéterminées et TVI », « Limites et continuité : exercices corrigés de synthèse »). Le type compte : un résumé s'annonce comme résumé (« … : l'essentiel à retenir »), une série d'exercices comme exercices. Deux titres du groupe ne doivent jamais être identiques ni presque identiques. Les titres déjà fixés sont imposés : n'en propose pas pour eux, mais ne les répète pas. Langue : celle du cours. Pas de guillemets, pas de numéro de séance, pas de nom de professeur ni de site. Réponds uniquement par un objet JSON {"<id>": "<titre>", ...} pour les cours à renommer.`;

const PART = /\s*\(partie (\d+)\/(\d+)\)\s*$/i;
const baseTitle = (t) => t.replace(PART, "").trim();

function outline(entry) {
  const { body } = readCourse(entry);
  const heads = body
    .split("\n")
    .filter((l) => /^#{2,3}\s/.test(l))
    .map((l) => l.replace(/[*$=`]/g, "").trim())
    .slice(0, 18);
  return heads.join(" | ").slice(0, 900);
}

const index = loadIndex();
const finals = index.entries.filter((e) => e.sourceId && e.file);
// The course files hold the real titles (a running reformulate.mjs may save its older copy of the index).
for (const e of finals) {
  try {
    const t = readCourse(e).meta.title;
    if (t) e.title = t;
  } catch {
    /* missing file: keep the index title */
  }
}
const groups = new Map();
for (const e of finals) {
  const key = [e.level, e.subject, fold(e.chapter || ""), fold(baseTitle(e.title))].join("|");
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(e);
}

let renamed = 0;
let cost = 0;
for (const group of groups.values()) {
  if (group.length < 2) continue;
  // The parts of one long document share their title on purpose, then "(partie n/N)": nothing to tell apart.
  if (new Set(group.map((e) => (e.part ? e.sourceId : e.id))).size < 2) continue;
  // Every member shares the same title: one keeps it, the others get a new one (even if renamed before, since two
  // different groups can be renamed into the same title). Parts of one document count as one member.
  const keeper = group.find((e) => e.retitled && !e.part) || null;
  for (const e of group) if (e !== keeper && !(e.part && keeper && e.sourceId === keeper.sourceId)) e.retitled = false;
  const todo = group.filter((e) => !e.retitled);
  if (!todo.length) continue;
  // Parts of one long document form a single item: one title, then "(partie n/N)".
  const items = new Map();
  for (const e of group) {
    const key = e.part ? `${e.sourceId}` : e.id;
    if (!items.has(key)) items.set(key, []);
    items.get(key).push(e);
  }
  const lines = [...items.entries()].map(([key, members]) => {
    const e = members[0];
    const fixed = members.every((m) => m.retitled);
    return fixed
      ? `- (titre déjà fixé) ${baseTitle(e.title)}`
      : `- id ${key} · type ${e.type}${members.length > 1 || e.part ? ` · long document en ${members.length} parties` : ""} · ${e.words} mots · parties : ${outline(e)}`;
  });
  const prompt = `Chapitre : ${group[0].chapter}\nNiveau : ${group[0].level} · Matière : ${group[0].subject}\nTitre commun actuel : ${baseTitle(group[0].title)}\n\nCours :\n${lines.join("\n")}`;
  let titles;
  try {
    const answer = await askClaude(SYSTEM, prompt, { model: opts.model });
    cost += answer.cost;
    titles = parseJson(answer.text);
  } catch (err) {
    log(`✗ ${group[0].chapter} / ${baseTitle(group[0].title)} : ${err.message}`);
    continue;
  }
  const used = new Set(group.filter((e) => e.retitled).map((e) => fold(baseTitle(e.title))));
  for (const [key, members] of items) {
    const proposed = String(titles[key] || "").replace(/^["«\s]+|["»\s]+$/g, "").trim();
    if (!proposed || members.every((m) => m.retitled)) continue;
    if (used.has(fold(proposed)) || proposed.length > 110) {
      log(`  ! titre refusé (doublon ou trop long) : ${proposed}`);
      continue;
    }
    used.add(fold(proposed));
    for (const e of members) {
      const m = e.title.match(PART);
      const title = m ? `${proposed} (partie ${m[1]}/${m[2]})` : proposed;
      log(`${opts["dry-run"] ? "~" : "✓"} ${e.title}  →  ${title}`);
      if (opts["dry-run"]) continue;
      const { body } = readCourse(e);
      const text = body.trim().replace(/^#\s+.*$/m, `# ${title}`);
      e.title = title;
      e.description = `${e.chapter} — ${title}`;
      e.retitled = true;
      saveCourse(e, text);
      renamed++;
    }
  }
  if (!opts["dry-run"]) saveIndex(index);
}
log(`Terminé : ${renamed} cours renommé(s). Coût ≈ ${cost.toFixed(2)} $.`);
