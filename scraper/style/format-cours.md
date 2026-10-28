# Format des cours Myschool

Chaque cours est un document Markdown autonome, rédigé pour un élève qui découvre le chapitre. Il suit
le modèle des polycopiés de référence (cf. `reference-elements-de-logique.md`) : des parties numérotées,
des définitions mises en évidence, des exemples, des remarques et des exercices corrigés.

## Structure

```
# Titre du chapitre

## I. Première partie
### 1) Sous-partie
Texte explicatif…

## III. Exercices
## IV. Solutions des exercices
```

- `#` : titre du chapitre (un seul). `##` : parties numérotées en chiffres romains (`## I. …`). Les titres
  `##` et `###` alimentent le sommaire affiché à droite du cours : ils doivent être courts et explicites.
  **Pas de sommaire dans le texte** (ni « Sommaire », ni « Plan », ni table des matières) : il ferait double
  emploi avec celui de la page. Le cours commence directement par le titre `#` puis par `## I. …`.
  `###` : sous-parties numérotées `1)`, `2)`… Pas de niveau plus profond.
- Le texte explicatif est rédigé en phrases complètes, du simple au complexe, avec des transitions.
  Chaque notion nouvelle est d'abord motivée (à quoi sert-elle ?), puis définie, puis illustrée.

## Blocs mis en évidence

Les blocs sont des citations Markdown (`>`) dont la **première ligne** commence par un libellé en gras.
Le libellé décide de la couleur à l'affichage.

| Libellé (première ligne du bloc)            | Rôle                                   | Couleur     |
|---------------------------------------------|----------------------------------------|-------------|
| `> **Définition 1.1 — Nom.**`               | définition d'une notion                 | jaune       |
| `> **Théorème 1.1.**` `> **Propriété 1.2.**` `> **Proposition.**` `> **Corollaire.**` | résultat admis ou démontré | bleu |
| `> **Méthode.**`                            | marche à suivre pour un type d'exercice | violet      |
| `> **Exemple.**` `> **Exemples.**` `> **Application.**` | illustration concrète        | vert        |
| `> **Remarque.**` `> **Attention !**`       | précision, piège à éviter               | orange      |
| `> **Démonstration.**` `> **Preuve.**`      | preuve d'un résultat                    | gris clair  |
| `> **Exercice 1.1.**`                       | énoncé d'exercice                       | gris        |
| `> **Indice.**`                             | coup de pouce, **replié** derrière un bouton « Voir un indice » | — |
| `> **Solution de l'exercice 1.1.**`         | correction, **repliée** derrière un bouton « Voir la solution » | — |
| `> **À retenir.**`                          | l'essentiel d'une partie, en fin de partie | jaune, bordure épaisse |
| `> **Testez-vous.**`                        | question rapide de compréhension        | turquoise   |
| `> **Réponse.**`                            | réponse du « Testez-vous », **repliée** derrière « Voir la réponse » | — |
| `> **Pas à pas.**`                          | raisonnement révélé étape par étape     | indigo      |

Règles :
- Les définitions, théorèmes et exercices sont numérotés `partie.numéro` (1.1, 1.2, 2.1…), comme dans le
  polycopié de référence. Le nom de la notion suit un tiret cadratin : `**Définition 1.1 — Limite finie.**`.
- Le contenu du bloc suit sur les lignes suivantes, chacune préfixée par `>`. Un bloc peut contenir des
  formules, des listes et plusieurs paragraphes (ligne `>` vide entre deux paragraphes).
- **Surlignage jaune `==…==` : uniquement les points les plus importants du chapitre.** Il marque le terme
  défini d'une définition essentielle ou la formule clé d'un théorème central — ce qu'un élève doit absolument
  savoir le jour de l'examen. Au plus **un surlignage par bloc**, de quelques mots ou d'une formule, et
  seulement dans les blocs Définition et Théorème / Propriété / Proposition / Corollaire. Les définitions et
  propriétés secondaires ne sont pas surlignées. Jamais de surlignage dans le texte courant, les méthodes, les
  blocs « À retenir » (déjà mis en évidence), les exemples, remarques, exercices, indices, solutions ni réponses.
  Un cours entier en compte **de 4 à 10** : si beaucoup de choses sont surlignées, plus rien ne ressort.
- Toute définition est suivie d'au moins un exemple ou d'une remarque qui l'éclaire.
- Chaque partie `##` du cours (sauf la partie Exercices) se termine par un bloc `> **À retenir.**` : une
  liste de 2 à 5 points, courts, qui résument la partie (formules clés comprises).

## Explications interactives

Le cours n'est pas qu'à lire : l'élève agit. Trois blocs le font participer ; leur contenu caché ne s'affiche
qu'à la demande.

- **Testez-vous** : après chaque notion importante (définition, théorème, méthode), une question courte que
  l'élève peut résoudre de tête en moins d'une minute, suivie **immédiatement** de sa réponse dans un bloc
  `> **Réponse.**` (replié). La réponse explique en une ou deux phrases, elle ne donne pas qu'un résultat.
  De 3 à 8 « Testez-vous » par cours, selon sa longueur.

```
> **Testez-vous.**
> La fonction $x\mapsto \sqrt{x}$ est-elle dérivable en $0$ ?

> **Réponse.**
>
> Non : le taux d'accroissement $\dfrac{\sqrt{h}}{h}=\dfrac{1}{\sqrt{h}}$ tend vers $+\infty$ quand $h\to 0^+$.
```

- **Pas à pas** : pour un exemple résolu ou une démonstration courte où l'ordre des étapes compte, le
  raisonnement est une **liste numérotée** (`1.`, `2.`, `3.`…), de 3 à 6 étapes d'une ou deux phrases. À
  l'écran, les étapes apparaissent une à une (bouton « Étape suivante ») : l'élève peut deviner la suivante
  avant de l'afficher. Une phrase d'introduction peut précéder la liste et une conclusion la suivre. Un ou deux
  « Pas à pas » par partie au plus ; les autres exemples restent des blocs « Exemple. ».

```
> **Pas à pas.** Résoudre $2x^2-3x+1=0$.
>
> 1. On calcule le discriminant : $\Delta=(-3)^2-4\times2\times1=1$.
> 2. $\Delta>0$ : l'équation a deux solutions réelles.
> 3. $x_1=\dfrac{3-1}{4}=\dfrac12$ et $x_2=\dfrac{3+1}{4}=1$.
>
> Donc $S=\left\{\dfrac12\,;\,1\right\}$.
```

- **Indice** : pour un exercice qui demande une idée (pas pour un calcul direct), un bloc `> **Indice.**`
  placé entre l'énoncé et la solution oriente l'élève sans donner la réponse.

## Mathématiques et sciences

- Formules en LaTeX : `$…$` en ligne, `$$…$$` sur une ligne isolée pour les formules importantes.
  Uniquement la syntaxe KaTeX (pas de `\[ \]`, pas d'environnements `align*` exotiques ; `aligned`,
  `cases`, `pmatrix`, `bmatrix` sont acceptés). Jamais de formule en image ni en Unicode « dessiné ».
- Les tableaux de variation, de signes et de valeurs sont des tableaux Markdown.
- Les unités et les notations suivent les programmes officiels marocains.

## Exercices et solutions

- La partie `## Exercices` (dernière partie du cours) regroupe des exercices gradués, numérotés
  `Exercice 1.1`, `Exercice 1.2`…, chacun dans un bloc `> **Exercice n.m.**`.
- **La solution suit immédiatement son exercice**, dans un bloc `> **Solution de l'exercice n.m.**`. À
  l'affichage ce bloc est replié derrière un bouton « Voir la solution » : l'élève cherche d'abord. Il n'y a
  **pas** de partie « Solutions des exercices » séparée.
- Dans un bloc solution, la ligne du libellé est suivie d'une ligne `>` vide, puis de la correction rédigée
  (démarche complète, pas seulement le résultat). Exemple :

```
> **Exercice 1.1.**
> Calculer $\lim_{x\to 1}\dfrac{x^2-1}{x-1}$.

> **Solution de l'exercice 1.1.**
>
> Pour $x\neq 1$, $\dfrac{x^2-1}{x-1}=x+1$, donc la limite vaut $2$.
```

- Les exercices « non corrigés » du document source reçoivent une solution rédigée.
- **Aucune correction visible directement** : ni réponse, ni résultat final, ni indication de méthode dans
  l'énoncé ou dans le texte qui suit l'exercice. Tout ce qui aide à résoudre est dans un bloc replié
  (`Indice.`, `Solution de l'exercice n.m.`). Il en va de même pour les exercices d'un sujet d'examen et pour
  les questions « Testez-vous » (réponse dans `Réponse.`).

## Schémas explicatifs

Quand une figure aide à comprendre (courbe, repère, droite graduée, triangle, cercle trigonométrique,
diagramme de Venn, schéma de réaction ou de montage, cycle, tableau de signes dessiné, arbre…), insère-la
avec un bloc de code `svg`, juste après le paragraphe qu'elle illustre, suivie d'une légende en italique :

````
```svg
<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg" role="img">
  <title>Courbe d'une fonction continue sur [a ; b]</title>
  …
</svg>
```
*Figure 1.1 — Une fonction continue prend toutes les valeurs entre f(a) et f(b).*
````

Règles : une seule balise `<svg>` autonome avec `viewBox` (largeur 400 à 560) et une balise `<title>` qui
décrit la figure ; formes simples (`line`, `path`, `circle`, `rect`, `polygon`, `text`) ; texte de 13 à
15 px en `font-family="sans-serif"` ; couleurs : traits principaux `#0F766E`, mise en évidence `#D97706`,
axes et repères `#475569`, fond transparent ; **aucun** `script`, `style` externe, `foreignObject`,
image ou lien externe, aucun attribut `on…`. Le texte dans la figure est en français. Une figure
claire et exacte vaut mieux qu'une figure chargée : de 1 à 4 figures par cours selon le sujet, aucune si le
chapitre ne s'y prête pas. Les formules restent en LaTeX dans le texte, pas dans la figure.

## Interdits absolus

Le cours ne doit contenir **aucune** des mentions suivantes, ni rien qui y ressemble :
- le nom d'un site, d'une plateforme ou d'un éditeur source (dont « AlloSchool » sous toute forme) ;
- le nom d'un professeur, d'un auteur, d'un lycée ou d'une académie ; une signature ; un copyright ;
- un numéro de téléphone, une adresse e-mail, un lien, une mention « Premium », « abonnement », « vidéo », « PDF »,
  « télécharger », « séance 1-2-3 », « document », « page » ;
- une année scolaire, une date de séance, un numéro de séance ;
- des commentaires sur le travail de reformulation lui-même (« voici le cours… », « j'ai reformulé… »).

Le cours est publié tel quel sur la plateforme : il commence directement par le titre `#` et se
termine par la dernière solution d'exercice.
