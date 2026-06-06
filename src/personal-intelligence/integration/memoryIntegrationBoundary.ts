import { serializeMemoryItem } from "../memory/memoryFilesystem";
import type { MemorySerializationFormat, SerializedMemoryFile } from "../memory/memoryFilesystem";
import { createMemoryItem, validateMemoryItem } from "../memory/memoryStore";
import type { MemoryItem, MemoryItemInput } from "../memory/memoryTypes";
import { canReadPrivacyZone, canWritePrivacyZone } from "../privacy/privacyPolicy";
import type { PrivacyPolicy } from "../privacy/privacyPolicy";
import type { PrivacyZone } from "../privacy/privacyZones";
import type { IntegrationMappingDescription } from "./integrationTypes";

const SENSITIVE_ZONES = new Set<PrivacyZone>(["credential", "financial", "health", "enterprise"]);

export interface MemoryPreviewPolicy extends PrivacyPolicy {
  explicitlyApprovedZones?: PrivacyZone[];
}

export interface MemoryPrivacyValidation {
  valid: boolean;
  canRead: boolean;
  canWrite: boolean;
  requiresExplicitApproval: boolean;
  errors: string[];
}

export function createMemoryPreview(input: MemoryItemInput, now?: () => Date): MemoryItem {
  return createMemoryItem(input, now);
}

export function serializeMemoryPreviewOnly(memoryItem: MemoryItem, format: MemorySerializationFormat = "json"): SerializedMemoryFile {
  return serializeMemoryItem(memoryItem, format);
}

export function validateMemoryPrivacy(memoryItem: MemoryItem, policy: MemoryPreviewPolicy): MemoryPrivacyValidation {
  const itemValidation = validateMemoryItem(memoryItem);
  const canRead = canReadPrivacyZone(policy, memoryItem.privacyZone);
  const canWrite = canWritePrivacyZone(policy, memoryItem.privacyZone);
  const requiresExplicitApproval = SENSITIVE_ZONES.has(memoryItem.privacyZone);
  const explicitlyApproved = policy.explicitlyApprovedZones?.includes(memoryItem.privacyZone) ?? false;
  const errors = [...itemValidation.errors];
  if (!canRead) errors.push(`Policy does not allow preview reads for ${memoryItem.privacyZone}.`);
  if (!canWrite) errors.push(`Policy does not allow a future governed write for ${memoryItem.privacyZone}.`);
  if (requiresExplicitApproval && !explicitlyApproved) errors.push(`Explicit governed approval is required for ${memoryItem.privacyZone}.`);
  return { valid: errors.length === 0, canRead, canWrite, requiresExplicitApproval, errors };
}

export function describeMemoryPersistenceRequirements(): string[] {
  return [
    "A separately reviewed persistence adapter is required.",
    "Writes must be explicit, auditable, privacy-policy checked, and reversible where possible.",
    "This preview boundary only returns serializable content and never writes it.",
  ];
}

export function describeMemoryPanelMapping(): IntegrationMappingDescription {
  return {
    source: "Memory Item preview",
    destination: "future read-only memory panel",
    previewFields: ["kind", "title", "content", "source", "confidence", "privacyZone", "tags"],
    forbiddenEffects: ["filesystem writes", "database writes", "localStorage", "runtime memory mutation"],
    notes: ["privacyZone and confidence must remain visible and unchanged."],
  };
}
