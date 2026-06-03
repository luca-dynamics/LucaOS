# LucaLink Memory / Conversation Handoff

PR #200 adds a safe, model-first LucaLink handoff layer for moving user-visible context across trusted Primary Host, companion, browser, display, and future Luca-capable hosts without turning handoff into broad sync or remote execution.

## Purpose

LucaLink handoff makes Luca feel continuous across devices while preserving existing trust, runtime enforcement, and Primary Host approval boundaries. A handoff request is an in-memory model record with a bounded payload preview, lifecycle state, risk classification, and optional approval queue link.

## Handoff kinds

- `conversation` — conversation title, recent user-visible summary, current task, active intent, and visible context.
- `memory-intent` — intent to continue with a memory namespace, summary labels, and confirmation prompt only.
- `mission` — mission title, current step, safe status, assigned device, and sync-lane metadata.
- `artifact` — artifact title, type, local reference/id, summary, and size estimate.
- `settings-context` — non-sensitive display and preference summary only; no remote mutation.
- `model-context` — selected mode, compatibility hints, and local model availability summary.

## Lifecycle

Handoff records can move through `draft`, `pending`, `approved`, `sent`, `received`, `accepted`, `declined`, `expired`, `cancelled`, or `blocked`. This PR exposes state actions in Device Center, but it does not auto-send, replay, execute, or continue any runtime action.

## Payload limits and preview

Payload previews are sanitized and bounded:

- maximum depth: 4
- maximum array items: 20
- maximum string length: 1000
- previews show redacted/truncated flags
- original payload inputs are not mutated

Conversation handoff excludes hidden system prompts, developer/internal prompts, tool-internal content, and private reasoning. Artifact handoff does not include raw large file contents.

## Redaction rules

Keys and secret-like values are redacted when they contain or resemble:

- password
- token
- secret
- privateKey
- apiKey
- bearer
- authorization
- credential
- seed
- mnemonic
- key
- cookie
- session

Secrets and credentials are never intentionally transferred as raw handoff payloads.

## Trust and approval policy

The policy evaluates handoff kind, source and target device trust records, risk, payload preview redaction, and requested device identity.

- Guest targets are denied except explicit limited low-risk conversation previews.
- Revoked or blocked devices are denied.
- Unknown targets require approval, especially at elevated risk.
- Paired/trusted devices may receive low-risk conversation and settings-context records.
- Memory-intent, mission, artifact, and model-context handoffs require Primary Host approval at medium/high risk.
- Admin and owner records do not bypass runtime enforcement.
- Physical-world, payment, shell, browser-control, file mutation, and safety execution payloads are denied because handoff is not an execution channel.

## Device Center UX

Settings → LucaLink → Device Center → Sync now shows:

- pending handoffs
- conversation handoffs
- memory intent handoffs
- artifact / mission handoffs
- blocked / expired counts
- handoff request list with title, kind, status, risk, source, target, expiry, warnings, errors, and payload preview
- action-light controls to create a safe local sample, approve, decline, cancel, or mark accepted

The UI shows payload previews only. It does not show raw payload data or a send-now control.

## Explicit non-goals

This PR does not add:

- full memory sync
- raw memory database transfer
- hidden system prompt transfer
- private reasoning transfer
- API key, BYOK, credential, token, private key, seed phrase, cookie, or session transfer
- raw large file transfer
- new socket events
- backend endpoints
- telemetry
- persistence beyond the in-memory service registry
- push notifications
- mobile approval flow
- remote settings mutation
- tool, shell, file, browser, code, payment, robotics, smart-home, or physical-world execution
- Primary Host transfer
- owner transfer
- reserved source-code authority as device authority

Runtime enforcement remains active, and Primary Host approval boundaries remain intact.

## Next step

Recommended next PR: Mobile Primary Host Approval Flow or Sensor Mesh Preparation.
