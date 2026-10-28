/**
 * Safe evaluation of the small formulas written in lab blocks ("E*(1-exp(-t/(R*C)))"): a hand-written parser that
 * only knows numbers, variables, + - * / ^, comparisons, parentheses and a fixed list of maths functions.
 * Nothing is ever passed to eval or Function. Plain JavaScript so that the scraper can check the formulas Claude
 * writes with the very code the site runs (see check.js).
 */

const FUNCTIONS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  exp: Math.exp, ln: Math.log, log: Math.log10, log10: Math.log10, log2: Math.log2, sqrt: Math.sqrt, cbrt: Math.cbrt,
  abs: Math.abs, floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign,
  min: Math.min, max: Math.max, pow: Math.pow,
  // si(condition, alors, sinon): piecewise functions ("si(t<0, 0, E)").
  si: (c, a, b) => (c ? a : b),
};
const CONSTANTS = { pi: Math.PI, e: Math.E };
const LETTER = "A-Za-z_αβγδεθλμνπρστφωΔΩ";

function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const rest = src.slice(i);
    let m;
    if (/\s/.test(c)) {
      i++;
    } else if ((m = rest.match(/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i))) {
      out.push({ kind: "num", value: m[0] });
      i += m[0].length;
    } else if ((m = rest.match(new RegExp(`^[${LETTER}][${LETTER}\\d]*`)))) {
      out.push({ kind: "id", value: m[0] });
      i += m[0].length;
    } else if (/[<>=!]/.test(c) && src[i + 1] === "=") {
      out.push({ kind: "op", value: c + "=" });
      i += 2;
    } else if (/[+\-*/^<>]/.test(c)) {
      out.push({ kind: "op", value: c });
      i++;
    } else if (c === "(" || c === ")" || c === ",") {
      out.push({ kind: c, value: c });
      i++;
    } else {
      throw new Error(`caractère inattendu « ${c} »`);
    }
  }
  return out;
}

/**
 * Compiles a formula into a function of a scope ({x: 1, R: 1000, ...}). `names` lists the variables it may use:
 * an unknown name, an unknown function or a syntax error throws at once, when the lab is loaded or checked.
 * The compiled function returns NaN instead of an infinite or undefined value.
 */
export function compile(src, names) {
  const tokens = tokenize(String(src));
  const known = new Set([...names, ...Object.keys(CONSTANTS)]);
  let pos = 0;
  const peek = () => tokens[pos];
  const take = (kind) => {
    const t = tokens[pos];
    if (!t || (kind && t.kind !== kind)) throw new Error(`formule invalide près de « ${t?.value ?? "la fin"} »`);
    pos++;
    return t;
  };

  // comparison < additive < multiplicative (with implicit products) < unary < power < primary
  const comparison = () => {
    const left = additive();
    const t = peek();
    if (t?.kind === "op" && ["<", ">", "<=", ">=", "=="].includes(t.value)) {
      pos++;
      const right = additive();
      const op = t.value;
      return (s) => {
        const a = left(s);
        const b = right(s);
        return Number(op === "<" ? a < b : op === ">" ? a > b : op === "<=" ? a <= b : op === ">=" ? a >= b : Math.abs(a - b) < 1e-9);
      };
    }
    return left;
  };
  const additive = () => {
    let left = multiplicative();
    while (peek()?.kind === "op" && (peek().value === "+" || peek().value === "-")) {
      const op = take().value;
      const l = left;
      const r = multiplicative();
      left = op === "+" ? (s) => l(s) + r(s) : (s) => l(s) - r(s);
    }
    return left;
  };
  const multiplicative = () => {
    let left = unary();
    for (;;) {
      const t = peek();
      if (t?.kind === "op" && (t.value === "*" || t.value === "/")) {
        pos++;
        const l = left;
        const r = unary();
        left = t.value === "*" ? (s) => l(s) * r(s) : (s) => l(s) / r(s);
      } else if (t && (t.kind === "num" || t.kind === "id" || t.kind === "(")) {
        // Implicit product: "2x", "2(x+1)", "x sin(x)".
        const l = left;
        const r = power();
        left = (s) => l(s) * r(s);
      } else return left;
    }
  };
  const unary = () => {
    const t = peek();
    if (t?.kind === "op" && (t.value === "-" || t.value === "+")) {
      pos++;
      const inner = unary();
      return t.value === "-" ? (s) => -inner(s) : inner;
    }
    return power();
  };
  const power = () => {
    const base = primary();
    if (peek()?.kind === "op" && peek().value === "^") {
      pos++;
      const exp = unary(); // right-associative, "2^-x" allowed
      return (s) => Math.pow(base(s), exp(s));
    }
    return base;
  };
  const primary = () => {
    const t = take();
    if (t.kind === "num") {
      const v = Number(t.value);
      return () => v;
    }
    if (t.kind === "(") {
      const inner = comparison();
      take(")");
      return inner;
    }
    if (t.kind === "id") {
      if (peek()?.kind === "(" && !names.includes(t.value)) {
        const fn = FUNCTIONS[t.value];
        if (!fn) throw new Error(`fonction inconnue « ${t.value} »`);
        take("(");
        const args = [];
        if (peek()?.kind !== ")") {
          args.push(comparison());
          while (peek()?.kind === ",") {
            pos++;
            args.push(comparison());
          }
        }
        take(")");
        return (s) => fn(...args.map((a) => a(s)));
      }
      if (!known.has(t.value)) throw new Error(`variable inconnue « ${t.value} »`);
      const name = t.value;
      if (!names.includes(name)) {
        const v = CONSTANTS[name];
        return () => v;
      }
      return (s) => s[name];
    }
    throw new Error(`formule invalide près de « ${t.value} »`);
  };

  const result = comparison();
  if (pos < tokens.length) throw new Error(`formule invalide près de « ${tokens[pos].value} »`);
  return (scope) => {
    const v = result(scope);
    return Number.isFinite(v) ? v : NaN;
  };
}
