#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# AEVOICE — Start all services in development mode
# Usage: bash scripts/dev-all.sh
# ─────────────────────────────────────────────────────────────
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🚀 Starting AEVOICE development servers..."
echo "   Root: $ROOT"
echo ""

# Load root .env
if [ -f "$ROOT/.env" ]; then
  export $(grep -v '^#' "$ROOT/.env" | xargs)
  echo "✅ Loaded .env"
fi

# Start backend
echo "▶  Starting backend on :3001..."
cd "$ROOT/backend"
node src/index.js &
BACKEND_PID=$!

# Small delay so backend starts first
sleep 1

# Start frontend
echo "▶  Starting frontend on :5173..."
cd "$ROOT/frontend"
npx vite --port 5173 &
FRONTEND_PID=$!

echo ""
echo "═══════════════════════════════════════════════"
echo "  AEVOICE Dev Servers Running"
echo "  Backend:  http://localhost:3001"
echo "  Frontend: http://localhost:5173/app"
echo "═══════════════════════════════════════════════"
echo ""
echo "  To launch desktop: cd desktop && npm run tauri:dev"
echo ""
echo "  Press Ctrl+C to stop all servers"
echo ""

# Wait and handle Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; echo '🛑 Stopped all servers.'" INT TERM
wait