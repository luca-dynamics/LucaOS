# WebBridge Direct LucaOS UI Reuse Audit

> Historical note: the legacy `OnboardingFlow`, `ConversationalOnboarding`,
> `desktopOnboardingRuntime`, and their private UI cluster were removed after
> the premium flow became the shared desktop/web production path. Current
> onboarding mounts `LucaPremiumOnboardingPreview`; legacy paths below document
> the earlier extraction work and are not current architecture.

## Decision

WebBridge must import the real LucaOS product UI rather than generate parallel
product surfaces. The canonical onboarding is now directly mounted by
WebBridge with an injected browser-safe runtime adapter. The main application,
Settings, and LucaLink surfaces still require separate future isolation work;
no generated replacement dashboard, Settings shell, or Device Center is used.

## Direct-import experiment

The attempted target was the same onboarding component mounted by the desktop
application:

```text
src/reactAppEntry.tsx
  -> src/App.tsx
  -> src/components/Onboarding/OnboardingFlow.tsx
```

The initial experiment exposed desktop/local-model, vault/settings, provider,
voice, and Electron-aware static dependencies. Those dependencies are now
isolated behind `OnboardingRuntimeAdapter`. Desktop receives
`desktopOnboardingRuntime`; WebBridge receives `webOnboardingRuntime`.
Conversational/provider onboarding is dynamically loaded only after the user
reaches the conversation step.

## Boot to onboarding transition

| Path | Purpose | Direct browser-safe import | Unsafe imports and exact chain |
| --- | --- | --- | --- |
| `src/reactAppEntry.tsx` | Desktop/mobile React mount; selects `App`. | **No** for WebBridge | `reactAppEntry.tsx -> App.tsx`; `App.tsx` statically imports the full runtime graph described below. WebBridge must continue using `webBridgeEntry`. |
| `src/App.tsx` | Canonical boot state, onboarding transition, desktop/mobile shell, overlays, chat, and Settings mount. | **No** | Direct imports include `./services/lucaService`, `./services/lucaLink/manager`, `./services/lucaLinkService`, `./services/toolRegistry`, `./hooks/app/useAppIPC`, and `./components/SettingsModal`. `App.tsx -> services/lucaLink/manager` is the desktop LucaLink host controller; `App.tsx -> hooks/app/useAppIPC` references `window.electron.ipcRenderer`; `App.tsx -> services/lucaService -> @google/generative-ai` enters the provider runtime. |
| `src/config/browserSafeBootResolver.ts` | Pure boot-state decision helper already used by the canonical app. | **Yes** | No native/server import found. It is not itself the visual onboarding entry. |

## Original onboarding flow

| Path | Purpose | Direct browser-safe import | Unsafe imports and exact chain |
| --- | --- | --- | --- |
| `src/components/Onboarding/OnboardingFlow.tsx` | Canonical onboarding orchestrator and visual flow mounted by Desktop/Mobile and WebBridge. | **Yes, with adapter** | Runtime calls are supplied through `OnboardingRuntimeAdapter`; there are no static `ModelManagerService`, `settingsService`, `realtimeVoiceUiBridge`, or conversational/provider imports. |
| `src/components/Onboarding/ThemeSelectionStep.tsx` | Canonical theme, opacity, and blur selection. | **Yes** | Settings values and persistence callbacks are supplied by `OnboardingFlow`; no static settings/vault import remains. |
| `src/components/Onboarding/OnboardingAccessPanels.tsx` | Canonical identity and Luca Core selection panels. | **Yes** | `Icon` is presentation-only, and model-route behavior is supplied by the runtime adapter. |
| `src/components/Onboarding/ModeSelect.tsx` | Canonical Text/Voice selection. | **Yes** | `Icon` is presentation-only. Voice permission/runtime behavior runs only after explicit selection through the adapter. |
| `src/components/Onboarding/ConversationalOnboarding.tsx` | Canonical personality/preferences conversation. | **No** | `ConversationalOnboarding -> llmService -> @google/generative-ai`; also imports `liveService`, `personalityService`, `settingsService`, and `soundService`. |
| `src/components/Onboarding/FaceScan.tsx` | Canonical optional face enrollment step. | **No** | Mounted with an API enrollment endpoint by `OnboardingFlow`; its biometric/camera path is not isolated from onboarding orchestration. |
| `src/services/onboarding/OnboardingController.ts` | Pure onboarding step transition model. | **Yes** | No unsafe import found, but this is state only and cannot render the original UI. |

### Implemented onboarding split

`src/components/Onboarding/OnboardingFlow.tsx` now receives settings, model
provisioning, voice, identity, and model-route behavior through
`OnboardingRuntimeAdapter` while preserving the canonical component and JSX.
`src/components/ui/Icon.tsx` no longer imports `settingsService`; color comes
from props or inherited CSS. Desktop behavior is retained by
`src/desktop/adapters/desktopOnboardingRuntime.ts`, while
`src/web/adapters/webOnboardingRuntime.tsx` blocks local provisioning, avoids
vault/provider secrets, and requests microphone access only after Voice is
selected.

## Original main app shell/dashboard

| Path | Purpose | Direct browser-safe import | Unsafe imports and exact chain |
| --- | --- | --- | --- |
| `src/App.tsx` | Canonical Header, Operations sidebar, ChatPanel, Activity panel, mobile navigation, overlays, and runtime state. | **No** | `App -> lucaService -> @google/generative-ai`; `App -> lucaLink/manager` desktop host controller; `App -> useAppIPC -> window.electron.ipcRenderer`; `App -> SettingsModal -> memoryService`; and direct Electron IPC references inside `App.tsx`. |
| `src/components/layout/Header.tsx` | Canonical identity header and Settings access. | **No as currently composed** | Imports `awarenessService`, `liveService`, `soundService`, `useCredits`, and `RuntimeContinuityBootstrap`. The former `Icon -> settingsService` chain has been removed. |
| `src/components/layout/ChatPanel.tsx` | Canonical conversation/dashboard center. | **No** | Imports `settingsService`, `apiUrl`, `awarenessService`, `ChatIntentRouterBridge`, and runtime routing services. |
| `src/components/layout/OperationsSidebar.tsx` | Canonical left application/capability panel. | **No** | Receives desktop execution/device callbacks from `App` and imports runtime-backed components. |
| `src/components/layout/desktopShellModel.ts` | Pure panel state and persistence helpers. | **Yes** | No unsafe import found, but it is not a renderable shell. |
| `src/styles/lucaShellStyles.ts` and `src/styles/lucaMobileShellStyles.ts` | Canonical shell style tokens. | **Yes** | Type-only React import; no runtime/native dependency. Styles alone are not direct UI reuse. |

## Original Settings UI

| Path | Purpose | Direct browser-safe import | Unsafe imports and exact chain |
| --- | --- | --- | --- |
| `src/components/SettingsModal.tsx` | Canonical Settings modal, navigation, tabs, save behavior, and responsive layout. | **No** | `SettingsModal -> memoryService -> ModelManagerService` and dynamic `lucaLink/manager`; `SettingsModal -> settingsService -> secureVault -> credentialVault -> window.luca.vault`; `SettingsModal -> personaService -> @google/generative-ai`; direct save path calls `window.luca.applySystemSettings`. It also statically imports every runtime-heavy Settings tab. |
| `src/components/settings/SettingsLayout.tsx` | Canonical Settings cards/rows/sections. | **Yes as a visual primitive** | Its `Icon` dependency is now presentation-only and does not import settings/vault runtime. The complete `SettingsModal` composition remains unsafe. |
| `src/components/settings/settingsNavigationModel.ts` | Pure tab/navigation definitions. | **Yes** | Imports only `settingsExperienceMap`, which is data-only. It cannot render Settings directly. |
| `src/components/settings/SettingsBrainTab.tsx` | Model/provider/Ollama Settings. | **No** | Provider keys, local model manager, Ollama controls, and runtime diagnostics are intentionally unavailable in WebBridge startup. |
| `src/components/settings/SettingsDataTab.tsx` | Memory/data Settings. | **No** | Imports memory/API runtime through the Settings composition. |

## Original LucaLink / Device Center UI

| Path | Purpose | Direct browser-safe import | Unsafe imports and exact chain |
| --- | --- | --- | --- |
| `src/components/settings/SettingsLucaLinkTab.tsx` | Canonical Settings-hosted LucaLink Device Center. | **No** | Direct import `SettingsLucaLinkTab -> services/lucaLinkService`, the desktop/relay LucaLink runtime controller; also imports `qrScannerService`, API/WS endpoints, QR generation, and runtime permission/transport panels. |
| `src/components/LucaLinkModal.tsx` | Canonical desktop pairing and remote-control modal. | **No** | Imports API/network and desktop LucaLink runtime behavior; it is mounted from desktop overlay state. |
| `src/services/lucaLink/lucaLinkLinkedHostRegistry.ts` | Pure linked-host data model/helpers. | **Yes** | Model-only helper, not the Device Center UI. |

## Result

Direct onboarding reuse **succeeds** through the adapter boundary. The
WebBridge entry provides host/capability context, browser storage, lifecycle
information, and opt-in diagnostics, then mounts the canonical
`OnboardingFlow`. It does not render generated product surfaces.

Desktop and Electron continue to select `reactAppEntry`; browser startup
continues to select `webBridgeEntry`. The canonical desktop/mobile product UI
and runtime behavior are unchanged. `ModeCard.tsx` is restored to its original
implementation after removing the PR #303 extracted-primitive dependency.
