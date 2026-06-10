# LucaOS Landing v2 Product-Site Plan

## Purpose and decision

Landing v2 should be a coherent product-site redesign, not another patch pass over the current visual language. The next implementation should preserve the working deployment and LucaOS identity while rebuilding the page around a simple story:

> LucaOS is a personal AI operating system that understands context, helps finish work, operates across devices, and remains under the user's control.

The public page should communicate that promise before it introduces subsystem names or runtime architecture. Architecture remains an important proof point, but it belongs lower in the story, where interested visitors have enough context to understand why it matters. Named systems—including Personal Intelligence, VoiceHUD, VisualCore, LucaBrowser, LucaLink, Operation Center, the Model Router, and runtime governance—should be introduced as explanations of user-visible benefits rather than as the opening pitch.

This document defines the content hierarchy, visual direction, draft copy, asset strategy, implementation path, migration phases, and acceptance criteria for that redesign. It intentionally makes **no runtime or landing-page code changes**.

---

## 1. Page-level diagnosis

The current landing page is deployed and functional, and it already contains many of the right product ideas. Its quality gap is systemic rather than attributable to a single CSS defect.

### 1.1 The old sci-fi dashboard foundation still controls the experience

The page inherits a visual grammar of glowing interfaces, scanning effects, technical panels, system-status treatments, and internal dashboard compositions. Those devices can make LucaOS look active, but together they frame the product as a speculative control console rather than a mature personal AI product.

A premium product page should feel composed before it feels futuristic. LucaOS should communicate intelligence through clarity, restraint, typography, product behavior, and confident screenshots—not through constant effects.

### 1.2 Too many system labels compete with the product promise

The current page frequently uses badges, subsystem names, all-caps labels, technical section names, and architecture terminology. That asks a new visitor to decode LucaOS before understanding its value. Labels such as runtime architecture, model routing, operation surfaces, agent systems, and named modules are useful evidence later, but they should not dominate the first screen or the opening narrative.

Landing v2 should use plain product language first:

- understand what matters to me;
- help me complete work;
- carry context across tools and devices;
- ask before consequential actions;
- let me choose how intelligence runs.

### 1.3 Mixed visual assets prevent one premium art direction

The current asset set combines a holographic identity image, dashboard captures, neural or agent imagery, voice UI, hardware imagery, and theme-specific icons. These assets vary in composition, density, lighting, perspective, and implied product maturity. Placed in one long page, they feel assembled from different visual campaigns.

Landing v2 needs one screenshot system: consistent viewport framing, corner radius, lighting, crop, background, annotation style, and level of UI density. Legacy sci-fi images may still support lower-page explanation, but they should not define the whole page.

### 1.4 Hero text and background compete

The hologram is a recognizable brand asset, but using it as a large ambient background can reduce headline contrast and create visual competition between the face, effects, copy, badges, and calls to action. The result is less calm than the intended quality bar.

The hero needs an explicit composition. Text and the hologram should each have a protected region, with deliberate contrast, gradients, crop, and mobile behavior. The symbol should reinforce the promise rather than sit behind every piece of content.

### 1.5 Light and dark modes do not yet feel like one system

Dark mode tends toward luminous sci-fi surfaces while light mode must reinterpret those same assets and overlays against bright backgrounds. This produces differences in contrast, image blending, card weight, and perceived polish. A premium two-theme site should feel like the same brand under two material conditions—not a primary dark experience with a light adaptation.

The redesign needs paired tokens, theme-tested imagery, controlled transparency, and equivalent hierarchy in both modes.

### 1.6 Architecture appears too close to the top

LucaOS has a differentiated architecture, including model choice, governed actions, memory, browser context, voice, visual output, and device continuity. However, explaining those systems before establishing a human outcome makes the opening feel like a platform specification.

The first half of Landing v2 should answer:

1. What is LucaOS?
2. What can it help me accomplish?
3. Who is it useful for?
4. Why should I trust it?

Only then should the page explain Luca Prime, Local Models, BYOK, the Model Router, and named capabilities.

### 1.7 Mobile spacing and header behavior weaken the first impression

The current desktop-oriented page carries a high amount of navigation and visual density into smaller viewports. Mobile risks include a crowded header, insufficient hero breathing room, overly tall decorative regions, dense cards, inconsistent edge padding, and controls competing for the first viewport.

Landing v2 must treat mobile as a designed product page, not a collapsed desktop layout. The first viewport should contain a stable header, readable promise, primary action, and a disciplined portion of the brand visual.

### 1.8 Existing sections have been patched rather than authored as one story

The current page contains individually improved sections, but the total experience still reflects accumulated revisions. Repeated showcase patterns, badges, architecture terms, and old assets make the page feel like a sequence of internal feature panels rather than a deliberately paced product narrative.

Landing v2 should be written and designed from the page outline outward. Each section must have a distinct role, and adjacent sections should vary intentionally between statement, proof, use case, product demonstration, trust, and conversion.

### Diagnosis summary

The next change should not be “make the current cards cleaner” or “reduce one glow.” It should replace the page-level hierarchy and visual system while preserving only the strongest brand and product ingredients.

---

## 2. Core brand direction

### Brand idea

**Sovereign personal intelligence, presented with calm confidence.**

LucaOS should feel personal without being cute, technical without becoming an internal console, and powerful without implying unrestricted autonomy. The product-site tone should combine:

- OpenAI/Codex-like calmness and directness;
- Apple-like spacing, image discipline, and material polish;
- Cursor-like confidence for technical users;
- AI-native clarity rather than generic SaaS convention;
- a distinct LucaOS identity centered on personal ownership and governed action.

### Desired material feel

#### Dark mode

- black and code-grey foundation rather than blue-black space scenery;
- graphite surfaces with slight tonal separation;
- soft white typography with restrained contrast steps;
- cool silver and one controlled Luca blue accent;
- gradients that create depth, not visible neon clouds;
- minimal bloom around the hologram only.

#### Light mode

- pearl, white, and silver foundation rather than flat white SaaS panels;
- near-black typography with cool-grey secondary text;
- subtle blue-grey borders and shadows;
- restrained spectral highlights in product imagery;
- warm-neutral depth where needed to avoid a sterile appearance.

### Visual principles

1. **Typography carries the page.** The headline, supporting sentence, and section rhythm should remain compelling before imagery loads.
2. **One accent is enough.** Luca blue is the primary interactive and identity accent; violet may exist only as a very subtle gradient companion, never as a competing label system.
3. **Product proof beats decorative complexity.** Prefer clear product screenshots or purpose-built mockups over noisy UI collages.
4. **Cards explain, not decorate.** A card exists only when content benefits from grouping or comparison.
5. **The hologram is a signature.** It may anchor the hero and reappear once near the final CTA, but it should not become background texture throughout the page.
6. **Effects must have a protected budget.** No stacking scanlines, particle fields, strong blur, neon borders, and multiple gradient blooms in the same composition.
7. **Human language precedes system language.** Architecture names are introduced only after their benefit is clear.

---

## 3. Hero direction

The hero must introduce LucaOS as a product, not simulate LucaOS startup, onboarding, or an internal operating dashboard. It must not include Cloud, Local, BYOK, or Model Router language in the main paragraph.

### Required hero copy

**Headline**

> Your personal AI operating system.

**Subheadline**

> LucaOS gives your AI memory, voice, tools, browser context, and governed actions — so it can understand your work, help you act, and stay under your control.

**Primary CTA**

> Download Preview

**Secondary CTA**

> Launch App

**Platform note**

> Desktop preview · Web control surface · Mobile companion

The platform note is supporting metadata, not three prominent badges. It should appear as one quiet line beneath the actions.

### Option A — text left, hologram right

**Recommended hero composition for implementation.**

Desktop uses a two-column layout with approximately 52% of the usable width reserved for copy and 48% for the visual. The text column contains the headline, subheadline, two actions, and platform note. The hologram sits in a bounded visual field on the right, optionally paired with one restrained product window or contextual reflection.

Rules:

- protect the text column from image overlap at all desktop widths;
- align the headline to the page grid, not the center of the viewport;
- keep the hologram fully visible or intentionally cropped—never accidentally clipped;
- use one soft radial light behind the hologram, without fluorescent bloom;
- allow the visual to extend slightly beyond the content grid for scale;
- avoid status chips, terminal copy, startup sequences, or architecture labels;
- on mobile, stack copy first and visual second;
- on mobile, show both CTAs without forcing horizontal overflow;
- keep the primary message and CTA visible before an excessively tall visual.

Why it works: the split provides strong reading order, gives the hologram its own stage, and is easier to control in light and dark modes.

### Option B — centered product hero

Desktop and mobile use a centered headline composition. The hologram may sit above the headline or behind the central product visual, but it must follow strict overlay discipline.

Rules:

- if the hologram is above, treat it as a compact mark rather than a full-screen portrait;
- if it is behind, place a strong theme-aware scrim between image and text;
- maintain a readable text measure of approximately 680–760px;
- place CTAs immediately under the subheadline;
- use a single wide product mockup beneath the actions to establish product reality;
- never place facial detail directly behind headline letterforms;
- reduce or remove the background image in high-contrast and reduced-transparency modes;
- on mobile, place the hologram above the headline only if the first viewport remains concise; otherwise move it below the CTAs.

Why it works: it can create a dramatic, iconic first impression. Its risk is returning to the current background-conflict problem, so it requires more precise imagery and responsive art direction.

### Hero recommendation

Proceed with **Option A** unless a new centered hero mockup proves superior in both themes and at 390px width. Option A better supports calm reading, a recognizable brand symbol, and dependable mobile stacking without turning the hero into an app interface.

---

## 4. Recommended page structure

The final page order should be:

1. **Hero** — simple product promise, CTAs, and hologram/product visual.
2. **Proof strip** — “Works across your tools, models, and devices.”
3. **Ways to use LucaOS** — personal work, developers, and devices.
4. **Get more done with LucaOS** — four outcome-led product sections.
5. **Intelligence that runs your way** — Luca Prime, Local Models, BYOK, and Model Router.
6. **Personal Intelligence** — memory, preferences, knowledge, and context continuity.
7. **Voice, vision, and browser operation** — VoiceHUD, VisualCore, LucaBrowser, and screen context.
8. **Link your devices** — LucaLink across Web, Desktop, and Mobile with approval-first handoff.
9. **Built for control** — approvals, runtime boundaries, user-controlled memory, and server-side secrets.
10. **Final CTA** — “Start with LucaOS.”

### Narrative rhythm

The page should alternate content modes rather than repeat identical showcase rows:

- promise;
- concise proof;
- audience fit;
- outcome demonstration;
- technical choice;
- personal continuity;
- multimodal capability;
- device continuity;
- trust and governance;
- conversion.

Architecture begins only after visitors have seen use cases and outcomes. This preserves LucaOS's technical differentiation without asking the hero to carry the entire system.

---

## 5. Section copy draft

The following is working product-marketing copy for design and implementation. It should be treated as the approved baseline unless product availability or claim review requires a more conservative formulation.

### A. Hero

**Badge:** Personal AI, under your control

**Headline:** Your personal AI operating system.

**Subheadline:** LucaOS gives your AI memory, voice, tools, browser context, and governed actions — so it can understand your work, help you act, and stay under your control.

**Primary CTA:** Download Preview

**Secondary CTA:** Launch App

**Platform note:** Desktop preview · Web control surface · Mobile companion

**Visual caption, if needed:** One intelligence layer for the work, context, and devices you choose to connect.

Copy rule: the badge is optional. If used, it should be quiet, sentence case, and visually secondary to the headline.

### B. Proof strip

**Headline:** Works across your tools, models, and devices.

**Subheadline:** Bring together the places you work, the intelligence you choose, and the devices you trust.

**Proof items:**

- **Your tools** — Work with browser context, connected services, and governed capabilities.
- **Your intelligence** — Use Luca Prime or connect supported model options on your terms.
- **Your devices** — Continue across Web, Desktop, and Mobile without losing the thread.

Design note: this should be a calm, mostly typographic strip. It may use a short row of carefully selected monochrome marks, but it should not become an infinite logo marquee or imply unsupported integrations.

### C. Ways to use LucaOS

**Badge:** Made for the way you work

**Headline:** One personal AI. Different ways to put it to work.

**Subheadline:** Start with everyday work, build with deeper tools, or connect LucaOS to the devices around you.

**Card — Luca for personal work**

- **Headline:** Move from thought to finished work.
- **Copy:** Keep context across conversations, research, notes, and recurring tasks. Luca helps you organize what matters and turn intent into a clear next step.
- **Supporting line:** Plan, research, write, remember, and follow through.

**Card — Luca for developers**

- **Headline:** Build with an AI that understands the workspace.
- **Copy:** Bring code, browser context, tools, and model choice into one governed operating layer—without hiding what is running or what it wants to do.
- **Supporting line:** Inspect context, use tools, route intelligence, and review actions.

**Card — Luca for devices**

- **Headline:** Carry the right context to the right screen.
- **Copy:** Link trusted devices and continue work across Web, Desktop, and Mobile with explicit handoff and approval where it matters.
- **Supporting line:** Connect, continue, approve, and stay in control.

### D. Get more done with LucaOS

**Badge:** From intent to outcome

**Headline:** Get more done with LucaOS.

**Subheadline:** LucaOS is designed to understand the work around a request, help produce the result, and make every consequential step visible.

#### Outcome 1 — Your personal operating assistant

**Headline:** An assistant that can understand the work around you.

**Subheadline:** Give Luca the context you choose—conversations, preferences, browser state, files, and connected tools—so each request starts with more understanding and less repetition.

**Card copy:**

- **Keep the thread** — Continue work without rebuilding the same background every time.
- **Work in context** — Let the current task, screen, and conversation shape the response.
- **Adapt to you** — Use approved preferences and knowledge to make help more relevant.

**Visual direction:** one clean conversation/workspace mockup showing a request, visible context sources, and a concise result—not a full dashboard collage.

#### Outcome 2 — Get finished work back

**Headline:** Ask for an outcome, not another tab of suggestions.

**Subheadline:** Luca can help turn a request into structured work—research, drafts, plans, code, visual output, or an action ready for your review.

**Card copy:**

- **Research with context** — Gather and organize relevant information around the task.
- **Create useful output** — Return a draft, plan, artifact, or next action you can use.
- **Review before action** — See what Luca proposes before governed work proceeds.

**Visual direction:** an input-to-output sequence with three calm states: request, progress, finished artifact.

#### Outcome 3 — Make repeated work automatic

**Headline:** Turn repeated work into a trusted routine.

**Subheadline:** Define how recurring tasks should run, what context they can use, and where Luca must stop for approval.

**Card copy:**

- **Reusable workflows** — Save a proven sequence instead of rebuilding it.
- **Clear boundaries** — Limit the tools, data, devices, and actions available to a routine.
- **Visible checkpoints** — Require review before sensitive or irreversible steps.

**Visual direction:** a minimal workflow timeline with readable human labels, not an agent graph or terminal trace.

#### Outcome 4 — You stay in control

**Headline:** Powerful when you want it. Accountable by design.

**Subheadline:** LucaOS makes proposed actions, memory, connected devices, and runtime limits visible so you can approve, correct, pause, or revoke access.

**Card copy:**

- **Approvals where they matter** — Consequential actions wait for a clear decision.
- **Memory you can manage** — Review, correct, or remove personal context.
- **Activity you can inspect** — Understand what ran, what was used, and what needs attention.

**Visual direction:** a polished approval sheet or activity receipt with a clear allow/deny decision and concise explanation.

### E. Intelligence that runs your way

**Badge:** Model choice

**Headline:** Intelligence that runs your way.

**Subheadline:** Choose the intelligence that fits the task, your environment, and your preferences. LucaOS provides one experience across supported options without making model management the center of every interaction.

**Card — Luca Prime**

- **Headline:** Luca Prime
- **Copy:** The managed LucaOS intelligence path for a streamlined experience and strong default capability.
- **Qualifier:** Availability and included capabilities should match the current preview offering.

**Card — Local Models**

- **Headline:** Local Models
- **Copy:** Use supported models on your own hardware when local execution, experimentation, or data boundaries matter.
- **Qualifier:** Describe this as support for compatible local setups, not a guarantee that every model or device will work.

**Card — BYOK**

- **Headline:** Bring your own key
- **Copy:** Connect supported provider credentials so you can use the services and account relationships you already control.
- **Qualifier:** Provider availability should be listed only when verified.

**Model Router explanation**

- **Headline:** One experience, with routing underneath.
- **Copy:** The Model Router selects among configured intelligence options according to task needs, user choice, availability, and runtime policy. Advanced users can understand the route; everyone else can stay focused on the work.

**Section closing line:** Your models are part of LucaOS. They are not the whole product.

### F. Personal Intelligence

**Badge:** Personal Intelligence

**Headline:** An AI that can keep the context you choose.

**Subheadline:** LucaOS turns approved memory, preferences, knowledge, and active context into continuity—so assistance can become more useful without becoming opaque.

**Card — Memory**

- **Headline:** Remember what matters
- **Copy:** Preserve useful facts and working context with visibility into what is retained.

**Card — Preferences**

- **Headline:** Work the way you prefer
- **Copy:** Carry approved choices for tone, tools, workflows, and recurring decisions into future work.

**Card — Knowledge**

- **Headline:** Build on your own knowledge
- **Copy:** Connect the information you rely on and keep its role understandable within the current task.

**Card — Context continuity**

- **Headline:** Continue without starting over
- **Copy:** Move between sessions and supported devices while retaining the relevant thread—not every piece of data by default.

**Trust line:** You should be able to see, correct, and remove what Luca remembers.

### G. Voice, vision, and browser operation

**Badge:** Multimodal work

**Headline:** Speak, show, browse, and work in context.

**Subheadline:** LucaOS can meet the task in the form it arrives—through voice, visual output, browser context, or the screen in front of you.

**Card — VoiceHUD**

- **Headline:** Talk naturally with VoiceHUD
- **Copy:** Start a focused voice interaction, follow the transcript, and return to the workspace without losing context.

**Card — VisualCore**

- **Headline:** Make ideas visible with VisualCore
- **Copy:** Turn a request into visual output or a clearer way to inspect what Luca is helping create.

**Card — LucaBrowser**

- **Headline:** Work with the web through LucaBrowser
- **Copy:** Use browser context to research, compare, and prepare actions while keeping sensitive steps governed.

**Card — Screen context**

- **Headline:** Help based on what is on screen
- **Copy:** Share the relevant view when you want Luca to understand the current interface, document, or task.

**Safety line:** Context is used through explicit product permissions and should never be described as unrestricted background observation.

### H. Link your devices

**Badge:** LucaLink

**Headline:** Continue across the devices you trust.

**Subheadline:** LucaLink connects LucaOS experiences across Web, Desktop, and Mobile so context and work can move with you—without making every device equally trusted by default.

**Card — Web**

- **Headline:** Web control surface
- **Copy:** Start conversations, review work, and manage connected capabilities from the browser.

**Card — Desktop**

- **Headline:** Desktop preview
- **Copy:** Bring Luca closer to local workflows, supported tools, and device-level capabilities.

**Card — Mobile**

- **Headline:** Mobile companion
- **Copy:** Stay connected to important conversations, handoffs, and approvals while away from the desktop.

**Handoff feature**

- **Headline:** Approval-first handoff
- **Copy:** When work crosses a device boundary, LucaOS should show where it is going, what context is included, and whether approval is required.

**Section closing line:** Connected does not mean unrestricted.

### I. Built for control

**Badge:** Governance

**Headline:** Built for control, not blind autonomy.

**Subheadline:** LucaOS is designed to make authority explicit. You decide what can be remembered, which capabilities are connected, and when an action needs approval. Operation Center can surface this runtime governance in a clear, inspectable experience.

**Card — Approvals**

- **Headline:** Review consequential actions
- **Copy:** Sensitive, external, or irreversible steps can pause for a clear user decision.

**Card — Runtime boundaries**

- **Headline:** Set the operating boundary
- **Copy:** Limit the tools, data, devices, and execution paths available to a task or workflow.

**Card — User-controlled memory**

- **Headline:** Keep memory accountable
- **Copy:** Inspect, correct, or remove retained personal context instead of treating memory as an invisible black box.

**Card — Server-side secrets**

- **Headline:** Keep secrets out of the interface
- **Copy:** Sensitive credentials should remain in protected server-side handling and must never be exposed through client-side presentation.

**Trust statement:** LucaOS should make safe boundaries understandable without requiring every user to read runtime documentation.

### J. Final CTA

**Badge:** LucaOS preview

**Headline:** Start with LucaOS.

**Subheadline:** Explore the web experience, try the desktop preview, or join the early-access community as LucaOS grows.

**Primary CTA:** Download Preview

**Secondary CTA:** Launch App

**Tertiary CTA:** Join Early Access

**Availability note:** Preview availability varies by platform. Buttons must route only to live, clearly labeled destinations.

**Optional closing line:** Your context. Your intelligence. Your control.

---

## 6. Visual design rules

### 6.1 Typography system

Use one primary sans-serif family across the marketing site, preferably a high-quality variable font with strong text rendering. The first implementation should favor the existing project font only if it meets these requirements; otherwise use a locally hosted or dependable system-forward stack with minimal loading risk.

Recommended roles:

| Role | Desktop target | Mobile target | Guidance |
| --- | ---: | ---: | --- |
| Display / hero | 72–88px | 44–56px | Weight 550–650, tight but natural tracking, 0.98–1.05 line height |
| Section headline | 48–64px | 34–44px | Weight 550–650, 1.02–1.12 line height |
| Card headline | 22–28px | 20–24px | Weight 600, sentence case |
| Lead body | 20–24px | 18–20px | 1.45–1.6 line height, constrained measure |
| Body | 16–18px | 16–18px | 1.55–1.7 line height |
| Metadata | 13–15px | 13–14px | Medium weight, never low-contrast to the point of illegibility |

Rules:

- sentence case by default;
- no gratuitous wide tracking;
- no monospace for marketing labels;
- monospace only for literal code, command, model ID, or technical trace content;
- body copy should generally remain within 58–72 characters per line;
- never place important text directly over a high-detail image.

### 6.2 Spacing system

Use an 8px-based system with a small 4px step for fine alignment.

Core tokens: `4, 8, 12, 16, 24, 32, 48, 64, 80, 96, 128, 160`.

Rules:

- desktop section padding: 112–160px vertical depending on section density;
- tablet section padding: 88–112px;
- mobile section padding: 72–96px;
- desktop page gutter: 32–48px with a maximum content width around 1200–1280px;
- mobile page gutter: 20–24px;
- section heading to lead copy: 20–28px;
- heading group to content or cards: 48–72px desktop, 32–48px mobile;
- card internal padding: 28–40px desktop, 24px mobile;
- do not use empty decorative height to simulate premium spacing; rhythm must remain purposeful.

### 6.3 Card radius

- standard content card: 20px;
- featured product frame: 24–28px;
- compact chip or badge: 999px only when the content is genuinely pill-like;
- buttons: 12–14px, not fully pill-shaped by default;
- do not mix many radii within one section.

### 6.4 Shadow and glass rules

- cards should use opaque or near-opaque material first; blur is optional polish, not the structure;
- use one soft elevation shadow and one border token per theme;
- avoid luminous outer glows on ordinary cards;
- reserve glass for the header, a floating approval surface, or one hero product frame;
- never stack more than two translucent surfaces;
- product screenshots should remain readable without blend modes;
- dark-mode elevation comes primarily from tonal contrast, not black drop shadows;
- light-mode shadows should be broad, cool-neutral, and low opacity.

### 6.5 Dark mode palette

Recommended semantic direction:

| Token | Target |
| --- | --- |
| Page background | `#08090B` to `#0B0D10` |
| Elevated background | `#111318` |
| Card background | `#15181D` or a closely related graphite |
| Primary text | `#F5F7FA` |
| Secondary text | `#AEB5C0` |
| Muted text | `#7F8793`, subject to contrast testing |
| Border | translucent cool white around 10–14% |
| Primary accent | restrained Luca blue around `#5B8CFF` |
| Accent hover | slightly brighter blue, not cyan neon |
| Focus ring | blue with sufficient contrast and a visible outer offset |

A subtle indigo or violet may appear inside one gradient at low saturation. It should not become a second button, badge, or status language.

### 6.6 Light mode palette

Recommended semantic direction:

| Token | Target |
| --- | --- |
| Page background | pearl `#F7F7F5` or cool white `#F8F9FB` |
| Elevated background | `#FFFFFF` |
| Alternate section | silver-grey `#EFF1F4` |
| Primary text | `#111318` |
| Secondary text | `#525A66` |
| Muted text | `#747D89`, subject to contrast testing |
| Border | cool grey around `#DDE1E7` |
| Primary accent | deep Luca blue around `#356AE6` |
| Accent hover | darker, not more fluorescent |
| Focus ring | strong blue with a visible light outer offset |

Light mode should not reuse dark assets without a dedicated matte, crop, or alternate treatment.

### 6.7 Button hierarchy

**Primary — Download Preview**

- solid Luca blue in both themes;
- high-contrast label;
- optional small platform/download icon;
- never imply a production-ready release if the destination is a preview.

**Secondary — Launch App**

- neutral elevated surface with visible border;
- equal height and typography to the primary button;
- may use a restrained arrow icon.

**Tertiary — Join Early Access**

- text button or low-emphasis bordered button;
- used in the final CTA and navigation where appropriate.

Rules:

- 44px minimum target size, preferably 48–52px for hero actions;
- sentence-case labels;
- one primary action per viewport group;
- hover, focus, active, loading, and disabled states must be explicit;
- mobile buttons may stack at narrow widths but should not become oversized full-screen bars unless the layout benefits.

### 6.8 Mobile header behavior

- use a stable 56–64px header with logo/wordmark left and one menu control right;
- keep at most one compact CTA visible in the header, and remove it if it crowds 320–390px widths;
- use a solid or strongly legible blurred background after minimal scroll;
- lock body scroll while the menu is open;
- present a simple full-height or anchored menu, not a miniature mega-menu;
- menu items should reflect the product story: Overview, Use cases, Intelligence, Devices, Control;
- place Download Preview, Launch App, and theme control in a clear action group;
- preserve 44px touch targets and visible keyboard focus;
- avoid header height shifts when switching themes or opening the menu.

### 6.9 Hero image rules

- the hologram is the hero symbol, not a full-page wallpaper;
- define separate desktop and mobile crops;
- protect headline contrast with spatial separation or an explicit scrim;
- use a maximum of one ambient gradient behind the hologram;
- do not add scanlines, terminal overlays, floating system labels, or pulsing status dots;
- if a product screen accompanies it, the screen should show one believable use case at a readable scale;
- create light-mode and dark-mode treatments rather than relying on one blend mode;
- keep animation slow and optional; respect `prefers-reduced-motion`;
- optimize image weight and responsive delivery during implementation.

### 6.10 Section badge rules

Section badges should be subtle and consistent. Avoid random purple, red, and green labels. Use neutral or blue accent tokens.

- one badge style across the page;
- sentence case, two to four words where possible;
- neutral border and surface with optional blue text or dot;
- no terminal brackets, fake system codes, or acronym expansion in the badge;
- badges establish orientation, not hierarchy;
- omit a badge when the section headline is already self-explanatory.

---

## 7. Asset strategy

This is a conceptual audit based on the current assets and how they are used in the landing page. Before implementation, each retained image should receive a visual QA pass in both themes and at mobile crops.

| Asset | Classification | Landing v2 role and rationale |
| --- | --- | --- |
| `hologram.png` | **Keep as-is** | Preserve as the primary LucaOS brand symbol. Recompose it within a disciplined hero field, with theme-specific matte/crop rules. Do not use it as general background clutter. A later optimized export may improve delivery without changing the art. |
| `dashboard_preview.png` | **Needs new screenshot/mockup** | The concept is useful, but Landing v2 needs a cleaner, current product screenshot focused on one understandable workflow. Replace dashboard density, scanning effects, and collage framing with a consistent product-window system. |
| `agent_swarm.png` | **Replace later** | “Agent swarm” imagery reinforces internal architecture and sci-fi orchestration rather than a calm user outcome. If retained during transition, keep it off the primary product story. Replace it with a workflow or finished-work visual. |
| `neural_center.png` | **Use only lower on page** | It may support the model-choice section as secondary technical proof, but it should not lead the narrative. A later mockup should rename and simplify the experience around understandable model choice. |
| `voicehud_preview.png` | **Needs new screenshot/mockup** | Voice is strategically important, but the v2 page needs a calmer, more current VoiceHUD capture with readable transcript, one active state, and no excessive HUD effects. |
| `prism.png` | **Use only lower on page** | The hardware rendering can support a future device or roadmap story, but it should not represent LucaLink or imply shipped hardware. Use only with explicit preview/concept labeling, or omit it from v2 until the claim is appropriate. |
| `icon.png` | **Keep as-is** | Retain for dark-surface brand use if it remains crisp at navigation and footer sizes. Standardize its spacing and pair it with a simplified `LucaOS` wordmark rather than system-like acronym styling. |
| `icon_dark.png` | **Keep as-is** | Retain as the light-surface counterpart, subject to contrast and small-size QA. Theme switching should not change dimensions or layout. |

### New asset requirements

Premium Landing v2 will likely need purpose-built product visuals rather than only reusing old sci-fi assets:

1. **Hero composition** — hologram plus an optional restrained workspace frame, exported for both themes and responsive crops.
2. **Personal work mockup** — one request, visible context, and a finished artifact.
3. **Developer mockup** — workspace context, proposed tool use, and an inspectable action without terminal overload.
4. **Automation mockup** — a human-readable routine with boundaries and approval checkpoints.
5. **Governance mockup** — an approval or execution receipt with clear reasons and controls.
6. **Personal Intelligence mockup** — memory/preferences presented as understandable, editable information.
7. **VoiceHUD mockup** — calm voice state, transcript, and handoff back to work.
8. **LucaLink mockup** — Web, Desktop, and Mobile continuity with a visible approval-first handoff.

All screenshots should share:

- one window chrome system;
- one corner-radius family;
- one shadow and border treatment per theme;
- consistent type scale and UI density;
- equivalent light and dark presentation;
- no invented “live” status or capability claim;
- captions that explain the outcome rather than name every subsystem.

---

## 8. Implementation recommendation

### Option 1 — Static Landing v2 inside `landing/`

Rebuild the existing static page in place using the current HTML/CSS/JavaScript deployment model.

**Advantages**

- fastest path from approved plan to a visible redesign;
- lower tooling and migration risk;
- preserves the current Vercel root-directory setup and static routes;
- avoids coupling product-site work to the runtime application;
- makes it easier to compare v1 and v2 behavior within a familiar deployment;
- keeps download, legal, community, pitch, and resource routes intact.

**Tradeoffs**

- shared components remain convention-based rather than framework-enforced;
- large HTML files can become difficult to maintain;
- metadata, content reuse, and future page expansion require more manual discipline;
- design tokens and sections need careful organization to avoid another accumulation of patches.

**Required discipline if selected**

- rewrite the main page structure rather than layering new classes over old sections;
- define semantic tokens before styling sections;
- use small, named JavaScript behaviors only where interaction requires them;
- keep navigation, modal, theme, and form logic separate;
- archive or clearly remove obsolete section styles during implementation;
- retain `landing/` as the Vercel project root.

### Option 2 — New Next.js product site inside `site/`

Create a dedicated Next.js product site under `site/`, then point `lucaos.space` to that project root. Keep `landing/` as a backup and implementation reference until the new site passes QA.

**Advantages**

- better long-term component structure for cards, product frames, navigation, CTAs, and content sections;
- stronger metadata, structured data, image optimization, and scalable SEO control;
- easier route and layout reuse as resources, product pages, changelogs, and download experiences expand;
- clearer design-system enforcement across light/dark themes and responsive variants;
- a more maintainable base for future product-site iteration.

**Tradeoffs**

- higher initial setup and deployment risk;
- framework migration can distract from the immediate content and art-direction problem;
- current static subroutes need an explicit migration or rewrite plan;
- creates another JavaScript toolchain in a repository that already contains an application stack;
- requires Vercel project reconfiguration and rollback planning.

### Recommendation

Use **Option 1: Static Landing v2 inside `landing/` for the next implementation phase**.

The current quality gap is primarily strategy, copy, hierarchy, art direction, and responsive composition—not the absence of a component framework. Rebuilding the static page from this approved outline is the lowest-risk way to prove the new product story and visual system while preserving the deployed Vercel setup.

This recommendation is not a request for another patch pass. The static implementation should be a deliberate v2 rewrite of the landing page's structure and styling, with obsolete section patterns removed rather than restyled indefinitely.

Reconsider `site/` after Landing v2 is approved in production or when one of these triggers becomes real:

- the public site expands into several first-class product pages;
- content publishing or changelog workflows become frequent;
- SEO/structured-data needs outgrow static maintenance;
- multiple contributors require enforced component reuse;
- image and route optimization materially affect performance or operations.

If Option 2 is later selected, deploy `lucaos.space` from `site/`, preserve `landing/` as a temporary rollback/reference source, migrate all public routes deliberately, and remove the backup only after production validation.

---

## 9. Migration plan

### Phase 1 — Approve wording and structure

**Goal:** freeze the product story before visual implementation.

- review all draft headlines, subheadlines, cards, and CTAs;
- verify feature availability and safe-claim language;
- confirm the exact destinations for Download Preview, Launch App, and Join Early Access;
- choose Hero Option A or B, with Option A as the default;
- approve which architecture names appear and where;
- identify any unsupported provider, device, automation, or memory implication;
- produce a signed-off page outline and copy deck.

**Exit criterion:** no open disagreement about section order, hero promise, CTA labels, or core claims.

### Phase 2 — Create visual system tokens and component layout

**Goal:** establish one reusable design language before styling individual sections.

- define paired light/dark color tokens;
- define typography, spacing, radii, borders, shadows, and buttons;
- define content width and responsive grid;
- define header, badge, card, product frame, CTA, and footer patterns;
- create low-fidelity layouts for all ten sections;
- produce hero compositions and screenshot framing rules;
- inventory required new product mockups.

**Exit criterion:** all sections can be represented using a small, consistent pattern set without ad hoc colors or effects.

### Phase 3 — Build the desktop version

**Goal:** implement the approved narrative and visual rhythm at primary desktop widths.

- build the new semantic section structure;
- implement Hero Option A unless design review selects Option B;
- integrate approved copy and safe CTA destinations;
- add optimized product visuals as they become available;
- implement light and dark themes from shared semantic tokens;
- remove obsolete visual patterns rather than leaving hidden legacy layers;
- validate the narrative at approximately 1280px, 1440px, and 1728px widths.

**Exit criterion:** desktop reads as one authored product story and no section resembles an internal OS dashboard without a specific reason.

### Phase 4 — Build the mobile-first version

**Goal:** make mobile a first-class composition rather than a responsive afterthought.

- establish 320px, 390px, 430px, and tablet breakpoints;
- implement the stable mobile header and menu;
- set a deliberate hero crop and CTA stack;
- simplify proof and card layouts without removing meaning;
- verify section pacing and avoid excessive scroll caused by decorative media;
- ensure controls meet touch-target and focus requirements;
- test device handoff and governance visuals for readable small-screen states.

**Exit criterion:** the mobile page feels intentionally designed, with no overflow, crowded header, unreadable screenshot, or desktop-only composition.

### Phase 5 — QA light and dark modes

**Goal:** prove that both themes are complete, readable, and visually equivalent.

- run contrast checks for text, controls, badges, borders, and focus states;
- inspect every retained image against both palettes;
- verify theme switching causes no layout shift;
- test reduced motion, keyboard navigation, zoom, and high text scaling;
- validate asset weights, lazy loading, and layout stability;
- review copy and visuals for safe claims and preview labels;
- capture desktop and mobile screenshots in both themes for approval.

**Exit criterion:** neither theme feels adapted from the other, and all essential content remains readable without effects.

### Phase 6 — Deploy to Vercel

**Goal:** release safely without disrupting app or public subroutes.

- deploy a preview from the selected project root;
- verify `/`, legal, resources, community, pitch, and download routes;
- validate links to `app.lucaos.space` and early-access destinations;
- confirm metadata, favicon, social previews, canonical URL, and analytics behavior;
- run mobile and desktop production smoke tests;
- preserve a rollback point before promoting the deployment;
- publish only after founder approval of production-like screenshots.

**Exit criterion:** `lucaos.space` serves Landing v2, existing required routes remain valid, and rollback is documented.

---

## 10. Acceptance criteria

Landing v2 is ready only when all of the following are true.

### Product story

- [ ] The first screen clearly describes LucaOS as a personal AI operating system.
- [ ] Product outcomes appear before architecture and subsystem explanations.
- [ ] The hero uses the approved headline, subheadline, CTAs, and platform note.
- [ ] Cloud, Local, BYOK, and Model Router do not appear in the hero paragraph.
- [ ] Architecture is explained clearly in the lower-page “Intelligence that runs your way” section.
- [ ] Named products such as Personal Intelligence, VoiceHUD, VisualCore, LucaBrowser, and LucaLink are paired with plain-language benefits.
- [ ] Copy avoids generic SaaS filler and unsupported superlatives.

### Visual quality

- [ ] The page feels premium on both mobile and desktop.
- [ ] The design no longer depends on old sci-fi clutter, terminal styling, or dashboard density.
- [ ] The hologram remains recognizable as the LucaOS brand symbol without becoming background clutter.
- [ ] Typography, spacing, cards, buttons, badges, and product frames follow one system.
- [ ] Product screenshots or mockups use one consistent visual language.
- [ ] Accent color is restrained; fluorescent blue/purple glow does not dominate the page.
- [ ] Section rhythm varies intentionally and does not repeat one showcase template throughout.

### Theme and responsive behavior

- [ ] Light mode is pearl/white/silver, readable, and complete.
- [ ] Dark mode is black/code-grey, readable, and complete.
- [ ] Text and controls meet WCAG AA contrast targets.
- [ ] Hero imagery never conflicts with headline readability.
- [ ] The mobile header remains stable, uncluttered, and accessible.
- [ ] The page has no horizontal overflow at supported widths.
- [ ] Touch targets, focus states, reduced motion, and keyboard navigation are verified.

### Trust and claims

- [ ] The page explains approvals, runtime boundaries, user-controlled memory, and server-side secret handling accurately.
- [ ] Connected-device language remains approval-first and does not imply unrestricted access.
- [ ] Screen and browser context language reflects explicit permissions.
- [ ] Local model and BYOK language is limited to supported configurations.
- [ ] Preview, concept, early-access, and coming-soon capabilities are labeled honestly.
- [ ] Download buttons do not imply a production release where only a preview exists.
- [ ] CTA destinations are live and match their labels.

### Delivery

- [ ] Required public routes remain available after deployment.
- [ ] Both desktop and mobile screenshots are approved in light and dark modes.
- [ ] New image assets are optimized and do not cause avoidable layout shift.
- [ ] The implementation does not couple the public landing page to runtime app code.
- [ ] The final production page is reviewed as one end-to-end story, not only section by section.

---

## Final recommendation

Approve this content hierarchy and proceed with a **static Landing v2 rewrite inside `landing/`**. Build the page around Hero Option A, preserve the hologram as a disciplined brand symbol, replace outcome-critical legacy visuals with a coherent screenshot system, and defer architecture until the visitor understands what LucaOS helps them do.

The measure of success is not whether every LucaOS subsystem appears above the fold. It is whether a new visitor can understand the product in seconds, feel the quality and control in the design, and continue down the page to discover the deeper system with confidence.
