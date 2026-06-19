# WebBridge Generated UI Eradication Audit

## Decision

WebBridge remains a browser host/runtime/state/route adapter. Normal product presentation must come from shared LucaOS surfaces under `src/components/**`. Debug-only WebBridge diagnostics are permitted only behind explicit debug gating.

## Audited WebBridge UI files

| File                                                   | Current role                     | Problem                                                     | Action taken                                                                                                                                   | Remaining risk                                                                                           |
| ------------------------------------------------------ | -------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/web/WebBridgeShell.tsx`                           | thin provider/bootstrap adapter  | None; delegates lifecycle rendering.                        | Keep as adapter.                                                                                                                               | None.                                                                                                    |
| `src/web/WebLifecycleShell.tsx`                        | lifecycle adapter                | Ready diagnostics could become normal UI if not gated.      | Confirmed ready state is controlled by `VITE_LUCA_SHOW_WEB_READY_DEBUG`; onboarding uses canonical `OnboardingFlow`; main uses `WebLucaShell`. | Keep test coverage around debug gate.                                                                    |
| `src/web/WebLucaBackground.tsx`                        | visual background adapter        | Could become product UI if copy/controls are added.         | Keep as visual adapter only.                                                                                                                   | None if it remains copy-free.                                                                            |
| `src/web/WebLucaShell.tsx`                             | thin dashboard adapter           | Previously risked owning dashboard shell slots.             | Kept routed through `LucaDashboardSurface` with adapter-provided slots and `WebChatSurface`.                                                   | Replace temporary slot copy with richer shared dashboard props in later parity work.                     |
| `src/web/WebReadyState.tsx`                            | debug-gated readiness surface    | Readiness UI must not expose WebBridge runtime diagnostics. | Confirmed product-native copy only; lifecycle renders it only when `VITE_LUCA_SHOW_WEB_READY_DEBUG=true`.                                      | Consider moving readiness card into `src/components/readiness/**`.                                       |
| `src/web/WebBridgeDiagnostics.tsx`                     | debug-only diagnostics           | Contains WebBridge/debug/runtime terminology.               | Keep because it self-gates on `bootDebug=1`.                                                                                                   | None while gate remains required.                                                                        |
| `src/web/WebCapabilityPanel.tsx`                       | diagnostics/capability panel     | Contains capability/runtime wording.                        | Treat as debug/diagnostic-only; not mounted in normal lifecycle.                                                                               | Add explicit route-level debug gate if reintroduced.                                                     |
| `src/web/chat/WebChatSurface.tsx`                      | thin chat runtime adapter        | Must not own chat presentation.                             | Confirmed it renders `LucaChatSurface` and only maps runtime state/props.                                                                      | None.                                                                                                    |
| `src/web/voice/WebVoiceOnboardingSurface.tsx`          | thin voice onboarding adapter    | Must not regenerate a voice UI.                             | Confirmed it renders `VoiceHudSurface` and owns only microphone/typed fallback state.                                                          | None.                                                                                                    |
| `src/web/adapters/webOnboardingRuntime.tsx`            | onboarding runtime adapter       | Must not select regenerated onboarding UI.                  | Main lifecycle mounts canonical `OnboardingFlow`; runtime still provides browser conversation component hooks.                                 | Follow-up: replace text conversation hook with a browser-safe extracted onboarding conversation surface. |
| `src/web/adapters/WebSafeConversationalOnboarding.tsx` | onboarding conversation fallback | Regenerated browser-only conversation screen.               | Classified as still-needs-follow-up and covered by audit policy; should be replaced with shared onboarding conversation primitives.            | Blocking follow-up if used in normal text onboarding path.                                               |
| `src/web/adapters/WebOnboardingConversation.tsx`       | legacy onboarding fallback       | Regenerated browser-only prompt card.                       | Classified as obsolete; not used by `webOnboardingRuntime`.                                                                                    | Delete in follow-up after confirming no downstream imports.                                              |
| `src/web/postBoot/WebPostBootLoading.tsx`              | post-boot loading visual         | Could drift into browser product chrome.                    | Keep as product-native loading visual without WebBridge copy.                                                                                  | None.                                                                                                    |
| `src/web/postBoot/WebPostBootTransition.tsx`           | post-boot transition visual      | Could expose runtime/debug wording.                         | Keep as LucaOS presence transition; existing tests prevent WebBridge/browser-safe wording.                                                     | None.                                                                                                    |

## Thin adapters now enforced

- `src/web/WebLucaShell.tsx` renders `LucaDashboardSurface`.
- `src/web/chat/WebChatSurface.tsx` renders `LucaChatSurface`.
- `src/web/voice/WebVoiceOnboardingSurface.tsx` renders `VoiceHudSurface`.
- `src/web/WebReadyState.tsx` is lifecycle debug-gated and uses product-native copy.

## Shared original LucaOS surfaces used

- `src/components/dashboard/LucaDashboardSurface.tsx`
- `src/components/chat/LucaChatSurface.tsx`
- `src/components/voice/VoiceHudSurface.tsx`
- `src/components/Onboarding/OnboardingFlow.tsx`

## Chat extraction cleanup

`LucaChatSurface` now composes the original MiniChat child components: `ChatWidgetHistory`, `ChatWidgetInput`, and `SuggestionChips`. The WebBridge adapter does not render chat bubbles, textareas, or primary chat chrome directly.

## Remaining parity follow-ups

1. Extract a browser-safe original onboarding conversation surface under `src/components/Onboarding/**` and replace `WebSafeConversationalOnboarding`.
2. Delete `WebOnboardingConversation` after confirming no external import paths remain.
3. Move the debug-gated readiness card to a shared readiness surface if it becomes part of normal product flow.
