#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# AEVOICE — Build all services for production
# Usage: bash scripts/build-all.sh [macos|windows|linux]
# ─────────────────────────────────────────────────────────────
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET=${1:-""}

echo "🔨 Building AEVOICE for production..."
echo ""

# 1. Build Frontend
echo "▶  Building frontend..."
cd "$ROOT/frontend"
npm run build
echo "✅ Frontend built → frontend/dist/"

# 2. Build Desktop (Tauri)
echo ""
echo "▶  Building desktop app..."
cd "$ROOT/desktop"

if [ "$TARGET" = "macos" ]; then
  npm run tauri:build:macos
  echo "✅ Desktop built → desktop/src-tauri/target/release/bundle/macos/"
elif [ "$TARGET" = "windows" ]; then
  npm run tauri:build:windows
  echo "✅ Desktop built → desktop/src-tauri/target/release/bundle/nsis/"
elif [ "$TARGET" = "linux" ]; then
  npm run tauri:build:linux
  echo "✅ Desktop built → desktop/src-tauri/target/release/bundle/deb/"
else
  npm run tauri:build
  echo "✅ Desktop built → desktop/src-tauri/target/release/bundle/"
fi

echo ""
echo "═══════════════════════════════════════════════"
echo "  AEVOICE Build Complete"
echo "═══════════════════════════════════════════════"