import type { OverlayPanelId } from "../overlaySurfacePolicy";
import type { LucaAudienceTier } from "../../config/layerBoundary";

export type StandardOverlayDisposition =
  | "keep_temporarily"
  | "replace_with_public_variant"
  | "hide_without_replacement";

export interface StandardPublicOverlayPlanEntry {
  panelId: OverlayPanelId;
  targetTier: Extract<LucaAudienceTier, "public_standard">;
  disposition: StandardOverlayDisposition;
  tacticalAccess: "keep" | "review" | "origin_only";
  rationale: string;
  replacementSurface?: string;
}

export const STANDARD_PUBLIC_OVERLAY_PLAN: StandardPublicOverlayPlanEntry[] = [
  {
    panelId: "autonomyDashboard",
    targetTier: "public_standard",
    disposition: "replace_with_public_variant",
    tacticalAccess: "keep",
    rationale:
      "The origin autonomy dashboard likely exposes deeper tactical or internal control state than the standard public surface should show directly.",
    replacementSurface: "publicAutonomySummary",
  },
  {
    panelId: "agentMode",
    targetTier: "public_standard",
    disposition: "replace_with_public_variant",
    tacticalAccess: "keep",
    rationale:
      "Standard public builds may need a simpler agent status/control panel rather than the full tactical-facing agent-mode surface.",
    replacementSurface: "publicAgentStatus",
  },
  {
    panelId: "thoughtProcess",
    targetTier: "public_standard",
    disposition: "hide_without_replacement",
    tacticalAccess: "keep",
    rationale:
      "Internal thought and tool graph visibility should stay off the standard public surface while remaining available to tactical users.",
  },
  {
    panelId: "geoTactical",
    targetTier: "public_standard",
    disposition: "replace_with_public_variant",
    tacticalAccess: "keep",
    rationale:
      "Location/tactical visualizations likely need a narrower standard-public presentation and permissions story.",
    replacementSurface: "publicLocationView",
  },
  {
    panelId: "osintDossier",
    targetTier: "public_standard",
    disposition: "hide_without_replacement",
    tacticalAccess: "keep",
    rationale:
      "OSINT dossier tooling should stay off the standard public surface while tactical access is reviewed separately.",
  },
  {
    panelId: "tvRemote",
    targetTier: "public_standard",
    disposition: "keep_temporarily",
    tacticalAccess: "keep",
    rationale:
      "Device remote control may remain valid on the standard public surface, but it should later move under a clearer public device-control grouping.",
  },
  {
    panelId: "wirelessManager",
    targetTier: "public_standard",
    disposition: "replace_with_public_variant",
    tacticalAccess: "keep",
    rationale:
      "Wireless management can stay user-facing, but the current surface is likely too operationally broad for standard public release.",
    replacementSurface: "publicDeviceConnectivity",
  },
  {
    panelId: "networkMap",
    targetTier: "public_standard",
    disposition: "hide_without_replacement",
    tacticalAccess: "keep",
    rationale:
      "Full network topology visibility feels inappropriate for standard public users while remaining relevant to tactical users.",
  },
  {
    panelId: "skillsMatrix",
    targetTier: "public_standard",
    disposition: "replace_with_public_variant",
    tacticalAccess: "keep",
    rationale:
      "A standard-public skill catalog may be appropriate, but the current matrix likely reflects internal or tactical capability structure.",
    replacementSurface: "publicSkillsCatalog",
  },
  {
    panelId: "subsystemDashboard",
    targetTier: "public_standard",
    disposition: "replace_with_public_variant",
    tacticalAccess: "keep",
    rationale:
      "Subsystem internals probably need a curated standard-public health/status dashboard instead of the raw tactical dashboard.",
    replacementSurface: "publicSubsystemHealth",
  },
];

export const getPublicOverlayPlanEntry = (
  panelId: OverlayPanelId,
): StandardPublicOverlayPlanEntry | undefined => {
  return STANDARD_PUBLIC_OVERLAY_PLAN.find((entry) => entry.panelId === panelId);
};

export const listPublicOverlayReplacementCandidates = (): StandardPublicOverlayPlanEntry[] => {
  return STANDARD_PUBLIC_OVERLAY_PLAN.filter(
    (entry) => entry.disposition === "replace_with_public_variant",
  );
};

export const listPublicOverlayHideCandidates = (): StandardPublicOverlayPlanEntry[] => {
  return STANDARD_PUBLIC_OVERLAY_PLAN.filter(
    (entry) => entry.disposition === "hide_without_replacement",
  );
};

// Legacy compatibility export retained while older callsites are migrated.
export const PUBLIC_OVERLAY_PLAN = STANDARD_PUBLIC_OVERLAY_PLAN;
