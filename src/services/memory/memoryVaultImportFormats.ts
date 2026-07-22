/**
 * Absorb Phase 2 — multi-format memory import adapters.
 * Maps foreign JSON shapes into luca_memory_vault_v1 items.
 */

import {
  MEMORY_VAULT_EXPORT_FORMAT,
  type MemoryVaultExport,
} from "./MemoryVaultService";
import type { LucaMemoryItem } from "./MemoryContracts";

export type MemoryImportFormatHint =
  | "luca_vault"
  | "plain_array"
  | "chatgpt_export"
  | "claude_export"
  | "auto";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function itemFromParts(
  id: string,
  content: string,
  source: string,
  extra?: Partial<LucaMemoryItem>,
): LucaMemoryItem | null {
  const body = content.trim();
  if (!body) return null;
  return {
    id,
    tier: extra?.tier ?? "session",
    scope: { source, ...(extra?.scope || {}) },
    content: body,
    summary: extra?.summary,
    tags: extra?.tags,
    source,
    confidence: extra?.confidence ?? 0.8,
    createdAt: extra?.createdAt ?? Date.now(),
    updatedAt: extra?.updatedAt,
    metadata: extra?.metadata,
  };
}

function fromPlainArray(raw: unknown[]): LucaMemoryItem[] {
  const items: LucaMemoryItem[] = [];
  raw.forEach((entry, index) => {
    if (typeof entry === "string") {
      const item = itemFromParts(`import-str-${index}`, entry, "plain-array");
      if (item) items.push(item);
      return;
    }
    const rec = asRecord(entry);
    if (!rec) return;
    const content = String(
      rec.content ?? rec.value ?? rec.text ?? rec.body ?? "",
    );
    const id = String(rec.id ?? rec.key ?? rec.title ?? `import-${index}`);
    const item = itemFromParts(id, content, "plain-array", {
      summary: typeof rec.title === "string" ? rec.title : undefined,
      tags: Array.isArray(rec.tags)
        ? rec.tags.filter((t): t is string => typeof t === "string")
        : undefined,
    });
    if (item) items.push(item);
  });
  return items;
}

/** Simplified ChatGPT data export: conversations[].mapping or messages[]. */
function fromChatGptLike(raw: Record<string, unknown>): LucaMemoryItem[] {
  const items: LucaMemoryItem[] = [];
  const conversations = Array.isArray(raw.conversations)
    ? raw.conversations
    : Array.isArray(raw)
      ? raw
      : [];

  conversations.forEach((conv, cIdx) => {
    const c = asRecord(conv);
    if (!c) return;
    const title = String(c.title ?? `conversation-${cIdx}`);
    const messages = Array.isArray(c.messages)
      ? c.messages
      : Array.isArray(c.mapping)
        ? Object.values(c.mapping as Record<string, unknown>)
        : [];

    const lines: string[] = [];
    messages.forEach((msg) => {
      const m = asRecord(msg);
      if (!m) return;
      const message = asRecord(m.message) ?? m;
      const author = asRecord(message.author);
      const role = String(author?.role ?? message.role ?? "unknown");
      const contentObj = message.content;
      let text = "";
      if (typeof contentObj === "string") text = contentObj;
      else if (contentObj && typeof contentObj === "object") {
        const parts = (contentObj as { parts?: unknown }).parts;
        if (Array.isArray(parts)) text = parts.map(String).join("\n");
      }
      if (text.trim()) lines.push(`${role}: ${text.trim()}`);
    });

    if (lines.length === 0 && typeof c.content === "string") {
      lines.push(c.content);
    }

    const item = itemFromParts(
      `chatgpt-${cIdx}-${title.slice(0, 24)}`,
      `Conversation: ${title}\n${lines.join("\n")}`,
      "chatgpt-export",
      { tier: "session", tags: ["import", "chatgpt"] },
    );
    if (item) items.push(item);
  });

  return items;
}

/** Claude-ish: { chats: [{ name, messages: [{sender, text}] }] } or uuid.json array. */
function fromClaudeLike(raw: Record<string, unknown>): LucaMemoryItem[] {
  const items: LucaMemoryItem[] = [];
  const chats = Array.isArray(raw.chats)
    ? raw.chats
    : Array.isArray(raw.conversations)
      ? raw.conversations
      : [];

  chats.forEach((chat, idx) => {
    const c = asRecord(chat);
    if (!c) return;
    const name = String(c.name ?? c.title ?? `chat-${idx}`);
    const messages = Array.isArray(c.chat_messages)
      ? c.chat_messages
      : Array.isArray(c.messages)
        ? c.messages
        : [];
    const lines: string[] = [];
    messages.forEach((msg) => {
      const m = asRecord(msg);
      if (!m) return;
      const sender = String(m.sender ?? m.role ?? "unknown");
      const text = String(m.text ?? m.content ?? m.body ?? "");
      if (text.trim()) lines.push(`${sender}: ${text.trim()}`);
    });
    const item = itemFromParts(
      `claude-${idx}-${name.slice(0, 24)}`,
      `Chat: ${name}\n${lines.join("\n")}`,
      "claude-export",
      { tier: "session", tags: ["import", "claude"] },
    );
    if (item) items.push(item);
  });

  return items;
}

/**
 * Coerce unknown JSON into a MemoryVaultExport, or null if unrecognized.
 */
export function coerceToMemoryVaultExport(
  payload: unknown,
  hint: MemoryImportFormatHint = "auto",
): { export: MemoryVaultExport; detected: string } | { error: string } {
  let raw = payload;
  if (typeof payload === "string") {
    try {
      raw = JSON.parse(payload);
    } catch {
      return { error: "Invalid JSON string" };
    }
  }

  // Native vault
  if (hint === "luca_vault" || hint === "auto") {
    const rec = asRecord(raw);
    if (
      rec &&
      rec.format === MEMORY_VAULT_EXPORT_FORMAT &&
      Array.isArray(rec.items)
    ) {
      return {
        export: rec as unknown as MemoryVaultExport,
        detected: MEMORY_VAULT_EXPORT_FORMAT,
      };
    }
  }

  if (hint === "plain_array" || (hint === "auto" && Array.isArray(raw))) {
    if (Array.isArray(raw)) {
      const items = fromPlainArray(raw);
      if (items.length === 0) return { error: "Plain array had no usable items" };
      return {
        export: {
          format: MEMORY_VAULT_EXPORT_FORMAT,
          exportedAt: new Date().toISOString(),
          itemCount: items.length,
          items,
        },
        detected: "plain_array",
      };
    }
  }

  const rec = asRecord(raw);
  if (!rec) return { error: "Unrecognized import payload" };

  // { items: [...] } without format
  if (
    (hint === "auto" || hint === "luca_vault") &&
    Array.isArray(rec.items) &&
    !rec.format
  ) {
    const items = fromPlainArray(rec.items);
    if (items.length > 0) {
      return {
        export: {
          format: MEMORY_VAULT_EXPORT_FORMAT,
          exportedAt: new Date().toISOString(),
          itemCount: items.length,
          items,
        },
        detected: "items_array",
      };
    }
  }

  if (hint === "chatgpt_export" || hint === "auto") {
    const items = fromChatGptLike(rec);
    if (items.length > 0) {
      return {
        export: {
          format: MEMORY_VAULT_EXPORT_FORMAT,
          exportedAt: new Date().toISOString(),
          itemCount: items.length,
          items,
        },
        detected: "chatgpt_export",
      };
    }
  }

  if (hint === "claude_export" || hint === "auto") {
    const items = fromClaudeLike(rec);
    if (items.length > 0) {
      return {
        export: {
          format: MEMORY_VAULT_EXPORT_FORMAT,
          exportedAt: new Date().toISOString(),
          itemCount: items.length,
          items,
        },
        detected: "claude_export",
      };
    }
  }

  // memories: [...]
  if (Array.isArray(rec.memories)) {
    const items = fromPlainArray(rec.memories);
    if (items.length > 0) {
      return {
        export: {
          format: MEMORY_VAULT_EXPORT_FORMAT,
          exportedAt: new Date().toISOString(),
          itemCount: items.length,
          items,
        },
        detected: "memories_array",
      };
    }
  }

  return {
    error:
      "Could not detect import format (try luca vault, plain array, ChatGPT, or Claude export JSON)",
  };
}
