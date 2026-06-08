import { createSkillPermissionGrantState, type PersonalIntelligenceSkillPermissionGate } from "../skillPermissions";
import { createPersonalIntelligenceSkillSandboxPlan, personalIntelligenceSkillSandboxPlanFixtures, personalIntelligenceSkillSandboxRegistryFixtures } from "../skillSandbox";
import { createSkillRegistry } from "../skills";
import { createPersonalIntelligenceSkillDryRunSimulation } from "./skillDryRunSimulator";

const at = () => new Date("2026-06-08T00:00:00.000Z");

function gatesFor(index: number): PersonalIntelligenceSkillPermissionGate[] {
  const plan = personalIntelligenceSkillSandboxPlanFixtures[index];
  const generated = createSkillPermissionGrantState([plan]).gates;
  if (index === 1 && generated.length === 0) {
    return [{
      gateId: `permission-gate:${plan.planId}:planning-review`,
      skillId: plan.skillId,
      manifestId: plan.manifestId,
      planId: plan.planId,
      kind: "approval",
      approvalKind: "user",
      label: "Project planning review",
      reason: "Project planning evidence remains pending human review.",
      status: "pending",
      riskLevel: "medium",
      required: true,
      scope: { mode: "review_only", skillId: plan.skillId, manifestId: plan.manifestId, planId: plan.planId, approvalKind: "user", executionAuthorized: false },
      executionEnabled: false,
      canExecute: false,
      sideEffectsPerformed: false,
    }];
  }
  return generated.map((gate, gateIndex) => {
    if (index === 0) return { ...gate, status: "granted_for_review" as const, reviewedAt: at().toISOString() };
    if (index === 2 && gateIndex === 0) return { ...gate, status: "denied" as const, riskLevel: "high" as const };
    return gate;
  });
}

const registryFixtureSimulations = personalIntelligenceSkillSandboxPlanFixtures.map((sandboxPlan, index) =>
  createPersonalIntelligenceSkillDryRunSimulation({
    skillRegistryEntry: personalIntelligenceSkillSandboxRegistryFixtures[index],
    sandboxPlan,
    permissionGates: gatesFor(index),
    source: "fixture",
    now: at,
  }),
);

const [browserNetworkSkill] = createSkillRegistry([{
  id: "browser-network-review",
  manifestId: "pi.browser-network-review",
  name: "Browser & Network Review",
  description: "Declares browser and network categories for permission review without an endpoint or runtime action.",
  version: "1.0.0",
  category: "review",
  permissions: ["browser.review", "network.review"],
  capabilities: ["browser.review"],
  requiredModels: [],
  requiredTools: [],
  requiredConnectors: [],
  memoryPolicy: { access: "none", read: [], write: [] },
  privacyZones: ["public"],
  declarationRef: "declarations/browser-network-review",
}]);
const browserNetworkPlan = createPersonalIntelligenceSkillSandboxPlan(browserNetworkSkill, { planId: "fixture-sandbox-plan:browser-network-review", now: at });
const browserNetworkGates = createSkillPermissionGrantState([browserNetworkPlan]).gates;
const browserNetworkSimulation = createPersonalIntelligenceSkillDryRunSimulation({
  skillRegistryEntry: browserNetworkSkill,
  sandboxPlan: browserNetworkPlan,
  permissionGates: browserNetworkGates,
  source: "fixture",
  now: at,
});

export const personalIntelligenceSkillDryRunFixtures = [...registryFixtureSimulations, browserNetworkSimulation];
