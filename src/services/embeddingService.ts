import { getGenClient } from "./genAIClient";

export const embeddingService = {
  /**
   * Generate Embedding Vector for text or multimodal content using Gemini embedding model
   * @param contents - Can be a string, a single Part, or an array of Parts/strings
   */
  async generateEmbedding(contents: string | any | any[]): Promise<number[]> {
    try {
      const client = getGenClient();
      if (!client) {
        console.warn(
          "[EMBEDDING] No AI client available, returning empty vector",
        );
        return [];
      }

      // Format contents for embedContent API
      // If it's a string, it's fine. If it's an array, we ensure it's structured for the API.
      const model = client.getGenerativeModel({ model: "models/text-embedding-004" });
      const result = await model.embedContent(
        typeof contents === "string" ? contents : JSON.stringify(contents)
      );

      return result.embedding?.values || [];
    } catch (e: any) {
      console.error("[EMBEDDING] Generation failed:", e.message);
      return []; // Fallback to empty vector
    }
  },
};
