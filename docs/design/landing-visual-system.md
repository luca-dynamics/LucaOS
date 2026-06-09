# LucaOS landing visual system

## Direction

The LucaOS landing page uses a premium, futuristic glass language: cinematic rather than cyberpunk, technically confident rather than noisy, and polished in both light and dark modes. Large quiet spaces, crisp typography, translucent surfaces, restrained cyan/blue/violet light, and subtle depth should make the product feel like an operating layer rather than another chatbot wrapper.

The implementation remains static HTML, CSS, and JavaScript for this release. Components are expressed as reusable class patterns so the visual system can later transfer to a component framework.

## Core identity: the Luca intelligence core

The Luca face is the central product identity, not a decorative mascot or generic AI mark.

- `icon.png` and `icon_dark.png` remain the theme-aware navigation identity.
- `favicon.png` remains the browser identity.
- `hologram.png` remains the large central hero symbol.
- The hero presents the hologram inside a frosted glass orb with layered rings, radial light, subtle bloom, and slow motion.
- Floating capability cards orbit the core and name Model Router, Personal Intelligence, VoiceHUD, LucaLink, VisualCore, Local Models, and BYOK.
- The centerpiece scales down gracefully on mobile and preserves a strong silhouette in both themes.
- Generic robot art, stock illustrations, and substitute abstract AI logos should not replace this treatment.

## Visual tokens

### Dark mode

- Canvas: `#050507`
- Secondary canvas: `#09090d`
- Elevated canvas: `#111117`
- Primary text: `#f7f8fb`
- Secondary text: muted cool gray
- Glass: `rgba(255, 255, 255, 0.06)`
- Strong glass: `rgba(17, 17, 23, 0.78)`
- Border: `rgba(255, 255, 255, 0.12)`

### Light mode

- Canvas: `#f7f8fb`
- Secondary canvas: `#ffffff`
- Elevated canvas: `#eef1f7`
- Primary text: deep ink
- Secondary text: cool slate
- Glass: `rgba(255, 255, 255, 0.72)`
- Strong glass: `rgba(255, 255, 255, 0.88)`
- Border: `rgba(10, 10, 20, 0.08)`

### Shared effects

- Accent cyan: restrained, used for runtime/state emphasis.
- Accent blue: primary interactive color.
- Accent violet: intelligence/personal-context emphasis.
- Standard glass blur: `blur(24px) saturate(180%)`.
- Borders stay one pixel and low contrast.
- Shadows are broad and soft; glow is reserved for the core, active controls, and key CTAs.
- Motion uses slow floating, halo breathing, and reveal transitions; `prefers-reduced-motion` disables nonessential animation.

## Typography and spacing

- Use a modern system-first sans stack for interface clarity and resilient loading.
- Headlines use tight tracking, balanced wrapping, and high contrast rather than ornamental display fonts.
- Monospace is reserved for status labels, architecture paths, and capability metadata.
- Sections use generous vertical rhythm, a constrained content width, and asymmetrical editorial layouts where product previews are present.
- Cards use consistent radii, inner highlights, and hover elevation without excessive tilt or neon effects.

## Section architecture

1. Frosted navigation with five product-oriented mega-menu labels.
2. Intelligence Core hero with the large Luca hologram and orbiting capability cards.
3. Operating-system thesis.
4. Runtime architecture across Web, Desktop, and Mobile.
5. Routed intelligence across Luca Prime, local models, and BYOK.
6. Personal Intelligence and context continuity.
7. Operation Center, governed tools, Skills, MCP, connectors, and automation previews.
8. VoiceHUD and multimodal interaction.
9. VisualCore, Luca Screen, and LucaBrowser.
10. LucaLink and approval-based host/device continuity.
11. Security and runtime governance.
12. Architecture-focused positioning matrix.
13. Early Access, Launch App, and GitHub CTA.

## Component patterns

- **Glass navigation:** sticky inset surface, blur, subtle border, scroll-state shadow, accessible desktop mega menus, and a compact mobile drawer.
- **Primary CTA:** luminous blue gradient with a soft glow; used for Early Access.
- **Secondary CTA:** neutral glass; used for Launch App and GitHub.
- **Architecture cards:** status eyebrow, clear title, boundary-aware description, and concise capability list.
- **Product previews:** reuse `dashboard_preview.png`, `agent_swarm.png`, `neural_center.png`, and `voicehud_preview.png` inside framed glass presentation surfaces.
- **Comparison matrix:** compares LucaOS surfaces and boundaries, not unverifiable competitor capabilities.
- **Waitlist modal:** centered strong-glass sheet with focus management, platform interests, explicit preview wording, and no false submission/backend promise.

## Theme behavior

- A tiny inline head script applies a saved theme before paint when possible.
- If no preference has been saved, the page follows `prefers-color-scheme`.
- The toggle updates `localStorage`, its accessible label, and the navigation icon (`icon.png` / `icon_dark.png`).
- The system preference remains live only until the visitor makes an explicit choice.

## Content and capability rules

- Describe LucaOS as a personal AI operating system and operating layer.
- Distinguish the Web browser-safe control surface from Desktop-only native capabilities.
- Describe Mobile as a companion release target for voice, continuity, and control.
- Use “Early Access,” “Preview,” “Coming soon,” and “future Runtime API” where availability is not production-ready.
- Describe local/cloud/BYOK routing as user-selected and capability-aware; never promise that all data always remains local.
- Describe host/device actions as approval-first and runtime-checked.
- Treat tools, agents, MCP, Skills, connectors, and automation as governed and evolving rather than universally production-ready.

## CTA and domain rules

- `https://lucaos.space` is canonical and hosts the public product site.
- `https://app.lucaos.space` is the Launch App destination for the Web app/dashboard.
- `https://api.lucaos.space` is reserved for the future hosted Runtime API and must not be presented as a current user-facing app.
- `https://docs.lucaos.space` is labeled “Coming soon” until documentation is ready.
- `https://github.com/luca-dynamics/LucaOS` is the repository destination.
- Do not introduce a separate legacy Web subdomain or legacy company-domain app/API examples.
- Download pages should use preview/waitlist language until production downloads are verified.

## Future framework recommendation

A later project may migrate `lucaos.space` to React or Next.js when the product site needs shared application components, structured content, richer analytics, server-rendered documentation, or a larger publishing workflow. That migration should use this document and the static page as the accepted content/visual specification. It should not be bundled into this modernization PR because changing framework, deployment, design, messaging, and URLs simultaneously would create unnecessary risk.
