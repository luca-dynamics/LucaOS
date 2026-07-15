import type { LucaMaterialRole } from "./lucaMaterialSystem";

export const LUCA_INTERFACE_MATERIAL_AREAS = [
  "native-boot",
  "web-post-boot",
  "onboarding",
  "desktop-shell",
  "mobile-shell",
  "settings",
  "voice-hud",
  "mini-chat",
  "presence-widget",
  "overlay",
  "modal-dialog",
  "error-loading-empty",
] as const;

export type LucaInterfaceMaterialArea =
  (typeof LUCA_INTERFACE_MATERIAL_AREAS)[number];

export type LucaInterfaceOpticalTier =
  | "root"
  | "quiet-css"
  | "standard-css"
  | "matched-webgl"
  | "semantic-only";

export type LucaInterfaceSkinBoundary =
  | "fixed-boot-identity"
  | "boot-boundary"
  | "onboarding-boundary"
  | "dashboard-boundary"
  | "mobile-boundary"
  | "inherited-boundary";

export interface LucaInterfaceMaterialCoverageEntry {
  area: LucaInterfaceMaterialArea;
  owners: readonly string[];
  materialRoles: readonly LucaMaterialRole[];
  opticalTier: LucaInterfaceOpticalTier;
  skinBoundary: LucaInterfaceSkinBoundary;
  reducedTransparency: "solid" | "semantic-solid";
  notes: string;
}

/**
 * Product-wide material coverage contract.
 *
 * This is intentionally organized by what a person can see rather than by
 * implementation folder. New lifecycle surfaces must either join one of these
 * owners or add a new area here, so boot, setup, compact windows, and transient
 * states cannot silently drift away from the main shell material system.
 */
export const LUCA_INTERFACE_MATERIAL_COVERAGE: readonly LucaInterfaceMaterialCoverageEntry[] = [
  {
    area: "native-boot",
    owners: ["platforms/electron/boot.html"],
    materialRoles: ["root", "webCard", "control"],
    opticalTier: "quiet-css",
    skinBoundary: "fixed-boot-identity",
    reducedTransparency: "solid",
    notes: "Boot is intentionally fixed to Luca's Carbon identity. User skin ownership begins at onboarding; the face remains direct image/plasma identity with no glass disc or text card.",
  },
  {
    area: "web-post-boot",
    owners: [
      "src/web/postBoot/WebPostBootLoading.tsx",
      "src/web/postBoot/WebPostBootTransition.tsx",
      "src/web/WebReadyState.tsx",
    ],
    materialRoles: ["root", "panel", "card", "control", "webFallback"],
    opticalTier: "quiet-css",
    skinBoundary: "boot-boundary",
    reducedTransparency: "solid",
    notes: "Browser-safe startup uses CSS optics and the web fallback; it never assumes native wallpaper capture.",
  },
  {
    area: "onboarding",
    owners: [
      "src/components/Onboarding/LucaOnboardingShell.tsx",
      "src/components/Onboarding/LucaOnboardingScreen.tsx",
      "src/components/Onboarding/LucaPremiumOnboardingPreview.tsx",
    ],
    materialRoles: ["root", "card", "control", "controlActive"],
    opticalTier: "quiet-css",
    skinBoundary: "onboarding-boundary",
    reducedTransparency: "solid",
    notes: "Every onboarding step inherits the previewed skin and material settings before completion is persisted.",
  },
  {
    area: "desktop-shell",
    owners: [
      "src/App.tsx",
      "src/components/dashboard/LucaDashboardSurface.tsx",
      "src/components/layout/Header.tsx",
      "src/components/layout/OperationsSidebar.tsx",
      "src/components/layout/ChatPanel.tsx",
      "src/components/VisualCore.tsx",
      "src/components/right-panel",
    ],
    materialRoles: ["root", "workspace", "panel", "rail", "control", "tab", "tabActive"],
    opticalTier: "quiet-css",
    skinBoundary: "dashboard-boundary",
    reducedTransparency: "solid",
    notes: "Repeated shell chrome uses semantic CSS material roles; matched WebGL is not duplicated per panel.",
  },
  {
    area: "mobile-shell",
    owners: [
      "src/App.tsx",
      "src/components/MobileManager.tsx",
      "src/components/mobile",
      "src/styles/lucaMobileShellStyles.ts",
    ],
    materialRoles: [
      "mobilePanel",
      "mobileSheet",
      "mobileNav",
      "mobileControl",
      "mobileControlActive",
      "mobileContent",
    ],
    opticalTier: "semantic-only",
    skinBoundary: "mobile-boundary",
    reducedTransparency: "solid",
    notes: "Mobile keeps the same skin identity with capped blur and stable platform-safe surfaces.",
  },
  {
    area: "settings",
    owners: ["src/components/SettingsModal.tsx", "src/components/settings"],
    materialRoles: ["dialog", "sidebar", "card", "control", "controlActive", "divider"],
    opticalTier: "quiet-css",
    skinBoundary: "inherited-boundary",
    reducedTransparency: "solid",
    notes: "Appearance previews remain locally scoped while shared settings primitives carry the material hierarchy across every tab.",
  },
  {
    area: "voice-hud",
    owners: [
      "src/components/voice/VoiceHudSurface.tsx",
      "src/components/voice/VoiceControls.tsx",
      "src/components/VisionHUD.tsx",
    ],
    materialRoles: ["root", "hud", "control", "controlActive", "popover"],
    opticalTier: "standard-css",
    skinBoundary: "inherited-boundary",
    reducedTransparency: "solid",
    notes: "Voice and vision renderers stay direct; their HUD chrome and controls receive lightweight optics without clipping or extra canvases.",
  },
  {
    area: "mini-chat",
    owners: ["src/components/chat/LucaChatSurface.tsx", "src/components/ChatWidgetInput.tsx"],
    materialRoles: ["floatingPanel", "card", "control", "popover"],
    opticalTier: "standard-css",
    skinBoundary: "inherited-boundary",
    reducedTransparency: "solid",
    notes: "The compact Electron chat window inherits the selected skin and uses the same control and popover materials as the main shell.",
  },
  {
    area: "presence-widget",
    owners: [
      "src/components/WidgetMode.tsx",
      "src/components/WidgetControls.tsx",
      "src/components/Hologram/HologramWidget.tsx",
    ],
    materialRoles: ["hud", "control", "controlActive", "popover"],
    opticalTier: "standard-css",
    skinBoundary: "inherited-boundary",
    reducedTransparency: "solid",
    notes: "Only the surrounding caption and controls use glass; Luca's face/plasma body never receives a circular overlay.",
  },
  {
    area: "overlay",
    owners: [
      "src/components/layout/OverlayManager.tsx",
      "src/surfaces/shared/SharedOverlayPanels.tsx",
      "src/surfaces/origin/OriginOverlayPanels.tsx",
    ],
    materialRoles: ["overlay", "sheet", "popover", "hud"],
    opticalTier: "quiet-css",
    skinBoundary: "inherited-boundary",
    reducedTransparency: "semantic-solid",
    notes: "Scrims remain neutral and semantic status colours stay authoritative; only the foreground chrome receives optics.",
  },
  {
    area: "modal-dialog",
    owners: [
      "src/components/ui/luca/LucaDialog.tsx",
      "src/components/ui/luca/LucaSheet.tsx",
      "src/components/HumanInputModal.tsx",
      "src/components/SecurityGate.tsx",
      "src/components/SkillPreview.tsx",
      "src/components/SkillsMatrix.tsx",
      "src/components/AdminGrantModal.tsx",
      "src/components/AdminEnrollmentModal.tsx",
      "src/components/IngestionModal.tsx",
      "src/components/RemoteAccessModal.tsx",
      "src/components/ChromeProfilePrompt.tsx",
      "src/components/VoiceCommandConfirmation.tsx",
      "src/components/AppExplorerModal.tsx",
      "src/components/ProfileManager.tsx",
      "src/components/llm/OfflineModelManager.tsx",
      "src/components/LucaLinkModal.tsx",
      "src/components/SmartTVRemote.tsx",
      "src/components/WirelessManager.tsx",
      "src/components/ThoughtProcessPanel.tsx",
      "src/components/AgentModePanel.tsx",
    ],
    materialRoles: ["dialog", "sheet", "control"],
    opticalTier: "quiet-css",
    skinBoundary: "inherited-boundary",
    reducedTransparency: "solid",
    notes: "Shared primitives, direct legacy dialogs, and the compatibility bridge keep modal foregrounds skin-aware without texturing full-screen scrims.",
  },
  {
    area: "error-loading-empty",
    owners: ["src/components/SafeComponent.tsx", "src/web/postBoot", "src/components/lucaLink/ErrorToast.tsx"],
    materialRoles: ["webCard", "card", "hud", "control"],
    opticalTier: "semantic-only",
    skinBoundary: "inherited-boundary",
    reducedTransparency: "semantic-solid",
    notes: "Failure and empty states use skin-aware neutral surfaces while danger/warning/success colours retain semantic ownership.",
  },
] as const;

export const LUCA_INTERFACE_MATERIAL_COVERAGE_BY_AREA = Object.fromEntries(
  LUCA_INTERFACE_MATERIAL_COVERAGE.map((entry) => [entry.area, entry]),
) as Record<LucaInterfaceMaterialArea, LucaInterfaceMaterialCoverageEntry>;
