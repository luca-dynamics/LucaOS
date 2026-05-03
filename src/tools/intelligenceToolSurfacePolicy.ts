import { LUCA_AUDIENCE_TIER } from "../config/buildConfig";
import {
  canAccessAudienceTier,
  type LucaAudienceTier,
} from "../config/layerBoundary";

export type IntelligenceToolSurfaceId =
  | "osintUsernameSearch"
  | "osintDomainIntel"
  | "osintDarkWebScan"
  | "traceSignalSource"
  | "refineQuery"
  | "osintGoogleDork"
  | "osintIdentitySearch"
  | "storeMemory"
  | "retrieveMemory"
  | "reconcileMemories"
  | "addGraphRelations"
  | "queryGraphKnowledge";

export interface IntelligenceToolSurfacePolicyEntry {
  id: IntelligenceToolSurfaceId;
  minimumAudienceTier: LucaAudienceTier;
  rationale: string;
}

export const INTELLIGENCE_TOOL_SURFACE_POLICIES: Record<
  IntelligenceToolSurfaceId,
  IntelligenceToolSurfacePolicyEntry
> = {
  osintUsernameSearch: {
    id: "osintUsernameSearch",
    minimumAudienceTier: "public_tactical",
    rationale:
      "Basic username intelligence may be curatable for public use with tighter presentation and guardrails.",
  },
  osintDomainIntel: {
    id: "osintDomainIntel",
    minimumAudienceTier: "public_tactical",
    rationale:
      "Domain intelligence can have legitimate public utility but should likely be constrained and curated.",
  },
  osintDarkWebScan: {
    id: "osintDarkWebScan",
    minimumAudienceTier: "origin",
    rationale:
      "Dark-web scan capability is a strong tactical/privileged intelligence surface.",
  },
  traceSignalSource: {
    id: "traceSignalSource",
    minimumAudienceTier: "origin",
    rationale:
      "Signal/source tracing is a deeper tactical capability that should remain origin-only for now.",
  },
  refineQuery: {
    id: "refineQuery",
    minimumAudienceTier: "public_standard",
    rationale:
      "Query refinement is a benign search-assistance capability and can remain shared.",
  },
  osintGoogleDork: {
    id: "osintGoogleDork",
    minimumAudienceTier: "public_tactical",
    rationale:
      "Google dork generation is closer to tactical reconnaissance than normal public search assistance.",
  },
  osintIdentitySearch: {
    id: "osintIdentitySearch",
    minimumAudienceTier: "public_tactical",
    rationale:
      "Deep identity aggregation is a privileged intelligence surface until a public-safe version exists.",
  },
  storeMemory: {
    id: "storeMemory",
    minimumAudienceTier: "public_standard",
    rationale:
      "User memory storage is part of core assistant capability.",
  },
  retrieveMemory: {
    id: "retrieveMemory",
    minimumAudienceTier: "public_standard",
    rationale:
      "Memory recall is part of core assistant capability.",
  },
  reconcileMemories: {
    id: "reconcileMemories",
    minimumAudienceTier: "public_standard",
    rationale:
      "Memory maintenance remains part of core assistant behavior.",
  },
  addGraphRelations: {
    id: "addGraphRelations",
    minimumAudienceTier: "public_standard",
    rationale:
      "Knowledge graph maintenance is part of shared intelligence infrastructure.",
  },
  queryGraphKnowledge: {
    id: "queryGraphKnowledge",
    minimumAudienceTier: "public_standard",
    rationale:
      "Knowledge graph queries are part of shared intelligence infrastructure.",
  },
};

export const canRegisterIntelligenceTool = (
  toolId: IntelligenceToolSurfaceId,
  options?: { enforceBoundary?: boolean },
): boolean => {
  if (!options?.enforceBoundary) return true;
  return canAccessAudienceTier(
    LUCA_AUDIENCE_TIER,
    INTELLIGENCE_TOOL_SURFACE_POLICIES[toolId].minimumAudienceTier,
  );
};
