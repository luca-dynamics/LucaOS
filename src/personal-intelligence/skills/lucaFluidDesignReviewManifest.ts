import type { PersonalIntelligenceSkillManifest } from "./skillRegistryTypes";

/**
 * Inspection-only design knowledge. This declares what Luca may review; it
 * grants no model, tool, filesystem, network, memory, or execution authority.
 */
export const lucaFluidDesignReviewManifest = {
  id: "luca-fluid-design-review",
  manifestId: "pi.luca-fluid-design-review",
  name: "Luca Fluid Design Review",
  description:
    "Reviews proposed LucaOS interface behavior for response, continuity, motion restraint, material hierarchy, accessibility, and interaction safety.",
  version: "1.0.0",
  category: "design-review",
  permissions: ["design.review.read_only"],
  capabilities: ["design.review.read_only", "ui.motion.checklist"],
  requiredModels: [],
  requiredTools: [],
  requiredConnectors: [],
  memoryPolicy: { access: "none", read: [], write: [] },
  privacyZones: ["public", "project"],
  declarationRef: "declarations/luca-fluid-design-review",
} as const satisfies PersonalIntelligenceSkillManifest;
