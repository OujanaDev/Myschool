import { useEffect, useMemo, useState } from "react";
import { Check, Target } from "lucide-react";
import { fr, type LabConfig } from "./Lab";

/**
 * "echiquier": a genetic cross. The student picks the genotype of each parent and reads the gametes, the cross
 * grid (échiquier de croisement) and the proportions of the offspring phenotypes.
 * 1 or 2 independent genes; alleles listed from the most to the least dominant; "heterozygotes" names the phenotype
 * of codominant or intermediate pairs ({"A/B": "groupe AB"}); "lie_au_sexe" puts a single gene on X (parent2 is the father).
 */
type Allele = { symbole: string; phenotype: string };
type Gene = { caractere: string; alleles: Allele[]; heterozygotes?: Record<string, string> };
type Config = LabConfig & {
  genes: Gene[];
  lie_au_sexe?: boolean;
  parent1: string[][];
  parent2: string[][];
  defi?: { texte: string; proportions: Record<string, number>; bravo?: string };
};
type Gamete = { alleles: string[]; weight: number };

const TINTS = [
  { bg: "#ccfbf1", fg: "#134e4a", bar: "#0f766e" },
  { bg: "#fef3c7", fg: "#78350f", bar: "#d97706" },
  { bg: "#ede9fe", fg: "#4c1d95", bar: "#7c3aed" },
  { bg: "#e0f2fe", fg: "#0c4a6e", bar: "#0284c7" },
  { bg: "#ffe4e6", fg: "#881337", bar: "#e11d48" },
  { bg: "#ecfccb", fg: "#365314", bar: "#65a30d" },
  { bg: "#f1f5f9", fg: "#1e293b", bar: "#64748b" },
  { bg: "#ffedd5", fg: "#7c2d12", bar: "#ea580c" },
];

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const fraction = (n: number, d: number) => {
  const g = gcd(n, d);
  return `${n / g}/${d / g}`;
};

export default function GeneticsLab({ config: raw }: { config: LabConfig }) {
  const config = raw as Config;
  const { genes } = config;
  const xLinked = !!config.lie_au_sexe;
  const [p1, setP1] = useState<string[][]>(() => config.parent1.map((p) => [...p]));
  const [p2, setP2] = useState<string[][]>(() => config.parent2.map((p) => [...p]));
  const [solved, setSolved] = useState(false);

  const rank = (g: number, s: string) => genes[g].alleles.findIndex((a) => a.symbole === s);
  const sortPair = (g: number, pair: string[]) => [...pair].sort((a, b) => rank(g, a) - rank(g, b));
  const allele = (g: number, s: string) => (xLinked ? `X${s}` : s);
  const genotype = (g: number, pair: string[]) => (pair.length === 1 ? `${allele(g, pair[0])}//Y` : `${allele(g, pair[0])}//${allele(g, pair[1])}`);
  // In the grid, X-linked alleles are written as textbooks do: X with the allele in superscript.
  const alleleNode = (s: string) => (s === "Y" ? "Y" : xLinked ? <>X<sup>{s}</sup></> : s);
  const genotypeNode = (pair: string[]) => (
    <>
      {alleleNode(pair[0])}//{pair.length === 1 ? "Y" : alleleNode(pair[1])}
    </>
  );

  /** Phenotype of one gene: homozygote, named heterozygote (codominance), or the most dominant allele. */
  const phenotypeOf = (g: number, pair: string[]) => {
    const gene = genes[g];
    const [a, b] = sortPair(g, pair);
    if (b === undefined || a === b) return gene.alleles[rank(g, a)].phenotype;
    return gene.heterozygotes?.[`${a}/${b}`] ?? gene.heterozygotes?.[`${b}/${a}`] ?? gene.alleles[rank(g, a)].phenotype;
  };

  /** Every genotype a parent can have, for the selectors: all pairs of alleles (one allele + Y for a father, X-linked). */
  const options = (g: number, male: boolean) => {
    const symbols = genes[g].alleles.map((a) => a.symbole);
    if (xLinked && male) return symbols.map((s) => [s]);
    const out: string[][] = [];
    symbols.forEach((a, i) => symbols.slice(i).forEach((b) => out.push([a, b])));
    return out;
  };

  const gametesOf = (parent: string[][], male: boolean): Gamete[] => {
    let list: Gamete[] = [{ alleles: [], weight: 1 }];
    parent.forEach((pair) => {
      const sources = xLinked && male ? [pair[0], "Y"] : pair;
      const next: Gamete[] = [];
      for (const g of list) for (const s of sources) next.push({ alleles: [...g.alleles, s], weight: g.weight });
      list = next;
    });
    // Merge identical gametes (an homozygote gives one kind of gamete).
    const merged = new Map<string, Gamete>();
    for (const g of list) {
      const key = g.alleles.join("|");
      const m = merged.get(key);
      if (m) m.weight += g.weight;
      else merged.set(key, { ...g });
    }
    return [...merged.values()];
  };

  const result = useMemo(() => {
    const g1 = gametesOf(p1, false);
    const g2 = gametesOf(p2, true);
    const total1 = g1.reduce((a, g) => a + g.weight, 0);
    const total2 = g2.reduce((a, g) => a + g.weight, 0);
    const counts = new Map<string, number>();
    const cells = g1.map((a) =>
      g2.map((b) => {
        const son = xLinked && b.alleles[0] === "Y";
        const pairs = genes.map((_, g) => (son ? [a.alleles[g]] : sortPair(g, [a.alleles[g], b.alleles[g]])));
        const core = pairs.map((pair, g) => phenotypeOf(g, pair)).join(", ");
        const label = xLinked ? `${son ? "♂" : "♀"} [${core}]` : `[${core}]`;
        counts.set(core, (counts.get(core) ?? 0) + a.weight * b.weight);
        return { pairs, label, core, weight: a.weight * b.weight };
      })
    );
    const total = total1 * total2;
    const phenotypes = [...counts.entries()].map(([core, n]) => ({ core, n, frac: fraction(n, total), share: n / total }));
    return { g1, g2, total1, total2, cells, phenotypes };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p1, p2, config]);

  const colorOf = (core: string) => TINTS[Math.max(0, result.phenotypes.findIndex((p) => p.core === core)) % TINTS.length];

  useEffect(() => {
    const target = config.defi?.proportions;
    if (!target) return;
    const got = Object.fromEntries(result.phenotypes.map((p) => [p.core, p.share]));
    const keys = new Set([...Object.keys(target), ...Object.keys(got)]);
    if ([...keys].every((k) => Math.abs((target[k] ?? 0) - (got[k] ?? 0)) < 1e-6)) setSolved(true);
  }, [result, config.defi]);

  const selector = (who: 1 | 2) => {
    const state = who === 1 ? p1 : p2;
    const set = who === 1 ? setP1 : setP2;
    const male = who === 2;
    return genes.map((gene, g) => (
      <label key={g} className="lab-select">
        <span>{genes.length > 1 ? gene.caractere : "Génotype"}</span>
        <select
          value={state[g].join("|")}
          onChange={(e) => set((s) => s.map((pair, i) => (i === g ? e.target.value.split("|") : pair)))}
        >
          {options(g, male).map((pair) => (
            <option key={pair.join("|")} value={pair.join("|")}>
              {genotype(g, pair)} [{phenotypeOf(g, pair)}]
            </option>
          ))}
        </select>
      </label>
    ));
  };

  const gameteLabel = (g: Gamete) => g.alleles.map((s, i) => <span key={i}>{i > 0 && " "}{alleleNode(s)}</span>);

  return (
    <div className="lab-body">
      <div className="lab-parents">
        <fieldset>
          <legend>{xLinked ? "Mère ♀" : "Parent 1"}</legend>
          {selector(1)}
        </fieldset>
        <span className="lab-cross" aria-hidden>×</span>
        <fieldset>
          <legend>{xLinked ? "Père ♂" : "Parent 2"}</legend>
          {selector(2)}
        </fieldset>
      </div>

      <div className="lab-grid-wrap">
        <table className="lab-grid">
          <caption>
            Échiquier de croisement : gamètes {xLinked ? "du père" : "du parent 2"} en colonnes, {xLinked ? "de la mère" : "du parent 1"} en lignes
          </caption>
          <thead>
            <tr>
              <th scope="col" className="lab-grid-corner">♀ \ ♂</th>
              {result.g2.map((g, j) => (
                <th key={j} scope="col">
                  {gameteLabel(g)}
                  <small>{fraction(g.weight, result.total2)}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.g1.map((a, i) => (
              <tr key={i}>
                <th scope="row">
                  {gameteLabel(a)}
                  <small>{fraction(a.weight, result.total1)}</small>
                </th>
                {result.cells[i].map((cell, j) => {
                  const tint = colorOf(cell.core);
                  return (
                    <td key={j} style={{ background: tint.bg, color: tint.fg }}>
                      <span className="lab-genotype">
                        {cell.pairs.map((pair, g) => (
                          <span key={g}>{g > 0 && " ; "}{genotypeNode(pair)}</span>
                        ))}
                      </span>
                      <span className="lab-phenotype">{cell.label}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="lab-shares" aria-live="polite">
        <div className="lab-share-bar" aria-hidden>
          {result.phenotypes.map((p) => (
            <span key={p.core} style={{ width: `${p.share * 100}%`, background: colorOf(p.core).bar }} />
          ))}
        </div>
        <ul>
          {result.phenotypes.map((p) => (
            <li key={p.core}>
              <span className="lab-swatch" style={{ background: colorOf(p.core).bar }} aria-hidden />
              [{p.core}] : <b>{p.frac}</b> ({fr(p.share * 100, 1)} %)
            </li>
          ))}
        </ul>
      </div>

      {config.defi && (
        <p className={solved ? "lab-challenge is-solved" : "lab-challenge"} aria-live="polite">
          {solved ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : <Target className="h-4 w-4 shrink-0" aria-hidden />}
          <span>{solved ? config.defi.bravo ?? "Bravo : vous avez trouvé le bon croisement !" : config.defi.texte}</span>
        </p>
      )}
    </div>
  );
}
