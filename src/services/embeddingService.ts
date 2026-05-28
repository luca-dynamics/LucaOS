import { cortexUrl } from "../config/api";
import { getGenClient } from "./genAIClient";
import { ProviderFactory } from "./llm/ProviderFactory";
import { memoryReadinessResolver } from "./memory/MemoryReadinessResolver";
import { settingsService } from "./settingsService";

function normalizeLocalModelId(modelId?: string | null): string {
  if (!modelId) return "";
  return modelId.startsWith("local/") ? modelId.split("/")[1] || modelId : modelId;
}

export const embeddingService = {
  /**
   * Generate embedding vectors through the canonical memory route.
   * Local-only memory never falls back to cloud; blocked routes return an empty vector.
   */
  async generateEmbedding(contents: string | any | any[]): Promise<number[]> {
    const text = typeof contents === "string" ? contents : JSON.stringify(contents);
    const route = await memoryReadinessResolver.resolveMemoryRoute();
    const embedStatus = route.capabilities.embed;

    if (
      !embedStatus.canRun ||
      route.readiness === "missing_key" ||
      route.readiness === "missing_runtime" ||
      route.readiness === "missing_embedding_model"
    ) {
      console.warn(`[EMBEDDING] Generation skipped: ${embedStatus.reason}`);
      return [];
    }

    if (route.mode === "local") {
      try {
        const response = await fetch(`${cortexUrl("")}/embed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            texts: [text],
            model: normalizeLocalModelId(route.embeddingModel),
            localOnly: true,
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (response.ok) {
          const data = await response.json();
          return data.embeddings?.[0] || [];
        }
        console.warn(`[EMBEDDING] Local embedding failed (${response.status}); cloud fallback blocked.`);
        return [];
      } catch (e: any) {
        console.warn(`[EMBEDDING] Local embedding error: ${e.message}; cloud fallback blocked.`);
        return [];
      }
    }

    if (!route.networkAllowed) {
      console.warn("[EMBEDDING] Cloud embedding skipped because memory route disallows network calls.");
      return [];
    }

    try {
      const settings = settingsService.get("brain");
      const provider = await ProviderFactory.createEmbeddingProvider(settings!);
      if (provider.embed) return await provider.embed(text);

      const client = getGenClient();
      if (!client) {
        console.warn("[EMBEDDING] No AI client available, returning empty vector");
        return [];
      }

      const model = client.getGenerativeModel({ model: route.embeddingModel || "models/text-embedding-004" });
      const result = await model.embedContent(text);
      return result.embedding?.values || [];
    } catch (e: any) {
      console.error("[EMBEDDING] Generation failed:", e.message);
      return [];
    }
  },
};
