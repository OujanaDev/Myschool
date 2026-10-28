/**
 * Checks a lab block (the JSON of a ```lab fence) before it is shown or inserted in a course. Returns the list of
 * problems, empty when the lab is usable. Shared by the site (an invalid lab is not displayed) and by
 * scraper/src/labs.mjs (a lab Claude wrote is not inserted unless it passes).
 */
import { compile } from "./expr.js";

const ID = /^[A-Za-z_αβγδεθλμνπρστφωΔΩ][\wαβγδεθλμνπρστφωΔΩ]*$/;
const RESERVED = new Set(["pi", "e", "t", "n", "u"]);
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isText = (v, max = 400) => typeof v === "string" && v.trim().length > 0 && v.length <= max;

function tryCompile(problems, where, src, names) {
  try {
    if (typeof src !== "string" && typeof src !== "number") throw new Error("formule manquante");
    return compile(String(src), names);
  } catch (err) {
    problems.push(`${where} : ${err.message}`);
    return null;
  }
}

function checkWave(c, problems) {
  const r = c.reglages ?? {};
  for (const [k, lo, hi] of [["frequence", 1, 10], ["celerite", 0.5, 5], ["longueur", 0.5, 5]]) {
    if (r[k] !== undefined && (!isNum(r[k]) || r[k] < lo || r[k] > hi)) problems.push(`reglages.${k} doit être entre ${lo} et ${hi}`);
  }
  if (r.loupe !== undefined && (!isNum(r.loupe) || r.loupe < 0 || r.loupe > (r.longueur ?? 2))) problems.push("reglages.loupe doit être sur la corde");
  const tools = c.outils ?? [];
  if (!Array.isArray(tools) || tools.some((t) => !["stroboscope", "loupe"].includes(t))) problems.push('outils : "stroboscope" et/ou "loupe"');
  if (c.defi && !["phase", "opposition", "quadrature"].includes(c.defi.relation)) problems.push('defi.relation : "phase", "opposition" ou "quadrature"');
  if (c.defi && !tools.includes("loupe")) problems.push("un défi demande l'outil loupe");
}

function checkCurve(c, problems) {
  const variable = c.variable ?? "x";
  if (!ID.test(variable)) problems.push("variable : un nom simple (x, t…)");
  for (const axis of ["x", "y"]) {
    const a = c[axis];
    if (!a || !isNum(a.min) || !isNum(a.max) || a.min >= a.max) problems.push(`${axis} : {"min": …, "max": …} avec min < max`);
  }
  const params = Array.isArray(c.parametres) ? c.parametres : [];
  if (params.length > 5) problems.push("au plus 5 paramètres");
  const names = [];
  for (const [i, p] of params.entries()) {
    const at = `parametres[${i}]`;
    if (!p || !ID.test(p.nom ?? "") || RESERVED.has(p.nom) || p.nom === variable || names.includes(p.nom)) problems.push(`${at}.nom : nom simple, unique, différent de la variable`);
    if (!isText(p?.label, 80)) problems.push(`${at}.label manquant`);
    if (!isNum(p?.min) || !isNum(p?.max) || p.min >= p.max || !isNum(p?.pas) || p.pas <= 0 || p.pas > p.max - p.min) problems.push(`${at} : min < max et 0 < pas ≤ max − min`);
    else if (!isNum(p.valeur) || p.valeur < p.min || p.valeur > p.max) problems.push(`${at}.valeur doit être entre min et max`);
    if (p?.nom) names.push(p.nom);
  }
  const defaults = Object.fromEntries(params.filter((p) => p && isNum(p.valeur)).map((p) => [p.nom, p.valeur]));

  const curves = Array.isArray(c.courbes) ? c.courbes : [];
  if (!curves.length || curves.length > 4) problems.push("courbes : de 1 à 4 courbes");
  const fnIndexes = [];
  let visible = false;
  for (const [i, k] of curves.entries()) {
    const at = `courbes[${i}]`;
    const type = k?.type ?? "fonction";
    if (type === "fonction") {
      const f = tryCompile(problems, `${at}.expr`, k.expr, [...names, variable]);
      fnIndexes.push(i);
      if (f && c.x && c.y && isNum(c.x.min) && isNum(c.x.max)) {
        let inside = 0;
        for (let j = 0; j <= 100; j++) {
          const y = f({ ...defaults, [variable]: c.x.min + ((c.x.max - c.x.min) * j) / 100 });
          if (Number.isFinite(y) && y >= c.y.min && y <= c.y.max) inside++;
        }
        if (inside >= 20) visible = true;
      }
    } else if (type === "parametrique") {
      tryCompile(problems, `${at}.x`, k.x, [...names, "t"]);
      tryCompile(problems, `${at}.y`, k.y, [...names, "t"]);
      tryCompile(problems, `${at}.de`, k.de ?? 0, names);
      tryCompile(problems, `${at}.a`, k.a, names);
      visible = true;
    } else if (type === "suite") {
      tryCompile(problems, `${at}.expr`, k.expr, [...names, "n"]);
      if (!Number.isInteger(k.n) || k.n < 2 || k.n > 60) problems.push(`${at}.n : entier entre 2 et 60`);
      visible = true;
    } else if (type === "recurrence") {
      tryCompile(problems, `${at}.u0`, k.u0, names);
      tryCompile(problems, `${at}.expr`, k.expr, [...names, "u", "n"]);
      if (!Number.isInteger(k.n) || k.n < 2 || k.n > 60) problems.push(`${at}.n : entier entre 2 et 60`);
      visible = true;
    } else {
      problems.push(`${at}.type : "fonction", "parametrique", "suite" ou "recurrence"`);
    }
    if (k?.label !== undefined && !isText(k.label, 40)) problems.push(`${at}.label trop long`);
  }
  if (curves.length && !visible) problems.push("aucune courbe n'apparaît dans la fenêtre x/y avec les valeurs par défaut");

  if (c.point) {
    if (!fnIndexes.includes(c.point.courbe ?? 0)) problems.push("point.courbe : indice d'une courbe de type fonction");
    tryCompile(problems, "point.x", c.point.x, names);
  }
  if (c.aire) {
    if (!fnIndexes.includes(c.aire.courbe ?? 0)) problems.push("aire.courbe : indice d'une courbe de type fonction");
    tryCompile(problems, "aire.de", c.aire.de, names);
    tryCompile(problems, "aire.a", c.aire.a, names);
  }
  for (const [i, r] of (Array.isArray(c.reperes) ? c.reperes : []).entries()) {
    if (r?.x === undefined && r?.y === undefined) problems.push(`reperes[${i}] : x ou y`);
    if (r?.x !== undefined) tryCompile(problems, `reperes[${i}].x`, r.x, names);
    if (r?.y !== undefined) tryCompile(problems, `reperes[${i}].y`, r.y, names);
  }
  const measures = Array.isArray(c.mesures) ? c.mesures : [];
  if (measures.length > 4) problems.push("au plus 4 mesures");
  for (const [i, m] of measures.entries()) {
    if (!isText(m?.label, 80)) problems.push(`mesures[${i}].label manquant`);
    tryCompile(problems, `mesures[${i}].expr`, m?.expr, names);
  }
  if (c.animation && !names.includes(c.animation.parametre)) problems.push("animation.parametre : le nom d'un paramètre");
  if (c.defi) {
    if (!isText(c.defi.texte)) problems.push("defi.texte manquant");
    const cond = tryCompile(problems, "defi.condition", c.defi.condition, names);
    if (cond && cond(defaults)) problems.push("defi.condition est déjà vraie avec les valeurs par défaut");
  }
}

function checkGenetics(c, problems) {
  const genes = Array.isArray(c.genes) ? c.genes : [];
  if (genes.length < 1 || genes.length > 2) problems.push("genes : 1 ou 2 gènes");
  if (c.lie_au_sexe && genes.length !== 1) problems.push("lie_au_sexe : un seul gène");
  for (const [i, g] of genes.entries()) {
    const at = `genes[${i}]`;
    if (!isText(g?.caractere, 60)) problems.push(`${at}.caractere manquant`);
    const alleles = Array.isArray(g?.alleles) ? g.alleles : [];
    if (alleles.length < 2 || alleles.length > 4) problems.push(`${at}.alleles : de 2 à 4 allèles`);
    const symbols = alleles.map((a) => a?.symbole);
    if (symbols.some((s) => !isText(s, 6)) || new Set(symbols).size !== symbols.length) problems.push(`${at}.alleles : symboles courts et distincts`);
    if (alleles.some((a) => !isText(a?.phenotype, 40))) problems.push(`${at}.alleles : un phénotype par allèle`);
    for (const [pair, ph] of Object.entries(g?.heterozygotes ?? {})) {
      const [a, b] = pair.split("/");
      if (!symbols.includes(a) || !symbols.includes(b) || !isText(ph, 40)) problems.push(`${at}.heterozygotes : clés "A/B" d'allèles du gène, valeur = phénotype`);
    }
  }
  const checkParent = (p, at, male) => {
    if (!Array.isArray(p) || p.length !== genes.length) return problems.push(`${at} : un génotype par gène`);
    p.forEach((pair, i) => {
      const symbols = (genes[i]?.alleles ?? []).map((a) => a.symbole);
      const size = c.lie_au_sexe && male ? 1 : 2;
      if (!Array.isArray(pair) || pair.length !== size || pair.some((s) => !symbols.includes(s))) problems.push(`${at}[${i}] : ${size} allèle(s) du gène`);
    });
  };
  checkParent(c.parent1, "parent1", false);
  checkParent(c.parent2, "parent2", true);
  if (c.defi) {
    if (!isText(c.defi.texte)) problems.push("defi.texte manquant");
    const props = c.defi.proportions;
    if (!props || typeof props !== "object" || !Object.values(props).every((v) => isNum(v) && v > 0 && v <= 1)) problems.push("defi.proportions : {phénotype: fraction}");
  }
}

const CHECKS = { "onde-corde": checkWave, courbe: checkCurve, echiquier: checkGenetics };
export const LAB_KINDS = Object.keys(CHECKS);

export function checkLab(config) {
  const problems = [];
  if (!config || typeof config !== "object") return ["le bloc n'est pas un objet JSON"];
  if (!CHECKS[config.labo]) return [`labo inconnu « ${config.labo} » (${LAB_KINDS.join(", ")})`];
  if (!isText(config.titre, 90)) problems.push("titre manquant ou trop long (90 caractères)");
  if (!isText(config.consigne, 400)) problems.push("consigne manquante ou trop longue (400 caractères)");
  try {
    CHECKS[config.labo](config, problems);
  } catch (err) {
    problems.push(`bloc illisible : ${err.message}`);
  }
  return problems;
}
