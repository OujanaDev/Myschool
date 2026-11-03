# Déployer Naja7School sur le VPS IONOS

Cible : Ubuntu 24.04, 1 vCore, 2 Go de RAM, domaine `naja7school.com`.
Architecture : Nginx (80/443, certificat Let's Encrypt) → API Node sur 127.0.0.1:4000 (PM2), qui sert aussi le site
construit (`web/dist`). Base SQLite dans `/home/naja7/data/naja7school.db`, sauvegardée chaque nuit.

Tout est dans [deploy/](deploy/) :

| Fichier | Rôle |
|---|---|
| `setup-vps.sh` | Installation initiale (une seule fois, en root) |
| `deploy.sh` | Mise à jour : `git pull`, build, Prisma, redémarrage PM2 |
| `ecosystem.config.cjs` | Processus PM2 `naja7school` |
| `nginx.conf` | Reverse proxy Nginx (`__DOMAIN__` remplacé par le script) |
| `../.github/workflows/deploy.yml` | Déploiement automatique à chaque push sur `main` (optionnel) |

## 1. Pousser le code sur GitHub

```bash
git add -A
git commit -m "Naja7School : logo, déploiement VPS"
git push origin main
```

## 2. DNS chez IONOS

Dans IONOS → Domaines & SSL → `naja7school.com` → DNS :

| Type | Nom | Valeur |
|---|---|---|
| A | @ | IP publique du VPS |
| A | www | IP publique du VPS |

Supprimer les enregistrements A/AAAA par défaut d'IONOS (page de parking) s'il y en a.
La propagation prend de quelques minutes à une heure.

## 3. Se connecter au VPS et installer

Depuis Windows (PowerShell) : `ssh root@IP_DU_VPS` (mot de passe reçu par mail IONOS, ou clé SSH ajoutée à la commande).

```bash
curl -fsSL https://raw.githubusercontent.com/OujanaDev/Myschool/main/deploy/setup-vps.sh -o setup-vps.sh
bash setup-vps.sh
```

Le script (10 à 15 minutes) :

1. met à jour Ubuntu, installe Git, Nginx, Certbot, SQLite, un swap de 2 Go ;
2. installe Node 24 et PM2 ;
3. crée l'utilisateur `naja7` et clone le dépôt dans `/home/naja7/app` ;
4. génère `server/.env` (clé JWT aléatoire, base dans `/home/naja7/data`) ;
5. configure Nginx et le pare-feu (SSH, HTTP, HTTPS uniquement) ;
6. lance `deploy.sh` : `npm run build`, `prisma db push`, démarrage PM2, PM2 au boot ;
7. programme une sauvegarde quotidienne de la base (7 jours gardés dans `/home/naja7/backups`).

Vérifier : `curl -s http://127.0.0.1:4000/api/health` doit répondre `{"ok":true,"name":"Naja7School API",...}`.

**Connexion Google.** Dans `server/.env`, renseigner `GOOGLE_CLIENT_ID` avec l'identifiant client OAuth « Application Web » du projet Google Cloud (console.cloud.google.com → API et services → Identifiants), puis `pm2 restart naja7school`. Dans ce même identifiant, ajouter aux « Origines JavaScript autorisées » `https://naja7school.com` et `https://www.naja7school.com` (et `http://localhost:5173` pour le développement). Le secret client n'est pas utilisé : le site vérifie seulement le jeton d'identité renvoyé par Google. Sans identifiant, le bouton Google est masqué.

**Paiement Stripe.** Dans `server/.env` : `STRIPE_SECRET_KEY` (clé du mode live, ou une clé restreinte autorisant l'écriture des sessions Checkout), `APP_URL=https://naja7school.com`, puis créer un webhook dans Stripe (Développeurs → Webhooks) vers `https://naja7school.com/api/billing/webhook` pour l'événement `checkout.session.completed` et coller son secret dans `STRIPE_WEBHOOK_SECRET`. Redémarrer avec `pm2 restart naja7school`. Les prix (99 DH / mois, 899 DH / an, -50 % jusqu'au 30/12/2026, puis 199 et 1 798 DH) sont dans `server/src/billing.ts`. Les paiements sont ponctuels (1 mois ou 1 an), sans renouvellement automatique.

## 4. HTTPS

Une fois le DNS propagé (`ping naja7school.com` renvoie l'IP du VPS) :

```bash
certbot --nginx -d naja7school.com -d www.naja7school.com --redirect -m votre@email --agree-tos
```

Certbot modifie la config Nginx, force la redirection HTTP → HTTPS et renouvelle le certificat tout seul.
Le site est alors en ligne : https://naja7school.com

## 5. Mettre le contenu en ligne

La base de production démarre vide (pas de `dev.db` dans Git). Deux options :

- **Pipeline** : sur le PC, pointer `MYSCHOOL_API=https://naja7school.com` et un compte admin, puis relancer la
  publication (voir `scraper/README.md`). C'est la voie normale.
- **Copie unique de la base de développement** (plus rapide pour la première mise en ligne, 223 Mo) :

  ```powershell
  scp C:\Myschool\server\prisma\dev.db naja7@IP_DU_VPS:/home/naja7/data/naja7school.db
  ```
  puis sur le VPS : `pm2 restart naja7school`. Les comptes de démonstration (`admin@myschool.ma`…) sont alors
  en production : changer leurs mots de passe ou les supprimer dès la première connexion.

Créer le premier compte admin sans copie : s'inscrire sur le site, puis sur le VPS
`sqlite3 /home/naja7/data/naja7school.db "update User set role='ADMIN' where email='votre@email';"`.

## 6. Mises à jour

À chaque nouvelle version :

```bash
ssh naja7@IP_DU_VPS
bash ~/app/deploy/deploy.sh
```

Ou automatiquement : créer une clé SSH pour `naja7` (`ssh-keygen -t ed25519`, clé publique dans
`/home/naja7/.ssh/authorized_keys`), puis dans GitHub → Settings → Secrets and variables → Actions ajouter
`VPS_HOST` (l'IP) et `VPS_SSH_KEY` (la clé privée). Chaque `git push` sur `main` déploie.

## 7. Exploitation

| Besoin | Commande (utilisateur `naja7`) |
|---|---|
| Logs en direct | `pm2 logs naja7school` |
| État / mémoire | `pm2 status` |
| Redémarrer | `pm2 restart naja7school` |
| Sauvegarde manuelle | `sqlite3 ~/data/naja7school.db ".backup ~/backups/manuel.db"` |
| Récupérer une sauvegarde sur le PC | `scp naja7@IP:/home/naja7/backups/naja7school-2026-11-01.db .` |
| Logs Nginx (root) | `tail -f /var/log/nginx/access.log` |

Mémoire attendue : ~150 Mo pour l'API, ~20 Mo pour Nginx ; le build Vite monte à ~1 Go pendant une minute, d'où
le swap. Si le build échoue par manque de mémoire, construire sur le PC (`npm run build`) et envoyer `web/dist`
avec `scp -r web/dist naja7@IP:/home/naja7/app/web/`.

## Application mobile

L'app Expo doit viser l'API de production : définir `EXPO_PUBLIC_API_URL=https://naja7school.com` (voir
`mobile/README.md`) avant de reconstruire. Le nom affiché est déjà « Naja7School » ; le `slug` et le `scheme`
restent `myschool` pour ne pas casser les liens profonds existants.
