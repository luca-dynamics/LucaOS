import {
  DEFAULT_SKILL_MANIFEST_METADATA,
  LucaSkillManifest,
  LucaSkillRiskLevel,
  LucaUserOperationTier,
} from "./SkillManifest";

type LegacyTool = Record<string, any>;

const SYSTEM_KEYWORDS = ["terminal", "system", "shell", "execute", "command", "computer", "network", "file"];

const normalize = (v: unknown): string => String(v || "").toLowerCase();

export const inferSkillRiskLevelFromLegacyTool = (tool: LegacyTool): LucaSkillRiskLevel => {
  const source = [tool?.tool?.name, tool?.tool?.description, tool?.category, tool?.missionScope]
    .map(normalize)
    .join(" ");

  if (source.includes("level_3") || source.includes("full") || source.includes("wipe") || source.includes("lockdown")) return "critical";
  if (source.includes("level_2") || SYSTEM_KEYWORDS.some((k) => source.includes(k))) return "high";
  if (source.includes("level_1") || source.includes("social") || source.includes("finance")) return "medium";
  return "low";
};

export const inferAllowedUserTiersFromLegacyTool = (tool: LegacyTool): LucaUserOperationTier[] => {
  const risk = inferSkillRiskLevelFromLegacyTool(tool);
  const source = [tool?.tool?.name, tool?.tool?.description, tool?.category].map(normalize).join(" ");
  const highCapability = ["computer", "network", "system", "terminal", "file", "shell"].some((k) => source.includes(k));

  if (risk === "critical") return ["origin"];
  if (risk === "high" || highCapability) return ["origin", "tactical"];
  if (risk === "medium") return ["origin", "tactical"];
  return ["origin", "tactical", "normal"];
};

export const mapLegacyToolToSkillManifest = (tool: LegacyTool, options?: Partial<LucaSkillManifest>): LucaSkillManifest => {
  const riskLevel = inferSkillRiskLevelFromLegacyTool(tool);
  const allowedUserTiers = inferAllowedUserTiersFromLegacyTool(tool);
  const toolName = tool?.tool?.name || tool?.name || "unknown_tool";
  const description = tool?.tool?.description || tool?.description || "";
  const voiceExecutionAllowed = !!tool?.voiceExecutionAllowed;

  return {
    id: options?.id || `legacy.${toolName}`,
    name: options?.name || toolName,
    description,
    version: options?.version || "0.0.0-legacy",
    lifecycleState: options?.lifecycleState || "active",
    ownerTier: options?.ownerTier || "origin",
    allowedUserTiers,
    category: options?.category || tool?.category,
    tags: options?.tags || tool?.skillSets || [],
    triggerHints: options?.triggerHints || tool?.keywords || [],
    inputs: options?.inputs || tool?.tool?.parameters,
    outputs: options?.outputs,
    allowedTools: options?.allowedTools || [toolName],
    deniedTools: options?.deniedTools || [],
    memoryPolicy: options?.memoryPolicy,
    safetyPolicy: {
      riskLevel,
      requiresConfirmation: voiceExecutionAllowed && (riskLevel === "medium" || riskLevel === "high" || riskLevel === "critical"),
      requiresOriginApproval: riskLevel === "high" || riskLevel === "critical",
      allowedOperationTiers: allowedUserTiers,
      networkAllowed: !normalize(tool?.category).includes("system"),
      fileSystemAllowed: normalize(tool?.category).includes("files"),
      computerUseAllowed: normalize(tool?.tool?.name).includes("computer"),
      voiceExecutionAllowed,
    },
    evalPolicy: options?.evalPolicy || {
      evalRequired: riskLevel !== "low",
      regressionCheckRequired: riskLevel !== "low",
    },
    promotionPolicy: options?.promotionPolicy || {
      promotionRequiresOrigin: true,
      promotionRequiresPassingEvals: riskLevel !== "low",
      promotionRequiresRollbackPlan: riskLevel === "high" || riskLevel === "critical",
      promotionSource: "unknown",
    },
    rollbackPolicy: options?.rollbackPolicy || {
      rollbackAvailable: true,
    },
    source: options?.source || "toolRegistry",
    createdAt: options?.createdAt || new Date().toISOString(),
    updatedAt: options?.updatedAt,
    metadata: {
      ...DEFAULT_SKILL_MANIFEST_METADATA,
      legacyTool: tool,
    },
  };
};

export const mapSkillManifestToLegacyTool = (manifest: LucaSkillManifest, options?: Record<string, unknown>): LegacyTool => ({
  category: manifest.category || "CORE",
  tool: {
    name: manifest.name,
    description: manifest.description,
    parameters: manifest.inputs,
  },
  keywords: manifest.triggerHints || [],
  skillSets: manifest.tags || [],
  metadata: {
    ...manifest.metadata,
    manifestId: manifest.id,
    ...options,
  },
});

export const getSkillManifestContractSnapshot = (input?: { manifest?: LucaSkillManifest }) => ({
  contractKind: DEFAULT_SKILL_MANIFEST_METADATA.contractKind,
  runtimeBehaviorChanged: DEFAULT_SKILL_MANIFEST_METADATA.runtimeBehaviorChanged,
  autonomousSelfModificationEnabled: DEFAULT_SKILL_MANIFEST_METADATA.autonomousSelfModificationEnabled,
  manifestId: input?.manifest?.id,
});
