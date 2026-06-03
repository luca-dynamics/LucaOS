# LucaLink Multi-Host Approval, Bridge Review, Embodied Safety, and Adapter Drafts

PR #202 adds the next model-first product and security layer on top of the multi-host connection architecture introduced in PR #201.

## Purpose

LucaLink approval is host-aware, risk-aware, and body-aware. Any Luca-capable host can present an approval surface only if its trust, presence, connection class, and host class allow it.

This layer prepares LucaLink for desktops, mobile companions, watches, displays, TVs, kiosks, browsers, sensors, smart electronics, robots, drones, humanoids, and future runtime/body surfaces without treating mobile as the only approval host.

## Multi-host approval surface

Approval surfaces are derived from host connection records and classify whether a host can display, deny, approve low-risk requests, approve low/medium-risk requests, or must escalate to the Primary Host.

Host authority is constrained by:

- host class
- connection class
- trust level
- status
- presence capability
- approval capability
- whether a request involves physical, payment, robotics, smart-home, or safety-critical action

## Host authority by class

- Primary Host owner surfaces can approve normal software low, medium, and high-risk approvals, while runtime enforcement still applies.
- Trusted companion surfaces can approve low/medium-risk requests only with strong user presence.
- Watch surfaces can approve low-risk, or low/medium-risk when explicitly trusted and user-present.
- Execution hosts can request or display approvals, but cannot self-approve high-risk execution unless they are the current Primary Host.
- Displays, TVs, web displays, kiosks, and public screens are display-only or none.
- Guest, sensor, embodied, public, and unknown hosts cannot approve by default.

## Display-only vs approval-capable hosts

Display-only hosts can show status and approval context where safe, but cannot approve. Public displays cannot approve and are prevented from becoming approval-capable by default.

Approval-capable hosts require trust and presence. Approval is not inferred from screen size, form factor, or being “mobile”; mobile is only one companion host type.

## Primary Host escalation

Physical, payment, safety-critical, robotics motion, smart-home control, and actuator actions require fresh Primary Host confirmation. Companion, watch, display, guest, sensor, embodied, and unknown hosts must not approve those actions.

## Bridge blueprint review

Bridge blueprints can now be represented as review records with:

- risk
- review status
- Primary Host approval requirement
- sandbox requirement
- static checks
- sandbox plan
- pseudocode/config preview
- warnings and errors

Review approval means “approved for sandbox/static-check preparation only.” It does not execute, install, write generated files, open sockets, or connect to a host.

## Sandbox/static-check preparation

Sandbox plans are model records containing allowed and denied operations. They are designed for future controlled execution work and currently allow only review of blueprint text, pseudocode, config sketches, and checklists.

Denied operations include generated-code execution, adapter install, generated-file writes, live probing, socket opening, host send, and device control.

## Sensor/electronics/embodied safety model

The embodied host policy classifies safety lanes such as sensor read, camera read, microphone read, location read, electronics status, smart-home status, robotics status, motion plan, motion execute, actuator control, smart-home control, payment, and safety-critical actions.

- Sensor read can be allowed only as read-only model permission for trusted/paired hosts.
- Camera, microphone, and location require explicit approval modeling.
- Electronics and smart-home status are read-only.
- Motion plans are text/model-only.
- Motion execute, actuator control, smart-home control, and payment require fresh confirmation and are never auto-approved.
- Safety-critical actions are blocked unless a future explicit safety framework exists.
- Embodied hosts cannot approve their own physical action.
- Guest and public display surfaces cannot control embodied/electronics hosts.

## Controlled adapter drafts as text only

Adapter drafts represent generated bridge material as text/model-only artifacts. Drafts may include pseudocode, configuration sketches, and setup-guide text.

Every draft records:

- `generatedTextOnly: true`
- `canWriteToDisk: false`
- `canExecute: false`
- `canInstall: false`

Python, Node, Electron, IoT, MQTT, Matter-like, ROS, and Serial drafts require review and/or sandbox preparation. IoT/MQTT/Matter/ROS/Serial drafts are read-only by default. Shell drafts are blocked or converted to manual setup guide text.

## What is not implemented

This PR does not implement:

- generated-code execution
- generated-file writes
- adapter install
- live network probing
- socket opening
- new socket events
- backend endpoints
- persistence
- BLE, Matter, MQTT, ROS, WebRTC, relay, local, or VPN transport changes
- pairing changes
- guest PIN/auth changes
- mission sync changes
- sensor pulse transport changes
- payment execution
- robotics, smart-home, or physical actuation
- credential bypass
- exploit generation
- stealth install
- malware-like persistence
- secret scraping
- Primary Host transfer
- owner transfer

The Primary Host boundary is preserved, and the reserved Creator/source-code authority term is not used as device authority.

## Next step

The next recommended step is a Production Hardening Audit covering review lifecycle, formal policy proofs, UI red-team checks, and controlled sandbox execution design without weakening runtime enforcement.
