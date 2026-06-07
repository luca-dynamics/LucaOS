import {
  LUCA_LINK_ADAPTER_CAPABILITIES,
  LUCA_LINK_ADAPTER_HOST_TYPES,
  LUCA_LINK_ADAPTER_PERMISSIONS,
  REQUEST_ONLY_ADAPTER_CAPABILITIES,
  type LucaLinkAdapterManifest,
  type LucaLinkAdapterManifestValidation,
} from "./adapterSandboxTypes";

const ID_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const KNOWN_CAPABILITIES = new Set<string>(LUCA_LINK_ADAPTER_CAPABILITIES);
const KNOWN_HOST_TYPES = new Set<string>(LUCA_LINK_ADAPTER_HOST_TYPES);
const KNOWN_PERMISSIONS = new Set<string>(LUCA_LINK_ADAPTER_PERMISSIONS);
const REQUEST_ONLY_CAPABILITIES = new Set<string>(
  REQUEST_ONLY_ADAPTER_CAPABILITIES,
);
const FORBIDDEN_CAPABILITY_PATTERNS = [
  /credential/i,
  /secret/i,
  /token/i,
  /private[._-]?key/i,
  /shell/i,
  /generated[._-]?code/i,
  /device[._-]?(?:control|actuat|motion)/i,
  /payment/i,
];
const FORBIDDEN_FIELD_PATTERNS = [
  /system[ _-]?prompt/i,
  /hidden[ _-]?prompt/i,
  /private[ _-]?reasoning/i,
  /chain[ _-]?of[ _-]?thought/i,
  /raw[ _-]?(?:code|file|payload)/i,
  /credential/i,
  /access[ _-]?token/i,
  /refresh[ _-]?token/i,
  /private[ _-]?key/i,
  /client[ _-]?secret/i,
];
const FORBIDDEN_CONTENT_PATTERNS = [
  /\b(?:hidden|system)[ _-]?prompt\b/i,
  /\bprivate[ _-]?reasoning\b/i,
  /\bchain[ _-]?of[ _-]?thought\b/i,
];
const SECRET_VALUE_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*[^\s,;]{6,}/i,
  /\b(?:sk|ghp|xox[baprs])[_-][A-Za-z0-9_-]{12,}\b/,
];
const RAW_CODE_PATTERNS = [
  /\b(?:eval|Function)\s*\(/,
  /\b(?:child_process|execSync|spawnSync)\b/,
  /\b(?:import|require)\s*\(/,
  /\b(?:function\s+[A-Za-z_$]|class\s+[A-Za-z_$])\b/,
  /=>\s*[{(]/,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function collectManifestText(
  value: unknown,
  path = "manifest",
): Array<{ path: string; key: string; value: string }> {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectManifestText(item, `${path}[${index}]`),
    );
  }
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = `${path}.${key}`;
    if (typeof child === "string")
      return [{ path: childPath, key, value: child }];
    return collectManifestText(child, childPath);
  });
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function listAdapterManifestBlockers(manifest: unknown): string[] {
  if (!isRecord(manifest)) return ["Adapter manifest must be an object."];

  const blockers: string[] = [];
  const id = text(manifest.id);
  const name = text(manifest.name);
  const version = text(manifest.version);
  const description = text(manifest.description);
  const entrypointRef = text(manifest.entrypointRef);

  if (!id) blockers.push("Adapter manifest id is required.");
  else if (!ID_PATTERN.test(id))
    blockers.push(
      "Adapter manifest id must use lowercase alphanumeric segments.",
    );
  if (!name) blockers.push("Adapter manifest name is required.");
  if (!version) blockers.push("Adapter manifest version is required.");
  else if (!VERSION_PATTERN.test(version))
    blockers.push("Adapter manifest version must be semantic version text.");
  if (!description) blockers.push("Adapter manifest description is required.");
  if (!entrypointRef)
    blockers.push(
      "Adapter manifest entrypointRef is required as an inert reference.",
    );
  else if (/^(?:javascript|data|file):/i.test(entrypointRef))
    blockers.push(
      "Adapter manifest entrypointRef must be an inert adapter reference.",
    );
  if (
    !Array.isArray(manifest.targetHostTypes) ||
    manifest.targetHostTypes.length === 0
  ) {
    blockers.push(
      "Adapter manifest must declare at least one target host type.",
    );
  } else {
    for (const hostType of manifest.targetHostTypes) {
      if (typeof hostType !== "string" || !KNOWN_HOST_TYPES.has(hostType))
        blockers.push(`Unknown adapter target host type: ${String(hostType)}.`);
    }
  }
  if (!Array.isArray(manifest.requestedCapabilities))
    blockers.push("Adapter manifest requestedCapabilities must be an array.");
  if (!Array.isArray(manifest.requestedPermissions)) {
    blockers.push("Adapter manifest requestedPermissions must be an array.");
  } else {
    for (const permission of manifest.requestedPermissions) {
      if (typeof permission !== "string" || !KNOWN_PERMISSIONS.has(permission))
        blockers.push(`Unknown adapter permission: ${String(permission)}.`);
    }
  }
  if (
    !text(manifest.createdAt) ||
    Number.isNaN(Date.parse(text(manifest.createdAt)))
  )
    blockers.push("Adapter manifest createdAt must be a valid timestamp.");
  if (
    !text(manifest.updatedAt) ||
    Number.isNaN(Date.parse(text(manifest.updatedAt)))
  )
    blockers.push("Adapter manifest updatedAt must be a valid timestamp.");

  const capabilities = Array.isArray(manifest.requestedCapabilities)
    ? manifest.requestedCapabilities
    : [];
  for (const capability of capabilities) {
    if (typeof capability !== "string" || !KNOWN_CAPABILITIES.has(capability)) {
      blockers.push(
        `Unknown or forbidden adapter capability: ${String(capability)}.`,
      );
    }
    if (
      typeof capability === "string" &&
      FORBIDDEN_CAPABILITY_PATTERNS.some((pattern) => pattern.test(capability))
    ) {
      blockers.push(
        `Sensitive or executable adapter capability is forbidden: ${capability}.`,
      );
    }
    if (
      typeof capability === "string" &&
      /^(?:file\.write|install|network)$/i.test(capability) &&
      !REQUEST_ONLY_CAPABILITIES.has(capability)
    ) {
      blockers.push(
        `Dangerous capability must be request-only: ${capability}.`,
      );
    }
  }

  for (const item of collectManifestText(manifest)) {
    if (FORBIDDEN_FIELD_PATTERNS.some((pattern) => pattern.test(item.key))) {
      blockers.push(`Forbidden manifest field detected at ${item.path}.`);
    }
    if (
      FORBIDDEN_CONTENT_PATTERNS.some((pattern) => pattern.test(item.value))
    ) {
      blockers.push(
        `Hidden prompt or private reasoning content detected at ${item.path}.`,
      );
    }
    if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(item.value))) {
      blockers.push(
        `Credential, token, secret, or private key material detected at ${item.path}.`,
      );
    }
    if (
      item.key !== "entrypointRef" &&
      RAW_CODE_PATTERNS.some((pattern) => pattern.test(item.value))
    ) {
      blockers.push(`Raw or generated code payload detected at ${item.path}.`);
    }
  }

  return unique(blockers);
}

export function listAdapterManifestWarnings(manifest: unknown): string[] {
  if (!isRecord(manifest)) return [];
  const warnings: string[] = [];
  if (!text(manifest.integrity))
    warnings.push("Adapter manifest integrity metadata is missing.");
  if (!text(manifest.provenance))
    warnings.push("Adapter manifest provenance metadata is missing.");
  if (Array.isArray(manifest.requestedCapabilities)) {
    for (const capability of manifest.requestedCapabilities) {
      if (
        typeof capability === "string" &&
        REQUEST_ONLY_CAPABILITIES.has(capability)
      ) {
        warnings.push(
          `${capability} is request-only and cannot execute in this runtime.`,
        );
      }
    }
  }
  return unique(warnings);
}

export function validateLucaLinkAdapterManifest(
  manifest: unknown,
): LucaLinkAdapterManifestValidation {
  const blockers = listAdapterManifestBlockers(manifest);
  const warnings = listAdapterManifestWarnings(manifest);
  return { valid: blockers.length === 0, blockers, warnings };
}

export function isLucaLinkAdapterManifest(
  manifest: unknown,
): manifest is LucaLinkAdapterManifest {
  return validateLucaLinkAdapterManifest(manifest).valid;
}
