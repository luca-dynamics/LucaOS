# WebBridge Direct LucaOS UI Reuse Audit

## Decision

WebBridge must import the real LucaOS product UI or render no product UI. The
direct-import experiment found that the canonical onboarding, main application,
Settings, and LucaLink surfaces are not currently valid browser-safe imports.
WebBridge therefore renders only a plain technical blocker message. No
replacement onboarding, dashboard, Settings shell, or Device Center is used.

## Direct-import experiment

The attempted target was the same onboarding component mounted by the desktop
application:

```text
src/reactAppEntry.tsx
  -> src/App.tsx
  -> src/components/Onboarding/OnboardingFlow.tsx
```

Importing `OnboardingFlow` directly into the WebBridge graph is rejected
because its static graph initializes desktop/local-model, vault/settings,
provider, voice, and Electron-aware modules before a browser adapter can
substitute behavior. The build can transpile several of these modules because
they guard calls at runtime, but that does not satisfy the WebBridge import
boundary: local model scanners, provider runtime, vault bridges, and desktop
controllers must not enter the browser startup graph.

## Boot to onboarding transition

| Path | Purpose | Direct browser-safe import | Unsafe imports and exact chain |
| --- | --- | --- | --- |
| `src/reactAppEntry.tsx` | Desktop/mobile React mount; selects `App`. | **No** for WebBridge | `reactAppEntry.tsx -> App.tsx`; `App.tsx` statically imports the full runtime graph described below. WebBridge must continue using `webBridgeEntry`. |
| `src/App.tsx` | Canonical boot state, onboarding transition, desktop/mobile shell, overlays, chat, and Settings mount. | **No** | Direct imports include `./services/lucaService`, `./services/lucaLink/manager`, `./services/lucaLinkService`, `./services/toolRegistry`, `./hooks/app/useAppIPC`, and `./components/SettingsModal`. `App.tsx -> services/lucaLink/manager` is the desktop LucaLink host controller; `App.tsx -> hooks/app/useAppIPC` references `window.electron.ipcRenderer`; `App.tsx -> services/lucaService -> @google/generative-ai` enters the provider runtime. |
| `src/config/browserSafeBootResolver.ts` | Pure boot-state decision helper already used by the canonical app. | **Yes** | No native/server import found. It is not itself the visual onboarding entry. |

## Original onboarding flow

| Path | Purpose | Direct browser-safe import | Unsafe imports and exact chain |
| --- | --- | --- | --- |
| `src/components/Onboarding/OnboardingFlow.tsx` | Canonical onboarding orchestrator and visual flow. This is the direct-reuse target. | **No** | Direct imports include `services/ModelManagerService`, `services/onboarding/LocalProvisioningService`, `services/settingsService`, `components/Onboarding/ConversationalOnboarding`, and `services/voice/realtimeVoiceUiBridge`. Chains: `OnboardingFlow -> ModelManagerService` invokes `window.electron.ipcRenderer` for local model/Ollama operations; `OnboardingFlow -> LocalProvisioningService -> ModelManagerService`; `OnboardingFlow -> settingsService -> secureVault -> credentialVault -> window.luca.vault`; `OnboardingFlow -> ConversationalOnboarding -> llmService -> @google/generative-ai`; `OnboardingFlow -> realtimeVoiceUiBridge` enters the native/provider voice runtime. |
| `src/components/Onboarding/ThemeSelectionStep.tsx` | Canonical theme, opacity, and blur selection. | **No as currently composed** | `ThemeSelectionStep -> components/ui/Icon -> services/settingsService -> services/secureVault -> services/credentialVault -> window.luca.vault`; it also directly checks `window.electron.ipcRenderer` and persists through `settingsService`. |
| `src/components/Onboarding/OnboardingAccessPanels.tsx` | Canonical identity and Luca Core selection panels. | **No as currently composed** | `OnboardingAccessPanels -> components/ui/Icon -> settingsService -> secureVault -> credentialVault -> window.luca.vault`. Core callbacks are supplied by `OnboardingFlow` and reach local model/provider runtime. |
| `src/components/Onboarding/ModeSelect.tsx` | Canonical Text/Voice selection. | **No as currently composed** | `ModeSelect -> ModeCard -> components/ui/Icon -> settingsService -> secureVault -> credentialVault -> window.luca.vault`; readiness types and callbacks originate from `OnboardingModelModeCoordinator`. |
| `src/components/Onboarding/ConversationalOnboarding.tsx` | Canonical personality/preferences conversation. | **No** | `ConversationalOnboarding -> llmService -> @google/generative-ai`; also imports `liveService`, `personalityService`, `settingsService`, and `soundService`. |
| `src/components/Onboarding/FaceScan.tsx` | Canonical optional face enrollment step. | **No** | Mounted with an API enrollment endpoint by `OnboardingFlow`; its biometric/camera path is not isolated from onboarding orchestration. |
| `src/services/onboarding/OnboardingController.ts` | Pure onboarding step transition model. | **Yes** | No unsafe import found, but this is state only and cannot render the original UI. |

### Proposed onboarding split point

The smallest credible future split is inside
`src/components/Onboarding/OnboardingFlow.tsx`: dependency-inject the settings,
model provisioning, voice, biometric, and conversational runtime adapters while
leaving the component and its exact JSX in place. In addition,
`src/components/ui/Icon.tsx` must stop importing `settingsService`; theme/provider
selection should be supplied as a prop or context. This PR does not perform
that split because it is not tiny and would risk changing desktop/mobile
behavior.

## Original main app shell/dashboard

| Path | Purpose | Direct browser-safe import | Unsafe imports and exact chain |
| --- | --- | --- | --- |
| `src/App.tsx` | Canonical Header, Operations sidebar, ChatPanel, Activity panel, mobile navigation, overlays, and runtime state. | **No** | `App -> lucaService -> @google/generative-ai`; `App -> lucaLink/manager` desktop host controller; `App -> useAppIPC -> window.electron.ipcRenderer`; `App -> SettingsModal -> memoryService`; and direct Electron IPC references inside `App.tsx`. |
| `src/components/layout/Header.tsx` | Canonical identity header and Settings access. | **No as currently composed** | Imports `awarenessService`, `liveService`, `soundService`, `useCredits`, `RuntimeContinuityBootstrap`, and `components/ui/Icon`; the Icon chain reaches `settingsService -> secureVault`. |
| `src/components/layout/ChatPanel.tsx` | Canonical conversation/dashboard center. | **No** | Imports `settingsService`, `apiUrl`, `awarenessService`, `ChatIntentRouterBridge`, and runtime routing services. |
| `src/components/layout/OperationsSidebar.tsx` | Canonical left application/capability panel. | **No** | Receives desktop execution/device callbacks from `App` and imports runtime-backed components. |
| `src/components/layout/desktopShellModel.ts` | Pure panel state and persistence helpers. | **Yes** | No unsafe import found, but it is not a renderable shell. |
| `src/styles/lucaShellStyles.ts` and `src/styles/lucaMobileShellStyles.ts` | Canonical shell style tokens. | **Yes** | Type-only React import; no runtime/native dependency. Styles alone are not direct UI reuse. |

## Original Settings UI

| Path | Purpose | Direct browser-safe import | Unsafe imports and exact chain |
| --- | --- | --- | --- |
| `src/components/SettingsModal.tsx` | Canonical Settings modal, navigation, tabs, save behavior, and responsive layout. | **No** | `SettingsModal -> memoryService -> ModelManagerService` and dynamic `lucaLink/manager`; `SettingsModal -> settingsService -> secureVault -> credentialVault -> window.luca.vault`; `SettingsModal -> personaService -> @google/generative-ai`; direct save path calls `window.luca.applySystemSettings`. It also statically imports every runtime-heavy Settings tab. |
| `src/components/settings/SettingsLayout.tsx` | Canonical Settings cards/rows/sections. | **No as currently composed** | `SettingsLayout -> components/ui/Icon -> settingsService -> secureVault -> credentialVault -> window.luca.vault`. |
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

Direct reuse **failed** at the current module boundaries. The WebBridge entry
continues to provide host/capability context, storage, lifecycle information,
and opt-in diagnostics, but it does not render generated product surfaces.

The temporary visible state is intentionally plain:

```text
Original LucaOS onboarding is blocked from WebBridge by unsafe imports.
See WEBBRIDGE_DIRECT_REUSE_AUDIT.md.
```

Desktop and Electron continue to select `reactAppEntry`; browser startup
continues to select `webBridgeEntry`. The canonical desktop/mobile product UI
and runtime behavior are unchanged. `ModeCard.tsx` is restored to its original
implementation after removing the PR #303 extracted-primitive dependency.
