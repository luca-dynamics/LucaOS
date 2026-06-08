# LucaLink Companion Host Approval Notifications

## Scope

This track adds a safe notification and decision-intent layer for existing LucaLink approval requests. It can render approval queue requests and Web Display Bridge `approval_required` intents as risk-aware cards for an evaluated companion, display, or Primary Host approval surface.

The implementation reuses `LucaLinkApprovalRequest`, `createLucaLinkApprovalPayloadPreview`, and `evaluateLucaLinkApprovalSurfaceForRequest`. It does not create a second approval queue or a separate authority model.

## Intent-only boundary

Notification cards expose request risk, expiry, redacted payload preview, authority decision, available notification actions, blocked operations, warnings, and errors. Every notification, decision intent, inbox, and audit record carries `sideEffectsPerformed: false`.

The layer does not:

- send an approval or denial over LucaLink, Socket.IO, relay, LAN, WebRTC, VPN, or another transport;
- call approval queue approve, deny, cancel, or expire mutations;
- persist notification state to local storage, session storage, IndexedDB, a database, or files;
- fetch network content;
- execute an adapter, generated code, a tool, shell command, install, file write, network mutation, payment, physical action, or device control;
- open, cast, automate, or control a browser, DOM, LucaBrowser, VisualCore, Luca Screen, or display; or
- access credentials, cookies, tokens, secrets, raw files, hidden prompts, private reasoning, or Personal Intelligence data.

Inbox status changes are immutable, notification-local model transformations only. Audit records are model-only summaries and are not persisted.

## Approval surface policy

Each notification policy decision calls the existing `evaluateLucaLinkApprovalSurfaceForRequest` helper.

- Trusted companion surfaces may create `approve_preview_intent` only within their existing low/medium-risk authority.
- A deny intent is available only when the existing surface can deny.
- Display-only surfaces may view or dismiss a card, but approval is unavailable and the request must escalate.
- Public display surfaces have no approval authority and are blocked.
- High-risk, critical, payment, physical, robotics, smart-home, device-control, install, shell, file-write, and network-mutation requests escalate to the Primary Host unless the existing Primary Host surface evaluation permits review.
- Expired requests produce expired notifications with no decision actions.

Notifications never grant runtime execution authority.

## Web Display Bridge integration

A Web Display Bridge intent is converted only while its status is `approval_required`. The equivalent approval request uses `display.present`, the display intent's risk and expiry, and a safe payload preview containing the title, content kind, sanitized URL preview when available, privacy level, display mode, and blocked-action summary.

`approve_preview_intent` means only that a local model records an intention to approve an inert preview. It does not call `markLucaLinkWebDisplaySessionApprovedForPreview`, change the source display intent, open or cast content, or approve display execution.

## Decision intents

The module can construct local decision models for:

- `approve_preview_intent`;
- `deny_intent`;
- `escalate_primary_host`; and
- `dismiss`.

A high-risk, critical, or fresh-confirmation approval attempt is converted to a Primary Host escalation intent. Creating any decision intent leaves the source approval request and queue unchanged and sends no message.

## Device Center preview

The existing LucaLink Device Center Approvals surface includes a read-only **Companion Approval Notifications** card backed by safe fixtures. It shows the pending fixture count, sample title, risk, surface decision, allowed notification actions, blocked actions, expiry, redacted payload preview, and audit-only `sideEffectsPerformed false` status. It provides no live approval, cast, browser, execution, or transport controls.

## Future work

A future PR may connect an actual companion-host notification transport only after the LucaLink network and transport permission model is complete. That work must preserve explicit host consent, existing queue and authority semantics, redaction, expiry, auditability, and the separation between notification decisions and execution.

## Sensor bridge approval boundary

`sensor.read` and `device.status.read` are currently model-only/readiness-only.
A companion approval notification may describe a future request, but approval
or decision intent creation does not grant live sensor collection, prompt for a
sensor permission, start polling, send telemetry, or control a device.

## Transport permission conversion

Companion approval notifications can be converted into side-effect-free LucaLink transport permission requests. This conversion is read-only and does not send a notification, submit an approval decision, mutate the approval queue, or authorize runtime transport.

 
## Dashboard Operation Center summary

These model outputs can be represented as normalized, read-only cards in the Dashboard Operation Center. Summarization is informational only: it does not send, execute, approve, persist, or mutate LucaLink runtime state.
=======
 
## Dashboard Operation Center summary

These model outputs can be represented as normalized, read-only cards in the Dashboard Operation Center. Summarization is informational only: it does not send, execute, approve, persist, or mutate LucaLink runtime state.

## Adapter file-write and install boundary

Declarative `file.write.request` and `install.request` capabilities are evaluated by the Adapter File Write + Install Permission Model. Approval notifications may describe a future review request, but current evaluation does not execute, write, install, approve, mutate the notification inbox, or send transport.

 
