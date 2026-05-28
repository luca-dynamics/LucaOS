import { memoryService } from "../memoryService";
import { memoryStore } from "../memoryStore";
import { agentMemory } from "../agent/AgentMemory";
import { getWorkflowMemory } from "../agent/cognitive/WorkflowMemory";
import {
  type LucaMemoryItem,
  type LucaMemoryQuery,
  type LucaMemoryQueryResult,
  type LucaMemoryStoreAdapter,
  type LucaMemoryWriteResult,
} from "./MemoryContracts";
import {
  getMemoryContractSnapshot,
  mapLegacyMemoryToLucaMemoryItem,
  mapLucaMemoryItemToLegacyMemory,
} from "./MemoryTierMapping";

function notImplementedWrite(name: string): LucaMemoryWriteResult {
  return { ok: false, reason: `${name} adapter is snapshot-only`, metadata: getMemoryContractSnapshot({ adapter: name }) };
}

export const FrontendMemoryServiceAdapter: LucaMemoryStoreAdapter = {
  name: "FrontendMemoryServiceAdapter",
  kind: "frontend_memory_service",
  async read(_query: LucaMemoryQuery): Promise<LucaMemoryQueryResult> {
    const items = memoryService.getAllMemories().map((item: Record<string, unknown>) =>
      mapLegacyMemoryToLucaMemoryItem(item, { source: "frontend-memoryService" })
    );
    return { items, total: items.length, metadata: getMemoryContractSnapshot({ adapter: this.name }) };
  },
  async write(_item: LucaMemoryItem): Promise<LucaMemoryWriteResult> {
    return notImplementedWrite(this.name);
  },
  getSnapshot() {
    return getMemoryContractSnapshot({ adapter: this.name, kind: this.kind, optIn: true });
  },
};

export const BackendMemoryStoreAdapter: LucaMemoryStoreAdapter = {
  name: "BackendMemoryStoreAdapter",
  kind: "backend_memory_store",
  async read(_query: LucaMemoryQuery): Promise<LucaMemoryQueryResult> {
    const items = memoryStore.getAll().map((item: Record<string, unknown>) =>
      mapLegacyMemoryToLucaMemoryItem(item, { source: "backend-memoryStore" })
    );
    return { items, total: items.length, metadata: getMemoryContractSnapshot({ adapter: this.name }) };
  },
  async write(item: LucaMemoryItem): Promise<LucaMemoryWriteResult> {
    memoryStore.add(mapLucaMemoryItemToLegacyMemory(item));
    return { ok: true, item, metadata: getMemoryContractSnapshot({ adapter: this.name, mode: "opt_in" }) };
  },
  getSnapshot() {
    return getMemoryContractSnapshot({ adapter: this.name, kind: this.kind, optIn: true });
  },
};

export const AgentMemoryServiceAdapter: LucaMemoryStoreAdapter = {
  name: "AgentMemoryServiceAdapter",
  kind: "agent_memory_service",
  async read(_query: LucaMemoryQuery): Promise<LucaMemoryQueryResult> {
    return { items: [], total: 0, metadata: getMemoryContractSnapshot({ adapter: this.name, note: "task-scoped localStorage requires explicit taskId" }) };
  },
  async write(_item: LucaMemoryItem): Promise<LucaMemoryWriteResult> {
    return notImplementedWrite(this.name);
  },
  getSnapshot() {
    return getMemoryContractSnapshot({
      adapter: this.name,
      kind: this.kind,
      sessionMemoryAvailable: typeof agentMemory.getSessionData === "function",
      optIn: true,
    });
  },
};

export const WorkflowMemoryAdapter: LucaMemoryStoreAdapter = {
  name: "WorkflowMemoryAdapter",
  kind: "workflow_memory_stub",
  async read(_query: LucaMemoryQuery): Promise<LucaMemoryQueryResult> {
    return { items: [], total: 0, metadata: getMemoryContractSnapshot({ adapter: this.name, stub: true }) };
  },
  async write(_item: LucaMemoryItem): Promise<LucaMemoryWriteResult> {
    return notImplementedWrite(this.name);
  },
  getSnapshot() {
    const workflowMemory = getWorkflowMemory();
    return getMemoryContractSnapshot({
      adapter: this.name,
      kind: this.kind,
      optIn: true,
      hasQuery: typeof workflowMemory.query === "function",
    });
  },
};
