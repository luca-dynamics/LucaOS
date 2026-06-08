# Personal Intelligence permission grants and approval gates

## Scope

This layer converts the permission and approval requirements in a `PersonalIntelligenceSkillSandboxPlan` into inspectable permission gates. It is a UI-only review model shared by the existing Skill Registry modal and Dashboard right-side Control panel.

It does not create runtime authority. A grant means **granted for review**, not approved to run.

## Gate states

- `pending`: waiting for a local review decision.
- `granted_for_review`: temporary, scoped visibility for review; never execution approval.
- `denied`: locally denied for review.
- `expired`: a prior review grant is no longer valid.
- `blocked`: prohibited by sandbox policy and immutable in this UI.
- `requires_primary_approval`: requires authority outside this local review surface and cannot be granted here.

## Scope and expiry

Every gate is bound to one skill, manifest, and sandbox plan. Permission gates also retain their permission kind; approval gates retain their approval kind. A review grant expires after 15 minutes by default. Decisions and audit events exist only in React memory for the current app lifetime.

No state is written to local storage, session storage, IndexedDB, a database, files, memory services, or governed-memory adapters.

## UI bridge

The Skill Registry detail displays the selected plan's gates and local **Grant for review**, **Deny**, and **Expire** controls. Blocked and primary-approval gates cannot be granted locally.

The existing Dashboard `CONTROL` right panel hosts the global operational permission center. It summarizes all gate states, recent in-memory audit transitions, and the permanent execution blocker. No detached dashboard panel is introduced.

## Safety invariants

For gates, aggregate state, readiness, and audit output:

- `readyForExecution` is always `false`.
- `executionEnabled` is always `false`.
- `canExecute` is always `false`.
- `sideEffectsPerformed` is always `false`.
- `scope.executionAuthorized` is always `false`.

The UI contains no Run or Execute action and does not connect the Skill Registry to an execution callback. The permission layer does not invoke skills, tools, MCP, workflows, models, memory writes, LucaLink, browser automation, files, network APIs, sockets, or credential surfaces.

## Dashboard Operation Center consolidation

Skill permission gates are now one source feeding the broader Dashboard Operation Center. The existing in-memory gate summary remains visible, while normalized read-only cards also summarize memory approval, runtime trace, learning, mission alignment, skill sandbox, and LucaLink governance outputs.

This broader summary is informational only. It does not promote a review grant into execution authority and does not execute, send, persist, write, install, collect, or approve anything.

## Controlled dry-run use

Permission gates can be evaluated by the controlled skill dry-run simulator. Pending, denied, expired, blocked, and grant-for-review states affect review status, but no gate authorizes execution. In particular, `granted_for_review` means only that evidence may be reviewed.
