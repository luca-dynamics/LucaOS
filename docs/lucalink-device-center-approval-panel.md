# LucaLink Device Center + Approval Panel

PR #193 adds a Settings → LucaLink Device Center surface for Primary Host users to inspect the local LucaLink mesh and the in-memory approval queue.

## Sections

- **Overview** summarizes the Primary Host, connected devices, pending approvals, guest session availability, and soft-enforcement security mode.
- **Devices** renders connected LucaLink devices read-only with inferred role labels such as Primary Host, Companion, Execution, Guest, Sensor, Display, and Embodied.
- **Approvals** lists pending and recent approval requests, exposes request details, and provides approve, deny, and cancel queue actions.
- **Guests** is a read-only placeholder until reliable guest-session state is exposed.
- **Sync & Handoff** is a placeholder for future conversation, memory, mission, settings, artifact, and model handoff work.
- **Advanced** shows read-only soft-enforcement, runtime shadow, and approval queue diagnostics.

## Approval behavior

Approve, deny, and cancel only mutate the in-memory approval request status. Approving a request does **not** execute, retry, replay, emit, send, or continue the blocked action.

## Boundaries

This PR does not add runtime continuation, approval notifications, socket events, backend endpoints, persistence, network telemetry, trust editing, device revocation, pairing behavior changes, guest access behavior changes, mission sync behavior, or full runtime enforcement.

The UI preserves the LucaLink mesh terminology boundary: normal mesh authority is **Primary Host**. `Origin` remains reserved for LucaOS Creator/source-code authority and is not used as a normal approval or device authority.

## Next step

Future PRs can add a runtime continuation model after approval decisions, or harden guest-session controls once safe service state exists.
