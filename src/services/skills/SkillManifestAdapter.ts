import { mapLegacyToolToSkillManifest, getSkillManifestContractSnapshot } from "./SkillManifestMapping";
import { evaluateSkillLifecycleGate, getSkillLifecycleGateSnapshot, SkillLifecycleGateInput } from "./SkillLifecycleGate";

export const skillManifestAdapter = {
  name: "LucaSkillManifestAdapter",
  kind: "skill_manifest_adapter",
  mapLegacyTool: (tool: Record<string, unknown>) => mapLegacyToolToSkillManifest(tool),
  evaluateLifecycle: (input: SkillLifecycleGateInput) => evaluateSkillLifecycleGate(input),
  getSnapshot: (input?: SkillLifecycleGateInput) => ({
    adapterOnly: true,
    runtimeBehaviorChanged: false,
    skillExecutionChanged: false,
    autonomousSelfModificationEnabled: false,
    contract: getSkillManifestContractSnapshot(input ? { manifest: input.manifest } : undefined),
    lifecycle: input ? getSkillLifecycleGateSnapshot(input) : undefined,
  }),
};
