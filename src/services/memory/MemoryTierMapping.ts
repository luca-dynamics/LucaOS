import {
  LUCA_MEMORY_CONTRACT_METADATA,
  type LucaMemoryItem,
  type LucaMemoryTier,
} from "./MemoryContracts";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const filtered = value.filter((v) => typeof v === "string");
  return filtered.length > 0 ? filtered : undefined;
}

export function inferMemoryTierFromLegacyItem(item: Record<string, unknown>): LucaMemoryTier {
  const raw = [
    item.type,
    item.category,
    item.source,
    item.key,
    item.context,
    asRecord(item.metadata).type,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
    .join(" ");

  if (/(mission|trace|tape|log|telemetry)/.test(raw)) return "trace";
  if (/(skill|tool|capability)/.test(raw)) return "skill";
  if (/(workflow|operation|task_run|execution)/.test(raw)) return "operational";
  if (/(profile|user|persona|preference)/.test(raw)) return "profile";
  if (/(system|platform|internal)/.test(raw)) return "system";
  return "session";
}

export function mapLegacyMemoryToLucaMemoryItem(
  item: Record<string, unknown>,
  options?: { source?: string; scope?: Record<string, string> }
): LucaMemoryItem {
  const metadata = asRecord(item.metadata);
  const scope = {
    ...(typeof metadata.scope === "object" ? (metadata.scope as Record<string, string>) : {}),
    ...(options?.scope || {}),
    userId: (item.userId || metadata.userId) as string | undefined,
    sessionId: (item.sessionId || metadata.sessionId) as string | undefined,
    workflowId: (item.workflowId || metadata.workflowId) as string | undefined,
    missionId: (item.missionId || metadata.missionId) as string | undefined,
    source: (item.source || options?.source || "legacy") as string,
  };

  return {
    id: String(item.id || item.key || `legacy-${Date.now()}`),
    tier: inferMemoryTierFromLegacyItem(item),
    scope,
    content: String(item.content || item.value || ""),
    summary: typeof item.summary === "string" ? item.summary : undefined,
    tags: asStringArray(item.tags) || asStringArray(metadata.tags),
    source: String(item.source || options?.source || "legacy"),
    confidence: typeof item.confidence === "number" ? item.confidence : undefined,
    sensitivity: typeof item.sensitivity === "string" ? item.sensitivity : undefined,
    ttl: typeof item.ttl === "number" ? item.ttl : undefined,
    createdAt: Number(item.createdAt || item.timestamp || Date.now()),
    updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : undefined,
    version: typeof item.version === "string" ? item.version : undefined,
    metadata: {
      ...metadata,
      legacy: {
        ...item,
      },
      ...LUCA_MEMORY_CONTRACT_METADATA,
    },
  };
}

export function mapLucaMemoryItemToLegacyMemory(
  item: LucaMemoryItem,
  options?: { category?: string }
): Record<string, unknown> {
  return {
    id: item.id,
    key: item.id,
    value: item.content,
    category: options?.category || (item.tier === "profile" ? "FACT" : "EPISODIC"),
    source: item.source,
    confidence: item.confidence,
    timestamp: item.createdAt,
    userId: item.scope.userId,
    sessionId: item.scope.sessionId,
    workflowId: item.scope.workflowId,
    missionId: item.scope.missionId,
    metadata: {
      ...(item.metadata || {}),
      lucaTier: item.tier,
      tags: item.tags,
      summary: item.summary,
      sensitivity: item.sensitivity,
      ttl: item.ttl,
      version: item.version,
      ...LUCA_MEMORY_CONTRACT_METADATA,
    },
  };
}

export function getMemoryContractSnapshot(input?: Record<string, unknown>) {
  return {
    ...LUCA_MEMORY_CONTRACT_METADATA,
    ...(input || {}),
  };
}
