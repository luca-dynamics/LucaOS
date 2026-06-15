# WebBridge Main Shell and Chat Audit

## Scope reviewed

The audit reviewed the original post-onboarding composition in `src/App.tsx`,
the shell components under `src/components/layout`, the `Chat*` components in
`src/components`, the chat workspace components in `src/components/chat`, the
right-side control components, voice surfaces, `src/services`, and the current
`src/web` entry graph.

## Original main shell components reviewed

| Component | Finding |
| --- | --- |
| `src/App.tsx` | Runtime-unsafe for WebBridge. It statically composes desktop/mobile state and imports provider, LucaLink, settings, voice, IPC, and tool services. |
| `src/components/layout/Header.tsx` | Visually useful but runtime-unsafe. It imports `awarenessService`, `liveService`, `soundService`, `useCredits`, and `RuntimeContinuityBootstrap`. |
| `src/components/layout/OperationsSidebar.tsx` | Visually useful but runtime-unsafe. It imports `soundService`, runtime-backed panels, API configuration, and desktop execution callbacks. |
| `src/components/layout/ChatPanel.tsx` | Visually useful but runtime-unsafe. It imports `settingsService`, `awarenessService`, API routing, `ChatIntentRouterBridge`, and `ChatIntentProvenanceService`. |
| `src/components/right-panel/ControlPanel.tsx` | Visually useful but runtime-unsafe. It imports the desktop/runtime diagnostics, continuity, planning, skills, browser-control, screen, overlay, and execution service graph. |
| `src/components/layout/desktopShellModel.ts` | Browser-safe model/helper module, but it does not render a shell. |
| `src/styles/lucaShellStyles.ts` | Browser-safe and reused. It contains presentation-only CSS token objects with a type-only React import. |

## Original chat components reviewed

| Component | Finding |
| --- | --- |
| `src/components/ChatWidgetMode.tsx` | Runtime-unsafe. It imports `lucaService`, `lucaLinkManager`, `ToolRegistry`, `conversationService`, `awarenessService`, `settingsService`, voice hooks, and screen sharing. |
| `src/components/ChatWidgetInput.tsx` | Runtime-unsafe. It imports `settingsService` and runtime-backed model/mode controls. |
| `src/components/ChatWidgetHistory.tsx` | Not reused because its message and persona types are coupled to `lucaService` and the desktop chat message composition. |
| `src/components/ChatMessageBubble.tsx` | Not reused because it imports `PersonaType` from `lucaService` and action/chart rendering intended for the native runtime. |
| `src/components/ChatWidgetHeader.tsx` | Presentation-only in isolation, but it is a widget header rather than the canonical full workspace shell and was not needed by the WebBridge composition. |
| `src/components/chat/ProWorkforceCanvas.tsx` and `WorkforceCanvas.tsx` | Not part of the safe first chat milestone; they represent runtime-backed workforce execution surfaces. |
| `src/components/VoiceHud.tsx` and `src/components/voice/*` | Runtime-unsafe for this route. The graph includes Settings, `lucaService`, tool registry, event bus, voice orchestration, and desktop voice behavior. |

## Components safe to reuse directly

- `src/components/ui/Icon.tsx` is reused as a presentation-only icon renderer.
- `src/styles/lucaShellStyles.ts` is reused for canonical shell surface,
  divider, rail, and workspace tokens.
- Existing theme variables produced by `generateThemeStyles`,
  `getThemeColors`, `WebLucaBackground`, and live
  `subscribeVisualSettings` updates remain the visual source of truth.

No original stateful shell or chat runtime component was safe to import
directly without pulling desktop/provider behavior into the WebBridge bundle.

## Unsafe imports found

The reviewed graph includes direct or transitive references to
`lucaService`, provider SDKs, `liveService`, `settingsService`,
`personalityService`, `soundService`, desktop LucaLink managers, Electron IPC,
voice orchestration, tool execution, API configuration, runtime diagnostics,
screen/overlay execution services, and secure settings/vault behavior.

`src/App.tsx` is therefore not mounted by WebBridge. The original `Header`,
`OperationsSidebar`, `ChatPanel`, `ChatWidgetMode`, `ChatWidgetInput`,
`ChatMessageBubble`, `VoiceHud`, and `ControlPanel` are intentionally not
imported into the browser route.

## Extraction and adaptation decision

The implementation uses a thin browser-safe shell composition in
`src/web/WebLucaShell.tsx`. It preserves the original LucaOS three-region
layout language (workspace rail, central conversation workspace, and runtime
context rail) while reusing canonical shell style tokens and theme variables.
It does not reproduce tool launchers, product cards, Settings, native controls,
or the generated PR #302 dashboard.

The central surface is `src/web/chat/WebChatSurface.tsx`. It owns only
presentation and local conversation state. All model execution is routed
through the narrow `WebChatRuntime` interface in
`src/web/chat/webChatRuntime.ts`. The current adapter returns an explicit
adapter-not-connected message and imports no provider SDK, service, secret, or
native runtime.

## Exact WebBridge route implemented

```text
src/web/webBridgeEntry.tsx
  -> WebBridgeShell
  -> WebRuntimeProvider
  -> WebLifecycleShell
  -> canonical OnboardingFlow
  -> WebReadyState
  -> "Continue to LucaOS Web Shell"
  -> WebLucaShell
  -> WebChatSurface
  -> WebChatRuntime
```

The lifecycle states are `"onboarding" | "ready" | "main"`. Diagnostics receive
the current state and report `web-luca-shell` while the main route is active.
