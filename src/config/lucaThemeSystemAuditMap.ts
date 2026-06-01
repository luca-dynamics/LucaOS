export const lucaThemeAuditHardcodedColorRiskLabels = [
  "none-observed",
  "token-backed",
  "accent-dominance",
  "terminal-green-assumption",
  "electric-blue-assumption",
  "purple-persona-assumption",
  "amber-tactical-assumption",
  "unscoped-rgba",
  "direct-tailwind-color",
  "hardcoded-hex",
  "gradient-glow-hardcoded",
  "light-dark-branch-local",
  "surface-opacity-risk",
] as const;

export type LucaThemeAuditHardcodedColorRiskLabel =
  (typeof lucaThemeAuditHardcodedColorRiskLabels)[number];

export const lucaThemeAuditPremiumAlignmentLabels = [
  "premium-aligned",
  "mostly-aligned-needs-tokenization",
  "mixed-needs-separation",
  "too-tactical-for-default",
  "too-loud-for-default",
  "accessibility-risk",
  "unknown-needs-visual-qa",
] as const;

export type LucaThemeAuditPremiumAlignmentLabel =
  (typeof lucaThemeAuditPremiumAlignmentLabels)[number];

export type LucaThemeAuditSurfaceArea =
  | "theme-source"
  | "settings-appearance"
  | "boot"
  | "onboarding"
  | "desktop-shell"
  | "mobile-shell"
  | "widget"
  | "overlay"
  | "tailwind-css";

export type LucaThemeAuditDeviceRelevance =
  | "desktop"
  | "mobile"
  | "desktop-and-mobile"
  | "system-wide";

export type LucaThemeAuditContrastRisk =
  | "low"
  | "medium"
  | "high"
  | "needs-manual-qa";

export interface LucaThemeSystemAuditEntry {
  surfaceId: string;
  surfaceArea: LucaThemeAuditSurfaceArea;
  fileOrComponent: string;
  currentThemeUsage: string;
  tokenUsage: string;
  hardcodedColorUsage: string;
  hardcodedColorRiskLabels: LucaThemeAuditHardcodedColorRiskLabel[];
  visualRole: string;
  deviceRelevance: LucaThemeAuditDeviceRelevance;
  accessibilityContrastRisk: LucaThemeAuditContrastRisk;
  premiumAlignment: LucaThemeAuditPremiumAlignmentLabel;
  futureRecommendation: string;
}

export const lucaThemeSystemCurrentDefaultsAudit = {
  defaultPersona: "ASSISTANT",
  defaultTheme: "PROFESSIONAL",
  defaultBackgroundOpacity: 0.3,
  defaultBackgroundBlur: 40,
  syncThemeWithPersonaDefault: true,
  getThemeColorsFallback: "PROFESSIONAL",
  bootReceivesThemeFromApp: true,
  onboardingThemeSelectionWrites: "general.theme",
  behaviorChangeInThisPr: false,
} as const;

export const lucaThemeSystemPremiumTokenDirection = [
  "appearanceMode",
  "productTheme",
  "accent",
  "backgroundBase",
  "backgroundElevated",
  "backgroundLiquid",
  "surfaceGlass",
  "surfaceSolid",
  "surfaceHover",
  "borderSubtle",
  "borderStrong",
  "textPrimary",
  "textSecondary",
  "textTertiary",
  "accentPrimary",
  "accentSoft",
  "danger",
  "success",
  "warning",
  "info",
  "shadowSoft",
  "shadowGlow",
  "blurLevel",
  "motionStyle",
  "reducedMotion",
  "reducedTransparency",
  "highContrast",
] as const;

export const lucaThemeSystemAuditMap: LucaThemeSystemAuditEntry[] = [
  {
    surfaceId: "theme-palette-persona-config",
    surfaceArea: "theme-source",
    fileOrComponent: "src/config/themeColors.ts",
    currentThemeUsage:
      "THEME_PALETTE and PERSONA_UI_CONFIG combine persona ids, theme ids, Tailwind utility classes, hex accents, glow classes, and light-mode flags.",
    tokenUsage:
      "Exports --rq-* brand variables and app-level dynamic contrast values, but does not expose a complete semantic surface/text/border/background token contract.",
    hardcodedColorUsage:
      "Palette contains electric blue, surgical green, terracotta, purple, hot pink/cyan vaporwave, frost cyan, rgba dim colors, and Tailwind class strings.",
    hardcodedColorRiskLabels: [
      "accent-dominance",
      "terminal-green-assumption",
      "electric-blue-assumption",
      "purple-persona-assumption",
      "amber-tactical-assumption",
      "unscoped-rgba",
      "hardcoded-hex",
    ],
    visualRole:
      "Root visual identity, persona color mapping, and legacy component fallback.",
    deviceRelevance: "system-wide",
    accessibilityContrastRisk: "medium",
    premiumAlignment: "mixed-needs-separation",
    futureRecommendation:
      "Split appearance mode/product theme/accent/persona behavior into separate token layers while preserving current ids as compatibility aliases during migration.",
  },
  {
    surfaceId: "dynamic-contrast-engine",
    surfaceArea: "theme-source",
    fileOrComponent: "src/config/themeColors.ts#getDynamicContrast",
    currentThemeUsage:
      "Computes text, muted text, border, background tint, and main background from theme id plus background opacity.",
    tokenUsage:
      "Feeds --app-text-main, --app-text-muted, --app-border-main, --app-bg-tint, and --app-bg-main through App settings application.",
    hardcodedColorUsage:
      "Uses local white, slate, cream, charcoal, and rgba values with an opacity threshold model.",
    hardcodedColorRiskLabels: [
      "token-backed",
      "unscoped-rgba",
      "hardcoded-hex",
      "surface-opacity-risk",
    ],
    visualRole:
      "Runtime contrast bridge for glass/background opacity controls.",
    deviceRelevance: "system-wide",
    accessibilityContrastRisk: "medium",
    premiumAlignment: "mostly-aligned-needs-tokenization",
    futureRecommendation:
      "Keep the adaptive idea, but move thresholds and values into named contrast tokens with explicit reduced-transparency and high-contrast branches.",
  },
  {
    surfaceId: "tailwind-rq-extension",
    surfaceArea: "tailwind-css",
    fileOrComponent: "tailwind.config.js",
    currentThemeUsage:
      "Defines rq-base/rq-panel as black surfaces and rq-blue/rq-green/rq-amber CSS-variable accents plus static red, border, and sci-cyan tokens.",
    tokenUsage: "Partial Tailwind token bridge for legacy rq colors only.",
    hardcodedColorUsage:
      "Static black panels, slate border, red, cyan, and rgba dim values remain in Tailwind extension.",
    hardcodedColorRiskLabels: [
      "electric-blue-assumption",
      "terminal-green-assumption",
      "amber-tactical-assumption",
      "hardcoded-hex",
      "unscoped-rgba",
    ],
    visualRole: "Utility-class color bridge for application surfaces.",
    deviceRelevance: "system-wide",
    accessibilityContrastRisk: "medium",
    premiumAlignment: "too-tactical-for-default",
    futureRecommendation:
      "Add semantic Tailwind aliases only after token foundation exists; keep rq aliases as compatibility shims until all surfaces migrate.",
  },
  {
    surfaceId: "app-css-variable-injection",
    surfaceArea: "theme-source",
    fileOrComponent: "src/App.tsx",
    currentThemeUsage:
      "App reads general.theme, general.persona, opacity, blur, font scale, and font family from settings and writes --app-* CSS variables plus light-mode class.",
    tokenUsage: "Primary app-wide runtime CSS variable injection point.",
    hardcodedColorUsage:
      "Uses local defaults for opacity/blur and relies on theme.isLight instead of a formal appearance mode token.",
    hardcodedColorRiskLabels: ["token-backed", "light-dark-branch-local"],
    visualRole:
      "Global renderer bridge between persisted settings and visual surfaces.",
    deviceRelevance: "system-wide",
    accessibilityContrastRisk: "medium",
    premiumAlignment: "mostly-aligned-needs-tokenization",
    futureRecommendation:
      "Retain as the variable injector, but source variables from a typed semantic token resolver rather than persona config and local light checks.",
  },
  {
    surfaceId: "settings-persona-appearance",
    surfaceArea: "settings-appearance",
    fileOrComponent: "src/components/settings/SettingsGeneralTab.tsx",
    currentThemeUsage:
      "General settings includes Sync Visuals with Persona, persona selection, theme selection, typography, background opacity, and blur controls.",
    tokenUsage:
      "Uses --app-text-main, --app-text-muted, --app-border-main, --app-bg-tint, and theme.hex for control accents.",
    hardcodedColorUsage:
      "Includes local rgba fallbacks, white toggles, direct Tailwind opacity classes, and theme.hex accent fills.",
    hardcodedColorRiskLabels: [
      "token-backed",
      "unscoped-rgba",
      "direct-tailwind-color",
      "accent-dominance",
    ],
    visualRole: "User-facing appearance/persona control surface.",
    deviceRelevance: "desktop-and-mobile",
    accessibilityContrastRisk: "medium",
    premiumAlignment: "mixed-needs-separation",
    futureRecommendation:
      "Separate Appearance, Accent, and Persona controls in a later PR; keep the current persistence behavior unchanged until migration policy is approved.",
  },
  {
    surfaceId: "boot-visual-shell",
    surfaceArea: "boot",
    fileOrComponent: "src/components/boot/LucaBootVisualShell.tsx",
    currentThemeUsage:
      "Receives the active App theme, uses LiquidBackground, theme.hex glow, and --app-* text/border/background variables for the universal boot shell.",
    tokenUsage:
      "Good app token usage for text, borders, and panel tint; accent glow remains theme.hex driven.",
    hardcodedColorUsage:
      "Uses radial gradients, white inset rgba, and theme-derived glows rather than semantic glow/surface tokens.",
    hardcodedColorRiskLabels: [
      "token-backed",
      "gradient-glow-hardcoded",
      "unscoped-rgba",
      "accent-dominance",
    ],
    visualRole:
      "Startup identity, liquid orb, progress, readiness cards, and fallback-first impression.",
    deviceRelevance: "system-wide",
    accessibilityContrastRisk: "needs-manual-qa",
    premiumAlignment: "mostly-aligned-needs-tokenization",
    futureRecommendation:
      "Preserve current boot behavior; later route boot through neutral surface/glow tokens and QA every legacy theme for readability.",
  },
  {
    surfaceId: "liquid-background",
    surfaceArea: "boot",
    fileOrComponent: "src/components/visual/LiquidBackground.tsx",
    currentThemeUsage:
      "Uses theme.hex or color prop for gradients, treats lightcream/lucagent/light as light themes, and branches web/electron backgrounds.",
    tokenUsage:
      "Reads --app-bg-opacity and --app-bg-blur, but background bases and gradients are local constants.",
    hardcodedColorUsage:
      "Contains cream, silver-ish, charcoal, #00ffff fallback, grid #6c6a58, SVG noise, and radial gradient formulas.",
    hardcodedColorRiskLabels: [
      "hardcoded-hex",
      "gradient-glow-hardcoded",
      "light-dark-branch-local",
      "electric-blue-assumption",
      "surface-opacity-risk",
    ],
    visualRole: "Global liquid/depth background behind boot and app shell.",
    deviceRelevance: "system-wide",
    accessibilityContrastRisk: "medium",
    premiumAlignment: "mostly-aligned-needs-tokenization",
    futureRecommendation:
      "Promote backgroundLiquid/backgroundBase/blurLevel tokens; refine Luca Silver and Luca Graphite without changing current LiquidBackground in this audit PR.",
  },
  {
    surfaceId: "onboarding-theme-selection",
    surfaceArea: "onboarding",
    fileOrComponent: "src/components/Onboarding/ThemeSelectionStep.tsx",
    currentThemeUsage:
      "Theme cards write general.theme, update --app-primary and --app-* contrast variables, and expose opacity/blur previews during first-run.",
    tokenUsage:
      "Uses THEME_PALETTE, getDynamicContrast, and app CSS variables.",
    hardcodedColorUsage:
      "Theme card metadata includes gradients, descriptions, and color expectations; preview glow uses theme primary values.",
    hardcodedColorRiskLabels: [
      "token-backed",
      "gradient-glow-hardcoded",
      "accent-dominance",
    ],
    visualRole: "First-run theme choice and visual personalization handoff.",
    deviceRelevance: "desktop-and-mobile",
    accessibilityContrastRisk: "medium",
    premiumAlignment: "mixed-needs-separation",
    futureRecommendation:
      "Later replace persona-like theme cards with Appearance + Accent choices, but keep existing onboarding write path during this audit.",
  },
  {
    surfaceId: "onboarding-hologram-face",
    surfaceArea: "onboarding",
    fileOrComponent: "src/components/Onboarding/HologramFace.tsx",
    currentThemeUsage:
      "Uses theme color props for embodied face/glow rendering during onboarding.",
    tokenUsage:
      "Partial; relies on passed theme/accent values rather than semantic face tokens.",
    hardcodedColorUsage:
      "Canvas and component-local glow/color effects are accent-driven and require visual QA across light modes.",
    hardcodedColorRiskLabels: ["accent-dominance", "gradient-glow-hardcoded"],
    visualRole: "Embodied Luca presence during first-run setup.",
    deviceRelevance: "desktop-and-mobile",
    accessibilityContrastRisk: "needs-manual-qa",
    premiumAlignment: "unknown-needs-visual-qa",
    futureRecommendation:
      "Add embodied-presence tokens for face glow, neutral idle state, active accent, and contrast-safe outlines.",
  },
  {
    surfaceId: "desktop-shell-panels",
    surfaceArea: "desktop-shell",
    fileOrComponent: "src/App.tsx left/center/right panel composition",
    currentThemeUsage:
      "Desktop shell passes theme into ChatPanel, VisualCore, left panel content, right panels, and panel tabs while mixing --app-* variables and theme.primary/theme.border classes.",
    tokenUsage: "Partial app variable usage with legacy persona class strings.",
    hardcodedColorUsage:
      "Contains direct bg-white/5, border-white/10, bg-black/30, lucagent-specific branches, emerald active status, and local rgba panel backgrounds.",
    hardcodedColorRiskLabels: [
      "direct-tailwind-color",
      "unscoped-rgba",
      "light-dark-branch-local",
      "accent-dominance",
      "terminal-green-assumption",
    ],
    visualRole:
      "Primary desktop workspace hierarchy: navigation, Luca workspace, operations/activity rail.",
    deviceRelevance: "desktop",
    accessibilityContrastRisk: "high",
    premiumAlignment: "mixed-needs-separation",
    futureRecommendation:
      "Migrate panel, tab, divider, selected, and status styles to semantic shell tokens in staged desktop-shell PRs.",
  },
  {
    surfaceId: "mobile-shell-navigation",
    surfaceArea: "mobile-shell",
    fileOrComponent:
      "src/App.tsx mobile DATA/SYSTEM navigation and src/components/mobile/*",
    currentThemeUsage:
      "Mobile shell reuses theme.primary and selected app state, with lucagent-specific light branches and black/white nav surfaces.",
    tokenUsage: "Partial; not equivalent to desktop token coverage.",
    hardcodedColorUsage:
      "Uses bg-white, bg-black, border-slate-200, border-white/10, text-slate-500, and local rgba panel backgrounds.",
    hardcodedColorRiskLabels: [
      "direct-tailwind-color",
      "light-dark-branch-local",
      "unscoped-rgba",
    ],
    visualRole: "Mobile bottom navigation and mobile panel/card surfaces.",
    deviceRelevance: "mobile",
    accessibilityContrastRisk: "high",
    premiumAlignment: "mixed-needs-separation",
    futureRecommendation:
      "Create shared desktop/mobile navigation and surface tokens so mobile follows the same Luca Silver/Graphite appearance contract.",
  },
  {
    surfaceId: "hologram-widget",
    surfaceArea: "widget",
    fileOrComponent: "src/components/Hologram/HologramWidget.tsx",
    currentThemeUsage:
      "Embodied hologram widget consumes active persona/theme props and visualizes Luca presence independently from main panel surfaces.",
    tokenUsage:
      "Mostly prop-based theme use; widget-specific surface tokens are not formalized.",
    hardcodedColorUsage:
      "Likely direct glow, text, and border classes around the hologram shell; needs token migration with VisualCore.",
    hardcodedColorRiskLabels: [
      "accent-dominance",
      "gradient-glow-hardcoded",
      "direct-tailwind-color",
    ],
    visualRole: "Always-available embodied AI widget.",
    deviceRelevance: "desktop-and-mobile",
    accessibilityContrastRisk: "needs-manual-qa",
    premiumAlignment: "unknown-needs-visual-qa",
    futureRecommendation:
      "Define widgetSurface, widgetBorder, embodiedGlow, and widgetText tokens before redesigning hologram visuals.",
  },
  {
    surfaceId: "mini-chat-widget",
    surfaceArea: "widget",
    fileOrComponent: "src/components/ChatWidget*.tsx",
    currentThemeUsage:
      "Chat widget family uses active theme props, widget controls, and class-level glass/foreground styles.",
    tokenUsage: "Partial app variable usage with many component-level classes.",
    hardcodedColorUsage:
      "Direct Tailwind text/background/border classes appear throughout widget controls and history/input states.",
    hardcodedColorRiskLabels: ["direct-tailwind-color", "accent-dominance"],
    visualRole:
      "Compact conversation surface outside the full desktop workspace.",
    deviceRelevance: "desktop-and-mobile",
    accessibilityContrastRisk: "medium",
    premiumAlignment: "mixed-needs-separation",
    futureRecommendation:
      "Migrate widget shell, input, history, selected, and hover states to shared chat tokens.",
  },
  {
    surfaceId: "voice-hud-vision-hud",
    surfaceArea: "widget",
    fileOrComponent:
      "src/components/VoiceHUD.tsx and src/components/VisionHUD.tsx",
    currentThemeUsage:
      "HUDs accept themeColor/theme.hex and render status visuals, waveform/vision accents, and overlay controls.",
    tokenUsage: "Mostly prop-based accent usage, not semantic HUD tokens.",
    hardcodedColorUsage:
      "VisionHUD has a purple default and themeColor-driven drawing; voice/vision status colors need token classification.",
    hardcodedColorRiskLabels: [
      "purple-persona-assumption",
      "accent-dominance",
      "hardcoded-hex",
    ],
    visualRole: "Voice, listening, and vision state overlays.",
    deviceRelevance: "desktop-and-mobile",
    accessibilityContrastRisk: "needs-manual-qa",
    premiumAlignment: "mixed-needs-separation",
    futureRecommendation:
      "Add HUD tokens for listening/speaking/thinking/status states and keep accent optional rather than default-dominant.",
  },
  {
    surfaceId: "visual-core-luca-screen",
    surfaceArea: "widget",
    fileOrComponent:
      "src/components/VisualCore.tsx and runtime VisualCore panels",
    currentThemeUsage:
      "VisualCore consumes theme props and app state to render Luca's central visual surface, browser governed modes, and display sessions.",
    tokenUsage:
      "Partial, with VisualCore-specific styling outside a semantic token contract.",
    hardcodedColorUsage:
      "Central visual surface includes direct glass, dark, border, glow, and accent usage that can diverge from shell tokens.",
    hardcodedColorRiskLabels: [
      "direct-tailwind-color",
      "gradient-glow-hardcoded",
      "accent-dominance",
    ],
    visualRole: "Primary Luca screen / embodied workspace center.",
    deviceRelevance: "desktop-and-mobile",
    accessibilityContrastRisk: "high",
    premiumAlignment: "mixed-needs-separation",
    futureRecommendation:
      "Tokenize VisualCore as a first-class product surface after shell token foundation lands.",
  },
  {
    surfaceId: "browser-overlay-panels",
    surfaceArea: "overlay",
    fileOrComponent: "src/components/browser/*, src/surfaces/*, overlay panels",
    currentThemeUsage:
      "Browser and overlay panels use theme props plus local governance/status styling for modals and approval surfaces.",
    tokenUsage: "Inconsistent; some app variables, many direct classes.",
    hardcodedColorUsage:
      "Overlay surfaces include black scrims, white borders, blue/green/red/yellow status colors, and local shadows.",
    hardcodedColorRiskLabels: [
      "direct-tailwind-color",
      "unscoped-rgba",
      "hardcoded-hex",
      "terminal-green-assumption",
      "electric-blue-assumption",
      "amber-tactical-assumption",
    ],
    visualRole: "Runtime/browser/governance overlays and modal panels.",
    deviceRelevance: "desktop-and-mobile",
    accessibilityContrastRisk: "high",
    premiumAlignment: "too-tactical-for-default",
    futureRecommendation:
      "Keep status colors for semantics, but move overlays to neutral scrim/surface/border tokens with accessible status token accents.",
  },
];

export const lucaThemeSystemAuditSurfaceIds = lucaThemeSystemAuditMap.map(
  (entry) => entry.surfaceId,
);

export const lucaThemeSystemHighRiskSurfaceIds = lucaThemeSystemAuditMap
  .filter(
    (entry) =>
      entry.accessibilityContrastRisk === "high" ||
      entry.premiumAlignment === "too-tactical-for-default" ||
      entry.premiumAlignment === "too-loud-for-default",
  )
  .map((entry) => entry.surfaceId);

export const lucaThemeSystemAuditNote =
  "PR #170 audit map only: documents current theme/persona/appearance risks and future premium token direction without changing theme defaults, persistence, onboarding, boot, shell, mobile, widget, or runtime behavior.";
