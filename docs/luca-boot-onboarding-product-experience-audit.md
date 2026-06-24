# LucaOS Boot and Onboarding Product Experience Audit

**Type:** Product experience audit and redesign plan (documentation-only)  
**Status:** Audit. No source, runtime, UI, skin resolver, tests, assets, screenshots, or implementation changes are made by this document.  
**Date:** 2026-06-24  
**Target PR:** `docs(ui): audit LucaOS boot and onboarding product experience`

Read together with:

- `docs/luca-skin-boot-onboarding-plan.md`
- `docs/luca-skin-boot-qa-matrix.md`
- `docs/luca-skin-application-boundaries.md`
- `src/components/boot/LucaBootVisualShell.tsx`
- `src/components/boot/lucaBootVisualShellModel.ts`
- `src/hooks/app/useAppSystem.ts`
- `src/web/WebLifecycleShell.tsx`
- `src/web/postBoot/WebPostBootLoading.tsx`
- `src/web/postBoot/WebPostBootTransition.tsx`
- `src/web/postBoot/webPostBootState.ts`
- `src/components/Onboarding/OnboardingFlow.tsx`
- `src/services/onboarding/OnboardingController.ts`

> Product direction: **"LucaOS should feel like a quiet operating system for intelligence, not a dashboard for controlling intelligence."**

> Skin framing: **"LucaOS skins are not decorations; they are the visual operating environments for an AI-native OS."**

> **Status update (2026-06-24).** The post-boot bridge has moved from design concept to implementation planning in `docs/luca-postboot-readiness-bridge-implementation-plan.md`. No source, runtime, UI, service, test, or Web Safe Mode changes have been made yet.

---

## 1. Executive summary

The current boot and onboarding flow is trying to establish LucaOS as a host-native AI operating environment, verify readiness, route a first-run user through identity/profile setup, choose a visual atmosphere, select cloud/local/BYOK intelligence, optionally provision local models, choose text or voice, collect conversational preferences, and complete into the main shell.

The Boot Window is now the strongest part of the sequence: it has local skin application, a clear LucaOS identity, browser-safe readiness copy, and a guarded readiness inventory. The weaker product moments are immediately after boot and during onboarding. The post-boot bridge still reads partly like a state resolver or waiting room, while onboarding is still shaped around internal setup steps such as `KERNEL_AWAKENING`, `DIRECTIVE_ALIGNMENT`, `NEURAL_HANDSHAKE`, `COGNITIVE_CORE_SELECTION`, provisioning, calibration, and completion. Those steps are useful engineering concepts, but they do not yet consistently communicate a premium consumer/founder/technical-user promise: Luca lives across the device, has understandable permission and memory boundaries, can appear in multiple surfaces, and can route intelligence through Luca Prime, BYOK, cloud, or local models.

Conceptually, LucaOS should move from **setup wizard for an AI tool** to **first-run environment ceremony for a device-level AI being**. Normal users should see calm, clear choices; Pro users should see operational controls when relevant; Creator/Origin users should see deeper agent, governance, LucaLink, and local/cloud routing controls. Debug and protocol language should be separated from the default experience.

This redesign should happen before onboarding skin boundary implementation because skins will amplify whatever product structure exists. If onboarding is skinned before the product concept is clarified, LucaOS risks polishing an old wizard, making copy harder to revise, and forcing skin boundary decisions around screens that may later be renamed, merged, or removed.

---

## 2. Current flow inventory

| Order | Stage | Component/file | User-facing purpose | Current UX role | Current risk/problem | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Boot Window | `src/components/boot/LucaBootVisualShell.tsx`, `src/components/boot/lucaBootVisualShellModel.ts`, `src/hooks/app/useAppSystem.ts` | Launch LucaOS, show readiness, route to onboarding or ready shell. | Premium startup shell with local Boot Window skin boundary and readiness items. | Some copy still exposes tactical/diagnostic language; readiness rows can feel technical for normal users. | **Stay, lightly soften.** Keep Boot Window boundary; reserve deeper diagnostics for details/debug. |
| 2 | Web Safe Mode indicator | Web safe-mode banner/shell paths referenced by `docs/luca-skin-boot-qa-matrix.md` and web boot runtime state. | Let web UI mount while secure runtime features are unavailable. | Compact degraded-state indicator. | If it overlaps onboarding or reads like normal readiness, users may think secure setup is complete. | **Stay compact.** Diagnostics collapsed unless expanded or `?bootDebug=1`. |
| 3 | Post-Boot Loading | `src/web/postBoot/WebPostBootLoading.tsx` | Hold while web post-boot state resolves. | Small centered loading panel: “Preparing LucaOS” / “Starting Luca's web session…”. | Reads as generic app loading, not a premium readiness bridge. | **Redesign/merge into readiness bridge.** |
| 4 | Post-Boot Transition | `src/web/postBoot/WebPostBootTransition.tsx`, `src/web/postBoot/webPostBootState.ts`, `src/web/WebLifecycleShell.tsx` | Decide whether a new, partial, permission-attention, or ready user continues to onboarding/main. | Second boot bridge with actions to continue, review voice permission, or choose model route. | Can feel like a debug transition; state labels expose setup mechanics more than LucaOS value. | **Redesign.** Make it “Preparing your LucaOS environment” with optional details. |
| 5 | Mode routing / lifecycle host | `src/web/WebLifecycleShell.tsx` | Route `post_boot`, `onboarding`, optional `ready` debug, and `main`. | Product state router. | `ready` debug state can leak product/debug ambiguity if visible by default. | **Keep internal.** Ensure debug visible only when intentionally enabled. |
| 6 | Kernel awakening | `src/components/Onboarding/OnboardingFlow.tsx`, `src/services/onboarding/OnboardingController.ts` | Animated first-run preparation on desktop; skipped on web runtime. | Ceremonial startup before setup. | “Kernel” framing is internal/sci-fi and not normal-user friendly. | **Rename conceptually.** Use “Welcome to LucaOS” / “Luca lives across your device.” |
| 7 | Directive alignment | `src/components/Onboarding/ConstitutionalAlignment.tsx`, `OnboardingController.ts` | Explain operating principles and user authority. | Alignment/constitution gate. | Heavy “kernel,” “directive,” “operator,” and “sovereignty” language can feel cyberpunk or legalistic. | **Simplify for Basic; reserve details for advanced.** |
| 8 | Theme/appearance setup | `src/components/Onboarding/ThemeSelectionStep.tsx` | Choose visual atmosphere, opacity, and glass blur. | Appearance first-run setup. | Uses legacy themes, glass/blur controls, and technical visual knobs before skin-era concept is settled. | **Redesign as environment choice.** Pearl / Carbon / Flow / Canvas later. |
| 9 | Identity/Profile | `src/components/Onboarding/OnboardingAccessPanels.tsx`, `src/services/onboarding/OnboardingSetupService.ts` | Ask what Luca should call the user and persist profile name. | Identity handshake. | “Identity verification” can sound biometric/security-heavy when the step is mostly naming. | **Simplify.** “What should Luca call you?” is good; avoid false verification framing. |
| 10 | Face/Presence setup | `src/components/Onboarding/FaceScan.tsx`, `OnboardingFlow.tsx` | Optional face enrollment/presence setup. | Presence/identity input. | Risk of implying security-grade identity verification; camera permission clarity matters. | **Redesign as optional presence.** Explain what is saved and where. |
| 11 | Model/Provider setup | `OnboardingAccessPanels.tsx`, `OnboardingLocalPlanReviewPanel.tsx`, `OnboardingProvisioningPanel.tsx`, `OnboardingModelModeCoordinator.ts`, desktop/web runtime adapters. | Choose Luca Prime, local, or BYOK provider; plan/provision models. | Core intelligence route setup. | “Luca Core,” “cognitive core,” “sovereign compute,” and provisioning can be strong but too abstract for Basic. | **Keep capability, reframe.** “Choose intelligence route.” Advanced details expandable. |
| 12 | Local hardware/provisioning | `OnboardingSystemPanels.tsx`, `OnboardingProvisioningPanel.tsx`, local provisioning service. | Scan hardware, install/wake Ollama, download local chat/voice/vision/memory models. | Technical local setup path. | Necessary for local users but too long/technical for Basic or web. | **Mode-gate.** Show to Pro/Creator/local opt-in; summarize calmly. |
| 13 | Mode Select | `src/components/Onboarding/ModeSelect.tsx` | Choose text or voice conversation setup. | Chat/voice choice with route warnings. | “Mode select” narrows LucaOS to conversation instead of device presence. | **Merge into presence setup.** Include MiniChat, Voice, Widget, Presence/Hologram. |
| 14 | Conversation setup | `ConversationalOnboarding.tsx`, `OnboardingConversationSurface.tsx`, `MessageBubble.tsx`, `MessageInput.tsx` | Gather preferences conversationally and create profile. | Chat-like calibration surface. | Risks making LucaOS feel like a chatbot wrapper. | **Shorten and reposition.** Use only where conversation adds value. |
| 15 | Calibration/Completion | `OnboardingSystemPanels.tsx`, `OnboardingFlow.tsx` | Final processing and completion into shell. | Completion ceremony. | “Calibration” can feel prototype/debug. | **Rename.** “Finishing your LucaOS environment” / “Luca is ready to live on this device.” |
| 16 | Main Dashboard | Web/main shell paths after lifecycle completion. | Enter LucaOS. | Product home. | If setup did not explain surfaces, dashboard can feel like the product instead of one surface of Luca. | **Enter with context.** Main shell should feel like one surface among MiniChat, Widget, VoiceHUD, Presence. |

---

## 3. Current copy/language audit

### Classification

| Term/family | Current product issue | Recommendation |
| --- | --- | --- |
| protocol | Reads operational/security-heavy. | **Hide behind details/debug** or reserve for Pro/Creator policy docs. |
| directive | Can feel coercive or sci-fi in first run. | **Soften** to “preferences,” “rules,” or “how Luca should work.” |
| kernel | Internal OS metaphor; can be premium in diagnostics but cold in onboarding. | **Remove from normal onboarding; reserve for debug/advanced.** |
| sovereign / sovereignty | Strong creator/local compute positioning, but polarizing and abstract. | **Reserve for Pro/Creator/Origin.** Normal copy: “private,” “local,” “under your control.” |
| cognitive core / Luca Core | Communicates intelligence route but sounds abstract. | **Soften.** Use “intelligence route” in Basic; keep “Luca Core” as advanced label. |
| identity verification | May imply legal/biometric verification. | **Soften.** Use “profile,” “presence,” “recognition,” and explicit storage language. |
| calibration | Sounds prototype-like. | **Soften.** Use “finish setup,” “personalize,” or “prepare.” |
| tactical | Military/ops language that undermines calm premium onboarding. | **Reserve for advanced/debug.** |
| operator | Dehumanizes normal users. | **Remove from normal onboarding.** Use “you”; allow “operator” only in advanced governance contexts. |
| system access | Important but can sound invasive. | **Soften with specificity.** “Connect browser,” “allow files,” “ask before actions.” |
| provisioning | Accurate for local stack install but technical. | **Reserve for Pro/Creator/local details.** Basic: “prepare local models.” |
| runtime | Engineering term. | **Hide behind details/debug** except technical docs. |

### Copy principles by mode

- **Basic mode / normal users:** calm, clear, human, device-level AI. Use “Luca can live in your chat, voice, widget, and presence surfaces.” Avoid protocol/kernel/runtime language.
- **Pro mode:** more operational language allowed. Surface permissions, browser/tool governance, model routing, local/cloud route status, and provider warnings.
- **Creator/Origin mode:** deeper system, agent workforce, LucaLink, memory governance, local/cloud routing, and advanced workflow language allowed.
- **Debug mode:** technical diagnostics allowed. Use collapsible details and explicit debug entry points such as `?bootDebug=1`.

---

## 4. Visual and UX audit

- **Layout density:** Boot is focused; onboarding has many full-screen panels and can feel long because ceremonial, appearance, identity, face, model, provisioning, conversation, and calibration are all separate.
- **Contrast:** Existing light/cream/professional states risk washed-out glass and low contrast around cards, muted labels, and secondary buttons. Skin-era onboarding must prioritize text, controls, and warning contrast before beauty.
- **Button visibility:** Some onboarding controls sit in glass-heavy surfaces where primary/secondary hierarchy can weaken, especially in light contexts.
- **Glass intensity:** Theme selection exposes opacity/blur as first-run knobs. This can feel like visual tuning software instead of a premium OS setup.
- **Over-bright/washed-out states:** Pearl/Canvas-like contexts need graphite text, matte fallbacks, and stronger card borders; bright ambient gradients should not reduce readability.
- **Dark/light skin readiness:** Carbon needs professional restraint, not terminal/cyberpunk. Pearl/Canvas need enough contrast and not too much translucent white.
- **Premium vs prototype:** Boot is closest to premium. Post-boot and calibration language feel more prototype-like. Provisioning and model warnings are necessary but need calmer hierarchy.
- **Web Safe Mode overlap:** Safe Mode should remain compact and non-blocking during onboarding. It should not cover main CTAs or imply secure runtime is available.
- **Post-boot readiness:** Current post-boot loading/transition should become a product readiness bridge rather than a debug waiting room.
- **Onboarding clarity:** Current onboarding explains parts of LucaOS but does not strongly frame Luca as a being across device surfaces with memory boundaries, permission rules, and multiple intelligence routes.

---

## 5. Product positioning audit

Current onboarding partially communicates intelligence route, local/cloud choice, identity, face/presence, and text/voice conversation. It does not yet consistently communicate the full device-level OS promise.

| Promise | Current coverage | Gap |
| --- | --- | --- |
| Luca lives across your device | Weak/implicit. | Needs first screen concept and surface preview. |
| Luca can appear as MiniChat, Widget, VoiceHUD, Presence/Hologram | Partial voice/hologram presence, weak MiniChat/Widget framing. | Add presence/surface choice. |
| Luca can remember useful context | Present through memory/model setup, not framed as boundaries. | Add memory boundaries screen. |
| Luca can safely connect to tools/apps/browser/files | Scattered through runtime/provider/governance surfaces, not clear in onboarding. | Add permissions/tools screen with plain examples. |
| Luca can act with permission rules | Weak in normal onboarding. | Add permission style: every action / only when needed / custom. |
| Luca can use cloud/local models | Strong in model setup, but copy can be abstract. | Reframe as intelligence route. |
| Luca has Basic/Pro/Creator modes | Not a clear onboarding structure. | Add mode-aware progressive disclosure. |

---

## 6. Recommended new onboarding concept

The next product concept should be a short, premium first-run flow:

1. **Welcome to LucaOS**  
   “Luca lives across your device.”  
   Explain LucaOS in one calm sentence: Luca is your device-level AI environment for chat, voice, widgets, memory, tools, and safe actions.

2. **Choose your environment**  
   Pearl / Carbon / Flow / Canvas.  
   This replaces legacy theme/opacity/blur tuning with premium skin selection later. Keep reduced-motion/transparency respected.

3. **Choose Luca’s presence**  
   MiniChat, Voice, Hologram/Presence, Widget.  
   Show where Luca can appear without making the flow cyberpunk or animated-heavy.

4. **Choose permission style**  
   Ask for every action / Ask only when needed / Custom.  
   Explain that tools, apps, files, browser, and device capabilities remain permissioned.

5. **Choose memory boundaries**  
   What Luca may remember, forget, or ask before saving.  
   Make this a trust anchor, not a settings footnote.

6. **Connect tools**  
   Browser, files, calendar, mail, apps, and local device capabilities.  
   Default to “connect later” for Basic mode; show governance detail for Pro/Creator.

7. **Choose intelligence route**  
   Luca Prime, BYOK, local models, cloud models.  
   Keep local provisioning optional and mode-gated.

8. **Finish**  
   “Luca is ready to live on this device.”  
   Enter the main shell with a clear confirmation of active presence, memory, permissions, and route.

The flow should be premium, clear, short, device-level, not chatbot-like, not cyberpunk, not debug-heavy, and not abstract/protocol-heavy for normal users.

---

## 7. Post-boot redesign recommendation

The second boot/post-boot screen should become a calm readiness bridge:

```text
Preparing your LucaOS environment
Checking your local preferences
Restoring memory boundaries
Preparing safe tool access
Ready to continue
```

Rules:

- Normal readiness is calm and short.
- Debug diagnostics are hidden under details or `?bootDebug=1`.
- Degraded Web Safe Mode is compact and non-blocking.
- Failure/recovery states are semantic and clear.
- No heavy protocol language in normal readiness copy.
- Permission/model-route attention should be actionable without looking like a boot failure.
- New-user path should feel like “first run begins,” not “setup incomplete.”

---

## 8. Mode-aware onboarding

### Basic

- Simple setup.
- Few decisions.
- Plain language.
- Defaults for permission, memory, and intelligence route.
- “Connect later” is acceptable for tools.
- Local provisioning hidden unless explicitly chosen.

### Pro

- Permissions, model routing, tool access, browser governance, and provider status visible.
- BYOK and local model status are first-class.
- Warnings remain clear but not noisy.

### Creator/Origin

- Agent workforce, advanced workflows, local/cloud model routing, LucaLink, memory governance, and future workforce/mission surfaces visible.
- Deeper terminology allowed, but still should be calm and structured.

---

## 9. Skin-aware onboarding direction

Do not implement skinning yet. When onboarding skin application is resumed, skins should affect the environment around content, not override semantics.

- **Pearl:** calm default first-run; premium, bright, and readable.
- **Carbon:** focused professional dark setup; not terminal, neon, cyberpunk, or hacker-themed.
- **Flow:** static magical but content-first; no liquid timers, parallax, or ambient motion.
- **Canvas:** warm editorial setup; matte, readable, and not washed out.

Rules:

- Skins do not override semantic warning/error/status colors.
- Flow remains static.
- Reduced motion and reduced transparency are respected.
- Onboarding must remain readable before beauty.
- Skin boundary should apply only after the redesigned product structure is approved.

---

## 10. Web Safe Mode and degraded state rules

During onboarding, Web Safe Mode should appear as:

- Compact status indicator only.
- No large overlay.
- Full diagnostics hidden unless expanded or debug is enabled.
- User can continue previewing UI.
- Secure runtime features clearly disabled.
- No secret leakage.
- Onboarding should not visually imply secure setup is complete when safe mode is active.
- Disabled local/secure features should explain what is unavailable and how to continue safely.

---

## 11. Proposed implementation phases

1. Audit document.
2. Claude visual/product concept for onboarding and post-boot.
3. Codex onboarding boundary/resolver plan.
4. Pure onboarding skin boundary resolver.
5. Local onboarding boundary application.
6. Claude onboarding visual polish.
7. QA matrix update.
8. Copy cleanup by mode.
9. Web/mobile onboarding review.

---

## 12. Risk register

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Overcomplicating onboarding | Premium first-run becomes too long. | Progressive disclosure by Basic/Pro/Creator. |
| Overusing sci-fi/protocol language | LucaOS feels cyberpunk/Jarvis-like instead of calm OS-like. | Basic copy uses plain language; advanced terms move behind details. |
| Hiding important permissions | Simplicity can reduce trust. | Permission style and tool access get dedicated screens. |
| Making failure states look like normal boot | Users may miss degraded or unsafe states. | Preserve semantic warning/error/status colors. |
| Breaking setup persistence | Redesign may disrupt existing settings paths. | Implementation later must map new screens onto existing services carefully. |
| Mixing debug and normal user UI | Post-boot feels like diagnostics. | Details/debug gate. |
| Making onboarding too long | Users abandon first run. | Short default path, optional advanced sections. |
| Making Basic mode too technical | Normal users lose clarity. | Plain copy, defaults, connect later. |
| Making Pro/Creator too hidden | Advanced users cannot configure real capabilities. | Mode-aware detail sections. |
| Accessibility/contrast failures | Skins can reduce readability. | Matte fallbacks, contrast QA, status colors protected. |
| Mobile onboarding compression | Full desktop panels may not fit mobile. | Separate web/mobile review phase. |

---

## 13. Recommended next PR

Recommended next PR after this audit is merged:

```text
docs(ui): design premium LucaOS onboarding and post-boot experience
```

This should go to Claude Opus 4.8. Claude should not implement yet. Claude should produce a screen-by-screen visual/product concept for the post-boot readiness bridge and mode-aware onboarding. After that concept is approved, Codex can safely plan and implement the onboarding boundary/resolver work and copy cleanup in scoped PRs.

---

## 14. Design spec status

The premium onboarding/post-boot design spec now exists at `docs/luca-premium-onboarding-postboot-design.md`. It translates this audit into a screen-by-screen product/design concept (post-boot readiness bridge, 8-screen onboarding flow, mode-aware disclosure, presence/permission/memory/tools/route designs, copy drafts, skin-aware and mobile direction, and a 10-phase Codex implementation plan). Implementation remains paused until the staged Codex tasks begin. The next step is post-boot readiness bridge implementation planning (`docs(ui): plan post-boot readiness bridge implementation`).
