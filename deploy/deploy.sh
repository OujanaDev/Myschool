#!/usr/bin/env bash
# Déploie la dernière version : git pull, install, build du web, Prisma, redémarrage PM2 sans coupure.
# À lancer en tant que `naja7` :  bash ~/app/deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Code"
git fetch --quiet origin && git reset --hard --quiet origin/main

echo "== Dépendances + build (web/dist et client Prisma)"
export NODE_OPTIONS="--max-old-space-size=1536"
npm run build

echo "== Schéma de la base"
npm run db:push

echo "== Redémarrage"
if pm2 describe naja7school >/dev/null 2>&1; then
  pm2 reload deploy/ecosystem.config.cjs --update-env
else
  pm2 start deploy/ecosystem.config.cjs
fi
pm2 save
sleep 2
curl -fsS http://127.0.0.1:4000/api/health && echo && echo "OK : $(git rev-parse --short HEAD) déployé"
