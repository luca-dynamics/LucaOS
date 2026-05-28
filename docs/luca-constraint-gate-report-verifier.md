# Luca Constraint Gate Report Verifier

Date: 2026-05-28 (UTC)

## Purpose
Define a pure verifier contract for constraint gate reports returned by a future external self-evolution lab before any Origin candidate review action.

This verifier:
- validates gate report completeness and failures,
- emits blocking reasons and warnings,
- marks Origin-review-required policy gate surfaces,
- never auto-promotes candidates.

## Exported functions
- `verifyConstraintGateReport(input)`
- `summarizeConstraintGateResults(results)`
- `getConstraintGateReportVerifierSnapshot(input?)`

## Required behaviors
- failed `safety` gate blocks promotion consideration.
- failed `regression` gate blocks candidate selection.
- missing `rollback` gate warns for low/unknown risk and blocks for medium/high/critical risk.
- missing/failed `eval` gate blocks when `evalRequired=true`.
- runtime/computer-use/filesystem/network/voice policy gate kinds require Origin review.
- unknown gate kinds produce warnings by default.
- no auto-promotion.

## Verifier output envelope
- `ok`
- `severity`
- `blockingReasons`
- `warnings`
- `requiredOriginReview`
- `promotionAllowed` (always `false` from verifier)
- `metadata`

## Runtime posture
Contract verifier only:
- no shell/provider/runtime calls,
- no optimizer execution,
- no mutate/commit hooks,
- no runtime behavior auto-apply.
