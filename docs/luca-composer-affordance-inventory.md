# LucaOS Composer Affordance Inventory

## 1. Executive summary

The composer is the primary action object in LucaOS. It is the place where intent enters the system, where text, voice, images, screen context, model state, and tool state converge, and where users decide whether LucaOS feels like a calm intelligence OS or a command console.

LucaOS must preserve advanced OS-level capability without making the default composer feel like an operator console. The current composer already carries primary input, runtime safety, model selection, planning mode, vision/screen context, MCP node state, persona-specific status, plugin state, and MiniChat bridge behavior. Future simplification should reduce default visual pressure while keeping capability reachable.

This document is an inventory, not a simplification PR. It does not recommend deleting runtime capability and it does not change source behavior. It classifies visible and conditional composer affordances into review buckets so future UI work can proceed safely.

No controls should be removed, moved, hidden, merged, or restyled until they have been classified, reviewed against runtime dependencies, and checked against desktop, mobile, MiniChat, and mode/tier needs.

## 2. Composer surfaces inspected

| Surface | File path | Current role | Desktop/mobile behavior | Default-visible or conditional |
|---|---|---|---|---|
| Main centered empty-state composer | `src/components/layout/ChatPanel.tsx` | Welcome-state composer used before any visible user message; includes route mode selector, shared ChatWidgetInput, attachment preview, persona badge, suggestion chips, and a Workforce/Cortex toggle near the surface. | Desktop renders a centered max-width composer in the chat welcome state; mobile only appears when the active mobile tab is `TERMINAL` and uses mobile material styles. | Composer shell and route selector are default-visible in the centered state; attachment preview, suggestions, persona content, and active states are conditional. |
| Docked active chat composer | `src/components/layout/ChatPanel.tsx` | Bottom-docked composer after chat starts; reuses the same shared input area and shows suggestions above the composer. | Desktop docks the composer at the bottom of the chat panel; mobile wraps the bottom area in a mobile sheet with border-top styling. | Default-visible when in active chat; suggestion chips, attachment preview, route hints, and active runtime states are conditional. |
| Shared composer/input control | `src/components/ChatWidgetInput.tsx` | Reusable full composer implementation for main chat and overlay chat surfaces; owns textarea, bottom toolbar, send/stop, voice, attach, vision, model/mode controls, plugin badge, persona runtime indicators, MCP indicator, and approval badge. | Uses responsive `sm:` sizing and hides several status affordances on mobile via `hidden sm:flex`; shares the same component for main and MiniChat-derived surfaces. | Text input, model switcher, mode toggle, attach, vision, voice, and send are default-visible when props are provided; plugin, MCP, approval, status, screen share, attachment preview, and stop are conditional. |
| MiniChat / overlay composer | `src/components/chat/LucaChatSurface.tsx` | Overlay chat surface that renders `ChatWidgetInput` below history, hidden runtime/approval surfaces, and an optional close control. | Designed as a compact overlay surface; no explicit mobile branch in the inspected section, but it receives compact/voice/attachment/approval state from the host. | ChatWidgetInput is default-visible in the overlay; close button, history visibility, error, approval, attachment, voice, and processing states are conditional. |
| MiniChat runtime bridge | `src/components/ChatWidgetMode.tsx`, `src/presence/messages/miniChatMessageTypes.ts`, `src/presence/bridges/miniChatPresenceBridge.ts` | Bridges MiniChat text/image/display context, suggestions, approval prompts, focus policy, brain/model metadata, and legacy widget payloads into runtime messages. | Runtime bridge is not a visible composer, but it defines dependencies the visible MiniChat composer must not break. | Message fields and approval/focus behavior are conditional runtime payload state, not default-visible UI. |
| ChatWidget header controls | `src/components/ChatWidgetHeader.tsx` | Mini header with `L.U.C.A MINI`, brain model indicator, embedding/memory indicator, and close button. | Header has no explicit mobile branch; compact visual weight through tiny text/icons. | Brand label, brain/memory indicators, and close button are default-visible when this header is used; model labels fall back to `CORE` and `MEMORY`. |
| Mobile composer state | `src/components/layout/ChatPanel.tsx`, `src/components/ChatWidgetInput.tsx`, `src/styles/lucaMobileShellStyles.ts` | Mobile chat is scoped to `TERMINAL`, uses mobile sheet/control materials, and shares desktop toolbar unless controls are hidden by responsive classes or missing props. | Mobile should prioritize text, voice, attach, and send/stop; current shared implementation can still expose model/mode/attach/vision/voice/send and hides status/MCP pills via `hidden sm:flex`. | Text/send/voice/attach/vision/model/mode are visible unless future mobile-specific disclosure is added; screen share is not passed on mobile. |
| Voice/send/stop/attachment/model/tool controls | `src/components/ChatWidgetInput.tsx` | Dense toolbar around the composer; routes input submission, stopping, voice state, file/image input, vision/screen context, model selection, planning mode, plugins, MCP, and clear chat. | Responsive icon sizing; desktop can expose more status and MCP detail; mobile inherits most toolbar controls but lacks screen share and hides status/MCP detail. | Mixed: primary actions are default-visible; runtime/safety/status/tool details are conditional. |
| Material/style roles | `src/styles/lucaMaterialSystem.ts`, `src/styles/lucaShellStyles.ts`, `src/styles/lucaMobileShellStyles.ts` | Material tokens define calm glass panel, control, sheet, text, border, shadow, blur, and mobile surface roles that composer visual hierarchy should reuse. | Desktop material emphasizes glass panels and control states; mobile material emphasizes solid/elevated sheet roles. | Style roles are not controls, but they shape current visual weight and future safe hierarchy work. |

## 3. Affordance inventory table

| Control / affordance | File path | Surface | Current visibility | User purpose | System/runtime dependency | Current visual weight | Recommended bucket | Risk if hidden/moved | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Text input textarea | `src/components/ChatWidgetInput.tsx` | Main, docked, MiniChat overlay | Default-visible | Primary natural-language intent entry. | `input`, `setInput`, Enter-to-send, autosize height, focus/no-drag region. | Highest functional importance; calm transparent field. | `primary` | Severe: removes the primary action object and explicit text input. | Preserve direct visibility in all modes. |
| Enter-to-send shortcut | `src/components/ChatWidgetInput.tsx` | Main, docked, MiniChat overlay | Conditional on non-empty text or attachment | Fast keyboard submission. | `onSubmit`, `input.trim()`, `attachment`. | Invisible behavioral affordance. | `primary` | High: changing may break expected chat input behavior. | Do not change in a visual simplification PR. |
| Send button | `src/components/ChatWidgetInput.tsx` | Main, docked, MiniChat overlay | Default-visible but disabled when empty | Explicit submit action. | `onSubmit`, `input`, `attachment`, `isProcessing`. | Medium-high icon button; accent when enabled. | `primary` | Severe: users need a visible commit action, especially mobile. | Keep direct and visually legible. |
| Stop button while generating | `src/components/ChatWidgetInput.tsx` | Main, docked, MiniChat overlay | Conditional when `isProcessing` | Interrupt generation/runtime processing. | `isProcessing`, `onStop`. | High: danger color, pulse, stop icon. | `do-not-touch` | Severe safety/trust risk if hidden or visually weakened. | May also be `primary` in active generation, but safety-critical classification wins. |
| Voice/mic button | `src/components/ChatWidgetInput.tsx` | Main, docked, MiniChat overlay | Default-visible when prop wired; active/listening states conditional | Start/stop voice mode and show speaking/listening state. | `onToggleVoice`, `isVoiceActive`, `isSpeaking`, `amplitude`. | Medium; high when active/pulsing. | `primary` | High if active state hidden; users need clear listening/recording feedback. | Active recording/listening state is `do-not-touch` even if inactive mic is primary. |
| Active voice/listening visual state | `src/components/ChatWidgetInput.tsx` | Main, docked, MiniChat overlay | Conditional on voice/speaking | Shows microphone is active and/or speaking. | `isVoiceActive`, `isSpeaking`, `amplitude`. | High: pulse, glow, danger/info color. | `do-not-touch` | Severe privacy/trust risk if hidden. | Do not bury active voice behind a menu. |
| Attach/add file button | `src/components/ChatWidgetInput.tsx` | Main, docked, MiniChat overlay | Default-visible | Add image/file context to the prompt. | `onAttachClick`, hidden file input in ChatPanel or overlay host. | Medium icon button. | `primary` | Medium-high: multimodal entry becomes undiscoverable. | Keep visible in Basic if attachments remain supported. |
| Hidden file input | `src/components/layout/ChatPanel.tsx` | Main/docked ChatPanel | Hidden DOM control | Native image file selection backing attach. | `fileInputRef`, `handleFileSelect`, `accept="image/*"`. | Hidden by design. | `do-not-touch` | High if disconnected from attach or changed without upload review. | Not a visible affordance, but runtime-coupled. |
| Image attachment preview | `src/components/ChatWidgetInput.tsx`, `src/components/layout/ChatPanel.tsx` | Main, docked, MiniChat overlay | Conditional on attachment | Confirms attached image/context and allows removal. | `attachment`, `attachedImage`, `onClearAttachment`, `setAttachedImage(null)`. | Medium-high thumbnail/card. | `secondary` | Medium-high: users may send wrong context if preview is hidden. | Preview should remain visible once context is attached. |
| Attachment clear button | `src/components/ChatWidgetInput.tsx`, `src/components/layout/ChatPanel.tsx` | Attachment preview | Conditional on attachment | Remove selected image/context before send. | `onClearAttachment`, `setAttachedImage(null)`. | Small but important close affordance. | `primary` | Medium-high: users need a reversible attach action. | Treat as primary within the attachment preview. |
| Model selector | `src/components/ChatWidgetInput.tsx` | Main, docked, MiniChat overlay | Default-visible | Select/change model or intelligence backend. | `ChatModelSwitcher`, `themeName`, `primaryColor`, active plugin color. | Medium; leftmost toolbar control. | `secondary` | Medium: hiding may reduce user control; moving may affect advanced users. | Candidate for calm desktop visibility or compact menu by mode. |
| Mode toggle / extended thinking | `src/components/ChatWidgetInput.tsx` | Main, docked, MiniChat overlay | Default-visible | Toggle planning/extended-thinking behavior. | `ChatModeToggle`, theme/accent props. | Medium; toolbar icon/control. | `advanced` | Medium-high: behavior semantics may be unclear if moved without explanation. | Candidate for Pro/Creator disclosure, not deletion. |
| Clear chat button | `src/components/ChatWidgetInput.tsx` | Main, docked, MiniChat overlay | Conditional when `onClearChat` exists | Clear current chat/history. | `onClearChat`. | Medium icon button with danger hover. | `secondary` | Medium: accidental or hidden destructive action risk. | Consider confirmation/review before changing visibility. |
| Vision/Luca Eye toggle | `src/components/ChatWidgetInput.tsx`, `src/components/ChatWidgetMode.tsx` | Main, docked, MiniChat overlay | Default-visible in current composer; active indicator conditional | Enable screen/camera visual context. | `isEyeActive`, `onToggleEye`, MiniChat screen frame capture path. | Medium; high when active via glow/pulse. | `advanced` | High if active state hidden; user may not understand screen context is enabled. | Inactive toggle can be advanced; active state is `do-not-touch`. |
| Active vision indicator | `src/components/ChatWidgetInput.tsx` | Main, docked, MiniChat overlay | Conditional on `isEyeActive` | Shows vision/screen context is active. | `isEyeActive`. | High tiny pulse/glow. | `do-not-touch` | High privacy/trust risk if hidden. | Must remain legible wherever vision lives. |
| Screen share button | `src/components/ChatWidgetInput.tsx`, `src/components/layout/ChatPanel.tsx` | Desktop ChatPanel composer | Conditional; not passed on mobile | Share screen context. | `onScreenShare`, `handleScreenShare`, `!isMobile`. | Medium icon button. | `advanced` | High if moved without permissions/context review. | Keep off mobile by default unless a mobile-specific pattern is designed. |
| MCP indicator pill | `src/components/ChatWidgetInput.tsx` | Main/docked desktop toolbar | Conditional on configured MCP servers; hidden below `sm` | Show active/offline MCP node status and open MCP settings. | `activeMcpServers`, `luca:open-settings` event. | Medium-high operational pill. | `advanced` | Medium-high: users may lose tool visibility; hidden incorrectly can obscure active connections. | Current mobile hidden state is appropriate directionally. |
| MCP hover popover | `src/components/ChatWidgetInput.tsx` | Desktop MCP indicator | Conditional on hover and MCP servers | Inspect MCP node list and connect/disconnect nodes. | `activeMcpServers`, `onDisconnectMcp`, `onConnectMcp`. | High operational detail. | `advanced` | High: connect/disconnect is runtime-changing and needs review if relocated. | Likely belongs in a tools/settings menu, but not in this PR. |
| MCP connect/disconnect actions | `src/components/ChatWidgetInput.tsx` | Desktop MCP popover | Conditional on MCP servers/hover | Toggle server connection state. | `onDisconnectMcp`, `onConnectMcp`. | Small but high-impact controls. | `do-not-touch` | Severe if accidentally hidden while status remains misleading, or moved without runtime review. | Runtime-changing affordance; requires design/runtime review. |
| Plugin badge / active plugin indicator | `src/components/ChatWidgetInput.tsx` | Toolbar | Conditional on `activePluginId` | Show current plugin/mode context and allow clearing it. | `CURATED_PLUGINS`, `activePluginId`, `onClearActivePlugin`. | Medium-high colored badge. | `advanced` | Medium-high: hidden active plugin state can cause invisible mode confusion. | Active state may need persistent but subtler disclosure. |
| Clear active plugin button | `src/components/ChatWidgetInput.tsx` | Plugin badge | Conditional on active plugin | Exit plugin mode. | `onClearActivePlugin`. | Small inline close button. | `secondary` | Medium: users need a way to escape plugin context. | Keep near plugin indicator if badge remains visible. |
| Route hint / intent routing mode selector | `src/components/layout/ChatPanel.tsx` | Main/docked shared input wrapper | Default-visible compact selector above ChatWidgetInput | Show or select routing behavior before send. | `IntentRoutingModeSelector`, `chatIntentRouterBridge`, route hint messages. | Medium; above composer. | `secondary` | Medium-high: routing invisibility can make behavior feel magical or broken. | Could become subtle status in Basic, fuller control in Pro/Creator. |
| Route hint system message | `src/components/layout/ChatPanel.tsx` | Message stream near composer context | Conditional when routed and not fast response | Explain that intent was routed to a subsystem. | `routeResult`, `getRouteHintText`, `routeLabel`, `routeTone`. | Low/medium message affordance. | `secondary` | Medium: hiding can reduce explainability. | Keep subtle; avoid console-like routing noise in Basic. |
| Persona badge | `src/components/layout/ChatPanel.tsx` | Centered welcome state | Default-visible in centered state | Show active persona identity. | `PersonaBadge`, normalized persona label, theme accent. | Medium identity badge. | `secondary` | Medium: hidden persona can cause identity mismatch confusion. | Basic can keep subtle identity; Pro/Creator may expand. |
| Engineer CWD indicator | `src/components/ChatWidgetInput.tsx` | Desktop toolbar status | Conditional on `persona === "ENGINEER"`; hidden below `sm` | Show current working directory context. | `currentCwd`, persona. | Medium operational chip. | `hidden-by-tier` | Medium: useful for engineering workflows but console-like in Basic. | Better for Pro/Creator or a details menu. |
| Engineer kernel lock/write indicator | `src/components/ChatWidgetInput.tsx` | Desktop toolbar status | Conditional on `persona === "ENGINEER"`; hidden below `sm` | Show write safety state. | `isKernelLocked`, persona. | Medium-high; red pulse when write is on. | `do-not-touch` | High safety risk if write-enabled state is hidden. | Locked/off state may be secondary; write-on warning is safety-critical. |
| Hacker OPSEC indicator | `src/components/ChatWidgetInput.tsx` | Desktop toolbar status | Conditional on `persona === "HACKER"`; hidden below `sm` | Show OPSEC/security status. | `opsecStatus`, persona. | Medium operational chip. | `hidden-by-tier` | Medium-high if active security state matters. | Needs security review before hiding in persona modes. |
| Mission pending / approval indicator | `src/components/ChatWidgetInput.tsx`, `src/components/chat/LucaChatSurface.tsx`, `src/presence/bridges/miniChatPresenceBridge.ts` | Composer and MiniChat approval surface | Conditional on pending approval | Warn user that a mission/tool approval is pending. | `hasApprovalRequest`, `approvalRequest`, presence approval bridge. | High: red/pulse shield indicator and approval surface. | `do-not-touch` | Severe trust/safety risk if hidden. | Must survive any composer simplification. |
| Suggestion chips | `src/components/layout/ChatPanel.tsx`, `src/components/ChatWidgetMode.tsx` | Centered and docked composer area; MiniChat suggestions | Conditional on ambient suggestions and ready state | Offer low-friction prompts and routing ideas. | `ambientSuggestions`, `showSuggestionChips`, boot ready, chip click handlers. | Medium; can add visual clutter. | `secondary` | Low-medium: hiding reduces guidance but not core capability. | Good candidate for calm, dismissible secondary UI. |
| Workforce/Cortex toggle near composer | `src/components/layout/ChatPanel.tsx` | ChatPanel header toggle near composer state | Default-visible in centered/docked chat surfaces | Switch between chat and workforce/canvas view. | `viewMode`, `ProWorkforceCanvas`. | Medium prominent pill. | `hidden-by-tier` | Medium-high: hiding can obscure OS-level orchestration. | Basic may de-emphasize; Creator should expose. |
| MiniChat close button | `src/components/chat/LucaChatSurface.tsx`, `src/components/ChatWidgetHeader.tsx` | MiniChat/overlay/header | Conditional in surface or default in header | Close overlay/MiniChat. | `onClose`, `handleClose`, IPC `chat-widget-close`. | Small; sometimes opacity-gated. | `primary` | Medium: overlay needs an escape hatch. | Keep visible enough on overlay. |
| MiniChat header brand label | `src/components/ChatWidgetHeader.tsx` | MiniChat header | Default-visible when header used | Establish MiniChat identity. | Static label and primary color. | Low/medium. | `secondary` | Low: mostly orientation. | Should remain lightweight. |
| Brain model indicator | `src/components/ChatWidgetHeader.tsx`, `src/presence/bridges/miniChatPresenceBridge.ts` | MiniChat header/runtime bridge | Default-visible in header with fallback | Shows core/brain context. | `brainModel`, `activeBrainId`, bridge payload. | Low but technical. | `secondary` | Medium: hiding can reduce context; overexposing feels diagnostic. | Consider Basic subtle label, Pro/Creator explicit. |
| Memory/embedding indicator | `src/components/ChatWidgetHeader.tsx`, `src/presence/bridges/miniChatPresenceBridge.ts` | MiniChat header/runtime bridge | Default-visible in header with fallback | Shows memory/embedding context. | `embeddingModel`, presence payload. | Low but technical. | `secondary` | Medium: memory trust can be affected if state disappears. | Keep subtle; avoid diagnostic overload. |
| MiniChat text/image/display bridge | `src/components/ChatWidgetMode.tsx`, `src/presence/messages/miniChatMessageTypes.ts` | MiniChat runtime path | Conditional payload fields | Send text, image, display, model/persona/brain metadata. | `createMiniChatMessageRequest`, `toLegacyChatWidgetMessage`, Electron IPC. | Invisible runtime affordance. | `do-not-touch` | Severe if visual changes break payload fields or focus policy. | Documentation-only PR must not alter. |
| MiniChat approval surface | `src/components/chat/LucaChatSurface.tsx`, `src/components/ChatWidgetMode.tsx` | Overlay runtime/safety surface | Conditional on approval request | Approve/deny risky tool/system actions. | `SecurityGate`, presence approval prompt. | High safety surface. | `do-not-touch` | Severe safety/runtime risk. | Must not be hidden under composer cleanup. |
| Mobile bottom sheet/material state | `src/components/layout/ChatPanel.tsx`, `src/styles/lucaMobileShellStyles.ts` | Mobile docked composer | Conditional on mobile active terminal tab | Present composer in a mobile sheet rather than desktop glass workspace. | `isMobile`, mobile material styles. | Medium structural weight. | `secondary` | Medium: desktop complexity may overwhelm mobile if inherited. | Needs mobile-specific simplification plan. |
| Composer material/glass panel | `src/components/ChatWidgetInput.tsx`, `src/styles/lucaMaterialSystem.ts`, `src/styles/lucaShellStyles.ts` | All composer surfaces | Default-visible surface role | Give composer calm elevated OS object feel. | `lucaMaterialPanelStyle`, shell border/shadow/blur tokens. | Medium-high surface weight. | `secondary` | Medium: changing material can alter hierarchy and perceived product direction. | Future hierarchy cleanup should use existing material roles. |

## 4. Buckets

### `primary`

Controls that should remain directly visible in Basic/default mode:

- Text input textarea.
- Send button.
- Stop button while generating, with `do-not-touch` safety constraints.
- Voice/mic button when available.
- Attach/add button when available.
- Attachment clear action when an attachment is present.
- MiniChat close/escape control for overlay contexts.

### `secondary`

Useful controls that are not always primary and may be visible on desktop but compact on mobile:

- Model selector.
- Image attachment preview.
- Suggestion chips.
- Route hint / intent routing mode when presented subtly.
- Persona badge.
- Brain/memory header indicators.
- Clear chat, with destructive-action review.
- Composer material hierarchy and mobile sheet treatment.

### `advanced`

Power controls that may belong behind a tools menu, mode menu, or Pro/Creator disclosure:

- Screen share.
- Vision/Luca Eye inactive toggle.
- MCP/tool/plugin indicator details.
- MCP node popover.
- Detailed runtime routing controls.
- Extended thinking/planning mode toggle.
- Active plugin/mode badge.

### `hidden-by-tier`

Controls that should depend on Basic / Pro / Creator mode:

- Workforce/Cortex controls.
- Engineer CWD indicator.
- Hacker OPSEC status.
- Tactical/workforce/cortex controls.
- Advanced tool execution affordances.
- Diagnostics-style runtime state when not safety-critical.

### `do-not-touch`

Controls that are safety-critical, trust-critical, or runtime-coupled and must not be moved without a later design/runtime review:

- Stop generation.
- Active voice/listening state.
- Active vision/screen-context state.
- Mission pending / approval indicators.
- MiniChat approval surface.
- Permission/approval and blocked-action states.
- Kernel write-enabled or similarly risky active safety states.
- MCP connect/disconnect runtime actions.
- MiniChat text/image/display/message bridge behavior.
- Hidden native file input wiring behind the attachment button.

## 5. Desktop vs mobile recommendation

| Affordance | Desktop recommendation | Mobile recommendation | Reason |
|---|---|---|---|
| Text input | Always visible and visually dominant. | Always visible and dominant. | The composer is the primary action object. |
| Send/stop | Always visible; stop overrides send while generating. | Always visible; stop must remain reachable with thumb. | Send commits intent; stop is safety/trust-critical. |
| Voice/mic | Visible in Basic if voice is supported; active state prominent. | Visible in Basic; active/listening state must be unmistakable. | Voice is a primary natural input and has privacy implications. |
| Attach/add | Visible in Basic if attachments are supported. | Visible in Basic, preferably as one compact icon. | Multimodal context should be discoverable without desktop complexity. |
| Attachment preview | Visible when attached; can be compact. | Visible when attached, but smaller and sheet-friendly. | Users need confirmation before sending visual context. |
| Model selector | Visible or compact on desktop depending on mode. | Prefer menu/sheet unless mode requires direct model control. | Mobile should not inherit full desktop composer complexity. |
| Mode/extended thinking toggle | Secondary/advanced; can remain visible in Pro/Creator. | Put behind a mode/tools sheet. | Default mobile composer should not feel like an operator console. |
| Route selector/hint | Keep subtle; expose more in Pro/Creator. | Collapse into subtle status or sheet. | Routing explainability matters, but constant routing controls can feel technical. |
| Suggestion chips | Show as low-weight, dismissible guidance. | Limit count and keep below/above composer without crowding. | Helpful but not primary. |
| Vision/Luca Eye | Inactive control can live in tools; active state visible. | Put inactive control in tools/sheet; active state visible near composer. | Screen/visual context is powerful and privacy-sensitive. |
| Screen share | Desktop tools/menu or Pro/Creator direct control. | Keep behind a sheet or omit until mobile-specific design exists. | Screen sharing is advanced and permission-sensitive. |
| MCP/tool/plugin status | Desktop can show subtle status; details in menu/settings. | Hide detail behind tools sheet; show only critical active state. | Tool orchestration is OS-level capability but can overwhelm mobile. |
| Persona/brain/memory indicators | Subtle identity/status near composer or header. | Minimal identity chip or header label only. | Context helps trust, but mobile space is scarce. |
| Workforce/Cortex toggle | Expose by mode/tier; Creator can be direct. | Put behind navigation or sheet, not the core composer row. | Creator orchestration should not crowd Basic mobile chat. |
| Approval/safety states | Prominent and directly visible. | Prominent and directly visible. | Safety and permissions cannot be hidden for simplification. |

## 6. Basic / Pro / Creator recommendation

| Affordance | Basic | Pro | Creator | Notes |
|---|---|---|---|---|
| Text input | Visible | Visible | Visible | Composer-first in every tier. |
| Send/stop | Visible; stop prominent while generating | Visible; stop prominent | Visible; stop prominent | Stop is `do-not-touch`. |
| Voice/mic | Visible if available; active state prominent | Visible | Visible | Active listening state cannot be hidden. |
| Attach/add | Visible if available | Visible | Visible | Keep multimodal entry simple. |
| Attachment preview | Visible when active | Visible when active | Visible when active | Context confirmation matters in every tier. |
| Model selector | Compact or subtle | Visible/compact | Visible with deeper controls | Capability remains available; visibility can increase by tier. |
| Mode/extended thinking | Hidden or compact in mode menu | Visible or menu | Visible/direct | Avoid Basic feeling like a console. |
| Route hint/selector | Subtle status or default routing | More explicit selector | Full routing/orchestration visibility | Explainability should scale with expertise. |
| Suggestion chips | Calm, limited, dismissible | More contextual | Workflow/canvas-aware | Suggestions should not compete with input. |
| Vision/Luca Eye | Tools menu unless active | Visible or tools | Visible/direct | Active state remains visible in all tiers. |
| Screen share | Tools menu or hidden until requested | Tools menu/direct | Direct or orchestration panel | Requires permission/runtime review before movement. |
| MCP/tool/plugin indicators | Critical active state only | Compact status + menu | Detailed status and node management | Do not remove tool capability. |
| Persona badge | Subtle identity | Visible identity/context | Expanded persona/workforce context | Prevent identity mismatch without clutter. |
| Brain/memory indicators | Subtle or header-only | Visible compact | Visible detailed | Memory/trust context should remain understandable. |
| Clear chat | Secondary menu or subtle button | Visible secondary | Visible secondary | Destructive action should be reviewed. |
| Workforce/Cortex | Hidden or navigation-level | Available but not composer-primary | Direct and prominent | Creator can expose orchestration/workforce/canvas tools. |
| Engineer/Hacker diagnostics | Hidden unless safety-critical | Visible in persona modes | Visible/detail-rich | Write-enabled or approval states stay `do-not-touch`. |
| Approval/safety/permission states | Prominent | Prominent | Prominent | Never tier-hide safety. |

## 7. Risk notes

- Do not hide stop/send behavior. Send is the explicit commit action; stop is a safety and trust affordance.
- Do not hide active voice/listening state. Users must always know when voice or recording-like behavior is active.
- Do not hide active vision/screen-context state. Screen or image context must remain legible to avoid privacy and mode confusion.
- Do not hide safety/permission/approval states, including mission pending and approval prompts.
- Do not remove advanced capabilities; only classify possible disclosure patterns for later review.
- Do not make MiniChat heavier than the main composer. MiniChat should be lighter and more contextual, not a second operator console.
- Do not make mobile behave like desktop. Mobile should prioritize text, voice, attach, send/stop, and hide advanced controls behind sheets/menus.
- Do not simplify by deleting LucaOS’s OS-level identity. The goal is a quiet operating system for intelligence, not a stripped chatbot.
- Do not move runtime-coupled controls such as MCP connect/disconnect, screen share, approvals, voice, vision, or MiniChat bridge behavior without design and runtime review.

## 8. Recommended follow-up PRs

### `safe-small`

- Composer visual hierarchy cleanup plan.
- Compact tools menu design audit.
- Mobile composer simplification plan.
- MiniChat lightweight composer audit.
- Inventory screenshots or annotated diagrams of current composer states, using local app captures only.

### `needs-design-review`

- Moving model/tool/MCP controls into a menu.
- Tier-based composer controls.
- Composer-first default shell behavior.
- VoiceHUD/composer relationship.
- Permission, approval, and active-listening/active-vision disclosure placement.
- MiniChat header and brain/memory indicator visibility in Basic vs Pro/Creator.

### `defer`

- Runtime behavior changes.
- Model routing changes.
- Voice runtime changes.
- Browser runtime changes.
- LucaLink behavior changes.
- Memory/governance workflow changes.
- MCP connection semantics.
- MiniChat message bridge or Electron IPC behavior changes.

## 9. Strict rules

Do not:

- Edit source/runtime behavior.
- Edit `App.tsx`.
- Edit README.
- Touch onboarding.
- Touch voice runtime.
- Touch browser runtime.
- Touch LucaLink behavior.
- Touch memory/governance/model routing/services.
- Touch tactical/debug/advanced visuals.
- Move, hide, or remove any composer controls.
- Add competitor screenshots/assets/logos.
- Copy competitor UI directly.

This PR must be documentation-only.
