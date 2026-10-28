# Myschool

Plateforme éducative marocaine moderne : cours, exercices, QCM, examens blancs et préparation personnalisée, du primaire aux concours d'accès aux grandes écoles. Disponible sur **Web**, **Android** et **iOS**.

## Architecture

```
Myschool/
├── server/   API REST — Node.js, Express, Prisma, SQLite, JWT (port 4000)
├── web/      Application web élève + administration — React, Vite, Tailwind CSS v4, KaTeX
├── mobile/   Application Android / iOS — Expo (React Native), expo-router
├── scraper/  Récupération de cours depuis le web → dépôt Markdown local → import dans l'admin (scraper/README.md)
└── docs/     Contrat d'API (docs/API.md)
```

- **Un seul backend** sert le web et le mobile. En production, le serveur sert aussi le build web (`web/dist`).
- **Base de données** : SQLite en développement (fichier `server/prisma/dev.db`). Pour la production, changer `provider` dans `server/prisma/schema.prisma` vers PostgreSQL et ajuster `DATABASE_URL`.

## Démarrage rapide

Prérequis : Node.js 22.13+ ou 24 LTS (l’application mobile, en Expo SDK 58, refuse Node 20).

```bash
npm run setup        # installe server + web, crée la base et charge le programme marocain
npm run dev          # lance l'API (4000) et le web (5173) ensemble
```

Ouvrir http://localhost:5173.

Pour l'application mobile :

```bash
npm run setup:mobile
cd mobile && npx expo start     # a = Android, i = iOS, w = web, ou Expo Go
```

Sur un téléphone physique, indiquez l'IP de votre PC : `EXPO_PUBLIC_API_URL=http://192.168.x.x:4000/api` (voir `mobile/README.md`).

### Mode production (un seul processus)

```bash
npm run build        # construit web/dist
npm start            # l'API sert l'application web sur http://localhost:4000
```

## Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| Administrateur | admin@myschool.ma | Admin1234! |
| Élève gratuit (2 Bac PC) | eleve@myschool.ma | Eleve1234! |
| Élève premium (3AC) | premium@myschool.ma | Premium1234! |

`npm run db:reset` remet la base à l'état initial.

## Fonctionnalités

**Élèves**
- Catalogue par cycle → niveau → matière → chapitre (semestres 1 et 2), 30 niveaux du système marocain (primaire, collège, tronc commun, 1ère et 2ème Bac toutes filières, CPGE, concours médecine / ENSA / ENCG).
- Cours en Markdown avec formules LaTeX, vidéos, PDF ; résumés ; séries d'exercices ; examens blancs.
- QCM interactifs chronométrés avec correction détaillée et explications.
- Recherche instantanée (cours, QCM, niveaux, matières) avec filtre par niveau.
- Tableau de bord : progression, score moyen, activité, performance par matière, recommandations (matières à renforcer en priorité).
- **Plan d'étude personnalisé** : programme hebdomadaire généré selon le niveau, les matières choisies, les heures disponibles, la date d'examen et les résultats aux QCM.
- Favoris, suivi des leçons terminées, choix du niveau.
- **Freemium** : contenus gratuits et contenus Premium (résumés, examens corrigés, tests avancés, plan complet). Abonnement mensuel / annuel (paiement simulé, à brancher sur CMI / carte / mobile).

**Administration** (`/admin`)
- Statistiques de la plateforme.
- Gestion des cycles, niveaux (avec filière), matières (icône + couleur) et rattachement matière ↔ niveau.
- Gestion des chapitres par niveau/matière.
- Éditeur de cours (Markdown + LaTeX avec aperçu, type, durée, vidéo, PDF, premium, publication).
- Constructeur de QCM (questions, réponses, bonne réponse, explication, ordre, aperçu).
- Gestion des utilisateurs (rôle, abonnement, mot de passe, suppression).

## Contenu

La structure (cycles, niveaux, matières, intitulés de chapitres) suit les programmes officiels marocains. Tout le contenu pédagogique est original. Des cours détaillés et des QCM sont fournis pour les chapitres phares (2 Bac PC maths et physique, 3AC maths et physique-chimie, 1 Bac maths, tronc commun maths, 6AP maths, français 2 Bac, philosophie 2 Bac, logique concours médecine). Les autres chapitres ont un squelette (cours, série d'exercices, résumé premium) à compléter depuis l'administration.

## API

Voir [docs/API.md](docs/API.md).

## Variables d'environnement (server/.env)

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="changez-moi-en-production"
PORT=4000
# Production
NODE_ENV=production                 # désactive aussi le paiement simulé (SIMULATED_PAYMENTS=true pour le garder)
HOST=127.0.0.1                      # derrière un proxy ou un tunnel Cloudflare (défaut 0.0.0.0)
CORS_ORIGINS=https://votre-domaine.ma   # origines web autorisées, séparées par des virgules (défaut : toutes)
```

La recherche s'appuie sur la table `LessonSearch` (contenu des leçons sans accents ni majuscules), mise à jour à
chaque création ou modification de leçon par l'API et complétée au démarrage du serveur.

## Dépannage

- **Erreur 500 à la connexion (ou sur tout appel `/api`)** : l'API n'est pas démarrée. Le proxy Vite renvoie 500 quand rien n'écoute sur le port 4000. Vérifiez que le terminal affiche `[api] Myschool API prête sur http://localhost:4000` ; sinon arrêtez tout (Ctrl+C) et relancez `npm run dev`. Test direct : http://localhost:4000/api/health.
- Le script `dev` du serveur utilise `node --watch --import tsx` (et non `tsx watch`, qui se bloque au démarrage sous Windows quand sa sortie est redirigée, par exemple via `concurrently`).
- **Port 5173 déjà utilisé** : Vite bascule automatiquement sur 5174 ; utilisez l'URL affichée dans le terminal.
