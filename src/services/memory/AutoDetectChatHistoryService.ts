/**
 * AutoDetectChatHistoryService — automatically detects and ingests local chat
 * history exports (ChatGPT, Claude, etc.) from default system directories.
 */

import { coerceToMemoryVaultExport } from "./memoryVaultImportFormats";
import { getMemoryVaultService } from "./MemoryVaultService";

export interface DetectedChatHistoryResult {
  source: "chatgpt" | "claude" | "cursor" | "ollama" | "downloads_export" | "browser_storage";
  filePath?: string;
  name: string;
  conversationCount: number;
  itemCount: number;
  detectedAt: number;
  status: "detected" | "ingested" | "error";
  error?: string;
}

export interface SystemChatHistoryScanSummary {
  scannedAt: number;
  detectedSources: DetectedChatHistoryResult[];
  totalIngestedConversations: number;
}

/**
 * Scan system directories or standard paths for export files.
 */
export async function autoDetectSystemChatHistory(): Promise<SystemChatHistoryScanSummary> {
  const detectedSources: DetectedChatHistoryResult[] = [];
  let totalIngestedConversations = 0;

  // In Electron environment, we can check system paths:
  const isElectron =
    typeof window !== "undefined" &&
    Boolean((window as any).electron || (window as any).luca);

  if (isElectron && typeof (window as any).luca?.scanChatHistory === "function") {
    try {
      const res = await (window as any).luca.scanChatHistory();
      if (Array.isArray(res?.sources)) {
        for (const src of res.sources) {
          if (src.payload) {
            const coerced = coerceToMemoryVaultExport(src.payload, "auto");
            if ("export" in coerced && coerced.export.items.length > 0) {
              const vault = getMemoryVaultService();
              const ingestRes = await vault.importExport(coerced.export);
              detectedSources.push({
                source: src.source || "downloads_export",
                filePath: src.filePath,
                name: src.name || "Chat History Export",
                conversationCount: coerced.export.items.length,
                itemCount: ingestRes.imported,
                detectedAt: Date.now(),
                status: "ingested",
              });
              totalIngestedConversations += coerced.export.items.length;
            }
          }
        }
      }
    } catch (err) {
      console.warn("[AutoDetectChatHistory] Electron scan error", err);
    }
  }

  return {
    scannedAt: Date.now(),
    detectedSources,
    totalIngestedConversations,
  };
}
