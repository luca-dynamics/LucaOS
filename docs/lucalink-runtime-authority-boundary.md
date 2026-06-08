# LucaLink Runtime Authority Boundary

## Purpose

The LucaLink runtime authority boundary is a pure, side-effect-free classification layer. It converts declarative LucaLink review models into authority records classified as `permanently_blocked`, `review_only`, `dry_run_only`, `unsupported`, or `future_bounded_handoff_candidate`.

A classification is evidence for review, not a runtime permission. The layer does not call LucaLink services, transports, adapters, displays, sensors, file systems, installers, approval senders, host controls, or persistence APIs.

## Permanent invariants

Every authority record, evidence bundle, and readiness summary reports:

- `authorityGranted: false`
- `handoffEnabled: false`
- `transportSendEnabled: false`
- `adapterExecutionEnabled: false`
- `displayOpenEnabled: false`
- `sensorCollectionEnabled: false`
- `fileWriteEnabled: false`
- `installEnabled: false`
- `sideEffectsPerformed: false`

The classifier rejects attempted authority or runtime-enable flags. Dry-run success does not authorize handoff, and an approval-notification review does not authorize an approval decision.

## Classification policy

Permanently blocked capabilities include shell commands, credential access, raw host-data access, background surveillance, device control, host configuration mutation, pairing mutation, relay mutation, VPN connection, and unknown critical capabilities.

Review-only records describe inert sensor snapshots, approval notifications, transport permission reviews, adapter-plan reviews, display-intent reviews, and file/install permission reviews. Dry-run-only records cover handoff, transport send, adapter execution, display open or cast, sensor collection, file write, package install, approval-decision send, browser automation, WebRTC connection, and guest-session mutation.

Malformed declarations, unsupported sources, and handoff-like declarations without scoped source and target hosts are unsupported.

## Future bounded handoff candidates

A low- or medium-risk capability may be classified as a future bounded handoff candidate only when all required evidence is present:

1. a dry-run handoff simulation exists;
2. transport is `allowed_preview` or `approval_required` with evidence;
3. an approval path exists;
4. no blocked or unsupported file/install decision exists;
5. no live sensor collection is required;
6. no permanently blocked capability is present;
7. source and target hosts are scoped;
8. expiry and redaction requirements exist; and
9. Operation Center visibility exists.

Critical risk is never eligible. Candidate status remains non-sendable and non-executable and requires a separate, reviewed pilot implementation before any runtime work.

## Registry and evidence

The capability registry accepts supplied adapter-plan, display-intent, approval-notification, sensor-snapshot, transport-decision, adapter file/install-decision, and dry-run-handoff declarations. It returns defensive record copies without persistence or runtime calls.

The evidence builder summarizes the source model, host scope, transport permission, approval path, dry-run evidence, redaction and expiry requirements, blocked actions, file/install status, sensor restrictions, display restrictions, and future-pilot requirements. Evidence never grants authority.

## Device Center and Operation Center

Device Center displays read-only class counts and disabled runtime flags. It exposes no operational controls and performs no polling.

Operation Center receives copied summaries under `lucalink_runtime_authority`. This category is separate from Personal Intelligence `runtime_authority`. Permanent blocks map to `blocked`, review-only records to `ready_for_review`, dry-run-only records to `model_only`, future candidates to `approval_required`, and unsupported declarations to `unsupported`. Operation Center cannot grant authority or perform LucaLink actions.
