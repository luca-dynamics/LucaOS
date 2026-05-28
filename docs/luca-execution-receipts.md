# Luca Execution Receipts
Date: 2026-05-28 (UTC)
Status: Evidence model only; no persistence or runtime action

## Implementation reference
Receipts are implemented in `src/services/execution/LucaExecutionReceipt.ts`.

## Receipt purpose
A receipt records evidence about a represented or future executed action. It is not a storage mechanism, not an executor, and not a promotion signal by itself.

## Receipt fields
A `LucaExecutionReceipt` includes `id`, optional intent/plan/step references, `status`, `source`, `summary`, optional evidence refs, optional verification summary, risk level, actor tier, creation timestamp, metadata, and `runtimeBehaviorChanged: false`.

## Evidence references
`LucaExecutionEvidenceRef` can point to logs, screenshots, transcripts, diffs, test results, receipts, manual notes, or unknown evidence types. The helper only returns data; it does not read, write, upload, download, or persist evidence.

## Future integration map
- Voice should attach transcripts or confirmation summaries.
- Tools/skills should attach deterministic logs or outputs.
- Computer-use should attach screenshots, DOM observations, or mission tape references.
- Memory should require receipts before durable trust elevation.
- Self-evolution should require test/eval/constraint-gate receipts before Origin promotion.
- External labs should return candidate/eval/PR-back evidence as receipt-compatible references.
- Future robot/device embodiment should attach sensor/telemetry/manual confirmation evidence.
