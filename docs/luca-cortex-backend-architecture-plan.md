# LucaOS — Cortex Backend Architecture Plan

> Status: proposal. Author: backend-architecture pass.
> Goal: move the Cortex backend from a 4,088-line single-process FastAPI
> monolith toward an industrial-strength runtime **that honors the LucaOS
> Constitution** — without betraying its local-first, sovereign, embodiment-first
> identity. This is explicitly *not* a "rebuild it like a cloud SaaS" plan.

---

## 0. What LucaOS is trying to become (grounding)

From `docs/foundation/CONSTITUTION.md` and `docs/foundation/ARCHITECTURE.md`:

- A **persistent, embodied AI operating layer** — "not a chatbot shell and not an
  OS kernel replacement."
- Layer map: `Interface → Cortex → Mission Engine → Memory/Skills/Model
  Router/Luca Guard → Embodiment → Host Systems → LucaLink Continuity`.
- Mission doctrine: every serious mission is **plan → execute → verify → recover
  → record**.
- Security doctrine: **Luca Guard must gate sensitive actions, enforce policy,
  and record auditable decisions.** Unknown actions default to blocked.
- Deterministic-execution contract (`docs/luca-deterministic-execution-contract.md`):
  `liveExecutionAllowed`, `autonomousExecutionEnabled`, `persistenceEnabled`,
  `networkCallsEnabled` are **false by default** until explicitly enabled, and
  every execution must produce a `LucaExecutionReceipt` with evidence.
- Sovereignty: users own goals, approvals, and memory; routing is model-neutral
  (cloud / local / BYOK); prefer privacy-preserving local paths.

**Therefore the backend's job is not throughput at scale — it is a single-user,
local-first, *trustworthy* execution runtime.** "Industrial-strength" here means
*safety, auditability, determinism, and reliability*, not horizontal scaling.

---

## 1. Current reality (intent vs. implementation)

| Subsystem | Intended (docs) | Actual (code) |
|---|---|---|
| Cortex | Layered reasoning/planning/routing tier | `cortex/python/cortex.py` — 4,088 lines, 57 routes, **one file** |
| Process model | Supervised runtime | Single uvicorn process, 1 worker, asyncio; Phoenix supervisor restarts it |
| Auth | Guard gates sensitive actions | **No auth on any of the 57 endpoints** |
| CORS | (implied: trusted origins) | `allow_origins=["*"]` + `allow_credentials=True` |
| Exposure | LucaLink trust model | Can bind `0.0.0.0` ("Remote Access") with **no auth gate** |
| Mission Engine | Deterministic backend runtime | TS schema in *frontend*; `executeStep` returns success without doing work |
| Luca Guard | Policy enforcer wired to execution | Command **classifier** only; not wired as an enforcement hook |
| Model Router | Policy-driven (privacy/cost/latency) + fallbacks | 3 implementations; only `ModelManagerService` is live; others have hardcoded fake model IDs |
| LucaLink | One host mesh | **3 concurrent transports** from `App.tsx`; governance types exist but aren't wired |
| Tests | — | **0 Python backend tests** (471 on the TS side) |
| Build | green | Audit reports 182 type errors / 34 failing test files at PR #230 |

The dangerous combination today: **wildcard CORS + no auth + optional `0.0.0.0`
exposure + very powerful endpoints** (the backend exposes pentesting / OSINT /
file-edit / OS-automation routes). If a user ever enables remote access, that is
an unauthenticated RCE-class surface. **This is the #1 thing to fix.**

---

## 2. Target architecture (to-be)

Keep the **local sidecar** model (it is correct for sovereignty). Make it a
*hardened, modular, supervised* sidecar.

```text
            ┌─────────────────────────────────────────────┐
 Electron   │  Cortex Runtime (Python, single local proc) │
 main.cjs ──┤                                             │
  spawns    │  ┌────────────┐   every request passes:     │
  + token   │  │ Auth Gate  │ ← bearer token (SecurityMgr)│
            │  └─────┬──────┘                              │
            │  ┌─────▼──────┐  ┌──────────────┐           │
            │  │ Luca Guard │→ │ Capability /  │           │
            │  │ (enforce)  │  │ Tier policy   │           │
            │  └─────┬──────┘  └──────────────┘           │
            │  ┌─────▼─────────────────────────────────┐  │
            │  │ Mission Engine runtime                 │  │
            │  │ plan→execute→verify→recover→record     │  │
            │  └─────┬───────────────┬─────────────────┘  │
            │  ┌─────▼────┐  ┌───────▼─────┐  ┌─────────┐  │
            │  │ Routers  │  │ Model Router│  │ Memory  │  │
            │  │ (domain) │  │ (1 hub)     │  │ +receipts│ │
            │  └──────────┘  └─────────────┘  └─────────┘  │
            │  Embodiment adapters (host/browser/device)   │
            └─────────────────────────────────────────────┘
                         ▲ Phoenix supervisor (restart + crash receipts)
```

### 2.1 Module decomposition (break the monolith)
Convert `cortex.py` into a package:
```
cortex/python/cortex/
  __init__.py
  app.py                # FastAPI factory: middleware, auth, routers, lifespan
  config.py             # settings, paths, host/port, feature flags
  security/
    auth.py             # bearer-token dependency (require on every router)
    cors.py             # explicit origin allowlist
    guard.py            # Luca Guard enforcement (risk classify + gate)
    capabilities.py     # capability + tier (Origin/Tactical/Core) checks
  mission/
    engine.py           # plan→execute→verify→recover→record runtime
    receipts.py         # LucaExecutionReceipt persistence (sqlite)
  routers/              # the 57 routes, grouped by domain
    chat.py memory.py models.py automation.py osint.py hacking.py ...
  embodiment/           # host/browser/device adapters
  observability/
    logging.py health.py   # /healthz, /readyz, structured logs
```
Keep `cortex.py` as a 5-line shim that imports `cortex.app:create_app` so the
PyInstaller entry and `run-cortex.cjs` don't change.

### 2.2 Process model — stay single-process, get robust
Do **not** add Gunicorn/multi-worker (wrong for a single-user local app and
breaks in-process state). Instead:
- Graceful lifespan (startup/shutdown hooks) — partially present already.
- `/healthz` (liveness) + `/readyz` (Cortex graph DB / models ready) so the
  Electron boot BIOS stops polling on a log string and uses a real contract.
- Phoenix supervisor already restarts on crash (good) — add **crash receipts**
  (structured, last-N lines + classification) instead of only AI analysis.

---

## 3. Security hardening — Phase 1, non-negotiable

These map directly to the Security Doctrine and must land **before** any
`liveExecutionAllowed: true` work.

1. **Auth gate on every endpoint.** Reuse the existing Electron `SecurityManager`
   master token: Electron passes it to the spawned Cortex via env
   (`run-cortex.cjs`), Cortex requires it as a FastAPI dependency (bearer header)
   on all routers. Reject unauthenticated requests with 401.
2. **CORS lockdown.** Replace `allow_origins=["*"] + allow_credentials=True` with
   an explicit allowlist (the Electron/Vite origins + the LucaLink relay origin
   when paired). Never wildcard-with-credentials.
3. **Bind 127.0.0.1 by default.** `0.0.0.0` only when the user explicitly enables
   remote access **and** auth is on **and** it goes through the LucaLink trust
   model (device pairing, PIN, trust level) — never raw.
4. **Capability + tier gates on powerful routes.** hacking / osint / automation /
   file-edit endpoints require: auth → Guard risk classification → capability
   grant → tier check (Origin/Tactical) → execution receipt. Unknown/critical
   default to blocked (Constitution).
5. **Request limits.** Body-size caps, basic rate limiting, and timeouts.

Exit criteria: an unauthenticated request to any route returns 401; CORS rejects
unknown origins; binding defaults to localhost; a powerful route without a
capability grant is blocked and logged.

---

## 4. Make governance real (Mission Engine + Guard + receipts)

The audits explicitly say: *"Make the governance layer real, or rename it."* This
plan makes it real on the backend.

- **Guard as an enforcement hook**, not a classifier: every execution path calls
  Guard before acting; Guard returns allow/deny/needs-approval; deny short-circuits.
- **Mission Engine runtime in Cortex**: implement `plan→execute→verify→recover→
  record` where `execute` actually invokes adapters/skills and `verify` runs the
  verification gates (`docs/luca-execution-verification-gates.md`).
- **Execution receipts**: persist `LucaExecutionReceipt` (intent, plan, steps,
  evidence, verdict) to sqlite. This is already mandated by the deterministic
  execution contract and is the audit trail the Security Doctrine requires.
- **Respect the defaults**: keep `liveExecutionAllowed: false` until each adapter
  is individually hardened; the runtime should *simulate + record* (dry-run)
  until explicitly switched on per capability.

Decision to make: **Mission Engine lives where?** Recommendation — the
*authoritative* runtime moves to Cortex (Python) because that is where execution/
embodiment actually happens; the TS `MissionEngine.ts` becomes a typed client/
mirror for the UI. Define one shared contract (JSON schema) between them.

---

## 5. Model Router consolidation

- Converge on **`ModelManagerService`** as the single hub (it already has ~25
  importers). Demote `ModelRouterService` and `CapabilityRouter` to advisors or
  delete; remove the hardcoded fake model IDs.
- Make routing **policy-driven** per `docs/runtime/MODEL_ROUTING_SPEC.md`:
  decide by privacy/latency/cost, prefer local when requirements allow, with
  mandatory **fallback chains** (local → BYOK → Luca Prime, or as configured).
- Cortex consumes routing decisions via one provider-factory boundary
  (`ProviderFactory`) — already the de-facto path on the new main.

---

## 6. LucaLink transport convergence

- Collapse the **three** access paths (`lucaLinkManager`, `lucaLinkService`, raw
  `lucaLinkSocketRef`) to **one transport** with a typed API.
- Wire the existing governance *types* (trust levels, permission categories, sync
  lanes, revocation) into that transport so they enforce, not just describe.
- Treat LucaLink as a **host mesh**: capability registry, host roles
  (primary/companion/execution/sensor/display/guest), per-device scoped
  permissions, guest TTL — per `docs/lucalink-host-mesh-architecture.md`.

---

## 7. Reliability, observability, tests

- **Backend tests (pytest)** — currently zero. Start with the highest-risk
  surfaces: auth gate, Guard enforcement, capability/tier checks, mission engine
  determinism, model routing fallbacks. Wire into the release CI workflow
  (`.github/workflows/release.yml`) as a gating job.
- **Structured logging** (JSON lines) with levels; crash receipts from Phoenix.
- **Health/readiness endpoints** consumed by the boot BIOS (replaces log-string
  polling).
- **Green-build cleanup pass** (the audit's 182 type / 34 test failures) as a
  prerequisite to trusting CI gates.

---

## 8. Packaging & runtime policy

- **Pin Python to 3.11 or 3.12 for builds.** 3.14 works today (torch ships a
  cp314 wheel; numpy built from source) but the ML ecosystem lags new releases —
  reproducible builds want a stable, wheel-rich version. Use it in the venv and
  in the CI cortex-build step.
- Per-arch cortex binary (ties into the multi-arch CI already drafted): build
  cortex on each native runner so the PyInstaller binary matches the target CPU.

---

## 9. Phased roadmap (priority order)

| Phase | Theme | Exit criteria | Honors |
|---|---|---|---|
| **0** | Stabilize | Green build; Python pinned; pytest harness + 1st tests; health/readyz | Determinism, CI trust |
| **1** | **Security gate** | Auth on all routes; CORS allowlist; localhost-default; capability/tier gates on powerful routes | **Security Doctrine** (do first) |
| **2** | Modularize Cortex | Monolith split into package; shim entry unchanged; tests pass | Maintainability |
| **3** | Governance real | Guard enforces; Mission Engine runtime + receipts persisted; dry-run by default | Mission + Security Doctrine, deterministic contract |
| **4** | Model Router | One hub; policy routing + fallbacks; fakes removed | Model neutrality, sovereignty |
| **5** | LucaLink converge | One transport; trust/perms/lanes enforced | Continuity, embodiment safety |
| **6** | Multi-agent (deferred) | Role registry, per-agent perms/memory/tools, task graph, supervisor merge | Per `multi-agent-orchestration-architecture-audit.md` — only after 0–5 |

**Do Phase 1 first regardless of everything else.** It is small, it closes a real
security hole, and it is a precondition for ever enabling live execution.

---

## 10. Explicitly out of scope / deferred (by design)

- Horizontal scaling / multi-worker / containers — wrong model for a sovereign
  local runtime.
- Real live execution (voice capture, BrowserRuntime, direct-host, robotics,
  payments) — stays gated behind per-capability hardening + approval UX.
- Multi-agent orchestration — deferred to Phase 6 per the orchestration audit.
