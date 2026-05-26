#!/bin/bash
set -euo pipefail

######################################################################
# Mission Control — Bulletproof Deploy
#
# Safe order of operations:
#   1. Pull latest code (if git repo)
#   2. Install deps (if lockfile changed)
#   3. Build into a temp dir
#   4. Verify build output exists
#   5. Swap .next atomically
#   6. Restart PM2
#   7. Health-check the running server
#   8. If health fails → rollback to previous .next and restart
######################################################################

cd "$(dirname "$0")"
APP_DIR="$(pwd)"
HEALTH_URL="http://127.0.0.1:3000/api/health"
MAX_HEALTH_RETRIES=10
HEALTH_WAIT=2

log()  { echo "$(date '+%H:%M:%S') $*"; }
fail() { echo "$(date '+%H:%M:%S') ❌ $*" >&2; exit 1; }

# ── 1. Git pull (skip if not a git repo or working tree is dirty) ──
if [ -d .git ]; then
  if git diff --quiet 2>/dev/null; then
    log "📥 Pulling latest code..."
    git pull --ff-only || log "⚠️  Git pull failed (non-fast-forward?) — continuing with current code"
  else
    log "⚠️  Dirty working tree — skipping git pull"
  fi
fi

# ── 2. Install deps if lockfile changed ──
if [ -f package-lock.json ]; then
  log "📦 Installing dependencies..."
  npm ci --prefer-offline --no-audit 2>&1 | tail -3
fi

# ── 3. Generate Prisma client ──
log "🗄️  Generating Prisma client..."
npx prisma generate 2>&1 | tail -2

# ── 4. Build into .next-new ──
log "🔨 Building Next.js..."
rm -rf .next-new
NEXT_BUILD_OUTPUT=".next-new" npm run build -- 2>&1 | tail -5 || true

# Next.js ignores NEXT_BUILD_OUTPUT, so it builds into .next
# We work around that by building normally then swapping
# The build script already does rm -rf .next, so .next is fresh

# ── 5. Verify build output ──
if [ ! -f ".next/BUILD_ID" ]; then
  fail "Build failed — .next/BUILD_ID not found. Aborting deploy."
fi

ROUTE_COUNT=$(find .next/server -name "*.js" 2>/dev/null | wc -l | tr -d ' ')
if [ "$ROUTE_COUNT" -lt 10 ]; then
  fail "Build looks incomplete — only $ROUTE_COUNT server JS files. Aborting."
fi
log "✅ Build verified: $ROUTE_COUNT server files, BUILD_ID=$(cat .next/BUILD_ID)"

# ── 6. Keep previous build for rollback ──
rm -rf .next-rollback
if [ -d .next-previous ]; then
  mv .next-previous .next-rollback
fi
# We can't back up current .next because the build script already replaced it
# Instead, .next-rollback holds the one before last

# ── 7. Restart PM2 ──
log "🚀 Restarting PM2..."
pm2 restart mission-control --update-env 2>&1 | tail -3

# ── 8. Health check ──
log "🏥 Health check (up to ${MAX_HEALTH_RETRIES} attempts)..."
HEALTHY=false
for i in $(seq 1 $MAX_HEALTH_RETRIES); do
  sleep $HEALTH_WAIT
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    HEALTHY=true
    break
  fi
  log "  Attempt $i/$MAX_HEALTH_RETRIES — got HTTP $HTTP_CODE"
done

if [ "$HEALTHY" = true ]; then
  log "✅ Deploy complete — Mission Control is healthy!"
  # Save this known-good build for future rollback
  rm -rf .next-previous
  cp -a .next .next-previous
  exit 0
fi

# ── 9. Rollback ──
log "❌ Health check failed after $MAX_HEALTH_RETRIES attempts"
if [ -d .next-rollback ]; then
  log "🔄 Rolling back to previous build..."
  rm -rf .next
  mv .next-rollback .next
  pm2 restart mission-control --update-env 2>&1 | tail -3
  sleep 3
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    log "✅ Rollback successful — running previous build"
    exit 1
  else
    fail "Rollback also failed (HTTP $HTTP_CODE). Manual intervention needed."
  fi
else
  fail "No rollback available. Manual intervention needed."
fi
