# CLAUDE.md — LucaOS

You are working in the **LucaOS** code repository. Two things govern your work
here: the **LucaOS Foundation** (the vision, constitution, and standards) and the
**practical mechanics** of building and running this app. Both are below.

---

## 1. Read the Foundation first

The Foundation lives in [`foundation/`](foundation/README.md). Before you write
code:

- **[foundation/CLAUDE.md](foundation/CLAUDE.md)** — operating instructions for AI
  coding agents. Read it before touching code.
- **[foundation/01-constitution/01-the-eight-invariants.md](foundation/01-constitution/01-the-eight-invariants.md)**
  — the eight properties that must always hold.
- **[foundation/01-constitution/02-the-four-questions.md](foundation/01-constitution/02-the-four-questions.md)**
  — the four questions every pull request must answer.

Two charters, do not confuse them: **this `CLAUDE.md`** instructs the agents that
_build_ LucaOS; **[foundation/LUCA.md](foundation/LUCA.md)** — the Charter of Luca —
constitutes _Luca itself_, the agentic system the OS hosts and loads at runtime.
When you implement Luca's own behavior, `LUCA.md` is the specification to satisfy.

### The non-negotiables, in one screen

**There is exactly one Luca.** Not one per session, per device, or per provider.
Almost every serious architectural mistake here traces back to quietly
reintroducing per-session or per-surface state that fractures that identity.

**Every change must answer the Four Questions:** (1) Does this strengthen
persistence? (2) Does this reinforce one identity? (3) Does this improve trust?
(4) Does this move Luca closer to a continuously present AI?

**And break none of the Eight Invariants:** one Luca identity · persistent runtime
· shared memory · provider abstraction · cross-surface continuity · strong typing
and modularity · backward compatibility where practical · security and explicit
permissions. If a change must break one, it needs an
[RFC](foundation/04-rfcs/README.md) and an
[amendment](foundation/01-constitution/03-governance-and-amendments.md) — not a
silent commit.

---

## 2. Build, run, and test

LucaOS is an **Electron desktop app** with three moving parts: a **Vite/React
renderer** (the UI), a **Node core server** (`server.js`), and a **Python "Cortex"**
(local intelligence). Scripts are in `package.json`.

### First-time setup

```bash
npm install          # postinstall runs `electron-rebuild -v 40.7.0` for native
                     # modules (e.g. robotjs). Run it again after pulling changes
                     # that touch dependencies, or tests may fail on a missing pkg.
```

The database uses the runtime's built-in **`node:sqlite`** (no native binary, no
ABI mismatch — see [ADR-0004](foundation/05-adrs/0004-node-sqlite-over-better-sqlite3.md)),
so it needs a modern Node (22.5+; the app bundles Node 24 via Electron 40).

### Run the app (the usual path)

```bash
npm run electron:dev    # Vite renderer + Electron shell (spawns core + Cortex)
```

`electron:dev` is the primary dev loop. The Electron main process
(`ops/scripts/start-electron.cjs` → `platforms/electron/main.cjs`) allocates
**ephemeral localhost ports** for the core server and Cortex and publishes them to
the renderer, then reveals the window on `renderer-ready` (with a timeout
fallback). Expect the first mount to be slow — Vite transforms a large renderer
(~1,900 TS/TSX files).

### Run parts individually

```bash
npm run dev        # Vite renderer only
npm run server     # Node core server (server.js). PORT=<n> to pin a port;
                   #   LUCA_FIXED_PORT=1 uses the configured fixed port.
npm run cortex     # Python Cortex (local models, RAG, voice, vision)
npm run start:all  # renderer + core + Cortex together (no Electron shell)
```

The core serves `/api/health` before its full route graph loads (fast-listen
boot, [ADR-0006](foundation/05-adrs/0006-fast-listen-boot.md)), so health answers
within ~a second of spawn.

### Verify your change

```bash
npm test               # vitest run (whole suite)
npm run test:watch     # vitest in watch mode
npx vitest run path/to/file.test.ts   # a single file
npm run type-check     # tsc --noEmit
npm run lint           # eslint (ts,tsx), zero-warnings policy
npm run safety-check   # lint + type-check + integrity verifier (run before a PR)
```

### Build / package

```bash
npm run build          # tsc && vite build
npm run build:web      # web (non-Electron) build
npm run dist:win       # package a Windows app (also dist:mac, dist:linux)
```

---

## 3. Repo-specific gotchas (learned the hard way)

- **The type-check baseline is not clean.** `npm run type-check` reports a set of
  pre-existing errors unrelated to your change (three.js, lucide, some tests).
  Don't expect a zero exit; instead confirm your files add **no new** errors
  (`git stash`-free: build a filtered check for the files you touched).
- **This working tree is shared across sessions and worktrees.** Stage by explicit
  path — **never `git add -A`**; it sweeps up other sessions' in-flight work. Treat
  unexpected modified files (e.g. `package-lock.json`, `platforms/electron/main.cjs`)
  as another session's work: surface them, don't commit or revert them. Re-read
  `git branch -vv` before assuming where HEAD is.
- **`git stash` is dangerous here.** With another session's edits present, a stash
  push can fail silently or pop the wrong stash. To test "does this fail without my
  change?", use file copies (`cp` the file aside, `git show HEAD:path > path`, test,
  restore), not stash.
- **Source-assertion tests read real files via `process.getBuiltinModule('node:fs')`,
  not a plain `fs` import.** `vite.config.ts` aliases `fs`/`node:fs` to a browser
  polyfill; a plain `readFileSync` returns `''` under vitest, which makes
  `not.toContain` assertions pass vacuously. Follow the existing pattern.
- **A silent in-memory DB fallback is a bug, not graceful degradation.** If the
  store can't open, that must be loud — see
  [Data and Storage](foundation/02-specification/10-data-and-storage.md).
- **The disk is slow** (Defender scans `node_modules`); large installs, greps, and
  `ls` can take a while. Prefer scoped commands.
- **Environment is Windows/PowerShell.** Line endings normalize LF→CRLF on commit
  (harmless; add `*.md text` to `.gitattributes` to quiet it).

---

## 4. Working style

- Match the surrounding code; read a file before editing it. No `any` on a public
  boundary.
- Verify, don't assume: if you claim a test passes, run it and show the output.
- Side effects on the user's world are gated, provenanced, and revocable; fail
  closed; never treat transcript text as authorization
  ([Safety and Permissions](foundation/02-specification/07-safety-and-permissions.md)).
- Branch from the default branch; confirm before irreversible or outward-facing
  actions unless durably authorized.

The full reasoning behind everything above is in
[`foundation/`](foundation/README.md). This file is the practical entry point;
the Foundation is the authority.
