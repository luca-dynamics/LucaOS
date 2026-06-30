# LucaOS Desktop Interface Polish Direction

**Type:** Senior product / design direction specification (documentation-only)  
**Status:** Design direction. No runtime, source, style, or asset changes are made by this document.  
**Date:** 2026-06-30  
**Audience:** Founder / product owner, design implementers, and coding agents preparing staged UI PRs.  
**Scope:** Full desktop interface polish for LucaOS: shell layout, panels, chat/workspace, component language, skins, copy, and implementation phases.

Read together with:

- `docs/luca-skin-system.md`
- `docs/luca-skin-application-boundaries.md`
- `docs/luca-composer-affordance-inventory.md`
- `docs/luca-composer-product-decisions.md`

> Shared direction: **LucaOS should feel like a quiet operating system for intelligence, not a dashboard for controlling intelligence.**

---

## 1. Product Interface Verdict

### What is wrong with the current three-panel direction

The three-panel architecture is directionally right, but the current expression risks feeling like a generic AI control dashboard instead of a mature AI operating system. The issue is not the existence of left, center, and right regions; it is the lack of hierarchy, restraint, and component discipline inside those regions.

Primary problems to correct:

- **Everything competes for attention.** Tools, cards, buttons, status blocks, memory, permissions, and chat affordances appear too equal. LucaOS needs a stronger foreground/background relationship.
- **Panels feel like containers of widgets, not operating surfaces.** The side panels should feel like system rails and inspectors, not dashboards filled with unrelated cards.
- **Cards are overused.** When every item becomes a rounded card, nothing feels important. Premium software uses cards sparingly and relies more on spatial grouping, typographic hierarchy, and quiet dividers.
- **Buttons look too generic.** Repeated pill buttons and decorative actions make the product feel assembled from AI-app defaults instead of designed as an OS-level shell.
- **The center is not yet sovereign.** The chat/workspace should be the primary work surface. Side panels should support it, not visually compete with it.
- **The skin is ahead of the components.** Carbon/liquid/glass material can become premium, but only if applied to disciplined surfaces. If applied over noisy components, it amplifies noise.
- **Copy sometimes performs a character instead of serving the user.** Terms like mission, handshake, standby, and memory boundaries can make LucaOS feel theatrical or sci-fi rather than professional.

### What LucaOS should visually and structurally become

LucaOS should become a **host-native intelligence workspace**: calm, spatial, operational, and premium. It should feel like the user is working inside a capable local AI environment with visible control over context, tools, permissions, runtime, and memory.

The target experience:

- **Center-first.** The main workspace owns the screen; side panels act as rails and inspectors.
- **System-like, not page-like.** The shell should feel persistent, stable, and spatial, closer to an operating environment than a web dashboard.
- **Quietly technical.** Runtime, model, tools, and permissions can be visible, but with restrained status language and precise indicators.
- **Materially premium.** Skins should create environmental depth, while text/content surfaces remain highly legible.
- **Operationally trustworthy.** Users should always understand what Luca can see, remember, call, run, or change.
- **Distinct but familiar.** LucaOS can learn from the polish of premium products without inheriting their layout identity: not ChatGPT's single chat page, not Claude's document/chat pattern, not Cursor's IDE, not Notion's document database, and not Linear's issue workspace.

### What LucaOS should avoid becoming

LucaOS should avoid these traps:

- **A generic AI dashboard** with dozens of equal widgets and vague assistant metrics.
- **A coding IDE clone** with file-tree dominance, terminal aesthetics, and developer-only density.
- **A sci-fi cockpit** with neon, animated scanners, mission language, fake telemetry, and overdesigned status chrome.
- **A productivity SaaS clone** with generic cards, badges, tabs, and workspace lists that could belong to any B2B app.
- **A chatbot wrapper** where tools, memory, and permissions are hidden behind a single message stream.
- **A theme demo** where skin effects wash over everything and degrade clarity.

---

## 2. Three-Panel Experience Model

### Left panel: system entry and capability rail

**Role:** The left panel is LucaOS's capability rail. It should answer: *What can Luca do from this host right now?* It is not a dashboard and not a file tree.

**Belongs here:**

- Primary navigation between major OS surfaces: Chat, Workspace, Memory, Tools, Devices, Settings.
- Pinned tools and user-approved quick actions.
- Active local capabilities: voice, vision, screen context, browser bridge, file access, device/runtime connections.
- Compact skill/app launchers with clear availability states.
- Link bridge and device/runtime entry points only when configured or recently used.

**Remove or reduce:**

- Large promotional cards.
- Repeated explanatory text for actions the user already understands.
- Decorative tool categories that do not change current user behavior.
- Multiple competing icon button clusters.
- Any coding-specific surface unless the user has explicitly entered a coding/workspace mode.

**Hide until needed:**

- Rarely used system services.
- Advanced runtime details.
- Full skill descriptions.
- Setup prompts after setup is complete.
- Device diagnostics unless a device is offline, blocked, or needs attention.

**Emphasize:**

- The user's selected surface.
- Recently used or pinned capabilities.
- Live capture states: microphone, screen, camera, browser, file scope.
- Safety/permission state when a capability is active or blocked.

### Center workspace/chat: primary operating surface

**Role:** The center is the main work surface where conversation, actions, documents, tool results, and workspace objects converge. It should answer: *What are we doing now, and what is the next controlled action?*

**Belongs here:**

- Main chat thread and operational transcript.
- Composer and primary input modes.
- Active workspace artifacts, canvases, previews, documents, or task surfaces.
- Tool call summaries when relevant to the current thread.
- Inline permission requests that block or materially change the current action.
- Long-thread navigation anchors when the conversation becomes complex.

**Remove or reduce:**

- Decorative hero panels once the user is active.
- Repetitive welcome cards.
- Unrelated status widgets that belong in the inspector.
- Dense tool catalogs.

**Hide until needed:**

- Full raw tool logs.
- Historical memory detail.
- Non-blocking runtime diagnostics.
- Secondary model routing explanations.

**Emphasize:**

- The current user intent.
- Luca's reasoning status at a high level, not chain-of-thought.
- Tool actions that affect the host, external services, files, browser, memory, or permissions.
- Clear stop, approve, revise, and continue controls.

### Right panel: inspector, timeline, and control surface

**Role:** The right panel is an inspector and control surface. It should answer: *What context is active, what has changed, what needs review, and what can Luca currently access?*

**Belongs here:**

- Current context overview: selected workspace, active thread, linked files/apps/devices.
- Timeline of important actions, not every token or minor status change.
- Memory items relevant to the current session.
- Permission review queue and pending approvals.
- Runtime/model status summaries.
- Controlled actions that can pause, revoke, disconnect, forget, or inspect.

**Remove or reduce:**

- Duplicated navigation from the left panel.
- Large static cards with generic labels.
- Non-actionable metrics.
- Decorative timeline events.

**Hide until needed:**

- Full memory history.
- Verbose runtime logs.
- Advanced model routing details.
- Permission explanations after the user has already resolved them.

**Emphasize:**

- Pending user decisions.
- Active access grants.
- Meaningful changes to memory, files, browser, tools, and devices.
- The currently selected message/artifact/tool result when inspection is relevant.

---

## 3. Visual Language

### Typography hierarchy

Use typography as the primary hierarchy tool before using cards, borders, glow, or color.

- **Shell labels:** small, semibold, low-contrast, uppercase only when it improves scanning. Avoid shouting.
- **Panel headers:** concise, medium weight, sentence case.
- **Primary content:** comfortable body size with strong line-height and high contrast.
- **Metadata:** smaller, muted, tabular when numeric or status-oriented.
- **Chat messages:** readable prose width; avoid dashboard-style compressed text.
- **System/status labels:** short noun phrases, not marketing lines.

### Spacing and density

- Use **premium density**, not empty luxury. The interface should be calm but capable.
- Side panels should be compact and scannable; the center should breathe.
- Establish a consistent spacing ladder: tight for rows, medium for groups, generous for major regions.
- Avoid stacking many equal-height cards with the same padding.
- Prefer grouped rows with subtle separators for operational lists.

### Panel borders and dividers

- Use hairline dividers and material edges, not heavy borders.
- Panel separation should come from depth, background shift, and vertical rhythm.
- Borders should be quieter in Carbon and Flow, slightly clearer in Pearl and Canvas.
- Avoid nested bordered boxes inside bordered panels.

### Card usage

Cards are for meaningful objects, not every row.

Use cards for:

- Workspace artifacts.
- Permission decisions.
- Important memory summaries.
- Tool results with content.
- Settings previews.

Do not use cards for:

- Every navigation item.
- Every tool row.
- Every status label.
- Every timeline event.

### Button style

- Primary buttons should be rare and clearly tied to the next user action.
- Secondary buttons should be text or ghost controls unless they perform a significant operation.
- Icon buttons need labels on hover and visible focus states.
- Destructive buttons must remain semantically colored and cannot inherit skin accent.
- Avoid glossy generic pills everywhere; reserve pill shape for compact status and segmented choices.

### Status pills

- Status pills should be compact, semantic, and legible.
- Use neutral for informational state, green/success only for confirmed healthy states, amber for attention, red for blocked/danger.
- Do not use glowing pills as decoration.
- A status pill must either clarify state or provide an affordance to inspect it.

### Tool and action rows

- Tool rows should feel like system capabilities: icon, label, short state, optional action.
- One row should usually have one primary affordance.
- Use disclosure for advanced details.
- Group by user mental model: Capture, Connect, Create, Automate, Review, System.

### Empty states

- Empty states should be quiet and useful.
- Say what the area will show and the next reasonable action.
- Avoid mascots, hype, and overexplaining.
- Do not fill empty side panels with decorative cards just to avoid blank space.

### Hover and focus states

- Hover should reveal affordance, not create visual noise.
- Focus states must be unmistakable and keyboard-accessible.
- Active state should be more distinct than hover.
- Avoid animated glow unless it communicates active listening, active capture, or focused input.

### Glass/liquid skin usage

- Material effects belong mostly to the shell, panels, overlays, and high-level surfaces.
- Content surfaces should remain readable and stable.
- Blur should be subtle and capped; deep blur plus low contrast will make LucaOS feel pretty but unusable.
- Liquid motion must stay background-level and never compete with chat text, permissions, or actions.

### Dark and light skin behavior

- Dark skins should not rely on pure black, neon, or terminal styling.
- Light skins should not use harsh pure white panels or low-contrast gray text.
- Semantic state colors must remain stable across skins.
- The same component should feel native in each skin without changing its information hierarchy.

### Icon usage

- Use icons as recognition aids, not decoration.
- Prefer thin, precise, system-style icons.
- Avoid cute, cartoon, cyberpunk, or overly filled icons.
- Keep icon metaphors boring and clear: memory, lock, tool, device, microphone, camera, browser, file, model.

---

## 4. Component Rules

### Panels

- Each panel must have one clear role.
- Panels should have stable widths and predictable collapse behavior.
- Panel headers must be concise and functional.
- Panels may contain groups, not stacks of unrelated cards.
- Nested panels should be avoided; use disclosure or inspector states instead.

### Cards

- A card must represent a meaningful object, decision, artifact, or result.
- Cards need a clear title, short supporting metadata, and at most one dominant action.
- Cards should not use strong shadows and heavy borders at the same time.
- Dense lists should use rows, not cards.

### Tool buttons

- Tool buttons should state capability and availability.
- Pinned tools may use compact icon+label rows.
- Disabled tools need a reason on hover or disclosure.
- Tool categories should be user-oriented, not implementation-oriented.

### Chat composer

- The composer is the command surface of LucaOS.
- It should support text, voice, attachments/context, mode selection, model/runtime visibility, and action review without becoming a toolbar dump.
- The primary submit button should be visually calm and unmistakable.
- Stop/regenerate/continue states must replace the normal submit state clearly.

### Messages

- Messages should be readable, structured, and operational.
- User messages can be compact but should not look like disposable chat bubbles.
- Luca messages should support sections, citations, tool summaries, and actions.
- System notices should be visually distinct from assistant content.

### Memory and status items

- Memory items should show source, confidence/recency when relevant, and controls to inspect or forget.
- Status items should distinguish live state, last known state, and pending state.
- Avoid presenting speculative memory as fact.
- Keep memory separate from generic timeline noise.

### Permission review items

- Permission items must state: what Luca wants to do, why, scope, risk, and available choices.
- Approve/deny choices must be visually balanced unless there is a strong safety reason.
- Persistent grants need duration and revocation path.
- Permission review should never be hidden behind decorative UI.

### Tabs

- Use tabs only when switching between peer views within the same surface.
- Avoid tab sets nested inside tab sets.
- Active tab state should be clear without relying only on color.
- Use segmented controls for small mode choices, not full tabs.

### Headers

- Headers should orient the user, not market the product.
- A header can include title, current state, and one contextual action.
- Avoid large hero headers in the working shell after onboarding.

### Side navigation

- Side navigation should be stable, compact, and label-forward.
- Current surface must be obvious.
- Secondary surfaces can collapse under groups.
- Do not use the side navigation as a dumping ground for every tool.

### Model and runtime indicators

- Indicators should be visible enough to build trust but not dominate the shell.
- Show current model/runtime, local/cloud route, and degraded/offline state.
- Provide details on demand.
- Never use model routing as decorative telemetry.

---

## 5. Chat Experience

LucaOS chat should feel like an operational workspace, not a generic chatbot. The user is not just chatting; they are directing an AI host that can observe, remember, run tools, and request permission to act.

### Message layout

- Use a centered readable measure inside the workspace, with optional expansion for artifacts and tool results.
- Avoid cartoon bubbles. Use subtle message blocks, spacing, and role labels.
- User messages should feel like commands or contributions, not chat-app balloons.
- Luca responses should be structured with headings, bullets, result blocks, and action rows where useful.
- System and permission messages should have distinct treatment and should not masquerade as Luca prose.

### Composer layout

- The composer should sit as a stable command dock at the bottom of the center workspace.
- Primary text input remains dominant.
- Secondary controls should be grouped: context, voice, attachments, tools, model/runtime, send/stop.
- Advanced tool selection should open as a palette or sheet, not permanently crowd the composer.
- The composer should show current context scope in a compact line: files, screen, voice, browser, memory, model.

### Streaming behavior

- Streaming should feel calm and readable, not frantic.
- Show high-level activity states: thinking, using tool, waiting for approval, writing result.
- Do not expose fake precision or excessive token-by-token theatrics.
- When a tool is running, collapse repeated status updates into one evolving operation row.

### Tool call and result presentation

- Tool calls should appear as operational steps with clear labels, scope, and status.
- Completed tool results can collapse into summaries with an inspect option.
- Failed tool calls should explain what failed and what the user can do next.
- Host-affecting actions must make scope and reversibility clear.

### Navigation rail and long-thread navigation

- Long conversations need a lightweight thread map: milestones, artifacts, decisions, permissions, and generated outputs.
- The thread map can live as a center-side mini rail or as a right-panel inspector mode.
- Do not create a permanent IDE-like outline unless the user is working in a document/artifact mode.

### Context preservation

- LucaOS should show what context is active before the user sends.
- Context changes should be visible and reversible.
- Memory use should be disclosed when it materially affects an answer.
- Attachments, selected surfaces, and active capture should remain visible without cluttering every message.

### Status visibility

- Critical status belongs near the composer or right inspector: offline, local runtime unavailable, voice live, screen capture live, permission pending, tool running.
- Routine healthy status can be muted.
- Stop controls must remain visible during generation or tool execution.

### Blending chat with workspace surfaces

- Chat should be the conversational layer of the workspace, not the whole product.
- Artifacts, previews, documents, and tool results should occupy workspace surfaces when they become primary.
- The user should be able to move from chat to artifact inspection without feeling like they left LucaOS.
- Side panels should update contextually when a message, artifact, permission, or tool result is selected.

---

## 6. Skin System Guidance

### Carbon/default skin influence

Carbon should be the professional baseline for desktop polish: graphite, calm, low-noise, and precise. It should define the seriousness of LucaOS without making the product feel like a terminal or IDE.

Carbon should influence:

- Shell background depth.
- Panel translucency and hairline separation.
- Subtle active/focus accents.
- Runtime/status material.
- Overlay and command-palette material.

Carbon should not influence:

- Semantic safety colors.
- Permission severity.
- Text contrast below accessibility thresholds.
- Content readability.
- Destructive action styling.

### Applying skins without washing out readability

- Skins set environment and material, not every component's personality.
- Content containers should stay neutral enough for long reading.
- The bridge from skin to material tokens should cap opacity, blur, saturation, and glow.
- Status and safety tokens must remain outside skin control.
- Flow-like motion must reduce automatically when motion reduction or low-power conditions apply.

### Professional skin settings

Skin settings should feel like choosing an operating environment, not picking a theme color.

Settings should show:

- Skin name.
- Short plain-language description.
- Preview of shell, panel, composer, and status behavior.
- Light/dark affinity.
- Motion/transparency notes.
- Accessibility fallback behavior.

Avoid:

- Huge decorative preview art.
- Gamer-like theme names or rarity labels.
- Overpromising personality changes.
- Letting skin previews imply that safety/status colors can be customized away.

### What should inherit skin material

- App shell background.
- Panel surfaces.
- Command palette and overlays.
- Composer dock material.
- Non-critical cards and workspace containers.
- Navigation hover/active backgrounds.

### What should stay neutral for usability

- Long-form message text areas.
- Permission decisions.
- Destructive actions.
- Warnings, errors, and blocked states.
- Code/preformatted output if present.
- Dense data tables or diagnostic logs.
- Accessibility focus rings.

---

## 7. UI Copy Direction

### Voice and tone

LucaOS copy should be professional, direct, calm, and operational. It should sound like mature system software that respects the user. It should not sound like a mascot, a sci-fi assistant, a military cockpit, a developer-only tool, or an overly friendly consumer chatbot.

Rules:

- Prefer plain verbs: Open, Review, Connect, Allow, Pause, Forget, Continue.
- Name concrete objects: Memory, Device, Tool, Workspace, Permission, Model.
- Avoid theatrical metaphors: mission, handshake, standby, inside, command center.
- Avoid fake intimacy: best friend, partner, companion, I am here for you.
- Avoid developer-only framing unless the surface is explicitly technical.
- Use short sentences. Explain risk and scope clearly.

### Copy replacements

| Avoid | Replace with | Rationale |
| --- | --- | --- |
| First Run | Set up LucaOS | Plain and product-level. |
| I'll help from inside | LucaOS can work with your local context | Explains capability without sounding eerie. |
| What should Luca call you? | What name should Luca use? | Direct and less cute. |
| Start with me | Start setup | Clear action. |
| Handshake complete | Device connected | Concrete system state. |
| Preparing memory boundaries | Setting memory preferences | User-understandable. |
| Luca standby | Ready | Mature status language. |
| Awaiting mission parameters | What would you like to work on? | Useful, calm, not militarized. |
| Activate vision | Allow camera context | Names permission and scope. |
| Engage runtime | Start local runtime | Operational and concrete. |
| Neural workspace | Workspace | Avoids sci-fi. |
| Agent swarm | Tools | Avoids hype and confusion. |
| Memory core | Memory | Plain noun is stronger. |
| System online | LucaOS is ready | Less theatrical. |

---

## 8. Prioritized Redesign Phases

### Phase 1: visual/component cleanup with low risk

**Change:**

- Normalize typography scale and panel headers.
- Reduce excessive cards into grouped rows.
- Tighten button hierarchy.
- Standardize status pills.
- Reduce decorative glow and redundant copy.
- Improve dividers, spacing, and hover/focus states.

**Avoid touching:**

- Core data flow.
- Tool execution logic.
- Permission semantics.
- Skin provider architecture.
- Major layout routing.

**Acceptance criteria:**

- The app still has the same features and navigation.
- Center workspace has clearer dominance.
- Side panels scan as system rails/inspectors instead of card dashboards.
- Primary, secondary, disabled, active, warning, and destructive states are visually distinct.
- No safety/status state becomes less legible.

### Phase 2: chat/composer redesign

**Change:**

- Redesign composer as a command dock.
- Add compact context visibility near the composer.
- Improve send/stop/continue states.
- Structure tool calls and results as operational rows.
- Improve message spacing, reading width, and system notice treatment.

**Avoid touching:**

- Backend chat protocol unless required for display mapping.
- Model routing behavior.
- Tool permission enforcement.
- Memory write behavior.

**Acceptance criteria:**

- Users can identify active context before sending.
- Running tools and pending permissions are visible without flooding the thread.
- Chat feels like an operating workspace, not a generic chatbot.
- Stop and approval controls remain obvious under streaming/tool states.

### Phase 3: left/right panel redesign

**Change:**

- Recast left panel as a capability/navigation rail.
- Recast right panel as context inspector, timeline, memory, permissions, and status control.
- Move duplicated or misplaced items to the correct side.
- Add progressive disclosure for advanced runtime/tool details.

**Avoid touching:**

- Tool implementation.
- Device connection internals.
- Memory storage schema.
- Permission enforcement logic.

**Acceptance criteria:**

- Left panel answers what Luca can do now.
- Right panel answers what Luca knows, sees, changed, or needs reviewed.
- Rare/advanced surfaces are discoverable but not constantly visible.
- Pending decisions and active access grants are easier to find.

### Phase 4: settings, skin, and onboarding polish

**Change:**

- Present skins as operating environments with professional previews.
- Update onboarding copy to calm system language.
- Apply skin material boundaries according to the skin application plan.
- Improve settings grouping and reduce generic dashboard cards.

**Avoid touching:**

- Global skin application beyond approved boundaries.
- Safety/status token ownership.
- Onboarding logic that affects accounts, devices, or permissions without a separate plan.

**Acceptance criteria:**

- Skin selection feels premium and understandable.
- Readability and safety states remain stable across skins.
- Onboarding feels professional, not sci-fi or mascot-driven.
- Settings communicate control, not decoration.

### Phase 5: deeper workspace/tool surfaces

**Change:**

- Introduce richer artifact/workspace surfaces when chat outputs become objects.
- Add inspector states for selected messages, artifacts, permissions, memories, and tool results.
- Improve long-thread navigation and timeline milestones.
- Build durable patterns for local/runtime/tool work without becoming an IDE.

**Avoid touching:**

- Replacing the whole app shell.
- Making file/code views the default product metaphor.
- Adding decorative telemetry or fake OS widgets.

**Acceptance criteria:**

- Users can move between conversation, artifact, inspection, and action without losing context.
- Tool results have clear places to live outside the message stream.
- The workspace feels spatial and system-level while remaining simple enough for daily use.

---

## 9. Implementation Handoff Format

Use this handoff to turn the design direction into safe PRs.

### PR sequencing

1. **PR 1: Component language cleanup**
   - Scope: typography, spacing, panel headers, row/card reductions, button/status normalization.
   - No behavior changes.
   - Include before/after screenshots.

2. **PR 2: Composer and message polish**
   - Scope: composer layout, context line, send/stop states, message spacing, tool/result display components.
   - Keep existing data contracts where possible.
   - Include streaming/tool-call screenshots or screen recordings if practical.

3. **PR 3: Side panel role alignment**
   - Scope: left capability rail and right inspector organization.
   - Move or hide surfaces without deleting underlying features.
   - Include screenshots for active, empty, permission-pending, and runtime-degraded states.

4. **PR 4: Skin/settings/onboarding copy polish**
   - Scope: professional skin previews, copy replacement, skin-boundary application only where already approved.
   - Keep semantic status colors protected.
   - Include screenshots for Carbon and one light skin.

5. **PR 5+: Workspace/tool surface depth**
   - Scope: artifacts, selected-object inspector states, long-thread navigation, richer tool-result surfaces.
   - Split by surface to avoid high-risk mega-PRs.

### General implementation rules

- Do not wipe or rebuild the app shell.
- Do not make LucaOS look like a coding IDE.
- Do not add sci-fi ornament, neon telemetry, or mission language.
- Keep existing functionality reachable while improving hierarchy.
- Treat skins as material environments, not global theme paint.
- Preserve permission, safety, runtime, voice, vision, memory, and destructive-action clarity.
- Use screenshots for perceptible UI changes.
- Prefer small component-system PRs over one large redesign PR.
- If a component has unclear ownership, document the intended role before changing it.
