// Contenu pédagogique original (cours, exercices, QCM) pour les chapitres phares.
// Clé : "niveau/matiere/Titre du chapitre"

export type LessonDef = {
  title: string;
  type?: "COURSE" | "SUMMARY" | "EXERCISE" | "EXAM" | "VIDEO";
  content: string;
  durationMin?: number;
  isPremium?: boolean;
  videoUrl?: string;
};
export type QuizDef = {
  title: string;
  description?: string;
  durationMin?: number;
  isPremium?: boolean;
  questions: { text: string; explanation?: string; options: [string, boolean][] }[];
};
export type ChapterContent = { lessons: LessonDef[]; quizzes: QuizDef[] };

export const content: Record<string, ChapterContent> = {
  // =====================================================================
  "2bac-pc/mathematiques/Limites et continuité": {
    lessons: [
      {
        title: "Cours : limites et continuité",
        durationMin: 35,
        content: `# Limites et continuité

## 1. Rappels sur les limites

Soit $f$ une fonction définie au voisinage de $a$ (sauf peut-être en $a$). On dit que $f$ admet la limite $\\ell$ en $a$ si $f(x)$ se rapproche autant que l'on veut de $\\ell$ lorsque $x$ se rapproche de $a$. On note $\\lim\\limits_{x \\to a} f(x) = \\ell$.

**Limites usuelles à connaître :**

| Fonction | Limite en $+\\infty$ | Limite en $0^+$ |
|---|---|---|
| $x^n$ ($n \\geq 1$) | $+\\infty$ | $0$ |
| $\\dfrac{1}{x^n}$ | $0$ | $+\\infty$ |
| $\\sqrt{x}$ | $+\\infty$ | $0$ |

> **Règle pratique.** La limite d'un polynôme en $\\pm\\infty$ est celle de son terme de plus haut degré. La limite d'une fonction rationnelle en $\\pm\\infty$ est celle du quotient des termes de plus haut degré.

### Formes indéterminées
Les quatre formes indéterminées sont : $\\;+\\infty - \\infty$, $\\;0 \\times \\infty$, $\\;\\dfrac{0}{0}$, $\\;\\dfrac{\\infty}{\\infty}$.

Pour lever une indétermination on peut : factoriser, multiplier par l'expression conjuguée, ou utiliser un encadrement.

**Exemple.** $\\lim\\limits_{x \\to +\\infty} \\left(\\sqrt{x^2+1} - x\\right)$ est de la forme $+\\infty - \\infty$.
On multiplie par le conjugué :
$$\\sqrt{x^2+1} - x = \\frac{(x^2+1) - x^2}{\\sqrt{x^2+1}+x} = \\frac{1}{\\sqrt{x^2+1}+x} \\xrightarrow[x \\to +\\infty]{} 0.$$

## 2. Continuité en un point

**Définition.** $f$ est continue en $a$ si $f$ est définie en $a$ et $\\lim\\limits_{x \\to a} f(x) = f(a)$.

Elle est continue à droite en $a$ si $\\lim\\limits_{x \\to a^+} f(x) = f(a)$ et continue à gauche si $\\lim\\limits_{x \\to a^-} f(x) = f(a)$. Une fonction est continue en $a$ si et seulement si elle est continue à droite et à gauche en $a$.

**Exemple.** Soit $f(x) = \\dfrac{x^2 - 4}{x - 2}$ pour $x \\neq 2$ et $f(2) = 4$.
Pour $x \\neq 2$, $f(x) = x + 2$, donc $\\lim\\limits_{x \\to 2} f(x) = 4 = f(2)$ : $f$ est continue en $2$.

## 3. Continuité sur un intervalle

Les fonctions polynômes, rationnelles, racine carrée, $\\sin$, $\\cos$ sont continues sur tout intervalle inclus dans leur domaine de définition. La somme, le produit, le quotient (dénominateur non nul) et la composée de fonctions continues sont continues.

## 4. Image d'un intervalle et théorème des valeurs intermédiaires

**Théorème.** L'image d'un intervalle par une fonction continue est un intervalle. L'image d'un segment $[a,b]$ par une fonction continue est un segment $[m, M]$.

**Théorème des valeurs intermédiaires (TVI).** Si $f$ est continue sur $[a,b]$, alors pour tout réel $k$ compris entre $f(a)$ et $f(b)$, il existe $c \\in [a,b]$ tel que $f(c) = k$.

**Conséquence.** Si $f$ est continue et **strictement monotone** sur $[a,b]$ et si $f(a) \\cdot f(b) < 0$, alors l'équation $f(x) = 0$ admet une **unique** solution dans $]a,b[$.

**Exemple d'application.** Montrer que $x^3 + x - 1 = 0$ admet une solution unique $\\alpha \\in ]0,1[$.
La fonction $g(x) = x^3 + x - 1$ est continue et strictement croissante sur $\\mathbb{R}$ (car $g'(x) = 3x^2 + 1 > 0$). De plus $g(0) = -1 < 0$ et $g(1) = 1 > 0$. D'après le TVI, il existe un unique $\\alpha \\in ]0,1[$ tel que $g(\\alpha) = 0$.

## 5. Fonction réciproque

Si $f$ est continue et strictement monotone sur un intervalle $I$, alors $f$ réalise une bijection de $I$ vers $J = f(I)$. Sa réciproque $f^{-1}$ est continue sur $J$, de même sens de variation que $f$, et sa courbe est la symétrique de celle de $f$ par rapport à la droite $y = x$.

## 6. La fonction racine $n$-ième

Pour $n \\in \\mathbb{N}^*$, la fonction $x \\mapsto x^n$ est une bijection de $[0,+\\infty[$ vers $[0,+\\infty[$. Sa réciproque est la fonction racine $n$-ième : $x \\mapsto \\sqrt[n]{x}$.

Propriétés (pour $x, y \\geq 0$) : $\\sqrt[n]{xy} = \\sqrt[n]{x}\\sqrt[n]{y}$, $\\;\\left(\\sqrt[n]{x}\\right)^n = x$, $\\;\\sqrt[n]{\\sqrt[m]{x}} = \\sqrt[nm]{x}$.

---
### À retenir
- Une fonction continue en $a$ vérifie $\\lim_{x\\to a} f(x) = f(a)$.
- Le TVI permet de **prouver l'existence** d'une solution ; la stricte monotonie donne l'**unicité**.
- La méthode de dichotomie permet d'encadrer la solution $\\alpha$ avec la précision voulue.
`,
      },
      {
        title: "Série d'exercices : limites et continuité",
        type: "EXERCISE",
        durationMin: 45,
        content: `# Série d'exercices — Limites et continuité

## Exercice 1 — Calcul de limites
Calculer les limites suivantes :
1. $\\lim\\limits_{x \\to +\\infty} \\dfrac{2x^2 - 3x + 1}{x^2 + 5}$
2. $\\lim\\limits_{x \\to 1} \\dfrac{x^2 - 1}{x - 1}$
3. $\\lim\\limits_{x \\to +\\infty} \\left(\\sqrt{x + 3} - \\sqrt{x}\\right)$
4. $\\lim\\limits_{x \\to 0} \\dfrac{\\sin 3x}{x}$

## Exercice 2 — Continuité en un point
Soit $f$ la fonction définie par $f(x) = \\dfrac{\\sqrt{x+1} - 1}{x}$ si $x \\neq 0$ et $f(0) = m$.
Déterminer la valeur de $m$ pour que $f$ soit continue en $0$.

## Exercice 3 — Théorème des valeurs intermédiaires
Soit $g(x) = x^3 - 3x + 1$.
1. Dresser le tableau de variations de $g$ sur $\\mathbb{R}$.
2. Montrer que l'équation $g(x) = 0$ admet exactement trois solutions réelles.
3. Donner un encadrement d'amplitude $0{,}25$ de la plus grande solution.

## Exercice 4 — Fonction réciproque
Soit $h(x) = x^2 + 2x$ définie sur $I = [-1, +\\infty[$.
1. Montrer que $h$ réalise une bijection de $I$ vers un intervalle $J$ à déterminer.
2. Déterminer $h^{-1}(x)$ pour tout $x \\in J$.

---
## Corrigé (indications)
**Ex. 1.** 1) $2$ ; 2) $2$ (factoriser $x^2-1$) ; 3) $0$ (conjugué) ; 4) $3$ (poser $u = 3x$).

**Ex. 2.** En multipliant par le conjugué : $f(x) = \\dfrac{1}{\\sqrt{x+1}+1} \\to \\dfrac{1}{2}$. Donc $m = \\dfrac12$.

**Ex. 3.** $g'(x) = 3x^2 - 3 = 3(x-1)(x+1)$. Maximum local $g(-1) = 3$, minimum local $g(1) = -1$. Trois changements de signe, donc trois solutions par le TVI. La plus grande est dans $]1{,}5\\,;\\,1{,}75[$ car $g(1{,}5) = -0{,}125 < 0$ et $g(1{,}75) \\approx 1{,}11 > 0$.

**Ex. 4.** $h$ est continue et strictement croissante sur $I$ ; $J = [-1, +\\infty[$. En résolvant $y = x^2 + 2x = (x+1)^2 - 1$ avec $x \\geq -1$ : $h^{-1}(y) = -1 + \\sqrt{y+1}$.
`,
      },
      {
        title: "Résumé : les points clés du chapitre",
        type: "SUMMARY",
        isPremium: true,
        durationMin: 10,
        content: `# Fiche de révision — Limites et continuité

## Les 5 réflexes
1. **Polynôme / rationnelle en l'infini** → terme de plus haut degré.
2. **Racine en l'infini** → expression conjuguée.
3. **$\\frac{0}{0}$** → factoriser ou reconnaître un taux d'accroissement (nombre dérivé).
4. **Continuité en $a$** → comparer $\\lim_{x\\to a^-}$, $\\lim_{x\\to a^+}$ et $f(a)$.
5. **Existence d'une solution** → TVI ; **unicité** → stricte monotonie.

## Rédaction type (TVI)
> « $f$ est continue et strictement croissante sur $[a,b]$, $f(a) < 0$ et $f(b) > 0$. D'après le théorème des valeurs intermédiaires, l'équation $f(x)=0$ admet une unique solution $\\alpha$ dans $]a,b[$. »

## Pièges fréquents
- Oublier de vérifier que $f(a)$ existe avant de parler de continuité en $a$.
- Confondre « image d'un intervalle » et « ensemble de définition ».
- Utiliser le TVI sans la continuité.
`,
      },
    ],
    quizzes: [
      {
        title: "QCM : limites et continuité",
        description: "8 questions pour vérifier les notions essentielles du chapitre.",
        durationMin: 12,
        questions: [
          {
            text: "$\\lim\\limits_{x \\to +\\infty} \\dfrac{3x^2 + x}{x^2 - 1}$ vaut :",
            explanation: "Quotient des termes de plus haut degré : $3x^2 / x^2 = 3$.",
            options: [["$0$", false], ["$3$", true], ["$+\\infty$", false], ["$1$", false]],
          },
          {
            text: "Une fonction $f$ est continue en $a$ si et seulement si :",
            explanation: "La définition exige que $f(a)$ existe et que la limite en $a$ soit égale à $f(a)$.",
            options: [
              ["$f$ est définie en $a$", false],
              ["$\\lim_{x \\to a} f(x)$ existe", false],
              ["$\\lim_{x \\to a} f(x) = f(a)$", true],
              ["$f$ est dérivable en $a$", false],
            ],
          },
          {
            text: "Laquelle de ces expressions est une forme indéterminée ?",
            explanation: "$+\\infty + \\infty = +\\infty$ et $\\frac{1}{+\\infty} = 0$ ne sont pas indéterminées.",
            options: [["$+\\infty + \\infty$", false], ["$0 \\times \\infty$", true], ["$\\dfrac{1}{+\\infty}$", false], ["$5 \\times (+\\infty)$", false]],
          },
          {
            text: "$\\lim\\limits_{x \\to +\\infty} \\left(\\sqrt{x^2 + x} - x\\right)$ vaut :",
            explanation: "Après multiplication par le conjugué : $\\dfrac{x}{\\sqrt{x^2+x}+x} = \\dfrac{1}{\\sqrt{1+1/x}+1} \\to \\dfrac12$.",
            options: [["$0$", false], ["$\\dfrac{1}{2}$", true], ["$1$", false], ["$+\\infty$", false]],
          },
          {
            text: "Soit $f$ continue et strictement décroissante sur $[0,2]$ avec $f(0) = 3$ et $f(2) = -1$. L'équation $f(x) = 0$ :",
            explanation: "Continuité + stricte monotonie + changement de signe : une unique solution.",
            options: [
              ["n'a aucune solution", false],
              ["a exactement une solution dans $]0,2[$", true],
              ["a au moins deux solutions", false],
              ["on ne peut pas conclure", false],
            ],
          },
          {
            text: "L'image du segment $[a,b]$ par une fonction continue est :",
            explanation: "C'est le théorème de l'image d'un segment : $f([a,b]) = [m, M]$.",
            options: [["toujours $[f(a), f(b)]$", false], ["un segment $[m, M]$", true], ["un intervalle ouvert", false], ["$\\mathbb{R}$", false]],
          },
          {
            text: "La courbe de $f^{-1}$ s'obtient à partir de celle de $f$ par :",
            explanation: "Symétrie orthogonale par rapport à la première bissectrice $y = x$.",
            options: [
              ["symétrie par rapport à l'axe des abscisses", false],
              ["symétrie par rapport à la droite $y = x$", true],
              ["translation de vecteur $\\vec{i}$", false],
              ["symétrie par rapport à l'origine", false],
            ],
          },
          {
            text: "$\\sqrt[3]{-8}$ vaut :",
            explanation: "La racine cubique est définie sur $\\mathbb{R}$ pour les entiers impairs : $(-2)^3 = -8$.",
            options: [["$2$", false], ["$-2$", true], ["n'existe pas", false], ["$\\pm 2$", false]],
          },
        ],
      },
    ],
  },

  // =====================================================================
  "2bac-pc/mathematiques/Fonctions logarithmiques": {
    lessons: [
      {
        title: "Cours : la fonction logarithme népérien",
        durationMin: 30,
        content: `# La fonction logarithme népérien

## 1. Définition
La fonction $x \\mapsto \\dfrac{1}{x}$ est continue sur $]0,+\\infty[$ ; elle admet donc des primitives sur cet intervalle. On appelle **logarithme népérien**, notée $\\ln$, l'unique primitive de $x \\mapsto \\dfrac1x$ sur $]0,+\\infty[$ qui s'annule en $1$ :
$$\\ln(1) = 0 \\qquad \\text{et} \\qquad \\forall x > 0,\\; \\ln'(x) = \\frac{1}{x}.$$

## 2. Propriétés algébriques
Pour tous réels $a > 0$, $b > 0$ et $n \\in \\mathbb{Z}$ :
- $\\ln(ab) = \\ln a + \\ln b$
- $\\ln\\left(\\dfrac{a}{b}\\right) = \\ln a - \\ln b$ et $\\ln\\left(\\dfrac1b\\right) = -\\ln b$
- $\\ln(a^n) = n \\ln a$ et $\\ln\\sqrt{a} = \\dfrac12 \\ln a$

**Le nombre $e$.** On note $e$ l'unique réel tel que $\\ln e = 1$. On a $e \\approx 2{,}718$.

## 3. Étude de la fonction
- Domaine : $]0,+\\infty[$, dérivée $\\dfrac1x > 0$ : $\\ln$ est **strictement croissante**.
- $\\lim\\limits_{x \\to 0^+} \\ln x = -\\infty$ et $\\lim\\limits_{x \\to +\\infty} \\ln x = +\\infty$.
- Signe : $\\ln x < 0 \\iff 0 < x < 1$ et $\\ln x > 0 \\iff x > 1$.
- Conséquences : $\\ln a = \\ln b \\iff a = b$ et $\\ln a < \\ln b \\iff a < b$.

## 4. Limites de référence (croissances comparées)
$$\\lim_{x \\to +\\infty} \\frac{\\ln x}{x} = 0 \\qquad \\lim_{x \\to 0^+} x \\ln x = 0 \\qquad \\lim_{x \\to 1} \\frac{\\ln x}{x - 1} = 1 \\qquad \\lim_{h \\to 0} \\frac{\\ln(1+h)}{h} = 1$$

Plus généralement, pour $n \\geq 1$ : $\\lim\\limits_{x \\to +\\infty} \\dfrac{\\ln x}{x^n} = 0$ et $\\lim\\limits_{x \\to 0^+} x^n \\ln x = 0$. On retient : *« la puissance l'emporte sur le logarithme »*.

## 5. Dérivée de $\\ln \\circ u$
Si $u$ est dérivable et strictement positive sur un intervalle $I$, alors :
$$(\\ln u)' = \\frac{u'}{u}.$$
Cette formule sert aussi en sens inverse : une primitive de $\\dfrac{u'}{u}$ est $\\ln|u|$.

**Exemple.** $f(x) = \\ln(x^2 + 1)$ est dérivable sur $\\mathbb{R}$ et $f'(x) = \\dfrac{2x}{x^2+1}$.

## 6. Logarithme décimal
$\\log x = \\dfrac{\\ln x}{\\ln 10}$. Il vérifie $\\log 10^n = n$ ; il est utilisé en chimie ($\\mathrm{pH} = -\\log[\\mathrm{H_3O^+}]$) et en physique (décibels).

## 7. Résolution d'équations et d'inéquations
Toujours commencer par le **domaine de validité**.

**Exemple.** Résoudre $\\ln(x - 1) + \\ln(x + 2) = \\ln 4$.
Domaine : $x > 1$. L'équation devient $\\ln[(x-1)(x+2)] = \\ln 4$, soit $x^2 + x - 2 = 4$, soit $x^2 + x - 6 = 0$, d'où $x = 2$ ou $x = -3$. Seule $x = 2$ est dans le domaine. $S = \\{2\\}$.
`,
      },
      {
        title: "Exercices corrigés : équations et études de fonctions avec ln",
        type: "EXERCISE",
        durationMin: 40,
        content: `# Exercices — Fonctions logarithmiques

## Exercice 1
Résoudre dans $\\mathbb{R}$ :
1. $\\ln(2x - 1) = 0$
2. $\\ln x + \\ln(x - 3) = \\ln 4$
3. $(\\ln x)^2 - 3\\ln x + 2 = 0$
4. $\\ln(x + 1) \\leq \\ln(3 - x)$

## Exercice 2
Soit $f(x) = x - 1 - \\ln x$ sur $]0,+\\infty[$.
1. Calculer $f'(x)$ et dresser le tableau de variations de $f$.
2. En déduire que pour tout $x > 0$ : $\\ln x \\leq x - 1$.

## Exercice 3
Soit $g(x) = \\dfrac{\\ln x}{x}$ sur $]0,+\\infty[$.
1. Calculer les limites de $g$ en $0^+$ et en $+\\infty$.
2. Étudier les variations de $g$ et donner la valeur de son maximum.
3. En déduire une comparaison entre $e^{\\pi}$ et $\\pi^{e}$.

---
## Corrigé
**Ex. 1.**
1. $x > \\frac12$ ; $2x - 1 = 1 \\Rightarrow x = 1$.
2. $x > 3$ ; $x^2 - 3x - 4 = 0 \\Rightarrow x = 4$ (on rejette $-1$).
3. Poser $X = \\ln x$ : $X = 1$ ou $X = 2$, donc $x = e$ ou $x = e^2$.
4. Domaine $]-1, 3[$ ; $x + 1 \\leq 3 - x \\iff x \\leq 1$. $S = ]-1, 1]$.

**Ex. 2.** $f'(x) = 1 - \\frac1x = \\frac{x-1}{x}$ : $f$ décroît sur $]0,1]$ et croît sur $[1,+\\infty[$, minimum $f(1) = 0$. Donc $f(x) \\geq 0$, c'est-à-dire $\\ln x \\leq x - 1$.

**Ex. 3.** Limites : $-\\infty$ en $0^+$, $0$ en $+\\infty$. $g'(x) = \\frac{1 - \\ln x}{x^2}$, maximum en $x = e$ valant $\\frac1e$. Comme $\\pi > e$ et $g$ décroissante sur $[e,+\\infty[$ : $g(\\pi) < g(e)$, soit $e\\ln\\pi < \\pi\\ln e$, d'où $\\pi^e < e^\\pi$.
`,
      },
    ],
    quizzes: [
      {
        title: "QCM : logarithme népérien",
        durationMin: 10,
        questions: [
          { text: "$\\ln(e^3)$ vaut :", explanation: "$\\ln(e^3) = 3\\ln e = 3$.", options: [["$e$", false], ["$3$", true], ["$3e$", false], ["$1$", false]] },
          { text: "Pour $a, b > 0$, $\\ln(ab)$ est égal à :", explanation: "Propriété fondamentale du logarithme.", options: [["$\\ln a \\times \\ln b$", false], ["$\\ln a + \\ln b$", true], ["$\\ln(a + b)$", false], ["$a \\ln b$", false]] },
          { text: "$\\lim\\limits_{x \\to +\\infty} \\dfrac{\\ln x}{x}$ vaut :", explanation: "Croissance comparée : la puissance l'emporte sur le logarithme.", options: [["$+\\infty$", false], ["$1$", false], ["$0$", true], ["$e$", false]] },
          { text: "La dérivée de $f(x) = \\ln(3x + 2)$ sur son domaine est :", explanation: "$(\\ln u)' = u'/u$ avec $u = 3x + 2$.", options: [["$\\dfrac{1}{3x+2}$", false], ["$\\dfrac{3}{3x+2}$", true], ["$3\\ln(3x+2)$", false], ["$\\dfrac{1}{3}$", false]] },
          { text: "L'ensemble des solutions de $\\ln x < 0$ est :", explanation: "$\\ln$ est négative strictement entre $0$ et $1$.", options: [["$]-\\infty, 1[$", false], ["$]0, 1[$", true], ["$]1, +\\infty[$", false], ["$]0, e[$", false]] },
          { text: "Le domaine de définition de $x \\mapsto \\ln(x^2 - 4)$ est :", explanation: "Il faut $x^2 - 4 > 0$, soit $x < -2$ ou $x > 2$.", options: [["$]2, +\\infty[$", false], ["$]-\\infty, -2[ \\cup ]2, +\\infty[$", true], ["$\\mathbb{R} \\setminus \\{-2, 2\\}$", false], ["$[-2, 2]$", false]] },
        ],
      },
    ],
  },

  // =====================================================================
  "2bac-pc/physique-chimie/Ondes mécaniques progressives": {
    lessons: [
      {
        title: "Cours : ondes mécaniques progressives",
        durationMin: 30,
        content: `# Ondes mécaniques progressives

## 1. Qu'est-ce qu'une onde mécanique ?
Une **onde mécanique progressive** est le phénomène de propagation d'une perturbation dans un milieu matériel élastique, **sans transport de matière** mais **avec transport d'énergie**.

Exemples : vague à la surface de l'eau, ébranlement le long d'une corde, son dans l'air, ondes sismiques.

## 2. Ondes transversales et longitudinales
- **Transversale** : la déformation est perpendiculaire à la direction de propagation (corde, surface de l'eau).
- **Longitudinale** : la déformation est parallèle à la direction de propagation (ressort comprimé, son).

## 3. Célérité d'une onde
La **célérité** $v$ est la vitesse de propagation de la perturbation :
$$v = \\frac{d}{\\Delta t}$$
où $d$ est la distance parcourue pendant la durée $\\Delta t$. Elle s'exprime en $\\mathrm{m\\cdot s^{-1}}$.

La célérité dépend des **propriétés du milieu** (rigidité, masse linéique, température) et non de l'amplitude de la perturbation.

| Milieu | Célérité du son |
|---|---|
| Air (20 °C) | $\\approx 340\\ \\mathrm{m\\cdot s^{-1}}$ |
| Eau | $\\approx 1500\\ \\mathrm{m\\cdot s^{-1}}$ |
| Acier | $\\approx 5000\\ \\mathrm{m\\cdot s^{-1}}$ |

Pour une corde de tension $T$ et de masse linéique $\\mu$ : $v = \\sqrt{\\dfrac{T}{\\mu}}$.

## 4. Retard temporel
Un point $M$ du milieu situé à la distance $d$ de la source $S$ reproduit le mouvement de la source avec un **retard** :
$$\\tau = \\frac{d}{v}$$
On écrit $y_M(t) = y_S(t - \\tau)$ : l'élongation de $M$ à l'instant $t$ est celle de $S$ à l'instant $t - \\tau$.

**Exemple.** Une perturbation se propage le long d'une corde à $v = 4\\ \\mathrm{m\\cdot s^{-1}}$. Le point $M$ situé à $2{,}4\\ \\mathrm{m}$ de la source commence à bouger avec un retard $\\tau = \\dfrac{2{,}4}{4} = 0{,}6\\ \\mathrm{s}$.

## 5. Ondes à une, deux ou trois dimensions
- **1D** : corde, ressort.
- **2D** : surface de l'eau (rides circulaires ou rectilignes).
- **3D** : son dans l'air, ondes sismiques.

Pour une onde 2D ou 3D, l'énergie se répartit sur un front de plus en plus grand : l'**amplitude diminue** en s'éloignant de la source, même sans amortissement.

## 6. Superposition
Lorsque deux ondes se croisent, elles se **superposent** (les élongations s'ajoutent) puis continuent leur propagation **sans se perturber**.

---
### Méthode : exploiter une chronophotographie ou un enregistrement
1. Repérer la position du front d'onde à deux instants.
2. Mesurer $d$ et $\\Delta t$ (attention à l'échelle).
3. Calculer $v = d / \\Delta t$ puis les retards.
`,
      },
    ],
    quizzes: [
      {
        title: "QCM : ondes mécaniques progressives",
        durationMin: 8,
        questions: [
          { text: "Une onde mécanique progressive transporte :", explanation: "Il y a transport d'énergie mais pas de matière.", options: [["de la matière", false], ["de l'énergie", true], ["de la matière et de l'énergie", false], ["ni matière ni énergie", false]] },
          { text: "Le son dans l'air est une onde :", explanation: "Les couches d'air vibrent parallèlement à la direction de propagation.", options: [["transversale", false], ["longitudinale", true], ["électromagnétique", false], ["stationnaire", false]] },
          { text: "Une perturbation parcourt $12\\ \\mathrm{m}$ en $0{,}03\\ \\mathrm{s}$. Sa célérité est :", explanation: "$v = d/\\Delta t = 12 / 0{,}03 = 400\\ \\mathrm{m\\cdot s^{-1}}$.", options: [["$0{,}36\\ \\mathrm{m\\cdot s^{-1}}$", false], ["$40\\ \\mathrm{m\\cdot s^{-1}}$", false], ["$400\\ \\mathrm{m\\cdot s^{-1}}$", true], ["$4000\\ \\mathrm{m\\cdot s^{-1}}$", false]] },
          { text: "Le retard $\\tau$ d'un point situé à la distance $d$ de la source est donné par :", explanation: "$\\tau = d / v$.", options: [["$\\tau = d \\times v$", false], ["$\\tau = v / d$", false], ["$\\tau = d / v$", true], ["$\\tau = d - v$", false]] },
          { text: "La célérité d'une onde le long d'une corde augmente si :", explanation: "$v = \\sqrt{T/\\mu}$ : elle augmente avec la tension.", options: [["on augmente la tension de la corde", true], ["on augmente l'amplitude", false], ["on augmente la masse linéique", false], ["on diminue la tension", false]] },
        ],
      },
    ],
  },

  // =====================================================================
  "2bac-pc/physique-chimie/Décroissance radioactive": {
    lessons: [
      {
        title: "Cours : décroissance radioactive",
        durationMin: 30,
        content: `# Décroissance radioactive

## 1. Le noyau atomique
Un noyau est noté $^{A}_{Z}X$ avec $Z$ le nombre de protons (numéro atomique) et $A$ le nombre de nucléons. Le nombre de neutrons est $N = A - Z$.
Des **isotopes** ont le même $Z$ mais des $A$ différents (ex. : $^{12}_{6}C$ et $^{14}_{6}C$).

## 2. Radioactivité
Un noyau **instable** se désintègre spontanément en un noyau plus stable en émettant une particule. La désintégration est **aléatoire**, **spontanée** et **inéluctable**.

### Lois de conservation (Soddy)
Conservation du nombre de charge $Z$ et du nombre de nucléons $A$.

| Type | Particule émise | Équation générale |
|---|---|---|
| $\\alpha$ | noyau d'hélium $^4_2He$ | $^{A}_{Z}X \\to {}^{A-4}_{Z-2}Y + {}^{4}_{2}He$ |
| $\\beta^-$ | électron $^{0}_{-1}e$ | $^{A}_{Z}X \\to {}^{A}_{Z+1}Y + {}^{0}_{-1}e$ |
| $\\beta^+$ | positon $^{0}_{+1}e$ | $^{A}_{Z}X \\to {}^{A}_{Z-1}Y + {}^{0}_{+1}e$ |
| $\\gamma$ | photon | désexcitation du noyau fils : $Y^* \\to Y + \\gamma$ |

**Exemple.** $^{238}_{92}U \\to {}^{234}_{90}Th + {}^{4}_{2}He$ (désintégration $\\alpha$).

## 3. Loi de décroissance radioactive
Soit $N(t)$ le nombre de noyaux non désintégrés à l'instant $t$ et $N_0 = N(0)$.
$$N(t) = N_0\\, e^{-\\lambda t}$$
$\\lambda$ est la **constante radioactive** (en $\\mathrm{s^{-1}}$), caractéristique du noyau.

Cette loi provient de l'équation différentielle $\\dfrac{dN}{dt} = -\\lambda N$.

## 4. Demi-vie
La **demi-vie** $t_{1/2}$ est la durée au bout de laquelle la moitié des noyaux initiaux s'est désintégrée :
$$N(t_{1/2}) = \\frac{N_0}{2} \\quad \\Longrightarrow \\quad t_{1/2} = \\frac{\\ln 2}{\\lambda}$$
Après $n$ demi-vies, il reste $N_0 / 2^n$ noyaux.

| Noyau | Demi-vie |
|---|---|
| Carbone 14 | $5730$ ans |
| Iode 131 | $8$ jours |
| Uranium 238 | $4{,}5 \\times 10^9$ ans |

## 5. Activité
L'**activité** $A$ est le nombre de désintégrations par seconde, en **becquerel** (Bq) :
$$A(t) = -\\frac{dN}{dt} = \\lambda N(t) = A_0\\, e^{-\\lambda t}$$

## 6. Datation au carbone 14
Les organismes vivants contiennent une proportion constante de $^{14}C$. À la mort, les échanges cessent et le $^{14}C$ décroît. En mesurant l'activité $A$ d'un échantillon et en la comparant à l'activité $A_0$ d'un échantillon vivant :
$$t = \\frac{1}{\\lambda}\\ln\\frac{A_0}{A} = \\frac{t_{1/2}}{\\ln 2}\\ln\\frac{A_0}{A}$$

**Exemple.** Un fragment de bois a une activité égale à $25\\,\\%$ de celle d'un bois vivant. $A_0/A = 4 = 2^2$ : deux demi-vies se sont écoulées, soit environ $11\\,460$ ans.
`,
      },
    ],
    quizzes: [
      {
        title: "QCM : décroissance radioactive",
        durationMin: 10,
        questions: [
          { text: "Le noyau $^{14}_{6}C$ contient :", explanation: "$Z = 6$ protons et $A - Z = 8$ neutrons.", options: [["6 protons et 14 neutrons", false], ["6 protons et 8 neutrons", true], ["8 protons et 6 neutrons", false], ["14 protons et 6 neutrons", false]] },
          { text: "Lors d'une désintégration $\\beta^-$, le noyau fils a :", explanation: "Un neutron se transforme en proton : $Z$ augmente de 1, $A$ est conservé.", options: [["le même $A$ et $Z + 1$", true], ["$A - 4$ et $Z - 2$", false], ["le même $A$ et $Z - 1$", false], ["$A - 1$ et le même $Z$", false]] },
          { text: "La relation entre la demi-vie et la constante radioactive est :", explanation: "On résout $N_0 e^{-\\lambda t_{1/2}} = N_0/2$.", options: [["$t_{1/2} = \\lambda \\ln 2$", false], ["$t_{1/2} = \\dfrac{\\ln 2}{\\lambda}$", true], ["$t_{1/2} = \\dfrac{1}{\\lambda}$", false], ["$t_{1/2} = \\dfrac{\\lambda}{\\ln 2}$", false]] },
          { text: "Après 3 demi-vies, la fraction de noyaux restants est :", explanation: "$1/2^3 = 1/8$.", options: [["$1/3$", false], ["$1/6$", false], ["$1/8$", true], ["$1/9$", false]] },
          { text: "L'unité de l'activité est :", explanation: "Le becquerel : une désintégration par seconde.", options: [["le gray", false], ["le sievert", false], ["le becquerel", true], ["le curie par mètre", false]] },
          { text: "La désintégration d'un noyau radioactif est :", explanation: "On ne peut prévoir l'instant de désintégration d'un noyau donné.", options: [["prévisible pour chaque noyau", false], ["aléatoire", true], ["déclenchée par la température", false], ["réversible", false]] },
        ],
      },
    ],
  },

  // =====================================================================
  "3ac/mathematiques/Théorème de Pythagore et cosinus d'un angle aigu": {
    lessons: [
      {
        title: "Cours : théorème de Pythagore et sa réciproque",
        durationMin: 25,
        content: `# Théorème de Pythagore et cosinus d'un angle aigu

## 1. Le théorème de Pythagore
**Énoncé.** Si un triangle $ABC$ est rectangle en $A$, alors :
$$BC^2 = AB^2 + AC^2$$
Le côté $[BC]$, opposé à l'angle droit, s'appelle l'**hypoténuse** : c'est le plus grand côté.

**Exemple.** $ABC$ rectangle en $A$ avec $AB = 3$ cm et $AC = 4$ cm.
$BC^2 = 3^2 + 4^2 = 9 + 16 = 25$, donc $BC = \\sqrt{25} = 5$ cm.

**Calculer un côté de l'angle droit.** Si $BC = 13$ et $AB = 5$ : $AC^2 = BC^2 - AB^2 = 169 - 25 = 144$, donc $AC = 12$.

## 2. La réciproque du théorème de Pythagore
**Énoncé.** Si dans un triangle $ABC$ on a $BC^2 = AB^2 + AC^2$, alors le triangle est rectangle en $A$.

**Méthode pour prouver qu'un triangle est rectangle :**
1. Identifier le plus grand côté et calculer son carré.
2. Calculer la somme des carrés des deux autres côtés.
3. Comparer : si égalité → rectangle (réciproque) ; sinon → non rectangle (contraposée).

**Exemple.** $AB = 6$, $AC = 8$, $BC = 10$. Le plus grand côté est $BC$ : $BC^2 = 100$. $AB^2 + AC^2 = 36 + 64 = 100$. Égalité : $ABC$ est rectangle en $A$.

## 3. Cosinus d'un angle aigu
Dans un triangle $ABC$ rectangle en $A$ :
$$\\cos \\widehat{ABC} = \\frac{\\text{côté adjacent}}{\\text{hypoténuse}} = \\frac{AB}{BC}$$
Le cosinus d'un angle aigu est un nombre **compris entre 0 et 1** (sans unité).

**Valeurs à connaître :** $\\cos 30° = \\dfrac{\\sqrt3}{2} \\approx 0{,}87$ ; $\\cos 45° = \\dfrac{\\sqrt2}{2} \\approx 0{,}71$ ; $\\cos 60° = \\dfrac12$.

**Calculer une longueur.** Si $BC = 8$ cm et $\\widehat{ABC} = 60°$ : $AB = BC \\times \\cos 60° = 8 \\times 0{,}5 = 4$ cm.

**Calculer un angle.** Si $AB = 5$ et $BC = 7$ : $\\cos \\widehat{ABC} = 5/7 \\approx 0{,}714$, donc $\\widehat{ABC} \\approx 44°$ (touche $\\cos^{-1}$ de la calculatrice).

## 4. Cercle circonscrit
Un triangle rectangle est inscrit dans le cercle de diamètre son hypoténuse. Réciproquement, si $M$ appartient au cercle de diamètre $[BC]$ (avec $M \\ne B$, $M \\ne C$), alors $BMC$ est rectangle en $M$.

---
### Erreurs à éviter
- Appliquer Pythagore dans un triangle **non rectangle**.
- Oublier la racine carrée à la fin.
- Confondre le côté adjacent et le côté opposé.
`,
      },
      {
        title: "Exercices : Pythagore et cosinus",
        type: "EXERCISE",
        durationMin: 30,
        content: `# Exercices — Théorème de Pythagore

## Exercice 1
$ABC$ est un triangle rectangle en $B$ tel que $AB = 7$ cm et $BC = 24$ cm. Calculer $AC$.

## Exercice 2
Un triangle $EFG$ vérifie $EF = 9$ cm, $FG = 12$ cm et $EG = 15$ cm. Est-il rectangle ? Si oui, en quel sommet ?

## Exercice 3
Une échelle de $5$ m est appuyée contre un mur. Son pied est à $1{,}4$ m du mur. À quelle hauteur touche-t-elle le mur ? (arrondir au cm)

## Exercice 4
$MNP$ est rectangle en $M$ avec $NP = 10$ cm et $\\widehat{MNP} = 35°$.
1. Calculer $MN$ (arrondir au dixième).
2. En déduire $MP$.

## Exercice 5
Dans un triangle $RST$ rectangle en $S$, $RS = 4$ et $RT = 9$. Calculer la mesure de l'angle $\\widehat{SRT}$ arrondie au degré.

---
## Corrigé
**1.** $AC^2 = 49 + 576 = 625$, $AC = 25$ cm.
**2.** $EG^2 = 225$ ; $EF^2 + FG^2 = 81 + 144 = 225$. Égalité → rectangle en $F$.
**3.** $h^2 = 25 - 1{,}96 = 23{,}04$, $h = 4{,}8$ m.
**4.** $MN = 10\\cos 35° \\approx 8{,}2$ cm ; $MP = \\sqrt{100 - 8{,}2^2} \\approx 5{,}7$ cm.
**5.** $\\cos \\widehat{SRT} = 4/9 \\approx 0{,}444$, angle $\\approx 64°$.
`,
      },
      {
        title: "Examen blanc régional : géométrie (avec corrigé)",
        type: "EXAM",
        isPremium: true,
        durationMin: 60,
        content: `# Examen blanc — Partie géométrie (3AC)

*Durée conseillée : 60 minutes. Barème sur 10 points.*

## Exercice 1 (4 points)
Soit $ABC$ un triangle tel que $AB = 4{,}5$ cm, $AC = 6$ cm et $BC = 7{,}5$ cm.
1. Montrer que $ABC$ est rectangle. (1,5 pt)
2. Calculer $\\cos \\widehat{ABC}$ puis la mesure de $\\widehat{ABC}$ arrondie au degré. (1,5 pt)
3. Soit $H$ le pied de la hauteur issue de $A$. Calculer $AH$. (1 pt) *Indication : utiliser l'aire du triangle de deux façons.*

## Exercice 2 (3 points)
Un cerf-volant est retenu par une ficelle tendue de $30$ m. La ficelle fait un angle de $50°$ avec le sol horizontal.
1. Faire un schéma. (0,5 pt)
2. Calculer la distance horizontale entre l'enfant et le point situé sous le cerf-volant. (1,5 pt)
3. En déduire la hauteur du cerf-volant. (1 pt)

## Exercice 3 (3 points)
Dans un repère orthonormé, on donne $A(1;2)$, $B(4;6)$ et $C(-3;5)$.
1. Calculer $AB$, $AC$ et $BC$. (2 pts)
2. Le triangle $ABC$ est-il rectangle ? Justifier. (1 pt)

---
## Corrigé
**Ex. 1.** 1) $7{,}5^2 = 56{,}25 = 4{,}5^2 + 6^2 = 20{,}25 + 36$ → rectangle en $A$. 2) $\\cos\\widehat{ABC} = 4{,}5/7{,}5 = 0{,}6$, angle $\\approx 53°$. 3) Aire $= \\frac{4{,}5 \\times 6}{2} = 13{,}5 = \\frac{7{,}5 \\times AH}{2}$ donc $AH = 3{,}6$ cm.

**Ex. 2.** 2) $d = 30\\cos 50° \\approx 19{,}3$ m. 3) $h = \\sqrt{900 - 19{,}3^2} \\approx 23{,}0$ m.

**Ex. 3.** 1) $AB = \\sqrt{9 + 16} = 5$ ; $AC = \\sqrt{16 + 9} = 5$ ; $BC = \\sqrt{49 + 1} = \\sqrt{50}$. 2) $BC^2 = 50 = AB^2 + AC^2$ → rectangle isocèle en $A$.
`,
      },
    ],
    quizzes: [
      {
        title: "QCM : théorème de Pythagore",
        durationMin: 8,
        questions: [
          { text: "Dans un triangle $ABC$ rectangle en $A$, l'hypoténuse est :", explanation: "L'hypoténuse est le côté opposé à l'angle droit.", options: [["$[AB]$", false], ["$[AC]$", false], ["$[BC]$", true], ["le plus petit côté", false]] },
          { text: "$ABC$ rectangle en $A$, $AB = 6$ et $AC = 8$. Alors $BC =$", explanation: "$BC^2 = 36 + 64 = 100$.", options: [["$10$", true], ["$14$", false], ["$\\sqrt{28}$", false], ["$100$", false]] },
          { text: "Un triangle de côtés $5$, $12$ et $13$ est :", explanation: "$13^2 = 169 = 25 + 144$.", options: [["rectangle", true], ["équilatéral", false], ["non rectangle", false], ["impossible", false]] },
          { text: "Le cosinus d'un angle aigu est toujours :", explanation: "Le côté adjacent est plus court que l'hypoténuse.", options: [["supérieur à 1", false], ["compris entre 0 et 1", true], ["négatif", false], ["égal à 1", false]] },
          { text: "$\\cos 60°$ vaut :", explanation: "Valeur remarquable à connaître.", options: [["$\\dfrac{\\sqrt3}{2}$", false], ["$\\dfrac{\\sqrt2}{2}$", false], ["$\\dfrac12$", true], ["$1$", false]] },
        ],
      },
    ],
  },

  // =====================================================================
  "3ac/physique-chimie/Atomes et ions": {
    lessons: [
      {
        title: "Cours : atomes et ions",
        durationMin: 25,
        content: `# Atomes et ions

## 1. Structure de l'atome
L'atome est constitué d'un **noyau** (protons chargés positivement et neutrons neutres) autour duquel gravitent des **électrons** chargés négativement.

- Charge d'un proton : $+e$ ; charge d'un électron : $-e$, avec $e = 1{,}6 \\times 10^{-19}$ C.
- L'atome est **électriquement neutre** : il contient autant d'électrons que de protons.
- Le **numéro atomique** $Z$ est le nombre de protons.
- L'atome est essentiellement constitué de **vide** : le noyau est environ $100\\,000$ fois plus petit que l'atome.

| Atome | Symbole | $Z$ | Électrons |
|---|---|---|---|
| Hydrogène | H | 1 | 1 |
| Carbone | C | 6 | 6 |
| Oxygène | O | 8 | 8 |
| Sodium | Na | 11 | 11 |
| Chlore | Cl | 17 | 17 |
| Cuivre | Cu | 29 | 29 |

## 2. Les ions
Un **ion** est un atome (ou groupe d'atomes) qui a **gagné ou perdu** un ou plusieurs électrons.
- **Cation** : ion positif, l'atome a **perdu** des électrons. Ex. : $Na^+$, $Cu^{2+}$, $Al^{3+}$.
- **Anion** : ion négatif, l'atome a **gagné** des électrons. Ex. : $Cl^-$, $O^{2-}$.

**Exemple.** L'atome de sodium (11 électrons) perd 1 électron → ion $Na^+$ avec 10 électrons et toujours 11 protons.
L'atome de chlore (17 électrons) gagne 1 électron → ion $Cl^-$ avec 18 électrons.

Des **ions polyatomiques** courants : hydroxyde $HO^-$, sulfate $SO_4^{2-}$, nitrate $NO_3^-$, ammonium $NH_4^+$.

## 3. Solutions ioniques
Une solution ioniques est électriquement **neutre** : elle contient autant de charges positives que négatives.
- Chlorure de sodium : $(Na^+ + Cl^-)$
- Sulfate de cuivre : $(Cu^{2+} + SO_4^{2-})$
- Chlorure de fer III : $(Fe^{3+} + 3Cl^-)$

La conduction du courant dans une solution est assurée par le **déplacement des ions** : les cations vers la cathode (borne $-$) et les anions vers l'anode (borne $+$).

## 4. Le pH
Le pH mesure l'acidité d'une solution, de $0$ à $14$ :
- pH $< 7$ : solution **acide** (excès d'ions $H^+$)
- pH $= 7$ : solution **neutre**
- pH $> 7$ : solution **basique** (excès d'ions $HO^-$)

Diluer une solution acide fait **augmenter** son pH (vers 7) ; diluer une solution basique le fait **diminuer** (vers 7).
`,
      },
    ],
    quizzes: [
      {
        title: "QCM : atomes et ions",
        durationMin: 8,
        questions: [
          { text: "Un atome est électriquement neutre car :", explanation: "Les charges des protons et des électrons se compensent.", options: [["il n'a pas de charge", false], ["il a autant de protons que d'électrons", true], ["il a autant de neutrons que de protons", false], ["son noyau est neutre", false]] },
          { text: "L'ion $Cu^{2+}$ est obtenu à partir de l'atome de cuivre qui a :", explanation: "Une charge positive signifie une perte d'électrons.", options: [["gagné 2 électrons", false], ["perdu 2 électrons", true], ["gagné 2 protons", false], ["perdu 2 protons", false]] },
          { text: "Combien d'électrons possède l'ion $Cl^-$ ($Z = 17$) ?", explanation: "17 électrons + 1 électron gagné.", options: [["16", false], ["17", false], ["18", true], ["35", false]] },
          { text: "Une solution de pH = 3 est :", explanation: "pH inférieur à 7.", options: [["acide", true], ["basique", false], ["neutre", false], ["sans ions", false]] },
          { text: "La formule de la solution de sulfate de cuivre est :", explanation: "Le sulfate est $SO_4^{2-}$ ; la solution est neutre.", options: [["$(Cu^{+} + SO_4^{-})$", false], ["$(Cu^{2+} + SO_4^{2-})$", true], ["$(Cu^{2+} + 2SO_4^{-})$", false], ["$(Cu + SO_4)$", false]] },
        ],
      },
    ],
  },

  // =====================================================================
  "1bac-sex/mathematiques/Suites numériques": {
    lessons: [
      {
        title: "Cours : suites arithmétiques et géométriques",
        durationMin: 30,
        content: `# Suites numériques

## 1. Généralités
Une **suite numérique** $(u_n)$ est une fonction de $\\mathbb{N}$ (ou d'une partie de $\\mathbb{N}$) vers $\\mathbb{R}$. On peut la définir :
- **explicitement** : $u_n = f(n)$, par exemple $u_n = 2n + 1$ ;
- **par récurrence** : $u_0$ donné et $u_{n+1} = f(u_n)$, par exemple $u_0 = 1$, $u_{n+1} = 2u_n - 3$.

### Sens de variation
- $(u_n)$ est **croissante** si $u_{n+1} - u_n \\geq 0$ pour tout $n$ ;
- **décroissante** si $u_{n+1} - u_n \\leq 0$.
Pour une suite à termes strictement positifs, on peut comparer $\\dfrac{u_{n+1}}{u_n}$ à $1$.

### Suite majorée, minorée, bornée
$(u_n)$ est majorée par $M$ si $u_n \\leq M$ pour tout $n$, minorée par $m$ si $u_n \\geq m$. Elle est bornée si elle est majorée et minorée.

## 2. Suites arithmétiques
$(u_n)$ est arithmétique de **raison** $r$ si $u_{n+1} = u_n + r$ pour tout $n$.
- Terme général : $u_n = u_0 + nr$, ou plus généralement $u_n = u_p + (n - p)r$.
- Somme des termes : $S = u_0 + u_1 + \\dots + u_n = (n+1) \\times \\dfrac{u_0 + u_n}{2}$ (*nombre de termes × moyenne des extrêmes*).
- Variation : croissante si $r > 0$, décroissante si $r < 0$.

**Exemple.** $u_0 = 5$, $r = 3$ : $u_{10} = 5 + 30 = 35$ ; $S = u_0 + \\dots + u_{10} = 11 \\times \\dfrac{5 + 35}{2} = 220$.

## 3. Suites géométriques
$(v_n)$ est géométrique de **raison** $q$ si $v_{n+1} = q\\, v_n$ pour tout $n$.
- Terme général : $v_n = v_0 \\, q^n$, ou $v_n = v_p \\, q^{\\,n-p}$.
- Somme des termes (pour $q \\neq 1$) : $v_0 + v_1 + \\dots + v_n = v_0 \\dfrac{1 - q^{n+1}}{1 - q}$.
- Si $v_0 > 0$ : croissante si $q > 1$, décroissante si $0 < q < 1$.

**Exemple.** Un capital de $10\\,000$ DH placé à $4\\,\\%$ par an : $C_n = 10\\,000 \\times 1{,}04^n$. Après 5 ans, $C_5 \\approx 12\\,167$ DH.

## 4. Méthode : montrer qu'une suite est géométrique
Soit $u_0 = 1$ et $u_{n+1} = 3u_n - 4$. On pose $v_n = u_n - 2$.
$v_{n+1} = u_{n+1} - 2 = 3u_n - 6 = 3(u_n - 2) = 3v_n$.
Donc $(v_n)$ est géométrique de raison $3$ et de premier terme $v_0 = -1$. D'où $v_n = -3^n$ et $u_n = 2 - 3^n$.

## 5. Raisonnement par récurrence
Pour démontrer qu'une propriété $P(n)$ est vraie pour tout $n \\geq n_0$ :
1. **Initialisation** : vérifier $P(n_0)$.
2. **Hérédité** : supposer $P(n)$ vraie pour un $n$ fixé et montrer $P(n+1)$.
3. **Conclusion** : $P(n)$ est vraie pour tout $n \\geq n_0$.

**Exemple.** Montrer que $u_n = 2 - 3^n$ vérifie $u_n < 2$ pour tout $n$ : évident ici, mais la récurrence est indispensable quand la suite est définie uniquement par récurrence.
`,
      },
    ],
    quizzes: [
      {
        title: "QCM : suites numériques",
        durationMin: 10,
        questions: [
          { text: "Une suite arithmétique de premier terme $u_0 = 3$ et de raison $r = -2$ a pour terme général :", explanation: "$u_n = u_0 + nr$.", options: [["$u_n = 3 - 2n$", true], ["$u_n = 3 \\times (-2)^n$", false], ["$u_n = -2 + 3n$", false], ["$u_n = 3n - 2$", false]] },
          { text: "La suite définie par $v_n = 5 \\times 2^n$ est :", explanation: "$v_{n+1}/v_n = 2$ constant.", options: [["arithmétique de raison 2", false], ["géométrique de raison 2", true], ["géométrique de raison 5", false], ["ni arithmétique ni géométrique", false]] },
          { text: "$1 + 2 + 3 + \\dots + 100$ vaut :", explanation: "$100 \\times \\dfrac{1 + 100}{2} = 5050$.", options: [["$5000$", false], ["$5050$", true], ["$10100$", false], ["$4950$", false]] },
          { text: "Pour montrer qu'une suite est croissante, on étudie le signe de :", explanation: "Définition de la croissance.", options: [["$u_n$", false], ["$u_{n+1} - u_n$", true], ["$u_n - u_0$", false], ["$n \\cdot u_n$", false]] },
          { text: "Si $(v_n)$ est géométrique de raison $q = \\dfrac12$ et $v_0 = 8$, alors $v_3 =$", explanation: "$8 \\times (1/2)^3 = 8/8 = 1$.", options: [["$1$", true], ["$4$", false], ["$2$", false], ["$0{,}5$", false]] },
          { text: "La première étape d'un raisonnement par récurrence s'appelle :", explanation: "On vérifie la propriété au rang initial.", options: [["l'hérédité", false], ["l'initialisation", true], ["la conclusion", false], ["l'hypothèse", false]] },
        ],
      },
    ],
  },

  // =====================================================================
  "tc-sciences/mathematiques/Arithmétique dans N": {
    lessons: [
      {
        title: "Cours : divisibilité, nombres premiers, PGCD et PPCM",
        durationMin: 30,
        content: `# Arithmétique dans $\\mathbb{N}$

## 1. Divisibilité
Soient $a$ et $b$ deux entiers naturels avec $b \\neq 0$. On dit que $b$ **divise** $a$ (noté $b \\mid a$) s'il existe un entier $k$ tel que $a = kb$. On dit aussi que $a$ est un **multiple** de $b$.

**Propriétés.** Si $d \\mid a$ et $d \\mid b$, alors $d \\mid (a + b)$, $d \\mid (a - b)$ et $d \\mid (ua + vb)$ pour tous entiers $u, v$.

### Critères de divisibilité
| Par | Critère |
|---|---|
| 2 | dernier chiffre pair |
| 3 | somme des chiffres divisible par 3 |
| 4 | les deux derniers chiffres forment un multiple de 4 |
| 5 | dernier chiffre 0 ou 5 |
| 9 | somme des chiffres divisible par 9 |
| 11 | différence alternée des chiffres divisible par 11 |

## 2. Division euclidienne
Pour tous $a \\in \\mathbb{N}$ et $b \\in \\mathbb{N}^*$, il existe un unique couple $(q, r)$ tel que :
$$a = bq + r \\quad \\text{avec} \\quad 0 \\leq r < b.$$
$q$ est le **quotient** et $r$ le **reste**. Exemple : $47 = 6 \\times 7 + 5$.

## 3. Nombres premiers
Un entier $p \\geq 2$ est **premier** s'il n'a que deux diviseurs : $1$ et lui-même.
Les premiers nombres premiers : $2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, \\dots$

**Critère de primalité.** Pour tester si $n$ est premier, il suffit de vérifier qu'aucun nombre premier $p \\leq \\sqrt{n}$ ne divise $n$.
*Exemple : $97$ ; $\\sqrt{97} < 10$ ; ni 2, 3, 5, 7 ne divisent 97 → 97 est premier.*

**Théorème fondamental.** Tout entier $n \\geq 2$ se décompose de manière unique en produit de facteurs premiers.
$$360 = 2^3 \\times 3^2 \\times 5$$

## 4. PGCD et PPCM
- Le **PGCD** de $a$ et $b$ est le plus grand diviseur commun. Par la décomposition : on prend les facteurs **communs** avec le **plus petit** exposant.
- Le **PPCM** est le plus petit multiple commun non nul : on prend **tous** les facteurs avec le **plus grand** exposant.
- Relation : $\\mathrm{PGCD}(a,b) \\times \\mathrm{PPCM}(a,b) = a \\times b$.

**Exemple.** $a = 360 = 2^3 \\cdot 3^2 \\cdot 5$ et $b = 84 = 2^2 \\cdot 3 \\cdot 7$.
$\\mathrm{PGCD} = 2^2 \\cdot 3 = 12$ ; $\\mathrm{PPCM} = 2^3 \\cdot 3^2 \\cdot 5 \\cdot 7 = 2520$.

### Algorithme d'Euclide
$\\mathrm{PGCD}(a, b) = \\mathrm{PGCD}(b, r)$ où $r$ est le reste de la division de $a$ par $b$. On répète jusqu'à obtenir un reste nul ; le PGCD est le dernier reste non nul.
$$360 = 4 \\times 84 + 24,\\quad 84 = 3 \\times 24 + 12,\\quad 24 = 2 \\times 12 + 0 \\;\\Rightarrow\\; \\mathrm{PGCD} = 12.$$

Deux nombres sont **premiers entre eux** si leur PGCD vaut $1$.

## 5. Application : fraction irréductible
$\\dfrac{84}{360} = \\dfrac{84 \\div 12}{360 \\div 12} = \\dfrac{7}{30}$.
`,
      },
    ],
    quizzes: [
      {
        title: "QCM : arithmétique dans N",
        durationMin: 10,
        questions: [
          { text: "Le reste de la division euclidienne de $58$ par $7$ est :", explanation: "$58 = 8 \\times 7 + 2$.", options: [["$1$", false], ["$2$", true], ["$3$", false], ["$8$", false]] },
          { text: "Lequel de ces nombres est premier ?", explanation: "$91 = 7 \\times 13$, $51 = 3 \\times 17$, $87 = 3 \\times 29$.", options: [["$91$", false], ["$51$", false], ["$89$", true], ["$87$", false]] },
          { text: "La décomposition en facteurs premiers de $180$ est :", explanation: "$180 = 4 \\times 45 = 2^2 \\times 3^2 \\times 5$.", options: [["$2^2 \\times 3^2 \\times 5$", true], ["$2 \\times 3^2 \\times 10$", false], ["$2^2 \\times 45$", false], ["$2^3 \\times 3 \\times 5$", false]] },
          { text: "$\\mathrm{PGCD}(48, 36)$ vaut :", explanation: "$48 = 2^4 \\cdot 3$ et $36 = 2^2 \\cdot 3^2$ → $2^2 \\cdot 3 = 12$.", options: [["$6$", false], ["$12$", true], ["$24$", false], ["$144$", false]] },
          { text: "Si $\\mathrm{PGCD}(a,b) = 6$ et $ab = 216$, alors $\\mathrm{PPCM}(a,b) =$", explanation: "$\\mathrm{PPCM} = ab / \\mathrm{PGCD} = 216/6$.", options: [["$36$", true], ["$1296$", false], ["$6$", false], ["$216$", false]] },
          { text: "Un nombre est divisible par 9 si :", explanation: "Critère de divisibilité par 9.", options: [["il se termine par 9", false], ["la somme de ses chiffres est divisible par 9", true], ["il est divisible par 3", false], ["il est impair", false]] },
        ],
      },
    ],
  },

  // =====================================================================
  "6ap/mathematiques/Les fractions": {
    lessons: [
      {
        title: "Cours : comprendre et calculer avec les fractions",
        durationMin: 20,
        content: `# Les fractions

## 1. Qu'est-ce qu'une fraction ?
Une fraction représente une **partie d'un tout**. Dans $\\dfrac{3}{4}$ :
- $3$ est le **numérateur** : le nombre de parts que l'on prend ;
- $4$ est le **dénominateur** : le nombre de parts égales du tout.

*Exemple : une pizza coupée en 4 parts égales ; on en mange 3 → on a mangé $\\dfrac34$ de la pizza.*

## 2. Fractions équivalentes
On ne change pas une fraction en multipliant (ou en divisant) son numérateur et son dénominateur par le **même nombre** :
$$\\frac{1}{2} = \\frac{2}{4} = \\frac{3}{6} = \\frac{5}{10}$$

**Simplifier** une fraction, c'est diviser le haut et le bas par un même nombre : $\\dfrac{6}{8} = \\dfrac{3}{4}$.

## 3. Comparer des fractions
- **Même dénominateur** : la plus grande est celle qui a le plus grand numérateur. $\\dfrac57 > \\dfrac37$.
- **Même numérateur** : la plus grande est celle qui a le plus petit dénominateur. $\\dfrac23 > \\dfrac25$.
- **Comparer à 1** : si numérateur $<$ dénominateur, la fraction est plus petite que 1.

## 4. Additionner et soustraire
On ne peut additionner que des fractions de **même dénominateur** :
$$\\frac{2}{5} + \\frac{1}{5} = \\frac{3}{5} \\qquad \\frac{7}{9} - \\frac{4}{9} = \\frac{3}{9} = \\frac13$$
Si les dénominateurs sont différents, on les rend égaux d'abord :
$$\\frac{1}{2} + \\frac{1}{4} = \\frac{2}{4} + \\frac{1}{4} = \\frac{3}{4}$$

## 5. Fraction d'un nombre
Pour calculer $\\dfrac{3}{4}$ de $20$ : on divise $20$ par $4$ (→ $5$) puis on multiplie par $3$ (→ $15$).
$$\\frac34 \\text{ de } 20 = 20 \\div 4 \\times 3 = 15$$

*Exemple : Dans une classe de 32 élèves, $\\dfrac{5}{8}$ sont des filles. Il y a $32 \\div 8 \\times 5 = 20$ filles.*

## 6. Fractions et nombres décimaux
$\\dfrac{1}{2} = 0{,}5$ ; $\\dfrac{1}{4} = 0{,}25$ ; $\\dfrac{3}{10} = 0{,}3$ ; $\\dfrac{75}{100} = 0{,}75$.

---
### Je retiens
- Le dénominateur dit **en combien** on partage, le numérateur dit **combien** on prend.
- Même dénominateur → on additionne les numérateurs seulement.
`,
      },
    ],
    quizzes: [
      {
        title: "QCM : les fractions",
        durationMin: 8,
        questions: [
          { text: "Dans la fraction $\\dfrac{5}{8}$, le nombre 8 s'appelle :", explanation: "Le dénominateur est en bas.", options: [["le numérateur", false], ["le dénominateur", true], ["le quotient", false], ["le reste", false]] },
          { text: "Quelle fraction est égale à $\\dfrac{1}{2}$ ?", explanation: "$1 \\times 3 = 3$ et $2 \\times 3 = 6$.", options: [["$\\dfrac{2}{3}$", false], ["$\\dfrac{3}{6}$", true], ["$\\dfrac{1}{4}$", false], ["$\\dfrac{2}{5}$", false]] },
          { text: "$\\dfrac{2}{7} + \\dfrac{3}{7} =$", explanation: "Même dénominateur : on additionne les numérateurs.", options: [["$\\dfrac{5}{14}$", false], ["$\\dfrac{5}{7}$", true], ["$\\dfrac{6}{7}$", false], ["$\\dfrac{5}{49}$", false]] },
          { text: "$\\dfrac{3}{5}$ de 40 est égal à :", explanation: "$40 \\div 5 = 8$, puis $8 \\times 3 = 24$.", options: [["$8$", false], ["$15$", false], ["$24$", true], ["$120$", false]] },
          { text: "Quelle fraction est la plus grande ?", explanation: "Même numérateur : le plus petit dénominateur gagne.", options: [["$\\dfrac{3}{4}$", true], ["$\\dfrac{3}{5}$", false], ["$\\dfrac{3}{8}$", false], ["$\\dfrac{3}{10}$", false]] },
        ],
      },
    ],
  },

  // =====================================================================
  "2bac-pc/francais/Candide (Voltaire)": {
    lessons: [
      {
        title: "Fiche de lecture : Candide ou l'Optimisme",
        durationMin: 25,
        content: `# Candide ou l'Optimisme — Voltaire (1759)

## 1. Contexte
Publié en 1759 sous un pseudonyme, *Candide* est un **conte philosophique** écrit par Voltaire (1694–1778), figure majeure des **Lumières**. L'œuvre réagit à des événements contemporains : le tremblement de terre de Lisbonne (1755), la guerre de Sept Ans, et la philosophie de l'**optimisme** de Leibniz résumée par la formule « tout est pour le mieux dans le meilleur des mondes possibles ».

## 2. Genre : le conte philosophique
Le conte philosophique emprunte au conte traditionnel (héros naïf, voyages, péripéties invraisemblables, rythme rapide) pour porter une **critique** de la société et des idées. L'**ironie** est son arme principale : Voltaire feint d'approuver ce qu'il dénonce.

## 3. Résumé structuré
1. **Le château de Thunder-ten-tronckh** : Candide, jeune homme naïf, est chassé du château pour avoir embrassé Cunégonde.
2. **La guerre** : enrôlé de force chez les Bulgares, il découvre l'horreur de la « boucherie héroïque ».
3. **Lisbonne** : naufrage, tremblement de terre, autodafé. Pangloss est pendu, Candide fouetté.
4. **L'Amérique** : Buenos Aires, les jésuites du Paraguay, les Oreillons, puis l'**Eldorado**, utopie d'un pays sans clergé oppressif, sans prison, où l'or n'a pas de valeur.
5. **Le nègre de Surinam** : rencontre bouleversante avec un esclave mutilé, « c'est à ce prix que vous mangez du sucre en Europe ». Candide renonce à l'optimisme.
6. **Retour en Europe** : Paris, Venise (Pococuranté, le seigneur blasé), Constantinople.
7. **La métairie** : Candide retrouve Cunégonde enlaidie et fonde une petite communauté. Conclusion : « il faut cultiver notre jardin ».

## 4. Les personnages
| Personnage | Rôle |
|---|---|
| **Candide** | héros naïf qui évolue vers la lucidité |
| **Pangloss** | philosophe optimiste, caricature de Leibniz |
| **Martin** | pessimiste manichéen, contrepoint de Pangloss |
| **Cunégonde** | objet de la quête amoureuse, symbole des illusions |
| **Cacambo** | valet fidèle et débrouillard |
| **La vieille** | récit de malheurs, sagesse pratique |

## 5. Thèmes et cibles de la satire
- **L'optimisme** philosophique, démenti par les faits.
- **La guerre** (chapitre 3) : euphémismes ironiques.
- **L'intolérance religieuse** : l'Inquisition, l'autodafé.
- **L'esclavage et le colonialisme** (chapitre 19).
- **Le pouvoir et la noblesse** : vanité du baron.
- **Le bonheur** : l'Eldorado (utopie inaccessible) contre le jardin (bonheur modeste et actif).

## 6. Procédés d'écriture à repérer
- **Ironie** et **antiphrase** : « rien n'était si beau, si leste, si brillant… que les deux armées ».
- **Rythme** rapide, accumulation de péripéties.
- **Naïveté du regard** de Candide, qui révèle l'absurdité.
- **Parodie** du roman d'aventures et du conte.

## 7. La morale finale
« Il faut cultiver notre jardin » : refus des spéculations métaphysiques stériles, éloge du **travail** et de l'**action concrète** qui éloigne « trois grands maux : l'ennui, le vice et le besoin ».
`,
      },
      {
        title: "Méthode : analyser un extrait de Candide à l'examen",
        type: "SUMMARY",
        isPremium: true,
        durationMin: 15,
        content: `# Méthode — Étude de texte (examen national)

## Étapes de l'analyse
1. **Situer** l'extrait : œuvre, auteur, siècle, genre, place dans le récit.
2. **Identifier** le type de texte (narratif, descriptif, argumentatif) et le point de vue.
3. **Repérer** les procédés : ironie, antiphrase, hyperbole, énumération, champ lexical.
4. **Interpréter** : quelle cible ? quelle thèse implicite ?
5. **Conclure** sur la portée du passage dans l'œuvre.

## Exemple : chapitre 3 (la guerre)
- *Procédé* : antiphrase « boucherie héroïque », énumération des instruments de musique et des armes mêlés.
- *Effet* : contraste entre la beauté apparente et l'horreur réelle.
- *Cible* : la guerre, la justification religieuse (« Te Deum » chanté dans les deux camps).

## Formulations utiles
- « L'auteur recourt à l'ironie pour dénoncer… »
- « Ce passage illustre la remise en cause de l'optimisme… »
- « Le regard naïf de Candide met en évidence… »

## Erreurs fréquentes
- Raconter au lieu d'analyser.
- Citer sans commenter.
- Oublier le lien avec le contexte des Lumières.
`,
      },
    ],
    quizzes: [
      {
        title: "QCM : Candide",
        durationMin: 8,
        questions: [
          { text: "Candide appartient au genre :", explanation: "Il mêle les codes du conte à une visée critique.", options: [["du roman réaliste", false], ["du conte philosophique", true], ["de la tragédie", false], ["de l'autobiographie", false]] },
          { text: "Pangloss incarne :", explanation: "Il répète que tout est pour le mieux.", options: [["le pessimisme", false], ["l'optimisme leibnizien", true], ["la sagesse pratique", false], ["la révolte", false]] },
          { text: "L'Eldorado représente :", explanation: "Un pays idéal, inaccessible aux hommes ordinaires.", options: [["une utopie", true], ["un champ de bataille", false], ["une colonie esclavagiste", false], ["le château du baron", false]] },
          { text: "La phrase finale du conte est :", explanation: "Elle résume la morale de l'action concrète.", options: [["« Tout est pour le mieux »", false], ["« Il faut cultiver notre jardin »", true], ["« Le bonheur n'existe pas »", false], ["« Retournons à Lisbonne »", false]] },
          { text: "Le procédé dominant dans la description de la guerre au chapitre 3 est :", explanation: "Voltaire dit le contraire de ce qu'il pense pour dénoncer.", options: [["la métaphore", false], ["l'ironie", true], ["la personnification", false], ["la comparaison", false]] },
        ],
      },
    ],
  },

  // =====================================================================
  "2bac-pc/philosophie/La condition humaine : la personne": {
    lessons: [
      {
        title: "Cours : la personne — identité, valeur et liberté",
        durationMin: 30,
        content: `# La personne

## Problématique générale
Qu'est-ce qui fait qu'un être humain est une **personne** et non une simple chose ? Qu'est-ce qui garantit son **identité** à travers le temps ? D'où vient sa **valeur** ? Est-elle vraiment **libre** ?

## Axe 1 — La personne et l'identité
**Problème.** Je change sans cesse (corps, opinions, souvenirs) : en quoi suis-je pourtant le même ?

- **Descartes** : la personne est d'abord une **substance pensante**. Le « je pense, donc je suis » établit une certitude première : l'identité repose sur la conscience de soi.
- **Locke** : l'identité personnelle est fondée sur la **mémoire**. Je suis la même personne que celle dont je me souviens des actes ; la conscience « fait » la personne.
- **Schopenhauer** : l'identité ne réside pas dans la conscience changeante mais dans le **caractère** et la **volonté**, qui demeurent identiques.
- **Freud** (contrepoint) : le moi n'est « pas maître dans sa propre maison » ; l'inconscient fragilise l'idée d'une identité transparente.

## Axe 2 — La personne comme valeur
**Problème.** Pourquoi la personne mérite-t-elle le respect ?

- **Kant** : les choses ont un **prix**, les personnes ont une **dignité**. La personne est une **fin en soi** et ne doit jamais être traitée seulement comme un moyen. C'est la raison, capacité morale, qui fonde cette dignité.
- **Hegel** : la personne se réalise et se fait reconnaître par le **travail** et par la **reconnaissance** d'autrui (dialectique du maître et de l'esclave).
- **Rawls** : la valeur de la personne fonde des principes de **justice** : chaque individu a des droits inviolables que même le bien-être général ne peut supprimer.

## Axe 3 — La personne entre nécessité et liberté
**Problème.** La personne est-elle le produit de déterminismes (biologiques, sociaux, psychiques) ou l'auteur de ses actes ?

- **Sartre** : « l'existence précède l'essence ». L'homme n'est rien d'autre que ce qu'il se fait ; il est **condamné à être libre** et responsable de ses choix.
- **Spinoza** (contrepoint) : les hommes se croient libres parce qu'ils ignorent les causes qui les déterminent.
- **Mounier** (personnalisme) : la personne est un **engagement** : elle se construit dans le choix, la relation aux autres et la fidélité à des valeurs.

## Synthèse
La personne est à la fois **un fait** (un être conscient et identique à lui-même), **une valeur** (une dignité qui exige le respect) et **un projet** (une liberté qui se construit). Ces trois dimensions sont inséparables : c'est parce qu'elle est libre que la personne a une dignité, et c'est parce qu'elle est consciente qu'elle peut assumer son identité.

## Vocabulaire
- **Identité** : ce qui fait qu'un être reste le même à travers le temps.
- **Dignité** : valeur absolue, sans équivalent ni prix.
- **Déterminisme** : doctrine selon laquelle tout événement a des causes qui le rendent nécessaire.
- **Reconnaissance** : acte par lequel autrui confirme mon existence comme personne.
`,
      },
    ],
    quizzes: [
      {
        title: "QCM : la personne",
        durationMin: 8,
        questions: [
          { text: "Pour Locke, l'identité personnelle repose sur :", explanation: "La conscience et la mémoire de ses propres actes.", options: [["le corps", false], ["la mémoire", true], ["la société", false], ["l'inconscient", false]] },
          { text: "Selon Kant, la personne possède :", explanation: "Distinction entre prix (choses) et dignité (personnes).", options: [["un prix", false], ["une dignité", true], ["une utilité", false], ["une fonction", false]] },
          { text: "« L'existence précède l'essence » est une thèse de :", explanation: "Sartre, existentialisme.", options: [["Descartes", false], ["Kant", false], ["Sartre", true], ["Spinoza", false]] },
          { text: "Pour Hegel, la personne se réalise par :", explanation: "Travail et reconnaissance mutuelle.", options: [["la solitude", false], ["le travail et la reconnaissance", true], ["la mémoire", false], ["le doute", false]] },
          { text: "Spinoza affirme que les hommes se croient libres parce que :", explanation: "Ils sont conscients de leurs désirs mais ignorent les causes.", options: [["ils sont libres", false], ["ils ignorent les causes qui les déterminent", true], ["Dieu les a créés libres", false], ["la société le leur dit", false]] },
        ],
      },
    ],
  },

  // =====================================================================
  "concours-medecine/logique/Raisonnement logique": {
    lessons: [
      {
        title: "Cours : les tests de raisonnement logique au concours",
        durationMin: 25,
        isPremium: true,
        content: `# Raisonnement logique — méthodes rapides

## 1. Suites numériques
Repérer la **règle** qui relie les termes :
- **Différence constante** : $3, 7, 11, 15, \\dots$ (+4)
- **Rapport constant** : $2, 6, 18, 54, \\dots$ (×3)
- **Différences croissantes** : $1, 2, 4, 7, 11, \\dots$ (+1, +2, +3, +4)
- **Deux suites imbriquées** : $1, 10, 2, 20, 3, 30, \\dots$
- **Carrés / cubes** : $1, 4, 9, 16, \\dots$ ; $1, 8, 27, 64, \\dots$
- **Fibonacci** : chaque terme est la somme des deux précédents.

**Méthode** : écrire les différences entre termes ; si elles ne sont pas constantes, écrire les différences des différences.

## 2. Suites de lettres
Convertir en rangs : A=1, B=2, …, Z=26. Exemple : $B, D, G, K, P$ → rangs $2, 4, 7, 11, 16$ → différences $+2, +3, +4, +5$ → suivant : $16 + 6 = 22$ → **V**.

## 3. Syllogismes
Prémisse 1 : « Tous les A sont B ». Prémisse 2 : « Certains B sont C ». On **ne peut pas** conclure que certains A sont C.
Règle : dessiner des **diagrammes** (ensembles) pour vérifier chaque conclusion proposée.

## 4. Problèmes de logique (tableaux)
Pour les énoncés du type « Ali, Sara et Omar ont chacun une profession différente… », construire un **tableau à double entrée** et cocher/barrer au fur et à mesure.

## 5. Calcul rapide
- Multiplier par 5 : multiplier par 10 puis diviser par 2.
- Multiplier par 11 un nombre à deux chiffres : $ab \\to a\\,(a+b)\\,b$ ; $34 \\times 11 = 374$.
- Carré d'un nombre finissant par 5 : $65^2 = 6 \\times 7 \\,|\\, 25 = 4225$.
- Pourcentages : $x\\,\\%$ de $y$ = $y\\,\\%$ de $x$ ; $8\\,\\%$ de 50 = $50\\,\\%$ de 8 = 4.

## 6. Gestion du temps
Au concours, chaque question vaut le même nombre de points : **ne pas s'acharner**. Répondre d'abord aux questions rapides, marquer les autres et y revenir.
`,
      },
    ],
    quizzes: [
      {
        title: "Test blanc : raisonnement logique (10 questions)",
        durationMin: 10,
        isPremium: true,
        questions: [
          { text: "Quel est le terme suivant : $2, 5, 10, 17, 26, \\;?$", explanation: "Différences $3, 5, 7, 9, 11$ → $26 + 11 = 37$ (aussi $n^2 + 1$).", options: [["$35$", false], ["$36$", false], ["$37$", true], ["$38$", false]] },
          { text: "Quel est le terme suivant : $1, 1, 2, 3, 5, 8, \\;?$", explanation: "Suite de Fibonacci.", options: [["$11$", false], ["$12$", false], ["$13$", true], ["$16$", false]] },
          { text: "Quelle lettre suit : $C, F, I, L, \\;?$", explanation: "Rangs 3, 6, 9, 12 → 15 = O.", options: [["M", false], ["N", false], ["O", true], ["P", false]] },
          { text: "Tous les chats sont des mammifères. Certains mammifères volent. Donc :", explanation: "On ne peut rien conclure sur les chats.", options: [["certains chats volent", false], ["aucun chat ne vole", false], ["on ne peut pas conclure", true], ["tous les mammifères sont des chats", false]] },
          { text: "$45 \\times 11 =$", explanation: "$4\\,(4+5)\\,5 = 495$.", options: [["$485$", false], ["$495$", true], ["$505$", false], ["$455$", false]] },
          { text: "$85^2 =$", explanation: "$8 \\times 9 = 72$, suivi de $25$.", options: [["$7025$", false], ["$7225$", true], ["$7425$", false], ["$6825$", false]] },
          { text: "Suite : $3, 6, 4, 8, 6, 12, \\;?$", explanation: "Alternance ×2 puis −2 : $12 - 2 = 10$.", options: [["$10$", true], ["$14$", false], ["$24$", false], ["$9$", false]] },
          { text: "Si $12\\,\\%$ de $x$ vaut $30$, alors $x =$", explanation: "$x = 30 / 0{,}12 = 250$.", options: [["$250$", true], ["$360$", false], ["$150$", false], ["$400$", false]] },
          { text: "Un train parcourt 180 km en 1 h 30. Sa vitesse moyenne est :", explanation: "$180 / 1{,}5 = 120$ km/h.", options: [["$90$ km/h", false], ["$120$ km/h", true], ["$135$ km/h", false], ["$270$ km/h", false]] },
          { text: "Quel nombre complète : $7, 10, 16, 28, \\;?$", explanation: "Différences $3, 6, 12$ (×2) → $+24$ → $52$.", options: [["$40$", false], ["$46$", false], ["$52$", true], ["$56$", false]] },
        ],
      },
    ],
  },
};
