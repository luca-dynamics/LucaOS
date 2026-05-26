# Computer-use Runtime PR Roadmap

This roadmap captures the merged mission/runtime/computer-use PR progression and recommends the next sequence after **PR #37**.

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

## Current status after PR #37

- Runtime layering and scaffold boundaries are documented and refreshed.
- BrowserRuntime adapter boundary exists and records events with mission context, while browser/playwright/system execution paths remain non-live by default.
- Mission routing, guard bridge, and Mission Tape bridge scaffolds are integrated, but key production contracts are intentionally still staged.
- Cloud-agent validation constraints and scoped validation workflow are documented and should continue to gate risky rollout steps.

## Next 5 recommended PRs (strict sequence)

1. **BrowserRuntime contract discovery**
   - Define and lock the concrete BrowserRuntime contract for LucaOS mission/runtime integration.
   - Produce acceptance criteria for adapter capability probing and unsupported-runtime behavior.

2. **Sandbox browser adapter behind feature flag**
   - Introduce a sandbox-backed browser adapter implementation gated behind an explicit feature flag.
   - Keep current scaffold default behavior unchanged when the flag is disabled.

3. **Real MissionTape sink injection**
   - Add injectable real MissionTape sink path for runtime event persistence.
   - Preserve redaction defaults and keep in-memory sink as fallback/compatibility mode.

4. **Guard approval policy hardening**
   - Strengthen approval-required outcomes, policy reasons, and deny/allow audit shape.
   - Add strict tests for high-risk action classes and policy edge cases.

5. **Direct-host executor only after sandbox stability**
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
