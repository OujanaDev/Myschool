import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Atom, BookOpen, Brain, Calculator, Code, Cog, FlaskConical, Globe, Languages, Leaf, Lightbulb, Lock, Map, Moon, Puzzle,
  Sigma, TrendingUp, FileText, ListChecks, GraduationCap, PlayCircle, ClipboardList, Crown, AlertCircle, Inbox,
} from "lucide-react";
import type { LessonType } from "../lib/types";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  sigma: Sigma, atom: Atom, leaf: Leaf, "book-open": BookOpen, languages: Languages, globe: Globe, brain: Brain, map: Map,
  moon: Moon, code: Code, cog: Cog, "trending-up": TrendingUp, calculator: Calculator, flask: FlaskConical, lightbulb: Lightbulb,
  puzzle: Puzzle, book: BookOpen,
};

export function SubjectIcon({ icon, color, className = "h-5 w-5", boxClass = "" }: { icon: string; color: string; className?: string; boxClass?: string }) {
  const I = ICONS[icon] ?? BookOpen;
  return (
    <span className={`inline-flex items-center justify-center rounded-xl ${boxClass}`} style={{ background: `${color}1a`, color }}>
      <I className={className} />
    </span>
  );
}

export const LESSON_TYPES: Record<LessonType, { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  COURSE: { label: "Cours", color: "bg-blue-50 text-blue-700", Icon: BookOpen },
  SUMMARY: { label: "Résumé", color: "bg-violet-50 text-violet-700", Icon: FileText },
  EXERCISE: { label: "Exercices", color: "bg-emerald-50 text-emerald-700", Icon: ListChecks },
  EXAM: { label: "Examen", color: "bg-rose-50 text-rose-700", Icon: GraduationCap },
  VIDEO: { label: "Vidéo", color: "bg-orange-50 text-orange-700", Icon: PlayCircle },
};

export function TypeBadge({ type }: { type: LessonType }) {
  const t = LESSON_TYPES[type] ?? LESSON_TYPES.COURSE;
  return (
    <span className={`badge ${t.color}`}>
      <t.Icon className="h-3 w-3" /> {t.label}
    </span>
  );
}

export function QuizBadge() {
  return (
    <span className="badge bg-amber-50 text-amber-700">
      <ClipboardList className="h-3 w-3" /> QCM
    </span>
  );
}

export function PremiumBadge({ small = false }: { small?: boolean }) {
  return (
    <span className={`badge bg-accent-500/15 text-accent-600 ${small ? "px-1.5" : ""}`} title="Contenu Premium">
      <Crown className="h-3 w-3" /> {!small && "Premium"}
    </span>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex justify-center py-16 ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
    </div>
  );
}

export function ErrorBox({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="card p-6 text-center">
      <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
      <p className="mt-2 font-medium text-slate-800">{message}</p>
      {retry && (
        <button className="btn-outline mt-4" onClick={retry}>
          Réessayer
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card p-10 text-center">
      <Inbox className="mx-auto h-8 w-8 text-slate-400" />
      <p className="mt-3 font-semibold text-slate-800">{title}</p>
      {text && <p className="mt-1 text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="mb-2 text-sm font-medium text-brand-700">{eyebrow}</div>}
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Paywall({ title = "Contenu réservé aux membres Premium" }: { title?: string }) {
  return (
    <div className="card relative overflow-hidden border-accent-500/40 bg-gradient-to-br from-amber-50 to-white p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-600">
        <Lock className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-xl font-bold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        Débloquez l'intégralité des résumés, examens corrigés, QCM avancés et le plan de préparation personnalisé.
      </p>
      <Link to="/premium" className="btn-accent mt-6">
        <Crown className="h-4 w-4" /> Passer à Premium
      </Link>
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-slate-300">/</span>}
          {it.to ? (
            <Link to={it.to} className="hover:text-brand-700">
              {it.label}
            </Link>
          ) : (
            <span className="text-slate-700">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function Stat({ label, value, hint, color = "text-brand-700" }: { label: string; value: ReactNode; hint?: string; color?: string }) {
  return (
    <div className="card p-5">
      <div className="text-sm text-muted">{label}</div>
      <div className={`mt-1 text-3xl font-extrabold ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export function ProgressBar({ value, color = "#0f766e", className = "" }: { value: number; color?: string; className?: string }) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  );
}
