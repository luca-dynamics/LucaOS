# Presence Runtime foundation

**Status:** typed foundation with first compatibility wiring

**Runtime behavior change:** none

## What this foundation adds

The first `src/presence/` module establishes a framework-neutral contract for Luca Presence without moving ownership out of the current dashboard renderer or Electron process:

- JSON-safe Presence state and snapshot contracts for MiniChat, Hologram, Widget, and the dashboard Control Center;
- discriminated events for surface lifecycle, voice, wake word, sensors, approvals, LucaLink synchronization, and explicit dashboard requests;
- a pure reducer plus a small in-memory runtime wrapper with state, snapshot, dispatch, subscription, and reset operations;
- pure surface/focus/fallback policy helpers that make Hologram the default wake-word and voice-shortcut surface while reserving dashboard escalation for explicit or exceptional flows;
- public disclosure terminology for Voice Presence, Screen Context, Protected Actions, Device Awareness, and the Control Center;
- compatibility adapters between current `widget-update`, `hologram-update`, and LucaLink `UI_STATE_SYNC` payloads and the new transport-safe snapshot.

The compatibility boundary converts legacy `Set<string>` mission authorization state to arrays. Presence snapshots contain no functions, DOM/Electron objects, maps, sets, or class instances.

## First compatibility wiring

The dashboard's existing widget synchronization loop now converts its legacy
state payload to a transport-safe `PresenceSnapshot`, then converts that
snapshot back through the Widget, Hologram, and LucaLink compatibility
adapters. Electron continues to use `sync-widget-state`, `widget-update`, and
`hologram-update`, while LucaLink continues to use `UI_STATE_SYNC`.

Fields not modeled by `PresenceSnapshot` yet, including brain and embedding
model identifiers and approval request data, remain on the legacy payload and
are merged into the adapter output. Presence-owned fields take precedence so
mission authorization `Set` values become JSON-safe arrays, particularly for
LucaLink serialization.

This wiring does not change surface visibility, focus behavior, wake-word
routing, voice ownership, MiniChat message routing, sensor behavior, approval
behavior, or rendering.

## What remains legacy

This PR intentionally does **not**:

- change wake-word or voice-shortcut routing;
- register the runtime as an Electron, React, or LucaLink singleton;
- alter existing IPC channel names or remove any channels;
- move voice, conversation, sensor, approval, or settings ownership;
- change MiniChat, Hologram, Widget, or Control Center rendering;
- extract Electron window factories.

The runtime still does not own current application state. The compatibility
bridge is an importable, testable migration boundary around the existing
dashboard-owned synchronization loop.

## Relationship to PR #313 and PR #315

PR #313 documented the current Presence topology and proposed a transport-safe runtime boundary. This foundation implements the first contracts, reducer, policies, and compatibility adapters from that plan while leaving the existing owners in place.

PR #315 changed wake-word and voice summons to present the Hologram first and preserve the user's active application focus. The surface policy codifies that behavior as the future runtime default; it does not route the summon a second time or modify Electron behavior.

## Suggested next migration PRs

1. Add small bridge modules for MiniChat, Hologram, and Widget, then remove their duplicate payload parsing only after parity tests.
2. Feed wake-word and shortcut intents into the runtime while preserving the PR #315 Electron fallback behavior.
3. Migrate voice state ownership and capability status behind injected runtime ports.
4. Add disclosed sensor leases and sanitized approval prompts, including explicit focus-required escalation.
5. Make LucaLink and Electron parallel adapters for the same versioned snapshot/event contracts.
6. Only after those migrations, reduce dashboard ownership and extract Electron window factories in separately reviewable PRs.

## Surface bridge foundation

The Presence foundation now includes pure surface adapters under
`src/presence/bridges/` for MiniChat, Hologram, and Widget. These modules
centralize conversion from current legacy payloads into `PresenceSnapshot`,
conversion back to each surface's existing transport shape, and small
surface-specific selectors for voice display, dictation, disclosure, focus,
and approval prompt state.

The bridges reuse the existing Presence compatibility helpers rather than
creating parallel conversion rules. When an outgoing helper receives the
original legacy payload, it preserves fields that are not modeled by the
snapshot—such as brain model identifiers, the current approval request shape,
and Hologram `presenceSource`—while normalized Presence fields take precedence.
This also keeps mission authorization identifiers JSON-safe by converting
legacy `Set` values to arrays.

IPC channels, Electron fan-out, React parsing, settings access, LucaLink
broadcasting, and surface rendering remain legacy-owned. No bridge registers a
runtime singleton or performs host side effects, and visible runtime behavior
is unchanged.

The next migration step is to adopt these bridge selectors at the existing
React and application synchronization boundaries in small parity-tested
changes. Once all surfaces consume the centralized adapters, their duplicate
legacy parsing can be removed without changing transport channels or native
window behavior.

## Surface bridge adoption

The existing surface consumers now use the pure Presence bridge helpers at
their legacy transport boundaries. `useSatelliteState` converts Electron
`widget-update` and `hologram-update` payloads, plus LucaLink `UI_STATE_SYNC`
payloads, through the Widget snapshot and dictation selectors while preserving
the hook's current return shape and partial-update defaults. MiniChat converts
its `widget-update` payload through the MiniChat snapshot and approval
selectors. Hologram and Widget derive their existing voice display and
dictation values from their surface selectors.

The dashboard synchronization loop also uses the Widget and Hologram bridge
output helpers instead of calling the lower-level compatibility conversions
directly. Unknown legacy fields, including current brain/model identifiers and
approval data, remain merged into outgoing payloads. LucaLink-specific output
conversion remains on its existing compatibility helper.

This removes duplicate interpretation of transcript, transcript source,
listening/VAD, speaking, amplitude, status, persona, theme, intent, and
approval fields from the surface-side update paths. Partial legacy updates
still retain their previous values, and no dashboard, focus, or visibility
state is added to the surface payloads.

IPC channels, Electron fan-out, wake-word routing, focus behavior, voice
runtime ownership, MiniChat message and approval execution, sensor permission
behavior, rendering, layout, styling, and copy intentionally remain unchanged.
The next migration step is to replace the compatibility snapshots with a
runtime-owned Presence subscription while retaining these bridges as the
surface view-model boundary.

## Electron Presence IPC extraction

Presence-related Electron IPC registration now lives in injected CommonJS
adapters under `platforms/electron/ipc/` instead of being registered inline in
`platforms/electron/main.cjs`. The extracted adapters register the existing
Presence fan-out (`sync-widget-state`), Widget voice and visibility routing,
MiniChat message/reply/resize/restore routing, Hologram intent forwarding, and
VisualCore/Smart Screen ready/open/close/update/interaction/command display
routing. The `get-current-display-id` handler moved with the VisualCore adapter
because it is currently used by screen-context surfaces.

`main.cjs` still owns BrowserWindow references, window factory calls, tray and
global shortcut orchestration, wake-word summon routing, voice-runtime fallback
behavior, LucaLink/device state, process cleanup, and app lifecycle. The IPC
adapters receive getters and callbacks for those owners rather than importing or
mutating main-process globals directly.

Behavior is intentionally unchanged: IPC channel names, payload shapes,
MiniChat semantics, Widget focus behavior, Hologram-first wake-word routing,
VisualCore queuing/status behavior, and voice runtime ownership remain the same.
The legacy double registration of `close-visual-core` is preserved inside the
VisualCore IPC adapter so extraction does not change the close/hide sequence in
this PR.

The next migration step is to add parity tests around the extracted adapters and
then progressively replace legacy payload fan-out with Presence runtime events
once runtime ownership moves out of the dashboard renderer.

## MiniChat message routing foundation

Presence now includes a small, pure MiniChat message-routing contract under
`src/presence/messages/`. The contract defines typed request, route envelope,
reply, stream chunk, source, and status shapes for the current MiniChat path,
plus helpers that normalize MiniChat requests, read message text, preserve
legacy `chat-widget-message` compatibility, and copy reply or stream payloads
without changing their current transport shapes.

MiniChat message submission now constructs its `chat-widget-message` payload via
these helpers before sending over Electron IPC. The Electron MiniChat IPC
adapter keeps the same `chat-widget-message` channel and uses a CommonJS-safe
pass-through route helper so the main process does not import TypeScript or add
build complexity.

The runtime path remains dashboard-owned: Electron still forwards MiniChat
messages to the main dashboard renderer, the dashboard still performs the AI
processing and model routing, and the dashboard still sends replies and stream
chunks back through `reply-chat-widget`, `broadcast-stream-chunk`,
`chat-widget-reply`, and `chat-widget-stream-chunk`. MiniChat UI rendering,
submission behavior, streaming behavior, attachments, screen/image context,
voice behavior, approvals, wake-word routing, and IPC channel names are
intentionally unchanged.

Unknown legacy fields remain part of the route boundary. Fields that are not
yet modeled by a future Presence-owned AI runtime—such as ad hoc request IDs,
persona, model/brain identifiers, image or screen context, attachment payloads,
and other legacy extension fields—are copied through rather than filtered.

The next migration step is to have the dashboard consume the typed route request
at its existing `chat-widget-message` boundary, then introduce a Presence-owned
message route port only after parity tests prove reply, stream, model-routing,
and approval behavior remain identical.

## Known VisualCore parity items

VisualCore still has a few legacy parity behaviors that are intentionally
preserved during the Presence extraction sequence rather than fixed in this
cleanup PR:

- VisualCore packaged loading currently resolves `../dist/index.html`, while
  Widget, Hologram, and MiniChat resolve `../../dist/index.html` from their
  extracted window factories.
- `close-visual-core` keeps the legacy hide/sync and close behavior preserved
  by the extracted VisualCore IPC adapter.
- `update-visual-core` sends `visual-core-update` before readiness branching
  and may send another `visual-core-update` after the window is ready.

These differences were not changed during extraction to avoid behavior drift.
They should be handled in a later dedicated VisualCore parity audit PR with
focused tests around packaged load paths, close/hide semantics, and update
fan-out ordering.

## Presence approval routing foundation

Presence now includes a typed, pure approval routing layer under
`src/presence/approvals/`. The layer defines approval prompt, request,
decision, source, status, and route-envelope contracts for the current MiniChat
and dashboard approval handoff, including legacy fields such as `id`,
`requestId`, titles/summaries/descriptions, tool/action identifiers, command
and argument previews, risk level, permissions, metadata, timestamps, source,
status, and unknown extension fields.

The approval helpers normalize raw legacy approval payloads without mutating
inputs, preserve unknown fields, tolerate partially populated objects, expose
small selectors for approval IDs and display text, and convert typed prompts
back to the existing legacy `approvalRequest` field. Compatibility adapters and
MiniChat bridge selectors route approval prompts through these helpers, but the
outgoing field name remains `approvalRequest` for current Electron, React, and
surface consumers.

This foundation intentionally does not move approval execution ownership. The
dashboard/action system still owns tool execution, permission policy, approval
resolution side effects, and IPC handlers. MiniChat continues to display the
same approval UI and approval/decline actions still travel through the existing
channels and execution path.

Behavior intentionally unchanged: approval button behavior, tool permission
policy, IPC channel names, MiniChat message routing, wake-word routing, voice
runtime ownership, Hologram/Widget rendering, and Electron window factories all
remain legacy-owned.

The next migration step is to feed dashboard-created approval prompts into a
Presence-owned approval route port while keeping `approvalRequest` as the
compatibility payload until all MiniChat, Hologram, Widget, LucaLink, and
dashboard consumers have parity coverage.

## Presence sensor disclosure routing foundation

Presence now includes a typed, pure sensor disclosure routing layer under
`src/presence/sensors/`. The layer defines sensor kind, status, source,
permission, disclosure, route-state, and route-envelope contracts for current
microphone and screen disclosure state while leaving room for future camera or
vision, clipboard, file or filesystem, browser, and location disclosure domains.

The route helpers normalize raw legacy sensor payloads into JSON-safe Presence
sensor disclosures, preserve unknown extension fields, tolerate partial updates,
merge partial disclosure state, detect active or disclosure-required states, and
convert typed disclosures back to legacy-compatible objects. Existing disclosure
policy helpers route through this normalization boundary while continuing to
return the same `{ label, level }` shape used by Hologram and Widget surfaces.
Compatibility adapters can read current legacy `microphone`, `screen`, or
`sensors` fields without renaming or removing outgoing payload fields.

This foundation intentionally does not move runtime ownership. Microphone and
listening state still come from the existing voice and dashboard path. Screen
context and display/capture behavior remain owned by the existing screen and
VisualCore path. Permission prompts, capture checks, VAD, wake-word behavior,
IPC channel names, MiniChat/Hologram/Widget rendering, disclosure UI copy,
approval routing, and Electron window or IPC ownership are unchanged.

The next migration step is to feed dashboard-created microphone and screen
activity updates into this typed disclosure route at the current compatibility
boundary, then introduce Presence-owned sensor disclosure subscriptions only
after parity tests cover every surface and current permission behavior.
