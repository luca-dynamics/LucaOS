# LucaLink Runtime Authority Boundary and Handoff Capability Registry

## Scope

This phase defines authority boundaries only. It adds a pure capability registry that classifies supplied LucaLink model outputs as:

- `permanently_blocked`;
- `review_only`;
- `dry_run_only`;
- `future_bounded_handoff_candidate`; or
- `unsupported`.

The registry, evidence builder, readiness summary, Device Center card, and Operation Center bridge are informational. They do not grant runtime authority or perform a runtime action.

## Invariants

Every authority record, evidence result, and readiness summary preserves:

- `authorityGranted: false`;
- `handoffEnabled: false`;
- `transportSendEnabled: false`;
- `adapterExecutionEnabled: false`;
- `displayOpenEnabled: false`;
- `sensorCollectionEnabled: false`;
- `fileWriteEnabled: false`;
- `installEnabled: false`; and
- `sideEffectsPerformed: false`.

No handoff, transport send, adapter execution, display open or cast, sensor collection, file write, package install, approval decision, host mutation, pairing mutation, connection mutation, or network action is enabled. Authority state is not persisted.

A future bounded handoff candidate is not sendable or executable. Dry-run handoff success is evidence only and is not handoff approval. Reviewing an approval notification does not authorize sending an approval decision.

## Authority classes

### Permanently blocked

Permanent blocks include shell commands, credential access, raw host data access, background surveillance, device control, host configuration mutation, pairing mutation, relay mutation, VPN connections, and unknown critical capabilities. An input that attempts to set authority or a runtime enablement flag to true is also blocked while the returned flags remain false.

### Review only

Sensor snapshot, approval notification, transport permission, adapter plan, display intent, and file/install permission model outputs may be summarized for human review. Review does not grant execution or send authority.

### Dry-run only

Handoff, transport send, adapter execution, display open/cast, sensor collection, file write, package install, approval decision send, browser automation, WebRTC connection, and guest-session mutation remain dry-run-only unless a low- or medium-risk item satisfies every candidate evidence requirement. Even then, it remains disabled.

### Future bounded handoff candidate

Candidate classification requires all of the following:

1. existing dry-run handoff evidence;
2. an `allowed_preview` or `approval_required` transport decision with evidence;
3. an explicit approval path;
4. no blocked or unsupported file/install decision;
5. no live sensor collection requirement;
6. no permanently blocked capability;
7. scoped source and target hosts;
8. expiry and redaction requirements; and
9. Operation Center visibility.

Critical-risk capabilities cannot become candidates. Candidate status only identifies evidence that may be reviewed in a later project.

### Unsupported

Incomplete declarations, malformed capability kinds, unsupported sources, and handoff-like capabilities without source/target host scope are unsupported and cannot enter a pilot.

## Evidence and Operation Center

The evidence builder summarizes source model, host scope, transport permission, approval path, dry-run evidence, expiry/redaction requirements, blocked actions, file/install status, sensor restrictions, display restrictions, and future pilot requirements. No evidence item grants authority.

Operation Center uses the `lucalink_runtime_authority` category and maps permanent blocks to `blocked`, review-only records to `ready_for_review`, dry-run-only records to `model_only`, candidates to `approval_required`, and unsupported records to `unsupported`. Cards remain immutable summaries with execution disabled.

## Separate future pilot requirements

A bounded handoff pilot requires a separate explicit implementation and review. At minimum it must include enforced transport and host boundaries, expiry and redaction, rollback, durable audit, explicit approvals, deny-by-default capability enforcement, and security review. Nothing in this boundary layer pre-approves that work.
