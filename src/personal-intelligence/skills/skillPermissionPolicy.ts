import type {
  PersonalIntelligenceSkillManifest,
  PersonalIntelligenceSkillPermissionPolicy,
  PersonalIntelligenceSkillRiskLevel,
} from "./skillRegistryTypes";

const CRITICAL = /(shell|install|credential|private[._ -]?key|payment|trading|device[._ -]?control|raw[._ -]?file|exfiltration|surveillance)/i;
const HIGH = /(network|file[._ -]?(read|write)|connector|browser|lucalink|handoff)/i;
const MEDIUM = /(memory|model|tool|dashboard|presentation)/i;

function declarations(manifest: PersonalIntelligenceSkillManifest): string[] {
  return [
    ...(manifest.permissions ?? []),
    ...(manifest.capabilities ?? []),
    ...(manifest.requiredModels ?? []).map((value) => `model:${value}`),
    ...(manifest.requiredTools ?? []).map((value) => `tool:${value}`),
    ...(manifest.requiredConnectors ?? []).map((value) => `connector:${value}`),
    manifest.memoryPolicy?.access ?? "none",
  ];
}

export function evaluateSkillPermissionPolicy(
  manifest: PersonalIntelligenceSkillManifest,
): PersonalIntelligenceSkillPermissionPolicy {
  const values = declarations(manifest);
  let riskLevel: PersonalIntelligenceSkillRiskLevel = "low";
  if (values.some((value) => CRITICAL.test(value))) riskLevel = "critical";
  else if (values.some((value) => HIGH.test(value))) riskLevel = "high";
  else if (values.some((value) => MEDIUM.test(value))) riskLevel = "medium";

  const warnings: string[] = [];
  const blockers: string[] = [];
  if (riskLevel === "medium") warnings.push("Declared capability requires approval before any future runtime use.");
  if (riskLevel === "high") warnings.push("External-access capability requires review, sandboxing, and explicit permissions.");
  if (riskLevel === "critical") blockers.push("Critical capability is blocked from execution.");

  return {
    riskLevel,
    requiresApproval: riskLevel !== "low",
    requiresSandbox: riskLevel === "high" || riskLevel === "critical",
    warnings,
    blockers,
    sideEffectsPerformed: false,
  };
}
