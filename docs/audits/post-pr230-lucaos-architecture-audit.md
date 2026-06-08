# Post-PR #230 LucaOS Architecture Audit

> Scope: repo-wide architecture review of LucaOS after the Personal Intelligence,
> LucaLink, runtime-continuity, and device-governance PR chain (merged through
> PR #230, `42589b8`). This is a **read-first audit**. The companion PR makes
> only low-risk, surgical fixes (documented in the last section); it deliberately
> does **not** rewrite `App.tsx`, providers, or any major subsystem.
>
> Author note: every claim below is anchored to a concrete file/path so it can be
> independently verified. Where intent is ambiguous, the finding is marked
> **(uncertain)** rather than asserted.

---

## 1. Executive summary

LucaOS post-#230 is **structurally coherent at the product level** but shows the
classic signatures of a fast PR chain: a very large, well-tested *governance /
"boundary" logic layer* has been added ahead of the runtime that is supposed to
consume it. The dominant pattern across the new Personal Intelligence (PI),
LucaLink, Operation Center, and runtime-continuity code is:

> **pure policy + types + fixtures + readiness evaluators + UI preview panels,
> intentionally non-executing, not yet wired into the live agent execution loop.**

This is a legitimate and disciplined way to land governance scaffolding (the code
is explicit that state is "in-memory, expiring, and non-executing" and that
`sideEffectsPerformed: false`). The risk is **not** that the work is fake — it is
that:

1. The boundary layer is **not imported by any runtime service** (`src/services/*`
   never imports `src/personal-intelligence/*`), so "Personal Intelligence" today
   is a settings/preview experience, not a runtime authority over real actions.
2. There are **3 parallel LucaLink access paths** in `App.tsx` (a class manager, a
   2.7k-line socket service, and a raw socket ref) — real architectural drift.
3. The "Model Router" name is split across **three** services, only one of which
   (`ModelManagerService`) is actually the hub; the other two are near-orphaned.
4. The repo **does not pass `tsc --noEmit` or `eslint`**, and **34 test files /
   27 assertions are red on `main`** — several of them in exactly the new
   subsystems, caused by type/fixture drift (types extended, tests not updated).

None of these block the *product direction*. They do need to be cleaned up before
beta so the governance story is real (enforced) rather than illustrative
(previewed).

### Health snapshot (measured on `main` @ `42589b8`, clean clone)

| Check | Command | Result |
|---|---|---|
| Type-check | `npm run type-check` | ❌ **182 errors** (~97 non-test, ~85 in `*.test.*`) |
| Lint | `npm run lint` | ❌ **38 errors, 88 warnings** (`--max-warnings 0` ⇒ fail) |
| Unit tests | `npm test` | ❌ **34 files / 27 tests failing**, 336 files / 2372 tests passing |

> Note: ~6–10 type errors are environmental — `src/data/directoryData` is matched
> by the `data/` rule in `.gitignore`, so a fresh clone is missing it (see the
> repo environment blueprint). The remaining ~170 are real.

---

## 2. What is solid

These subsystems are genuinely wired end-to-end (UI → service → state) and are
well covered by tests.

- **Boot → onboarding → dashboard.** Clean, single-owner flow.
  `src/index.tsx` routes by URL `?mode=` (widget/chat/hologram/mobile/tv) else
  `<App/>`. `App.tsx` gates on `bootSequence` (`useAppSystem`): `INIT → … →
  ONBOARDING → READY`. While `!== "READY"` it renders `LucaBootVisualShell`, or
  `OnboardingFlow` when `ONBOARDING`; `OnboardingFlow.onComplete` persists
  `general.setupComplete` + `preferredMode` via `settingsService` and flips to
  `READY` (`src/App.tsx:2231-2268`). No competing boot owners found.

- **Model mode selection.** `ModelManagerService` is the real hub — imported by
  ~25 modules including onboarding (`OnboardingModelModeCoordinator`,
  `LocalProvisioningService`), LLM providers (`ProviderFactory`,
  `LocalLLMAdapter`), `AgentModelSelector`, `ChatModelSwitcher`, and the settings
  Brain/Vision/Voice tabs. Local / cloud / Luca Prime / BYOK modes resolve through
  this one service.

- **Runtime governance services** (`src/services/runtime/*`) are large but
  **connected**: `VisualCoreDisplaySessionService` is consumed by `VisualCore.tsx`
  and the right-panel `ControlPanel`/`ActivityPanel`/`TraceLogsPanel`;
  `voiceSessionOrchestrator` is consumed by `useVoiceEngine`, `VoiceHud`,
  `OverlayManager`, and `App.tsx`. The voice/chat handoff path exists and is real.

- **Operation / Permission Center** is rendered for real:
  `ControlPanel.tsx:133` → `<OperationPermissionCenter/>`
  (`src/components/right-panel/OperationPermissionCenter.tsx`). It is honest about
  being a review surface (see §4).

- **Personal Intelligence as a logic + preview library** is extensive and
  heavily unit-tested (identity, mission, memory, learning, privacy, doctrine,
  skill sandbox/dry-run, approval, runtime trace, runtime authority). The
  `src/personal-intelligence/index.ts` barrel is consistent and the preview cards
  under `src/components/settings/personalIntelligencePreview/*` render it.

---

## 3. What is partially wired

- **Personal Intelligence is not a runtime authority yet — it is a preview.**
  `grep` confirms **no file under `src/services/*` imports
  `src/personal-intelligence/*`**, and `App.tsx` imports neither
  `personal-intelligence` nor `operation-center`. PI is consumed only by:
  settings preview panels, the `Skill*` panels, and the `operation-center`
  bridges. So PI memory/continuity/trace recording is **not fed by live agent
  execution**; it is populated from fixtures and in-memory context. Naming
  ("runtime authority", "runtime trace recorder") oversells the current wiring.
  *Follow-up:* connect the live tool-execution / mission loop to
  `personal-intelligence/runtime` trace recording before claiming "runtime
  authority".

- **LucaLink has three concurrent access paths from `App.tsx`** — real drift:
  1. `lucaLinkManager` (`src/services/lucaLink/manager.ts`, 786 lines, OOP
     orchestrator over `SecureSocket`/`deviceRegistry`/`sessionManager`) — used for
     `sendResponse`, `command:received` (`App.tsx:1523-1542`).
  2. `lucaLink as lucaLinkService` (`src/services/lucaLinkService.ts`, **2729
     lines**, raw socket.io relay/mesh + guest handler + approval queue) — used for
     `getState`, `send`, `initGuestHandler`, UI-state sync (`App.tsx:1140`,
     `:1983`).
  3. A raw `lucaLinkSocketRef` (`App.tsx:235`) that `emit`s `client:message`
     directly (`App.tsx:696, 2093, 2117`).
  Three transports for one feature is the highest-priority structural issue here.
  *Follow-up:* converge on `LucaLinkManager` as the single façade and route the
  socket service + raw ref behind it.

- **Device approval / linking** logic exists in depth under
  `src/services/lucaLink/` (`lucaLinkApprovalQueue`, `lucaLinkMultiHostApproval`,
  `lucaLinkDeviceTrustRegistry`, `lucaLinkTrustPolicy`, `runtimeAuthority/*`,
  `lucaLinkRuntimeEnforcementGate`). Much of it is pure policy + readiness, and
  some of its tests are currently red (see §8) — i.e. the enforcement gate is
  modeled but the model and its tests have drifted.

- **Settings "Personal Intelligence" section naming mismatch.** The settings
  navigation union (`settingsNavigationModel.ts:30-49`) has **no
  `personal-intelligence` tab**; PI is surfaced under the existing `data` tab
  (`SettingsDataTab.tsx` renders the PI approval/mission/persistence/trace panels).
  But `settingsPreviewIntegration.test.ts:34` asserts a section
  `id === "personal-intelligence"`, which the type union proves cannot exist
  (TS2367, "no overlap"). This is stale test / naming drift — **(uncertain)**
  whether the intent was a dedicated PI tab that never landed, or whether the test
  should target `data`. Left for a follow-up product decision (see §9).

---

## 4. What is mock / scaffold only (and intentionally so)

These are **not bugs** — they are deliberately inert governance previews. They
should be *labeled as such in code* so a new reader does not "complete" them by
accident.

- **Operation Center bridge** (`src/operation-center/operationCenterBridge.ts`)
  builds governance summaries from a hardcoded `FIXTURE_TIME =
  "2026-06-07T12:00:00.000Z"` and imports only **`type`** from PI/LucaLink. It
  emits human-readable summaries, not actions.

- **OperationPermissionCenter** seeds its list from `operationCenterFixtureItems`
  plus in-memory `state.gates` from `useSkillPermissionGrants`
  (`OperationPermissionCenter.tsx:69-75`). Its own subtitle says: *"State is
  in-memory, expiring, and non-executing."* and each card renders
  `sideEffectsPerformed: false`. Intentional.

- **PI runtime trace / learning events** (`personal-intelligence/runtime/*`)
  produce events with `persisted: false`, `writePerformed: false` by design.

- **`*Readiness` / `*Fixtures` / `*SourceSafety` modules** across
  `personal-intelligence/*`, `operation-center/*`, and
  `services/lucaLink/runtimeAuthority/*` are evaluators/fixtures, not runtime
  wiring. The `*SourceSafety.test.ts` files even read component source via
  `?raw` and assert on it — a guard that the UI stays non-executing.

---

## 5. What is duplicated

- **LucaLink transports** — see §3 (manager vs `lucaLinkService` vs raw socket
  ref). Highest priority.

- **"Model Router" is three things, one of which is the real one:**
  - `ModelManagerService` — the hub (~25 importers).
  - `ModelRouterService` (`src/services/ModelRouterService.ts`) — a profile-based
    recommender with a **hardcoded** `PROFILE_MAP` of model IDs
    (`"qwopus-3.5-27b"`, etc., `:17-22`). Imported by exactly **one** non-test
    module (`skillTriggerService.ts`).
  - `CapabilityRouter` (`src/services/CapabilityRouter.ts`) — imported by exactly
    **one** non-test module (`hybridVoiceService.ts`).
  Naming implies a single router; reality is one hub + two near-orphans.

- **`secureVault` exists twice**: `secureVault.ts` (the live one — used by
  `ProviderKeyService`, `settingsService`, `teleportationService`) and
  `secureVault.js` (used **only** by `cryptoService.js`, which itself has **no
  non-test importers**). The `.js` pair looks like a pre-TS-migration remnant.
  **(uncertain)** whether `cryptoService.js`/`secureVault.js` are loaded
  dynamically by `server.js`/native runtime — verify before removal.

- **Memory abstractions are layered/overlapping**: `memoryService.ts` (~22
  importers), `services/memory/*` (~14), `memoryStore.js` (~6), and
  `personal-intelligence/memory/*`. Not necessarily wrong (UI memory vs governed
  PI memory), but the boundaries are not documented and the names collide.

---

## 6. What should be removed later (not in this PR)

- `secureVault.js` + `cryptoService.js` if confirmed unreferenced at runtime.
- `ModelRouterService` and/or `CapabilityRouter` — fold into `ModelManagerService`
  or document why they are separate.
- Stale settings test expectation for a `personal-intelligence` section (§3) once
  the PI-tab product decision is made.
- General lint debt: ~38 lint errors are mostly **unused `eslint-disable`
  directives** and `@ts-ignore`→`@ts-expect-error` nits spread across unrelated
  files (trading, voice visualizer, etc.) — safe to sweep in a dedicated cleanup
  PR, out of scope here.

---

## 7. What must be fixed before beta

1. **Make the governance layer real, or rename it.** Either wire
   `personal-intelligence/runtime` + `runtimeAuthority` and the LucaLink
   enforcement gate into the live execution path, or rename "authority/enforcement"
   to "preview/advisory" so the product does not imply enforcement it does not do.
2. **Converge LucaLink onto one transport** (§3) — the 3-path setup is fragile and
   will leak race conditions across device linking/approval.
3. **Get `main` green.** 34 failing test files and a non-compiling `tsc` mean any
   future regression is invisible. Triage the drift failures (types extended,
   fixtures/tests not updated — see §8) and the `window is not defined` test-env
   failures (`src/mocks/node_polyfills.js:23`).
4. **Decide the PI settings surface** (dedicated tab vs `data` tab) and align the
   test.

---

## 8. Test & type-check drift (representative, not exhaustive)

The failing tests are dominated by **type/fixture drift inside the new
subsystems**, which is exactly what a fast PR chain produces:

- **Severe fixture drift: `RuntimeGovernanceDiagnostics`.** The type grew to ~24
  required properties (`reminders`, `inbox`, `sessions`, `approvalCenter`, +16
  more) but `RuntimeDiagnosticsPanel.test.tsx`'s fixture still defines only 7
  (`runtimeContinuity`, `scheduler`, `provenance`, `skills`, `memoryGovernance`,
  `visibility`, `safeSummary`) — and even `runtimeContinuity` was missing the
  now-required `deliveredReminderCount`. `tsc` reports TS2741 then TS2740. This is
  the clearest single example of types being extended across the PR chain without
  updating their fixtures/tests. Rebuilding this fixture is **not** lightweight
  (it requires plausible values for ~17 added fields), so it is left for PR A
  rather than fixed here.
- **Vitest has no `test` environment configured.** `vite.config.ts` defines no
  `test:` block, so vitest defaults to the **node** environment. Component tests
  that touch `window` (directly or via the `node_polyfills.js` alias at
  `src/mocks/node_polyfills.js:23`) throw `window is not defined` unless the file
  opts in with a `// @vitest-environment jsdom` pragma — a convention 10 component
  tests already follow but which several siblings omit. Some import chains hit a
  second gap: the aliased `crypto` mock lacks `randomBytes`, which
  `src/services/secureVault.ts:19` calls at module load. These are **global
  build-green issues** (PR A), not per-test bugs, and are out of scope here.
- `SkillRegistryPanel.tsx` and `personal-intelligence/skillSandbox/
  skillSandboxApproval.ts` call `String.prototype.replaceAll`, which the project's
  TS `lib` target rejects (TS2550/TS2551) — note the same helper in
  `OperationPermissionCenter.tsx:14` already uses `.replace(/_/g, " ")`.
  *(Fixed in this PR — see §10.)*
- Voice routing (`VoiceProviderRouter.test.ts`: `fallbackUsed` expected `true`,
  got `false`), runtime continuity loop, model/memory readiness resolvers, and
  several `lucaLink*` invariant tests are red — these encode **behavioral
  contracts** that drifted from the implementation. They need per-subsystem
  triage, not a blanket fix, so they are **out of scope** for this audit PR.

---

## 9. Recommended PR sequence after this audit

1. **PR A — green the build (no behavior change):** fix the remaining mechanical
   `tsc`/test-fixture drift (the field/`replaceAll`/lib-target class of errors) and
   the `window is not defined` jsdom-env config for the affected test files. Goal:
   `tsc --noEmit` clean + tests collecting.
2. **PR B — LucaLink transport convergence:** make `LucaLinkManager` the single
   façade; route `lucaLinkService` socket + the raw `lucaLinkSocketRef` behind it.
3. **PR C — PI runtime wiring (the big one):** feed live tool/mission execution
   into `personal-intelligence/runtime` trace + `runtimeAuthority`, and connect the
   LucaLink enforcement gate; flip Operation Center from fixtures to real state.
4. **PR D — Model Router consolidation:** fold `ModelRouterService` /
   `CapabilityRouter` into `ModelManagerService` (or document the split) and remove
   hardcoded `PROFILE_MAP`.
5. **PR E — settings PI surface decision** + dead-code sweep (`secureVault.js`,
   `cryptoService.js`, lint-disable debt).

---

## 10. Changes made in this PR (low-risk only)

Surgical, behavior-preserving fixes, each tied to a concrete error in an audited
subsystem. No providers, `App.tsx`, or product behavior touched.

- **Naming/lib fix (PI/Skill):** `String.prototype.replaceAll("_", " ")` →
  `replace(/_/g, " ")` in `src/components/SkillRegistryPanel.tsx` and
  `src/personal-intelligence/skillSandbox/skillSandboxApproval.ts`. Fixes TS2550 /
  TS2551 and matches the existing convention in `OperationPermissionCenter.tsx`.
- **Dead imports (onboarding path):** removed unused `Icon` and
  `getProvisionDownloadIds` imports from `src/components/Onboarding/OnboardingFlow.tsx`.
- **Scaffold clarity:** added a module-level doc comment to
  `src/operation-center/operationCenterBridge.ts` stating it intentionally produces
  **non-executing, fixture/in-memory** governance summaries, so future readers do
  not mistake it for an incomplete runtime integration.

Everything else in this document is **observation only** and deliberately left for
the sequenced PRs above.
