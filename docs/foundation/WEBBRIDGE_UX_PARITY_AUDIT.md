# WebBridge UX Parity Source Audit

WebBridge is a runtime adapter. Its visible onboarding, workspace, Settings,
and LucaLink composition must be extracted from the existing LucaOS product
sources below rather than authored as a parallel browser product.

## Classification

- **A — browser-safe and reusable directly:** pure UI models, tokens, styles,
  and render-free state helpers with no native/server dependency chain.
- **B — visual/state source to extract from:** canonical LucaOS UI whose file
  also imports runtime-heavy services. Browser-safe JSX, state models, and
  visual composition may be extracted; Web must not import the source directly.
- **C — desktop/native runtime only:** orchestration or capability code that
  Web must not import.

## Original onboarding

| Source path | Class | Canonical responsibility / extraction decision |
| --- | --- | --- |
| `src/components/Onboarding/OnboardingFlow.tsx` | B/C | Canonical boot progression, responsive stage sizing, background treatment, footer, and step order. Runtime orchestration for local provisioning, voice, model scan, settings persistence, and Electron checks remains desktop-only. |
| `src/services/onboarding/OnboardingController.ts` | A | Pure canonical onboarding transition model and step names. Reused by the extracted browser-safe flow model. |
| `src/components/Onboarding/OnboardingAccessPanels.tsx` | B | Canonical identity handshake and Luca core route cards. Visual/state composition is extracted; service callbacks remain adapters. |
| `src/components/Onboarding/ModeSelect.tsx` | B | Canonical Chat / Voice selection structure and copy. |
| `src/components/Onboarding/ModeCard.tsx` | B | Canonical onboarding choice-card spacing, glass surface, title, description, and Choose action. Its visual frame is extracted and the original component consumes the extraction. |
| `src/components/Onboarding/ThemeSelectionStep.tsx` | B/C | Canonical interface calibration layout, theme cards, opacity and blur controls. Settings persistence and Electron-only controls remain outside Web. |
| `src/config/lucaThemeLabels.ts` | A | Canonical Luca Silver, Graphite, Frost, and Cream labels/descriptions. Reused directly. |
| `src/config/themeColors.ts` | A | Canonical theme palette and contrast calculation. Reused directly. |
| `src/components/Onboarding/ConversationalOnboarding.tsx` | C | Personality/preferences conversation depends on model, voice, settings, and profile services; not imported by Web. Browser-safe profile prompts use the extracted onboarding stage UI until a safe conversation adapter exists. |
| `src/components/Onboarding/OnboardingSystemPanels.tsx` | B/C | Canonical calibration/completion visuals; local hardware/Ollama actions remain desktop-only. |
| `src/services/onboarding/LocalProvisioningService.ts` | C | Local model scan/download/provisioning; never imported by Web. |

## Original main app shell

| Source path | Class | Canonical responsibility / extraction decision |
| --- | --- | --- |
| `src/App.tsx` | B/C | Canonical Header → left Apps panel/rail → central ChatPanel → right Activity panel/rail → mobile navigation composition. Runtime hooks, services, native overlays, and desktop controllers remain outside Web. |
| `src/components/layout/Header.tsx` | B/C | Canonical Luca identity/wordmark and Settings placement. The brand/header frame is extracted; credits, awareness, voice, and runtime services remain desktop-only. |
| `src/components/layout/ChatPanel.tsx` | B/C | Canonical central conversation workspace and chat/voice entry placement. Browser-safe empty conversation/input composition is extracted; model/runtime handlers remain adapters. |
| `src/components/layout/OperationsSidebar.tsx` | C | Desktop operations and capability actions are runtime-heavy; Web renders guarded navigation labels in the extracted shell regions instead. |
| `src/components/right-panel/RightPanel.tsx` | B/C | Canonical Activity-side panel direction; runtime-backed data remains unavailable in Web. |
| `src/components/layout/desktopShellModel.ts` | A | Pure collapse/rail labels, widths, and browser-safe persistence helpers. Reused directly. |
| `src/styles/lucaShellStyles.ts` | A | Canonical desktop shell surfaces, rails, workspaces, controls, dividers, and text tokens. Reused directly. |
| `src/styles/lucaMobileShellStyles.ts` | A | Canonical mobile content, card, sheet, and bottom-navigation styles. Reused directly. |

## Original Settings

| Source path | Class | Canonical responsibility / extraction decision |
| --- | --- | --- |
| `src/components/SettingsModal.tsx` | B/C | Canonical modal/sidebar/content architecture, desktop/mobile sizing, close/save placement, and tab routing. State persistence, memory, persona services, and Electron bridge remain desktop-only. |
| `src/components/settings/settingsNavigationModel.ts` | A | Canonical grouped Settings navigation model and mobile advanced-settings behavior. Reused as the basis for browser-safe navigation. |
| `src/components/settings/settingsExperienceMap.ts` | A | Canonical Settings labels, icons, availability, and feature classification. |
| `src/components/settings/SettingsLayout.tsx` | B | Canonical Settings section/card/status/row/disclosure visual primitives. Browser-safe equivalents are extracted without the runtime-coupled `Icon` import. |
| `src/components/settings/settingsLayoutStyles.ts` | A | Canonical Settings tokens and card/control styles. Reused directly. |
| `src/components/settings/SettingsGeneralTab.tsx` | C | Settings service, permissions, and desktop behavior; not imported by Web. |
| `src/components/settings/SettingsBrainTab.tsx` | C | Provider keys, Ollama, model manager, and runtime services; not imported by Web. |
| `src/components/settings/SettingsDataTab.tsx` | C | Desktop memory/data services; Web supplies browser-storage status through the extracted Settings layout. |

## Original LucaLink / Device Center

| Source path | Class | Canonical responsibility / extraction decision |
| --- | --- | --- |
| `src/components/settings/SettingsLucaLinkTab.tsx` | B/C | Canonical Settings-hosted Device Center sections, status cards, linked-host language, and approval-first disclosure. Runtime transport, QR, host controller, and service imports remain desktop-only. |
| `src/components/LucaLinkModal.tsx` | C | Desktop pairing/remote-control runtime surface; not imported by Web. |
| `src/services/lucaLink/lucaLinkLinkedHostRegistry.ts` | A | Pure linked-host labels/disclosure models where needed; no host controller is initialized. |
| `src/services/lucaLinkService.ts` | C | Desktop LucaLink host/runtime controller; never imported by Web. |

## Web extraction boundary

The browser graph may import only class A sources directly. Class B sources are
the canonical visual/state source for extracted modules, and the corresponding
original component imports the extraction where practical (for example the
onboarding mode card), making the lineage executable rather than documentary.
Class C sources remain behind `reactAppEntry`.

Host & Capabilities is inserted into the extracted Settings navigation as a
System section. It is not a boot surface. No landing, deployment, domain, or
Vercel configuration participates in this architecture.
