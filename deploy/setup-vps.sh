#!/usr/bin/env bash
# Prépare un VPS Ubuntu 24.04 (IONOS, 1 vCore / 2 Go) pour Naja7School.
# À lancer UNE FOIS en root :  bash setup-vps.sh
# Ce qu'il fait : swap 2 Go, Node 24, PM2, Nginx, Certbot, pare-feu, utilisateur `naja7`, clone du dépôt.
set -euo pipefail

DOMAIN="${DOMAIN:-naja7school.com}"
REPO="${REPO:-https://github.com/OujanaDev/Myschool.git}"
APP_USER="naja7"
APP_DIR="/home/$APP_USER/app"

echo "== Mises à jour système"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git ufw nginx certbot python3-certbot-nginx sqlite3 build-essential

echo "== Swap 2 Go (le build Vite et Prisma en ont besoin sur 2 Go de RAM)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10 && echo 'vm.swappiness=10' > /etc/sysctl.d/99-swap.conf
fi

echo "== Node 24"
if ! command -v node >/dev/null || [[ "$(node -v)" != v24* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
npm install -g pm2@latest

echo "== Utilisateur applicatif $APP_USER"
id -u "$APP_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$APP_USER"

echo "== Dépôt"
if [ ! -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" git clone "$REPO" "$APP_DIR"
fi

echo "== Fichier .env du serveur (créé s'il n'existe pas ; les valeurs secrètes sont générées)"
ENV_FILE="$APP_DIR/server/.env"
if [ ! -f "$ENV_FILE" ]; then
  mkdir -p "/home/$APP_USER/data"
  cat > "$ENV_FILE" <<ENV
DATABASE_URL="file:/home/$APP_USER/data/naja7school.db"
JWT_SECRET="$(openssl rand -hex 32)"
PORT=4000
HOST=127.0.0.1
NODE_ENV=production
CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN
# Connexion Google : coller l identifiant client OAuth (console.cloud.google.com), vide = bouton masqué
GOOGLE_CLIENT_ID=
# Paiement Stripe : clé secrète + secret du webhook /api/billing/webhook (vide = paiement indisponible)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
APP_URL=https://$DOMAIN
ENV
  chown -R "$APP_USER:$APP_USER" "/home/$APP_USER/data" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi

echo "== Nginx"
sed "s/__DOMAIN__/$DOMAIN/g" "$APP_DIR/deploy/nginx.conf" > "/etc/nginx/sites-available/$DOMAIN"
ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "== Pare-feu : SSH + HTTP/HTTPS seulement"
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable

echo "== Premier déploiement (install, build, base, PM2)"
sudo -u "$APP_USER" -H bash "$APP_DIR/deploy/deploy.sh"

echo "== PM2 au démarrage de la machine"
pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER"
sudo -u "$APP_USER" -H pm2 save

echo "== Sauvegarde quotidienne de la base (7 jours glissants) à 3h"
cat > /etc/cron.d/naja7school-backup <<CRON
0 3 * * * $APP_USER mkdir -p /home/$APP_USER/backups && sqlite3 /home/$APP_USER/data/naja7school.db ".backup /home/$APP_USER/backups/naja7school-\$(date +\%F).db" && find /home/$APP_USER/backups -name '*.db' -mtime +7 -delete
CRON

cat <<MSG

Terminé. Reste à faire :
  1. Pointer le DNS de $DOMAIN (A et www) vers l'IP de ce serveur, puis attendre la propagation.
  2. Activer HTTPS :  certbot --nginx -d $DOMAIN -d www.$DOMAIN --redirect -m VOTRE_EMAIL --agree-tos
  3. Vérifier :       curl -s https://$DOMAIN/api/health
  Déploiements suivants :  sudo -u $APP_USER -H bash $APP_DIR/deploy/deploy.sh
MSG
