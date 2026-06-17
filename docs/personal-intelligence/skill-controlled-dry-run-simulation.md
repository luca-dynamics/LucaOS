# Personal Intelligence Controlled Skill Dry-run Simulation

## Scope

This phase adds a pure, side-effect-free simulation layer between Skill Registry inspection and any future execution pilot. It accepts a registry entry, sandbox plan, review-only permission gates, optional mission alignment context, and trace context, then produces reviewable evidence.

Every simulation keeps these invariants:

- `dryRunOnly: true`
- `executionEnabled: false`
- `canExecute: false`
- `readyForExecution: false`
- `sideEffectsPerformed: false`

A successful dry-run means **ready for human review**, not ready for execution. A `granted_for_review` gate is never execution authorization.

## Deterministic evidence

The simulator prepares nine evidence steps:

1. Inspect manifest.
2. Review sandbox plan.
3. Check permission gates.
4. Check mission alignment.
5. Prepare runtime trace.
6. Prepare rollback expectations.
7. Skip or block Act.
8. Verify the dry-run result.
9. Prepare a learning candidate without persistence.

The Act stage is always skipped or blocked. The trace preview records Sense, Understand, Plan, Approve, Act, Verify, and Learn, but it is not persisted. Learn is candidate evidence only.

## Explicit non-capabilities

The dry-run does not execute skills or generated code. It does not call tools, MCP, workflows, providers, the model router, memory services, governed memory adapters, live-write helpers, LucaLink, files, network APIs, browser automation, shell processes, package installers, or runtime display surfaces. It does not dynamically load an entrypoint and does not persist simulation state.

Operation Center cards may summarize simulation status, missing approvals, blockers, and blocked actions. Those cards are read-only model output and cannot mutate runtime state.

## Future work

A future Controlled Skill Execution Pilot would require a separate, explicit execution-authority boundary, an isolated runtime, enforceable rollback behavior, and a durable audit trail. None of those capabilities are introduced here.

## Runtime authority boundary

Dry-run evidence may now be classified by the [Runtime Authority Boundary](./runtime-authority-boundary.md). A successful simulation can support future-pilot review, but it does not grant authority and remains non-executable. Dry-run success is not execution approval.
