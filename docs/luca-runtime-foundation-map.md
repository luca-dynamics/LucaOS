# Luca Runtime Foundation Map

This map summarizes the final scaffold-stage runtime foundation across mission/computer-use/voice/UI bridges.

## 1) Mission Runtime

- Mission-facing computer-use runtime entrypoint/runner/dispatch surfaces are scaffolded.
- Mission runtime registry/dispatcher boundaries route only supported step kinds and reject unsupported inputs safely.
- Mission execution integration remains local-runtime scaffold wiring (no real external mission engine import/execution).

## 2) Computer-use Runtime

- Focus context, action planner, executor delegation, verifier, and recovery planner are implemented as scaffold services.
- Pipeline composition is complete for plan → execute → verify → recover → record orchestration shape.
- Execution remains adapter-gated and safety-first.

## 3) Guard + Confirmation

- Guard bridge classifies risk and enforces scaffold policy outcomes (`allowed`, `denied`, `needs_confirmation`).
- Confirmation bridge tracks pending approvals and approve/reject flow for risky actions.
- Critical/system-like intents remain denied in scaffold mode.

## 4) Mission Tape

- Runtime/tape event bridges are implemented with in-memory sinks by default.
- Guard and runtime adapter outcomes are auditable through scaffold event records.
- Persistent storage integration is intentionally deferred.

## 5) BrowserRuntime Bridge / Dry-run / Guarded Shell

- BrowserRuntime bridge and related adapters exist as contract boundaries.
- Dry-run and guarded adapter paths preserve non-executing behavior.
- Invocation guard scaffolds enforce explicit gating before future real browser invocation.
- No Playwright/browser process execution is enabled.

## 6) Voice Runtime

- Voice runtime lifecycle, event bridge, and composed factory surfaces are scaffolded.
- Voice session/tape recording is in-memory scaffold-only.

## 7) Voice Provider Routing / Readiness

- Provider router and backend registry scaffolds are implemented.
- Readiness evaluation supports future feature-flag-gated real-provider enablement.
- Local/cloud/BYOK lanes remain metadata-only in this phase.

## 8) Voice Streaming / Audio API

- Streaming runtime and OpenAI-compatible audio API are contract-level scaffolds.
- No real transport/provider execution is performed.

## 9) Voice HUD / Onboarding / Confirmation

- Voice HUD runtime bridge, onboarding bridge, and computer-use confirmation bridge are scaffolded.
- These support safe UI/service integration sequencing without enabling real execution.

## 10) Runtime-to-UI Bridges

- Service-level UI bridge scaffolds exist for voice mode, HUD subscriptions, onboarding flow, and computer-use confirmations.
- Snapshot/subscription contracts are ready for UI consumption while keeping runtime safety boundaries intact.

Related detail: [Runtime UI Bridge Map](./runtime-ui-bridge-map.md).
