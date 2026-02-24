#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-8000}"
MAX_PORT=$((PORT + 20))

echo "🧬 Neural Network Evolution - WebGL Simulation"
echo "=============================================="
echo ""

cleanup() {
  if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
  fi
}
trap cleanup EXIT INT TERM

find_free_port() {
  local p=$PORT
  while [ "$p" -le "$MAX_PORT" ]; do
    if ! lsof -iTCP:"$p" -sTCP:LISTEN -t >/dev/null 2>&1; then
      echo "$p"
      return
    fi
    p=$((p + 1))
  done
  echo ""
}

if ! command -v python3 &>/dev/null && ! command -v python &>/dev/null; then
  echo "❌ Python not found!"
  echo ""
  echo "Alternatives:"
  echo "  npx http-server -p $PORT \"$SCRIPT_DIR\""
  echo "  php -S localhost:$PORT -t \"$SCRIPT_DIR\""
  echo ""
  echo "Then open http://localhost:$PORT"
  exit 1
fi

PORT=$(find_free_port)
if [ -z "$PORT" ]; then
  echo "❌ No free port found in range ${PORT}–${MAX_PORT}"
  exit 1
fi

echo "✓ Using port $PORT"
echo "  http://localhost:$PORT"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

open_browser() {
  sleep 1
  if command -v open &>/dev/null; then
    open "http://localhost:$PORT"
  elif command -v xdg-open &>/dev/null; then
    xdg-open "http://localhost:$PORT"
  elif command -v start &>/dev/null; then
    start "http://localhost:$PORT"
  fi
}
open_browser &

if command -v python3 &>/dev/null; then
  python3 -m http.server "$PORT" --directory "$SCRIPT_DIR" &
else
  (cd "$SCRIPT_DIR" && python -m SimpleHTTPServer "$PORT") &
fi
SERVER_PID=$!

wait "$SERVER_PID"
