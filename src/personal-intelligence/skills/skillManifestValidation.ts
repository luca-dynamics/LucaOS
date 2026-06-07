import type {
  PersonalIntelligenceSkillManifest,
  PersonalIntelligenceSkillManifestValidation,
} from "./skillRegistryTypes";

const SUPPORTED_FIELDS = new Set([
  "id", "manifestId", "name", "description", "version", "category",
  "permissions", "capabilities", "requiredModels", "requiredTools",
  "requiredConnectors", "memoryPolicy", "privacyZones", "entrypointRef",
  "declarationRef",
]);

const UNSAFE_DECLARATIONS: Array<[RegExp, string]> = [
  [/hidden[._ -]?prompt/i, "hidden prompts"],
  [/private[._ -]?reasoning/i, "private reasoning"],
  [/raw[._ -]?files?/i, "raw files"],
  [/(credential|token|private[._ -]?key|cookie)[._ -]?(access|read|write)?/i, "credential or secret access"],
  [/(shell|child[._ -]?process|command)[._ -]?(execute|execution|run)?/i, "shell commands"],
  [/(package[._ -]?install|install[._ -]?script)/i, "install scripts"],
  [/^(code|script|source[._ -]?code|generated[._ -]?code)$/i, "inline executable code"],
  [/(inline[._ -]?(code|script)|executable[._ -]?(code|payload))/i, "inline executable code"],
  [/(network[._ -]?endpoint|endpoint[._ -]?execution)/i, "network endpoint execution"],
];

const SECRET_VALUE = /(?:api[_-]?key|token|secret|password|private[_-]?key)\s*[:=]\s*[^\s]{6,}/i;
const BROAD_PERMISSION = /(^|[.:_-])(all|any|unrestricted|admin|wildcard)([.:_-]|$)|\*/i;
const EXTERNAL_CAPABILITY = /(network|file[._ -]?(read|write)|device|browser|connector|lucalink)/i;

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => [key, ...strings(item)]);
  }
  return [];
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validatePersonalIntelligenceSkillManifest(
  manifest: unknown,
): PersonalIntelligenceSkillManifestValidation {
  const missingFields: string[] = [];
  const unsupportedFields: string[] = [];
  const unsafeFields = new Set<string>();
  const warnings = new Set<string>();
  const blockers = new Set<string>();

  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return {
      valid: false,
      missingFields: ["manifest"],
      unsupportedFields: [],
      unsafeFields: [],
      warnings: [],
      blockers: ["Manifest must be a static object suitable for inspection."],
      sideEffectsPerformed: false,
    };
  }

  const candidate = manifest as PersonalIntelligenceSkillManifest;
  for (const field of ["id", "name", "description", "version", "category"] as const) {
    if (!hasText(candidate[field])) missingFields.push(field);
  }
  if (!Array.isArray(candidate.permissions)) missingFields.push("permissions");
  if (!Array.isArray(candidate.capabilities)) missingFields.push("capabilities");
  if (!hasText(candidate.entrypointRef) && !hasText(candidate.declarationRef)) {
    missingFields.push("entrypointRef or declarationRef");
    warnings.add("Entrypoint reference is missing; references remain inert even when declared.");
  }

  for (const key of Object.keys(candidate)) {
    if (!SUPPORTED_FIELDS.has(key)) unsupportedFields.push(key);
  }

  const searchable = strings(candidate);
  for (const value of searchable) {
    for (const [pattern, label] of UNSAFE_DECLARATIONS) {
      if (pattern.test(value)) unsafeFields.add(label);
    }
    if (SECRET_VALUE.test(value)) unsafeFields.add("secret-like values");
  }

  if ((candidate.permissions ?? []).some((permission) => BROAD_PERMISSION.test(permission))) {
    warnings.add("Broad permissions require explicit review and narrowing.");
  }
  if ((candidate.capabilities ?? []).some((capability) => EXTERNAL_CAPABILITY.test(capability))) {
    warnings.add("Network, file, browser, connector, LucaLink, or device capabilities require review.");
  }
  if (candidate.memoryPolicy && candidate.memoryPolicy.access !== "none") {
    warnings.add("Memory access is declaration-only and requires a separate permission gate.");
  }
  if (!Array.isArray(candidate.requiredModels)) warnings.add("Model requirements are undeclared.");
  if (!Array.isArray(candidate.requiredTools)) warnings.add("Tool requirements are undeclared.");
  if (!Array.isArray(candidate.requiredConnectors)) warnings.add("Connector requirements are undeclared.");

  for (const field of missingFields) blockers.add(`Missing required field: ${field}.`);
  for (const unsafeField of unsafeFields) blockers.add(`Unsafe manifest declaration blocked: ${unsafeField}.`);

  return {
    valid: missingFields.length === 0 && unsafeFields.size === 0,
    missingFields: [...missingFields],
    unsupportedFields: [...unsupportedFields].sort(),
    unsafeFields: [...unsafeFields].sort(),
    warnings: [...warnings],
    blockers: [...blockers],
    sideEffectsPerformed: false,
  };
}
