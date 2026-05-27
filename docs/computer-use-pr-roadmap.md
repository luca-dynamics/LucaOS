# Computer-use Runtime PR Roadmap

This roadmap captures the merged mission/runtime/computer-use PR progression and recommends the next sequence after **PR #38**.

## Merged PRs (mission/runtime/computer-use track)

Ordered by merge sequence:

1. **PR #16** — scaffold computer-use verification and recovery service.
2. **PR #19** — scaffold computer-use Mission Tape bridge.
3. **PR #21** — scaffold computer-use pipeline orchestrator.
4. **PR #22** — add computer-use guard bridge and sandbox executor scaffolds.
5. **PR #24** — add computer-use browser bridge and pipeline factory scaffolds.
6. **PR #25** — add computer-use mission runtime integration scaffolds.
7. **PR #26** — add computer-use runtime factory and export surface.
8. **PR #27** — add computer-use mission runtime registry and dispatcher.
9. **PR #28** — add computer-use mission integration adapter.
10. **PR #29** — add computer-use Mission Tape event bridge.
11. **PR #33** — add BrowserRuntime adapter boundary.
12. **PR #34** — add computer-use runtime architecture map.
13. **PR #35** — add BrowserRuntime adapter event recording.
14. **PR #36** — add mission context to BrowserRuntime adapter events.
15. **PR #37** — refresh computer-use runtime map.
16. **PR #38** — Discover BrowserRuntime contract for computer-use.
17. **PR #40** — Add sandbox browser adapter behind explicit feature flag.

## Current status after PR #40 + conformance hardening

- Runtime layering and scaffold boundaries are documented and refreshed.
- BrowserRuntime contract discovery is complete.
- A type-only BrowserRuntime contract and no-op discovery probe now exist under `src/services/computerUse`.
- Real BrowserRuntime is still not imported or executed.
- Mission routing, guard bridge, and Mission Tape bridge scaffolds remain integrated, while key production runtime paths are intentionally staged.
- Sandbox browser adapter scaffold now exists behind explicit opt-in and remains simulation-only with real execution disabled by default.
- BrowserRuntime conformance matrix coverage now validates explicit sandbox action mapping and safe rejection/no-op dispositions for unsupported or not-yet-contracted actions.
- Cloud-agent validation constraints and scoped validation workflow remain required to gate risky rollout steps.
- Guard decisions now flow into mission tape runtime event recording (`decision`, `allowed`, `denied`, `needs_confirmation`) for pre-execution observability/auditability.
- Confirmation-required outcomes are now explicitly visible in tape before any real browser/direct-host execution path.
- Direct-host remains forbidden in scaffold mode.

## Next recommended PRs (strict sequence)

1. **Real MissionTape sink injection**
   - Add injectable real MissionTape sink path for runtime event persistence.
   - Preserve redaction defaults and keep in-memory sink as fallback/compatibility mode.

2. ✅ **Guard approval policy hardening** (completed in current branch)
   - Guard outcomes are explicit: `allowed`, `denied`, `needs_confirmation`.
   - Risk classification is explicit (`low`/`medium`/`high`/`critical`) with mission-tape-ready metadata fields (`missionId`, `stepId`, `actionType`, `riskLevel`, `status`, `reason`, `confirmationRequired`).
   - Write-like actions require confirmation by default, explicit approval context can allow in scaffold mode, and critical/system-like actions are denied.
   - Direct-host/system APIs remain forbidden in scaffold mode (`systemApisCalled: false`, `directHostAllowed: false`).

3. **BrowserRuntime router bridge integration/conformance tests**
   - Add router bridge integration coverage to verify contract conformance across discovery, routing, and adapter boundaries.
   - Require explicit assertions for unsupported-runtime handling and mission-scoped event continuity.

4. **Direct-host executor only after sandbox stability**
   - Defer direct-host executor enablement until sandbox adapter stability criteria are met.
   - Require explicit stability sign-off and rollback plan before any direct-host rollout.

## Parallel-change warning

To reduce merge conflicts and accidental boundary regressions, avoid overlapping edits in parallel PRs to these files unless absolutely necessary:

- `src/services/computerUse/types.ts`
- `src/services/computerUse/index.ts`
- `README.md`

Prefer narrow ownership per PR and rebase frequently when touching any shared contract/export surface.

## Cloud-agent validation note

Before and during the next sequence, follow the cloud-agent validation guide and helper workflow:

- `docs/cloud-agent-testing-environment.md`
- `ops/scripts/cloud-agent-validate-computer-use.sh`

Treat cloud-agent install/test constraints as first-class release risk for mission/runtime/computer-use changes.

## Latest scaffold addition

- Added a guard confirmation bridge scaffold for `needs_confirmation` outcomes with explicit in-memory approval token flow (`pending`/`approved`/`rejected`/`expired`).
- Added bridge helper/factory surface and tests for approve/reject/phrase/expiry/snapshot/reset behavior.
- Confirmation flow is audit-ready and event-ready (`confirmationId` payload support) without enabling real browser/direct-host/system execution.
- Future UI/Voice confirmation transport should wire to this contract before any production execution unlock.
