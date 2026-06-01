# PR #166 — Settings Section Architecture Audit + AI App Benchmark Map

## Scope and hard boundary

This document audits the internal sections, cards, and control groups inside LucaOS Settings. It is an information-architecture and benchmark map only.

This PR does **not** redesign Settings, move controls, rename controls, hide controls, reorder controls, change settings persistence, change schemas, change defaults, change runtime behavior, change governance behavior, or enable sensitive capabilities.

The companion typed audit map is `src/components/settings/settingsSectionArchitectureMap.ts`. It records tab ids, section ids, current purposes, controls/state touched, classification labels, placement assessments, benchmark notes, integration assessments, and recommended future actions.

## Benchmark lens

Major AI apps usually keep normal Settings simple and organized around account/profile, appearance, personalization, voice, memory, data controls, connectors/apps, privacy/security, about/version, and sometimes labs or beta features. Developer-agent tools expose deeper model routing, provider credentials, runtime diagnostics, tool permissions, repositories, terminal/runtime access, MCP-style tools, and approvals.

LucaOS needs both layers because it is an embodied personal AI OS rather than only a chat app. The audit therefore treats voice, vision, local/cloud/BYOK brain routing, memory, knowledge import, autonomy, tools, devices, and privacy/governance as first-class surfaces while recommending progressive disclosure for tactical, advanced, and future Origin-only controls.

## Executive findings

1. **Correctly placed sections:** Appearance, tone, voice identity, vision model selection, data export/delete, memory explorer, connected accounts, Luca Link pairing, About/status, and core model selection are broadly in the right conceptual tabs.
2. **Misplaced or over-broad sections:** Browser Sessions in General belongs closer to Connectors or Privacy/Data later. Memory Gateway and Knowledge Maintenance in Brain overlap with Data & Memory and Knowledge Base. Raw relay/VPN settings in Luca Link and Home Assistant token entry should eventually sit under Devices/Connections advanced details.
3. **Duplicated concepts:** Knowledge sync appears in Brain and Knowledge Base. Google/Notion/Obsidian connector state appears in Knowledge Base while account-style connections also live in Connectors. Voice provider/model controls overlap with Brain routing when voice presets update the active brain model.
4. **Too advanced for visible standard settings:** BYOK provider base URLs, raw temperature, Ollama/runtime controls, voice telemetry, voice cloning, raw personality/system instructions, outbound MCP capability sharing, MCP environment variables, Home Assistant tokens, relay/VPN endpoints, and quota diagnostics should later move behind Advanced/Tactical disclosure.
5. **Crowded tabs:** General, Brain, Voice, MCP Bridge, Knowledge Base, and Profile currently carry many distinct jobs. Brain is the densest technical tab; Voice mixes user-facing voice preferences with diagnostics and cloning; General mixes appearance, startup, browser import, experimental flags, and permissions.
6. **Underdeveloped tabs:** Vision has the right concept but needs clearer camera/screen awareness sections and permission/status integration. Autonomy has important controls but needs approvals, stop controls, mission state, and safety/governance framing in future work. Smart Home is thin and needs device safety language.
7. **Runtime/governance gaps:** Sensitive surfaces exist without a unified permission/scope language: MCP servers, connectors, browser sessions, Luca Link, Home Assistant, voice cloning, autonomy, camera/screen/microphone, and SaaS sync should eventually share governance and revocation patterns.
8. **Privacy/safety framing gaps:** Sensor access, browser profile import, social/workspace connectors, SaaS sync, remote access, smart-home tokens, voice cloning, autonomy, and tool server import/export need stronger user-facing risk and scope explanations.
9. **Standard-user visible:** General appearance/tone, Privacy & Awareness, core Brain model selection, Voice identity/pacing, Vision, Profile, Luca Link pairing, Connectors, Data & Memory, Knowledge Base imports, and About.
10. **Tactical/advanced:** BYOK/base URLs, local model service, model diagnostics, raw temperature, voice telemetry/cloning, MCP Bridge, connector automation persistence, Home Assistant token config, relay/VPN settings, autonomy execution controls, and raw persona instructions.
11. **Future Origin/Creator Dashboard candidates:** Raw global personality evolution, archetype blueprint/protocol editing, outbound Luca capability sharing, self-update/build/release/GitHub workflows, privileged creator operations, and raw system evolution controls. None are implemented by this PR.

## Section-level audit by tab

### General

- **Persona & Appearance** controls persona, theme, and theme sync. This belongs in General today and aligns with appearance/personalization patterns, but persona capability routing should eventually be separated from simple appearance.
- **Tone Styles** controls response style and custom tone dimensions. It is benchmark-aligned personalization and should stay standard-user visible.
- **Browser Sessions** imports or clears Chrome profile/session context. It is privacy-sensitive and connector-sensitive; later it should move to Connectors or Privacy/Data rather than staying in General.
- **Global UI Preferences** mixes startup behavior, tray minimize, diagnostics, experimental features, background visibility, and global forge visibility. Startup and display belong in General; diagnostics, experimental mode, and forge visibility should later move under Advanced.
- **Typography & Global Scaling** is a well-placed display/accessibility section.
- **Privacy & Awareness** toggles screen, camera, microphone, product improvement, and system permission checks. This is essential for an embodied AI OS and should remain visible, but future design should strengthen sensor scope and governance language.

### Brain

- **Cloud API Config** manages BYOK provider keys and base URLs. This is a LucaOS differentiator and developer-agent pattern, but it is too tactical for a default visible standard section.
- **Strategic Presets** set cloud/local/offline routing across brain, vision, and memory models. This belongs in Brain because LucaOS has local/cloud/BYOK route control, but it needs clearer cost/privacy/latency framing.
- **Intelligence Card** selects the primary reasoning model and custom/external model. This is correctly placed.
- **Memory Gateway** selects memory extraction/routing model. It is model- and memory-sensitive and overlaps with Data & Memory; later it should be Advanced Brain or internal memory infrastructure.
- **Knowledge Maintenance** configures background sync and intervals. It duplicates Knowledge Base/Data & Memory responsibilities and should later be consolidated.
- **Quota Intelligence** is useful diagnostics but tactical; it belongs in runtime health or Advanced Brain.
- **Local Ollama Service** is a local-runtime differentiator, but should likely merge with Model Manager or Advanced Brain.
- **Creativity / Heat Pool** exposes raw temperature. It should later become user-facing creativity language or move into Advanced.

### Voice

- **Strategic Presets** configure STT/TTS/provider/local-cloud choices. They are useful but should explain latency and privacy tradeoffs.
- **Acoustic Detection** includes wake-word/microphone behavior. It is correctly in Voice and needs strong always-listening language.
- **Listening Model** selects STT. It is appropriate for LucaOS but more technical than most consumer AI apps.
- **Vocal Synthesis Engine** selects TTS provider and voice identity. Voice identity should remain standard-user visible; provider internals can later be advanced.
- **Rhythm Calibration** adjusts pacing/rate and is well placed.
- **Voice Intelligence Telemetry** shows STT/reasoning/TTS latency. This is tactical diagnostics and should later move under Advanced Voice or runtime health.
- **Voice Cloning Studio** is highly sensitive and should later be explicitly gated with consent, provenance, and deletion controls.

### Vision

- **Vision Engine** selects the vision model and belongs in Vision.
- **Vision Tips** explains visual awareness. Vision is underdeveloped relative to LucaOS embodiment: future work should add camera/screen permission status, active/inactive state, and privacy framing without changing behavior in this PR.

### Model Manager

- **Response Dynamic Controls** is an advanced framing header.
- **Runtime Status** displays diagnostics and should be linked to Brain route health later.
- **Model Manager** manages local model inventory/download/runtime controls. It is a tactical/local AI differentiator and should remain advanced.
- **Local Storage Note** explains GGUF/ONNX local storage. It belongs near local model management but should eventually pair with real storage controls/status.

### Personality

- **Unified Consciousness** edits global personality instructions. This is too raw for normal Settings and is an Origin/Creator Dashboard candidate.
- **Specialist Focus** tunes persona behavior lenses. User-facing persona style belongs in Settings, but raw prompt editing should be progressively disclosed.
- **Archetype Blueprint** exposes technical persona protocol details and is another future Origin/advanced candidate.

### Autonomy

- **Mission Control** controls background missions, shadow execution, and idle threshold. It is central to LucaOS but requires safety, approval, and stop-control framing.
- **Security Hardness** controls double-brain consensus and resource awareness. It is correctly in Autonomy and should later integrate with governance status.

### Profile

- **Identity Card** displays operator profile information and is correctly placed.
- **Partnership Status** shows bond stage, vibe, growth, and metrics. It is a LucaOS differentiator but needs future transparency about computation/storage.
- **Assistant Directives** displays behavioral directives and identity lock enrollment. It should remain Profile-adjacent but needs privacy/security framing.

### Luca Link

- **Mobile Client Connection** configures mobile-to-desktop connection modes and connection actions. It is a device/connection surface and belongs here for now.
- **Desktop Server Pairing** enables remote access and shows QR/token pairing. It should stay visible with stronger revocation and session management later.
- **Guest Access & Relay** exposes relay/VPN endpoints. This is advanced and should later be nested under Advanced connection settings.

### MCP Bridge

- **Traffic Control Switcher** separates inbound tool server connection from outbound Luca capability sharing. It is useful but should remain Advanced/Tactical.
- **Connect Tool Servers** covers active servers, marketplace servers, custom commands, URLs, environment variables, and auto-connect. This is connector-, runtime-, privacy-, and permission-sensitive and needs future scope governance.
- **Share Luca Capabilities** displays outbound MCP config, SSE URL, local bridge command, and access scope. This is closer to creator/operator infrastructure and may belong in future Origin depending on capability scope.

### Smart Home

- **Home Assistant Connection** stores Home Assistant URL and long-lived token. Smart Home is a LucaOS embodied/device differentiator, but raw token configuration needs device-control safety framing and likely belongs under Devices/Connections Advanced later.

### Connectors

- **Connected Accounts** connects messaging, workspace, and social accounts and configures session persistence. The concept is benchmark-aligned, but browser automation/session persistence needs stronger scopes, revocation, and data-use framing.

### Data & Memory

- **Overview, Export, and Wipe** shows total facts and allows JSON export/wipe. This is correctly placed and aligned with major AI app data controls.
- **Memory Explorer** supports search, filter, inspection, and per-memory deletion. This is stronger than many benchmark apps because it gives transparent user memory control.
- **Session Cleanup** resets active session state and belongs in Data & Memory.

### Knowledge Base

- **Local Knowledge Import** imports chat exports, IDE/dev data, JSON/CSV, and platform files. It is core to LucaOS memory and should stay visible, but developer-context imports should be progressively disclosed.
- **SaaS Sync** connects Notion, Google Drive, Obsidian, and future sources. It overlaps with Connectors; future work should harmonize account connection state, sync scope, and revocation.

### About

- **System Identity & Status** displays version, uptime, active model, architecture, voice provider, memory/cortex status, and vision status. It is well placed and display-only.
- **Permissions & Updates Links** are acceptable lightweight links. Privileged update workflows should not be added to normal Settings.
- **LucaOS Labs Branding** is standard About footer information.

## Recommended future Settings roadmap

1. **Privacy & Safety foundation:** Create a unified privacy/safety framing model for sensors, connectors, Luca Link, smart home, voice cloning, autonomy, and MCP scopes.
2. **General cleanup:** Keep appearance, typography, startup, and simple behavior in General; move browser sessions, diagnostics, experimental flags, and forge/runtime toggles into better homes.
3. **Brain and Model Manager split:** Keep model selection and routing health in Brain; move provider credentials, local runtime service, raw temperature, quota diagnostics, and local model downloads into Advanced Brain/Model Manager.
4. **Voice progressive disclosure:** Keep voice identity, wake word, STT/TTS mode, and pacing visible; move telemetry and cloning into Advanced Voice with consent/safety language.
5. **Vision maturation:** Add clearer camera/screen awareness, permission state, and privacy copy in a future behavior-preserving UI PR.
6. **Data/Knowledge/Connectors boundary:** Keep Data & Memory for facts, export/delete, session cleanup, and memory inspection. Keep Knowledge Base for ingestion/sync. Keep Connectors for account authorization and revocation. Remove duplicated connector state presentation later.
7. **Devices/Connections grouping:** Consider grouping Luca Link and Smart Home under a future Devices/Connections area while preserving top-level discoverability if device use becomes core.
8. **Advanced Tools/Integrations:** Keep MCP Bridge and deep connector automation under Advanced Tools/Integrations with explicit scopes.
9. **Autonomy governance:** Add approval policy, stop controls, mission state, and governance links before any autonomy expansion.
10. **Future Origin/Creator Dashboard:** Keep raw system evolution, self-update, PR/build/release, GitHub push/update workflows, privileged creator operations, outbound capability infrastructure, and raw persona evolution outside normal Settings.

## Non-goals explicitly preserved

- No Settings behavior changes.
- No movement, rename, hide, reorder, schema, default, persistence, runtime, governance, connector, model, memory, voice, vision, device, autonomy, privacy, MCP, browser automation, file access, messaging, wireless/device-control, self-update, PR/build/release, GitHub, Tactical Mode, or Origin Dashboard implementation changes.
