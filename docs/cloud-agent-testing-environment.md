# Cloud-Agent Testing Environment Guidance

## Purpose
This document describes known cloud-agent validation constraints for LucaOS and a safe fallback workflow for PRs that touch scoped TypeScript/Vitest areas (especially `src/services/computerUse`).

Although this guide was introduced after Codex Cloud failures, it applies to any coding agent or temporary cloud environment where native dependencies may fail to build.

## Known cloud-agent blocker
In cloud/ephemeral coding agents such as Codex Cloud, Claude Code, Cursor agents, GitHub Codespaces, and similar environments, `npm ci` may fail before JavaScript/TypeScript tooling is installed.

Common failure chain:
1. `npm ci` installs dependency tree from `package-lock.json`.
2. Native modules are built during install (notably `robotjs`).
3. `robotjs` invokes `node-gyp`.
4. `node-gyp` may fail if Python `distutils` is unavailable:
   - `ModuleNotFoundError: No module named 'distutils'`

When this happens, dependency installation aborts and tools such as `vitest`, TypeScript type packages, and React type/runtime modules are not fully available in `node_modules`.

## Why Vitest/type-check can fail after install failure
If `npm ci` fails early, follow-on commands can fail for environmental reasons rather than PR logic:
- `npm test` / `vitest` may fail with `vitest: not found`.
- `npm run type-check` may produce unresolved module/type errors (for example missing `react` / `react/jsx-runtime`) because dependencies did not finish installing.

These are **environment bootstrap failures**, not necessarily regressions introduced by the current PR.

## Repo-wide vs PR-local signal
Use this framing in agent PR summaries:
- **Repo-wide/bootstrap failure**: package install fails due to native dependency toolchain constraints (e.g., `robotjs`/`node-gyp`/Python `distutils`).
- **PR-local failure**: install succeeds, but scoped tests or type checks fail in files changed by the PR.

Only treat failures as PR-local after dependency installation succeeds.

## Recommended validation order in cloud agents
1. Run `npm ci`.
2. If install succeeds, run `npm run type-check`.
3. If install succeeds, run scoped tests for computer-use changes:
   - `npm test -- --run src/services/computerUse`

Optional helper script:
- `ops/scripts/cloud-agent-validate-computer-use.sh`
- This script runs the same sequence and exits non-zero on failure without masking errors.

## PR summary reporting template
When install fails in cloud/ephemeral coding agents such as Codex Cloud, Claude Code, Cursor agents, GitHub Codespaces, and similar environments, report clearly:
1. Exact failing command (`npm ci`).
2. Native/toolchain root cause (`robotjs` -> `node-gyp` -> missing Python `distutils`).
3. Consequence (`vitest` unavailable, scoped tests cannot execute in this environment).
4. Scope statement (docs/scripts-only change or code-change area).
5. Next action for maintainers (rerun in environment with native build prerequisites).

Example wording:
- "`npm ci` failed in cloud/ephemeral coding agents such as Codex Cloud, Claude Code, Cursor agents, GitHub Codespaces, and similar environments during native dependency build (`robotjs` via `node-gyp`) due to missing Python `distutils`; as a result `vitest` was unavailable and scoped `src/services/computerUse` tests could not run in this environment."
