import type { ProvenanceMetadata } from "../../types/provenance";
import type { LucaSkillManifest } from "./SkillManifest";
import { ProvenanceGateService } from "../provenance/ProvenanceGateService";

export function provenanceForSkillManifest(
  manifest: LucaSkillManifest | Record<string, unknown>,
  gate: ProvenanceGateService = new ProvenanceGateService(undefined),
): ProvenanceMetadata {
  const sourceId = String((manifest as LucaSkillManifest).id ?? (manifest as any).name ?? "unknown-skill");
  return gate.createProvenanceRecord({
    sourceType: "skill",
    sourceId,
    sourceTrustLevel: "unknown",
    createdBy: "skill-registry",
    approvalState: "required",
  });
}
