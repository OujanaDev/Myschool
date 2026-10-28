import { Children, cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import Lab from "./labs/Lab";

type MdNode = { type: string; value?: string; depth?: number; children?: MdNode[]; data?: Record<string, unknown> };

export type Heading = { level: 2 | 3; text: string; id: string };

const slug = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "section";

/** Same ids for the ToC (from the source text) and for the rendered headings (from the parsed tree). */
function uniqueId(base: string, used: Map<string, number>) {
  const n = used.get(base) ?? 0;
  used.set(base, n + 1);
  return n === 0 ? `h-${base}` : `h-${base}-${n + 1}`;
}

const TEX_SYMBOLS: Record<string, string> = {
  infty: "∞", to: "→", rightarrow: "→", leq: "≤", le: "≤", geq: "≥", ge: "≥", neq: "≠", ne: "≠", in: "∈",
  times: "×", cdot: "·", pm: "±", approx: "≈", alpha: "α", beta: "β", lambda: "λ", pi: "π", theta: "θ",
  omega: "ω", Delta: "Δ", sum: "Σ", int: "∫", sqrt: "√", ln: "ln", log: "log", exp: "exp", lim: "lim",
};

/** Plain-text rendering of the LaTeX left in a heading once its $ are removed, for the table of contents. */
function readableTex(text: string) {
  return text
    .replace(/\\mathbb\{(\w)\}/g, (_m, l: string) => ({ R: "ℝ", N: "ℕ", Z: "ℤ", Q: "ℚ", C: "ℂ" })[l] ?? l)
    .replace(/\\([a-zA-Z]+)/g, (m, cmd: string) => TEX_SYMBOLS[cmd] ?? (/^(left|right|displaystyle|dfrac|frac|mathrm|text|mathcal|operatorname)$/.test(cmd) ? "" : m))
    .replace(/[{}]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Level 2 and 3 headings of a lesson, in order, outside code blocks. Used for the table of contents. */
export function extractHeadings(content: string): Heading[] {
  const out: Heading[] = [];
  const used = new Map<string, number>();
  let fence = false;
  for (const line of content.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      fence = !fence;
      continue;
    }
    if (fence) continue;
    const m = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const text = m[2].replace(/[*_`=$]/g, "").trim();
    // The id keeps the raw text (it must match remarkHeadingIds); only the displayed label is made readable.
    out.push({ level: m[1].length as 2 | 3, text: readableTex(text), id: uniqueId(slug(text), used) });
  }
  return out;
}

const nodeText = (n: MdNode): string =>
  n.value && ["text", "inlineMath", "inlineCode"].includes(n.type) ? n.value : (n.children ?? []).map(nodeText).join("");

/** Gives every level 2 and 3 heading the id extractHeadings() computed for it. */
function remarkHeadingIds() {
  return (tree: MdNode) => {
    const used = new Map<string, number>();
    const walk = (node: MdNode) => {
      if (node.type === "heading" && (node.depth === 2 || node.depth === 3)) {
        const id = uniqueId(slug(nodeText(node).replace(/[*_`=$]/g, "").trim()), used);
        node.data = { ...(node.data ?? {}), hProperties: { id } };
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}

/**
 * `==texte==` → <mark> (surlignage jaune). The delimiters live in text nodes, but the highlighted span may
 * contain inline maths or emphasis, so siblings between an opening and a closing `==` are wrapped together.
 * Code and maths nodes are never altered.
 */
function remarkHighlight() {
  return (tree: MdNode) => {
    const walk = (node: MdNode) => {
      if (!node.children) return;
      for (const child of node.children) walk(child);
      const out: MdNode[] = [];
      let open: MdNode | null = null;
      const push = (n: MdNode) => (open ? open.children! : out).push(n);
      for (const child of node.children) {
        if (child.type !== "text" || !child.value?.includes("==")) {
          push(child);
          continue;
        }
        const parts = child.value.split("==");
        parts.forEach((part, i) => {
          if (part) push({ type: "text", value: part });
          if (i === parts.length - 1) return;
          if (open) {
            out.push(open);
            open = null;
          } else {
            open = { type: "highlight", data: { hName: "mark" }, children: [] };
          }
        });
      }
      if (open) {
        // Unbalanced delimiter: keep the text as written.
        out.push({ type: "text", value: "==" }, ...(open as MdNode).children!);
      }
      node.children = out;
    };
    walk(tree);
  };
}

const CALLOUTS: [RegExp, string][] = [
  [/^(à retenir|a retenir|l'essentiel|essentiel)\b/i, "callout-key"],
  [/^(testez-vous|teste-toi|vérifiez|verifiez|question flash)\b/i, "callout-quiz"],
  [/^(définition|definition)s?\b/i, "callout-definition"],
  [/^(théorème|theoreme|propriété|propriete|proposition|corollaire|lemme|formule)s?\b/i, "callout-theorem"],
  [/^(méthode|methode)s?\b/i, "callout-method"],
  [/^(exemple|application|activité|activite)s?\b/i, "callout-example"],
  [/^(remarque|attention|rappel|important|conseil)s?\b/i, "callout-warning"],
  [/^(démonstration|demonstration|preuve)\b/i, "callout-proof"],
  [/^(exercice|problème|probleme)s?\b/i, "callout-exercise"],
];

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

/** Labels whose content stays hidden behind a button: the student thinks first, then checks. */
const FOLDED: [RegExp, string, string][] = [
  [/^solutions?/i, "Voir la solution", "solution"],
  [/^(corrigé|corrige)/i, "Voir le corrigé", "solution"],
  [/^(réponse|reponse)s?/i, "Voir la réponse", "answer"],
  [/^indices?/i, "Voir un indice", "hint"],
];

/** "Pas à pas" block: the numbered steps of its list appear one at a time. */
function StepByStep({ label, nodes }: { label: ReactNode; nodes: ReactNode[] }) {
  const [shown, setShown] = useState(1);
  const listIndex = nodes.findIndex((n) => isValidElement(n) && n.type === "ol");
  const list = nodes[listIndex] as ReactElement<{ children?: ReactNode }> | undefined;
  const steps = list ? Children.toArray(list.props.children).filter(isValidElement) : [];
  if (!list || steps.length < 2) {
    return (
      <blockquote className="callout-steps">
        {label}
        {nodes}
      </blockquote>
    );
  }
  const done = shown >= steps.length;
  return (
    <blockquote className="callout-steps">
      {label}
      {nodes.slice(0, listIndex)}
      {cloneElement(list, {}, steps.slice(0, shown))}
      {done && nodes.slice(listIndex + 1)}
      <div className="steps-actions">
        {!done && (
          <button type="button" className="steps-next" onClick={() => setShown((n) => n + 1)}>
            Étape suivante ({shown + 1}/{steps.length})
          </button>
        )}
        {!done && (
          <button type="button" className="steps-other" onClick={() => setShown(steps.length)}>
            Tout afficher
          </button>
        )}
        {shown > 1 && (
          <button type="button" className="steps-other" onClick={() => setShown(1)}>
            Recommencer
          </button>
        )}
      </div>
    </blockquote>
  );
}

/**
 * Blockquotes whose first words are a known label become coloured callout boxes.
 * Solution, Réponse and Indice blocks become closed disclosures: the content stays hidden until asked for.
 * A "Pas à pas" block reveals the steps of its numbered list one at a time.
 */
function Callout({ children }: { children?: ReactNode }) {
  const nodes = Children.toArray(children);
  const firstIndex = nodes.findIndex((c) => isValidElement(c));
  const label = textOf(nodes[firstIndex] ?? "").trim();

  const folded = FOLDED.find(([re]) => re.test(label));
  if (folded) {
    const [re, verb, kind] = folded;
    // The button shows the bold label only. When the content shares the label's paragraph ("**Réponse.** Non : …"),
    // the rest of that paragraph stays in the hidden part instead of leaking into the button.
    const first = nodes[firstIndex] as ReactElement<{ children?: ReactNode }>;
    const parts = Children.toArray(first.props.children);
    const strongAt = parts.findIndex((c) => isValidElement(c) && c.type === "strong");
    const title = textOf(strongAt >= 0 ? parts[strongAt] : first).trim();
    const after = strongAt >= 0 ? parts.slice(strongAt + 1) : [];
    const rest = title.replace(/\.\s*$/, "").replace(re, "").trim();
    const leftover = after.some((c) => textOf(c).trim() || (isValidElement(c) && typeof c.type !== "string")) ? <p key="label-rest">{after}</p> : null;
    return (
      <details className={`solution ${kind}`}>
        <summary>{rest ? `${verb} ${rest}` : verb}</summary>
        <div className="solution-body">
          {leftover}
          {nodes.filter((_, i) => i !== firstIndex)}
        </div>
      </details>
    );
  }
  if (/^pas [àa] pas/i.test(label)) {
    return <StepByStep label={nodes[firstIndex]} nodes={nodes.filter((_, i) => i !== firstIndex)} />;
  }
  const cls = CALLOUTS.find(([re]) => re.test(label))?.[1] ?? "";
  return <blockquote className={cls}>{children}</blockquote>;
}

/** Only plain drawing SVG is accepted; it is shown through <img>, which never runs scripts, as a second guard. */
function safeSvg(raw: string): string | null {
  const svg = raw.trim();
  if (!/^<svg[\s>]/i.test(svg)) return null;
  if (/<script|<foreignObject|<iframe|<style[^>]*@import|\son\w+\s*=|javascript:|(?:href|src)\s*=\s*["']?(?:https?:|\/\/)/i.test(svg)) return null;
  return /\sxmlns\s*=/.test(svg.slice(0, 200)) ? svg : svg.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
}

/** ```svg fenced blocks are explanatory diagrams, ```lab blocks interactive experiments (see scraper/style/format-cours.md). */
function Pre({ children, node: _node, ...props }: { children?: ReactNode; node?: unknown }) {
  const child = Children.toArray(children)[0];
  if (isValidElement<{ className?: string; children?: ReactNode }>(child) && /\blanguage-lab\b/.test(child.props.className ?? "")) {
    return <Lab source={textOf(child.props.children)} />;
  }
  if (isValidElement<{ className?: string; children?: ReactNode }>(child) && /\blanguage-svg\b/.test(child.props.className ?? "")) {
    const svg = safeSvg(textOf(child.props.children));
    if (!svg) return null;
    const alt = svg.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "Schéma explicatif";
    return (
      <figure className="schema">
        <img alt={alt} loading="lazy" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} />
      </figure>
    );
  }
  return <pre {...props}>{children}</pre>;
}

export default function Markdown({ content, className = "" }: { content: string; className?: string }) {
  return (
    <div className={`prose-lesson ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkHighlight, remarkHeadingIds]}
        rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
        components={{ blockquote: Callout, pre: Pre }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
