import type { MemoryItem } from "./memoryTypes";
import { validateMemoryItem } from "./memoryStore";

export type MemorySerializationFormat = "json" | "markdown";

export interface SerializedMemoryFile {
  path: string;
  format: MemorySerializationFormat;
  content: string;
}

export function memoryItemPath(item: MemoryItem, format: MemorySerializationFormat = "json"): string {
  const safeId = item.id.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `${item.privacyZone}/${item.kind}/${safeId}.${format === "json" ? "json" : "md"}`;
}

export function serializeMemoryItem(item: MemoryItem, format: MemorySerializationFormat = "json"): SerializedMemoryFile {
  const validation = validateMemoryItem(item);
  if (!validation.valid) throw new Error(`Invalid memory item: ${validation.errors.join(", ")}`);
  return {
    path: memoryItemPath(item, format),
    format,
    content: format === "json" ? `${JSON.stringify(item, null, 2)}\n` : toMarkdown(item),
  };
}

export function deserializeMemoryJson(content: string): MemoryItem {
  const item = JSON.parse(content) as MemoryItem;
  const validation = validateMemoryItem(item);
  if (!validation.valid) throw new Error(`Invalid memory item: ${validation.errors.join(", ")}`);
  return { ...item, tags: [...item.tags] };
}

function toMarkdown(item: MemoryItem): string {
  const project = item.relatedProjectId ? `\nrelatedProjectId: ${JSON.stringify(item.relatedProjectId)}` : "";
  return `---\nid: ${JSON.stringify(item.id)}\nkind: ${item.kind}\nsource: ${JSON.stringify(item.source)}\nconfidence: ${item.confidence}\nprivacyZone: ${item.privacyZone}\ntags: ${JSON.stringify(item.tags)}${project}\ncreatedAt: ${item.createdAt}\nupdatedAt: ${item.updatedAt}\n---\n\n# ${item.title}\n\n${item.content}\n`;
}
