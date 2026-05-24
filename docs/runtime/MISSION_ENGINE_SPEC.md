# Mission Engine Spec

## Purpose
Define LucaOS mission execution semantics for durable, recoverable, auditable work.

## Mission Record Minimum Fields
- mission_id, user_intent, created_at
- plan_steps, selected_model_route
- tools/skills invoked
- policy checks and guard outcomes
- artifacts and outputs
- success/failure state
- reflection summary

## Execution Phases
1. **Intake**: normalize user intent and constraints.
2. **Planning**: decompose into bounded steps.
3. **Preflight Guard**: evaluate required permissions/risk profile.
4. **Execution**: invoke model + tools + skills.
5. **Checkpointing**: save resumable state for long operations.
6. **Completion**: return result and persist tape.
7. **Reflection**: emit learning candidates.

## Reliability Rules
- Long-running missions must checkpoint before risky/irreversible actions.
- Recovery resumes from last successful checkpoint.
- Any failure path must preserve traceability.

## Current Code Anchors
- `cortex/server/services/cortexService.js`
- `cortex/server/services/evolutionService.js`
