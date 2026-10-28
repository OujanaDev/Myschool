import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Pause, Play, Target } from "lucide-react";
import { compile, type Compiled, type Scope } from "./expr.js";
import { fr, Slider, type LabConfig } from "./Lab";

/**
 * "courbe": curves driven by sliders. One lab kind for many notions: a function and its tangent (dérivation), an
 * area (intégrale), a parametric trajectory (mouvement), a sequence or a recurrence with its cobweb (suites),
 * u_C(t) of an RC circuit, a radioactive decay… All formulas go through expr.js; check.js validates the block.
 */
type Param = { nom: string; label: string; min: number; max: number; pas: number; valeur: number; unite?: string };
type Curve = {
  type?: "fonction" | "parametrique" | "suite" | "recurrence";
  expr?: string; x?: string; y?: string; de?: string | number; a?: string | number; u0?: string | number; n?: number;
  toile?: boolean; label?: string; couleur?: keyof typeof COLORS; pointille?: boolean;
};
type Axis = { min: number; max: number; label?: string };
type Config = LabConfig & {
  variable?: string; x: Axis; y: Axis; parametres?: Param[]; courbes: Curve[];
  point?: { courbe?: number; x: string; label?: string; tangente?: boolean };
  aire?: { courbe?: number; de: string; a: string };
  reperes?: { x?: string; y?: string; label?: string }[];
  mesures?: { label: string; expr: string; unite?: string; chiffres?: number }[];
  animation?: { parametre: string; duree?: number };
  defi?: { texte: string; condition: string; bravo?: string };
};

const W = 640;
const H = 360;
const ML = 54;
const MR = 18;
const MT = 18;
const MB = 40;
const COLORS = { principale: "#0f766e", accent: "#d97706", secondaire: "#7c3aed", gris: "#64748b" };
const CYCLE = [COLORS.principale, COLORS.accent, COLORS.secondaire, COLORS.gris];

/** Round tick values: steps of 1, 2 or 5 times a power of ten. */
function ticks(min: number, max: number, count = 6) {
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return out;
}

/** Polyline through the points, cut where the curve is undefined or jumps (vertical asymptote). */
function pathOf(points: [number, number][], jump: number) {
  let d = "";
  let open = false;
  let prev: [number, number] | null = null;
  for (const p of points) {
    const ok = Number.isFinite(p[0]) && Number.isFinite(p[1]);
    if (!ok || (prev && Math.abs(p[1] - prev[1]) > jump)) {
      open = false;
      prev = ok ? p : null;
      if (!ok) continue;
    }
    d += `${open ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    open = true;
    prev = p;
  }
  return d;
}

export default function CurveLab({ config: raw }: { config: LabConfig }) {
  const config = raw as Config;
  const variable = config.variable ?? "x";
  const params = useMemo(() => config.parametres ?? [], [config]);
  const names = useMemo(() => params.map((p) => p.nom), [params]);

  const [values, setValues] = useState<Scope>(() => Object.fromEntries(params.map((p) => [p.nom, p.valeur])));
  const [animating, setAnimating] = useState(false);
  const [solved, setSolved] = useState(false);
  const uid = useId().replace(/:/g, "");
  const startRef = useRef(0);

  const compiled = useMemo(() => {
    const c = (src: string | number | undefined, extra: string[] = []) => compile(String(src ?? 0), [...names, ...extra]);
    return {
      curves: config.courbes.map((k) => {
        const type = k.type ?? "fonction";
        if (type === "parametrique") return { type, x: c(k.x, ["t"]), y: c(k.y, ["t"]), de: c(k.de ?? 0), a: c(k.a) };
        if (type === "suite") return { type, f: c(k.expr, ["n"]) };
        if (type === "recurrence") return { type, u0: c(k.u0), f: c(k.expr, ["u", "n"]) };
        return { type, f: c(k.expr, [variable]) };
      }),
      point: config.point ? c(config.point.x) : null,
      area: config.aire ? { de: c(config.aire.de), a: c(config.aire.a) } : null,
      marks: (config.reperes ?? []).map((r) => ({ x: r.x !== undefined ? c(r.x) : null, y: r.y !== undefined ? c(r.y) : null, label: r.label ?? "" })),
      measures: (config.mesures ?? []).map((m) => ({ ...m, f: c(m.expr) })),
      challenge: config.defi ? c(config.defi.condition) : null,
    };
  }, [config, names, variable]);

  // Animation: the chosen parameter sweeps from its min to its max, then starts again.
  const anim = config.animation ? params.find((p) => p.nom === config.animation!.parametre) : undefined;
  useEffect(() => {
    if (!animating || !anim) return;
    const duration = (config.animation?.duree ?? 6) * 1000;
    let raf = 0;
    startRef.current = performance.now() - ((values[anim.nom] - anim.min) / (anim.max - anim.min)) * duration;
    const step = (now: number) => {
      const k = ((now - startRef.current) % duration) / duration;
      setValues((v) => ({ ...v, [anim.nom]: anim.min + k * (anim.max - anim.min) }));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animating, anim, config.animation?.duree]);

  useEffect(() => {
    if (compiled.challenge && compiled.challenge(values)) setSolved(true);
  }, [compiled, values]);

  const { x: X, y: Y } = config;
  const px = (x: number) => ML + ((x - X.min) / (X.max - X.min)) * (W - ML - MR);
  const py = (y: number) => H - MB - ((y - Y.min) / (Y.max - Y.min)) * (H - MT - MB);
  const span = Y.max - Y.min;
  const clampY = (y: number) => Math.max(Y.min - 2 * span, Math.min(Y.max + 2 * span, y));
  const jump = (H - MT - MB) * 2.5;

  const fnAt = (index: number, x: number) => {
    const k = compiled.curves[index];
    return k && k.type === "fonction" ? k.f({ ...values, [variable]: x }) : NaN;
  };

  const drawn = compiled.curves.map((k, i) => {
    const spec = config.courbes[i];
    const color = (spec.couleur && COLORS[spec.couleur]) || CYCLE[i % CYCLE.length];
    const dash = spec.pointille ? "6 5" : undefined;
    if (k.type === "fonction") {
      const pts: [number, number][] = [];
      for (let j = 0; j <= 480; j++) {
        const x = X.min + ((X.max - X.min) * j) / 480;
        pts.push([px(x), py(clampY(k.f({ ...values, [variable]: x })))]);
      }
      return { color, label: spec.label, elements: <path key={i} d={pathOf(pts, jump)} fill="none" stroke={color} strokeWidth="2.75" strokeDasharray={dash} strokeLinejoin="round" /> };
    }
    if (k.type === "parametrique") {
      const t0 = k.de(values);
      const t1 = k.a(values);
      const pts: [number, number][] = [];
      for (let j = 0; j <= 400; j++) {
        const t = t0 + ((t1 - t0) * j) / 400;
        pts.push([px(k.x({ ...values, t })), py(clampY(k.y({ ...values, t })))]);
      }
      return { color, label: spec.label, elements: <path key={i} d={pathOf(pts, jump)} fill="none" stroke={color} strokeWidth="2.75" strokeDasharray={dash} /> };
    }
    if (k.type === "suite") {
      const dots = Array.from({ length: (spec.n ?? 10) + 1 }, (_, n) => [n, k.f({ ...values, n })] as const);
      return {
        color,
        label: spec.label,
        elements: (
          <g key={i} fill={color}>
            {dots.filter(([, u]) => Number.isFinite(u)).map(([n, u]) => <circle key={n} cx={px(n)} cy={py(clampY(u))} r="4" />)}
          </g>
        ),
      };
    }
    // recurrence: u(n+1) = f(u(n), n)
    const terms = [k.u0(values)];
    for (let n = 0; n < (spec.n ?? 10); n++) terms.push(k.f({ ...values, u: terms[n], n }));
    if (!spec.toile) {
      return {
        color,
        label: spec.label,
        terms,
        elements: (
          <g key={i} fill={color}>
            {terms.map((u, n) => Number.isFinite(u) && <circle key={n} cx={px(n)} cy={py(clampY(u))} r="4" />)}
          </g>
        ),
      };
    }
    // Cobweb: y = f(x), y = x, and the staircase u0 → u1 → u2…
    const fx: [number, number][] = [];
    for (let j = 0; j <= 400; j++) {
      const x = X.min + ((X.max - X.min) * j) / 400;
      fx.push([px(x), py(clampY(k.f({ ...values, u: x, n: 0 })))]);
    }
    let web = `M${px(terms[0]).toFixed(1)},${py(Math.max(Y.min, Math.min(Y.max, 0))).toFixed(1)}`;
    for (let n = 0; n + 1 < terms.length && Number.isFinite(terms[n + 1]); n++) {
      web += `L${px(terms[n]).toFixed(1)},${py(clampY(terms[n + 1])).toFixed(1)}L${px(terms[n + 1]).toFixed(1)},${py(clampY(terms[n + 1])).toFixed(1)}`;
    }
    return {
      color,
      label: spec.label,
      terms,
      elements: (
        <g key={i}>
          <line x1={px(Math.max(X.min, Y.min))} y1={py(Math.max(X.min, Y.min))} x2={px(Math.min(X.max, Y.max))} y2={py(Math.min(X.max, Y.max))} stroke="#94a3b8" strokeWidth="1.5" />
          <path d={pathOf(fx, jump)} fill="none" stroke={color} strokeWidth="2.75" />
          <path d={web} fill="none" stroke={COLORS.accent} strokeWidth="1.75" />
          {terms.slice(0, 6).map((u, n) => Number.isFinite(u) && <circle key={n} cx={px(u)} cy={py(Math.max(Y.min, Math.min(Y.max, 0)))} r="3.5" fill={COLORS.accent} />)}
        </g>
      ),
    };
  });

  // Point on a function curve, with its tangent.
  let point: { x: number; y: number; slope: number } | null = null;
  if (config.point && compiled.point) {
    const ci = config.point.courbe ?? 0;
    const x0 = compiled.point(values);
    const y0 = fnAt(ci, x0);
    const h = (X.max - X.min) * 1e-4;
    const slope = (fnAt(ci, x0 + h) - fnAt(ci, x0 - h)) / (2 * h);
    if (Number.isFinite(x0) && Number.isFinite(y0)) point = { x: x0, y: y0, slope };
  }

  // Shaded area between a function curve and the x axis, with its signed integral (Simpson).
  let area: { d: string; value: number } | null = null;
  if (config.aire && compiled.area) {
    const ci = config.aire.courbe ?? 0;
    const a = compiled.area.de(values);
    const b = compiled.area.a(values);
    if (Number.isFinite(a) && Number.isFinite(b) && a !== b) {
      const steps = 200;
      const hh = (b - a) / steps;
      let sum = 0;
      let d = `M${px(a).toFixed(1)},${py(0).toFixed(1)}`;
      for (let j = 0; j <= steps; j++) {
        const x = a + j * hh;
        const y = fnAt(ci, x);
        sum += (j === 0 || j === steps ? 1 : j % 2 ? 4 : 2) * (Number.isFinite(y) ? y : 0);
        d += `L${px(x).toFixed(1)},${py(clampY(Number.isFinite(y) ? y : 0)).toFixed(1)}`;
      }
      d += `L${px(b).toFixed(1)},${py(0).toFixed(1)}Z`;
      area = { d, value: (sum * hh) / 3 };
    }
  }

  const x0Axis = X.min <= 0 && X.max >= 0 ? px(0) : ML;
  const y0Axis = Y.min <= 0 && Y.max >= 0 ? py(0) : H - MB;
  const xs = ticks(X.min, X.max, 8);
  const ys = ticks(Y.min, Y.max, 6);
  const clip = `${uid}-clip`;
  const firstRecurrence = drawn.find((d) => "terms" in d && d.terms) as { terms: number[] } | undefined;

  return (
    <div className="lab-body">
      <svg viewBox={`0 0 ${W} ${H}`} className="lab-stage" role="img" aria-label={config.titre ?? "Courbe"}>
        <defs>
          <pattern id={`${uid}-g`} width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0H0V10" fill="none" stroke="#e3f1ee" strokeWidth="1" />
          </pattern>
          <clipPath id={clip}>
            <rect x={ML} y={MT} width={W - ML - MR} height={H - MT - MB} />
          </clipPath>
        </defs>
        <rect width={W} height={H} fill="#fbfefd" />
        <rect x={ML} y={MT} width={W - ML - MR} height={H - MT - MB} fill={`url(#${uid}-g)`} stroke="#cde6e1" />

        {/* ticks and labels */}
        <g fontSize="11" fill="#64748b">
          {xs.map((v) => (
            <g key={`x${v}`}>
              <line x1={px(v)} y1={MT} x2={px(v)} y2={H - MB} stroke="#cde6e1" />
              <text x={px(v)} y={H - MB + 16} textAnchor="middle">{fr(v, 3)}</text>
            </g>
          ))}
          {ys.map((v) => (
            <g key={`y${v}`}>
              <line x1={ML} y1={py(v)} x2={W - MR} y2={py(v)} stroke="#cde6e1" />
              <text x={ML - 6} y={py(v) + 4} textAnchor="end">{fr(v, 3)}</text>
            </g>
          ))}
          {X.label && <text x={W - MR} y={H - 6} textAnchor="end" fontWeight="600" fill="#475569">{X.label}</text>}
          {Y.label && <text x={ML} y={MT - 5} fontWeight="600" fill="#475569">{Y.label}</text>}
        </g>
        <line x1={ML} y1={y0Axis} x2={W - MR} y2={y0Axis} stroke="#475569" strokeWidth="1.25" />
        <line x1={x0Axis} y1={MT} x2={x0Axis} y2={H - MB} stroke="#475569" strokeWidth="1.25" />

        <g clipPath={`url(#${clip})`}>
          {area && <path d={area.d} fill={COLORS.principale} fillOpacity="0.16" stroke="none" />}
          {compiled.marks.map((m, i) => {
            const mx = m.x?.(values);
            const my = m.y?.(values);
            return (
              <g key={i} stroke="#b45309" fill="#b45309" fontSize="12" fontWeight="700">
                {mx !== undefined && Number.isFinite(mx) && (
                  <>
                    <line x1={px(mx)} y1={MT} x2={px(mx)} y2={H - MB} strokeDasharray="4 4" />
                    <text x={px(mx) + 4} y={MT + 14} stroke="none">{m.label}</text>
                  </>
                )}
                {my !== undefined && Number.isFinite(my) && (
                  <>
                    <line x1={ML} y1={py(my)} x2={W - MR} y2={py(my)} strokeDasharray="4 4" />
                    <text x={W - MR - 4} y={py(my) - 5} textAnchor="end" stroke="none">{m.label}</text>
                  </>
                )}
              </g>
            );
          })}
          {drawn.map((d) => d.elements)}
          {point && config.point?.tangente && Number.isFinite(point.slope) && (
            <line
              x1={px(X.min)} y1={py(clampY(point.y + point.slope * (X.min - point.x)))}
              x2={px(X.max)} y2={py(clampY(point.y + point.slope * (X.max - point.x)))}
              stroke={COLORS.accent} strokeWidth="2" strokeDasharray="7 5"
            />
          )}
          {point && (
            <g>
              <line x1={px(point.x)} y1={py(point.y)} x2={px(point.x)} y2={y0Axis} stroke="#94a3b8" strokeDasharray="3 4" />
              <line x1={px(point.x)} y1={py(point.y)} x2={x0Axis} y2={py(point.y)} stroke="#94a3b8" strokeDasharray="3 4" />
              <circle cx={px(point.x)} cy={py(point.y)} r="6" fill={COLORS.accent} stroke="#fff" strokeWidth="2" />
              <text x={px(point.x) + 10} y={py(point.y) - 10} fontSize="13" fontWeight="700" fill="#b45309">{config.point?.label ?? "M"}</text>
            </g>
          )}
        </g>
      </svg>

      {drawn.some((d) => d.label) && (
        <ul className="lab-legend">
          {drawn.map((d, i) => d.label && (
            <li key={i}><span style={{ background: d.color }} aria-hidden />{d.label}</li>
          ))}
        </ul>
      )}

      {anim && (
        <div className="lab-toolbar">
          <button type="button" className="lab-btn" onClick={() => setAnimating((a) => !a)} aria-pressed={animating}>
            {animating ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
            {animating ? "Pause" : `Animer ${anim.label.toLowerCase()}`}
          </button>
        </div>
      )}

      {params.length > 0 && (
        <div className="lab-controls">
          {params.map((p) => (
            <Slider
              key={p.nom}
              label={p.label}
              value={Math.round(values[p.nom] / p.pas) * p.pas}
              min={p.min}
              max={p.max}
              step={p.pas}
              unit={p.unite ?? ""}
              onChange={(v) => {
                if (anim?.nom === p.nom) setAnimating(false);
                setValues((s) => ({ ...s, [p.nom]: v }));
              }}
            />
          ))}
        </div>
      )}

      {(compiled.measures.length > 0 || point || area || firstRecurrence) && (
        <dl className="lab-readouts" aria-live="polite">
          {point && (
            <div>
              <dt>Point {config.point?.label ?? "M"}</dt>
              <dd>({fr(point.x, 3)} ; {fr(point.y, 3)}){config.point?.tangente && Number.isFinite(point.slope) && <> : pente de la tangente <b>{fr(point.slope, 3)}</b></>}</dd>
            </div>
          )}
          {area && (
            <div>
              <dt>Intégrale (aire algébrique)</dt>
              <dd><b>{fr(area.value, 3)}</b></dd>
            </div>
          )}
          {firstRecurrence && (
            <div>
              <dt>Premiers termes</dt>
              <dd>{firstRecurrence.terms.slice(0, 5).map((u, n) => `u${n} = ${fr(u, 3)}`).join(" ; ")}…</dd>
            </div>
          )}
          {compiled.measures.map((m, i) => (
            <div key={i}>
              <dt>{m.label}</dt>
              <dd><b>{fr(m.f(values), m.chiffres ?? 3)}</b> {m.unite ?? ""}</dd>
            </div>
          ))}
        </dl>
      )}

      {config.defi && (
        <p className={solved ? "lab-challenge is-solved" : "lab-challenge"} aria-live="polite">
          {solved ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : <Target className="h-4 w-4 shrink-0" aria-hidden />}
          <span>{solved ? config.defi.bravo ?? "Bravo, défi réussi !" : config.defi.texte}</span>
        </p>
      )}
    </div>
  );
}
