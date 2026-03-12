#!/usr/bin/env bash
set -e

APP_DIR="$HOME/.openclaw/workspace/projects/chess-ai/app"

echo "📦 Building Chess AI..."
cd "$APP_DIR"

if npm run build; then
  echo "✅ Build succeeded. Restarting service..."
  systemctl --user restart chess-ai
  echo "🚀 chess-ai service restarted successfully."
else
  echo "❌ Build failed!" >&2
  exit 1
fi
