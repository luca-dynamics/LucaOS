# Mission Profile Advisory and Collaborative Runtime

This phase makes Mission Profile useful as a bounded planning-context layer. It can summarize mission goals, constraints, success criteria, operating assumptions, project references, and Privacy Zone into an in-memory snapshot; evaluate a proposal with deterministic heuristics; and produce advisory or collaborative guidance for user review.

## Authority boundary

Mission Profile is **advisory/collaborative context, not autonomous execution authority**. An `aligned` result means only that a proposal text appears consistent with the bounded mission snapshot. Alignment does not approve an action, satisfy a runtime approval gate, or authorize a tool, skill, workflow, provider, device, browser, shell, or network operation.

Every recommendation has:

- `requiresApprovalBeforeAction: true`;
- `canExecute: false`; and
- `sideEffectsPerformed: false`.

Any future action still requires explicit user approval and all relevant runtime, privacy, and execution gates.

## Bounded mission snapshots

`createMissionContextSnapshot` defensively copies Mission Profile values and produces an ephemeral snapshot for advisory or collaborative review. It does not register the snapshot with runtime state or persist it to browser storage, a database, the filesystem, memory services, or a network endpoint.

The snapshot builder warns or blocks incomplete profiles and blocks hidden/system prompts, private reasoning, raw user files, credentials, secrets, private keys, and token-like material. A `supervised_execution` profile is reduced to advisory/collaborative context and carries no execution authority into the snapshot.

## Deterministic alignment evaluation

`evaluateMissionAlignment` uses local deterministic text-overlap and constraint heuristics only. It compares a proposal with goals, constraints, and success criteria and reports matched goals, violated constraints, uncovered criteria, risk, warnings, blockers, and user-review requirements.

Execution-oriented proposal text—such as file writes, installation, shell commands, network sends, device control, trades, payments, browser actions, or handoffs—always requires user review. A constraint violation is misaligned or blocked. Missing evidence produces `needs_review`. No result grants execution permission.

## Advisory and collaborative guidance

The advisory planner can recommend proceeding to review, revising, asking the user, blocking, splitting a task, or deferring. “Proceed” means **present a proposal to the user**, never execute it.

Collaborative guidance means working with the user through clarification questions, bounded next-step suggestions, explicit approval boundaries, and a list of blocked autonomous actions. The guidance layer does not mutate application state.

## Runtime trace and learning evidence

The trace bridge reuses the PR #213 runtime evidence model:

1. **Sense:** receive the bounded mission snapshot and proposal summary.
2. **Understand:** interpret goals, constraints, and success criteria.
3. **Plan:** prepare advisory guidance.
4. **Approve:** keep explicit user approval pending.
5. **Act:** skip autonomous action.
6. **Verify:** record that evidence needs review or was reported externally.
7. **Learn:** prepare a learning candidate only.

Mission traces are evidence only. Learning events remain proposal-ready, `persisted: false`, and `writePerformed: false`. This layer does not call memory persistence, adapters, or live-write helpers.

## Settings visibility

The existing **Data & Memory → Personal Intelligence Persistence** section includes a **Mission Profile Advisory Runtime** panel below Runtime Trace + Learning Events. It renders safe static fixtures for mission context, alignment, recommendation, collaborative guidance, and readiness. It has no action buttons and performs no render-time write.

Readiness means that safe advisory/collaborative previews can be shown. It never means execution authority; `autonomousExecutionEnabled` is always `false`.

## Explicit non-goals

This phase adds no:

- memory write or mission-profile persistence;
- prompt, system-prompt, hidden-prompt, personality, or skill mutation;
- model-routing change or provider call;
- tool, workflow, MCP, generated-code, shell, browser, or device execution;
- network, socket, Electron IPC, database, filesystem, or browser-storage operation; or
- LucaLink runtime, relay, WebRTC, VPN, transport, or handoff behavior.

## Future work

1. Connect mission context to an explicit chat planning-prompt **preview**, without hidden prompt mutation.
2. Add user-sourced mission editing with reviewed validation and privacy boundaries.
3. Add a separately governed persistent mission audit trail.
4. Add Skill Registry UI and static manifest loading in the existing Dashboard Skills modal, with execution disabled.
5. Plan a Skill Runtime Sandbox with explicit approval, permission, trace, and rollback gates.
6. Consider a separately reviewed Controlled Skill Execution Pilot.
7. Consider a bounded LucaLink handoff later with redaction, scope, expiry, explicit approval, and dedicated runtime gates.
