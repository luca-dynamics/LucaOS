#!/usr/bin/env bash
set -euo pipefail

echo "[codex-validate] node: $(node --version 2>/dev/null || echo 'not found')"
echo "[codex-validate] npm:  $(npm --version 2>/dev/null || echo 'not found')"
if command -v python3 >/dev/null 2>&1; then
  echo "[codex-validate] python3: $(python3 --version 2>&1)"
elif command -v python >/dev/null 2>&1; then
  echo "[codex-validate] python: $(python --version 2>&1)"
else
  echo "[codex-validate] python: not found"
fi

echo "[codex-validate] running: npm ci"
if ! npm ci; then
  echo
  echo "[codex-validate] ERROR: npm ci failed."
  echo "[codex-validate] Native dependency build likely failed (commonly robotjs -> node-gyp)."
  echo "[codex-validate] In Codex Cloud this may be caused by missing Python distutils, which prevents Vitest/TS tooling installation."
  exit 1
fi

echo "[codex-validate] running: npm run type-check"
npm run type-check

if [ "$#" -gt 0 ]; then
  echo "[codex-validate] running: npm test -- --run $*"
  npm test -- --run "$@"
else
  echo "[codex-validate] running: npm test -- --run src/services/computerUse"
  npm test -- --run src/services/computerUse
fi
