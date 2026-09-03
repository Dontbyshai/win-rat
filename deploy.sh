#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Déploiement de win-rat sur le VPS OuiHeberg
# Accès: http://141.11.185.92:8801  (frontend)
#        http://141.11.185.92:8800  (backend API)
# =============================================================================

set -e

VPS_IP="141.11.185.92"
VPS_USER="root"
REMOTE_DIR="/var/www/win-rat"
NGINX_CONF="winrat.nginx.conf"
NGINX_SITES="/etc/nginx/sites-enabled/winrat"

echo "🔨 Build du frontend React..."
cd "$(dirname "$0")/server/frontend"
npm install
npm run build
cd "$(dirname "$0")"

echo "📦 Envoi des fichiers vers le VPS..."
ssh "$VPS_USER@$VPS_IP" "mkdir -p $REMOTE_DIR"
rsync -avz --exclude='.git' --exclude='node_modules' --exclude='vendor' \
    ./ "$VPS_USER@$VPS_IP:$REMOTE_DIR/"

echo "⚙️  Installation des dépendances backend sur le VPS..."
ssh "$VPS_USER@$VPS_IP" bash <<'REMOTE'
cd /var/www/win-rat/server/backend
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan migrate --force
REMOTE

echo "🌐 Configuration Nginx..."
ssh "$VPS_USER@$VPS_IP" bash <<REMOTE
cp $REMOTE_DIR/$NGINX_CONF $NGINX_SITES
nginx -t && systemctl reload nginx
REMOTE

echo "🚀 Démarrage du backend Laravel (port 8800)..."
ssh "$VPS_USER@$VPS_IP" bash <<'REMOTE'
# Tue l'ancienne instance si elle tourne
pkill -f "artisan serve" 2>/dev/null || true

cd /var/www/win-rat/server/backend
nohup php artisan serve --host=127.0.0.1 --port=8800 \
    > /var/log/winrat-backend.log 2>&1 &

echo "✅ Backend démarré. PID: $!"
echo "   API:      http://141.11.185.92:8800/api"
echo "   Frontend: http://141.11.185.92:8801"
REMOTE

echo ""
echo "✅ Déploiement terminé !"
echo "   🖥️  Frontend : http://$VPS_IP:8801"
echo "   ⚙️  Backend  : http://$VPS_IP:8800/api"
