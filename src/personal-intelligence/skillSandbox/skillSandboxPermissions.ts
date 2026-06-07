import type { PersonalIntelligenceSkillRegistryEntry } from "../skills/skillRegistryTypes";
import type { PersonalIntelligenceSkillSandboxPermissionKind, PersonalIntelligenceSkillSandboxPermissionRequirement } from "./skillSandboxTypes";

const BLOCKED_KINDS = new Set<PersonalIntelligenceSkillSandboxPermissionKind>(["shell", "install", "credential", "payment", "device"]);
const SANDBOX_KINDS = new Set<PersonalIntelligenceSkillSandboxPermissionKind>(["network", "file", "browser", "lucalink"]);
const APPROVAL_KINDS = new Set<PersonalIntelligenceSkillSandboxPermissionKind>(["model", "tool", "memory", "connector", ...SANDBOX_KINDS]);

function classify(value: string): PersonalIntelligenceSkillSandboxPermissionKind | undefined {
  if (/(credential|token|private[._ -]?key|cookie)/i.test(value)) return "credential";
  if (/(payment|trading|funds)/i.test(value)) return "payment";
  if (/(device|sensor|control)/i.test(value)) return "device";
  if (/(shell|command|script)/i.test(value)) return "shell";
  if (/(install|package)/i.test(value)) return "install";
  if (/lucalink|handoff/i.test(value)) return "lucalink";
  if (/browser/i.test(value)) return "browser";
  if (/file[._ -]?(read|write|access)?/i.test(value)) return "file";
  if (/network/i.test(value)) return "network";
  if (/connector/i.test(value)) return "connector";
  if (/memory/i.test(value)) return "memory";
  if (/model/i.test(value)) return "model";
  if (/tool/i.test(value)) return "tool";
  return undefined;
}

function requirement(kind: PersonalIntelligenceSkillSandboxPermissionKind, label: string, index: number): PersonalIntelligenceSkillSandboxPermissionRequirement {
  const blocked = BLOCKED_KINDS.has(kind);
  const sandboxRequired = blocked || SANDBOX_KINDS.has(kind);
  const approvalRequired = blocked || APPROVAL_KINDS.has(kind);
  return {
    permissionId: `sandbox-permission:${kind}:${index}`,
    kind,
    label,
    riskLevel: blocked ? "critical" : sandboxRequired ? "high" : "medium",
    required: true,
    approvalRequired,
    sandboxRequired,
    blocked,
    reason: blocked
      ? `${kind} access is prohibited by the sandbox planning policy.`
      : sandboxRequired
        ? `${kind} access requires a separate permission model, explicit approval, and a future isolated sandbox.`
        : `${kind} use requires explicit approval before any future runtime consideration.`,
  };
}

export function classifySkillSandboxPermissionRequirements(entry: PersonalIntelligenceSkillRegistryEntry): PersonalIntelligenceSkillSandboxPermissionRequirement[] {
  const declarations = [
    ...entry.requiredPermissions,
    ...entry.requiredCapabilities,
    ...(entry.requiredModels ?? []).map((value) => `model:${value}`),
    ...(entry.requiredTools ?? []).map((value) => `tool:${value}`),
    ...(entry.requiredConnectors ?? []).map((value) => `connector:${value}`),
    ...(entry.memoryPolicy?.access && entry.memoryPolicy.access !== "none" ? [`memory:${entry.memoryPolicy.access}`] : []),
  ];
  const seen = new Set<string>();
  return declarations.flatMap((label) => {
    const kind = classify(label);
    if (!kind) return [];
    const key = `${kind}:${label.toLowerCase()}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [requirement(kind, label, seen.size)];
  });
}
