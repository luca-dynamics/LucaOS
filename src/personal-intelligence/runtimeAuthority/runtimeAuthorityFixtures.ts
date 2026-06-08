import { classifyPersonalIntelligenceRuntimeAuthority } from "./runtimeAuthorityPolicy";
import type {
  PersonalIntelligenceRuntimeAuthorityPolicyInput,
  PersonalIntelligenceRuntimeAuthorityRecord,
} from "./runtimeAuthorityTypes";

const createdAt = "2026-06-08T00:00:00.000Z";
const definitions: readonly (PersonalIntelligenceRuntimeAuthorityPolicyInput & { id: string })[] = [
  { id: "skill-dry-run", source: "fixture", capabilityKind: "skill_execution", riskLevel: "medium" },
  { id: "tool-dry-run", source: "fixture", capabilityKind: "tool_invocation", riskLevel: "medium" },
  { id: "memory-proposal", source: "memory_proposal", capabilityKind: "memory_proposal", riskLevel: "low" },
  { id: "memory-write", source: "fixture", capabilityKind: "memory_write", riskLevel: "high" },
  { id: "model-call", source: "fixture", capabilityKind: "model_call", riskLevel: "medium" },
  { id: "lucalink-handoff", source: "fixture", capabilityKind: "lucalink_handoff", riskLevel: "high" },
  { id: "shell", source: "fixture", capabilityKind: "shell_command", riskLevel: "critical" },
  { id: "credential", source: "fixture", capabilityKind: "credential_access", riskLevel: "critical" },
  { id: "install", source: "fixture", capabilityKind: "install_package", riskLevel: "critical" },
  {
    id: "pilot-candidate", source: "fixture", capabilityKind: "skill_execution", riskLevel: "low",
    dryRunSuccessful: true, requiredGatesGrantedForReview: true, hasBlockedDeniedOrExpiredGates: false,
    missionAlignment: "aligned", rollbackExpectationExists: true, runtimeTracePreviewExists: true,
    permanentBlockedCapabilityPresent: false,
  },
  { id: "malformed", source: "fixture", capabilityKind: "malformed_capability", riskLevel: "medium" },
];

function createFixture(
  { id, ...input }: PersonalIntelligenceRuntimeAuthorityPolicyInput & { id: string },
): PersonalIntelligenceRuntimeAuthorityRecord {
  const capabilityKind: PersonalIntelligenceRuntimeAuthorityRecord["capabilityKind"] =
    input.capabilityKind === "malformed_capability"
      ? "unknown"
      : input.capabilityKind as PersonalIntelligenceRuntimeAuthorityRecord["capabilityKind"];
  return {
    authorityId: `runtime-authority:fixture:${id}`,
    createdAt,
    source: input.source === "memory_proposal" ? "memory_proposal" : "fixture",
    skillId: `fixture-skill:${id}`,
    capabilityKind,
    ...classifyPersonalIntelligenceRuntimeAuthority(input),
  };
}

export const personalIntelligenceRuntimeAuthorityFixtures: readonly PersonalIntelligenceRuntimeAuthorityRecord[] =
  Object.freeze(definitions.map(createFixture));
