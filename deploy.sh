#!/bin/bash
set -e
echo "🔨 Building Mission Control..."
cd "$(dirname "$0")"
npm run build
echo "🚀 Restarting PM2..."
pm2 restart mission-control --update-env
echo "✅ Deploy complete."
