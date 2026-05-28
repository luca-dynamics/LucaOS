# Luca Evolution Governance Contract

## External Artifact Import Governance
All imported external artifacts are governance-subordinate to Origin.

### Required metadata flags
- `adapterOnly: true`
- `runtimeBehaviorChanged: false`
- `importedArtifactsRequireOriginReview: true`
- `autoApplyEnabled: false`
- `existingEvolutionServiceCalled: false`

### Import rules
- candidate bundle -> proposal/candidate metadata only.
- eval report -> review run object only.
- PR-back report -> proposal metadata only.
- unsupported schema/kind -> blocked.
- tactical high-risk import -> blocked.
- normal import -> blocked.
