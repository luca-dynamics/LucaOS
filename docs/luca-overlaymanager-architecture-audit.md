# Luca OverlayManager Architecture + Governance Map
Date: 2026-05-30 (UTC)
Status: Audit/map only. No OverlayManager runtime behavior changed. No overlays added/removed. No z-index, focus, or pointer-events behavior changed. No automation, capture, DOM reading, screenshot/OCR/vision, file access, messaging, wireless/device control, tool execution, or sensitive-surface enablement added.

This document mirrors the VisualCore architecture audit approach from PR #140
(`src/types/visualCoreGovernance.ts`, `src/services/runtime/VisualCoreArchitectureAudit.ts`).
The machine-readable form of this map lives in:

- `src/types/overlayManagerGovernance.ts` — typed surface/posture/capability model.
- `src/services/runtime/OverlayManagerGovernancePolicy.ts` — per-surface classification + summary.
- `src/services/runtime/OverlayManagerArchitectureAudit.ts` — narrative findings/gaps/next-steps.

## What OverlayManager is

`src/components/layout/OverlayManager.tsx` is a flat React fragment rendered once by
`App.tsx` (`<SafeComponent componentName="OverlayManager"><OverlayManager .../></SafeComponent>`).
It conditionally renders ~18 overlay surfaces. It is **not** a stacking/priority manager:

- **Registration**: none. Each overlay is a JSX child gated by a `show*` boolean prop.
- **Open/show paths**: `show*` props flip to `true` in `App.tsx` state (from UI handlers, IPC, eventBus, or remote paths upstream). OverlayManager renders the overlay when the prop is truthy.
- **Close/hide paths**: each overlay calls its own `setShow*(false)` / `onClose` callback (passed down as props). OverlayManager holds no overlay state itself.
- **Stacking / z-index / priority**: hard-coded inline per overlay (e.g. autonomous banner `z-[1000]`, reboot overlay `z-[2000]`). There is no central z-index authority or priority queue.
- **Focus / input**: per-overlay. There is no central focus manager.
- **Pointer-events**: per-overlay (e.g. the reboot overlay uses `pointer-events-auto` to block interaction while shown).
- **IPC / eventBus / remote-command entry points**: OverlayManager does not subscribe to IPC directly. The upstream `show*` state in `App.tsx` (and hooks like `useAppIPC`) is where IPC/remote toggles live. The **Android native overlay** subsystem is the exception — it is IPC/event driven via the Capacitor plugin.

## Surface map

| Surface | Source | Category | Risk | Current posture | Key capability today |
|---|---|---|---|---|---|
| PresenceMonitor | OverlayManager.tsx | presence_vision | high | local-ui-only, sensitive-surface, needs-governance | Ambient camera sampling (presence/mood) |
| ScreenShare | OverlayManager.tsx | capture_surface | high | local-ui-only, sensitive-surface, needs-governance | Screen-frame capture (`onFrameCapture`) |
| Autonomous action banner | OverlayManager.tsx | passive_display | low | display-only, local-ui-only | Read-only banner (`z-[1000]`) |
| App background layer | OverlayManager.tsx | passive_display | low | display-only, local-ui-only | Decorative background (`z-0`) |
| GhostCursor | OverlayManager.tsx | passive_display | low | display-only, local-ui-only | Visualizes agent cursor (no input) |
| Reboot overlay | OverlayManager.tsx | passive_display | low | display-only, local-ui-only | Full-screen block (`z-[2000]`, pointer-events-auto) |
| LiveContentDisplay | OverlayManager.tsx | passive_display | elevated | display-only, local-ui-only, needs-governance | Renders arbitrary `liveContent` payload |
| SecurityGate | OverlayManager.tsx | approval_surface | elevated | input-capable, local-ui-only | Tool-execution approval/deny gate |
| VoiceHud | OverlayManager.tsx | voice_surface | high | input-capable, local-ui-only, visualcore-linked, sensitive-surface, needs-governance | Voice capture → `taskQueue.add`; can resolve approvalRequest by voice |
| VoiceCommandConfirmation | OverlayManager.tsx | voice_surface | elevated | input-capable, local-ui-only, needs-governance | Confirms risky voice commands → `taskQueue.add` |
| VisionCameraModal | OverlayManager.tsx | capture_surface | high | input-capable, local-ui-only, sensitive-surface, needs-governance | Camera capture + `analyzeImageFast` |
| RemoteAccessModal | OverlayManager.tsx | remote_access_surface | high | remote-command-capable, local-ui-only, sensitive-surface, needs-governance | Remote-access pairing (Luca Link) |
| DesktopStreamModal | OverlayManager.tsx | capture_surface | high | remote-command-capable, local-ui-only, sensitive-surface, needs-governance | Desktop stream to target via local core |
| LucaRecorder | OverlayManager.tsx | capture_surface | high | local-ui-only, sensitive-surface, needs-governance | Records + uploads imprint, registers as agent skill |
| HumanInputModal | OverlayManager.tsx | approval_surface | high | input-capable, local-ui-only, sensitive-surface, needs-governance | Collects input incl. passwords/secrets |
| SharedOverlayPanels (group) | surfaces/shared/SharedOverlayPanels.tsx | panel_group | high | local-ui-only, remote-command-capable, sensitive-surface, needs-governance | Messaging managers, file/code editors, Luca Link |
| OriginOverlayPanels (group) | surfaces/origin/OriginOverlayPanels.tsx | panel_group | critical | local-ui-only, remote-command-capable, sensitive-surface, needs-governance, blocked-until-policy | ROOT grant, lockdown override, hacking terminal, device/tool execution |
| Android native overlay | plugins/luca-overlay, services/overlay*{Service,Integration} | native_widget_surface | high | widget-linked, input-capable, local-ui-only, sensitive-surface, needs-governance, blocked-until-policy | Draws over other apps; forwards voice/chat to `lucaService` |

## Capability answers (PR #148 question 4)

- **Display browser content**: No OverlayManager surface hosts browser content directly. Browser surfaces live in VisualCore / LucaBrowser (PR #140/#143).
- **Receive remote commands**: RemoteAccessModal, DesktopStreamModal, the Luca Link modal in SharedOverlayPanels, and the Android native overlay.
- **Open external surfaces**: RemoteAccessModal, DesktopStreamModal, OriginOverlayPanels (TV/device), Android native overlay (draws over other apps).
- **Trigger VisualCore mode transitions**: Not directly. Transitions flow through VisualCore's own IPC/remote-command path (PR #140/#145/#146).
- **Capture input**: SecurityGate, VoiceHud, VoiceCommandConfirmation, VisionCameraModal, HumanInputModal, Android native overlay.
- **Access files**: SharedOverlayPanels (CodeEditor, MobileFileBrowser, Ingestion), LucaRecorder (uploads recording blob).
- **Invoke tools**: VoiceHud (`taskQueue.add`), VoiceCommandConfirmation, VisionCameraModal (`analyzeImageFast`), LucaRecorder (skill imprint), OriginOverlayPanels (`controlSmartTV`, `executeCustomSkill`), Android native overlay (`lucaService.sendMessage`).
- **Affect messaging**: SharedOverlayPanels (WhatsApp/Telegram/Twitter/Instagram/LinkedIn/Discord/YouTube/WeChat).
- **Affect wireless/device control**: OriginOverlayPanels (wirelessManager `handleWirelessConnect`, tvRemote `controlSmartTV`).
- **Bypass VisualCore governance**: PresenceMonitor, ScreenShare, VoiceHud, and the Android native overlay all operate outside the VisualCore governance router.

## What is safe today

- The display-only surfaces (autonomous banner, background layer, GhostCursor, reboot overlay) only paint pixels and carry no input/capture/command/side-effect capability.
- Panel groups are already **build-time** gated by audience tier + capability in `src/surfaces/overlaySurfacePolicy.ts`, so disallowed builds cannot render origin/tactical panels.
- SecurityGate and VoiceCommandConfirmation present explicit approval/confirmation steps before risky actions.

## What is risky

- **Voice approval bypass**: VoiceHud can resolve the SecurityGate `approvalRequest` by voice (affirmative/negative words), sidestepping the visual approval surface.
- **Ungoverned capture**: PresenceMonitor / ScreenShare / VisionCameraModal / DesktopStreamModal / LucaRecorder capture camera/screen/audio with no per-activation gate or audit record.
- **Tool-execution from overlays**: VoiceHud, LucaRecorder (skill imprint), and OriginOverlayPanels (`controlSmartTV` / `executeCustomSkill`) reach tool execution from overlay UI.
- **Critical control surfaces**: OriginOverlayPanels exposes ROOT/admin grant, lockdown override, and a destructive hacking terminal.
- **Separate native entry point**: the Android LucaOverlay subsystem forwards voice/chat to `lucaService` from outside the LucaOS window, with continuous wake-word listening — independent of VisualCore and OverlayManager governance.
- **No central stacking/focus/pointer-events authority**: ordering and input-blocking are decided ad hoc per overlay.

## What needs governance next (follow-up PR recommendations)

These are recommendations for **future** PRs. This PR implements none of them.

1. **Overlay session records** for low-risk display-only surfaces first (lightweight, no behavior change), mirroring VisualCore display session records (PR #141).
2. **Close the VoiceHud approval bypass**: route voice approve/deny through the same governed approval path as SecurityGate.
3. **Sensitive-surface gate + audit** for capture surfaces (camera/screen/recorder), one surface at a time.
4. **Dedicated native-overlay policy**: govern the Android LucaOverlay as its own entry point before it forwards messages to `lucaService`.
5. **Per-surface policy for critical panels** (ROOT grant, lockdown, hacking terminal) — keep `blocked-until-policy`; do not govern generically.
6. **Decide on a central stacking/focus authority** only after per-surface governance exists; do not refactor stacking blindly.

## What was explicitly NOT changed

- OverlayManager runtime behavior, overlay registration, and show/hide paths.
- Overlay z-index, stacking, focus, and pointer-events behavior.
- Keyboard/mouse interaction behavior.
- No overlays added or removed.
- No browser automation, click/type/scroll automation, DOM reading, or screenshot/OCR/vision.
- No file access, messaging, or wireless/device control added.
- No tool execution wired up, and no sensitive surface enabled.
