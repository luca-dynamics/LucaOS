# Computer-use Focus Context

Minimal context-modeling scaffold for computer-use focus signals.

## Scope

- Define shared types for cursor, region, focused element, screenshot, and user-pointed target grounding.
- Build immutable-ish context snapshots through `ComputerUseFocusContextBuilder`.
- Encode safety defaults and metadata only.

## Rules encoded in scaffold

- Default execution mode is `sandbox`.
- Untrusted contexts prefer and force `sandbox` execution mode.
- Dangerous contexts mark `requiresGuardApproval` when approval metadata is not provided.
- User-pointed targets are recorded as high-value grounding signals.
- No mouse or keyboard actions are executed.
- No system API calls are performed.
- This service is context modeling only.
