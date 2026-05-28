# Luca External Evolution Import Adapter

## Purpose
`ExternalEvolutionImportAdapter` is a review-only translation layer for external lab artifacts. It converts accepted external envelopes/bundles into LucaOS-compatible `LucaEvolutionProposal`, `LucaEvolutionRun`, and candidate metadata objects for Origin review.

## Safety Contract
- Origin review is always required.
- Invalid/unsupported schema versions are blocked.
- Candidate bundles map to proposal + candidate metadata only.
- PR-back reports map to proposal metadata only.
- No runtime auto-apply.
- No local mutate/commit behavior.
- No file write behavior.
- No auto-merge behavior.

## Role Rules
- `origin`: may import all supported artifacts (subject to validation).
- `tactical`: may request/import only low-risk artifacts; high/critical risk imports are blocked.
- `normal`: cannot import external lab artifacts.

## PR 87 Dependency Note
If external artifact schema definitions from PR 87 are not yet merged, the adapter uses local compatible types from `ExternalEvolutionArtifacts.ts` and strict `schemaVersion` guarding (`1.0.0`).
