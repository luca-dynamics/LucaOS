# PR #161: Settings UI Architecture Audit + Experience Mode Map

This audit maps the current LucaOS Settings surface before any redesign work. It is intentionally **audit/map only**: it does not rename tabs, hide tabs, reorder tabs, add Tactical Mode, add Advanced Features behavior, or change settings persistence/runtime behavior.

Source map: `src/components/settings/settingsExperienceMap.ts`.

## Current Settings modal architecture

### Tab registry and availability

The current modal defines a static tab registry in `SettingsModal.tsx` and filters it by the active platform. Desktop sees every tab. Mobile hides desktop-only entries.

| Current order | Tab id | Current label | Icon | Desktop | Mobile | Component |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `general` | General | Settings | Yes | Yes | `SettingsGeneralTab` |
| 2 | `brain` | Brain | Cpu | Yes | Yes | `SettingsBrainTab` |
| 3 | `voice` | Voice | Microphone | Yes | Yes | `SettingsVoiceTab` |
| 4 | `vision` | Vision | Share | Yes | Yes | `SettingsVisionTab` |
| 5 | `model-manager` | Model Manager | Database | Yes | Yes | `SettingsModelManagerTab` |
| 6 | `personality` | Personality | User | Yes | Yes | `PersonalityDashboard` |
| 7 | `autonomy` | Autonomy | Ghost | Yes | Yes | `SettingsAutonomyTab` |
| 8 | `profile` | Profile | InfoCircle | Yes | Yes | `OperatorProfilePanel` |
| 9 | `lucalink` | Luca Link | Wifi | Yes | Yes | `SettingsLucaLinkTab` |
| 10 | `mcp-bridge` | MCP Bridge | Plug | Yes | No | `SettingsMCPBridgeTab` |
| 11 | `iot` | Smart Home | Home | Yes | Yes | `SettingsIoTTab` |
| 12 | `connectors` | Connectors | Link | Yes | No | `SettingsConnectorsTab` |
| 13 | `data` | Data & Memory | Database | Yes | Yes | `SettingsDataTab` |
| 14 | `knowledge-bridge` | Knowledge Base | Share | Yes | Yes | `KnowledgeBridgeTab` |
| 15 | `about` | About | InfoCircle | Yes | Yes | `SettingsAboutTab` |

### Desktop layout

- Modal shell: centered overlay with `max-w-[90%]`, `h-[90%]`, rounded desktop container, glass blur, tech border, and themed background/border.
- Navigation: persistent left sidebar, 16rem wide, with Settings header, icon + text labels, active styling, and vertical scrolling.
- Content header: desktop-only header showing the active tab label and close button.
- Content body: scrollable content area with desktop padding.
- Footer: persistent footer with status message, Cancel, and Save Changes buttons.

### Mobile layout

- Modal shell: full-screen, no rounding, no desktop drop shadow.
- Navigation: compact 4rem sidebar with vertically stacked icon + very small uppercase label. Tabs are still a side rail rather than a bottom nav or top segmented control.
- Content header: hidden on mobile; close action moves to the sidebar footer.
- Content body: scrollable content area with mobile padding and extra bottom padding.
- Footer: persistent footer with Cancel and Save buttons. The label shortens from `Save Changes` to `Save`.
- Mobile omissions: `mcp-bridge` and `connectors` are not available on mobile today.

### Save, cancel, and live preview behavior

- Settings state is loaded from `settingsService.getSettings()` when the modal mounts.
- Save persists the aggregate settings object through `settingsService.saveSettings(settings)`, persists persona config when loaded, applies system settings via `window.luca.applySystemSettings(settings.general)` when available, and shows a success/error status message.
- Cancel closes the modal without invoking the save handler.
- Theme, background opacity, and blur changes are previewed live by writing CSS custom properties to `document.documentElement`. This is product-positive, but future IA should distinguish live-preview settings from settings that only apply on Save.

## Experience-mode classification summary

| Tab | Current fit | Future placement candidate | Sensitive implications | Language fit |
| --- | --- | --- | --- | --- |
| General | Standard-user with embedded advanced controls | Top-level for everyone | Privacy, permissions, sensors, browser import, debug/tactical toggles | Technical |
| Brain | Standard-visible, tactical depth | Top-level for everyone | API keys, model routing, proxy endpoints, history indexing | Technical |
| Voice | Standard-user core surface | Top-level for everyone | Mic capture, wake word, voice cloning, speech routing | Technical |
| Vision | Standard-user core surface | Top-level for everyone | Camera/image analysis, vision model routing | Appropriate |
| Model Manager | Tactical/developer | Advanced Features | Runtime diagnostics, model downloads/storage | Technical |
| Personality | Standard-visible with creator-grade subcontrols | Top-level for everyone | System rules, persona logic, identity behavior | Technical |
| Autonomy | Tactical/advanced | Tactical Mode | Background missions, shadow execution, tool usage, killswitch | Technical |
| Profile | Standard-user | Top-level for everyone | Operator identity, behavior insights, identity lock | Appropriate |
| Luca Link | Standard-user with advanced networking | Top-level for everyone | Remote access, guest links, pairing tokens, relay/VPN | Appropriate |
| MCP Bridge | Tactical/power-user | Advanced Features / Tactical Mode | Tool import/export, custom commands, filesystem/dev/messaging/database tools | Technical |
| Smart Home | Standard-visible, device-sensitive | Advanced Features | Home Assistant token, device control, local network endpoint | Appropriate |
| Connectors | Tactical automation | Advanced Features | Account access, browser automation, session persistence, messaging/content surfaces | Technical |
| Data & Memory | Standard-user trust surface | Top-level for everyone | Memory export/delete, session reset, personal fact display | User-friendly |
| Knowledge Base | Standard-user with advanced sync | Top-level for everyone | File imports, SaaS sync, developer/workspace ingestion | Appropriate |
| About | Display/status | Top-level or footer/info area | None material; display-only | Appropriate |

## Answers to audit questions

### 1. Which settings should remain top-level for everyone?

Recommended top-level surfaces for everyone:

- General
- Brain
- Voice
- Vision
- Personality
- Profile
- Luca Link
- Data & Memory
- Knowledge Base
- About, or an equivalent footer/info destination

Rationale: these are foundational to LucaOS as an embodied personal AI OS: identity, brain, voice, vision, memory, knowledge, remote access, and user trust should be visible without forcing users into an admin mode.

### 2. Which settings should be grouped under Advanced Features?

Recommended Advanced Features candidates:

- Model Manager
- MCP Bridge
- Smart Home
- Connectors
- Autonomy, especially on mobile
- Tactical portions of Brain, Voice, General, Personality, Luca Link, and Knowledge Base

Advanced Features should be an organizing layer, not a lockout. Normal users should still be able to access full settings, but high-risk or high-complexity controls should be progressively disclosed. On desktop, all current Settings tabs should remain visible for discoverability; future desktop IA may group them visually without removing them. On mobile, Advanced Settings should provide access to tactical/dev/tool settings after the clean standard settings surface.

### 3. Which settings should only appear after enabling Tactical Mode?

Recommended Tactical Mode candidates:

- Autonomy as a full tab, especially Background Missions, Shadow Execution, Double-Brain Consensus, Resource Awareness, and Mission Killswitch.
- MCP Bridge as a tactical/power-user tool and plugin connection surface, not an Origin-only surface.
- Model Manager if the future product keeps runtime diagnostics/model installation out of the standard view.
- Brain sub-sections for custom base URLs, Ollama service management, load balancer telemetry, maintenance sync intervals, and advanced BYOK routing.
- Voice sub-sections for latency racing telemetry, local/offline provider routing, and voice cloning studio.
- Connectors if browser automation/session persistence remains the primary integration model.

### 4. Which settings should only appear for Origin/creator mode?

Current Settings does **not** yet have a true Creator Dashboard tab. MCP Bridge should not be treated as the main or only Origin/creator candidate; normal MCP/tool/plugin connection belongs in Tactical Mode and Advanced Settings.

Future Origin/creator mode should be reserved for privileged creator dashboard controls such as:

- Raw system controls and creator/admin system rules.
- Luca self-update workflows.
- Create PR / build version / release creation flows.
- GitHub push/update workflows.
- Repo, build, and release controls.
- System evolution dashboards and governance override surfaces.
- Privileged creator operations that let Luca update, build, or evolve its own system.

Raw Personality system blueprint/global system rules editing may become Origin-grade if it remains a raw creator/admin control instead of being rewritten as safe user-facing personality configuration.

### 5. Which labels are already professional and should stay?

Labels that are clear or product-appropriate today:

- General
- Brain
- Voice
- Vision
- Personality
- Profile
- Luca Link
- Smart Home
- Data & Memory
- Knowledge Base
- About

Some may still need subcopy improvements, but the primary tab labels are mostly strong.

### 6. Which labels are too technical or unclear?

Labels or copy that need product-language review:

- MCP Bridge: accurate for developers, opaque for normal users.
- Model Manager: understandable, but more tactical/admin than premium consumer-facing.
- Autonomy copy such as `Shadow Execution` needs stronger framing and safety context.
- General copy such as `DEBUG MATRIX`, `TACTICAL MODE`, and `GLOBAL FORGE` reads like an internal/admin dashboard.
- Brain copy such as `Cloud API (BYOK)`, base URL, Ollama, load balancer, and maintenance controls is useful but technical.
- Voice copy such as `Acoustic Racing`, `Hyper-Inference`, and telemetry terms is cinematic but not immediately user-friendly.
- Personality copy such as `CORE SYSTEM RULES`, `System Blueprint`, and `System Logic` is creator-grade.

### 7. Is the current mobile settings layout good enough?

Current mobile is functional but not yet premium enough for a settings-heavy product surface. Mobile should show clean standard settings first, then expose tactical/dev/tool settings under Advanced Settings rather than making normal mobile users feel like they opened an admin dashboard.

Strengths:

- Full-screen modal is appropriate.
- Sidebar keeps tab switching always available.
- Save/Cancel remain persistent.

Risks:

- Fifteen-tab information architecture compresses poorly into a 4rem side rail.
- Very small uppercase labels may be hard to scan.
- Desktop-only omissions (`mcp-bridge`, `connectors`) are not explained in the UI.
- Dense tactical tabs such as Brain, Voice, Model Manager, Autonomy, Luca Link, and Knowledge Base likely need mobile-specific grouping or progressive disclosure.
- Future mobile Advanced Settings should remain user-accessible and can include MCP Bridge, Model Manager, Smart Home, Connectors, Autonomy, and advanced subsections of Brain, Voice, Luca Link, and Knowledge Base.

### 8. Does the current desktop settings layout feel premium enough?

Desktop has a strong LucaOS visual identity, but IA density makes it feel closer to an operator console than a premium settings product. Because desktop has enough space and power users expect discoverability, all current Settings tabs should remain visible to all users for now; future desktop IA may group tabs visually, but should not remove discoverability.

Strengths:

- Persistent sidebar is appropriate for a large settings surface.
- Themed glass/tech styling is coherent with LucaOS.
- Desktop header and scrollable content area are straightforward.

Risks:

- Many top-level tabs mix standard, tactical, and advanced depth; desktop should keep them discoverable while improving visual grouping and framing.
- Multiple tabs combine consumer settings, diagnostics, credentials, runtime controls, and experimental controls in one level.
- Language alternates between premium product language and raw internal/control-room language.

### 9. What should the future Settings IA look like?

Recommended future IA direction, without implementing it in this PR:

1. **Standard Settings**
   - General
   - Brain
   - Voice
   - Vision
   - Personality
   - Profile
   - Data & Memory
   - Knowledge Base
   - Luca Link
   - About

2. **Advanced Features**
   - Model Manager
   - MCP Bridge
   - Smart Home
   - Connectors
   - Autonomy on mobile or in simplified settings contexts
   - Advanced Brain controls
   - Advanced Voice controls
   - Advanced Knowledge import/sync controls
   - Advanced Luca Link networking controls

3. **Tactical Mode**
   - MCP Bridge
   - Autonomy
   - Runtime diagnostics
   - Local/cloud routing internals
   - Browser automation/session persistence controls
   - Developer-grade telemetry

4. **Future Origin/creator Dashboard**
   - Raw system controls and creator/admin system rules
   - Luca self-update controls
   - Create PR / build version / release workflows
   - GitHub push/update workflow
   - Repo, build, and release controls
   - System evolution dashboards
   - Privileged creator operations that let Luca update, build, or evolve its own system

## Recommended follow-up PRs

1. **PR #162 — Settings IA Shell + Advanced Features Grouping**
   - Introduce grouping/presentation only.
   - Do not change persistence or capabilities.

2. **PR #163 — Settings Product Language Pass**
   - Replace unclear tactical/admin copy with professional user-facing language.
   - Keep exact behavior unchanged.

3. **PR #164 — Mobile Settings Navigation Review**
   - Evaluate side rail vs. segmented sections vs. searchable settings.
   - Address desktop-only tab messaging.

4. **PR #165 — Experience Mode UI Proposal**
   - Add a non-functional/prototype map or design doc for Standard, Tactical, and future Origin/creator dashboard modes before implementation.

5. **PR #166 — Sensitive Settings Safety Framing**
   - Improve explanations around microphone, camera, screen observation, browser automation, remote access, smart-home tokens, memory deletion, and tool connectors.
