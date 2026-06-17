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


## Presence voice route boundary

Presence now includes a typed, pure voice route boundary under
`src/presence/voice/`. The boundary defines serializable contracts for voice
route status, source, mode, toggle requests, transcript events, activity events,
route envelopes, and fallback reasons. Its normalization helpers preserve the
legacy voice fields already used by the dashboard, Electron relays, and renderer
surfaces: `isListening`, `isVadActive`, `isSpeaking`, `transcript`,
`transcriptSource`, `amplitude`, `status`, `mode`, `context`, `forceHud`,
`source`, `provider`, `model`, `persona`, `language`, `error`,
`fallbackReason`, `timestamp`, `requestId`, `sessionId`, and unknown legacy
fields.

This is a route-boundary-only step. Current voice execution remains owned by the
existing dashboard/Electron path: `trigger-voice-toggle`, `widget-toggle-voice`,
`widget-voice-data`, wake-word summon routing, dashboard voice mode toggling,
provider fallback, HUD updates, recording, transcription, VAD, and streaming
payloads are intentionally unchanged. The compatibility layer now uses the pure
voice helpers when interpreting and emitting legacy update payloads, but it keeps
all existing field names and outgoing shapes intact.

The boundary prepares Voice Runtime Ownership Extraction by giving future
renderer bridges and Electron adapters a typed place to normalize voice intent
and display state before ownership moves. Known voice-sensitive behavior to
preserve in later phases includes wake-word summon, VAD, HUD behavior, provider
fallback, transcript streaming, Hologram-first summon, Widget voice toggle, and
MiniChat reply/stream behavior.

### Voice renderer bridge adoption

The Hologram and Widget Presence bridge selectors now route voice display state
through typed view-model helpers in `src/presence/voice/`.
`getHologramVoiceDisplayState(...)` and `getWidgetDictationState(...)` keep the
same renderer-facing payload shapes while centralizing transcript, transcript
source, listening, speaking, amplitude, and display status normalization at the
Presence voice boundary. Legacy display payloads still emit only `"user"` or
`"model"` transcript sources, default missing display fields to safe JSON values,
and avoid renderer-side unsafe casts.

This adoption does not move actual voice runtime ownership. The existing
dashboard/Electron path still owns voice sessions, wake-word handling,
`trigger-voice-toggle`, `widget-toggle-voice`, `widget-voice-data`, VAD,
recording, transcription, HUD updates, provider fallback, and MiniChat
message/reply streaming. The bridge helpers only normalize renderer display
payloads at the compatibility boundary.

The next phase after adapter parity is now the runtime-owned voice state foundation, followed by provider/fallback planning and then runtime-owned voice session control when coverage is sufficient.

## Electron voice adapter parity

Dependency-free CommonJS smoke coverage now locks the current Electron voice IPC adapter behavior before voice runtime ownership moves. The smoke test exercises `registerWidgetIpc.cjs` directly with fake `ipcMain` and fake BrowserWindow-like objects, so it does not require a real Electron runtime or import TypeScript Presence modules.

Covered channels and routes:

- `widget-toggle-voice` remains registered on the Widget IPC adapter and forwards to the dashboard/main window on the unchanged `trigger-voice-toggle` channel. The forwarded payload preserves `mode`, `context`, unknown legacy fields, and still forces `forceHud: false` for this path.
- `widget-voice-data` remains registered on the Widget IPC adapter and fans the same voice display payload to the existing Presence surfaces: `widget-update` for Widget, `hologram-update` for Hologram, and `widget-update` for MiniChat. Transcript, listening, VAD, amplitude, status, source, provider/fallback metadata, and unknown legacy fields pass through without mutation.
- Missing or destroyed destination windows are treated as lifecycle no-ops for the covered adapter paths; the tests assert that these smoke routes do not become runtime owners or require the destination windows to exist.

Voice execution is still owned by the dashboard renderer and current Electron main-process orchestration. The parity coverage intentionally does not start runtime-owned voice state, rename IPC channels, alter VAD/recording/transcription/provider fallback, change MiniChat/Hologram/Widget display behavior, or move wake-word behavior.

Wake-word summon routing remains documented as the current `main.cjs` path: `wake-word-triggered` calls `summonVoicePresence('wake-word')`, creates/keeps the dashboard voice runtime available without focusing it, shows the Hologram with `showInactive()`, sends a Hologram listening update first, and uses dashboard focus only through the existing recovery fallback. A later phase can extract this route behind a testable adapter once runtime-owned voice state and provider/fallback migration are ready.

What remains for the next phase: move canonical voice session state behind the Presence Runtime, introduce provider/fallback ports, and then decouple dashboard voice execution after parity tests cover those new boundaries.

## Runtime-owned voice state foundation

Presence now includes canonical, runtime-owned voice state reducer actions for voice updates, resets, transcript changes, activity changes, and errors. These actions merge partial voice snapshots into the Presence Runtime state without dropping existing transcript, status, provider, model, persona, session, request, fallback, amplitude, VAD, source, language, timestamp, error, or unknown legacy metadata unless an update explicitly replaces those fields. The runtime also exposes convenience helpers for recording voice state, transcript, and activity updates so current adapters can dispatch the same typed state path.

This is a state-ownership foundation only. The existing dashboard/Electron path still produces the voice updates and still owns actual voice engine execution, provider selection, recording/capture, transcription, VAD, wake-word routing, HUD behavior, stream behavior, and fallback handling. Existing IPC channel names and behavior, including `trigger-voice-toggle`, `widget-toggle-voice`, and `widget-voice-data`, remain unchanged.

Bridge and view-model return shapes remain unchanged for Hologram, Widget, MiniChat, and legacy payload boundaries. Future or unknown transcript sources can remain inside the typed Presence voice route boundary, while display and legacy compatibility helpers continue narrowing them to the existing `"user"` / `"model"` contract.

The next phase is provider/fallback port planning or runtime-owned voice session control, depending on how much additional parity coverage is in place before moving execution ownership out of the dashboard path.

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

## VisualCore parity audit

VisualCore parity now has dependency-free CommonJS smoke coverage around the
extracted IPC adapter and window factory. The IPC tests cover
`get-current-display-id` display lookup and lookup-failure handling,
`visual-core-ready` pending-data flush and ready-state updates,
`open-visual-core` creation/status sync, both registered `close-visual-core`
handlers, `update-visual-core` ready/not-ready/missing-window branches,
`visual-core-interaction` forwarding to the main window, and
`visual-core-command` forwarding back to VisualCore. The window factory tests
cover BrowserWindow sizing and transparency options, saved bounds, development
and packaged load URL construction, preload/webview options, ready-to-show
pending-data queuing, and close cleanup.

The packaged VisualCore load path was corrected to match the other extracted
Presence surfaces. VisualCore now passes `../../dist/index.html` from
`platforms/electron/main.cjs` into the extracted factory, while the small
factory URL resolver preserves the existing `?mode=visual_core` development
and packaged URL shapes.

The duplicate `close-visual-core` registration is intentionally preserved. The
first handler keeps the legacy hide, pending-data clear, and status-sync path;
the second handler keeps the legacy close path. The new parity test locks both
registration effects separately so a later behavior-change PR can consolidate
or redesign close/hide semantics deliberately.

The duplicate ready-window `visual-core-update` fan-out is also intentionally
preserved. The adapter still sends an update before readiness branching and
sends a second update when VisualCore is already ready. The audit only hardens
status sync so `update-visual-core` reports VisualCore as visible for existing
windows as well as newly shown or newly created windows.

Remaining follow-up work should happen in a dedicated VisualCore
behavior-change PR: decide whether the legacy double close/hide registration
should become one explicit semantic, decide whether ready-window update fan-out
should emit once or twice, and only then adjust VisualCore product behavior
behind tests. Voice runtime ownership, wake-word routing, Presence message
routing, approval routing, sensor disclosure routing, VisualCore rendering, and
IPC channel names remain unchanged by this audit.

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
