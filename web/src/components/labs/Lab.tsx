import { Component, type ComponentType, type ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { checkLab } from "./check.js";
import CurveLab from "./CurveLab";
import GeneticsLab from "./GeneticsLab";
import WaveRopeLab from "./WaveRopeLab";

/**
 * A ```lab fenced block of a lesson: a small interactive experiment placed right after the notion it illustrates.
 * The block holds JSON: {"labo": "<kind>", "titre": "...", "consigne": "...", ...settings of that kind}
 * (kinds and settings: scraper/style/labos.md). A block that fails check.js renders nothing, so a lesson never breaks.
 */
export type LabConfig = { labo: string; titre?: string; consigne?: string } & Record<string, unknown>;

const LABS: Record<string, ComponentType<{ config: LabConfig }>> = {
  "onde-corde": WaveRopeLab,
  courbe: CurveLab,
  echiquier: GeneticsLab,
};

class LabBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p className="lab-error">Ce labo n'a pas pu s'afficher.</p> : this.props.children;
  }
}

export function parseLab(source: string): LabConfig | null {
  try {
    const config = JSON.parse(source) as LabConfig;
    if (!config || !LABS[config.labo]) return null;
    const problems = checkLab(config);
    if (problems.length) {
      console.warn(`Labo « ${config.titre ?? config.labo} » ignoré :`, problems);
      return null;
    }
    return config;
  } catch {
    return null;
  }
}

export default function Lab({ source }: { source: string }) {
  const config = parseLab(source);
  if (!config) return null;
  const Kind = LABS[config.labo];
  return (
    <section className="lab" aria-label={`Labo : ${config.titre ?? ""}`}>
      <div className="lab-head">
        <span className="lab-chip">
          <FlaskConical className="h-3.5 w-3.5" aria-hidden /> Labo
        </span>
        {config.titre && <span className="lab-title">{config.titre}</span>}
      </div>
      {config.consigne && <p className="lab-consigne">{config.consigne}</p>}
      <LabBoundary>
        <Kind config={config} />
      </LabBoundary>
    </section>
  );
}

/** French number format: 0,4 / 12,5. */
export const fr = (n: number, digits = 2) => n.toLocaleString("fr-FR", { maximumFractionDigits: digits });

export function Slider({ label, value, min, max, step, unit, onChange }: { label: ReactNode; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  return (
    <label className="lab-slider">
      <span className="lab-slider-label">
        <span>{label}</span>
        <output className="lab-value">
          {fr(value)} {unit}
        </output>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
