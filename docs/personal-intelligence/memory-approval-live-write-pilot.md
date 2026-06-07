# Personal Intelligence Memory Approval and Live-Write Pilot

PR #211 adds the operator-facing approval checklist, safe fixture dry-run, and controlled live-write pilot layer for governed Personal Intelligence memory persistence. It extends the existing **Data & Memory → Personal Intelligence Persistence** section; it does not create a new Settings tab or replace the persistence preview from PR #207.

## Safe default posture

The approval pilot state starts with:

- the pilot disabled;
- live write disabled;
- dry-run-first required;
- explicit user approval required;
- approval confirmation unset; and
- no prior dry-run or live-write result.

Rendering the component performs no write. The only UI action in this PR runs the non-sensitive sample proposal through the dry-run helper. The UI does not expose a live-write button while the pilot remains disabled.

## Required live-write gates

The live-write helper blocks unless all of the following are true:

1. The controlled pilot is enabled.
2. The live-write toggle is enabled.
3. A successful governed dry-run exists and reports no side effects.
4. The operator has explicitly confirmed approval.
5. The exact confirmation phrase is accepted.
6. Valid explicit user approval metadata is attached to the proposal.
7. Persistence policy permits governed review and reports no blockers.
8. A matching side-effect-free validation audit exists.
9. A valid matching rollback plan is ready for the adapter.
10. Content sanitization rejects no prompt, reasoning, raw-file, credential, secret, key, or token material.
11. The Privacy Zone is allowed by the adapter configuration; sensitive writes remain disabled by default.
12. LucaLink synchronization remains disabled.
13. Every governed adapter gate passes.

The pilot helper never calls `memoryService.saveMemory`. It delegates both dry-run and live attempts to `persistApprovedMemoryProposalWithGovernance`, preserving the sole write boundary added in PR #209.

## Approval checklist

The UI evaluates and displays these checks:

- proposal exists;
- proposal status is `approved_for_future_adapter`;
- explicit user approval metadata exists;
- policy has no blockers;
- validation audit exists;
- rollback plan exists;
- adapter is enabled in dry-run mode;
- dry-run completed without side effects;
- live-write toggle is enabled;
- confirmation phrase is accepted;
- content safety passed;
- sensitive Privacy Zone is not blocked; and
- LucaLink synchronization is disabled.

## Safe fixture

The in-repository fixture is a project-scoped, non-sensitive preference:

> Prefers concise project updates with explicit decisions and next steps.

It includes approved proposal metadata, a validation audit, a ready rollback plan, and policy evaluation solely for UI demonstration and tests. It contains no credentials, private reasoning, hidden prompts, raw files, secrets, or token-like material.

## Audit scope

Approval audit records in this PR are pure in-memory values. They can describe pilot views, dry-run requests/completions, and blocked/completed/failed live-write attempts, but this PR does not persist that audit trail.

## Explicit non-goals

- No write occurs during render or preview.
- The UI never imports or calls `memoryService` directly.
- No raw Personal Intelligence memory is synchronized through LucaLink.
- No model router, provider, skill, workflow, generated-code, adapter-execution, MCP, filesystem, network, Electron IPC, or duplicate memory-engine behavior is added.
- Real user-sourced proposal selection and a persistent approval audit trail remain future work.

## Runtime evidence follow-on

The runtime trace and learning-event phase follows PR #211 without widening the pilot's authority. It may represent the safe dry-run fixture and blocked live-write posture as in-memory evidence, but it does not invoke the dry-run or live-write helpers from render, mutate pilot state, call the governed adapter, or persist a learning event. Any future learning-derived memory write must still pass through proposal → policy → approval → dry-run → governed adapter.
