# Luca PR-Back Metadata Verifier

Date: 2026-05-28 (UTC)
Status: Contract + pure verifier (no runtime mutation)

## Purpose
Define a pure metadata verifier for PR-back artifacts produced by future LucaOS self-evolution lab workflows.

## Verifier API
- `verifyPrBackMetadata(input)`
- `getPrBackMetadataVerifierSnapshot(input?)`

## Enforced rules
- Repo metadata must match allowed repo or known LucaOS repo metadata (if provided).
- PR-back artifact must include `pullRequestUrl` or `pullRequestNumber`.
- If candidate claims finalized state, `commitSha` is expected (warning if absent).
- `requiresOriginReview` must be `true`.
- Untrusted `sourceRepo` yields warning and blocks candidate.
- External lab PRs cannot auto-merge.
- No GitHub/network calls.
- No auto-apply behavior.

## Output contract
Verifier result includes:
- `ok`
- `severity`
- `trustedRepo`
- `requiredOriginReview` (always `true`)
- `canAutoMerge` (always `false`)
- `blockingReasons`
- `warnings`
- `metadata`

## Runtime posture
This verifier is contract validation only. It does not call GitHub APIs, does not mutate/commit through evolution service, and does not auto-apply runtime changes.
