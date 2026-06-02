# LucaLink Approval-to-Continuation Bridge

PR #195 connects Device Center approval decisions to the LucaLink continuation registry without adding runtime execution.

## What changed

- Approving an eligible Primary Host approval request can create a short-lived continuation token from the approved request.
- Denied and cancelled requests do not create continuation tokens.
- Device Center Advanced now exposes continuation summary state and continuation records for inspection.
- Approval details can show the continuation token linked by approval `requestId`.

## Model-only boundary

Continuation tokens remain model records only. Creating, validating, cancelling, or marking a token consumed does **not** execute, retry, replay, emit, send, beam, or continue the original action.

The bridge does not add sockets, backend endpoints, transport events, persistence, telemetry, automatic retry, runtime continuation execution, tool/file/shell/browser/code execution, physical-world actuation, or payment execution.

## Fresh confirmation

Physical-world, payment, smart-home, robotics, actuator, and critical safety actions remain `fresh-confirmation-required`. Device Center may display their blocked continuation record, but the action requires a new Primary Host confirmation and cannot be replayed from approval.

## Future work

A later PR can add a controlled runtime continuation bridge. That future work must keep approval, token state, and execution as separate steps and preserve the boundary between LucaOS Creator/source-code authority and normal LucaLink Primary Host mesh authority.
