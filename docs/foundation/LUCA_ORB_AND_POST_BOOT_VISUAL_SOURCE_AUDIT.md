# Luca Orb and Post-Boot Visual Source Audit

## Scope and conclusion

This is a source-location audit only. It does not replace post-boot visuals,
change Dictation or VoiceHUD behavior, or move desktop runtime services into
WebBridge.

The repository does not have one shared component that is simultaneously used
by both Dictation Widget and VoiceHUD. It has two existing canvas
implementations of the same liquid-plasma visual:

- Dictation Widget renders `WidgetVisualizer` from
  `src/components/WidgetVisualizer.tsx`.
- VoiceHUD renders `VoiceVisualizer` from
  `src/components/voice/VoiceVisualizer.tsx`.

For a small post-boot status indicator, the Dictation implementation is the
closest exact source because it is already a compact orb. A later extraction
should preserve its canvas drawing code while separating presentation from
Electron/runtime state. It must not import either `WidgetMode` or `VoiceHud`
into WebBridge.

The real high-performance onboarding Luca identity is `HologramFace` rendering
`HologramScene`, which loads `/models/avatar.glb` and applies its Three.js
shader. The low-performance fallback is `HologramFace2D`, which uses
`/icon.png`; therefore `/icon.png` is a fallback/logo treatment, not the
primary hologram source.

The old terminal sequence is the first-run onboarding
`KERNEL_AWAKENING` state. `OnboardingLifecycleService` supplies its messages
and `OnboardingFlow` renders them. In WebBridge it occurs *inside*
`WebLifecycleShell`, after the new-user `WebPostBootTransition` advances to
onboarding. It is not a pre-`WebLifecycleShell` bootstrap screen. If product
review observes it before another Preparing LucaOS screen in a particular
journey, that journey/order should be reproduced separately; the exact-string
search found no second production renderer.

## A. Real Dictation/VoiceHUD orb source

**Exact file path (Dictation Widget):**
`src/components/WidgetVisualizer.tsx`

**Component/function name:** `WidgetVisualizer`; its `draw` animation function
contains the `LIQUID PLASMA ORB` implementation.

**Exact file path (VoiceHUD):**
`src/components/voice/VoiceVisualizer.tsx`

**Component/function name:** `VoiceVisualizer`; its `draw` animation function
contains the full-screen `LIQUID PLASMA ORB (The Core)` implementation.

**Runtime dependencies:**

- `WidgetVisualizer`: React, browser canvas APIs,
  `requestAnimationFrame`, and presentation-only theme helpers from
  `src/config/themeColors.ts`. Its props carry amplitude, VAD, speaking,
  persona/theme, and VisualCore-active state.
- `VoiceVisualizer`: the same browser canvas/theme dependencies plus
  `src/services/eventBus.ts` for direct audio-amplitude subscription and the
  `PersonaType` type currently imported from `src/services/lucaService.ts`.

**Browser-safe or not:**

- The canvas drawing algorithm in `WidgetVisualizer` is browser-safe.
  `WidgetVisualizer` itself does not import Electron or a voice runtime.
- The drawing algorithm in `VoiceVisualizer` is browser-capable, but the
  existing module is not appropriate for direct WebBridge reuse because it
  imports `eventBus` and a type from `lucaService`, subscribes to runtime audio
  events, reads `window.innerWidth`/`window.innerHeight`, and renders a
  full-screen background grid.
- `WidgetMode` and `VoiceHud` are not browser-safe presentation imports:
  `WidgetMode` owns Electron IPC and Dictation hooks, while `VoiceHud` imports
  tool, camera, event, and voice-session runtime behavior.

**Can be extracted safely:** Yes. Extract only the shared canvas drawing math
and presentational props into a browser-safe component. Keep amplitude and
state as caller-supplied data. Do not subscribe to `eventBus`, import
`lucaService`, access Electron, acquire a microphone/camera, or import
`VoiceHud`/`WidgetMode` from the extracted module.

**Visual states supported:**

- standby/idle: themed subtle glow;
- listening/VAD active: white-hot core, secondary-color body, active scale;
- speaking/model output: deep themed pulse when amplitude is present;
- amplitude-reactive fluid deformation and outer glow;
- Dictation additionally supports a VisualCore-active HUD ring;
- VoiceHUD additionally supports a `lowPower` drawing mode.

**Rendering technology:** HTML `<canvas>` with the Canvas 2D API, hosted in
React `<div>` elements. It is not SVG and the core orb is not CSS-generated.

**Used by Dictation Widget:** Yes. `WidgetMode` imports `WidgetVisualizer` and
renders it under the source comment `CANVAS ORB VISUALIZER`, passing satellite
amplitude and Dictation listening state.

**Used by VoiceHUD:** `WidgetVisualizer` is not used by VoiceHUD. VoiceHUD
imports and renders the sibling `VoiceVisualizer`, which contains the
corresponding larger liquid-plasma canvas implementation. `VoiceStatusOrb` is
misleadingly named: it renders centered status labels and does not draw the
orb.

**Evidence:**

1. `src/components/WidgetMode.tsx` imports `WidgetVisualizer` and renders it as
   the Dictation canvas orb.
2. `src/components/WidgetVisualizer.tsx` labels and implements the
   `LIQUID PLASMA ORB`, gradients, glow, and orbital rings.
3. `src/components/VoiceHud.tsx` imports and renders `VoiceVisualizer`.
4. `src/components/voice/VoiceVisualizer.tsx` implements `LIQUID PLASMA ORB
   (The Core)` with the same wave/gradient vocabulary at VoiceHUD scale.
5. `src/components/voice/VoiceStatusOrb.tsx` contains status text only.

## B. Current generic orb added in PR #310

**File path:** `src/components/visual/LucaPresenceOrb.tsx`

**Why it is not the same as the real orb:** It is a newly composed set of CSS
`div` circles/blobs using border spin, blur, pulse, and scale transforms. It
does not use the 2D canvas, wave superposition, radial-gradient drawing,
amplitude-shaped perimeter, or orbital-ring implementation in
`WidgetVisualizer`/`VoiceVisualizer`. It is not imported by Dictation Widget
or VoiceHUD.

**Disposition:** Keep temporarily only to avoid a broad post-boot redesign in
this audit PR. Mark it as a legacy/generic placeholder. Replace its post-boot
usage with a browser-safe extraction of the real Dictation canvas orb in the
next visual PR, then delete or deprecate the component if no other call sites
remain.

**Implemented follow-up:** The focused replacement PR introduced
`src/components/visual/LucaCanvasPresenceOrb.tsx` and
`src/components/visual/lucaCanvasOrbRenderer.ts`, then removed
`LucaPresenceOrb` from the post-boot path. The generic component remains
deprecated only for compatibility with any non-post-boot callers.

## C. Real Luca hologram face/shader source

**Exact file paths:**

- Selection/wrapper: `src/components/Onboarding/HologramFace.tsx`
- Primary 3D renderer and shader:
  `src/components/Hologram/HologramScene.tsx`
- Low-performance fallback:
  `src/components/Onboarding/HologramFace2D.tsx`
- Model asset: `public/models/avatar.glb`

**Component/function names:** `HologramFace` selects the implementation;
`HologramScene` renders the Three.js scene; its internal `SceneWithMaterial`
loads and shades the avatar.

**Asset source:** `useGLTF("/models/avatar.glb")`. The scene applies a custom
`THREE.ShaderMaterial` with animated scanlines, scan beam, Fresnel/rim light,
audio/wake/genesis glitch, additive blending, float, scale pulse, and rotation.

**Runtime dependencies:** React, `three`, `@react-three/fiber`,
`@react-three/drei`, WebGL/canvas, `/models/avatar.glb`, and
`src/services/eventBus.ts`. `HologramFace` also calls
`detectDeviceCapabilities`.

**Browser-safe or not:** The rendering stack and GLB asset can run in a capable
browser, but the current `HologramScene` is not a clean WebBridge import
boundary because it directly subscribes to the application `eventBus`.
WebBridge must not gain that runtime import merely to reuse the visual.

**Can be reused in WebBridge:** Yes, after a narrow presentational extraction
or adapter removes the direct event-bus subscription and accepts audio/wake
visual inputs as optional props. The reusable renderer must remain lazy,
client-only, and failure-tolerant because WebGL/model loading can fail.

**Low-performance/mobile fallback:** Preserve the capability gate, but do not
mistake the existing `HologramFace2D` `/icon.png` fallback for the primary
hologram. A later PR should use a lightweight captured/static representation
of the shaded avatar (or an explicitly approved low-cost render) with reduced
motion. Until such an asset exists, the current 2D icon fallback may remain as
an honest temporary fallback.

**Evidence:**

1. `OnboardingFlow` renders `HologramFace` as the onboarding background outside
   kernel awakening, directive alignment, and text conversation.
2. `HologramFace` renders `HologramScene` unless
   `detectDeviceCapabilities().isLowPerformance` is true.
3. `HologramScene` loads `/models/avatar.glb` and defines the active shader.
4. Only `HologramFace2D`, the low-performance branch, selects `/icon.png`.

## D. Current post-boot `/icon.png` visual added in PR #310

**File path:** `src/components/visual/LucaHologramPresence.tsx`

**Why it is logo/icon-based:** Its central visual is an `<img
src="/icon.png">` with CSS brightness, contrast, drop shadows, pulse, and a
scanline overlay. It does not load the avatar model or execute the onboarding
hologram shader.

**Does it match the requested hologram face:** No. It resembles the
low-performance `HologramFace2D` fallback treatment, not the primary
`HologramScene` identity used by onboarding on capable devices.

**Recommendation:** Keep temporarily in this audit-only PR. In the next PR,
replace its use in `WebPostBootTransition` with a browser-safe,
failure-tolerant presentation extraction of `HologramScene`; retain a
documented low-performance fallback.

**Implemented follow-up:** `WebPostBootTransition` now uses
`src/components/visual/LucaHologramShaderPresence.tsx`, which lazily loads the
presentation-only `LucaHologramShaderScene` and the canonical
`/models/avatar.glb` asset without importing `eventBus` into WebBridge.

## E. Old terminal post-boot source

**Exact file paths:**

- Message list/timing:
  `src/services/onboarding/OnboardingLifecycleService.ts`
- Copy values:
  `src/services/runtime/lucaBootCopyModel.ts`
- Visible renderer:
  `src/components/Onboarding/OnboardingFlow.tsx`

**Component/function names:**

- `KERNEL_BOOT_MESSAGES` and `startKernelBootSequence`
- `OnboardingFlow`, specifically the `step === "KERNEL_AWAKENING"` effect and
  render branch

**When it renders:** `OnboardingFlow` initializes at `KERNEL_AWAKENING` for a
normal first-run flow. Every 800 ms `startKernelBootSequence` appends one of
the four messages to `bootText`. `OnboardingFlow` renders each line with a
literal `>` prefix and a blinking rectangular cursor. After the messages, it
waits 1000 ms and advances to directive alignment.

**Relationship to WebLifecycleShell:** It does not happen before
`WebLifecycleShell`. WebBridge directly mounts `OnboardingFlow` from
`WebLifecycleShell` when lifecycle state becomes `onboarding`. For a newly
resolved user, `WebLifecycleShell` first renders `WebPostBootTransition`, whose
timer then changes the state to `onboarding`; the terminal sequence follows.
Outside WebBridge, `App.tsx` also renders `OnboardingFlow` when its desktop
`bootSequence` is `ONBOARDING`.

**Classification:** First-run onboarding bootstrap (`KERNEL_AWAKENING`), not
the general boot shell and not a post-boot fallback. The copy model and
experience-map references are data/audit sources; they are not additional
renderers.

**Why PR #310 did not replace it:** PR #310 added
`WebPostBootTransition` and its visuals, but left canonical
`OnboardingFlow` unchanged. The transition hands new users to onboarding, so
the existing onboarding kernel terminal still runs.

**Recommended fix:** In the next focused visual PR, replace or bypass only the
`KERNEL_AWAKENING` terminal presentation for the intended journey, preserving
its lifecycle completion/handoff. Confirm whether desktop onboarding should
change at the same time or whether WebBridge needs an adapter-controlled
presentation. Do not remove the copy model or alter unrelated boot/runtime
readiness behavior.

**Exact-string search evidence:** Production occurrences of all four requested
strings resolve to `lucaBootCopyModel.ts` (copy source) and
`lucaBootExperienceMap.ts` (architecture audit data). The renderer obtains
those copy values through `OnboardingLifecycleService`. No second production
JSX renderer containing the literal strings was found.

## F. Recommended second PR plan

1. Replace the old terminal `KERNEL_AWAKENING` presentation at its real
   `OnboardingFlow` source while preserving lifecycle timing and handoff.
2. Reuse the actual `HologramScene` avatar/shader in Preparing LucaOS through a
   browser-safe, lazy presentational extraction.
3. Extract the actual `WidgetVisualizer`/`VoiceVisualizer` liquid-plasma
   canvas drawing into a browser-safe presentational component with
   caller-owned state.
4. Use the real compact orb as status-row progress indicators where needed,
   rather than placing a second identity orb beside the face.
5. Remove or formally deprecate `LucaPresenceOrb` once its post-boot call site
   is migrated.
6. Add source and rendering tests that protect the canonical canvas and GLB
   shader sources, WebBridge import boundaries, low-performance fallback, and
   absence of newly generated generic orb substitutes.
