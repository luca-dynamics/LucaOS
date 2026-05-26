#!/usr/bin/env bash
set -euo pipefail

echo "[cloud-agent-validate] node: $(node --version 2>/dev/null || echo 'not found')"
echo "[cloud-agent-validate] npm:  $(npm --version 2>/dev/null || echo 'not found')"
if command -v python3 >/dev/null 2>&1; then
  echo "[cloud-agent-validate] python3: $(python3 --version 2>&1)"
elif command -v python >/dev/null 2>&1; then
  echo "[cloud-agent-validate] python: $(python --version 2>&1)"
else
  echo "[cloud-agent-validate] python: not found"
fi

echo "[cloud-agent-validate] running: npm ci"
if ! npm ci; then
  echo
  echo "[cloud-agent-validate] ERROR: npm ci failed."
  echo "[cloud-agent-validate] Native dependency build likely failed (commonly robotjs -> node-gyp)."
  echo "[cloud-agent-validate] In cloud/ephemeral coding agents such as Codex Cloud, Claude Code, Cursor agents, GitHub Codespaces, and similar environments this may be caused by missing Python distutils, which prevents Vitest/TS tooling installation."
  exit 1
fi

echo "[cloud-agent-validate] running: npm run type-check"
npm run type-check

if [ "$#" -gt 0 ]; then
  echo "[cloud-agent-validate] running: npm test -- --run $*"
  npm test -- --run "$@"
else
  echo "[cloud-agent-validate] running: npm test -- --run src/services/computerUse"
  npm test -- --run src/services/computerUse
fi
