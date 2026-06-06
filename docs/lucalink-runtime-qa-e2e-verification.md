# LucaLink Runtime QA + End-to-End Verification

## Purpose

The LucaLink architecture phase from PR #182 through PR #203 is complete. This guide starts the runtime QA phase and verifies that the expanded host-mesh, trust, approval, continuation, handoff, bridge-review, adapter-draft, and enforcement models work in the real application without breaking established LucaLink flows.

Runtime QA must pass before implementation begins for adapter execution, adapter installation, live network probing, new transports, physical actions, payments, or raw memory synchronization. This verification phase does **not** authorize generated-code execution, adapter file writes, new socket events, backend endpoints, persistence, BLE/Matter/MQTT/ROS transport, WebRTC signaling changes, pairing/auth changes, raw file transfer, hidden prompt transfer, or private reasoning transfer.

`Origin` remains reserved for LucaOS Creator/source-code authority, root blueprint authority, source mutation, and self-evolution controls. Normal mesh authority is `Primary Host`; the highest user mesh trust level is `owner`.

## Scope and evidence record

For each manual check, record:

- tester and UTC timestamp;
- build/commit identifier;
- Primary Host and companion host/runtime details;
- connection mode;
- **Pass**, **Fail**, **Blocked**, or **Not applicable**;
- screenshots or logs that contain no pairing secrets, PINs, private messages, or credentials;
- a concise failure signal and reproduction steps when not passing.

A check is **Blocked** only when the environment cannot provide the required network, browser permission, second host, or sensor source. Product failures are **Fail**, not Blocked.

## Test environment

Prepare as many of these environments as are available:

- a Primary Host desktop or laptop running LucaOS;
- a companion host such as a phone, tablet, laptop, or browser runtime;
- a working relay connection;
- a local LAN shared by two hosts, if possible;
- a VPN or already-known manual host address, if possible;
- a separate guest browser session;
- an optional second browser as a display or guest surface;
- an optional existing fake sensor-pulse input or second sensor-capable host.

Do not scan a network, probe unknown addresses, install an adapter, or add transport infrastructure to prepare this environment. If an optional environment is unavailable, mark its allowed check **Blocked** and state why.

## Automated QA baseline

Before manual QA, run the targeted LucaLink tests listed in the PR validation plan. Automated coverage establishes model-level invariants, but it does not replace real pairing, relay, browser, or multi-host verification.

The pure runtime checklist lives in `src/services/lucaLink/lucaLinkRuntimeQaChecklist.ts`. The smoke harness uses fake records only and must not import the live socket service, connect to a relay, fetch, access storage/browser APIs, write files, install adapters, probe hosts, or execute generated code.

## Manual QA checklist

Use `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] N/A` for every item.

### Primary Host pairing

- [ ] **Create room:** Enable LucaLink on the intended Primary Host and create a room. The app remains responsive and exposes connected/room state.
- [ ] **Pairing token:** Generate or reveal the existing pairing token. It is present, usable, and does not expose unrelated secrets.
- [ ] **QR pairing URL:** Generate the QR code and inspect its target. It contains the expected existing pairing data.
- [ ] **State update:** Confirm LucaLink state updates once, without duplicate or phantom devices.
- [ ] **Device Center:** Confirm overview cards and relevant Devices/Hosts state reflect the Primary Host room.
- [ ] **Terminology:** Pairing copy says **Primary Host**, never Origin host/device/approval.

**Pass:** Room, token, and QR generation work under existing behavior and Device Center remains readable.
**Fail:** Crash, hang, malformed token/URL, duplicate records, leaked secrets, changed pairing semantics, or Origin used as normal mesh authority.

### Companion join

- [ ] **Token join:** Enter a valid token on a companion host and connect to the Primary Host.
- [ ] **QR join:** On a supported host, scan the QR code and complete the existing confirmation flow.
- [ ] **Bidirectional state:** Both hosts show the expected connection/presence state.
- [ ] **Disconnect:** Disconnect the companion and verify stale connected state clears.
- [ ] **Reconnect:** Reconnect with the established credentials and verify no duplicate host record appears.
- [ ] **Bad token:** Attempt a deliberately invalid token. The join is denied with a readable error and no partial trusted-device state.

**Pass:** Valid joins work, invalid joins fail safely, and reconnect/disconnect converges.
**Fail:** Authentication bypass, owner/Primary Host authority transfer, duplicate state, crash, or valid established flow regression.

### Relay, local LAN, VPN, and auto mode

- [ ] **Relay:** Connect through the configured relay and exchange a normal message.
- [ ] **Local LAN:** If the environment supports an already-known local route, use the existing local/manual connection path. Do not add scanning or probing.
- [ ] **VPN/manual address:** If available, connect to an already-known reachable address through the existing manual path.
- [ ] **Auto mode:** Exercise the existing auto/reconnect path and confirm it does not crash.
- [ ] **Failure state:** Unavailable local/VPN routes show a readable failure and do not corrupt relay state.

**Pass:** Relay works; local/VPN work when available; auto mode remains stable.
**Environment-blocked:** No compatible LAN/VPN/manual-address environment exists.
**Fail:** New discovery is required, app scans/probes, pairing changes, fallback corrupts state, or runtime crashes.

### Guest

- [ ] **Guest URL:** Generate guest access and open it in a separate browser session.
- [ ] **Connected state:** Confirm the guest session appears without receiving mesh trust or device authority.
- [ ] **PIN challenge:** When PIN is enabled, confirm a challenge appears before protected access.
- [ ] **PIN success:** Submit the valid PIN and confirm only normal guest capabilities become available.
- [ ] **PIN failure:** Submit an invalid PIN and confirm denial without leaking the valid PIN.
- [ ] **Guest chat:** Send ordinary conversation messages in both directions.
- [ ] **Guest disconnect:** Close/disconnect the guest and verify session state updates.
- [ ] **Dangerous payload:** If an existing safe test fixture is available, submit a guest request for a denied capability and confirm it is rejected before any handler/action. Do not construct or execute a real harmful action.

**Pass:** Guest URL, optional auth, chat, and disconnect work; dangerous authority requests are denied.
**Fail:** Safe chat is blocked, invalid PIN succeeds, guest gains mesh/runtime authority, or a payload reaches execution.

### WebRTC

- [ ] **Offer:** Start the existing guest voice flow and observe the offer path.
- [ ] **Answer:** Confirm the answer is handled by the established signaling path.
- [ ] **ICE:** Confirm ICE candidates are handled without a new socket event.
- [ ] **Guest hardening:** Confirm guest policy allows valid offer/answer/ICE messages.
- [ ] **Permissions:** Record browser microphone/audio permission or autoplay limitations separately from signaling failures.

**Pass:** Existing signaling completes and guest hardening does not block valid signaling.
**Environment-blocked:** Browser/device permissions prevent audio capture/playback but signaling evidence is otherwise valid.
**Fail:** Existing signaling event is blocked, changed, or replaced; an unhandled exception occurs.

### Messaging

- [ ] **Normal send:** Send a safe ordinary message from Primary Host to companion.
- [ ] **Normal receive:** Reply from companion and verify each message arrives once.
- [ ] **Beam packet:** With an established secure session, send a normal beam packet through the existing path.
- [ ] **Missing secure session:** Exercise the existing missing-session behavior where safe and confirm it fails or falls back safely without leaking secrets.
- [ ] **No execution:** Confirm message/beam content does not execute a dangerous action.
- [ ] **No unnecessary approval:** Confirm safe ordinary messaging does not create a high-risk approval request.

**Pass:** Safe bidirectional traffic works and secure-session failure remains safe.
**Fail:** Lost/duplicate traffic, plaintext secret leakage, crash, action execution, or safe messaging blocked by disabled/observe-only enforcement.

### Mission sync

- [ ] Connect eligible hosts using the established runtime.
- [ ] Create or update an ordinary mission through the existing flow.
- [ ] Confirm the receiving host observes the expected state once.
- [ ] Confirm no mission executes an unrelated tool, payment, physical, or safety action.

**Pass:** Existing mission-sync semantics are unchanged.
**Fail:** Lost, duplicate, malformed, or unexpectedly executed mission state.

### Sensor pulse

- [ ] Use only an existing fake input or already-supported second host/sensor.
- [ ] Send one ordinary sensor pulse.
- [ ] Confirm the pulse is observed under the existing transport behavior.
- [ ] Confirm it does not trigger motion, smart-home control, payment, or another physical action.

**Pass:** Existing pulse handling works without actuation.
**Environment-blocked:** No supported fake input or second sensor-capable host is available.
**Fail:** Crash, changed transport semantics, or any physical/device action.

### Runtime enforcement

Reset modes between checks and capture the active mode in evidence.

- [ ] **Disabled:** Confirm the default/reset mode is disabled and a normal message is not blocked.
- [ ] **Observe-only:** Confirm a high-risk sample is observed but not runtime-blocked solely by observe mode.
- [ ] **High-risk-only:** Confirm a high-risk outbound sample is blocked/queued while safe ordinary traffic remains available.
- [ ] **Full-outbound:** Confirm a dangerous outbound sample is blocked before transport.
- [ ] **Approval state only:** Approve, deny, and cancel queue samples and confirm no blocked action is emitted, retried, replayed, or executed.
- [ ] **Continuation state only:** Validate/consume a continuation record and confirm consumption records state without executing the original action.
- [ ] **Fresh confirmation:** Confirm payment, physical, robotics, smart-home, and safety-critical samples require fresh Primary Host confirmation and are never auto-approved.

**Pass:** Defaults remain safe, modes have their documented effects, and approvals/continuations remain state-only.
**Fail:** Default blocking regression, observe-only blocking, dangerous full-outbound allowance, stale approval reuse, or any execution from queue/continuation state.

### Device Center

Test once with no active devices/model records and once with representative populated state when feasible.

- [ ] Device Center opens with no crash.
- [ ] Overview cards remain readable in empty and populated state.
- [ ] **Devices** tab renders.
- [ ] **Hosts** tab renders.
- [ ] **Approvals** tab renders.
- [ ] **Guests** tab renders.
- [ ] **Sync** tab renders.
- [ ] **Bridge Review** tab renders.
- [ ] **Advanced** tab renders.
- [ ] Pairing and authority copy uses Primary Host.
- [ ] No copy says “Origin approval.”
- [ ] Handoff copy says raw memory databases are not transferred.
- [ ] Adapter draft copy states `generatedTextOnly`, `canWriteToDisk false`, `canExecute false`, and `canInstall false`.
- [ ] Bridge review copy says sandbox approval does not execute or install.
- [ ] Embodied policy copy says physical, payment, and safety-critical actions are never auto-approved.
- [ ] No tab offers **Generate and run**, **Install adapter**, **Execute adapter**, **Run code**, **Write file**, **Open socket**, **Scan network**, **Control robot**, **Control device**, **Bypass credentials**, **Exploit**, **Take over**, or **Auto bridge**.

**Pass:** All tabs render, empty/populated state is readable, host-aware copy is correct, and no forbidden action control exists.
**Fail:** Any crash, unsafe control, Origin used as mesh approval, or model-only boundary omitted.

### Model-only layers

- [ ] **Handoff preview:** Create/inspect a sample handoff preview. It contains bounded intent/conversation preview only—no raw memory database, raw files, hidden system prompt, or private reasoning.
- [ ] **Handoff lifecycle:** Approve/decline/cancel/accept sample records and confirm state changes do not send payloads.
- [ ] **Host connection model:** Empty and fake host records classify without a socket or probe.
- [ ] **Approval surfaces:** Fake host state derives display/eligibility only and does not push an approval or transfer authority.
- [ ] **Bridge review:** Create a sample review and approve it for sandbox only. Confirm status changes and no execute/install/write/connect occurs.
- [ ] **Adapter draft:** Create a sample draft. Confirm it is text-only and cannot write, execute, install, open sockets, probe, or control a device.
- [ ] **Clear drafts:** Clear sample drafts and confirm only the in-memory registry changes.
- [ ] **Host adaptation blueprint:** Generate/evaluate a model blueprint and confirm generated program execution remains disallowed.
- [ ] **Embodied envelope:** Evaluate sensor/robot/drone/humanoid/electronics samples and confirm physical/payment/safety actions are denied or fresh-confirmed, never auto-approved.

**Pass:** Every operation is pure/state-only and preserves explicit denials.
**Fail:** Network, storage, file, browser, install, execution, probing, authority transfer, payment, or physical side effect.

### Security invariants

- [ ] `Origin` appears only for Creator/source-code/root blueprint/source mutation/self-evolution authority, not normal mesh authority.
- [ ] Normal host authority is `Primary Host`; highest user mesh trust is `owner`.
- [ ] Host modeling includes desktop, laptop, mobile, tablet, watch, TV/browser display, electronics, sensor, robot/drone/humanoid, kiosk, and unknown future kernels where relevant.
- [ ] Model-only features do not execute, write, install, fetch, store, probe, or actuate.
- [ ] The audited LucaLink socket event surface has no new events.
- [ ] No adapter files are written or installed.
- [ ] No live network probing or scanning occurs.
- [ ] No raw memory database, raw file, hidden system prompt, or private reasoning is transferred.
- [ ] No Primary Host transfer, owner transfer, payment execution, or physical actuation is introduced.

**Pass:** All invariants remain true in source checks and runtime observation.
**Fail:** Any invariant is violated; stop readiness approval.

## Pass/fail gates

### Must pass before real implementation

All applicable items below must be **Pass**:

- Primary Host room creation;
- pairing token and QR generation for supported pairing paths;
- companion join through at least the expected production connection path;
- reconnect/disconnect stability;
- Device Center no-crash with all seven tabs;
- normal message send/receive;
- guest chat when guest access is expected to be enabled;
- guest PIN success/failure when PIN auth is enabled;
- WebRTC signaling when guest voice is expected to be enabled;
- runtime enforcement and soft enforcement default/reset are disabled;
- high-risk/full-outbound gates block before transport as designed;
- approval queue and continuation records remain state-only;
- bridge review and adapter drafts remain model-only/non-executing;
- handoff preview transfers no raw memory, files, hidden prompts, or private reasoning;
- no forbidden Device Center action labels;
- Origin and Primary Host terminology boundaries;
- no new socket events, writes, installs, probing, payment, or physical execution.

A failed required gate makes real implementation readiness **Fail**. Automated coverage alone is not a pass for manual runtime gates.

### May be environment-blocked

These checks may be **Blocked** with a documented environment reason:

- local LAN connection;
- VPN/manual-address connection;
- WebRTC audio capture/playback because of browser/device permissions, provided signaling is independently verified where required;
- sensor pulse when no existing fake input or second sensor-capable host exists.

An environment-blocked check must not hide a reproducible app error. If the app crashes or corrupts state, mark **Fail**.

### Stop conditions

Stop QA and mark the readiness gate failed if any test observes:

- a new or changed socket event required by this PR;
- generated code execution, adapter write/install, or live probing;
- unsafe guest payload reaching an action handler;
- approval/continuation causing automatic retry or execution;
- raw memory/file/hidden prompt/private reasoning transfer;
- Primary Host/owner transfer;
- payment, robotics, smart-home, or physical actuation;
- Origin used as normal host, trust, approval, device, or fallback authority;
- regression in established pairing, messaging, guest, WebRTC, mission, or sensor behavior.

## Known limitations

- Pure/unit smoke scenarios prove model composition, not relay or browser interoperability.
- Source-level Device Center assertions prove required copy/controls are present or absent, but manual inspection is still needed for responsive rendering and interactive tab state.
- LAN and VPN verification depends on externally prepared reachable environments; this QA work does not add discovery or probing.
- WebRTC media playback/capture depends on browser permissions and device policy even when signaling works.
- Sensor-pulse verification depends on an already-supported source.
- Bridge reviews, adapter drafts, host adaptation, approval surfaces, handoffs, and embodied capability envelopes are intentionally non-executing models.
- No persistence is added for QA results; evidence is recorded in the PR/test report or another existing approved process.

## Real implementation readiness

Real LucaLink implementation work may begin only after all required gates pass, allowed environment blocks are documented, no stop condition is observed, and the checklist summary reports no required open checks.

The next implementation PRs may then address, in controlled and separately reviewed increments:

1. Controlled Adapter Sandbox Runtime.
2. Web Display Bridge MVP.
3. Companion Host Approval Notification Surface.
4. Read-only Sensor Bridge MVP.
5. Network/transport permission model.
6. Adapter file-write permission model.
7. Runtime audit trail.
8. Rollback/uninstall model.

Passing this QA phase is permission to design and review those implementation PRs; it is not itself permission to execute adapters, probe networks, install transports, transfer raw memory, or actuate physical/payment systems.
