# Computer-use Focus Context + Action Planner

Minimal context-modeling and planning scaffold for computer-use focus signals and candidate actions.

## Scope

- Define shared types for cursor, region, focused element, screenshot, user-pointed target grounding, and action planning.
- Build immutable-ish context snapshots through `ComputerUseFocusContextBuilder`.
- Build planning-only action candidates through `ComputerUseActionPlanner`.
- Encode safety defaults and metadata only.

## Rules encoded in scaffold

- Default execution mode is `sandbox`.
- Untrusted contexts prefer and force `sandbox` execution mode.
- Dangerous contexts mark `requiresGuardApproval` when approval metadata is not provided.
- User-pointed targets are recorded as high-value grounding signals.
- If no reliable focus target exists, planner falls back to `observe`.
- User-pointed targets can produce `click` candidates.
- Focused `textbox` element with text payload can produce `type_text` candidates.
- Non-observe actions inherit `requiresGuardApproval` from the focus context.
- Observe fallback remains `requiresGuardApproval: false`.
- Planner never executes actions.
- No mouse or keyboard actions are executed.
- No system API calls are performed.
- This service is context modeling and planning only.
