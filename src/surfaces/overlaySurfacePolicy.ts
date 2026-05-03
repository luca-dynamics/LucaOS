import {
  BUILD_CAPABILITIES,
  LUCA_AUDIENCE_TIER,
} from "../config/buildConfig";
import {
  canAccessAudienceTier,
  type LucaAudienceTier,
} from "../config/layerBoundary";

export type OverlaySurfaceLayer = "shared" | "origin";

export type OverlayCapabilityKey = keyof typeof BUILD_CAPABILITIES;

export type OverlayPanelId =
  | "adminGrant"
  | "lockdown"
  | "autonomyDashboard"
  | "agentMode"
  | "thoughtProcess"
  | "geoTactical"
  | "cryptoTerminal"
  | "forexTerminal"
  | "predictionTerminal"
  | "osintDossier"
  | "tvRemote"
  | "wirelessManager"
  | "networkMap"
  | "hackingTerminal"
  | "skillsMatrix"
  | "stockTerminal"
  | "tradingTerminal"
  | "competitionPage"
  | "aiTradersPage"
  | "subsystemDashboard"
  | "whatsAppManager"
  | "telegramManager"
  | "twitterManager"
  | "instagramManager"
  | "linkedInManager"
  | "discordManager"
  | "youTubeManager"
  | "weChatManager"
  | "lucaLinkModal"
  | "profileManager"
  | "codeEditor"
  | "ingestionModal"
  | "ingestionOverlay"
  | "appExplorer"
  | "mobileFileBrowser"
  | "mobileManager";

export interface OverlayPanelPolicy {
  id: OverlayPanelId;
  surface: OverlaySurfaceLayer;
  capability?: OverlayCapabilityKey;
  minimumAudienceTier: LucaAudienceTier;
}

export const OVERLAY_PANEL_POLICIES: Record<
  OverlayPanelId,
  OverlayPanelPolicy
> = {
  adminGrant: {
    id: "adminGrant",
    surface: "origin",
    capability: "ROOT_ACCESS",
    minimumAudienceTier: "origin",
  },
  lockdown: {
    id: "lockdown",
    surface: "origin",
    capability: "PRIVILEGED_DESTRUCTIVE_TOOLS",
    minimumAudienceTier: "origin",
  },
  autonomyDashboard: {
    id: "autonomyDashboard",
    surface: "origin",
    minimumAudienceTier: "public_tactical",
  },
  agentMode: {
    id: "agentMode",
    surface: "origin",
    minimumAudienceTier: "public_tactical",
  },
  thoughtProcess: {
    id: "thoughtProcess",
    surface: "origin",
    minimumAudienceTier: "public_tactical",
  },
  geoTactical: {
    id: "geoTactical",
    surface: "origin",
    minimumAudienceTier: "public_tactical",
  },
  cryptoTerminal: {
    id: "cryptoTerminal",
    surface: "origin",
    capability: "PRIVILEGED_TRADING",
    minimumAudienceTier: "public_tactical",
  },
  forexTerminal: {
    id: "forexTerminal",
    surface: "origin",
    capability: "PRIVILEGED_TRADING",
    minimumAudienceTier: "public_tactical",
  },
  predictionTerminal: {
    id: "predictionTerminal",
    surface: "origin",
    capability: "PRIVILEGED_TRADING",
    minimumAudienceTier: "public_tactical",
  },
  osintDossier: {
    id: "osintDossier",
    surface: "origin",
    minimumAudienceTier: "public_tactical",
  },
  tvRemote: {
    id: "tvRemote",
    surface: "origin",
    minimumAudienceTier: "public_standard",
  },
  wirelessManager: {
    id: "wirelessManager",
    surface: "origin",
    minimumAudienceTier: "public_tactical",
  },
  networkMap: {
    id: "networkMap",
    surface: "origin",
    minimumAudienceTier: "public_tactical",
  },
  hackingTerminal: {
    id: "hackingTerminal",
    surface: "origin",
    capability: "PRIVILEGED_DESTRUCTIVE_TOOLS",
    minimumAudienceTier: "origin",
  },
  skillsMatrix: {
    id: "skillsMatrix",
    surface: "origin",
    minimumAudienceTier: "public_tactical",
  },
  stockTerminal: {
    id: "stockTerminal",
    surface: "origin",
    capability: "PRIVILEGED_TRADING",
    minimumAudienceTier: "public_tactical",
  },
  tradingTerminal: {
    id: "tradingTerminal",
    surface: "origin",
    capability: "PRIVILEGED_TRADING",
    minimumAudienceTier: "public_tactical",
  },
  competitionPage: {
    id: "competitionPage",
    surface: "origin",
    capability: "PRIVILEGED_TRADING",
    minimumAudienceTier: "public_tactical",
  },
  aiTradersPage: {
    id: "aiTradersPage",
    surface: "origin",
    capability: "PRIVILEGED_TRADING",
    minimumAudienceTier: "public_tactical",
  },
  subsystemDashboard: {
    id: "subsystemDashboard",
    surface: "origin",
    minimumAudienceTier: "public_tactical",
  },
  whatsAppManager: {
    id: "whatsAppManager",
    surface: "shared",
    minimumAudienceTier: "public_standard",
  },
  telegramManager: {
    id: "telegramManager",
    surface: "shared",
    minimumAudienceTier: "public_standard",
  },
  twitterManager: {
    id: "twitterManager",
    surface: "shared",
    minimumAudienceTier: "public_standard",
  },
  instagramManager: {
    id: "instagramManager",
    surface: "shared",
    minimumAudienceTier: "public_standard",
  },
  linkedInManager: {
    id: "linkedInManager",
    surface: "shared",
    minimumAudienceTier: "public_standard",
  },
  discordManager: {
    id: "discordManager",
    surface: "shared",
    minimumAudienceTier: "public_standard",
  },
  youTubeManager: {
    id: "youTubeManager",
    surface: "shared",
    minimumAudienceTier: "public_standard",
  },
  weChatManager: {
    id: "weChatManager",
    surface: "shared",
    minimumAudienceTier: "public_standard",
  },
  lucaLinkModal: {
    id: "lucaLinkModal",
    surface: "shared",
    minimumAudienceTier: "public_standard",
  },
  profileManager: {
    id: "profileManager",
    surface: "shared",
    minimumAudienceTier: "public_standard",
  },
  codeEditor: {
    id: "codeEditor",
    surface: "shared",
    minimumAudienceTier: "public_standard",
  },
  ingestionModal: {
    id: "ingestionModal",
    surface: "shared",
    minimumAudienceTier: "public_standard",
  },
  ingestionOverlay: {
    id: "ingestionOverlay",
    surface: "shared",
    minimumAudienceTier: "public_standard",
  },
  appExplorer: {
    id: "appExplorer",
    surface: "shared",
    minimumAudienceTier: "public_standard",
  },
  mobileFileBrowser: {
    id: "mobileFileBrowser",
    surface: "shared",
    minimumAudienceTier: "public_standard",
  },
  mobileManager: {
    id: "mobileManager",
    surface: "shared",
    minimumAudienceTier: "public_standard",
  },
};

export const getOverlayPanelPolicy = (
  panelId: OverlayPanelId,
): OverlayPanelPolicy => {
  return OVERLAY_PANEL_POLICIES[panelId];
};

export const listOverlayPanelsBySurface = (
  surface: OverlaySurfaceLayer,
): OverlayPanelPolicy[] => {
  return Object.values(OVERLAY_PANEL_POLICIES).filter(
    (policy) => policy.surface === surface,
  );
};

export const listOverlayPanelsForMinimumAudienceTier = (
  minimumAudienceTier: LucaAudienceTier,
): OverlayPanelPolicy[] => {
  return Object.values(OVERLAY_PANEL_POLICIES).filter(
    (policy) => policy.minimumAudienceTier === minimumAudienceTier,
  );
};

export const listTacticalOverlayPanels = (): OverlayPanelPolicy[] =>
  listOverlayPanelsForMinimumAudienceTier("public_tactical");

export const listOriginOnlyOverlayPanels = (): OverlayPanelPolicy[] =>
  listOverlayPanelsForMinimumAudienceTier("origin");

// Legacy compatibility helpers retained while older callsites are migrated.
export const listPublicCuratedOverlayPanels = (): OverlayPanelPolicy[] =>
  listTacticalOverlayPanels();

export const listPublicHiddenOverlayPanels = (): OverlayPanelPolicy[] =>
  listOriginOnlyOverlayPanels();

export const canRenderOverlayPanel = (
  panelId: OverlayPanelId,
  options?: { enforceBoundary?: boolean },
): boolean => {
  const policy = getOverlayPanelPolicy(panelId);
  if (
    options?.enforceBoundary &&
    !canAccessAudienceTier(LUCA_AUDIENCE_TIER, policy.minimumAudienceTier)
  ) {
    return false;
  }
  if (policy.capability && !BUILD_CAPABILITIES[policy.capability]) return false;
  return true;
};
