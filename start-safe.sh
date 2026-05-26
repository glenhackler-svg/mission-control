#!/bin/bash
# PM2 startup wrapper — validates .next before starting, rebuilds if broken
cd "$(dirname "$0")"

# Quick sanity check: does .next look healthy?
if [ ! -f ".next/BUILD_ID" ] || [ "$(find .next/server -name '*.js' 2>/dev/null | wc -l | tr -d ' ')" -lt 10 ]; then
  echo "⚠️  .next is missing or broken — rebuilding..."
  
  # Try rollback first (instant recovery)
  if [ -d ".next-previous" ] && [ -f ".next-previous/BUILD_ID" ]; then
    echo "🔄 Restoring last known-good build..."
    rm -rf .next
    cp -a .next-previous .next
  else
    echo "🔨 No rollback available — full rebuild..."
    npm run build 2>&1 | tail -5
  fi
fi

exec npx next start
