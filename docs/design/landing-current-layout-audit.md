# LucaOS landing page — current layout audit

## Scope and baseline

This audit records the production static landing page promoted in PR #256 before its modernization. The repository checkout begins at merge commit `482bfcf`, which contains that promotion. PR #257 is intentionally not incorporated because it duplicates and conflicts with the promoted landing page.

The existing page is not a blank slate. Its navigation system, Luca face identity, centerpiece hologram, product previews, alternating showcase rhythm, comparison concept, early-access modal, theme support, and static Vercel deployment are valuable foundations.

## 1. Current section order

1. Navigation with OS, Technology, Ecosystem, and Company mega menus.
2. Hero — “Your Intelligence. Your Hardware. Your Rules.” with the large Luca hologram, release/download CTAs, and model/integration logos.
3. “Not a Chatbot. An Operating System.” — three feature cards for sovereignty/local operation, memory, and runtime reach.
4. “220+ Tools. Every Domain.” — terminal/tool showcase.
5. “The Autonomous Workforce.” — agent swarm showcase.
6. “Offline & Local Inference.” — neural center and local-model showcase.
7. “Full-Duplex Voice.” — VoiceHUD preview.
8. “One Mind. Many Modes.” — persona/mode presentation.
9. “Prism V1. The Physical Link.” — conceptual hardware section.
10. “One AI. Every Device.” — platform/dashboard presentation.
11. “Power Demands Responsibility.” — security positioning.
12. “Boot Up in 60 Seconds.” — onboarding flow.
13. “Beyond the Competition.” — competitor comparison table.
14. “Your Infinite Skill Toolbox.” — extensibility/tools presentation.
15. “The Path to Sovereign AI.” — roadmap/open-source positioning.
16. Footer and waitlist modal.

## 2. Existing sections to preserve

- **Mega-menu navigation:** preserve the premium information architecture and adapt it to current product language.
- **Hero and Luca centerpiece:** preserve the Luca face/hologram as the page’s dominant product symbol.
- **“Not a Chatbot” thesis:** preserve as the clearest high-level explanation of an AI operating layer.
- **Integration/model strip:** preserve as compact proof that LucaOS routes across an ecosystem rather than representing one model.
- **Feature-card and alternating showcase rhythm:** preserve the editorial pacing and reusable visual grammar.
- **Dashboard preview:** preserve as a concrete view of the Web control surface.
- **Agent swarm and neural center visuals:** preserve as supporting imagery, but reframe around governed operations and model routing rather than autonomous or absolute claims.
- **VoiceHUD preview:** preserve and elevate under multimodal operation.
- **Modes/personas concept:** preserve where it accurately maps to Origin, Tactical, and Normal modes.
- **Onboarding flow:** preserve in a reduced form as an early-access path, without a guaranteed “60 seconds” promise.
- **Comparison concept:** preserve only as architecture-focused positioning with qualified, non-competitor claims.
- **Waitlist modal, dark/light mode, and static Vercel deployment:** preserve and polish.

## 3. Sections to rename

| Current name | Modernized name |
| --- | --- |
| Your Intelligence. Your Hardware. Your Rules. | LucaOS Intelligence Core |
| Not a Chatbot. An Operating System. | What is LucaOS? |
| 220+ Tools. Every Domain. | Operation Center & governed tools |
| The Autonomous Workforce. | Governed agent operations |
| Offline & Local Inference. | Intelligence layer |
| Full-Duplex Voice. | VoiceHUD & multimodal operation |
| One Mind. Many Modes. | Personal Intelligence |
| One AI. Every Device. | Runtime architecture |
| Power Demands Responsibility. | Security & governance |
| Boot Up in 60 Seconds. | Begin with LucaOS |
| Beyond the Competition. | Architecture, not another chat tab |
| Your Infinite Skill Toolbox. | Skills, MCP & connectors |
| The Path to Sovereign AI. | Early Access roadmap |

## 4. Sections to remove, downgrade, or merge

- **Prism V1 hardware:** remove from the primary homepage flow. Hardware purchase/pre-order messaging is premature; LucaLink and future host/device expansion communicate the useful architecture without implying available hardware.
- **Agent swarm:** merge into Operation Center and governed tools. “Autonomous workforce” overstates unattended production behavior.
- **Toolbox and 220+ tools:** merge into one governed operations section; describe skills, MCP, connectors, browser operations, and automation as evolving/preview capabilities.
- **Neural center and local inference:** merge into the broader intelligence layer covering Luca Prime, local models, BYOK, Model Router, and hardware-aware management.
- **Personas:** merge into Personal Intelligence and present modes as interaction/context modes rather than separate personalities with guaranteed behavior.
- **Onboarding:** downgrade from a speed promise to a concise early-access journey.
- **Competitive table:** replace named or absolute competitor assertions with a LucaOS architecture matrix.
- **Open-source roadmap:** merge into the final CTA and link to the real GitHub repository.

## 5. Outdated or overly strong claims

The following claims need removal or qualification:

- “Zero-Cloud” and “Your data never leaves your hardware” ignore Luca Prime, BYOK providers, and user-selected cloud routing.
- “100% offline” and “No Cloud Audio” are absolutes that depend on chosen runtime, model, provider, and voice configuration.
- “v1.0” is not appropriate without a verified production release.
- “Download for macOS” and equivalent production download language should become preview or waitlist language until signed production artifacts are available.
- “Pre-order Prism” and hardware availability language should be removed until a real product and fulfillment path exist.
- “220+ tools” should not imply that every tool is production-ready; extensibility can be described without a hard readiness claim.
- “Direct kernel-level access” is unsafe-sounding and broader than the intended desktop capability boundary.
- Browser-native device control must be reframed as a Web control surface that requests approved actions through a Desktop runtime or linked host.
- Guaranteed autonomous agents, instant onboarding, universal compatibility, or fully private operation should be replaced with preview, runtime-aware, and user-governed language.

## 6. Luca face / hologram preservation and upgrade

The large Luca face is the strongest distinct identity element in the existing page and must remain more than a navbar logo. The modernization should place `hologram.png` inside a responsive frosted “intelligence core” orb with:

- layered radial halos and restrained cyan/blue/violet glow;
- a translucent shell, inner ring, soft edge highlights, and backdrop blur;
- theme-aware contrast so the same concept feels intentional in dark and light modes;
- slow, reduced-motion-safe float/pulse animation;
- floating glass capability cards for Model Router, Personal Intelligence, VoiceHUD, LucaLink, VisualCore, Local Models, and BYOK;
- accessible alt text and decorative layers hidden from assistive technology.

This treatment retains the original large central product-symbol concept while making the face feel like the intelligence core coordinating the LucaOS architecture.

## 7. Proposed new section order

1. Premium glass navigation: Product, Runtime, Intelligence, Security, Resources.
2. Hero: LucaOS Intelligence Core with large Luca hologram, Early Access and Launch App CTAs, and platform/intelligence badges.
3. What is LucaOS?
4. Runtime architecture: Web, Desktop, Mobile.
5. Intelligence layer: Luca Prime, Local Models, BYOK, Model Router, hardware-aware management.
6. Personal Intelligence: memory, preferences, knowledge, continuity, and modes.
7. Operation Center & governed tools: tools, Skills, MCP, connectors, browser operations, and automation previews.
8. VoiceHUD & multimodal operation.
9. VisualCore, Luca Screen & LucaBrowser.
10. LucaLink: approved device/host linking and continuity.
11. Security & governance.
12. Architecture-focused positioning comparison.
13. Final Early Access CTA and footer.

## 8. Why keep the static implementation in this PR

The production landing target is already isolated in `landing/`, deploys directly through `landing/vercel.json`, and does not need the root LucaOS application toolchain. Keeping HTML, CSS, and small vanilla JavaScript changes in this PR:

- limits risk to the public marketing surface;
- avoids coupling the landing deployment to the root Vite app, Electron runtime, or dashboard dependencies;
- preserves the deployment model established by PR #256;
- makes content, claim, domain, accessibility, and responsive-layout changes easy to review;
- avoids mixing a framework migration with a substantial messaging and visual redesign;
- provides a stable visual/content specification for a later React or Next.js product-site migration.
