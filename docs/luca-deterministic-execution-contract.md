# Luca Deterministic Execution Contract
Date: 2026-05-28 (UTC)
Status: Pure TypeScript contract/helper layer

## Implementation reference
The contract is implemented in `src/services/execution/LucaDeterministicExecution.ts` and exported through `src/services/execution/index.ts`.

## Contract purpose
The deterministic execution contract gives LucaOS a shared language for representing intent, plans, steps, risk, permission posture, and runtime safety posture before any future execution layer is allowed to act.

## Key models
- `LucaExecutionIntent`: captures user/system intent without performing work.
- `LucaExecutionPlan`: groups deterministic steps, aggregate risk, permission mode, rollback hint, receipt requirement, and `liveExecutionAllowed: false`.
- `LucaExecutionStep`: represents one bounded action category.
- `LucaExecutionRuntimePosture`: permanently false defaults for this architecture PR:
  - `runtimeBehaviorChanged: false`
  - `liveExecutionEnabled: false`
  - `autonomousExecutionEnabled: false`
  - `persistenceEnabled: false`
  - `networkCallsEnabled: false`

## Step kinds
`tool_call`, `voice_command`, `computer_use`, `filesystem`, `network`, `skill`, `memory`, `device_control`, `self_evolution`, and `unknown`.

## Permission posture
Unknown actions default to blocked. Critical actions require Origin review or remain blocked. Computer-use, filesystem, network, device-control, and self-evolution actions require confirmation or Origin review depending on risk and actor tier.

## Future integration map
- **Voice runtime** should eventually convert confirmed voice intent into `LucaExecutionIntent`, not direct mutation.
- **Tools/skills** should expose capability metadata that can be checked before execution.
- **Computer-use** should require deterministic plans, user confirmation, rollback/correction paths, and receipts.
- **Memory** should use receipts to avoid silently promoting unverified outcomes into long-term memory.
- **Self-evolution proposals** should attach deterministic execution receipts before Origin promotion.
- **Origin/Tactical/Normal tiers** should govern who can request, review, or approve risky plans.
- **External self-evolution lab** should return artifacts that can be represented as plans/receipts, not auto-applied.
- **Future robot/device embodiment** should treat physical actions as high/critical risk with explicit rollback and human review.

## Non-goals
No execution, no tool calls, no file writes, no network calls, no persistence, no optimizer execution, and no UI wiring are introduced by this contract.
