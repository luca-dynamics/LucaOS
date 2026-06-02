# LucaLink Device Center + Approval Panel

PR #193 adds a Settings → LucaLink Device Center surface for Primary Host users to inspect the local LucaLink mesh and the in-memory approval queue.

## Sections

- **Overview** summarizes the Primary Host, connected devices, pending approvals, guest session availability, and soft-enforcement security mode.
- **Devices** renders connected LucaLink devices read-only with inferred role labels such as Primary Host, Companion, Execution, Guest, Sensor, Display, and Embodied.
- **Approvals** lists pending and recent approval requests, exposes request details, and provides approve, deny, and cancel queue actions.
- **Guests** is a read-only placeholder until reliable guest-session state is exposed.
- **Sync & Handoff** is a placeholder for future conversation, memory, mission, settings, artifact, and model handoff work.
- **Advanced** shows read-only soft-enforcement, runtime shadow, approval queue diagnostics, and continuation token summary state.

## Approval behavior

Approve, deny, and cancel only mutate the in-memory approval request status. Approving a request may now create an eligible continuation token in the in-memory continuation registry. Deny and cancel do not create continuation tokens.

Approving a request does **not** execute, retry, replay, emit, send, or continue the blocked action. Continuation tokens are model records only for manual validation and visibility.

## Continuation visibility

Device Center Advanced shows continuation totals, valid continuation count, consumed count, expired / blocked count, and replay-mode summary labels such as manual retry only, single-use replayable, and fresh confirmation required. The continuation records list allows state-only validation, cancellation, and mark-consumed operations; none of these actions run the original payload.

Physical-world and payment actions remain fresh-confirmation-required and blocked from replay from approval.

## Boundaries

This PR does not add runtime continuation execution, approval notifications, socket events, backend endpoints, persistence, network telemetry, trust editing, device revocation, pairing behavior changes, guest access behavior changes, mission sync behavior, or full runtime enforcement.

The UI preserves the LucaLink mesh terminology boundary: normal mesh authority is **Primary Host**. `Origin` remains reserved for LucaOS Creator/source-code authority and is not used as a normal approval or device authority.

## Next step

Future PRs can add a controlled runtime continuation bridge after approval decisions and continuation-token state remain separate, or harden guest-session controls once safe service state exists.
