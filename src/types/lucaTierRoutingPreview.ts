import { canMountOriginEvolutionDashboard, getDefaultTierRoutingContext, resolveLucaTierShellMode, type LucaTierRoutingContext, type LucaTierShellMode } from "./lucaTierRouting";
import type { LucaUserTier } from "./lucaUserTier";

export interface LucaTierRoutingPreview {
  shellMode: LucaTierShellMode;
  userTier: LucaUserTier;
  label: string;
  description: string;
  allowedSurfaces: string[];
  blockedSurfaces: string[];
  safetyNotes: string[];
  originDashboardMountAllowed: boolean;
  runtimeBehaviorChanged: false;
  uiWiringChanged: false;
  metadata?: Record<string, unknown>;
}

export function createTierRoutingPreview(context: LucaTierRoutingContext): LucaTierRoutingPreview {
  const safeContext = getDefaultTierRoutingContext(context);
  const decision = resolveLucaTierShellMode(safeContext);
  const originDashboardMountAllowed = canMountOriginEvolutionDashboard(decision);
  const blockedBase = ["origin_evolution_dashboard", "origin_controls"];

  const map: Record<LucaTierShellMode, Omit<LucaTierRoutingPreview, "runtimeBehaviorChanged" | "uiWiringChanged">> = {
    origin_creator_shell: {
      shellMode: decision.shellMode,
      userTier: decision.userTier,
      label: "Origin / Creator Preview",
      description: "Preview metadata for isolated Origin shell planning.",
      allowedSurfaces: originDashboardMountAllowed ? ["creator_command_center", "evolution_review", "origin_evolution_dashboard"] : ["creator_command_center", "evolution_review"],
      blockedSurfaces: originDashboardMountAllowed ? ["runtime_mount", "privileged_mutations"] : ["origin_evolution_dashboard", "runtime_mount", "privileged_mutations"],
      safetyNotes: ["Metadata-only preview.", "No runtime wiring changes."],
      originDashboardMountAllowed,
      metadata: { contractOnly: true },
    },
    tactical_shell: {
      shellMode: decision.shellMode,
      userTier: decision.userTier,
      label: "Tactical Preview",
      description: "Tools/skills/diagnostics preview metadata.",
      allowedSurfaces: ["tools", "skills", "diagnostics"],
      blockedSurfaces: blockedBase,
      safetyNotes: ["Origin dashboard blocked for tactical tier."],
      originDashboardMountAllowed: false,
      metadata: { contractOnly: true },
    },
    normal_shell: {
      shellMode: decision.shellMode,
      userTier: decision.userTier,
      label: "Normal Preview",
      description: "Chat/voice/preferences preview metadata.",
      allowedSurfaces: ["chat", "voice", "preferences"],
      blockedSurfaces: [...blockedBase, "advanced_tools", "diagnostics"],
      safetyNotes: ["Advanced and origin surfaces blocked for normal tier."],
      originDashboardMountAllowed: false,
      metadata: { contractOnly: true },
    },
    unknown_safe_shell: {
      shellMode: decision.shellMode,
      userTier: decision.userTier,
      label: "Unknown Safe Preview",
      description: "Safe fallback metadata while setup is unresolved.",
      allowedSurfaces: ["safe_fallback"],
      blockedSurfaces: ["origin_evolution_dashboard", "origin_controls", "advanced_tools", "diagnostics", "voice_routing"],
      safetyNotes: ["Privileged surfaces are blocked by default."],
      originDashboardMountAllowed: false,
      metadata: { contractOnly: true },
    },
  };

  return { ...map[decision.shellMode], runtimeBehaviorChanged: false, uiWiringChanged: false };
}

export function getTierRoutingPreviewSnapshot(input?: Partial<LucaTierRoutingContext>) {
  const context = getDefaultTierRoutingContext(input);
  return { context, preview: createTierRoutingPreview(context), runtimeBehaviorChanged: false as const, uiWiringChanged: false as const };
}
