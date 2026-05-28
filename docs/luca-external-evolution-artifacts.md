# Luca External Evolution Artifacts Contract

Date: 2026-05-28 (UTC)

This document defines canonical envelope contracts exchanged between LucaOS core and a future external `LucaOS-self-evolution` lab.

## Artifact kinds
- run_request
- context_bundle
- dataset_bundle
- candidate_bundle
- eval_report
- constraint_report
- pr_back_report
- rollback_report
- unknown

## Safety invariants
- Every external artifact is Origin-reviewed (`requiresOriginReview: true`).
- Missing `schemaVersion` is invalid and blocked.
- High-risk capability references (computer-use/filesystem/network/voice/runtime policy) are warning/blocked gated.
- Candidate bundles without evaluation summaries are warning or blocked depending on risk indicators.
- PR-back medium+ risk artifacts must include rollback metadata.
- Auto-promotion/runtime auto-apply remain disabled by contract.

## Canonical structures
- `LucaExternalEvolutionArtifactEnvelope`
- `LucaEvolutionContextBundle`
- `LucaEvolutionCandidateBundle`
- `LucaEvolutionArtifactValidationResult`

These structures are contract-only and do not execute optimizer engines or mutate runtime behavior.
