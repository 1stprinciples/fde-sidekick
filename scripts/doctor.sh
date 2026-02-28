#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "FDE Sidekick doctor"
echo "repo: $ROOT_DIR"
echo

if command -v node >/dev/null 2>&1; then
  echo "node: $(node -v)"
else
  echo "node: missing"
fi

if command -v npm >/dev/null 2>&1; then
  echo "npm:  $(npm -v)"
else
  echo "npm:  missing"
fi

echo

if [ -f .env ]; then
  echo ".env: present"
  if grep -q '^OPENAI_API_KEY=' .env && ! grep -q '^OPENAI_API_KEY=\s*$' .env; then
    echo "OPENAI_API_KEY: set"
  else
    echo "OPENAI_API_KEY: missing value"
  fi
else
  echo ".env: missing (run: cp .env.example .env)"
fi

echo

if lsof -i :5173 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "port 5173: listening"
else
  echo "port 5173: not listening"
fi

if lsof -i :8787 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "port 8787: listening"
else
  echo "port 8787: not listening"
fi

echo

if curl -fsS http://localhost:5173 >/dev/null 2>&1; then
  echo "frontend: ok (http://localhost:5173)"
else
  echo "frontend: not reachable"
fi

if curl -fsS http://127.0.0.1:5173 >/dev/null 2>&1; then
  echo "frontend-ipv4: ok (http://127.0.0.1:5173)"
else
  echo "frontend-ipv4: not reachable"
fi

if curl -fsS http://localhost:8787/api/health >/dev/null 2>&1; then
  echo "backend: ok (http://localhost:8787/api/health)"
else
  echo "backend: not reachable"
fi

echo
if curl -fsS http://localhost:5173 >/dev/null 2>&1 && curl -fsS http://localhost:8787/api/health >/dev/null 2>&1; then
  echo "status: healthy"
else
  echo "status: start with 'npm run dev' then re-run 'npm run doctor'"
fi
