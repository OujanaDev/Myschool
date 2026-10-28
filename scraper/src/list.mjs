#!/usr/bin/env node
/** Affiche le contenu du dépôt local : npm run list [-- --level 2bac-pc] [--subject mathematiques] */
import { parseArgs } from "node:util";
import { loadIndex } from "./repository.mjs";

const { values: f } = parseArgs({ options: { level: { type: "string" }, subject: { type: "string" }, json: { type: "boolean", default: false } } });
const entries = loadIndex().entries.filter((e) => (!f.level || e.level === f.level) && (!f.subject || e.subject === f.subject));

if (f.json) {
  console.log(JSON.stringify(entries, null, 2));
} else if (!entries.length) {
  console.log("Dépôt vide. Lancez `npm run scrape` pour récupérer des cours.");
} else {
  console.table(
    entries.map((e) => ({
      id: e.id,
      titre: e.title.slice(0, 50),
      niveau: e.level,
      matière: e.subject,
      chapitre: (e.chapter || "").slice(0, 30),
      type: e.type,
      mots: e.words,
      importé: e.importedLessonId ? "oui" : "non",
      fichier: e.file,
    }))
  );
}
