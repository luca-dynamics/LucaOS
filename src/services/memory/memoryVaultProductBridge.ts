/**
 * Absorb Phase 2 — product wiring: LucaLink + chat → Memory Vault ingest.
 *
 * Soft-fail friendly. Callers may invoke helpers directly or install hooks
 * that listen for LucaLink / eventBus payloads.
 */

import type { MemoryNode } from "../../types";
import {
  getMemoryVaultService,
  type MemoryVaultService,
} from "./MemoryVaultService";
import type {
  MemoryIngestEvent,
  MemoryIngestSourceKind,
  MemoryVaultIngestBatchResult,
} from "./memoryVaultIngest";

export const MEMORY_VAULT_INGEST_BUS_EVENT = "memory:vault_ingest" as const;
export const MEMORY_VAULT_INGESTED_BUS_EVENT = "memory:vault_ingested" as const;

export interface MemoryVaultIngestBusPayload {
  text: string;
  title?: string;
  sourceKind?: MemoryIngestSourceKind;
  sourceId?: string;
  tags?: string[];
  occurredAt?: number;
}

export interface LucaLinkLike {
  on?: (event: string, handler: (event: unknown) => void) => void;
  off?: (event: string, handler: (event: unknown) => void) => void;
}

export interface EventBusLike {
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  off?: (event: string, handler: (...args: unknown[]) => void) => void;
  emit?: (event: string, ...args: unknown[]) => void;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function unwrapLinkEvent(event: unknown): Record<string, unknown> {
  const rec = asRecord(event);
  if (!rec) return {};
  const data = asRecord(rec.data);
  return data ?? rec;
}

/**
 * Map LucaLink `event:memory:ingest` / `memory:ingest` payload → vault event.
 */
export function mapLucaLinkIngestPayload(
  payload: unknown,
): MemoryIngestEvent | null {
  const data = unwrapLinkEvent(payload);
  const text = String(data.text ?? data.content ?? data.value ?? "").trim();
  if (!text) return null;

  const category =
    typeof data.category === "string" ? data.category : undefined;
  const sourceId =
    typeof data.sourceId === "string"
      ? data.sourceId
      : typeof data.deviceId === "string"
        ? data.deviceId
        : typeof data.from === "string"
          ? data.from
          : "remote";

  return {
    text,
    title:
      typeof data.title === "string"
        ? data.title
        : category
          ? `Remote ${category}`
          : "LucaLink ingest",
    sourceKind: "lucalink",
    sourceId,
    tags: ["lucalink", "product-bridge", ...(category ? [category] : [])],
    occurredAt:
      typeof data.timestamp === "number" ? data.timestamp : Date.now(),
    metadata: { category, bridge: "lucalink_ingest" },
  };
}

/**
 * Map a full remote memory node (sync:memory_update) into an ingest candidate.
 * Prefer structural merge for full nodes; this is additive vault indexing.
 */
export function mapRemoteMemoryNodeToIngest(
  memory: unknown,
): MemoryIngestEvent | null {
  const m = asRecord(memory);
  if (!m) return null;
  const text = String(m.value ?? m.content ?? "").trim();
  if (!text) return null;
  return {
    text,
    title: typeof m.key === "string" ? m.key : "Remote memory",
    sourceKind: "lucalink",
    sourceId: String(m.id ?? m.key ?? "remote-node"),
    tags: [
      "lucalink",
      "sync",
      typeof m.category === "string" ? m.category : "SEMANTIC",
    ],
    occurredAt:
      typeof m.timestamp === "number" ? m.timestamp : Date.now(),
    metadata: { memoryId: m.id, key: m.key },
  };
}

/**
 * Map a chat turn (user preference / fact candidate) → vault event.
 */
export function mapChatTurnToIngest(input: {
  text: string;
  role?: "user" | "assistant" | "system";
  conversationId?: string;
  title?: string;
  tags?: string[];
}): MemoryIngestEvent | null {
  const text = input.text?.trim();
  if (!text) return null;
  // Skip very short or purely system noise
  if (text.length < 8) return null;
  if (input.role === "system") return null;

  return {
    text,
    title: input.title || (input.role === "user" ? "User said" : "Chat note"),
    sourceKind: "chat",
    sourceId: input.conversationId || "chat",
    tags: ["chat", "product-bridge", ...(input.tags ?? [])],
    occurredAt: Date.now(),
  };
}

export async function ingestViaProductBridge(
  events: MemoryIngestEvent[],
  options?: {
    vault?: MemoryVaultService;
    bus?: EventBusLike;
  },
): Promise<MemoryVaultIngestBatchResult> {
  const vault = options?.vault ?? getMemoryVaultService();
  const result = await vault.ingestEvents(events);
  try {
    options?.bus?.emit?.(MEMORY_VAULT_INGESTED_BUS_EVENT, result);
  } catch {
    /* soft-fail */
  }
  return result;
}

export async function ingestLucaLinkMemoryPayload(
  payload: unknown,
  options?: { vault?: MemoryVaultService; bus?: EventBusLike },
): Promise<MemoryVaultIngestBatchResult> {
  const event = mapLucaLinkIngestPayload(payload);
  if (!event) {
    return {
      ok: false,
      accepted: 0,
      skipped: 1,
      written: 0,
      results: [],
      reason: "No text in LucaLink memory ingest payload",
    };
  }
  return ingestViaProductBridge([event], options);
}

export async function ingestChatTurn(
  input: {
    text: string;
    role?: "user" | "assistant" | "system";
    conversationId?: string;
    title?: string;
    tags?: string[];
  },
  options?: { vault?: MemoryVaultService; bus?: EventBusLike },
): Promise<MemoryVaultIngestBatchResult> {
  const event = mapChatTurnToIngest(input);
  if (!event) {
    return {
      ok: false,
      accepted: 0,
      skipped: 1,
      written: 0,
      results: [],
      reason: "Chat turn not ingestible",
    };
  }
  return ingestViaProductBridge([event], options);
}

export interface InstallMemoryVaultProductBridgeResult {
  installed: boolean;
  reason?: string;
  dispose?: () => void;
}

/**
 * Install product hooks:
 * - LucaLink: event:memory:ingest (+ memory:ingest alias)
 * - eventBus: memory:vault_ingest
 *
 * Structural sync:memory_update remains in memoryService (full node merge).
 * This bridge adds vault-normalized ingest for text payloads.
 */
export function installMemoryVaultProductBridge(options?: {
  lucaLink?: LucaLinkLike | null;
  bus?: EventBusLike | null;
  vault?: MemoryVaultService;
  /** Also index sync:memory_update nodes into vault (default false — merge stays SoT). */
  indexRemoteSyncNodes?: boolean;
}): InstallMemoryVaultProductBridgeResult {
  const handlers: Array<{ target: "link" | "bus"; event: string; fn: (...args: unknown[]) => void }> =
    [];

  const vault = options?.vault;
  const bus = options?.bus ?? null;
  const link = options?.lucaLink ?? null;

  if (!link?.on && !bus?.on) {
    return {
      installed: false,
      reason: "No LucaLink manager or eventBus available",
    };
  }

  const onIngestPayload = (...args: unknown[]) => {
    const payload = args[0];
    void ingestLucaLinkMemoryPayload(payload, { vault: vault ?? undefined, bus: bus ?? undefined }).catch(
      (error) => {
        console.warn("[MEMORY_VAULT_BRIDGE] LucaLink ingest failed", error);
      },
    );
  };

  const onBusIngest = (...args: unknown[]) => {
    const payload = asRecord(args[0]) as MemoryVaultIngestBusPayload | null;
    if (!payload?.text) return;
    void ingestViaProductBridge(
      [
        {
          text: payload.text,
          title: payload.title,
          sourceKind: payload.sourceKind ?? "manual",
          sourceId: payload.sourceId,
          tags: payload.tags,
          occurredAt: payload.occurredAt,
        },
      ],
      { vault: vault ?? undefined, bus: bus ?? undefined },
    ).catch((error) => {
      console.warn("[MEMORY_VAULT_BRIDGE] bus ingest failed", error);
    });
  };

  if (link?.on) {
    link.on("event:memory:ingest", onIngestPayload);
    link.on("memory:ingest", onIngestPayload);
    handlers.push({ target: "link", event: "event:memory:ingest", fn: onIngestPayload });
    handlers.push({ target: "link", event: "memory:ingest", fn: onIngestPayload });

    if (options?.indexRemoteSyncNodes) {
      const onSync = (...args: unknown[]) => {
        const data = unwrapLinkEvent(args[0]);
        const mapped = mapRemoteMemoryNodeToIngest(data.memory);
        if (!mapped) return;
        void ingestViaProductBridge([mapped], {
          vault: vault ?? undefined,
          bus: bus ?? undefined,
        }).catch(() => undefined);
      };
      link.on("sync:memory_update", onSync);
      handlers.push({ target: "link", event: "sync:memory_update", fn: onSync });
    }
  }

  if (bus?.on) {
    bus.on(MEMORY_VAULT_INGEST_BUS_EVENT, onBusIngest);
    handlers.push({
      target: "bus",
      event: MEMORY_VAULT_INGEST_BUS_EVENT,
      fn: onBusIngest,
    });
  }

  return {
    installed: true,
    dispose: () => {
      for (const h of handlers) {
        try {
          if (h.target === "link") link?.off?.(h.event, h.fn);
          else bus?.off?.(h.event, h.fn);
        } catch {
          /* soft-fail */
        }
      }
    },
  };
}

/** Convenience: build ingest event from a MemoryNode already on disk. */
export function mapLocalMemoryNodeToIngest(
  node: MemoryNode,
): MemoryIngestEvent | null {
  return mapRemoteMemoryNodeToIngest(node);
}
