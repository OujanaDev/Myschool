# Myschool — récupération de cours (scraper)

Outil en ligne de commande qui télécharge des pages de cours depuis le web, en extrait le contenu utile
(texte, titres, images, formules LaTeX), le convertit en Markdown et le range dans un **dépôt local**
(`repository/`) réutilisable ensuite dans Myschool.

```
scraper/
├── sources.json        liste des pages à récupérer (URL + niveau / matière / chapitre / type)
├── repository/         le dépôt : un fichier .md par cours + index.json
│   └── <niveau>/<matière>/<slug>.md
└── src/
    ├── scrape.mjs      télécharge et convertit
    ├── list.mjs        affiche le dépôt
    └── import.mjs      crée les leçons dans Myschool via l'API admin
```

Prérequis : Node.js 20+. Installation : `cd scraper && npm install`.

## 1. Récupérer des cours

Remplir `sources.json` (une entrée par page, les slugs `level` / `subject` sont ceux de Myschool,
par ex. `2bac-pc` / `mathematiques`) puis :

```bash
npm run scrape                       # toutes les entrées de sources.json
npm run scrape -- https://exemple.ma/cours/limites --level 2bac-pc --subject mathematiques --chapter "Limites et continuité"
npm run scrape -- <url> --type EXERCISE --tags "série,corrigé"
npm run scrape -- --force            # re-télécharge les pages déjà présentes
```

Une page déjà présente dans le dépôt est ignorée (sauf `--force`). Chaque fichier Markdown commence
par un en-tête (`title`, `url`, `level`, `subject`, `chapter`, `type`, `tags`, `license`, `fetchedAt`, `words`).

Le script respecte `robots.txt`, espace les requêtes (1,5 s par défaut, `SCRAPER_DELAY_MS`) et réessaie
sur erreur temporaire. Les formules MathJax / MathML / Wikipédia sont converties en `$...$` et `$$...$$`
pour KaTeX. Les sections « Voir aussi », « Références », « Liens externes » sont retirées.

## 1 bis. Sites à PDF : AlloSchool

Sur [AlloSchool](https://www.alloschool.com) les cours ne sont pas en HTML : chaque document est un PDF
(et parfois une vidéo YouTube). L'adaptateur `alloschool` parcourt un cours, télécharge les PDF, en
extrait le texte en Markdown et range le tout dans le dépôt (`repository/<niveau>/<matière>/pdf/*.pdf`
+ un `.md` par document). Le délai de 10 s imposé par le `robots.txt` du site est respecté, comptez
donc ~15 s par document.

Le travail se fait en deux temps, pour pouvoir s'arrêter et reprendre à tout moment :

```bash
# 1. Explorer l'arborescence : catégories (cycles, niveaux, filières) → cours (matières) → chapitres → documents.
#    Résultat dans repository/alloschool/manifest.json. Reprend là où il s'est arrêté (--refresh pour relire).
npm run alloschool -- discover https://www.alloschool.com/category/high-school
npm run alloschool -- status                       # avancement par cours

# 2. Télécharger les documents du manifeste (PDF + texte Markdown), avec filtres.
npm run alloschool -- download                                                  # tout
npm run alloschool -- download --category "2ème Bac.*Physiques" --course "Math"   # un niveau / une matière
npm run alloschool -- download --chapter "Limites" --type COURSE --max 20 --videos
npm run alloschool -- download --no-text                                        # PDF seuls

# Ponctuel : voir le contenu d'un cours sans rien enregistrer.
npm run alloschool -- list <url-cours>
```

Les filtres sont des expressions régulières (insensibles à la casse) sur le chemin de catégorie, le
titre du cours, le chapitre ou le titre du document. `--videos` relève l'URL YouTube des vidéos
gratuites (celles marquées `*` sur le site) ; `--force` re-télécharge ; `download` ignore ce qui est déjà
dans le dépôt, on peut donc le relancer autant de fois que nécessaire.

Rangement : `repository/alloschool/<catégorie…>/<cours>/<chapitre>/<document>-<id>.md` + `.pdf`. Chaque
document garde aussi le niveau / la matière Myschool correspondants (table [alloschool-map.json](alloschool-map.json),
à compléter), ce qui permet ensuite `npm run list -- --level 2bac-pc`.

Ordre de grandeur pour le Lycée complet : ~25 catégories et ~250 cours à explorer (≈ 45 min), puis
plusieurs dizaines de milliers de documents (≈ 15 s chacun) : lancez `download` par niveau ou par
matière, en arrière-plan, et relancez-le pour reprendre.

Limites : les formules mathématiques sont des images dans ces PDF et n'apparaissent donc pas dans le
texte extrait (le PDF conservé reste la référence) ; les PDF scannés donnent un texte vide.

**Ces documents sont « © AlloSchool — Tous droits réservés »** : ils sont stockés pour référence
(`rights: "reserved"` dans l'en-tête) et `npm run import` les refuse, sauf `--allow-reserved`.

## 1 ter. Reformuler en cours Myschool originaux

`npm run reformulate` transforme le texte brut des documents téléchargés en cours **originaux**, rédigés
par Claude au format de [style/format-cours.md](style/format-cours.md) (sommaire, parties numérotées,
définitions surlignées en jaune, blocs théorème / méthode / exemple / remarque, exercices corrigés), sur
le modèle du polycopié [style/reference-elements-de-logique.md](style/reference-elements-de-logique.md).
Ils sont rangés dans `repository/final/<niveau>/<matière>/<chapitre>/` avec `rights: "original"`.

Par défaut le script passe par la CLI Claude Code installée sur le PC (`claude -p`), avec votre connexion
Claude Code : **aucune clé API n'est nécessaire**, l'utilisation est décomptée de votre abonnement. Si la limite
d'utilisation est atteinte, le script s'arrête proprement ; relancez-le plus tard, il reprend où il en était.
`--engine api` utilise à la place l'API Anthropic (`ANTHROPIC_API_KEY` requis). `--model sonnet` est plus rapide.

```bash
npm run reformulate -- --level 2bac-pc --subject mathematiques --dry-run     # sélection + coût estimé
npm run reformulate -- --level 2bac-pc --subject mathematiques --max 10
npm run reformulate -- --level 2bac-pc --type COURSE,SUMMARY,EXERCISE --concurrency 3
npm run import -- --password 'Admin1234!' --site final --level 2bac-pc      # vers la plateforme (brouillons)
npm run import -- --password 'Admin1234!' --site final --publish            # publiés directement
```

Garanties : le modèle reçoit l'interdiction de citer la source, un professeur, un téléphone, une séance… et
chaque cours produit est **vérifié** (motifs interdits + noms détectés dans la source) ; un cours qui
échoue à la vérification n'est pas enregistré. Les documents trop courts ou dont le texte extrait est
illisible (PDF scannés) sont ignorés. Par défaut seules les sources en français (`--source-lang fr`)
sont traitées et le cours est rédigé en français (`--lang fr`, `--lang auto` conserve la langue source).

Coût indicatif (Claude Opus 5.5) : 0,05 à 0,15 $ par cours selon sa longueur ; `--dry-run` l'estime.

AlloSchool publie souvent le même document dans plusieurs filières (l'anglais ou les maths de PC, SVT, STE…) : un
document dont le texte est identique à un document déjà reformulé reçoit une copie de ce cours, rangée dans son
niveau, sans appel au modèle (`reusedFrom` dans l'index).

`bash run-all.sh [options de reformulate]` enchaîne tout (`MYSCHOOL_ADMIN_PASSWORD` requis) : lots de reformulation,
publication, titres numérotés (`number-titles.mjs`), labos interactifs (`labs.mjs`), QCM des nouveaux chapitres
(`qcm.mjs`). Tant qu'un `alloschool download` tourne, il attend ses nouveaux documents au lieu de s'arrêter.

## 1 quater. Titres numérotés et labos interactifs

`node src/number-titles.mjs --password …` donne aux cours reformulés des titres courts, chapitre par chapitre :
« <chapitre> cours n », « <chapitre> cours n – partie m » pour les parties d'un même long document,
« <chapitre> résumé n ». Le titre détaillé devient un sous-titre en italique dans le cours. Sans appel au modèle.

`node src/labs.mjs [--level …] [--subject …] [--max n]` ajoute aux cours de physique-chimie, SVT et mathématiques
1 ou 2 labos (blocs ` ```lab `) sur les notions les plus importantes et les plus difficiles, choisis et réglés par
Claude d'après [style/labos.md](style/labos.md) : courbes à curseurs (fonctions, tangente, intégrale, suites,
lois physiques, trajectoires), échiquier de croisement génétique, onde sur une corde. Chaque labo est vérifié par
le code du site (`web/src/components/labs/check.js`) avant d'être inséré ; les copies d'un cours dans d'autres
filières reçoivent les mêmes labos. `import --changed` publie ensuite les cours modifiés.

## 2. Consulter le dépôt

```bash
npm run list
npm run list -- --level 3ac --subject mathematiques
npm run list -- --json
```

## 3. Importer dans Myschool

L'API doit tourner (`npm run dev` à la racine). Les leçons sont créées **en brouillon** (non publiées)
dans le chapitre indiqué, créé s'il n'existe pas, avec une ligne d'attribution de la source en tête.
Relisez-les dans `/admin/cours` avant de les publier.

```bash
npm run import -- --password 'Admin1234!' --dry-run     # simulation
npm run import -- --password 'Admin1234!'               # tout le dépôt
npm run import -- --password 'Admin1234!' --only <id|slug|url>
npm run import -- --password 'Admin1234!' --level 2bac-pc --publish
```

Variables d'environnement : `MYSCHOOL_API` (défaut `http://localhost:4000/api`), `MYSCHOOL_ADMIN_EMAIL`,
`MYSCHOOL_ADMIN_PASSWORD`. Un cours déjà importé est ignoré (son `importedLessonId` est mémorisé dans
`index.json`) ; `--force` crée une nouvelle leçon.

Un chapitre est retrouvé même écrit autrement (« Arithmétique dans IN » = « Arithmétique dans N » : article,
« Unité 1 : », ℕ / IN / N, voir `chapterKey` dans `src/util.mjs`). Pour ranger les chapitres déjà créés :

```bash
node src/clean-chapters.mjs --password 'Admin1234!'          # simulation
node src/clean-chapters.mjs --password 'Admin1234!' --apply  # fusionne les doublons, dépublie les leçons de départ
```

## Droits d'auteur

Le scraper ne vérifie pas la licence des pages. N'importez que des contenus que vous avez le droit de
réutiliser (licence libre comme CC BY-SA, autorisation de l'auteur, ou vos propres ressources) et
conservez l'attribution ajoutée en tête de leçon. Le champ `license` de l'en-tête reprend la licence
déclarée par la page quand elle existe.
