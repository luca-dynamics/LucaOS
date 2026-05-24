# Model Routing Spec

## Objective
Route missions to the best available model/provider while preserving policy, cost, latency, and capability constraints.

## Routing Inputs
- task type and complexity
- required tools/modalities (text, code, vision, automation)
- privacy/security requirements
- budget and latency targets
- fallback availability

## Routing Policy
1. Select primary route by capability-policy fit.
2. Validate provider compatibility with guard/security rules.
3. Execute with telemetry.
4. On degradation/failure, fail over to approved secondary route.

## Guarantees
- Route changes must not bypass permission/guard checks.
- Critical missions should support deterministic fallback tiers.

## Code Touchpoints
- `src/tools/providerSurfaceRegistry.ts`
- `cortex/server/services/cortexService.js`
- `cortex/python/list_models.py`
