// Structure du système éducatif marocain : cycles, niveaux, matières et chapitres.
// Les intitulés de chapitres suivent les programmes officiels ; le contenu pédagogique est original.

export const cycles = [
  { slug: "primaire", name: "Primaire", description: "De la 1ère à la 6ème année du primaire", order: 1 },
  { slug: "college", name: "Collège", description: "1ère, 2ème et 3ème année du collège (brevet)", order: 2 },
  { slug: "lycee", name: "Lycée", description: "Tronc commun, 1ère et 2ème année du baccalauréat", order: 3 },
  { slug: "superieur", name: "Supérieur & Concours", description: "CPGE, concours d'accès aux grandes écoles et facultés", order: 4 },
];

export const subjects = [
  { slug: "mathematiques", name: "Mathématiques", icon: "sigma", color: "#2563EB" },
  { slug: "physique-chimie", name: "Physique-Chimie", icon: "atom", color: "#7C3AED" },
  { slug: "svt", name: "Sciences de la Vie et de la Terre", icon: "leaf", color: "#16A34A" },
  { slug: "francais", name: "Français", icon: "book-open", color: "#DC2626" },
  { slug: "arabe", name: "Arabe", icon: "languages", color: "#B45309" },
  { slug: "anglais", name: "Anglais", icon: "globe", color: "#0891B2" },
  { slug: "philosophie", name: "Philosophie", icon: "brain", color: "#4B5563" },
  { slug: "histoire-geographie", name: "Histoire-Géographie", icon: "map", color: "#CA8A04" },
  { slug: "education-islamique", name: "Éducation Islamique", icon: "moon", color: "#059669" },
  { slug: "informatique", name: "Informatique", icon: "code", color: "#0F766E" },
  { slug: "sciences-ingenieur", name: "Sciences de l'Ingénieur", icon: "cog", color: "#475569" },
  { slug: "economie-gestion", name: "Économie et Gestion", icon: "trending-up", color: "#EA580C" },
  { slug: "comptabilite", name: "Comptabilité", icon: "calculator", color: "#9333EA" },
  { slug: "eveil-scientifique", name: "Éveil scientifique", icon: "flask", color: "#10B981" },
  { slug: "culture-generale", name: "Culture générale", icon: "lightbulb", color: "#F59E0B" },
  { slug: "logique", name: "Logique & Raisonnement", icon: "puzzle", color: "#6366F1" },
];

const PRIMAIRE_BASE = ["arabe", "francais", "mathematiques", "education-islamique"];
const PRIMAIRE_PLUS = [...PRIMAIRE_BASE, "eveil-scientifique", "anglais"];
const COLLEGE = ["mathematiques", "physique-chimie", "svt", "francais", "arabe", "anglais", "histoire-geographie", "education-islamique", "informatique"];
const TC_SC = ["mathematiques", "physique-chimie", "svt", "francais", "arabe", "anglais", "histoire-geographie", "education-islamique", "informatique"];
const TC_LET = ["arabe", "francais", "anglais", "histoire-geographie", "education-islamique", "mathematiques", "svt", "informatique"];
const BAC_SC = ["mathematiques", "physique-chimie", "svt", "francais", "anglais", "philosophie", "arabe", "education-islamique", "histoire-geographie"];
const BAC_SM = ["mathematiques", "physique-chimie", "svt", "sciences-ingenieur", "francais", "anglais", "philosophie", "arabe", "education-islamique"];
const BAC_LET = ["arabe", "francais", "anglais", "philosophie", "histoire-geographie", "education-islamique", "mathematiques"];
const BAC_ECO = ["economie-gestion", "comptabilite", "mathematiques", "francais", "anglais", "philosophie", "histoire-geographie", "arabe"];

export type LevelDef = { cycle: string; slug: string; name: string; shortName: string; track: string; order: number; description: string; subjects: string[] };

export const levels: LevelDef[] = [
  // Primaire
  ...[1, 2, 3, 4, 5, 6].map((n) => ({
    cycle: "primaire",
    slug: `${n}ap`,
    name: `${n === 1 ? "1ère" : n + "ème"} année primaire`,
    shortName: `${n}AP`,
    track: "",
    order: n,
    description: `Programme officiel de la ${n === 1 ? "1ère" : n + "ème"} année du primaire.`,
    subjects: n >= 4 ? PRIMAIRE_PLUS : n >= 3 ? [...PRIMAIRE_BASE, "eveil-scientifique"] : PRIMAIRE_BASE,
  })),
  // Collège
  { cycle: "college", slug: "1ac", name: "1ère année collège", shortName: "1AC", track: "", order: 1, description: "Première année du cycle secondaire collégial.", subjects: COLLEGE },
  { cycle: "college", slug: "2ac", name: "2ème année collège", shortName: "2AC", track: "", order: 2, description: "Deuxième année du cycle secondaire collégial.", subjects: COLLEGE },
  { cycle: "college", slug: "3ac", name: "3ème année collège", shortName: "3AC", track: "", order: 3, description: "Année du brevet (examen régional normalisé).", subjects: COLLEGE },
  // Lycée
  { cycle: "lycee", slug: "tc-sciences", name: "Tronc commun Sciences", shortName: "TC S", track: "Tronc commun", order: 1, description: "Première année du lycée, filière scientifique.", subjects: TC_SC },
  { cycle: "lycee", slug: "tc-lettres", name: "Tronc commun Lettres et Sciences Humaines", shortName: "TC L", track: "Tronc commun", order: 2, description: "Première année du lycée, filière littéraire.", subjects: TC_LET },
  { cycle: "lycee", slug: "tc-technologique", name: "Tronc commun Technologique", shortName: "TC T", track: "Tronc commun", order: 3, description: "Première année du lycée, filière technologique.", subjects: ["mathematiques", "physique-chimie", "sciences-ingenieur", "francais", "arabe", "anglais", "education-islamique", "informatique"] },
  { cycle: "lycee", slug: "1bac-sm", name: "1ère Bac Sciences Mathématiques", shortName: "1 Bac SM", track: "1ère année Bac", order: 4, description: "Première année du baccalauréat, sciences mathématiques.", subjects: BAC_SM },
  { cycle: "lycee", slug: "1bac-sex", name: "1ère Bac Sciences Expérimentales", shortName: "1 Bac SEx", track: "1ère année Bac", order: 5, description: "Première année du baccalauréat, sciences expérimentales.", subjects: BAC_SC },
  { cycle: "lycee", slug: "1bac-lettres", name: "1ère Bac Lettres et Sciences Humaines", shortName: "1 Bac L", track: "1ère année Bac", order: 6, description: "Première année du baccalauréat, lettres et sciences humaines (examen régional).", subjects: BAC_LET },
  { cycle: "lycee", slug: "1bac-eco", name: "1ère Bac Sciences Économiques et Gestion", shortName: "1 Bac Eco", track: "1ère année Bac", order: 7, description: "Première année du baccalauréat, sciences économiques et gestion.", subjects: BAC_ECO },
  { cycle: "lycee", slug: "2bac-sm-a", name: "2ème Bac Sciences Mathématiques A", shortName: "2 Bac SM A", track: "2ème année Bac", order: 8, description: "Année de l'examen national, sciences mathématiques A.", subjects: BAC_SM },
  { cycle: "lycee", slug: "2bac-sm-b", name: "2ème Bac Sciences Mathématiques B", shortName: "2 Bac SM B", track: "2ème année Bac", order: 9, description: "Année de l'examen national, sciences mathématiques B (sciences de l'ingénieur).", subjects: BAC_SM },
  { cycle: "lycee", slug: "2bac-pc", name: "2ème Bac Sciences Physiques", shortName: "2 Bac PC", track: "2ème année Bac", order: 10, description: "Année de l'examen national, option physique-chimie.", subjects: BAC_SC },
  { cycle: "lycee", slug: "2bac-svt", name: "2ème Bac Sciences de la Vie et de la Terre", shortName: "2 Bac SVT", track: "2ème année Bac", order: 11, description: "Année de l'examen national, option SVT.", subjects: BAC_SC },
  { cycle: "lycee", slug: "2bac-lettres", name: "2ème Bac Lettres", shortName: "2 Bac L", track: "2ème année Bac", order: 12, description: "Année de l'examen national, filière lettres.", subjects: BAC_LET },
  { cycle: "lycee", slug: "2bac-sh", name: "2ème Bac Sciences Humaines", shortName: "2 Bac SH", track: "2ème année Bac", order: 13, description: "Année de l'examen national, filière sciences humaines.", subjects: BAC_LET },
  { cycle: "lycee", slug: "2bac-eco", name: "2ème Bac Sciences Économiques", shortName: "2 Bac Eco", track: "2ème année Bac", order: 14, description: "Année de l'examen national, sciences économiques.", subjects: BAC_ECO },
  { cycle: "lycee", slug: "2bac-sgc", name: "2ème Bac Sciences de Gestion Comptable", shortName: "2 Bac SGC", track: "2ème année Bac", order: 15, description: "Année de l'examen national, gestion comptable.", subjects: BAC_ECO },
  // Supérieur & concours
  { cycle: "superieur", slug: "cpge-mpsi", name: "CPGE MPSI / MP", shortName: "MPSI", track: "Classes préparatoires", order: 1, description: "Classes préparatoires mathématiques, physique et sciences de l'ingénieur.", subjects: ["mathematiques", "physique-chimie", "sciences-ingenieur", "informatique", "francais", "anglais"] },
  { cycle: "superieur", slug: "cpge-pcsi", name: "CPGE PCSI / PSI", shortName: "PCSI", track: "Classes préparatoires", order: 2, description: "Classes préparatoires physique, chimie et sciences de l'ingénieur.", subjects: ["mathematiques", "physique-chimie", "sciences-ingenieur", "informatique", "francais", "anglais"] },
  { cycle: "superieur", slug: "cpge-ecs", name: "CPGE ECS / ECT", shortName: "ECS", track: "Classes préparatoires", order: 3, description: "Classes préparatoires économiques et commerciales.", subjects: ["mathematiques", "economie-gestion", "culture-generale", "francais", "anglais", "histoire-geographie"] },
  { cycle: "superieur", slug: "concours-medecine", name: "Concours Médecine, Pharmacie & Dentaire", shortName: "Médecine", track: "Concours", order: 4, description: "Préparation au concours d'accès aux facultés de médecine, pharmacie et médecine dentaire.", subjects: ["mathematiques", "physique-chimie", "svt", "logique", "culture-generale"] },
  { cycle: "superieur", slug: "concours-ensa", name: "Concours ENSA / ENSAM", shortName: "ENSA", track: "Concours", order: 5, description: "Préparation aux concours d'accès aux écoles nationales des sciences appliquées.", subjects: ["mathematiques", "physique-chimie", "logique"] },
  { cycle: "superieur", slug: "concours-encg", name: "Concours ENCG (TAFEM)", shortName: "ENCG", track: "Concours", order: 6, description: "Préparation au test d'admissibilité à la formation en management.", subjects: ["logique", "culture-generale", "francais", "anglais", "mathematiques"] },
];

type Ch = { s: 1 | 2; t: string };
const ch = (s: 1 | 2, ...titles: string[]): Ch[] => titles.map((t) => ({ s, t }));

// Chapitres par "niveau/matière"
export const chapters: Record<string, Ch[]> = {
  // ---- Primaire ----
  "6ap/mathematiques": [
    ...ch(1, "Les grands nombres entiers", "Addition, soustraction et multiplication", "La division euclidienne", "Les fractions", "Les nombres décimaux", "Les droites parallèles et perpendiculaires"),
    ...ch(2, "La proportionnalité", "Les pourcentages", "Périmètres et aires", "Les solides et les volumes", "Les mesures de durée", "Lecture de graphiques"),
  ],
  "6ap/francais": [...ch(1, "Le récit", "Le texte descriptif", "Les types de phrases", "Le présent et le passé composé"), ...ch(2, "L'imparfait et le futur", "Les accords dans le groupe nominal", "Le dialogue", "Le texte explicatif")],
  "6ap/eveil-scientifique": [...ch(1, "L'alimentation et la digestion", "La respiration", "L'eau dans la nature"), ...ch(2, "L'électricité", "Les mouvements de la Terre", "Les énergies")],
  "5ap/mathematiques": [...ch(1, "Les nombres jusqu'aux millions", "Les opérations", "Les fractions simples", "Les droites et les angles"), ...ch(2, "Les nombres décimaux", "Périmètres", "Aires", "Les unités de mesure")],
  "4ap/mathematiques": [...ch(1, "Les nombres jusqu'à 10 000", "Addition et soustraction", "La multiplication", "Les figures géométriques"), ...ch(2, "La division", "Les fractions", "Les longueurs et les masses", "Le temps et les durées")],
  "3ap/mathematiques": [...ch(1, "Les nombres jusqu'à 999", "Addition et soustraction", "Les lignes et les figures"), ...ch(2, "La multiplication", "Les mesures", "Repérage et déplacement")],
  "2ap/mathematiques": [...ch(1, "Les nombres jusqu'à 99", "Addition", "Formes géométriques"), ...ch(2, "Soustraction", "Les mesures de longueur", "L'heure")],
  "1ap/mathematiques": [...ch(1, "Les nombres de 0 à 9", "Comparer et ranger", "Formes et couleurs"), ...ch(2, "Les nombres jusqu'à 20", "Additionner", "Repérage dans l'espace")],

  // ---- Collège ----
  "1ac/mathematiques": [
    ...ch(1, "Les nombres entiers et décimaux", "Les fractions", "Les nombres relatifs", "Droites, segments et angles", "Symétrie centrale"),
    ...ch(2, "Le calcul littéral", "Équations du premier degré", "La proportionnalité", "Triangles et quadrilatères", "Aires et périmètres", "Parallélépipède rectangle"),
  ],
  "2ac/mathematiques": [
    ...ch(1, "Les nombres rationnels", "Puissances", "Calcul littéral et développement", "Symétrie axiale et centrale", "Triangle rectangle et cercle"),
    ...ch(2, "Équations et inéquations", "Droite des milieux et parallèles", "Le théorème de Pythagore", "Proportionnalité et fonctions linéaires", "Statistiques", "Pyramide et cône"),
  ],
  "3ac/mathematiques": [
    ...ch(1, "Théorème de Pythagore et cosinus d'un angle aigu", "Puissances", "Racine carrée", "Calcul littéral et identités remarquables", "Ordre et opérations", "Théorème de Thalès", "Trigonométrie dans le triangle rectangle"),
    ...ch(2, "Équations et inéquations du premier degré", "Angle inscrit et angle au centre", "Vecteurs et translation", "Repère dans le plan", "Équation d'une droite", "Systèmes de deux équations", "Statistiques", "Géométrie dans l'espace"),
  ],
  "3ac/physique-chimie": [
    ...ch(1, "Les matériaux au quotidien", "Atomes et ions", "Oxydation des métaux", "Réactions acide-base"),
    ...ch(2, "Tests de reconnaissance des ions", "Le mouvement et la vitesse", "Poids et masse", "Le courant électrique alternatif", "Puissance et énergie électriques"),
  ],
  "3ac/svt": [...ch(1, "La nutrition chez l'Homme", "La respiration et la circulation", "L'excrétion urinaire"), ...ch(2, "Le système nerveux", "La reproduction humaine", "L'hérédité", "Les maladies et l'immunité")],
  "3ac/francais": [...ch(1, "Le roman : Le Père Goriot (extraits adaptés)", "La nouvelle", "Grammaire : les propositions subordonnées"), ...ch(2, "La lettre et le récit de vie", "La poésie", "Le texte argumentatif")],
  "1ac/physique-chimie": [...ch(1, "L'eau et ses états", "Mélanges et corps purs", "La pression"), ...ch(2, "Le circuit électrique", "Conducteurs et isolants", "Lumière et propagation")],
  "2ac/physique-chimie": [...ch(1, "L'air et la combustion", "Les molécules et les atomes", "La masse volumique"), ...ch(2, "Loi d'Ohm et résistance", "Lentilles et images", "Le mouvement")],

  // ---- Tronc commun ----
  "tc-sciences/mathematiques": [
    ...ch(1, "Les ensembles de nombres", "Arithmétique dans N", "Calcul vectoriel dans le plan", "La projection dans le plan", "Ordre dans R", "La droite dans le plan", "Polynômes"),
    ...ch(2, "Équations, inéquations et systèmes", "Trigonométrie 1", "Trigonométrie 2", "Généralités sur les fonctions", "Transformations du plan", "Produit scalaire", "Géométrie dans l'espace", "Statistiques"),
  ],
  "tc-sciences/physique-chimie": [
    ...ch(1, "La gravitation universelle", "Exemples d'actions mécaniques", "Le mouvement", "Principe d'inertie", "Équilibre d'un solide", "Espèces chimiques et extraction"),
    ...ch(2, "Le courant électrique continu", "Tension et loi d'Ohm", "Le modèle de l'atome", "Géométrie des molécules", "Classification périodique", "La mole et la quantité de matière", "Concentration molaire"),
  ],
  "tc-sciences/svt": [...ch(1, "Techniques d'exploration du milieu", "Les facteurs écologiques", "Les écosystèmes"), ...ch(2, "La reproduction chez les plantes", "Les hormones végétales", "Les cycles biogéochimiques")],
  "tc-sciences/informatique": [...ch(1, "Système d'exploitation et réseaux", "Traitement de texte"), ...ch(2, "Tableur", "Introduction aux algorithmes")],
  "tc-lettres/francais": [...ch(1, "Typologie textuelle", "La nouvelle réaliste", "Le roman autobiographique"), ...ch(2, "Le théâtre classique", "La poésie lyrique", "Le texte argumentatif")],

  // ---- 1ère Bac ----
  "1bac-sex/mathematiques": [
    ...ch(1, "Notions de logique", "Généralités sur les fonctions", "Le barycentre dans le plan", "Analytique du produit scalaire", "Suites numériques", "Calcul trigonométrique"),
    ...ch(2, "Limites d'une fonction", "Dérivation", "Étude des fonctions", "Produit vectoriel", "Géométrie dans l'espace", "Dénombrement", "La rotation"),
  ],
  "1bac-sm/mathematiques": [
    ...ch(1, "Notions de logique", "Ensembles et applications", "Généralités sur les fonctions", "Suites numériques", "Le barycentre", "Produit scalaire dans le plan", "Calcul trigonométrique"),
    ...ch(2, "Limites et continuité", "Dérivation et étude de fonctions", "Arithmétique dans Z", "Structures algébriques", "Produit vectoriel et géométrie dans l'espace", "Dénombrement", "Rotation et nombres complexes (introduction)"),
  ],
  "1bac-sex/physique-chimie": [
    ...ch(1, "Travail et puissance d'une force", "Théorème de l'énergie cinétique", "Énergie potentielle et mécanique", "Énergie thermique et transferts", "Mesure de quantités de matière", "Réactions acido-basiques"),
    ...ch(2, "Champ magnétique", "Loi de Laplace", "Le champ électrostatique", "Énergie électrique reçue par un dipôle", "Réactions d'oxydoréduction", "Chimie organique : les alcanes", "Les composés oxygénés"),
  ],
  "1bac-sex/svt": [...ch(1, "Les phénomènes géologiques externes", "Les roches sédimentaires", "La réalisation de la carte géologique"), ...ch(2, "La respiration et la fermentation", "La photosynthèse", "Les réserves énergétiques", "Le flux de la matière et de l'énergie")],
  "1bac-sex/francais": [...ch(1, "Le Dernier Jour d'un condamné (Victor Hugo)", "La Boîte à merveilles (Ahmed Sefrioui)"), ...ch(2, "Antigone (Jean Anouilh)", "Production écrite : le texte argumentatif", "Méthodologie de l'examen régional")],
  "1bac-sm/francais": [...ch(1, "Le Dernier Jour d'un condamné (Victor Hugo)", "La Boîte à merveilles (Ahmed Sefrioui)"), ...ch(2, "Antigone (Jean Anouilh)", "Production écrite : le texte argumentatif", "Méthodologie de l'examen régional")],
  "1bac-lettres/francais": [...ch(1, "Le Dernier Jour d'un condamné (Victor Hugo)", "La Boîte à merveilles (Ahmed Sefrioui)"), ...ch(2, "Antigone (Jean Anouilh)", "Production écrite : le texte argumentatif", "Méthodologie de l'examen régional")],
  "1bac-sex/philosophie": [...ch(1, "Naissance de la philosophie", "La philosophie et la cité", "Nature et culture"), ...ch(2, "La conscience et l'inconscient", "Le langage", "Le désir et la raison")],
  "1bac-sex/anglais": [...ch(1, "Unit 1: Education for all", "Unit 2: Health and wellbeing", "Unit 3: Volunteering", "Unit 4: Environment"), ...ch(2, "Unit 5: Science and technology", "Unit 6: Cultural values", "Unit 7: Media", "Grammar review and exam practice")],

  // ---- 2ème Bac ----
  "2bac-pc/mathematiques": [
    ...ch(1, "Limites et continuité", "Dérivation et étude des fonctions", "Suites numériques", "Fonctions logarithmiques", "Fonctions exponentielles", "Nombres complexes (partie 1)"),
    ...ch(2, "Calcul intégral", "Équations différentielles", "Nombres complexes (partie 2)", "Fonctions primitives", "Probabilités", "Géométrie dans l'espace"),
  ],
  "2bac-svt/mathematiques": [
    ...ch(1, "Limites et continuité", "Dérivation et étude des fonctions", "Suites numériques", "Fonctions logarithmiques", "Fonctions exponentielles", "Nombres complexes (partie 1)"),
    ...ch(2, "Calcul intégral", "Équations différentielles", "Nombres complexes (partie 2)", "Fonctions primitives", "Probabilités", "Géométrie dans l'espace"),
  ],
  "2bac-sm-a/mathematiques": [
    ...ch(1, "Limites et continuité", "Dérivabilité et étude des fonctions", "Suites numériques", "Fonctions logarithmiques", "Fonctions exponentielles", "Nombres complexes", "Arithmétique : divisibilité et congruences"),
    ...ch(2, "Structures algébriques", "Calcul intégral", "Équations différentielles", "Espaces vectoriels", "Probabilités", "Géométrie dans l'espace"),
  ],
  "2bac-pc/physique-chimie": [
    ...ch(1, "Ondes mécaniques progressives", "Ondes mécaniques progressives périodiques", "Propagation d'une onde lumineuse", "Décroissance radioactive", "Noyaux, masse et énergie", "Le dipôle RC", "Le dipôle RL", "Oscillations libres dans un circuit RLC", "Transformations lentes et rapides", "Suivi temporel d'une transformation", "Transformations non totales", "État d'équilibre d'un système chimique"),
    ...ch(2, "Transformations liées à des réactions acide-base", "Évolution spontanée d'un système chimique", "Piles et électrolyse", "Estérification et hydrolyse", "Lois de Newton", "Chute libre verticale", "Mouvements plans", "Mouvement des satellites et des planètes", "Systèmes mécaniques oscillants", "Aspects énergétiques des oscillations", "Atome et mécanique de Newton"),
  ],
  "2bac-svt/physique-chimie": [
    ...ch(1, "Ondes mécaniques progressives", "Ondes mécaniques progressives périodiques", "Propagation d'une onde lumineuse", "Décroissance radioactive", "Noyaux, masse et énergie", "Le dipôle RC", "Le dipôle RL", "Oscillations libres dans un circuit RLC", "Transformations lentes et rapides", "Suivi temporel d'une transformation"),
    ...ch(2, "Transformations non totales", "État d'équilibre d'un système chimique", "Transformations liées à des réactions acide-base", "Piles et électrolyse", "Estérification et hydrolyse", "Lois de Newton", "Chute libre verticale", "Mouvements plans", "Systèmes mécaniques oscillants"),
  ],
  "2bac-svt/svt": [
    ...ch(1, "Consommation de la matière organique et flux d'énergie", "Nature de l'information génétique", "Expression de l'information génétique", "Transmission de l'information génétique", "Génétique humaine"),
    ...ch(2, "Génétique des populations", "Immunologie : le soi et le non-soi", "Immunologie : réponses immunitaires", "Les phénomènes géologiques accompagnant la formation des chaînes de montagnes", "Le métamorphisme et la granitisation"),
  ],
  "2bac-pc/svt": [...ch(1, "Consommation de la matière organique et flux d'énergie", "Nature de l'information génétique", "Expression de l'information génétique"), ...ch(2, "Transmission de l'information génétique", "Génétique humaine", "Génétique des populations")],
  "2bac-pc/francais": [...ch(1, "Candide (Voltaire)", "Il était une fois un vieux couple heureux (Mohammed Khaïr-Eddine)"), ...ch(2, "Le Père Goriot (Honoré de Balzac)", "Production écrite", "Méthodologie de l'examen national")],
  "2bac-svt/francais": [...ch(1, "Candide (Voltaire)", "Il était une fois un vieux couple heureux (Mohammed Khaïr-Eddine)"), ...ch(2, "Le Père Goriot (Honoré de Balzac)", "Production écrite", "Méthodologie de l'examen national")],
  "2bac-lettres/francais": [...ch(1, "Candide (Voltaire)", "Il était une fois un vieux couple heureux (Mohammed Khaïr-Eddine)"), ...ch(2, "Le Père Goriot (Honoré de Balzac)", "Production écrite", "Méthodologie de l'examen national")],
  "2bac-pc/philosophie": [...ch(1, "La condition humaine : la personne", "La condition humaine : autrui", "La connaissance : la théorie et l'expérience", "La connaissance : la vérité"), ...ch(2, "La politique : l'État", "La politique : la violence", "La politique : le droit et la justice", "L'éthique : la liberté", "L'éthique : le devoir", "L'éthique : le bonheur")],
  "2bac-svt/philosophie": [...ch(1, "La condition humaine : la personne", "La condition humaine : autrui", "La connaissance : la théorie et l'expérience", "La connaissance : la vérité"), ...ch(2, "La politique : l'État", "La politique : la violence", "La politique : le droit et la justice", "L'éthique : la liberté", "L'éthique : le devoir", "L'éthique : le bonheur")],
  "2bac-lettres/philosophie": [...ch(1, "La condition humaine : la personne", "La condition humaine : autrui", "La connaissance : la théorie et l'expérience", "La connaissance : la vérité"), ...ch(2, "La politique : l'État", "La politique : la violence", "La politique : le droit et la justice", "L'éthique : la liberté", "L'éthique : le devoir", "L'éthique : le bonheur")],
  "2bac-pc/anglais": [...ch(1, "Unit 1: Gifts of youth", "Unit 2: Humour", "Unit 3: Education", "Unit 4: Sustainable development", "Unit 5: Women and power"), ...ch(2, "Unit 6: Cultural issues and values", "Unit 7: Citizenship", "Unit 8: Brain drain", "Unit 9: Advances in science and technology", "Unit 10: International organisations", "Exam practice: writing and functions")],
  "2bac-svt/anglais": [...ch(1, "Unit 1: Gifts of youth", "Unit 2: Humour", "Unit 3: Education", "Unit 4: Sustainable development", "Unit 5: Women and power"), ...ch(2, "Unit 6: Cultural issues and values", "Unit 7: Citizenship", "Unit 8: Brain drain", "Unit 9: Advances in science and technology", "Unit 10: International organisations", "Exam practice: writing and functions")],
  "2bac-lettres/histoire-geographie": [...ch(1, "Le monde au début du XXe siècle", "La Première Guerre mondiale", "La crise de 1929", "La Seconde Guerre mondiale", "Géographie : les grandes puissances (États-Unis)"), ...ch(2, "La décolonisation", "Le Maroc : lutte pour l'indépendance", "Le système mondial actuel", "Géographie : l'Union européenne", "Géographie : le Maroc et les défis du développement")],
  "2bac-eco/economie-gestion": [...ch(1, "Les concepts économiques de base", "Le marché", "La monnaie et le financement", "La comptabilité nationale"), ...ch(2, "Les politiques économiques", "Le commerce extérieur", "Le développement et la mondialisation", "Étude de documents économiques")],
  "2bac-sgc/comptabilite": [...ch(1, "Les travaux d'inventaire : amortissements", "Les provisions", "Régularisation des comptes"), ...ch(2, "Les états de synthèse", "Analyse du bilan", "Analyse de l'exploitation")],

  // ---- Supérieur / concours ----
  "concours-medecine/logique": [...ch(1, "Raisonnement logique", "Suites et séries de figures", "Problèmes de dénombrement rapide"), ...ch(2, "Compréhension et rapidité de calcul", "Tests blancs chronométrés")],
  "concours-medecine/mathematiques": [...ch(1, "Fonctions et limites", "Suites numériques", "Calcul intégral"), ...ch(2, "Probabilités", "Nombres complexes", "QCM d'entraînement type concours")],
  "concours-medecine/physique-chimie": [...ch(1, "Mécanique", "Électricité", "Ondes"), ...ch(2, "Chimie des solutions", "Cinétique chimique", "QCM d'entraînement type concours")],
  "concours-medecine/svt": [...ch(1, "Génétique", "Immunologie"), ...ch(2, "Physiologie", "QCM d'entraînement type concours")],
  "concours-ensa/mathematiques": [...ch(1, "Analyse : fonctions et suites", "Nombres complexes"), ...ch(2, "Calcul intégral", "Probabilités", "Sujets types")],
  "concours-encg/logique": [...ch(1, "Logique numérique", "Logique verbale", "Séries et matrices"), ...ch(2, "Tests blancs TAFEM")],
  "concours-encg/culture-generale": [...ch(1, "Institutions du Maroc", "Économie et société"), ...ch(2, "Actualité internationale", "Tests blancs")],
  "cpge-mpsi/mathematiques": [...ch(1, "Raisonnement et vocabulaire ensembliste", "Nombres complexes", "Fonctions usuelles", "Équations différentielles linéaires", "Suites numériques"), ...ch(2, "Espaces vectoriels", "Matrices", "Polynômes", "Intégration", "Séries numériques")],
};
