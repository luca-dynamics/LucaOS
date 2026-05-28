export const LUCA_MEMORY_CONTRACT_METADATA = {
  contractKind: "luca_memory_contract" as const,
  migrationRequired: false as const,
  adapterOnly: true as const,
  runtimeBehaviorChanged: false as const,
};

export type LucaMemoryTier =
  | "session"
  | "profile"
  | "operational"
  | "skill"
  | "trace"
  | "system";

export interface LucaMemoryScope {
  userId?: string;
  sessionId?: string;
  projectId?: string;
  workflowId?: string;
  skillId?: string;
  missionId?: string;
  deviceId?: string;
  source?: string;
}

export interface LucaMemoryItem {
  id: string;
  tier: LucaMemoryTier;
  scope: LucaMemoryScope;
  content: string;
  summary?: string;
  tags?: string[];
  source: string;
  confidence?: number;
  sensitivity?: string;
  ttl?: number;
  createdAt: number;
  updatedAt?: number;
  version?: string;
  metadata?: Record<string, unknown>;
}

export interface LucaMemoryQuery {
  tier?: LucaMemoryTier;
  scope?: LucaMemoryScope;
  text?: string;
  tags?: string[];
  limit?: number;
  includeExpired?: boolean;
  minConfidence?: number;
  metadata?: Record<string, unknown>;
}

export interface LucaMemoryQueryResult {
  items: LucaMemoryItem[];
  total?: number;
  metadata?: Record<string, unknown>;
}

export interface LucaMemoryWriteResult {
  ok: boolean;
  item?: LucaMemoryItem;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface LucaMemoryStoreAdapter {
  name: string;
  kind: string;
  read(query: LucaMemoryQuery): Promise<LucaMemoryQueryResult>;
  write(item: LucaMemoryItem): Promise<LucaMemoryWriteResult>;
  update?(id: string, patch: Partial<LucaMemoryItem>): Promise<LucaMemoryWriteResult>;
  delete?(id: string): Promise<LucaMemoryWriteResult>;
  getSnapshot?(): Record<string, unknown>;
}
