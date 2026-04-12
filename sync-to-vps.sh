#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# sync-to-vps.sh — Push Next.js source to VPS for auto-deploy
#
# Run this ONCE after setup, then again whenever you change source code.
# Content changes (via WordPress) are handled automatically — no need to sync.
#
# Usage:
#   ./sync-to-vps.sh              # Sync source only
#   ./sync-to-vps.sh --deploy     # Sync + immediately trigger a deploy
# ─────────────────────────────────────────────────────────────────────────────

VPS_USER="root"
VPS_HOST="72.62.196.231"
VPS_DEST="/home/gayo-sphere-clarence/next-src"
LOCAL_SRC="$(dirname "$0")/next-portfolio"

DEPLOY_SECRET="gayo-sphere-deploy-2024-xK9mP7qR"
DEPLOY_URL="https://cms.gayo-sphere.cloud/wp-json/portfolio/v1/deploy"

set -euo pipefail

echo ""
echo "📦 Syncing Next.js source to VPS..."
echo "   From: $LOCAL_SRC"
echo "   To:   $VPS_USER@$VPS_HOST:$VPS_DEST"
echo ""

rsync -avz --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='out' \
    --exclude='.DS_Store' \
    "$LOCAL_SRC/" \
    "$VPS_USER@$VPS_HOST:$VPS_DEST/"

echo ""
echo "🔧 Fixing file ownership on VPS..."
ssh "$VPS_USER@$VPS_HOST" "chown -R gayo-sphere-clarence:gayo-sphere-clarence $VPS_DEST/"

echo ""
echo "✅ Source synced!"

# Optional: trigger a deploy immediately
if [[ "${1:-}" == "--deploy" ]]; then
    echo ""
    echo "🚀 Triggering deploy..."
    curl -s -X POST "$DEPLOY_URL" \
        -H "Content-Type: application/json" \
        -d "{\"token\": \"$DEPLOY_SECRET\"}" | python3 -m json.tool
    echo ""
    echo "⏱  Deploy started. Check live site in ~60 seconds:"
    echo "   https://clarence.gayo-sphere.cloud"
fi

echo ""
echo "Done. From now on, clicking 'Save All Changes' in WordPress"
echo "will automatically rebuild and redeploy the site."
echo ""
