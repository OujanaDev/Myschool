import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { Check, Pause, Play, RotateCcw, Target } from "lucide-react";
import { fr, Slider, type LabConfig } from "./Lab";

/**
 * "onde-corde": a progressive sinusoidal wave along a rope, sent by a vibrator at S from t = 0.
 * Settings: reglages {frequence (Hz), celerite (m/s), longueur (m), loupe (m)}; outils ["stroboscope", "loupe"];
 * defi {relation: "phase" | "opposition" | "quadrature", texte} asks the student to find such a point with the loupe.
 */
type Relation = "phase" | "opposition" | "quadrature";
type Settings = { frequence?: number; celerite?: number; longueur?: number; loupe?: number };

const VIEW_W = 640;
const STAGE_H = 230;
const MID = 112;
const AMP = 44;
const X0 = 70;
const X1 = 600;
const LENS_R = AMP + 14;

const SCOPE_H = 140;
const SCOPE_MID = 74;
const SCOPE_AMP = 40;
const SCOPE_X0 = 40;
const SCOPE_X1 = 620;

const SPEEDS = [
  { slow: 10, label: "Ralenti ×10" },
  { slow: 3, label: "Ralenti ×3" },
  { slow: 1, label: "Temps réel" },
];

const RELATION_TEXT: Record<Relation, string> = {
  phase: "en phase avec la source",
  opposition: "en opposition de phase avec la source",
  quadrature: "en quadrature retard de phase avec la source",
};

/** Normalised elongation of the point at distance x (m) from S, at time t (s): at rest until the wave reaches it. */
const elongation = (x: number, t: number, n: number, v: number) => (t >= x / v ? Math.sin(2 * Math.PI * n * (t - x / v)) : 0);

/** Phase relation of a point at x/λ periods from the source, if it is one of the remarkable ones. */
function relationOf(periods: number): Relation | null {
  const r = periods - Math.floor(periods);
  const near = (a: number) => Math.abs(r - a) < 0.03;
  if ((near(0) || near(1)) && periods > 0.5) return "phase";
  if (near(0.5)) return "opposition";
  if (near(0.25)) return "quadrature";
  return null;
}

const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

export default function WaveRopeLab({ config }: { config: LabConfig }) {
  const settings = (config.reglages ?? {}) as Settings;
  const tools = Array.isArray(config.outils) ? (config.outils as string[]) : [];
  const challenge = config.defi as { relation?: Relation; texte?: string } | undefined;
  const length = Math.min(5, Math.max(0.5, num(settings.longueur, 2)));

  const [n, setN] = useState(() => num(settings.frequence, 5));
  const [v, setV] = useState(() => num(settings.celerite, 2));
  const [t, setT] = useState(0);
  const [slow, setSlow] = useState(10);
  const [playing, setPlaying] = useState(() => !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const [visible, setVisible] = useState(true);
  const [strobe, setStrobe] = useState(false);
  const [ne, setNe] = useState(() => num(settings.frequence, 5));
  const [xm, setXm] = useState(() => Math.min(length, Math.max(0, num(settings.loupe, length * 0.15))));
  const [dragging, setDragging] = useState(false);
  const [solved, setSolved] = useState<{ x: number; periods: number } | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/:/g, "");

  const hasLoupe = tools.includes("loupe");
  const hasStrobe = tools.includes("stroboscope");

  // Animate only while playing and on screen: a lesson may hold several labs.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!playing || !visible) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setT((value) => value + dt / slow);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, visible, slow]);

  const lambda = v / n;
  const period = 1 / n;
  const theta = xm / v;
  const periods = xm / lambda;
  const reached = t >= theta;
  const relation = reached ? relationOf(periods) : null;

  // The success message keeps the point found, even if the loupe moves on afterwards.
  useEffect(() => {
    if (challenge?.relation && relation === challenge.relation) setSolved((s) => s ?? { x: xm, periods });
  }, [challenge?.relation, relation, xm, periods]);

  // The stroboscope shows the rope only at each flash: between flashes it keeps the last image.
  const shownT = hasStrobe && strobe ? Math.floor(t * ne) / ne : t;
  const toPx = (x: number) => X0 + (x / length) * (X1 - X0);

  let rope = "";
  for (let px = X0; px <= X1; px += 2) {
    const x = ((px - X0) / (X1 - X0)) * length;
    rope += `${px === X0 ? "M" : "L"}${px},${(MID - AMP * elongation(x, shownT, n, v)).toFixed(1)}`;
  }
  const ys = MID - AMP * elongation(0, shownT, n, v);
  const front = v * shownT;

  // λ bracket between two consecutive crests, as far right as the developed wave allows.
  // Crests are at x = v·t − λ(k + 1/4): take the smallest k whose crest and the next one are both on the rope.
  let crest: number | null = null;
  const reach = Math.min(length, front);
  if (lambda < reach) {
    const k = Math.max(0, Math.ceil((front - reach) / lambda + 0.75));
    const x = front - lambda * (k + 0.25);
    if (x >= 0 && x + lambda <= reach + 1e-9) crest = x;
  }

  const xmPx = toPx(xm);
  const ym = MID - AMP * elongation(xm, shownT, n, v);

  const moveLens = (e: PointerEvent<SVGGElement>) => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const px = Math.min(X1 - 4, Math.max(X0 + 4, p.x));
    setXm(Math.round((((px - X0) / (X1 - X0)) * length) * 100) / 100);
  };

  // Oscilloscope: y_S(t) and y_M(t) over the last periods, wide enough to show the delay θ when it is not too long.
  const windowT = Math.min(Math.max(2.5 * period, theta + 1.2 * period), 12 * period);
  const scopeX = (tau: number) => SCOPE_X0 + ((tau - (t - windowT)) / windowT) * (SCOPE_X1 - SCOPE_X0);
  let traceS = "";
  let traceM = "";
  for (let i = 0; i <= 320; i++) {
    const tau = t - windowT + (i / 320) * windowT;
    const px = SCOPE_X0 + (i / 320) * (SCOPE_X1 - SCOPE_X0);
    traceS += `${i ? "L" : "M"}${px.toFixed(1)},${(SCOPE_MID - SCOPE_AMP * (tau >= 0 ? Math.sin(2 * Math.PI * n * tau) : 0)).toFixed(1)}`;
    traceM += `${i ? "L" : "M"}${px.toFixed(1)},${(SCOPE_MID - SCOPE_AMP * (tau >= theta ? Math.sin(2 * Math.PI * n * (tau - theta)) : 0)).toFixed(1)}`;
  }
  let delay: { a: number; b: number } | null = null;
  if (theta > 0.002) {
    const k = Math.floor((t - theta) * n - 0.25);
    const tauS = (0.25 + k) / n;
    if (k >= 0 && tauS >= t - windowT) delay = { a: scopeX(tauS), b: scopeX(tauS + theta) };
  }

  const ratio = n / ne;
  const frozen = Math.round(ratio) >= 1 && Math.abs(ratio - Math.round(ratio)) < 0.02;

  return (
    <div ref={rootRef} className="lab-body">
      <svg ref={svgRef} viewBox={`0 0 ${VIEW_W} ${STAGE_H}`} className="lab-stage" role="img" aria-label={`Corde de ${fr(length)} m parcourue par une onde de fréquence ${fr(n)} Hz et de célérité ${fr(v)} m/s`}>
        <defs>
          <pattern id={`${uid}-g`} width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0H0V10" fill="none" stroke="#e3f1ee" strokeWidth="1" />
          </pattern>
          <pattern id={`${uid}-G`} width="50" height="50" patternUnits="userSpaceOnUse">
            <rect width="50" height="50" fill={`url(#${uid}-g)`} />
            <path d="M50 0H0V50" fill="none" stroke="#cde6e1" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={VIEW_W} height={STAGE_H} fill="#fbfefd" />
        <rect width={VIEW_W} height={STAGE_H} fill={`url(#${uid}-G)`} />

        {/* vibrator, fixed end with cotton */}
        <rect x="16" y={MID - 28} width="40" height="56" rx="7" fill="#e2e8f0" stroke="#94a3b8" />
        <line x1="56" y1={MID} x2={X0} y2={ys} stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
        <text x="36" y={MID + 48} textAnchor="middle" fontSize="12" fill="#64748b">vibreur</text>
        <text x={X0 + 2} y={MID + AMP + 26} textAnchor="middle" fontSize="13" fontWeight="700" fill="#475569">S</text>
        <g fill="#f1f5f9" stroke="#cbd5e1">
          <circle cx={X1 + 10} cy={MID - 6} r="9" />
          <circle cx={X1 + 16} cy={MID + 6} r="9" />
          <circle cx={X1 + 6} cy={MID + 8} r="8" />
        </g>
        <text x={X1 + 12} y={MID + 34} textAnchor="middle" fontSize="12" fill="#64748b">coton</text>

        {front < length && toPx(front) > X0 + 70 && (
          <g>
            <line x1={toPx(front)} y1={MID - AMP - 10} x2={toPx(front)} y2={MID + AMP + 10} stroke="#94a3b8" strokeDasharray="4 4" />
            <text x={toPx(front)} y={MID + AMP + 26} textAnchor="middle" fontSize="12" fill="#64748b">front de l'onde</text>
          </g>
        )}

        <path d={rope} fill="none" stroke="#0f766e" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

        {crest !== null && (
          <g stroke="#0f5f59" fill="#0f5f59">
            <line x1={toPx(crest)} y1={MID - AMP - 20} x2={toPx(crest + lambda)} y2={MID - AMP - 20} strokeWidth="1.5" />
            <line x1={toPx(crest)} y1={MID - AMP - 26} x2={toPx(crest)} y2={MID - AMP - 6} strokeDasharray="2 3" />
            <line x1={toPx(crest + lambda)} y1={MID - AMP - 26} x2={toPx(crest + lambda)} y2={MID - AMP - 6} strokeDasharray="2 3" />
            <text x={(toPx(crest) + toPx(crest + lambda)) / 2} y={MID - AMP - 28} textAnchor="middle" fontSize="13" fontWeight="700" stroke="none">
              λ = {fr(lambda)} m
            </text>
          </g>
        )}

        {hasLoupe && (
          <g
            className={dragging ? "lab-lens is-dragging" : "lab-lens"}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setDragging(true);
              moveLens(e);
            }}
            onPointerMove={(e) => dragging && moveLens(e)}
            onPointerUp={() => setDragging(false)}
            onPointerCancel={() => setDragging(false)}
            aria-hidden
          >
            <line x1={xmPx + LENS_R * 0.71} y1={MID + LENS_R * 0.71} x2={xmPx + LENS_R * 0.71 + 26} y2={MID + LENS_R * 0.71 + 26} stroke="#92400e" strokeWidth="9" strokeLinecap="round" />
            <circle cx={xmPx} cy={MID} r={LENS_R} fill="#fef3c7" fillOpacity="0.35" stroke="#d97706" strokeWidth="4" />
            <line x1={xmPx} y1={MID - AMP} x2={xmPx} y2={MID + AMP} stroke="#d97706" strokeDasharray="3 4" />
            <circle cx={xmPx} cy={ym} r="7" fill="#d97706" stroke="#fff" strokeWidth="2" />
            <text x={xmPx + 12} y={ym - 10} fontSize="14" fontWeight="700" fill="#b45309" stroke="none">M</text>
          </g>
        )}
      </svg>

      {hasLoupe && (
        <svg viewBox={`0 0 ${VIEW_W} ${SCOPE_H}`} className="lab-scope" role="img" aria-label="Oscilloscope : élongation de la source et du point M au cours du temps">
          <rect width={VIEW_W} height={SCOPE_H} fill="#fbfefd" />
          <rect width={VIEW_W} height={SCOPE_H} fill={`url(#${uid}-G)`} />
          <line x1={SCOPE_X0} y1={SCOPE_MID} x2={SCOPE_X1} y2={SCOPE_MID} stroke="#94a3b8" />
          <text x={SCOPE_X1} y={SCOPE_MID + SCOPE_AMP + 20} textAnchor="end" fontSize="12" fill="#64748b">temps</text>
          <path d={traceS} fill="none" stroke="#64748b" strokeWidth="2" />
          <path d={traceM} fill="none" stroke="#d97706" strokeWidth="2.5" />
          {delay && (
            <g stroke="#b45309" fill="#b45309">
              <line x1={delay.a} y1={SCOPE_MID - SCOPE_AMP} x2={delay.a} y2={SCOPE_MID - SCOPE_AMP - 14} strokeDasharray="2 3" />
              <line x1={delay.b} y1={SCOPE_MID - SCOPE_AMP} x2={delay.b} y2={SCOPE_MID - SCOPE_AMP - 14} strokeDasharray="2 3" />
              <line x1={delay.a} y1={SCOPE_MID - SCOPE_AMP - 10} x2={delay.b} y2={SCOPE_MID - SCOPE_AMP - 10} strokeWidth="1.5" />
              <text x={(delay.a + delay.b) / 2} y={SCOPE_MID - SCOPE_AMP - 16} textAnchor="middle" fontSize="13" fontWeight="700" stroke="none">θ</text>
            </g>
          )}
          <g fontSize="12">
            <line x1="44" y1="14" x2="60" y2="14" stroke="#64748b" strokeWidth="2.5" />
            <text x="66" y="18" fill="#475569">source S</text>
            <line x1="134" y1="14" x2="150" y2="14" stroke="#d97706" strokeWidth="2.5" />
            <text x="156" y="18" fill="#b45309">point M</text>
          </g>
        </svg>
      )}

      <div className="lab-toolbar">
        <button type="button" className="lab-btn" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
          {playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
          {playing ? "Pause" : "Lecture"}
        </button>
        <button type="button" className="lab-btn" onClick={() => setT(0)}>
          <RotateCcw className="h-4 w-4" aria-hidden /> Relancer l'onde
        </button>
        <div className="lab-segmented" role="group" aria-label="Vitesse de la simulation">
          {SPEEDS.map((s) => (
            <button key={s.slow} type="button" aria-pressed={slow === s.slow} onClick={() => setSlow(s.slow)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="lab-controls">
        <Slider label={<>Fréquence <i>N</i></>} value={n} min={1} max={10} step={0.5} unit="Hz" onChange={setN} />
        <Slider label={<>Célérité <i>v</i></>} value={v} min={0.5} max={5} step={0.1} unit="m/s" onChange={setV} />
        {hasLoupe && <Slider label={<>Position de la loupe <i>x</i> = SM</>} value={xm} min={0} max={length} step={0.01} unit="m" onChange={setXm} />}
        {hasStrobe && (
          <div className="lab-strobe">
            <label className="lab-check">
              <input type="checkbox" checked={strobe} onChange={(e) => setStrobe(e.target.checked)} /> Éclairer avec un stroboscope
            </label>
            {strobe && <Slider label={<>Fréquence des éclairs <i>N</i><sub>e</sub></>} value={ne} min={0.5} max={10} step={0.1} unit="Hz" onChange={setNe} />}
          </div>
        )}
      </div>

      <dl className="lab-readouts" aria-live="polite">
        <div>
          <dt>Longueur d'onde</dt>
          <dd><i>λ</i> = <i>v</i> / <i>N</i> = {fr(v)} / {fr(n)} = <b>{fr(lambda)} m</b></dd>
        </div>
        <div>
          <dt>Période</dt>
          <dd><i>T</i> = 1 / <i>N</i> = <b>{fr(period, 3)} s</b></dd>
        </div>
        {hasLoupe && (
          <div>
            <dt>Retard de M</dt>
            <dd><i>θ</i> = <i>x</i> / <i>v</i> = {fr(xm)} / {fr(v)} = <b>{fr(theta, 3)} s</b></dd>
          </div>
        )}
        {hasLoupe && (
          <div>
            <dt>Point M</dt>
            <dd>
              {!reached
                ? "L'onde n'a pas encore atteint M : il est immobile."
                : <>
                    <i>x</i> / <i>λ</i> = <b>{fr(periods)}</b> : {relation ? <>M vibre <b>{RELATION_TEXT[relation]}</b>.</> : <>déphasage Δφ = 2π<i>x</i>/<i>λ</i> ≈ {fr(2 * Math.PI * periods)} rad.</>}
                  </>}
            </dd>
          </div>
        )}
        {hasStrobe && strobe && (
          <div>
            <dt>Stroboscope</dt>
            <dd>
              {frozen
                ? <>Un éclair {Math.round(ratio) > 1 ? `toutes les ${Math.round(ratio)} périodes` : "à chaque période"} (<i>T</i><sub>e</sub> = {Math.round(ratio)} <i>T</i>) : <b>la corde paraît immobile</b>.</>
                : <>La corde paraît bouger : réglez <i>N</i><sub>e</sub> pour qu'elle semble figée.</>}
            </dd>
          </div>
        )}
      </dl>

      {challenge?.relation && (
        <p className={solved ? "lab-challenge is-solved" : "lab-challenge"} aria-live="polite">
          {solved ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : <Target className="h-4 w-4 shrink-0" aria-hidden />}
          <span>
            {solved
              ? <>Bravo : en <i>x</i> = {fr(solved.x)} m, soit {fr(solved.periods)} <i>λ</i>, M vibre {RELATION_TEXT[challenge.relation]}.</>
              : challenge.texte ?? `Défi : trouvez un point qui vibre ${RELATION_TEXT[challenge.relation]}.`}
          </span>
        </p>
      )}
    </div>
  );
}
