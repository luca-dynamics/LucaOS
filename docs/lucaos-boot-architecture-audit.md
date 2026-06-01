# LucaOS Boot Architecture Audit + Experience Map

Date: 2026-06-01 (UTC)
Status: Audit/map only. No boot behavior changed. No onboarding behavior changed. No Chat/Voice mode selection changed. No boot timing, readiness checks, runtime initialization, Settings UI, shell layout, mobile navigation, desktop panels, runtime/governance services, tool execution, browser automation, file access, messaging, wireless/device control, or sensitive capability enablement changed.

Companion typed map: `src/services/runtime/lucaBootExperienceMap.ts`.

## Scope

This audit maps the current LucaOS path from launch to dashboard-ready, including first-run onboarding and degraded/cloud-only behavior. It is intended to support future boot experience polish without changing boot behavior in this PR.

Files/code paths inspected:

- `src/App.tsx` — owns `bootSequence`, `biosStatus`, boot/onboarding rendering, onboarding completion, Chat/Voice preferred mode handoff, effective connection tier, and dashboard transition.
- `src/hooks/app/useAppSystem.ts` — defines `BootSequence`, BIOS diagnostics, cloud-only fallback, kernel initialization, local core polling, async task/event/background loading, goals polling, and IoT initialization.
- `src/components/Onboarding/OnboardingFlow.tsx` — first-run onboarding state machine, local/cloud model setup, mode selection, model-readiness warnings, calibration, and completion callback.
- `src/services/onboarding/OnboardingController.ts` — typed onboarding step transitions.
- `src/services/onboarding/OnboardingLifecycleService.ts` — first-run kernel-awakening timing/copy.
- `src/components/Onboarding/ModeSelect.tsx` — Chat/Voice choice surface and model-route warning copy.
- `src/services/onboarding/OnboardingModelModeCoordinator.ts` — onboarding route readiness for chat, STT, TTS, and embedding.
- `src/services/introspectionService.ts` — health scan and local core readiness classification.
- `src/services/memoryService.ts` — Cortex status probe used by BIOS.

## Current boot flow: launch to dashboard ready

1. **React app mounts**
   - `App` wraps `AppContent` in `AppProvider`.
   - `AppContent` initializes `bootSequence` to `INIT` and `biosStatus` keys `server`, `core`, `vision`, and `audio` to `PENDING`.
   - App-level settings/theme/persona/preferred-mode state is read before boot finishes.
   - `useVoiceEngine`, `useChatController`, and `useAppSystem` are mounted while the boot screen can render.

2. **Special app modes can bypass the full boot surface**
   - Query parameter modes `widget`, `chat`, `browser`, `visual_core`, and `hologram` set `appMode`, make the body transparent, and set `bootSequence` to `READY`.
   - Native/Capacitor checks `settingsService.get("general").setupComplete` and routes directly to `READY` or `ONBOARDING`.

3. **BIOS diagnostics run on normal desktop/web cold boot**
   - Fast reboot is detected with `sessionStorage.LUCA_HAS_BOOTED === "true"`; if present, BIOS checks are bypassed and boot goes to `KERNEL`.
   - Cold boot sets `BIOS`, logs diagnostics, and plays the boot sound.
   - Electron secure-token handshake can set the Luca auth token and initialize authenticated `lucaService` services.
   - BIOS checks run for:
     - Server `/api/health` (critical; `resp.ok` or `401` passes).
     - Cortex core via `memoryService.getCortexStatus().available` (critical).
     - Vision/camera enumeration (non-blocking).
     - Audio/mediaDevices availability (part of the Promise results, but comments state only server/core are critical).
     - Ollama tags on `127.0.0.1:11434` (non-blocking informational).

4. **Critical checks pass: kernel load**
   - Boot sets `KERNEL`.
   - `safetyService` is imported and `memoryService.startSynapse()` is attempted as non-fatal.
   - Core tools are restored into `ToolRegistry`.
   - `introspectionService.scan()` checks vision, audio, Cortex, and tools.
   - `liveService.registerSensation(health)` stores/registers the health scan as a sensation.
   - On cold boot, `selfExpressionService.announceStatus()` may announce status by voice without blocking boot.
   - After kernel tasks, `settingsService.get("general").setupComplete` decides whether to enter `ONBOARDING` or `READY`.
   - On Electron ready path, a Genesis handshake emits `genesis-start`, refreshes `environmentSentinel`, and posts to Phoenix `/phoenix/ready` with a timeout.

5. **Critical checks fail: cloud-only degraded fallback**
   - Boot logs that no local infrastructure was detected and writes `sessionStorage.LUCA_CLOUD_ONLY = "true"`.
   - Tools are restored best-effort so chat can still work and backend-dependent tools can self-disable.
   - Boot routes to `ONBOARDING` if setup is incomplete, otherwise to `READY` with degraded local capability.

6. **Onboarding handoff**
   - `ONBOARDING` renders `OnboardingFlow` over the same boot background.
   - `OnboardingFlow` starts at `KERNEL_AWAKENING` unless it resumes a recoverable local provisioning step.
   - Onboarding proceeds through directive alignment, theme, identity, face scan, cognitive core selection, cloud/local activation, local plan/provisioning as needed, mode selection, conversation, calibration, and completion.

7. **Chat/Voice mode selection**
   - `ModeSelect` lets the user choose `text` or `voice`.
   - Selection updates `realtimeVoiceUiBridge`; voice starts a realtime session and text stops it.
   - `resolveOnboardingConversationMode` may fallback and alert the user.
   - `OnboardingModelModeCoordinator` checks chat route readiness, and also STT/TTS when voice is selected plus embedding where requested.
   - Warnings can be shown as alerts and are persisted at final confirmation.

8. **Onboarding completion to ready dashboard**
   - `OnboardingFlow` calls `onComplete(profile, conversationMode)` after calibration/complete.
   - `App` saves `setupComplete: true` and `preferredMode` into general settings.
   - If the selected mode is voice, `App` sets `isVoiceMode` and `showVoiceHud` to true.
   - `App` sets `bootSequence` to `READY`.

9. **READY dashboard**
   - The boot/onboarding screen exits and the dashboard/app mode renders.
   - Local core readiness polling continues every 5s, or 30s in cloud-only mode.
   - If local core is disconnected and the connection tier is not explicit `CLOUD`, App forces the effective connection tier to `OFFLINE` for UI clarity.
   - `voiceSessionOrchestrator` receives local-core connected/disconnected state.

## Current boot states

| State | Current representation | User visible? | Notes |
| --- | --- | --- | --- |
| Initial/loading | `INIT`, `BIOS`, `KERNEL` | Yes | Boot terminal/loader is visible and diagnostic-heavy. |
| Onboarding | `ONBOARDING`, plus onboarding steps | Yes | First-run setup, model/core choices, and Chat/Voice handoff live here. |
| Ready | `READY` | Yes | Main dashboard/app mode renders. |
| Degraded/cloud-only | `LUCA_CLOUD_ONLY`, console logs, ready/onboarding route | Mostly diagnostic/internal | No dedicated `BootSequence` enum; backend-dependent features are expected to self-disable. |
| Offline/local core unavailable | `localCoreReadinessLevel = offline`, effective connection tier `OFFLINE` | Partly visible after ready | Local core polling continues after boot. |
| Error/fallback | Kernel catch block routes to `READY` or `ONBOARDING` | Diagnostic/internal | User-facing fallback copy is not clearly distinct today. |

## Services and subsystems initialized during boot

- Settings/theme/persona/preferred mode reads and settings change listener.
- Voice engine state and Chat controller state.
- Electron security/auth handshake and authenticated Luca services when available.
- Server health probe.
- Cortex core probe through `memoryService.getCortexStatus()`.
- Camera and audio device probes.
- Ollama tags probe.
- Safety service import and memory Synapse start.
- Tool registry restore for core tools.
- Introspection scan for vision/audio/Cortex/tools.
- Live sensation registration.
- Non-blocking self-expression/voice status announcement on cold boot.
- Electron Genesis/Phoenix readiness signal after successful setup-complete kernel path.
- Task/event/background loading.
- Memory sync listener.
- Goals polling.
- IoT initialization when not native and not cloud-only.
- Local core readiness polling and cloud-only recovery detection.

## User-facing language map

| Surface | Current copy | Classification | Review note |
| --- | --- | --- | --- |
| BIOS shell | `LUCA BIOS v2.4` | Diagnostic/product-facing | Strong identity, but tactical by default. |
| INIT | `INITIALIZING HARDWARE`, `CHECKING MEMORY BANKS`, `MOUNTING LOCAL_CORE` | Diagnostic | Reads like a terminal, not a premium standard-user startup. |
| BIOS status | `SYSTEM INITIALIZATION`, `CORTEX CORE (RAG)`, `VISUAL CORTEX`, `AUDIO RECEPTORS`, `SECURITY PROTOCOLS: ENGAGED` | Diagnostic | Good for tactical/origin; needs standard-user translation. |
| BIOS values | `COMPLETE`, `FAILED`, `PENDING`, `ONLINE`, `OFFLINE`, `ERROR`, `CALIBRATING`, `INITIALIZING` | Diagnostic/degraded | Useful for readiness, but should be tiered by audience. |
| Kernel loader | `LOADING LUCA OS` | Product-facing | Clean and brand-aligned, but not very informative. |
| Onboarding kernel | `KERNEL AWAKENING IN PROGRESS`, `STABILIZING LUCA TENSORS`, `GENERATING IDENTITY KEYPAIR [ED25519]`, `LUCA AGENT INITIALIZED` | Cinematic/diagnostic | Distinctive; needs consistency review against app-level boot. |
| Onboarding local plan | `Chat & reasoning`, `Voice listening`, `Voice speaking`, `Vision`, `Memory` | Product-facing | Clearer labels; good starting point for future standard boot copy. |
| Mode selection | `How would you like to talk?`, `TEXT`, `VOICE`, `You can switch between text and voice anytime` | Product-facing | Polished standard-user copy. |
| Model warning | `Voice/model route needs attention` | Diagnostic/product-facing | Needs tiered wording and actionable standard-user language. |

## Product vs diagnostic surfaces

### Product-facing today

- Boot background and `LOADING LUCA OS` kernel loader.
- Onboarding flow and its theme/identity/core/mode/conversation steps.
- Chat/Voice mode selection.
- READY dashboard transition.

### Diagnostic-facing today

- BIOS terminal labels and values.
- Console logs for boot, BIOS, kernel, cloud-only, Phoenix, and local-core polling.
- `biosStatus` state.
- `localCoreReadinessLevel` and `localCoreReadinessReason`.
- Model route readiness warnings.
- Session flags `LUCA_HAS_BOOTED` and `LUCA_CLOUD_ONLY`.

## Audience classification

### Standard users should eventually see

- A polished sequence such as `Starting Luca`, `Preparing memory`, `Checking local brain`, `Connecting tools`, `Loading voice`, and `Ready`.
- Plain-language degraded/offline states with no raw RAG/Cortex/server jargon.
- Actionable model/voice readiness guidance only when it affects the user.

### Tactical/Origin users can see

- Server/API gateway status.
- Cortex/RAG status.
- Memory Synapse status.
- Tool registry restore and tool count/hash.
- Local/cloud/BYOK model route.
- STT/TTS/embedding readiness.
- Phoenix/Genesis/Electron status.
- Raw degraded/offline reasons.

## Answers to required audit questions

1. **What happens from app launch to dashboard ready?** App initializes `INIT`, runs or bypasses BIOS depending on platform/mode/session, runs kernel work when critical checks pass, enters onboarding if setup is incomplete, and sets `READY` after setup or kernel completion.
2. **Which services/subsystems initialize during boot?** Settings, voice/chat controllers, secure auth, server/Cortex/media/Ollama probes, safety, memory Synapse, tool registry, introspection, live sensation, self-expression, Genesis/Phoenix, task/event/background loading, memory sync listener, goals polling, IoT init, and local core polling.
3. **Which states are shown to the user?** `INIT`, `BIOS`, `KERNEL`, `ONBOARDING`, `READY`, mode-selection warnings, and post-ready offline connection tier may be visible.
4. **Which states are diagnostic/internal?** Session flags, console logs, detailed BIOS statuses, local readiness reasons, cloud-only mode, kernel error fallback, Phoenix timeout, and model route internals are mostly diagnostic/internal today.
5. **Where does onboarding fit?** It is entered from boot when `setupComplete` is false, including degraded/cloud-only first-run, and it owns its own multi-step first-run state machine.
6. **Where does Chat/Voice mode selection fit?** It is an onboarding step after core/model activation/provisioning and before the onboarding conversation. Completion persists `preferredMode` and sets voice HUD state.
7. **How does boot handle local core/Cortex unavailable states?** BIOS treats server/core failure as critical and enters cloud-only degraded mode. After ready, local core polling marks readiness offline/limited and can force UI connection tier to `OFFLINE`.
8. **How does boot handle model readiness?** App-level BIOS probes Ollama informationally, while onboarding uses `OnboardingModelModeCoordinator` to resolve chat/STT/TTS/embedding routes and warnings; final onboarding persists route warnings.
9. **How does boot handle degraded/offline states?** Cloud-only degraded state is represented by session flag/logs and READY/ONBOARDING continuation; offline local core is represented by readiness state and effective connection tier after boot.
10. **Which boot copy is polished and which needs product-language refinement?** `LOADING LUCA OS` and mode-selection copy are strongest. BIOS/RAG/Cortex/error copy and `Voice/model route needs attention` need product-language review.
11. **What should be shown to normal users vs tactical/origin users?** Normal users should see polished readiness language and simple recovery guidance. Tactical/origin users can see subsystem diagnostics, route/provider details, Phoenix/Genesis, and raw local-core reasons.
12. **What follow-up PRs should improve the boot experience?** See recommendations below.

## Recommended follow-up PRs

These are future recommendations only; this PR implements none of them.

1. **Boot language tiering PR** — create standard-user boot copy separate from tactical/origin diagnostics without changing readiness checks.
2. **Boot readiness governance map PR** — formalize which readiness signals can be shown to which audience tier and when degraded/offline copy appears.
3. **Degraded/offline UX PR** — add standard-user degraded/offline guidance for cloud-only and local core unavailable states.
4. **Model route copy PR** — make Chat/Voice/model warnings actionable and tiered while preserving current route behavior.
5. **First-run boot continuity PR** — align app-level boot, onboarding kernel-awakening, and dashboard-ready transitions into one coherent product story.
6. **Tactical diagnostics panel PR** — expose BIOS/Cortex/memory/tools/model route details to tactical/origin users without making them the default boot experience.
7. **Boot observability tests PR** — if runtime behavior changes in the future, add tests around readiness state transitions; do not add brittle UI tests prematurely.

## Explicit non-changes

- No boot behavior changed.
- No onboarding behavior changed.
- No Chat/Voice mode selection behavior changed.
- No boot sequence timing changed.
- No readiness checks changed.
- No local core/Cortex behavior changed.
- No model selection behavior changed.
- No memory/tools/widgets initialization changed.
- No app shell layout changed.
- No Settings UI, settings experience map, settings tab behavior/copy/layout, mobile navigation, or desktop collapsible panel changes.
- No tool execution, browser automation, screenshot/OCR/vision, file access, messaging execution, wireless/device control, or sensitive surface enablement added.
