# Landing Page In-Place Modernization

## Decision context

PR #258 was closed and is intentionally not reused. Its direction compressed too much of the LucaOS architecture into the hero and reframed the existing hologram as an app-startup-style core orb. That weakened the production landing page's strongest quality: a premium, long-scroll marketing narrative in which each architecture idea receives its own visual section.

This modernization starts from the existing production landing implementation and updates it in place. It does not rebuild the site, migrate frameworks, or turn the page into a LucaOS boot/onboarding surface.

## Layout preservation strategy

The landing page keeps the established sequence and interaction model:

- mega-menu navigation and mobile navigation;
- light and dark themes;
- the large hologram-led hero;
- integration strip;
- product thesis cards;
- alternating visual showcase sections;
- dashboard, agent swarm, neural center, VoiceHUD, device, and onboarding visuals;
- architecture-focused positioning;
- Early Access modal and static subpage routes.

The visual update is additive: stronger glass surfaces, card depth, section spacing, button/focus states, responsive behavior, and more polished light/dark ambient color. The existing static HTML/CSS/JavaScript architecture remains intact.

## Section mapping

| Previous section | Modernized architecture section | Positioning change |
| --- | --- | --- |
| Not a Chatbot. An Operating System. | What is LucaOS? | Defines LucaOS as a governed operating layer rather than an isolated chat interface. |
| 220+ Tools. Every Domain. | Operation Center & Governed Tools | Covers Skills, MCP, connectors, browser operations, and automation without presenting every capability as production-ready. |
| The Autonomous Workforce. | Governed Agent Operations | Reframes autonomy around plans, review gates, approvals, runtime handoffs, and traceability. |
| Offline & Local Inference. | Intelligence Layer | Introduces Luca Prime, Local Models, BYOK, the Model Router, and hardware-aware local model management. |
| Full-Duplex Voice. | VoiceHUD & Multimodal Operation | Presents chat/voice modes, provider-aware audio, full-duplex direction, and the screen-context roadmap. |
| One Mind. Many Modes. | Personal Intelligence | Covers memory, preferences, knowledge, continuity, and Normal/Tactical/Origin modes. |
| Prism / hardware | LucaLink | Replaces purchase-oriented hardware claims with approval-first host and device handoffs across Web, Desktop, and Mobile. |
| One AI. Every Device. | Runtime Architecture | Establishes Web as the browser-safe control surface, Desktop as the native runtime, and Mobile as the companion shell. |
| Power Demands Responsibility. | Security & Governance | Emphasizes approvals, capability checks, user-controlled memory, frontend secret boundaries, and Desktop-only native capabilities. |
| Boot Up in 60 Seconds. | Begin with LucaOS | Keeps the onboarding story while removing the hard time promise and explaining Early Access setup choices. |
| Beyond the Competition. | Beyond a typical chat interface. | Replaces unsupported brand comparisons with architecture-focused positioning. |
| Infinite Skill Toolbox | Skills, MCP & Connectors | Clarifies runtime-dependent availability and governed sensitive operations. |
| Sovereign AI roadmap/final CTA | Build the LucaOS Direction with Us | Adds Early Access, Launch App, and public GitHub destinations. |

## Claims downgraded or removed

The modernization removes or qualifies claims that implied capabilities or guarantees beyond the current product state:

- absolute "Zero-Cloud," "data never leaves hardware," "100% offline," and "No Cloud Audio" language;
- `v1.0` and production download language where no download artifact is offered;
- fire-and-forget or unattended autonomy promises;
- direct kernel-level access wording;
- the claim that 220+ tools are all production-ready;
- purchase, preorder, and speculative Prism hardware positioning;
- hard onboarding time promises;
- direct Web-to-device control without a Desktop-capable bridge and approval;
- aggressive named-competitor comparisons.

Preferred status language is **Early Access**, **Preview**, **Coming soon**, **direction**, or **roadmap**. Runtime-sensitive capabilities are described as capability-checked, approval-first, and dependent on the active runtime/provider.

## Hologram preservation rule

The large `landing/hologram.png` hero image remains the dominant visual and retains its full-field placement. It must not be wrapped in orbit cards, converted into a core orb, surrounded by architecture modules, or presented as a startup/onboarding control. The hero sells the brand and vision with a headline, short architecture-level subheadline, platform/intelligence badges, and two calls to action. Detailed architecture belongs in the dedicated sections below.

## Domain and CTA rules

- `https://lucaos.space/` is the canonical production marketing domain.
- `https://app.lucaos.space` is the **Launch App** destination and represents the LucaOS Web control surface.
- `https://api.lucaos.space` is reserved for the future Luca Runtime API and is not presented as a currently available production API.
- `https://github.com/luca-dynamics/LucaOS` is the public repository destination.
- **Join Early Access** opens the existing landing-page waitlist flow.
- Desktop and Mobile route pages remain available as static preview/direction pages; they must not imply that production downloads exist unless an actual artifact is provided.
