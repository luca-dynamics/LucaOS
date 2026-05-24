# Mission Engine Spec

## Purpose
Define Luca's deterministic mission execution lifecycle across chat, voice, browser, and host-control workloads.

## Canonical Pipeline
`intent → context scan → requirements extraction → plan → risk check → approval (if required) → execute atomic steps → verify each step → recover/retry if needed → final verify → record mission tape → report`

## Role Separation
- **Planner**: converts intent into atomic operations and explicit verification contracts.
- **Executor**: runs approved operations through tools, MCP, plugins, browser body, or host controls.
- **Verifier**: enforces deterministic checks (tests/build/smoke/assertions/file checks).
- **Recovery**: restores checkpoint state, retries safely, or escalates.
- **Recorder**: persists mission tape, score, lessons, and trajectory metadata.

## Atomic Operation Contract
Each atomic step MUST define:
- `step_id`
- `goal`
- `tool_or_runtime`
- `expected_output`
- `verification`
- `rollback`
- `risk_level`

## Checkpointing & Rollback
For long-running or risky missions, checkpoint includes:
- active plan index
- tool/runtime context
- relevant file/state snapshots
- model route
- latest successful verification
- recovery branch

## Status Lifecycle
`queued → planned → awaiting_approval | executing → verifying → recovered → completed | failed | aborted`

## Guard & Approval Gates
- Sensitive actions require Luca Guard policy evaluation.
- Dangerous actions require explicit approval or policy deny.
- Untrusted skill/browser flows default to sandbox lane.

## Completion Criteria
A mission can be marked complete only when:
1. deterministic verification passes OR approved override exists,
2. mission tape is recorded,
3. result is reported with outcome + evidence.

## Acceptance Scenarios
1. Failure mid-task restores prior checkpoint and resumes.
2. Build/test failure triggers autonomous diagnosis + retry.
3. Risky action pauses for guard decision and approval path.
