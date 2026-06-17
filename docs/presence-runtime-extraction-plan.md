# Presence Runtime extraction plan

**Status:** architecture audit and refactor plan only  
**Behavior change in this PR:** none  
**Primary product decision:** MiniChat, Hologram, and Widget are LucaOS's core daily interaction layer. The main application is the full control center, not the default conversational surface.

## 1. Product architecture target

LucaOS should behave like a premium, device-level digital being whose presence can be summoned over the user's current work without forcing a context switch. The three Presence surfaces are:

- **MiniChat** — lightweight text, attachment, approval, and optional voice interaction.
- **Hologram** — glanceable face, voice, listening/speaking, intent, and privacy feedback.
- **Widget** — compact ambient/dictation overlay and a gateway to MiniChat, Hologram, or the control center.

The dashboard remains the place for settings, history, account/device management, detailed approvals, and full control. It should not have to be visible, focused, or mounted as the hidden execution host for ordinary Presence interaction.

The target boundary is:

```text
Input sources                         Presence Runtime                         Hosts
─────────────                         ────────────────                         ─────
wake word ───────────────┐         ┌─ state reducer/store ────────────────┐  Electron windows
shortcuts/tray ──────────┼─ intents│  event contracts + policy             ├─ LucaLink peers
surface controls ────────┤────────>│  voice/chat/sensor capability ports   ├─ mobile/wearable
LucaLink commands ───────┘         │  disclosure + focus decisions         ├─ future system shells
                                   └───────────────┬───────────────────────┘
                                                   │
                                      control-center capabilities
                                                   │
                                            dashboard (optional)
```

The runtime owns Presence state and orchestration. Bridges adapt that state to each surface. Electron owns native windows, shortcuts, focus, screen capture, and IPC transport. The dashboard consumes the runtime like any other host and supplies capabilities that have not yet been moved out of it.

## 2. Scope reviewed

This audit covers:

- `src/components/WidgetMode.tsx`
- `src/components/ChatWidgetMode.tsx`
- `src/components/HologramMode.tsx`
- `src/hooks/useSatelliteState.ts`
- `src/App.tsx`, especially mode routing, widget synchronization, chat, voice, sensor, wake-word, approval, and LucaLink paths
- `src/hooks/app/useAppIPC.ts` and `src/hooks/app/useVoiceEngine.ts` where App delegates relevant behavior
- `platforms/electron/main.cjs`
- `platforms/electron/preload.cjs` as the exposed transport boundary

This plan deliberately does not rewrite `App.tsx`, move runtime code, rename IPC channels, or alter window behavior.

## 3. Current topology

### 3.1 Renderer modes share the full application entry point

`App.tsx` imports all three Presence surfaces and selects them using `?mode=widget`, `?mode=chat`, and `?mode=hologram`. Each auxiliary Electron window therefore boots the same application bundle and enters a different early return. This is convenient routing, but it leaves Presence lifecycle and dependencies entangled with the control-center root.

### 3.2 The dashboard is the de facto Presence server

The dashboard currently owns or aggregates:

- voice session start/stop and backend selection;
- chat message execution;
- transcript, VAD, speaking, intent, persona, theme, elevation, and approval state;
- sensor/tray synchronization;
- LucaLink `UI_STATE_SYNC` broadcasting;
- streaming reply forwarding;
- hologram vision-frame processing.

`main.cjs` mostly relays messages between renderer windows. Consequently, normal MiniChat or Hologram use depends on a live `mainWindow.webContents`, even when the dashboard should remain hidden.

### 3.3 State is snapshot-based and weakly typed

`App.tsx` builds an unversioned `syncData` object and sends `sync-widget-state`. Electron fans it out as `widget-update` to Widget/MiniChat and `hologram-update` to Hologram. `useSatelliteState` normalizes both channels into a local state object; MiniChat separately implements another partial `widget-update` reducer. LucaLink receives the same object as `UI_STATE_SYNC`.

There is no authoritative Presence state contract, schema version, event ordering, source identity, capability declaration, or stale-update strategy.

## 4. Current state and event path map

The tables distinguish **observed current behavior** from the desired runtime owner. “Main renderer” means the dashboard instance of `App.tsx`/its hooks.

### 4.1 Surface open and close

| Flow | Current producer → transport → consumer | Current behavior / issue | Proposed owner |
|---|---|---|---|
| MiniChat open | Tray `toggleChatWindow`; global `Control+M` → `toggleChatWindow()` in `main.cjs` | Native lifecycle is centralized in a large main file. MiniChat is created at launch but starts hidden. Its exact focus policy is implicit in `show()` behavior and its input auto-focuses on mount. | `shortcutIpc.cjs`/tray emits `presence/summon`; `createMiniChatWindow.cjs` applies an explicit focus policy; `miniChatBridge` reports readiness/visibility. |
| MiniChat close | `ChatWidgetMode.handleClose` → `chat-widget-close` → `main.cjs` | Handler hides both `chatWindow` **and** `widgetWindow`, coupling two independent surfaces. | `presence/dismiss { surface: "miniChat" }`; only the requested surface changes. |
| Hologram open/close | Tray → `toggleHologram()`; production launch auto-toggle; no renderer close command in scoped component | Uses `show()` rather than a policy operation. Window is `focusable: false`, but open behavior is spread across launch/tray/shortcut code. | `presence/summon`/`presence/dismiss`; Hologram bridge and window factory implement non-activating presentation. |
| Widget open/close | Tray “Start Dictation” → `toggleWidgetWindow()`; `Control+D`/`F4` ensures and shows window; `switch-to-widget`; MiniChat close also hides it | Tray label conflates visibility with dictation. Some paths use `showInactive()`, hotkeys use `show()`. `restore-main-window` closes Widget rather than merely dismissing it. | `presence/summon { surface: "widget" }`, separate `voice/toggle`, and explicit `controlCenter/open`. |
| Control center open | Widget expand → `restore-main-window`; global `Cmd/Ctrl+Shift+L`; tray dashboard item | Widget expand closes Widget and focuses the main window. | `controlCenter/open { reason }`; dashboard focus is intentional only for this event or a focus-required system flow. |

### 4.2 Wake word and voice

| Flow | Current producer → transport → consumer | Current behavior / issue | Proposed owner |
|---|---|---|---|
| Wake-word enable | Tray → `toggle-wake-word` → `useAppIPC` updates settings; settings sync back via `sync-wake-word-tray` | Monitoring configuration requires the main renderer. Tray state and settings can optimistically diverge. | Presence Runtime sensor capability + `sensorIpc`; one state transition updates policy, monitor, tray, and disclosure. |
| Wake-word trigger | renderer sends `wake-word-triggered` → `main.cjs` shows/restores/focuses dashboard → `trigger-voice-hud` → `useAppIPC` sets voice mode | Directly violates widget-first behavior and steals active-app focus. If `mainWindow` is absent it recreates the dashboard. | Runtime receives `wakeWord/detected`, chooses Hologram or MiniChat from policy/preferences, presents it without activation, and starts/continues voice. Dashboard remains closed. |
| Hologram voice toggle | Hologram click → `widget-toggle-voice` → `main.cjs` → main renderer `trigger-voice-toggle` → App listener → `toggleVoiceMode` | Voice execution is owned by dashboard. The Hologram cannot work independently of it. | `hologramBridge` dispatches `voice/toggle`; runtime calls a voice capability port and publishes state. |
| Widget voice toggle | Widget listens directly for `trigger-voice-toggle`; global dictation shortcut sends that event to Widget; Hologram shortcut also sends the same event to Hologram | One channel means different things in different surfaces. Widget mutates dictation locally; Hologram does not listen to it directly and instead sends another channel when clicked. | Typed `voice/start`, `voice/stop`, `dictation/start`, and `dictation/stop` intents with source and session IDs. |
| MiniChat voice toggle | Input button directly calls `useVoiceInput`; `trigger-voice-toggle` listener separately toggles local dictation and may send `type-text` | MiniChat can create a separate voice session from the dashboard and conflates chat voice input with OS dictation. Closure-based toggle state can race. | Runtime owns a single session model with purpose (`conversation`, `dictation`, `wake`) and surface attribution. |
| Dashboard voice toggle | App `toggleVoiceMode` selects backend, starts/stops services, changes HUD state, and currently auto-enables mic privacy when requested | Session logic, UI state, privacy mutation, and dashboard HUD are coupled. Automatically changing a disabled privacy setting is unsafe. | Voice capability adapter handles session mechanics; Presence Runtime requests access through disclosure/consent policy and never silently changes privacy policy. |


### 4.2.1 Phased voice ownership extraction

Voice extraction should proceed in explicit phases to avoid moving runtime
ownership before the route contract is stable:

1. typed route boundary ✅
2. renderer bridge adoption ✅
3. Electron voice adapter parity tests ✅
4. runtime-owned voice state ⏭️
5. provider/fallback migration ⏭️
6. dashboard decoupling ⏭️

### 4.3 State synchronization (`widget-update`, `hologram-update`, approvals, LucaLink)

| Flow | Current producer → transport → consumer | Current behavior / issue | Proposed owner |
|---|---|---|---|
| `widget-update` | App → `sync-widget-state` → `main.cjs` → Widget and MiniChat | App snapshot includes voice, persona, status, intent, elevation, and approval. Widget uses `useSatelliteState`; MiniChat has a second custom parser. | Runtime store emits a versioned `PresenceSnapshot`; `widgetBridge` and `miniChatBridge` select only supported fields. |
| `hologram-update` | App → `sync-widget-state` → `main.cjs` → Hologram | Same data uses a surface-specific channel solely at the final hop. | `hologramBridge` subscribes to runtime state; transport naming is host-neutral. |
| `widget-voice-data` | Any renderer → `main.cjs` → all Presence windows | Duplicates `sync-widget-state` fan-out and has no source validation. | Remove after compatibility period; all changes enter runtime as typed events. |
| Persona/theme | settings listeners + `switch-persona` fan-out + sync snapshots | Multiple sources can update the same visible state. `useSatelliteState` initializes persona from `general.theme`, then settings updates use `general.persona`, indicating semantic drift. | Canonical `personaId` and `appearance` fields in Presence state; settings adapter is one producer. |
| Approval request sync | App inserts `approvalRequest` into widget snapshot → MiniChat renders `SecurityGate` → `resolve-permission` | `SatelliteState` does not declare approval, while MiniChat's local type does. Approval identity and resolution ownership are opaque; the response channel is outside this fan-out. | Runtime stores a sanitized `PresenceApprovalPrompt` and routes decisions to an approval capability. Disclosure policy decides whether non-activating approval is sufficient or a focused native/system flow is required. |
| LucaLink state | App `broadcastToSatellites(syncData)` → `UI_STATE_SYNC` → `useSatelliteState` fallback | LucaLink sync only activates when Electron IPC is absent, so transport selection is environment-based rather than host/capability based. Raw `Set` inside `elevationState` is not safely portable through JSON transports. | Host-neutral serializable snapshot/events, schema version, monotonic revision, origin device/session, and capability negotiation. Electron and LucaLink are parallel adapters. |

### 4.4 MiniChat messaging and streaming

| Flow | Current producer → transport → consumer | Current behavior / issue | Proposed owner |
|---|---|---|---|
| `chat-widget-message` | MiniChat awakening pulse, submit, or suggestion → `main.cjs` → main renderer | `main.cjs` forwards `chat-widget-message`. `useAppIPC` correctly listens on that channel. `App.tsx` also contains a separate listener for `trigger-chat-message`, including unconditional `request-focus`; this is a stale/parallel path and creates ambiguity. | `miniChatBridge.sendMessage` emits `conversation/send` with message/session IDs. Runtime calls the conversation capability without focusing the dashboard. |
| Non-stream reply | main renderer → `reply-chat-widget` → Electron → `chat-widget-reply` | Reply assumes MiniChat exists and logs with `reply.substring`, which is fragile for object replies. No correlation ID is required. | `conversation/completed` correlated by request/message ID; bridge maps it to MiniChat view state. |
| Stream chunk | chat controller/main renderer sends `broadcast-stream-chunk` → Electron → `chat-widget-stream-chunk` | Channel naming describes relay mechanics rather than domain intent. Ordering, duplication, terminal state, and reconnect behavior are implicit. | `conversation/delta` and `conversation/completed` with message ID, sequence, and optional generated artifacts. |
| Main-window focus | stale `trigger-chat-message` App path → `request-focus` | Ordinary widget chat should not activate the dashboard. | No focus action for normal messages. Runtime escalates only for `requiresFocus` flows. |

### 4.5 Screen capture / Eye mode and sensor disclosure

| Flow | Current producer → transport → consumer | Current behavior / issue | Proposed owner |
|---|---|---|---|
| MiniChat Eye toggle | local `isEyeActive` → settings privacy check → `awarenessService.startAmbientVisionLoop`; hidden `ScreenShare` captures context on submit | Sensor state is local and not part of canonical Presence state. The visible Eye control may indicate intent, but the actual hidden capture component and ambient loop do not share a formal disclosure lifecycle. A denied privacy check returns while `isEyeActive` remains true. | `sensor/request { kind: "screen", purpose }`; runtime transitions `requesting → active/denied/error`; all surfaces receive disclosure state. |
| MiniChat one-shot capture | `capture-screen` invoke → `desktopCapturer.getSources` chooses `sources[0]` | No explicit source picker or captured-display guarantee. Permission, capture, disclosure, and selected source are not modeled together. | `sensorIpc.captureScreen` accepts a runtime-issued request ID and source policy; file/source selection may activate a native picker. |
| Hologram ambient vision | Hologram starts ambient vision automatically on mount whenever screen privacy is enabled → `hologram-vision-frame` → `useAppIPC` sends hidden prompt | Merely enabling screen privacy permits continuous observation whenever Hologram mounts. There is no explicit per-session user action or guaranteed visible disclosure. Processing still depends on dashboard. | Default off unless user has explicitly enabled an ambient-vision mode; runtime owns lease, purpose, visible indicator, expiration, and processing capability. |
| Dashboard wake-on-voice vision | App captures every second while VAD and screen sharing are active | Capture cadence is tied to dashboard refs and voice state. | Sensor capability publishes frames under an active, disclosed runtime lease. |
| Sensor tray state | App sends `sensor-status-update`; privacy uses separate `sync-privacy-state`; tray stores its own `sensorState` | Permission, policy, requested, and actually-active states are conflated across separate paths. | Canonical sensor model distinguishes policy, OS permission, request, active lease, source, purpose, and disclosure visibility. |

## 5. Fragile and unsafe coupling

### Critical

1. **Wake word focuses the dashboard.** `wake-word-triggered` explicitly shows, restores, and focuses `mainWindow`. This interrupts the active application and encodes the dashboard as Luca's presence.
2. **Presence execution requires `mainWindow`.** Voice toggles, MiniChat messages, and Hologram vision frames are routed to the dashboard renderer. Hidden is not the same as independent; renderer reload/crash can disable daily surfaces.
3. **Continuous screen observation can start on Hologram mount.** A global setting is treated as sufficient consent, with no runtime lease or guaranteed visible privacy state.
4. **Voice activation can silently re-enable microphone privacy.** `toggleVoiceMode` writes `micEnabled: true` when disabled. A user privacy choice must instead produce a blocked/request state with clear disclosure.
5. **Ordinary MiniChat interaction has a focus-stealing path.** The stale `trigger-chat-message` listener requests dashboard focus before processing.

### High

6. **IPC contract mismatch and duplication.** Electron forwards `chat-widget-message`; `useAppIPC` handles it; App also listens for `trigger-chat-message`. `sync-widget-state` and `widget-voice-data` both fan out similar snapshots.
7. **MiniChat close hides Widget too.** Independent surfaces share a close channel with surprising side effects.
8. **Focus behavior varies by invocation.** Widget tray toggling uses `showInactive()`, dictation shortcuts use `show()`, Hologram uses `show()`, and MiniChat relies on default focus behavior.
9. **Approval data is untyped and piggybacks on UI sync.** It may expose more tool arguments than a small surface needs and lacks explicit focus/escalation policy.
10. **Surface code owns orchestration.** MiniChat directly starts voice, awareness, LucaLink delegation, screen observation, conversation state, IPC parsing, and approvals. Hologram starts sensors. These are not presentation-only surfaces.

### Medium

11. **No event provenance or correlation.** IPC payloads use `any`; chat chunks and replies lack required sequencing and session identity.
12. **Snapshot dependency gaps.** The App widget-sync effect reads transcript source, active action, approval, and broadcast callback without listing all of them in dependencies, so satellites can receive stale fields.
13. **Non-serializable cross-host state.** `Set<string>` appears in `elevationState`, which is unsafe for JSON-based LucaLink synchronization.
14. **Divergent local reducers.** `useSatelliteState` and MiniChat independently interpret `widget-update`; surface behavior can drift.
15. **Mode routing and full-bundle boot.** Auxiliary windows depend on `App.tsx` mode branches and can initialize more application context than a dedicated Presence entry point should require.
16. **Public language is inconsistent with the target product.** User-visible and spoken strings include terms such as “SECURITY PROTOCOL,” “SYSTEM_OVERRIDE,” “Operator,” “God Mode,” “Sovereign AI,” and hacker-oriented dashboard concepts. Public Presence copy should be calm, direct, premium, and task-oriented. Internal identifiers/logs may remain technical.

## 6. Proposed renderer module

Create the following in a sequence of implementation PRs, not in this audit PR:

```text
src/presence/
  presenceTypes.ts
  presenceState.ts
  presenceEvents.ts
  presenceRuntime.ts
  miniChatBridge.ts
  hologramBridge.ts
  widgetBridge.ts
  presenceDisclosurePolicy.ts
  presenceRuntime.test.ts
```

### `presenceTypes.ts`

Defines transport-safe domain types only. No React, Electron, browser globals, service singletons, or dashboard types.

Recommended core types:

- `PresenceSurface = "miniChat" | "hologram" | "widget" | "controlCenter"`
- `PresenceVisibility = "hidden" | "summoning" | "visible" | "dismissing"`
- `PresenceFocusMode = "preserve" | "activate-surface" | "activate-control-center" | "native-required"`
- `PresenceVoicePurpose = "conversation" | "dictation" | "wake"`
- `PresenceSensorKind = "microphone" | "camera" | "screen"`
- `PresenceSensorStatus = "off" | "requesting" | "active" | "blocked" | "error"`
- `PresenceApprovalPrompt` with sanitized summary, risk level, request ID, expiry, and `requiresFocus`
- `PresenceSnapshot` with `schemaVersion`, `revision`, `origin`, surface state, conversation state, voice state, sensor/disclosure state, persona/appearance, approval, and connectivity
- Serializable elevation fields (`authorizedMissionIds: string[]`, never `Set`)

### `presenceEvents.ts`

Defines a discriminated union and constructors/guards. Suggested domain events:

```text
presence/summon
presence/dismiss
presence/ready
presence/visibilityChanged
controlCenter/open
voice/start
voice/stop
voice/stateChanged
wakeWord/detected
conversation/send
conversation/delta
conversation/completed
conversation/failed
sensor/request
sensor/activated
sensor/stopped
sensor/blocked
approval/presented
approval/resolve
approval/resolved
settings/appearanceChanged
host/connected
host/disconnected
state/hydrate
```

Every envelope should carry `eventId`, `timestamp`, `originHostId`, optional `sessionId`, optional `correlationId`, and `schemaVersion`.

### `presenceState.ts`

A pure reducer plus selectors. It is the single canonical interpretation of events. Key selectors include:

- `selectSurfaceSnapshot(surface)`
- `selectSummonTarget(trigger, preferences, capabilities)`
- `selectVisiblePrivacyIndicators()`
- `selectCanPreserveFocus(event)`
- `selectPublicCopyContext()`

The reducer must be deterministic and testable without Electron or React.

### `presenceDisclosurePolicy.ts`

A pure policy module that decides:

- whether a sensor request is allowed by user policy;
- whether OS permission or a source/file picker is required;
- what visible indicator each active sensor requires;
- which surface must display it;
- whether an approval can remain in MiniChat/Hologram or requires focused control center/native UI;
- whether public-mode copy is allowed.

**Invariant:** an active microphone, camera, or screen-capture lease must have a visible, truthful disclosure state on every active Presence surface and in the system tray/menu. “Privacy enabled” is not equivalent to “sensor active.”

### `presenceRuntime.ts`

A framework-neutral orchestrator created with injected capability ports:

```ts
createPresenceRuntime({
  voice,
  conversation,
  sensors,
  approvals,
  surfaces,
  settings,
  link,
  clock,
  ids,
  logger,
})
```

Responsibilities:

- accept typed intents/events;
- reduce canonical state and publish revisions;
- execute side effects through ports;
- apply disclosure and focus policy before effects;
- correlate streams and approvals;
- synchronize host-neutral snapshots/events;
- remain alive independently of dashboard visibility.

It must not import `App.tsx`, React components, Electron, or concrete LucaLink managers.

### Surface bridges

`miniChatBridge.ts`, `hologramBridge.ts`, and `widgetBridge.ts` are thin adapters:

- map runtime snapshots to surface view models;
- translate user gestures into typed runtime events;
- advertise surface capabilities;
- contain temporary legacy IPC compatibility during migration;
- do not start sensors, voice services, or chat execution directly.

`useSatelliteState` should eventually become a small `usePresenceSnapshot(surface)` adapter or be retired. During migration, it can consume a compatibility snapshot generated by the bridges.

## 7. Proposed Electron extraction

```text
platforms/electron/windows/
  createMiniChatWindow.cjs
  createHologramWindow.cjs
  createWidgetWindow.cjs
platforms/electron/ipc/
  presenceIpc.cjs
  sensorIpc.cjs
  shortcutIpc.cjs
```

### Window factories

Each factory receives dependencies rather than closing over global variables:

```js
createMiniChatWindow({ BrowserWindow, screen, preloadPath, appUrl, onClosed })
```

Each returns a narrow controller (`show`, `showInactive`, `hide`, `resize`, `send`, `isVisible`, `destroy`) and owns bounds, transparency, always-on-top, workspace behavior, readiness queues, and platform-specific focus rules.

Required defaults:

- **Hologram:** non-focusable and non-activating; interactive regions may require a deliberate temporary interaction strategy rather than making the full transparent rectangle intercept input.
- **Widget:** non-focusable, shown inactive, and never activated merely to start dictation.
- **MiniChat:** summon without activating by default when triggered by wake word/ambient presence; activate only for explicit text entry. Native file/source pickers may take focus and return it afterward.
- All factories queue messages until `did-finish-load`/ready and cleanly report closure.

### `presenceIpc.cjs`

Registers lifecycle and domain transport:

- summon/dismiss/visibility/readiness;
- voice and conversation intents;
- state snapshots and event delivery;
- approval presentation/resolution;
- compatibility handlers for legacy channels during migration.

It validates sender window, payload schema, allowed direction, and correlation IDs. It should not execute conversation or voice logic itself.

### `sensorIpc.cjs`

Owns native sensor operations and OS permission/source selection:

- screen source enumeration and one-shot capture;
- display resolution for the requesting surface;
- permission-settings links;
- active capture lease tracking;
- sensor status publication to runtime/tray.

It must reject capture without a runtime-authorized request/lease and must not select `sources[0]` as an undocumented default when user choice or current display is required.

### `shortcutIpc.cjs`

Owns global shortcuts and tray-to-runtime intents. Suggested semantics:

- `Cmd/Ctrl+Shift+L`: open/toggle full control center (explicit request).
- MiniChat shortcut: summon/dismiss MiniChat.
- Hologram shortcut: summon Hologram and optionally toggle a conversation voice session.
- Dictation shortcut: summon Widget without activation and start/stop a dictation session.
- Wake word: dispatch `wakeWord/detected`; never focus the dashboard by default.

Registration must report conflicts/failures and unregister on shutdown.

### Composition in `main.cjs`

After extraction, `main.cjs` should compose app lifecycle, window controllers, runtime transport, sensors, and shortcuts. It should not contain per-surface geometry, dozens of Presence channel handlers, or domain decisions. Existing channels remain as adapters until all renderer callers migrate.

## 8. Correct default behavior

### Wake word

1. Wake-word service emits `wakeWord/detected`.
2. Runtime checks privacy, current session, quiet/public mode, available surfaces, and user preference.
3. Default target is Hologram for voice-first acknowledgement; MiniChat is preferred when the user is already typing, voice is unavailable, or accessibility/preferences request text.
4. Surface appears without activating LucaOS or replacing the active app.
5. A visible microphone/listening indicator appears before or at sensor activation.
6. Dashboard opens only after an explicit “open control center” intent or a flow that cannot safely complete in Presence.

### Focus

- Summon, transcript updates, replies, status changes, and passive approvals preserve active-app focus.
- Explicit click into MiniChat text input may activate MiniChat because the user requested keyboard interaction.
- File selection, screen-source selection, OS permission dialogs, and approvals marked `requiresFocus` may activate native UI or the control center.
- Focus escalation is a policy result recorded with a reason, not an incidental consequence of `BrowserWindow.show()`.
- After a native picker, return focus to the previously active application when the platform supports it and the user has not chosen another app.

### Sensors and privacy

- Sensor policy (`allowed`) and sensor activity (`active now`) are separate.
- Every sensor use has purpose, requesting surface, start time, optional expiry, and visible disclosure.
- Screen observation never starts solely because Hologram mounted.
- Denied requests leave the UI visibly blocked/off, not apparently active.
- Wake word has a persistent but subtle microphone disclosure appropriate to always-listening mode.
- Public mode suppresses sensitive transcript/content previews and uses neutral language.

### Public language

Presence surfaces should say, for example, “Listening,” “Looking at this screen,” “Approval needed,” “Open Control Center,” and “Action paused.” They should avoid “hacker,” “operator,” “override,” “security protocol,” “god mode,” “sovereign,” exploit-themed copy, or terminal theatrics in public mode. Advanced capabilities can remain available without defining LucaOS as an AI development workspace or cyberpunk dashboard.

## 9. Migration strategy with no behavior cliff

1. Introduce pure types, reducer, policy, and tests without wiring production code.
2. Add runtime in shadow mode: ingest legacy snapshots/events, compare derived state, produce diagnostics, but do not drive UI or effects.
3. Extract Electron window factories with byte-for-byte-equivalent options and legacy exports.
4. Extract IPC registration modules while preserving every legacy channel.
5. Move state fan-out behind Presence bridges; continue emitting `widget-update`/`hologram-update` compatibility snapshots.
6. Move MiniChat conversation routing and streaming into runtime capability adapters; remove duplicate/stale App listeners only after contract tests pass.
7. Move voice orchestration behind runtime ports while dashboard remains a temporary adapter host.
8. Move wake-word/sensor ownership and then apply the new disclosure/focus defaults in a dedicated, user-visible behavior PR.
9. Migrate LucaLink to versioned Presence events/snapshots with backward compatibility.
10. Delete legacy channels and App orchestration only after telemetry/tests show no remaining callers.

## 10. Exact follow-up implementation PRs

### PR 1 — Add Presence domain contracts and reducer (no production wiring)

- Add `presenceTypes.ts`, `presenceEvents.ts`, `presenceState.ts`, `presenceDisclosurePolicy.ts`, and `presenceRuntime.test.ts`.
- Define serializable schema, reducer invariants, focus/disclosure policy, and public-copy constraints.
- Test wake summon selection, stale revisions, stream ordering, sensor disclosure, approval escalation, and JSON round trips.

### PR 2 — Add shadow Presence Runtime and legacy mapping adapter

- Add `presenceRuntime.ts` with injected no-op capabilities.
- Map current App snapshot fields and IPC events into runtime events.
- Log state divergences in development only; do not drive product behavior.
- Add channel mapping contract tests.

### PR 3 — Extract Electron Presence window factories without behavior changes

- Add the three `platforms/electron/windows/create*Window.cjs` modules.
- Preserve current sizes, URLs, visibility, focusability, and lifecycle exactly.
- Add unit tests with mocked Electron objects where practical.

### PR 4 — Extract Presence, sensor, and shortcut IPC registration without behavior changes

- Add `presenceIpc.cjs`, `sensorIpc.cjs`, and `shortcutIpc.cjs`.
- Keep legacy channel names and current routing.
- Add sender validation and lifecycle-safe registration/unregistration without changing outcomes.

### PR 5 — Introduce surface bridges and unify Presence snapshot consumption

- Add `miniChatBridge.ts`, `hologramBridge.ts`, and `widgetBridge.ts`.
- Replace MiniChat's duplicate update parser and `useSatelliteState` channel-specific logic with bridge selectors.
- Keep compatibility emissions so UI behavior remains unchanged.

### PR 6 — Move MiniChat conversation and stream routing out of App

- Runtime owns message IDs, deltas, completion, errors, and awakening requests.
- Remove the stale `trigger-chat-message` path and ordinary `request-focus` behavior only in this explicitly behavior-reviewed PR.
- Preserve existing conversation service/tool behavior through an injected adapter.

### PR 7 — Move voice session orchestration behind Presence Runtime

- Extract voice start/stop/backend/session-purpose behavior from App into a capability adapter.
- Unify Hologram, MiniChat voice input, Widget dictation, shortcuts, and wearable triggers.
- Keep dashboard Voice HUD as a subscriber rather than the owner.

### PR 8 — Enforce Presence focus and summon policy

- Wake word summons Hologram/MiniChat without dashboard focus.
- Standardize `showInactive`/non-activating presentation.
- Add explicit `controlCenter/open` and focus-required escalation.
- Add platform integration tests/manual verification matrix for macOS, Windows, and Linux.

### PR 9 — Enforce sensor leases and visible privacy disclosure

- Move capture and ambient vision behind `sensorIpc` and runtime authorization.
- Stop Hologram mount-time auto-observation.
- Distinguish permission, preference, requested, and active states.
- Add visible indicators to all active surfaces and tray; test denied/error/expiry paths.

### PR 10 — Version LucaLink Presence synchronization

- Add schema/version negotiation, revision/order handling, origin IDs, capability advertisement, and serializable elevation state.
- Support concurrent Electron and LucaLink adapters rather than an either/or environment branch.
- Retain legacy `UI_STATE_SYNC` during a deprecation window.

### PR 11 — Sanitize public Presence language

- Add public/private copy policy and neutral user-facing strings.
- Remove cyberpunk/hacker framing from MiniChat, Hologram, Widget, tray, spoken approvals, and notifications while preserving internal diagnostics and advanced control-center capabilities.
- Product/design review required.

### PR 12 — Remove legacy Presence orchestration from App and `main.cjs`

- Delete deprecated channels, duplicate reducers/listeners, App snapshot loop, and main-file window implementations.
- Give Presence modes dedicated lightweight renderer entry points if bundle/lifecycle measurements support it.
- Confirm dashboard can be closed/hidden while Presence chat, voice, wake word, approvals, and state sync continue.

## 11. Test and acceptance matrix for implementation

| Scenario | Expected invariant |
|---|---|
| Wake word while another app is active | Hologram/MiniChat appears; active app retains focus; microphone disclosure is visible; dashboard remains hidden. |
| MiniChat typed message | Message streams in MiniChat with correlated IDs; dashboard does not activate. |
| Widget dictation | Widget remains non-activating; text is inserted into the previously active app; sensor state is visible. |
| Hologram voice click | One runtime voice session toggles; no duplicate MiniChat/dashboard session. |
| Eye request denied by policy | No capture occurs; Eye shows blocked/off; tray and all surfaces agree. |
| Screen source selection | Native picker may focus; selected source and disclosure are recorded; focus restoration is deliberate. |
| Approval safe for overlay | Sanitized prompt appears in MiniChat; decision resolves exactly once. |
| Approval requires focused UI | Runtime opens native/control-center flow with an explicit reason. |
| Dashboard renderer reloads | Existing Presence surfaces retain lifecycle and recover state without silent sensor continuation. |
| LucaLink reconnect/out-of-order update | Revision handling rejects stale state and resumes from a versioned snapshot. |
| Public mode | No sensitive preview or hacker/cyberpunk terminology appears on Presence surfaces. |

## 12. Definition of done for the architecture program

- MiniChat, Hologram, and Widget are independently summonable core surfaces, not alternate dashboard render modes in architectural ownership.
- The dashboard is optional for daily chat, voice, wake word, and glanceable state.
- Presence state/events are typed, versioned, serializable, ordered, and multi-host capable.
- Electron native concerns are modular and tested; domain policy is not embedded in `main.cjs`.
- Normal Presence interactions preserve active-app focus.
- Every active sensor has truthful, visible privacy disclosure and an auditable lease/purpose.
- Approval sync is sanitized, correlated, and escalates focus only when required.
- LucaLink uses the same domain contract as local surfaces.
- Public Presence copy expresses a calm premium digital being, not a chatbot, developer workspace, or cyberpunk operations console.
