# Luca Visual Reuse Audit

## Scope

This audit records the existing Luca presence visuals evaluated for the WebBridge post-boot transition. The implementation deliberately reuses Luca's established icon/hologram treatment and VoiceHUD liquid-orb language; it does not introduce a generated visual identity or import desktop voice runtime into WebBridge.

## Existing hologram face

| Source | Finding | Browser safety | Runtime coupling | Decision |
| --- | --- | --- | --- | --- |
| `src/components/Onboarding/HologramFace.tsx` | Canonical onboarding presence that selects the 3D `HologramScene` or the low-performance 2D face. | Browser-rendered, but the 3D branch adds WebGL/device-detection weight. | No provider/native service import in the component itself. | Keep canonical onboarding unchanged; do not add its 3D dependency chain to post-boot. |
| `src/components/Onboarding/HologramFace2D.tsx` | Existing 2D Luca hologram treatment using `/icon.png`, glow, tint, scanlines, and pulse. | Yes. | Presentation-only; no unsafe runtime service import. | Extract its established asset and visual treatment into a size/state-driven wrapper. |
| `public/icon.png` | Existing Luca face/icon asset used by the 2D hologram. | Yes. | None. | Reused directly by `LucaHologramPresence`. |
| `src/components/Hologram/HologramWidget.tsx` and `HologramScene.tsx` | Desktop embodied hologram/widget path. | Browser-renderable with WebGL support. | Part of a broader desktop hologram surface and heavier than required for a short transition. | Audited but not imported into WebBridge. |

## Existing orb, dictation, and VoiceHUD visuals

| Source | Finding | Browser safety | Runtime coupling | Decision |
| --- | --- | --- | --- | --- |
| `src/components/VoiceHud.tsx` | Full-screen desktop voice runtime surface that composes the visualizer, status, controls, settings, telemetry, camera, and tool/runtime state. | The React surface targets browser APIs, but it is not WebBridge-safe as a module. | Imports `lucaService`, tool registry, event bus, voice session orchestrator, settings, and other desktop/runtime surfaces. | Never import into WebBridge. |
| `src/components/voice/VoiceVisualizer.tsx` | Existing liquid plasma orb, rotating containment rings, amplitude pulse, and listening/speaking colors used by VoiceHUD. | Canvas rendering is browser-capable. | Imports `eventBus` and `PersonaType` from `lucaService`; also reads `window` at render time. | Extract only its visual vocabulary into a small presentational primitive; do not pull its runtime subscription into WebBridge. |
| `src/components/voice/VoiceStatusOrb.tsx` | VoiceHUD state-label overlay. Despite its name, it does not draw the orb. | Browser-capable. | Imports `PersonaType` from `lucaService`. | Not imported by WebBridge. |
| `src/components/WidgetMode.tsx` and `src/components/ChatWidgetMode.tsx` | Dictation/widget owners and runtime controls. | Desktop-oriented. | IPC, hooks, microphone, and runtime behavior. | Leave unchanged. |
| `landing/voicehud_preview.png` | Historical rendered VoiceHUD preview. | Static browser-safe asset. | None. | Audit evidence only; not used as live UI. |

## Extracted browser-safe primitives

### `LucaHologramPresence`

`src/components/visual/LucaHologramPresence.tsx` reuses the existing `/icon.png` asset and the established 2D hologram's glow, scanline, ring, and pulse treatment. It accepts size, state, theme color, and class props and has no service/provider/native imports.

### `LucaPresenceOrb`

`src/components/visual/LucaPresenceOrb.tsx` is a presentational extraction of the existing VoiceHUD visual language: liquid rounded core, amplitude scaling, outer containment ring, glow, and state color. It accepts the established voice/presence states and optional amplitude without subscribing to event buses or owning microphone/provider behavior. The desktop VoiceHUD remains unchanged in this focused PR to avoid voice-runtime regressions.

## Final strategy

The post-boot transition uses `LucaHologramPresence` as the primary visual and `LucaPresenceOrb` as a small secondary state signal. Both are browser-safe, presentation-only wrappers based on existing Luca assets and visual logic. WebBridge does not import `VoiceHud`, `VoiceVisualizer`, desktop voice runtime, native LucaLink runtime, or provider services. A later desktop-focused PR can adopt `LucaPresenceOrb` inside VoiceHUD/Dictation after dedicated visual regression testing.

## Hydration and loading safety

WebBridge mounts React before resolving post-boot user state. While guarded
storage and permission checks resolve, `WebPostBootLoading` renders immediately
with static, browser-API-free preparation copy. The pre-hydration watchdog only
shows its fatal state when an actual bootstrap error has been captured; slow
bundle loading or post-boot state resolution remains a normal loading state.
