# Skill Runtime Sandbox Planning

## Scope

This phase adds a **side-effect-free planning layer only**. It converts an inspected `PersonalIntelligenceSkillRegistryEntry` into a sandbox plan describing permission requirements, approval gates, evidence traces, rollback expectations, allowed review surfaces, blocked runtime surfaces, and aggregate readiness.

A sandbox plan is not a runtime, dry-run executor, permission grant, or approval. Every plan reports `executionEnabled: false`, `canExecute: false`, and `sideEffectsPerformed: false`.

## Safety boundary

The planner does not execute skills or generated code. It does not load entrypoints, invoke tools or MCP, run workflows, call providers or the model router, access the memory service or governed memory adapter, perform LucaLink handoff, access files, make network or socket calls, automate a browser, control devices, run shell commands, install packages, or persist plans in browser storage, databases, or files.

Manifest entrypoint references remain inert display text. Planning functions are deterministic transformations of already-inspected registry data, apart from caller-controllable identifiers and timestamps.

## Policy and permissions

Low-risk read-only planning and formatting skills may be `ready_for_review`; they never become executable. Medium-risk skills require approval and trace evidence. High-risk skills additionally require future isolation and rollback planning. Critical skills and declarations involving shell, installation, credentials, payment, device control, surveillance, or exfiltration are blocked.

Network, file, browser, LucaLink, and connector declarations require separate permission models and cannot execute in this phase. Model, tool, memory, and connector declarations require explicit approval. All planned approvals have `satisfied: false`: **approval planning does not satisfy approval**.

## Runtime trace evidence

The trace bridge uses the existing Sense, Understand, Plan, Approve, Act, Verify, and Learn evidence model. The Act stage is skipped or blocked and records that no execution occurred. Learning output is a proposal candidate only; it is not persisted and performs no write.

## Rollback expectations

Because no execution occurs, there is nothing to roll back in this phase. Rollback records are future requirements. Medium- and high-risk skills, plus any future memory, file, network, browser, or device action, must define restoration or compensation steps before a separately reviewed runtime pilot.

## Existing UI

Sandbox status is shown inside the existing Dashboard Skills Matrix / Skill Registry detail view. The modal shows status, execution disabled, sandbox mode, permissions, approvals, trace requirements, rollback expectations, and allowed and blocked surfaces. It adds no Run button and does not connect the existing `onExecute` path.

## Future work

Future changes require separate review:

1. explicit permission-grant UI;
2. approval gates;
3. controlled dry-run simulation;
4. a controlled skill execution pilot; and
5. later bounded LucaLink handoff governance.

## Controlled dry-run handoff

Skill sandbox plans can now feed the controlled skill dry-run simulator together with permission gates and optional mission context. The resulting evidence is informational only: Act remains skipped or blocked, all runtime authority flags remain false, and the plan cannot execute a skill.
