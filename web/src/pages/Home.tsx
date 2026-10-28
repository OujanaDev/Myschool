import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, ClipboardList, Crown, Sparkles, Target, Smartphone, GraduationCap, Search } from "lucide-react";
import { useFetch } from "../lib/hooks";
import type { Cycle } from "../lib/types";
import { useAuth } from "../lib/auth";

const FEATURES = [
  { Icon: BookOpen, title: "Cours conformes au programme", text: "Du primaire au supérieur, chaque chapitre suit le programme officiel marocain, avec des explications claires et des exemples." },
  { Icon: ClipboardList, title: "Exercices et QCM corrigés", text: "Entraînez-vous avec des séries d'exercices et des QCM interactifs avec explications détaillées." },
  { Icon: Target, title: "Préparation personnalisée", text: "Un plan d'étude hebdomadaire généré selon votre niveau, vos matières et votre date d'examen." },
  { Icon: GraduationCap, title: "Examens et concours", text: "Examens blancs, méthodologie et tests chronométrés pour le bac, le brevet et les concours d'accès." },
  { Icon: Search, title: "Recherche instantanée", text: "Trouvez un cours, un QCM ou un chapitre en quelques lettres, avec ou sans accents, dans tous les niveaux." },
  { Icon: Smartphone, title: "Web, Android et iOS", text: "Révisez sur ordinateur, tablette ou téléphone, avec la même progression partout." },
];

export default function Home() {
  const { data: cycles } = useFetch<Cycle[]>("/cycles");
  const { user } = useAuth();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 top-40 h-72 w-72 rounded-full bg-accent-400/20 blur-3xl" />
        <div className="container-x relative grid gap-10 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div className="fade-up">
            <span className="badge bg-brand-100 text-brand-800">
              <Sparkles className="h-3.5 w-3.5" /> Programmes scolaires marocains
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Apprendre, réviser et <span className="text-brand-600">réussir</span> ses examens.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Cours, exercices, QCM et plans de révision personnalisés pour tous les élèves et étudiants du Maroc, du primaire aux concours d'accès.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={user ? "/tableau-de-bord" : "/inscription"} className="btn-primary !px-6 !py-3 !text-base">
                {user ? "Accéder à mon espace" : "Commencer gratuitement"} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/explorer" className="btn-outline !px-6 !py-3 !text-base">
                Explorer les niveaux
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-muted">
              <span><strong className="text-ink">30</strong> niveaux</span>
              <span><strong className="text-ink">+1400</strong> cours et exercices</span>
              <span><strong className="text-ink">16</strong> matières</span>
            </div>
          </div>
          <div className="fade-up grid grid-cols-2 gap-4" style={{ animationDelay: "120ms" }}>
            {(cycles ?? []).map((c, i) => (
              <Link key={c.id} to={`/explorer#${c.slug}`} className="card group p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${["bg-brand-600", "bg-brand-800", "bg-slate-800", "bg-accent-500"][i % 4]}`}>
                  <GraduationCap className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-bold text-ink">{c.name}</h3>
                <p className="mt-1 text-sm text-muted">{c.levels.length} niveaux</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 group-hover:gap-2">
                  Découvrir <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container-x py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink">Tout ce qu'il faut pour progresser</h2>
          <p className="mt-3 text-muted">Une plateforme pensée pour les élèves marocains, de la 1ère année primaire aux classes préparatoires.</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <f.Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-bold text-ink">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="container-x pb-16">
        <div className="card overflow-hidden bg-gradient-to-r from-brand-700 to-brand-600 p-8 text-white sm:p-12">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="badge bg-white/15 text-white">
                <Crown className="h-3.5 w-3.5 text-accent-400" /> Freemium
              </span>
              <h2 className="mt-4 text-3xl font-extrabold">Gratuit pour apprendre, Premium pour exceller</h2>
              <p className="mt-3 text-brand-100">
                Les cours et exercices essentiels sont gratuits. Le Premium débloque les résumés, les examens corrigés, les tests avancés et votre plan de préparation.
              </p>
              <Link to="/premium" className="btn-accent mt-6">
                Voir les offres <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ul className="grid gap-3 text-sm">
              {["Cours et séries d'exercices gratuits", "QCM interactifs avec corrections", "Résumés et fiches de révision (Premium)", "Examens blancs corrigés (Premium)", "Plan d'étude personnalisé (Premium)", "Suivi de progression par matière"].map((t) => (
                <li key={t} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
                  <span className="h-2 w-2 rounded-full bg-accent-400" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
