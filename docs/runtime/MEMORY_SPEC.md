# Memory Spec

## Scope
Operational memory stores context needed for continuation, recovery, personalization, and closed-loop improvement.

## Memory Classes
- **Session memory**: volatile, mission-local.
- **Operational memory**: persistent mission tapes, tool outcomes, recovery patterns.
- **Policy memory**: user preferences, permission history, trust state.
- **Skill memory**: refinement hints, validated strategy patterns.

## Required Properties
- provenance (source + timestamp)
- policy tags (read/write sensitivity)
- retention semantics (ttl/refresh/archive)
- conflict strategy (merge/replace/reject)

## Write Policy
- Memory writes from high-risk actions require stronger validation.
- Reflection outputs are staged before becoming active guidance.
- Imported data remains isolated until normalized.

## Existing Repo Anchors
- `cortex/server/services/evolutionService.js`
- `cortex/server/services/SkillDropService.js`
