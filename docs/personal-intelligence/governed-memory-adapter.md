# Governed Personal Intelligence Memory Adapter

PR #209 adds the first real integration bridge from an approved Personal Intelligence memory persistence proposal to LucaOS's existing `memoryService`. Unlike the proposal-only layer from PR #208, the adapter contains a live execution boundary that can call `memoryService.saveMemory`. It does not create or replace a memory engine.

## Default posture

The exported default configuration is intentionally non-operational:

- `enabled: false`
- `dryRun: true`
- private writes disabled
- sensitive writes disabled
- LucaLink synchronization disallowed
- explicit approval required
- validation audit required
- rollback plan required
- only `create` operations allowed
- credential, financial, health, and enterprise Privacy Zones blocked
- content limited to 2,000 characters

Because `enabled` is false, the default configuration blocks before conversion can become a persistence call. A reviewed caller must explicitly enable the adapter. Dry-run mode must then be explicitly disabled before a live call is possible.

## Required gates

`persistApprovedMemoryProposalWithGovernance` evaluates every gate before reaching the single legacy write boundary:

1. The proposal is a memory proposal.
2. Its status is `approved_for_future_adapter`.
3. Its proposal-layer `writePerformed` invariant is still `false`.
4. The adapter feature flag is enabled.
5. The requested operation is allowed.
6. The Privacy Zone is not blocked and the relevant private/sensitive write setting is enabled.
7. Valid explicit user approval metadata exists.
8. The persistence policy has no blockers and permits governed review.
9. A matching validation audit record exists.
10. A valid matching rollback plan is `ready_for_future_adapter` for create/update operations.
11. Sanitized content contains no forbidden prompt, reasoning, raw-file, attachment, credential, secret, key, or token material.
12. LucaLink synchronization remains disallowed by adapter configuration.

A blocked result reports no performed write and no side effects. A dry-run result includes the converted key, category, and sanitized value but does not call `memoryService`. A persisted result is possible only when the feature is enabled, dry-run is disabled, all gates pass, and `memoryService` returns a memory node.

## Legacy conversion

The adapter maps Personal Intelligence memory kinds onto existing `MemoryNode` categories:

| Personal Intelligence kind            | Legacy category |
| ------------------------------------- | --------------- |
| `identity`, `preference`              | `USER_STATE`    |
| `project`                             | `SEMANTIC`      |
| `decision`, `person`, `company`       | `FACT`          |
| `learning`, `device`, `runtime_event` | `AGENT_STATE`   |

Keys use the stable form `PI:<kind>:<title>`. Values use sanitized `MemoryItem.content`; recognized metadata footers are removed. Oversized text is truncated only at a safe sentence or paragraph boundary, otherwise the adapter blocks it.

The adapter calls the existing engine with automatic consolidation disabled:

```text
memoryService.saveMemory(key, value, category, false, importance)
```

All browser archive, backend, vector, Cortex/LightRAG, and other legacy behavior remains owned by `memoryService`. The adapter adds no direct local storage, network, filesystem, database, Electron IPC, tool, workflow, skill, or model-router operation.

## LucaLink boundary

PR #209 does not import, call, or modify LucaLink. The governed adapter does not expose a LucaLink synchronization dependency, and `allowLucaLinkSync` is fixed to `false`. Raw Personal Intelligence memory handoff remains forbidden in this PR. Any future bounded handoff design belongs to the separately reviewed PR #212 scope and must be minimal, redacted, expiring, and explicitly approved.

## Settings surface

The existing Data & Memory tab displays:

- adapter status;
- the disabled feature-flag default;
- the enabled dry-run default;
- a static last-result sample; and
- the statement that live writes require explicit enablement and approval.

The Settings component does not invoke the adapter or `memoryService.saveMemory`, and it exposes no write button.

## Approval pilot integration

PR #211 adds the companion approval UI and controlled pilot layer above this adapter. The existing persistence preview remains intact, and the new component renders directly below it in the Data & Memory section.

The pilot adds a safe fixture dry-run action and pure approval/checklist/audit state. Its dry-run helper forces `enabled: true`, `dryRun: true`, `allowSensitiveWrites: false`, and `allowLucaLinkSync: false`. Its live-write helper requires pilot enablement, live-write enablement, explicit confirmation, the exact confirmation phrase, and a successful side-effect-free dry-run before delegating to this governed adapter.

Neither the pilot UI nor its helper calls `memoryService.saveMemory` directly. The governed adapter remains the sole legacy write boundary and continues to enforce policy, validation audit, rollback, Privacy Zone, content-safety, operation, approval-metadata, and LucaLink-disabled gates.

## Future work

A future PR may add real user-sourced proposal selection and a persistent approval audit trail. Runtime trace and learning-event recording, mission-profile advisory/collaborative wiring, and any later bounded LucaLink handoff remain separately reviewed scopes.
