/**
 * Absorb Phase 2 — auto-ingestion pilot for apps/devices into Memory Vault.
 *
 * Normalizes heterogeneous events into vault notes. Does not scrape hosts;
 * callers (LucaLink, chat, device bridge) supply text payloads.
 */

import type { MemoryNode } from "../../types";
import type { LucaMemoryWriteResult } from "./MemoryContracts";

export type MemoryIngestSourceKind =
  | "device"
  | "app"
  | "chat"
  | "lucalink"
  | "browser"
  | "manual"
  | "unknown";

export interface MemoryIngestEvent {
  /** Stable-ish source identifier (device id, app id, conversation id). */
  sourceId?: string;
  sourceKind?: MemoryIngestSourceKind;
  /** Short label for the key / title. */
  title?: string;
  /** Body text to remember. */
  text: string;
  tags?: string[];
  occurredAt?: number;
  metadata?: Record<string, unknown>;
}

export interface NormalizedVaultIngest {
  key: string;
  content: string;
  category: MemoryNode["category"];
  tags: string[];
  sourceKind: MemoryIngestSourceKind;
  dedupeFingerprint: string;
}

function slug(value: string, max = 48): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max) || "note";
}

function fingerprint(text: string): string {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, " ");
  // Lightweight non-crypto fingerprint for dedupe.
  let h = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    h = (Math.imul(31, h) + normalized.charCodeAt(i)) | 0;
  }
  return `fp:${(h >>> 0).toString(16)}:${normalized.length}`;
}

/**
 * Normalize a raw ingest event into a vault write shape.
 */
export function normalizeMemoryIngestEvent(
  event: MemoryIngestEvent,
): NormalizedVaultIngest | null {
  const text = event.text?.trim();
  if (!text) return null;

  const sourceKind = event.sourceKind ?? "unknown";
  const title =
    event.title?.trim() ||
    text.slice(0, 40).replace(/\s+/g, " ") ||
    "ingest";
  const sourceId = event.sourceId?.trim() || sourceKind;
  const key = `ingest:${sourceKind}:${slug(sourceId)}:${slug(title, 32)}`;
  const tags = Array.from(
    new Set([
      "ingest",
      sourceKind,
      ...(event.tags ?? []).map((t) => t.trim()).filter(Boolean),
    ]),
  );

  const when =
    typeof event.occurredAt === "number" && Number.isFinite(event.occurredAt)
      ? new Date(event.occurredAt).toISOString()
      : undefined;

  const contentParts = [
    title !== text.slice(0, 40) ? `Title: ${title}` : null,
    text,
    when ? `Occurred: ${when}` : null,
    `Source: ${sourceKind}${event.sourceId ? ` (${event.sourceId})` : ""}`,
  ].filter(Boolean);

  return {
    key,
    content: contentParts.join("\n"),
    category: sourceKind === "chat" ? "SESSION_STATE" : "SEMANTIC",
    tags,
    sourceKind,
    dedupeFingerprint: fingerprint(text),
  };
}

export function normalizeMemoryIngestBatch(
  events: MemoryIngestEvent[],
): NormalizedVaultIngest[] {
  const out: NormalizedVaultIngest[] = [];
  const seen = new Set<string>();
  for (const event of events) {
    const n = normalizeMemoryIngestEvent(event);
    if (!n) continue;
    if (seen.has(n.dedupeFingerprint)) continue;
    seen.add(n.dedupeFingerprint);
    out.push(n);
  }
  return out;
}

export interface MemoryVaultIngestBatchResult {
  ok: boolean;
  accepted: number;
  skipped: number;
  written: number;
  results: LucaMemoryWriteResult[];
  reason?: string;
}
