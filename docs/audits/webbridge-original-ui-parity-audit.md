# WebBridge Original UI Parity Audit + Shared Presentation Migration Plan

## 1. Executive verdict

WebBridge currently contains regenerated web-only UI in these surfaces:

- **Voice onboarding / voice setup:** `src/web/voice/WebVoiceOnboardingSurface.tsx` creates a browser-specific voice setup panel instead of rendering the original Luca VoiceHUD presentation.
- **Dashboard shell:** `src/web/WebLucaShell.tsx` builds a new browser dashboard frame, status rail, and workspace layout instead of mounting the original LucaOS dashboard presentation.
- **Chat surface:** `src/web/chat/WebChatSurface.tsx` builds a new chat panel with WebBridge-specific runtime failure handling rather than reusing the original MiniChat/chat presentation.
- **Ready / capability transition UI:** `src/web/WebReadyState.tsx` exposes host class, LucaLink status, and route/capability language that should remain adapter/internal state, not normal user UI.
- **Conversational onboarding:** `src/web/adapters/WebSafeConversationalOnboarding.tsx` recreates message bubbles, prompts, typing state, and completion capture instead of sharing the original onboarding presentation primitives.

These should be migrated to shared original LucaOS presentation components:

- `src/components/voice/VoiceHudPresentation.tsx` extracted from `src/components/VoiceHud.tsx`, `src/components/voice/VoiceVisualizer.tsx`, `src/components/voice/VoiceStatusOrb.tsx`, `src/components/voice/VoiceControls.tsx`, `src/components/HologramMode.tsx`, and `src/components/WidgetVisualizer.tsx`.
- `src/components/dashboard/LucaDashboardPresentation.tsx` extracted from `src/App.tsx`, dashboard components, `src/components/SettingsModal.tsx`, `src/components/ChatWidgetMode.tsx`, `src/components/Hologram/HologramWidget.tsx`, `src/components/NetworkMap.tsx`, and `src/components/VisualCore.tsx`.
- `src/components/chat/LucaChatPresentation.tsx` extracted from `src/components/ChatWidgetMode.tsx`, `src/components/ChatWidgetHeader.tsx`, `src/components/ChatWidgetHistory.tsx`, `src/components/ChatWidgetInput.tsx`, `src/components/ChatMessageBubble.tsx`, `src/components/SuggestionChips.tsx`, and safe `src/components/ui/*` primitives.
- `src/components/onboarding/LucaOnboardingPresentation.tsx` extracted from `src/components/Onboarding/OnboardingFlow.tsx` and its presentation-only children.
- A boot/presence presentation source that keeps the current fast canvas/static path but replaces `/icon.png` with the best original Luca face/orb asset once that source is confirmed.

PR #324 should be treated as **temporary stabilization**, not final WebBridge UI architecture. The final architecture must migrate WebBridge onto shared original LucaOS UI presentation components and keep host-specific runtime behind adapters.

## 2. Original UI inventory

| Surface | Current original file(s) | Runtime dependencies | Presentation pieces | Safe to reuse directly? | Needs extraction? |
| --- | --- | --- | --- | --- | --- |
| Onboarding | `src/components/Onboarding/OnboardingFlow.tsx`, `ModeSelect.tsx`, `ThemeSelectionStep.tsx`, `ConversationalOnboarding.tsx`, `MessageBubble.tsx`, `MessageInput.tsx`, `HologramFace.tsx`, `HologramFace2D.tsx`, `LucaCanvas.tsx`, `OnboardingAccessPanels.tsx`, `OnboardingSystemPanels.tsx`, `OnboardingProvisioningPanel.tsx`, `OnboardingRuntimeAdapter.ts` | `OnboardingFlow.tsx` imports mobile detection, API URL configuration, `onboardingController`, onboarding lifecycle services, provisioning/model readiness service types, and runtime adapter callbacks. BYOK provider state exists in-flow. | Mode selection, conversation message UI, text/voice setup framing, theme selection, model/local plan panels, constitutional alignment, completion panel, Luca face/canvas visual language. | **Partly.** Many child components look reusable, but the top-level flow is not pure presentation because lifecycle/provisioning/runtime logic is mixed into `OnboardingFlow.tsx`. | **Yes.** Extract flow presentation/state rendering and let desktop/web/mobile pass runtime adapters. |
| VoiceHUD | `src/components/VoiceHud.tsx`, `src/components/voice/VoiceVisualizer.tsx`, `src/components/voice/VoiceControls.tsx`, `src/components/voice/VoiceStatusOrb.tsx`, `src/components/HologramMode.tsx`, `src/components/WidgetVisualizer.tsx` | `VoiceHud.tsx` imports `lucaService`, `toolRegistry`, `useTheme`, `eventBus`, voice display utilities, and `voiceSessionOrchestrator`; `VoiceVisualizer.tsx` subscribes directly to `eventBus`; `HologramMode.tsx` imports `settingsService`, `awarenessService`, and calls `window.electron.ipcRenderer`. | Premium VoiceHUD layout, voice orb/visualizer, status orb, transcript/assistant text treatment, voice controls, hologram/widget visual language, theme/persona color handling. | **No** for direct WebBridge import. The visual language is correct, but runtime subscriptions and Electron/service calls must be removed from the shared presentation. | **Yes.** Extract `VoiceHudPresentation` with props-only state and callback API. |
| Dashboard shell | `src/App.tsx`, `src/components/Dashboard*`, `src/components/SettingsModal.tsx`, `src/components/ChatWidgetMode.tsx`, `src/components/Hologram/HologramWidget.tsx`, `src/components/NetworkMap.tsx`, `src/components/VisualCore.tsx`, `src/components/VisualCore*`, major `src/components/*` dashboard panels | `App.tsx` imports Capacitor, services (`liveService`, `soundService`, `settingsService`, `voiceSessionOrchestrator`, `eventBus`), LucaLink managers, Electron IPC calls, conversation/model services, task queues, and device/system features. | Main LucaOS shell, dock/mode hierarchy, settings entry, Luca status, panels, visual core, chat container, right panel disclosure, network/status widgets. | **No** for direct WebBridge import. `App.tsx` is the product source but is also the desktop/mobile runtime container. | **Yes.** Extract `LucaDashboardPresentation` and keep host runtime in adapters. |
| Chat/MiniChat | `src/components/ChatWidgetMode.tsx`, `ChatWidgetHeader.tsx`, `ChatWidgetHistory.tsx`, `ChatWidgetInput.tsx`, `ChatMessageBubble.tsx`, `SuggestionChips.tsx`, `src/components/chat/ChatModeToggle.tsx`, `src/components/chat/ChatModelSwitcher.tsx`, `src/components/layout/ChatPanel.tsx`, safe `src/components/ui/*` | `ChatWidgetMode.tsx` imports `useVoiceInput`, `lucaService`, `useLucaLinkDelegation`, `lucaLinkManager`, `ToolRegistry`, `conversationService`, `awarenessService`, `settingsService`, presence bridges/messages, `ScreenShare`, `SecurityGate`, and heavy Electron IPC. | Header, message history, input composer, message bubbles, suggestion chips, approval prompt visual treatment, voice visualizer region, model/mode controls. | **Partly.** Leaf components may be reusable; `ChatWidgetMode.tsx` itself is desktop runtime-heavy. | **Yes.** Extract `LucaChatPresentation` and let desktop/web/mobile provide send/voice/approval/screen callbacks. |
| Post-boot/boot visuals | `src/web/postBoot/WebPostBootLoading.tsx`, `src/web/postBoot/WebPostBootTransition.tsx`, `src/components/visual/LucaStaticFacePresence.tsx`, `src/components/visual/LucaCanvasPresenceOrb.tsx`, `src/components/visual/LucaPresenceOrb.tsx`, `src/components/visual/LucaHologramPresence.tsx`, `src/components/visual/LucaHologramShaderPresence.tsx`, `src/components/HolographicFaceIcon.tsx`, onboarding face/canvas files | Web post-boot components are mostly presentation and state/callback props; `WebPostBootTransition.tsx` uses browser timers and `window.matchMedia`. Tests verify shader-heavy imports are not reintroduced. `LucaStaticFacePresence.tsx` currently uses `/icon.png`. | Fast static Luca face, low-power canvas orb, loading/transition copy, setup attention actions. | **Acceptable temporarily.** This path is product-stable and avoids slow shader loading after boot, but `/icon.png` should be replaced with the confirmed original static face asset if a better source exists. | **Light extraction only.** Keep fast path; audit original asset source before changing. |

## 3. WebBridge generated UI inventory

| WebBridge file | What it duplicates | Why it is wrong/temporary | Replacement target |
| --- | --- | --- | --- |
| `src/web/voice/WebVoiceOnboardingSurface.tsx` | VoiceHUD/voice setup presentation, microphone readiness UI, voice-first controls, Luca orb visual. | It creates a WebBridge-only voice setup design, includes copy about browser live voice/runtime enablement, and does not render the original VoiceHUD visual language. | `src/components/voice/VoiceHudPresentation.tsx` rendered with browser-safe mic/request/continue props. |
| `src/web/WebLucaShell.tsx` | Main Luca dashboard shell, workspace/status rails, chat container, app header. | It is a separate browser dashboard with generated status rail/capability counts. WebBridge should mount original LucaOS shell presentation with web adapters, not a browser product shell. | `src/components/dashboard/LucaDashboardPresentation.tsx`. |
| `src/web/chat/WebChatSurface.tsx` | Original MiniChat/chat panel, message history, composer, Luca response states. | It reimplements chat presentation and contains WebBridge-specific failure/copy paths. User-facing copy should remain Luca-native and runtime status should stay adapter-side. | `src/components/chat/LucaChatPresentation.tsx` plus `src/web/chat/webChatRuntime.ts` adapter. |
| `src/web/WebReadyState.tsx` | Product boot/ready transition and dashboard entry. | It exposes host class, LucaLink, route counts, and capability details as normal UI. This is useful for diagnostics but not for product flow. | Product boot/transition presentation or a diagnostics-only route/panel hidden from normal users. |
| `src/web/adapters/WebSafeConversationalOnboarding.tsx` | Original onboarding conversation UI, prompt sequencing, message bubble styling, completion capture. | It regenerates onboarding message UI under a browser-safe name; the browser-safe concern belongs in runtime adapters, not in the visible presentation surface. | `src/components/onboarding/LucaOnboardingPresentation.tsx` or presentation-only onboarding message primitives. |
| `src/web/adapters/webOnboardingRuntime.tsx` | Onboarding runtime composition. | Adapter file is valid in concept, but it currently points WebBridge to regenerated WebBridge-specific presentation components. | Keep as adapter/composition layer; replace rendered surfaces with shared presentation components. |
| `src/components/Onboarding/OnboardingFlow.tsx` when used directly by WebBridge | Desktop/mobile original onboarding flow. | This is the right source of product UI but currently has lifecycle/runtime concerns mixed into presentation. | Split into shared presentation plus host runtime controller. |
| `src/web/postBoot/WebPostBootLoading.tsx` / `WebPostBootTransition.tsx` | Boot/post-boot product transition. | Acceptable temporary stabilization because it avoids slow shader loading and uses shared lightweight visual components; still should align asset source with original Luca face/orb assets. | Keep short term; migrate only after original asset source is confirmed. |

## 4. Shared presentation extraction plan

### `src/components/voice/VoiceHudPresentation.tsx`

- **Source files to extract from:** `src/components/VoiceHud.tsx`, `src/components/voice/VoiceVisualizer.tsx`, `src/components/voice/VoiceControls.tsx`, `src/components/voice/VoiceStatusOrb.tsx`, `src/components/HologramMode.tsx`, `src/components/WidgetVisualizer.tsx`.
- **Props interface:**

```ts
type VoiceHudPresentationProps = {
  state: "idle" | "requesting" | "listening" | "thinking" | "speaking" | "unavailable";
  transcript?: string;
  assistantText?: string;
  micAvailable?: boolean;
  onRequestMic?: () => void;
  onBack?: () => void;
  onContinue?: () => void;
  onTypedFallback?: (value: string) => void;
};
```

- **Forbidden imports:** Electron/window IPC, `eventBus`, `voiceSessionOrchestrator`, `liveService`, `soundService`, provider SDKs, desktop services, LucaLink runtime.
- **Desktop adapter usage:** Existing `VoiceHud` remains the runtime owner, subscribes to services/events, derives `VoiceHudPresentationProps`, and renders `VoiceHudPresentation`.
- **Web adapter usage:** `WebVoiceOnboardingSurface` owns `navigator.mediaDevices.getUserMedia`, typed fallback, and completion callback; it renders `VoiceHudPresentation` only.
- **Mobile adapter usage:** Mobile voice runtime derives the same state from mobile-safe audio permissions and callback handlers.

### `src/components/dashboard/LucaDashboardPresentation.tsx`

- **Source files to extract from:** `src/App.tsx`, `src/components/SettingsModal.tsx`, `src/components/ChatWidgetMode.tsx`, `src/components/Hologram/HologramWidget.tsx`, `src/components/NetworkMap.tsx`, `src/components/VisualCore.tsx`, dashboard/status panels, and shared shell style tokens.
- **Proposed props interface:**

```ts
type LucaDashboardPresentationProps = {
  status: "ready" | "preparing" | "limited" | "offline";
  displayName?: string;
  activeMode?: "chat" | "voice" | "visual" | "dashboard";
  chat?: React.ReactNode;
  visualCore?: React.ReactNode;
  rightPanel?: React.ReactNode;
  dockItems?: Array<{ id: string; label: string; active?: boolean; disabled?: boolean; onSelect?: () => void }>;
  onOpenSettings?: () => void;
  onOpenVoice?: () => void;
  onOpenChat?: () => void;
};
```

- **Forbidden imports:** Electron/window IPC, `settingsService`, `liveService`, `soundService`, `voiceSessionOrchestrator`, `eventBus`, native LucaLink runtime, device/file/system services.
- **Desktop adapter usage:** `App.tsx` keeps current service orchestration and passes product state/callbacks to the presentation.
- **Web adapter usage:** `WebLucaShell` becomes a thin browser host adapter that passes browser-safe capability-derived booleans/callbacks and embeds web chat adapter output.
- **Mobile adapter usage:** Mobile shell passes mobile-safe navigation, permissions, and layout capability props.

### `src/components/chat/LucaChatPresentation.tsx`

- **Source files to extract from:** `src/components/ChatWidgetMode.tsx`, `ChatWidgetHeader.tsx`, `ChatWidgetHistory.tsx`, `ChatWidgetInput.tsx`, `ChatMessageBubble.tsx`, `SuggestionChips.tsx`, `src/components/chat/ChatModeToggle.tsx`, `src/components/chat/ChatModelSwitcher.tsx`, `src/components/layout/ChatPanel.tsx`.
- **Proposed props interface:**

```ts
type LucaChatPresentationProps = {
  messages: Array<{ id: string; sender: "user" | "luca" | "system"; text: string; isStreaming?: boolean }>;
  inputValue: string;
  pending?: boolean;
  statusLabel?: string;
  suggestions?: Array<{ id: string; label: string; value: string }>;
  onInputChange: (value: string) => void;
  onSend: (value: string) => void;
  onSelectSuggestion?: (value: string) => void;
  onOpenVoice?: () => void;
  onOpenSettings?: () => void;
};
```

- **Forbidden imports:** `conversationService`, `lucaService`, `lucaLinkManager`, `settingsService`, `awarenessService`, `ScreenShare`, Electron IPC, provider SDKs.
- **Desktop adapter usage:** `ChatWidgetMode` keeps runtime and IPC, then renders `LucaChatPresentation`.
- **Web adapter usage:** `WebChatSurface` keeps `webChatRuntime` send adapter and maps messages/errors to Luca-native presentation state.
- **Mobile adapter usage:** Mobile chat runtime supplies safe send/voice callbacks and mobile input affordances.

### `src/components/onboarding/LucaOnboardingPresentation.tsx`

- **Source files to extract from:** `src/components/Onboarding/OnboardingFlow.tsx`, `ModeSelect.tsx`, `ThemeSelectionStep.tsx`, `ConversationalOnboarding.tsx`, `MessageBubble.tsx`, `MessageInput.tsx`, `ConstitutionalAlignment.tsx`, `OnboardingAccessPanels.tsx`, `OnboardingSystemPanels.tsx`, `OnboardingProvisioningPanel.tsx`, visual onboarding face/canvas files.
- **Proposed props interface:**

```ts
type LucaOnboardingPresentationProps = {
  step: string;
  mode?: "text" | "voice";
  userName?: string;
  theme?: { primary: string; hex: string };
  messages?: Array<{ id: string; role: "luca" | "user"; content: string }>;
  modelOptions?: Array<{ id: string; label: string; selected?: boolean; disabled?: boolean }>;
  onSelectMode?: (mode: "text" | "voice") => void;
  onSelectTheme?: (themeId: string) => void;
  onSelectModel?: (modelId: string) => void;
  onSubmitMessage?: (value: string) => void;
  onBack?: () => void;
  onComplete?: () => void;
};
```

- **Forbidden imports:** onboarding controller/lifecycle services, API URL calls, desktop settings/personality services, provider SDK execution, Electron IPC.
- **Desktop adapter usage:** Existing onboarding controller remains desktop runtime owner and supplies step/model/provisioning state.
- **Web adapter usage:** `webOnboardingRuntime.tsx` supplies browser-safe storage and route callbacks, then renders shared presentation.
- **Mobile adapter usage:** Mobile onboarding supplies safe permission/model/profile callbacks.

### `src/components/visual/LucaBootPresencePresentation.tsx` or equivalent

- **Source files to extract from:** `src/web/postBoot/WebPostBootLoading.tsx`, `src/web/postBoot/WebPostBootTransition.tsx`, `src/components/visual/LucaStaticFacePresence.tsx`, `src/components/visual/LucaCanvasPresenceOrb.tsx`, original face/orb assets if confirmed.
- **Props interface:** status, display name, attention rows, onContinue, onRestartOnboarding, onReviewVoiceAccess, onChooseModelRoute.
- **Forbidden imports:** shader-heavy three/fiber/drei post-boot dependencies, `eventBus`, services, Electron IPC.
- **Desktop/web/mobile usage:** all hosts can use the same lightweight boot/presence presentation with host-specific routing callbacks.

## 5. Runtime boundary plan

Forbidden imports/usages for WebBridge shared presentation paths:

- `electron`
- `window.electron`
- `window.luca`
- `better-sqlite3`
- `node:fs`
- `llmService`
- `liveService`
- `settingsService`
- `personalityService`
- `soundService`
- provider SDKs
- native LucaLink runtime
- direct `eventBus` usage
- desktop IPC / `ipcRenderer`
- direct file/system/device services
- runtime debug/capability wording in normal user copy

Allowed patterns:

- Props-only presentation inputs.
- Browser-safe adapter interfaces.
- Safe storage wrappers.
- Feature capability objects that are mapped to product-language labels before display.
- Callback handlers supplied by host adapters.
- Host-specific runtime containers that import services and render shared presentation.
- Diagnostics-only UI behind explicit diagnostics routes/panels, never normal boot/dashboard/chat/onboarding copy.

## 6. PR sequence

### PR A: VoiceHUD presentation extraction

- Extract real VoiceHUD UI presentation into `src/components/voice/VoiceHudPresentation.tsx`.
- Keep desktop `src/components/VoiceHud.tsx` as the desktop runtime wrapper.
- Change `src/web/voice/WebVoiceOnboardingSurface.tsx` to render `VoiceHudPresentation` with browser-safe adapter props.
- Ensure no unsafe WebBridge imports are introduced.

### PR B: Dashboard shell presentation extraction

- Extract browser-safe original dashboard presentation into `src/components/dashboard/LucaDashboardPresentation.tsx`.
- Keep `src/App.tsx` as desktop/mobile runtime wiring and render the extracted shell.
- Change `src/web/WebLucaShell.tsx` to render the shared dashboard presentation.
- Remove generated WebBridge dashboard shell layout after parity is verified.

### PR C: Chat/MiniChat presentation extraction

- Extract original chat UI presentation into `src/components/chat/LucaChatPresentation.tsx`.
- Keep desktop `ChatWidgetMode` runtime/IPC as adapter wiring.
- Change `src/web/chat/WebChatSurface.tsx` to use `LucaChatPresentation` while retaining `webChatRuntime.ts`.
- Remove browser/debug/runtime-adapter copy from normal chat flow.

### PR D: Onboarding parity cleanup

- Extract/compose `src/components/onboarding/LucaOnboardingPresentation.tsx` from original onboarding UI.
- Reduce or delete `WebSafeConversationalOnboarding` generated UI if shared onboarding presentation covers the flow.
- Keep browser-safe onboarding runtime in `webOnboardingRuntime.tsx` or a successor adapter.
- Preserve existing working web onboarding routes during migration.

### PR E: Delete obsolete WebBridge-only placeholder surfaces

- Remove or deprecate duplicate generated UI surfaces once shared presentation replacements are active.
- Move capability/debug status panels to diagnostics-only locations if still needed.
- Add tests that verify normal user UI does not contain debug/runtime-adapter/browser-safe copy.

## 7. Acceptance tests per PR

### PR A tests

- `npx tsc -p tsconfig.web.json --noEmit`
- `npm run build:web`
- `node scripts/verify-web-import-boundaries.mjs`
- Unit/import test: WebBridge does not import desktop `VoiceHud` runtime directly.
- Unit/import test: `src/web/voice/WebVoiceOnboardingSurface.tsx` renders `VoiceHudPresentation`.
- Unit/import test: desktop `src/components/VoiceHud.tsx` renders `VoiceHudPresentation`.
- String test: no normal voice onboarding copy says `browser-safe`, `runtime adapter`, `debug route`, or `model execution adapter not connected`.

### PR B tests

- `npx tsc -p tsconfig.web.json --noEmit`
- `npm run build:web`
- `node scripts/verify-web-import-boundaries.mjs`
- Unit/import test: `src/web/WebLucaShell.tsx` renders `LucaDashboardPresentation`.
- Unit/import test: shared dashboard presentation does not import services, Electron, LucaLink runtime, or desktop IPC.
- UI/string test: normal shell does not expose host class, guarded route details, native routes guarded, or runtime adapter wording.

### PR C tests

- `npx tsc -p tsconfig.web.json --noEmit`
- `npm run build:web`
- `node scripts/verify-web-import-boundaries.mjs`
- Unit/import test: `src/web/chat/WebChatSurface.tsx` renders `LucaChatPresentation` and keeps `webChatRuntime.ts` as adapter.
- Unit/import test: desktop `ChatWidgetMode` renders `LucaChatPresentation` while retaining desktop runtime outside the presentation.
- String test: chat normal UI does not contain `browser-safe mode`, `runtime adapter`, `model execution adapter not connected`, `native routes guarded`, or `debug route status`.

### PR D tests

- `npx tsc -p tsconfig.web.json --noEmit`
- `npm run build:web`
- `node scripts/verify-web-import-boundaries.mjs`
- Flow test: mode select, text onboarding, voice onboarding, theme selection, model selection, personality/preference capture, and completion transition remain reachable.
- Unit/import test: shared onboarding presentation does not import onboarding runtime services, provider SDKs, Electron, or desktop settings/personality services.
- Regression test: web onboarding adapter persists only browser-safe profile/setup state.

### PR E tests

- `npx tsc -p tsconfig.web.json --noEmit`
- `npm run build:web`
- `node scripts/verify-web-build-env.mjs`
- `node scripts/verify-web-import-boundaries.mjs`
- `npm run verify:web:dist-imports`
- Repository/string test: obsolete WebBridge-only placeholder components are removed or diagnostics-only.
- Repository/string test: no normal user flow contains debug/runtime-adapter/browser-safe wording.

## 8. Final recommendation

PR #324 is **temporary stabilization**. It is useful because the post-boot path is fast, product-stable, and avoids reintroducing slow shader loading after boot. It should not be treated as the final WebBridge UI architecture.

The final WebBridge architecture must migrate WebBridge onto shared original LucaOS UI presentation components:

```text
Original LucaOS UI presentation surfaces
        ↓
shared browser-safe presentation components
        ↓
host-specific runtime adapters
```

Desktop should keep Electron/native/service wiring in desktop adapters. WebBridge should use browser-safe adapters, safe storage, and feature capability objects. Mobile should use mobile-safe adapters. Normal user UI should remain Luca-native and should not disclose browser-safe/debug/runtime-adapter implementation details.
