import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { slugify } from "./util.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "repository");
const INDEX = path.join(ROOT, "index.json");

function readIndex() {
  if (!fs.existsSync(INDEX)) return { entries: [] };
  return JSON.parse(fs.readFileSync(INDEX, "utf8"));
}

/** Remembers each entry as read from (or written to) disk, to tell this process's changes from other scripts'. */
function snapshot(index) {
  const base = new Map(index.entries.map((e) => [e.id, { ...e }]));
  Object.defineProperty(index, "base", { value: base, configurable: true, enumerable: false, writable: true });
}

const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);

export function loadIndex() {
  const index = readIndex();
  snapshot(index);
  return index;
}

/**
 * Several scripts may run at once (download + reformulate): merge with what is on disk instead of overwriting it.
 * Entries are matched by id; fields this process changed win, fields only another script changed (on disk) are taken
 * from disk, fields only known on disk are kept, disk-only entries are kept.
 */
export function saveIndex(index) {
  fs.mkdirSync(ROOT, { recursive: true });
  const disk = readIndex();
  const base = index.base || new Map();
  const mine = new Map(index.entries.map((e) => [e.id, e]));
  for (const d of disk.entries) {
    const m = mine.get(d.id);
    if (m) {
      const b = base.get(d.id);
      for (const [k, v] of Object.entries(d)) {
        if (m[k] === undefined || m[k] === null) m[k] = v;
        // Unchanged here since it was read, changed on disk by another script (failure count, title, level): keep theirs.
        else if (b && same(m[k], b[k]) && !same(m[k], v)) m[k] = v;
      }
    } else {
      index.entries.push(d);
      mine.set(d.id, d);
    }
  }
  index.updatedAt = new Date().toISOString();
  const tmp = `${INDEX}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(index, null, 2) + "\n");
  // Windows refuses the rename while another process (the other script, an antivirus) holds index.json: retry.
  for (let attempt = 1; ; attempt++) {
    try {
      fs.renameSync(tmp, INDEX);
      snapshot(index);
      return;
    } catch (err) {
      if (!["EPERM", "EACCES", "EBUSY"].includes(err.code) || attempt >= 20) throw err;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50 * attempt);
    }
  }
}

export function findEntry(index, idOrUrl) {
  return index.entries.find((e) => e.id === idOrUrl || e.url === idOrUrl || e.slug === idOrUrl);
}

/** YAML-ish front matter: flat key/values + tags array. Values are JSON-encoded so any character is safe. */
function frontMatter(meta) {
  const lines = Object.entries(meta)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${lines.join("\n")}\n---\n`;
}

export function parseFrontMatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    try {
      meta[key] = JSON.parse(line.slice(i + 1).trim());
    } catch {
      meta[key] = line.slice(i + 1).trim();
    }
  }
  return { meta, body: text.slice(m[0].length) };
}

/** Writes the Markdown file and returns the repository-relative path. */
export function saveCourse(entry, markdown) {
  // entry.dir (repository-relative) overrides the default <level>/<subject> layout.
  const dir = entry.dir ? path.join(ROOT, ...entry.dir.split("/")) : path.join(ROOT, slugify(entry.level), slugify(entry.subject));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${entry.slug}.md`);
  const meta = {
    id: entry.id,
    title: entry.title,
    url: entry.url,
    level: entry.level,
    subject: entry.subject,
    chapter: entry.chapter,
    type: entry.type,
    tags: entry.tags,
    lang: entry.lang,
    license: entry.license,
    rights: entry.rights,
    site: entry.site,
    category: entry.category,
    course: entry.course,
    sourceCourse: entry.sourceCourse,
    sourceId: entry.sourceId,
    model: entry.model,
    pdf: entry.pdf,
    pdfUrl: entry.pdfUrl,
    pdfPages: entry.pdfPages,
    video: entry.video,
    description: entry.description,
    fetchedAt: entry.fetchedAt,
    words: entry.words,
  };
  fs.writeFileSync(file, frontMatter(meta) + "\n" + markdown + "\n");
  return path.relative(ROOT, file).split(path.sep).join("/");
}

export function readCourse(entry) {
  const text = fs.readFileSync(path.join(ROOT, entry.file), "utf8");
  return parseFrontMatter(text);
}
