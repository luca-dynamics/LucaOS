/**
 * Embedding Service - JavaScript wrapper for memoryService
 * This provides a CommonJS/ESM compatible interface for Node.js backend services
 */

// Since memoryService is TypeScript, we need to use a workaround
// We'll use the Google GenAI SDK directly here for backend embedding generation

import { getGenClient } from './genAIClient';

export const embeddingService = {
    /**
     * Generate Embedding Vector for text using Gemini embedding model
     */
    async generateEmbedding(text) {
        try {
            const client = getGenClient();
            if (!client) {
                console.warn('[EMBEDDING] No AI client available, returning empty vector');
                return [];
            }
            
            const result = await client.models.embedContent({
                model: 'gemini-embedding-001',
                contents: text
            });
            return result.embeddings?.[0]?.values || [];
        } catch (e) {
            console.error('[EMBEDDING] Generation failed:', e.message);
            return []; // Fallback to empty vector
        }
    }
};
