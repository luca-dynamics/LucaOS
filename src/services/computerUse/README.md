# Computer-use Focus Context

Minimal context-modeling and planning scaffold for computer-use signals.

## Scope

- Define shared types for cursor, region, focused element, screenshot, and user-pointed target grounding.
- Build context snapshots through `ComputerUseFocusContextBuilder`.
- Plan candidate actions through `ComputerUseActionPlanner`.
- Encode safety defaults and metadata only.

## Rules encoded in scaffold

- Default execution mode is `sandbox`.
- Untrusted contexts prefer and force `sandbox` execution mode.
- Dangerous contexts mark `requiresGuardApproval` when approval metadata is not provided.
- User-pointed targets are recorded as high-value grounding signals.
- If no reliable focus target exists, planner returns `observe` rather than click/type.
- User-pointed target can produce a candidate `click` action.
- Focused input with payload can produce a candidate `type_text` action.
- No mouse or keyboard actions are executed.
- No system API calls are performed.
- This service is context modeling and planning only.
