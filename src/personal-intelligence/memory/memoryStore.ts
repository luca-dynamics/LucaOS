import { isPrivacyZone } from "../privacy/privacyZones";
import type { MemoryItem, MemoryItemInput, MemoryStore, MemoryValidationResult } from "./memoryTypes";

const MEMORY_KINDS = new Set(["identity", "preference", "project", "decision", "learning", "person", "company", "device", "runtime_event"]);

export function validateMemoryItem(item: MemoryItem): MemoryValidationResult {
  const errors: string[] = [];
  if (!item.id.trim()) errors.push("id is required");
  if (!MEMORY_KINDS.has(item.kind)) errors.push("kind is invalid");
  if (!item.title.trim()) errors.push("title is required");
  if (!item.content.trim()) errors.push("content is required");
  if (!item.source.trim()) errors.push("source is required");
  if (item.confidence < 0 || item.confidence > 1) errors.push("confidence must be between 0 and 1");
  if (!isPrivacyZone(item.privacyZone)) errors.push("privacyZone is invalid");
  if (Number.isNaN(Date.parse(item.createdAt))) errors.push("createdAt must be an ISO date");
  if (Number.isNaN(Date.parse(item.updatedAt))) errors.push("updatedAt must be an ISO date");
  return { valid: errors.length === 0, errors };
}

export function createMemoryItem(input: MemoryItemInput, now: () => Date = () => new Date()): MemoryItem {
  const timestamp = now().toISOString();
  const item: MemoryItem = { ...input, tags: [...input.tags], createdAt: input.createdAt ?? timestamp, updatedAt: input.updatedAt ?? timestamp };
  const validation = validateMemoryItem(item);
  if (!validation.valid) throw new Error(`Invalid memory item: ${validation.errors.join(", ")}`);
  return item;
}

export function createMemoryStore(initialItems: MemoryItem[] = []): MemoryStore {
  const items = new Map<string, MemoryItem>();
  initialItems.forEach((item) => {
    const result = validateMemoryItem(item);
    if (!result.valid) throw new Error(`Invalid memory item: ${result.errors.join(", ")}`);
    items.set(item.id, clone(item));
  });
  return {
    put(item) {
      const result = validateMemoryItem(item);
      if (!result.valid) throw new Error(`Invalid memory item: ${result.errors.join(", ")}`);
      const copy = clone(item);
      items.set(copy.id, copy);
      return clone(copy);
    },
    get: (id) => { const item = items.get(id); return item ? clone(item) : undefined; },
    list: () => Array.from(items.values(), clone),
    remove: (id) => items.delete(id),
  };
}

function clone(item: MemoryItem): MemoryItem {
  return { ...item, tags: [...item.tags] };
}
