/**
 * Unified Memory Vault — Absorb Phase 2 product surface.
 *
 * Readable / editable local archive with export + import.
 * Complements PI memory approval pilots (governed writes) and Mission Center.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { LucaMemoryItem } from "../../services/memory/MemoryContracts";
import {
  memoryVaultService,
  type MemoryVaultExport,
} from "../../services/memory/MemoryVaultService";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";

export interface UnifiedMemoryVaultPanelProps {
  variant?: "full" | "compact";
}

export const UnifiedMemoryVaultPanel: React.FC<
  UnifiedMemoryVaultPanelProps
> = ({ variant = "full" }) => {
  const compact = variant === "compact";
  const [items, setItems] = useState<LucaMemoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newContent, setNewContent] = useState("");
  const [importText, setImportText] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await memoryVaultService.list(
        query.trim() ? { text: query.trim(), limit: 100 } : { limit: 100 },
      );
      setItems(result.items);
      setTotal(result.total ?? result.items.length);
    } catch {
      setItems([]);
      setTotal(0);
      setNote("Could not load memory vault.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visible = useMemo(
    () => (compact ? items.slice(0, 6) : items),
    [compact, items],
  );

  const inputClass =
    "w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-[11px] outline-none";
  const inputStyle: React.CSSProperties = {
    borderColor: settingsSurfaceTokens.borderSubtle,
    color: settingsSurfaceTokens.textPrimary,
  };

  const handleSaveEdit = async () => {
    if (!editingId || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const result = await memoryVaultService.update(editingId, {
        content: editDraft,
      });
      setNote(result.ok ? "Memory updated." : result.reason || "Update failed.");
      setEditingId(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const result = await memoryVaultService.delete(id);
      setNote(result.ok ? "Memory deleted." : result.reason || "Delete failed.");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = async () => {
    const key = newKey.trim();
    const content = newContent.trim();
    if (!key || !content || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const result = await memoryVaultService.writeNote(key, content);
      if (result.ok) {
        setNewKey("");
        setNewContent("");
        setNote("Memory saved to vault.");
      } else {
        setNote(result.reason || "Save failed.");
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    setBusy(true);
    setNote(null);
    try {
      const payload = await memoryVaultService.exportVault(
        query.trim() ? { text: query.trim() } : undefined,
      );
      const json = JSON.stringify(payload, null, 2);
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(json);
        setNote(`Exported ${payload.itemCount} item(s) to clipboard.`);
      } else {
        setImportText(json);
        setNote(`Exported ${payload.itemCount} item(s) into import box.`);
      }
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (mode: "merge" | "replace") => {
    if (!importText.trim() || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const result = await memoryVaultService.importVault(importText, { mode });
      if (result.ok) {
        setNote(
          `Imported ${result.imported} (skipped ${result.skipped}) · mode ${result.mode}.`,
        );
        setImportText("");
      } else {
        setNote(result.reason || "Import failed.");
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={
        compact
          ? "mt-0 overflow-hidden rounded-xl border"
          : "mt-2 overflow-hidden rounded-2xl border"
      }
      style={{
        borderColor: settingsSurfaceTokens.borderSubtle,
        background: settingsSurfaceTokens.glass,
      }}
    >
      <div
        className={compact ? "border-b px-3 py-3" : "border-b px-4 py-4"}
        style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p
              className={
                compact ? "text-xs font-semibold" : "text-sm font-semibold"
              }
              style={{ color: settingsSurfaceTokens.textPrimary }}
            >
              Memory Vault
            </p>
            {!compact && (
              <p
                className="mt-1 text-xs leading-relaxed"
                style={{ color: settingsSurfaceTokens.textSecondary }}
              >
                Absorb Phase 2: readable and editable local archive with
                export/import. PI approval pilots stay the governed write path.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading || busy}
            className="rounded-full border px-2.5 py-1 text-[11px] font-medium disabled:opacity-50"
            style={{
              borderColor: settingsSurfaceTokens.borderSubtle,
              color: settingsSurfaceTokens.textSecondary,
            }}
          >
            {loading ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className={compact ? "space-y-3 p-3" : "space-y-4 p-4"}>
        <div className="flex flex-wrap gap-2">
          <input
            className={`${inputClass} min-w-[160px] flex-1`}
            style={inputStyle}
            placeholder="Search vault…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void refresh();
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleExport()}
            className="rounded-full border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
            style={{
              borderColor: settingsSurfaceTokens.borderSubtle,
              color: settingsSurfaceTokens.textPrimary,
            }}
          >
            Export JSON
          </button>
        </div>

        <p
          className="text-[11px]"
          style={{ color: settingsSurfaceTokens.textSecondary }}
        >
          {loading ? "Loading…" : `${total} item(s) in vault`}
        </p>

        <ul className="space-y-1.5">
          {visible.length === 0 && !loading && (
            <li
              className="text-[11px]"
              style={{ color: settingsSurfaceTokens.textTertiary }}
            >
              No memories yet — add a note below or import a vault JSON.
            </li>
          )}
          {visible.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border px-2.5 py-2 text-[11px]"
              style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p
                    className="font-mono text-[10px]"
                    style={{ color: settingsSurfaceTokens.textTertiary }}
                  >
                    {item.tier} · {item.id.slice(0, 12)}
                    {item.id.length > 12 ? "…" : ""}
                  </p>
                  {editingId === item.id ? (
                    <textarea
                      className={`${inputClass} mt-1 min-h-[56px]`}
                      style={inputStyle}
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                    />
                  ) : (
                    <p
                      className="mt-0.5 leading-relaxed"
                      style={{ color: settingsSurfaceTokens.textPrimary }}
                    >
                      {item.content.slice(0, compact ? 120 : 280)}
                      {item.content.length > (compact ? 120 : 280) ? "…" : ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {editingId === item.id ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleSaveEdit()}
                        className="rounded border px-1.5 py-0.5 text-[10px] disabled:opacity-50"
                        style={{
                          borderColor: settingsSurfaceTokens.borderSubtle,
                          color: "var(--luca-success, #4fbf7a)",
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setEditingId(null)}
                        className="rounded border px-1.5 py-0.5 text-[10px]"
                        style={{
                          borderColor: settingsSurfaceTokens.borderSubtle,
                          color: settingsSurfaceTokens.textTertiary,
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setEditingId(item.id);
                          setEditDraft(item.content);
                        }}
                        className="rounded border px-1.5 py-0.5 text-[10px] disabled:opacity-50"
                        style={{
                          borderColor: settingsSurfaceTokens.borderSubtle,
                          color: "var(--luca-info, #4f8cff)",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDelete(item.id)}
                        className="rounded border px-1.5 py-0.5 text-[10px] disabled:opacity-50"
                        style={{
                          borderColor: settingsSurfaceTokens.borderSubtle,
                          color: "var(--luca-danger, #f07178)",
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
          {compact && total > visible.length && (
            <li
              className="text-[10px]"
              style={{ color: settingsSurfaceTokens.textTertiary }}
            >
              +{total - visible.length} more in full settings vault
            </li>
          )}
        </ul>

        {!compact && (
          <>
            <div
              className="rounded-xl border p-3 space-y-2"
              style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
            >
              <p
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: settingsSurfaceTokens.textTertiary }}
              >
                Add note
              </p>
              <input
                className={inputClass}
                style={inputStyle}
                placeholder="Key…"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
              />
              <textarea
                className={`${inputClass} min-h-[52px]`}
                style={inputStyle}
                placeholder="Content…"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
              />
              <button
                type="button"
                disabled={busy || !newKey.trim() || !newContent.trim()}
                onClick={() => void handleAdd()}
                className="rounded-full border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                style={{
                  borderColor: settingsSurfaceTokens.borderSubtle,
                  color: settingsSurfaceTokens.textPrimary,
                }}
              >
                Save to vault
              </button>
            </div>

            <div
              className="rounded-xl border p-3 space-y-2"
              style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
            >
              <p
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: settingsSurfaceTokens.textTertiary }}
              >
                Import vault JSON
              </p>
              <textarea
                className={`${inputClass} min-h-[72px] font-mono text-[10px]`}
                style={inputStyle}
                placeholder='{"format":"luca_memory_vault_v1","items":[...]}'
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !importText.trim()}
                  onClick={() => void handleImport("merge")}
                  className="rounded-full border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                  style={{
                    borderColor: settingsSurfaceTokens.borderSubtle,
                    color: settingsSurfaceTokens.textPrimary,
                  }}
                >
                  Merge import
                </button>
                <button
                  type="button"
                  disabled={busy || !importText.trim()}
                  onClick={() => void handleImport("replace")}
                  className="rounded-full border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                  style={{
                    borderColor: settingsSurfaceTokens.borderSubtle,
                    color: "var(--luca-warning, #e6b450)",
                  }}
                >
                  Replace import
                </button>
              </div>
            </div>
          </>
        )}

        {note && (
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: settingsSurfaceTokens.textSecondary }}
          >
            {note}
          </p>
        )}

        {!compact && (
          <p
            className="text-[10px] leading-relaxed"
            style={{ color: settingsSurfaceTokens.textTertiary }}
          >
            Export format:{" "}
            <span className="font-mono">luca_memory_vault_v1</span>. Import is
            local-archive only in this pilot.
          </p>
        )}
      </div>
    </div>
  );
};

/** Type re-export for tests / consumers */
export type { MemoryVaultExport };
