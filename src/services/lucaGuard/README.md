# LucaGuard scaffold

Minimal additive Luca Guard policy layer aligned with:
- `docs/security/GUARD_SECURITY_SPEC.md`
- `docs/runtime/MISSION_ENGINE_SPEC.md`

This scaffold provides:
- risk/trust/action/context policy types
- rule-based policy evaluation
- approval requirement derivation
- audit event construction
- MissionEngine-compatible `GuardHook` via `evaluateStepRisk()`
- `evaluateMissionStep()` for richer guard decisions

Design constraints:
- deny by default for dangerous actions without explicit approval
- sandbox preference for untrusted or high-risk actions
- Core mode blocks evolution mutation actions

This is not deeply wired into production runtime yet.
