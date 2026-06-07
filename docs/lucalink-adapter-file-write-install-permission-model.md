# LucaLink Adapter File Write + Install Permission Model

## Scope

This milestone adds a pure governance and policy-evaluation layer for declarative LucaLink adapter requests involving `file.write.request` and `install.request`. It models requests, validates classifications and evidence, evaluates policy, creates review decisions, summarizes readiness, and produces in-memory audit records.

It does **not** provide file-write or install authority:

- No file writes, modifications, deletions, or directory creation occur.
- No packages, helpers, connectors, dependencies, scripts, or binaries are installed.
- No shell or package-manager command is run.
- No package or metadata download and no remote verification occurs.
- No adapter entrypoint, generated code, script, installer, tool, or workflow is loaded or executed.
- No transport message is sent and no host, pairing, connection, approval queue, or runtime lifecycle is mutated.
- No permission request or audit record is persisted.

Every request, decision, readiness summary, and audit record reports `sideEffectsPerformed: false`. Decisions also report `allowedForExecution: false`, `writeEnabled: false`, `installEnabled: false`, and `sendable: false`. The executable and sendable helpers always return false.

## File-write policy

File-write requests classify the target path and file type, describe content rather than carrying raw content, record overwrite and backup expectations, and include privacy, risk, provenance, digest, signature, and rollback metadata. System and executable paths, home dotfiles, executable/script/binary content, sensitive content, and unknown classifications are denied. User-document writes require explicit user approval metadata and backup. Overwrites require backup and rollback metadata. Medium-or-higher risk writes require provenance, digest, signature, and rollback evidence.

App configuration, app data, temporary sandbox, cache, and log requests may reach `ready_for_review` or `approval_required`. These statuses mean only that a human may review the inert request; they never enable writing.

## Install policy

Install requests classify package kind, scope, and source and record required permissions, network/admin/shell requirements, privacy, risk, provenance, digest, signature, rollback, and uninstall metadata. Shell-required, administrator-required, system-wide, executable-binary, script-bundle, sensitive, and unknown requests are denied. Remote URL sources are unsupported because this milestone cannot download or remotely verify anything. Medium-or-higher risk requests require provenance, digest, signature, rollback, and uninstall evidence.

Signed adapter-manifest and connector-manifest metadata may reach `approval_required`. Approval means review permission only, not installation authority.

## Adapter sandbox integration

The adapter-plan conversion helper reads only a declarative sandbox plan. It recognizes `file.write.request` and `install.request`, copies summarized metadata into a new immutable-style request model, and carries blocked or rejected plan status into blockers. It does not load an entrypoint, call an adapter, inspect host files, invoke an installer, contact a registry, or mutate the source plan.

## Device Center

The Device Center card is read-only. It shows policy status, permanently disabled write/install execution, blocked shell and administrator access, evidence expectations, readiness, fixture decisions, and explicit safety copy. It has no write, install, run, approval, or package-manager controls and performs no polling.

## Future execution pilot requirements

Any future execution pilot requires a separate design and review, including:

1. explicit host approval;
2. provenance, digest, and signature verification;
3. rollback and uninstall plans;
4. backup before overwrites;
5. a scoped target-path allowlist;
6. runtime traceability;
7. durable audit design;
8. transport permission enforcement; and
9. a separate security review.

Nothing in this model pre-approves that future work.
