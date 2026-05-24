# Skills Runtime Spec

## Goal
Standardize skill lifecycle: ingest, normalize, validate, execute, observe, and evolve.

## Luca Skill Contract (Canonical)
- id, name, source, version
- description + capability declarations
- permissions and risk level
- memory policy
- tool bindings
- sandbox requirement

## Lifecycle
1. Import (internal/external)
2. Normalize into Luca schema
3. Validate signature/metadata/policy compatibility
4. Register to execution engine
5. Execute with telemetry + guard checks
6. Record outcomes for refinement

## Existing Components
- `cortex/server/services/ProtocolSkillEngine.js`
- `cortex/server/services/SkillDropService.js`
- `cortex/server/services/mcpClientManager.js`
