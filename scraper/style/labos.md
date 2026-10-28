# Labos interactifs des cours Myschool

Un labo est un petit dispositif que l'élève manipule juste après l'explication d'une notion : il change un
réglage et voit l'effet en direct. Il s'écrit dans le cours comme un bloc de code ` ```lab ` contenant un objet
JSON ; la plateforme le transforme en simulation (site et application).

## Quand mettre un labo

- **Seulement pour les notions les plus importantes et les plus difficiles à comprendre du cours** : celles
  qu'un élève comprend mal en lisant, et mieux en manipulant (une courbe dont la forme dépend de paramètres, un
  phénomène qui évolue dans le temps, une convergence, une probabilité, un croisement génétique…).
- **Au plus 2 labos par cours**, souvent 1. **Aucun** si aucune notion ne s'y prête (vocabulaire, historique,
  méthodologie, définitions simples) : mieux vaut pas de labo qu'un gadget.
- **Chaque curseur doit changer quelque chose qu'il faut comprendre** : la forme d'une courbe, une position, une
  vitesse, une limite, des proportions. Un curseur qui ne fait que changer l'échelle (multiplier toute la courbe
  par un nombre) ou une courbe qui ne dépend d'aucun réglage sont des gadgets : pas de labo.
- Ne refais pas en labo un schéma déjà présent dans le cours si manipuler n'apporte rien de plus, et ne trace pas
  avec une courbe un phénomène qui n'est pas une fonction continue (étapes d'un cycle, sauts brusques).
- Deux labos d'un même cours illustrent deux notions différentes (pas la charge puis la décharge du même
  dipôle : un seul labo, avec les deux courbes si besoin).
- Le labo se place **juste après le bloc qui énonce la notion** (définition, propriété, théorème, méthode) ou
  juste après le paragraphe qui l'explique, jamais au milieu d'un exercice ni d'une solution.
- Les valeurs par défaut reprennent celles du cours (mêmes ordres de grandeur, mêmes notations, mêmes unités).

## Champs communs

- `"labo"` : le type, parmi `"courbe"`, `"echiquier"`, `"onde-corde"`.
- `"titre"` : court (90 caractères au plus), nomme ce que l'on explore : « Charge d'un condensateur ».
- `"consigne"` : 1 ou 2 phrases (400 caractères au plus) qui disent **quoi manipuler et quoi observer**, au
  vocabulaire du cours : « Modifiez R et C : la constante de temps τ = RC fixe la vitesse de charge. »
  Texte simple (pas de `$…$`), symboles Unicode permis (τ, λ, ², √, →).
- `"defi"` (conseillé) : une petite mission qui oblige à comprendre, réussie quand une condition devient vraie.
  La condition doit être **fausse avec les valeurs par défaut** et **atteignable** avec les pas des curseurs.

## Type « courbe »

Une ou plusieurs courbes pilotées par des curseurs. Convient aux fonctions (variations, dérivée et tangente,
limites et asymptotes, exponentielle, logarithme, intégrale), aux suites (explicites ou récurrentes, avec la
« toile » de convergence), aux lois physiques et chimiques en fonction du temps (dipôles RC, RL, RLC,
décroissance radioactive, cinétique chimique, chute, oscillateurs), aux trajectoires (courbes paramétrées).

```json
{
  "labo": "courbe",
  "titre": "Charge d'un condensateur à travers une résistance",
  "consigne": "Modifiez R et C : la constante de temps τ = RC fixe la vitesse de charge. À t = τ, u_C atteint 63 % de E.",
  "variable": "t",
  "x": { "min": 0, "max": 0.05, "label": "t (s)" },
  "y": { "min": 0, "max": 13, "label": "u_C (V)" },
  "parametres": [
    { "nom": "E", "label": "Tension E", "min": 2, "max": 12, "pas": 0.5, "valeur": 6, "unite": "V" },
    { "nom": "R", "label": "Résistance R", "min": 100, "max": 10000, "pas": 100, "valeur": 1000, "unite": "Ω" },
    { "nom": "C", "label": "Capacité C", "min": 1, "max": 10, "pas": 0.5, "valeur": 2, "unite": "µF" }
  ],
  "courbes": [
    { "expr": "E*(1-exp(-t/(R*C*1e-6)))", "label": "u_C(t)" },
    { "expr": "E", "label": "E (asymptote)", "couleur": "gris", "pointille": true }
  ],
  "reperes": [{ "x": "R*C*1e-6", "label": "τ" }, { "y": "0.63*E", "label": "0,63 E" }],
  "mesures": [{ "label": "Constante de temps τ = RC", "expr": "R*C*1e-3", "unite": "ms", "chiffres": 2 }],
  "defi": { "texte": "Défi : réglez R et C pour obtenir τ = 10 ms.", "condition": "abs(R*C*1e-6-0.01)<0.0002", "bravo": "Bravo : τ = RC = 10 ms." }
}
```

- `"variable"` : nom de la variable en abscisse (`"x"` par défaut, `"t"` pour le temps).
- `"x"`, `"y"` : fenêtre affichée (`min` < `max`) et légende de l'axe avec son unité. Choisissez-la pour que
  la courbe occupe bien la fenêtre **pour toutes les positions des curseurs** autant que possible.
- `"parametres"` (0 à 5) : curseurs. `nom` : nom court utilisé dans les formules (pas `t`, `n`, `u`, `e`,
  `pi`, ni le nom de la variable) ; `label` : texte affiché ; `min`, `max`, `pas`, `valeur` (entre min et max),
  `unite` (facultatif). Les unités affichées peuvent différer des unités SI : convertissez dans la formule
  (`C*1e-6` pour des µF).
- `"courbes"` (1 à 4) :
  - fonction : `{ "expr": "…", "label": "f(x)" }`, formule de la variable et des paramètres ;
  - paramétrée : `{ "type": "parametrique", "x": "…", "y": "…", "de": 0, "a": "…" }`, formules de `t`
    (le paramètre de la courbe) tracées pour t de `de` à `a` ;
  - suite explicite : `{ "type": "suite", "expr": "…", "n": 15 }`, formule de `n`, points (n ; u_n) pour
    n = 0 … `n` (l'axe x va alors de 0 à `n`) ;
  - suite récurrente : `{ "type": "recurrence", "u0": "…", "expr": "…", "n": 12, "toile": true }`, où `expr`
    donne u(n+1) en fonction de `u` (et de `n`). Avec `"toile": true`, on trace y = f(x), la droite y = x et
    l'escalier de convergence (axes x et y dans les mêmes unités) ; sans, les points (n ; u_n).
  - options : `"couleur"` (`"principale"`, `"accent"`, `"secondaire"`, `"gris"`), `"pointille": true`.
- `"point"` (facultatif) : `{ "courbe": 0, "x": "a", "label": "M", "tangente": true }`, un point sur une
  courbe de type fonction, d'abscisse donnée (souvent un curseur), avec sa tangente ; ses coordonnées et la
  pente s'affichent.
- `"aire"` (facultatif) : `{ "courbe": 0, "de": "a", "a": "b" }`, colorie l'aire entre la courbe et l'axe des
  abscisses et affiche l'intégrale.
- `"reperes"` (facultatif) : droites verticales `{ "x": "…", "label": "τ" }` ou horizontales `{ "y": "…" }`.
- `"mesures"` (0 à 4) : valeurs calculées affichées sous le graphique (`label`, `expr`, `unite`, `chiffres`).
- `"animation"` (facultatif) : `{ "parametre": "t0", "duree": 6 }` fait défiler un curseur (bouton « Animer »).

**Formules** : nombres (`0.5`, `1e-6`), `+ - * / ^`, parenthèses, comparaisons `< > <= >=`, constantes `pi` et
`e`, fonctions `sin cos tan asin acos atan exp ln log` (base 10) `sqrt abs min max floor round`, et
`si(condition, alors, sinon)` pour une fonction définie par morceaux. Écrivez les produits avec `*`
(`R*C`, `2*x`). Les angles des fonctions trigonométriques sont en radians (`cos(al*pi/180)` pour des degrés).

Autres exemples : tangente `{"x":{"min":-3,"max":3},"y":{"min":-4,"max":4},"parametres":[{"nom":"a","label":"Abscisse a de M","min":-2.5,"max":2.5,"pas":0.05,"valeur":-2}],"courbes":[{"expr":"x^3-3*x","label":"f(x) = x³ − 3x"}],"point":{"courbe":0,"x":"a","tangente":true},"defi":{"texte":"Défi : placez M où la tangente est horizontale.","condition":"abs(3*a^2-3)<0.05"}}` ;
toile `{"x":{"min":-1,"max":9},"y":{"min":-1,"max":9},"parametres":[{"nom":"u0","label":"Premier terme u0","min":-1,"max":9,"pas":0.1,"valeur":0}],"courbes":[{"type":"recurrence","u0":"u0","expr":"0.5*u+2","n":12,"toile":true}]}` ;
trajectoire `{"courbes":[{"type":"parametrique","x":"v0*cos(al*pi/180)*t","y":"v0*sin(al*pi/180)*t-4.9*t^2","de":0,"a":"2*v0*sin(al*pi/180)/9.8"}]}`.

## Type « echiquier »

Un croisement génétique : l'élève choisit le génotype de chaque parent et lit les gamètes, l'échiquier de
croisement et les proportions des phénotypes. Monohybridisme, dihybridisme (gènes indépendants), codominance,
dominance intermédiaire, hérédité liée au chromosome X.

```json
{
  "labo": "echiquier",
  "titre": "Dihybridisme : gènes indépendants",
  "consigne": "Croisez deux drosophiles de la F1 : avec deux gènes indépendants, on obtient 9/16, 3/16, 3/16, 1/16.",
  "genes": [
    { "caractere": "Couleur du corps", "alleles": [{ "symbole": "G", "phenotype": "gris" }, { "symbole": "e", "phenotype": "ebony" }] },
    { "caractere": "Longueur des ailes", "alleles": [{ "symbole": "L", "phenotype": "longues" }, { "symbole": "vg", "phenotype": "vestigiales" }] }
  ],
  "parent1": [["G", "e"], ["L", "vg"]],
  "parent2": [["G", "e"], ["L", "vg"]],
  "defi": { "texte": "Défi : trouvez le croisement test qui donne 4 phénotypes à 1/4 chacun.", "proportions": { "gris, longues": 0.25, "gris, vestigiales": 0.25, "ebony, longues": 0.25, "ebony, vestigiales": 0.25 } }
}
```

- `"genes"` : 1 ou 2 gènes. Les allèles sont listés **du plus dominant au plus récessif** (2 à 4 allèles,
  symboles courts du cours). Codominance ou dominance intermédiaire : `"heterozygotes": { "A/B": "groupe AB" }`
  donne le phénotype de l'hétérozygote.
- `"parent1"`, `"parent2"` : un couple d'allèles par gène.
- `"lie_au_sexe": true` (un seul gène, porté par X) : `parent1` est la mère (2 allèles), `parent2` le père
  (1 allèle, son X).
- `"defi"` : `"proportions"` attendues, la clé est le phénotype de la descendance (phénotypes des gènes
  séparés par « , » dans l'ordre des gènes), la valeur sa fraction.

## Type « onde-corde »

Onde progressive sinusoïdale le long d'une corde (vibreur, célérité, longueur d'onde, stroboscope, loupe sur un
point M avec oscilloscope, retard et déphasage). **Uniquement pour les ondes mécaniques progressives.**

```json
{
  "labo": "onde-corde",
  "titre": "La loupe : retard et déphasage d'un point M",
  "consigne": "Faites glisser la loupe le long de la corde : le point M reproduit le mouvement de la source avec un retard θ = x / v.",
  "reglages": { "frequence": 2, "celerite": 1, "longueur": 2, "loupe": 0.35 },
  "outils": ["loupe"],
  "defi": { "relation": "opposition", "texte": "Défi : placez la loupe sur un point qui vibre en opposition de phase avec la source." }
}
```

`reglages` : `frequence` (1 à 10 Hz), `celerite` (0,5 à 5 m/s), `longueur` (0,5 à 5 m), `loupe` (position
initiale de M en m). `outils` : `"stroboscope"` et/ou `"loupe"`. `defi.relation` (avec la loupe) : `"phase"`,
`"opposition"` ou `"quadrature"`.
