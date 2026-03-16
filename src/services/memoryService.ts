import { MemoryNode } from "../types";
import { settingsService } from "./settingsService";
import { apiUrl, cortexUrl } from "../config/api";
import { LOCAL_EMBEDDING_MODEL_IDS } from "./ModelManagerService";
import { BRAIN_CONFIG } from "../config/brain.config";

// API Key sourced from environment variable
// For Vite/browser: VITE_API_KEY, For Node.js: API_KEY
// Create a .env file with: VITE_API_KEY=your_gemini_api_key_here
const MEMORY_STORAGE_KEY = "LUCA_LUCA_ARCHIVE_V1";
const CORE_URL = apiUrl("/api/memory");

// Hybrid Architecture Modes
type MemoryMode = "LOCAL" | "DELEGATED" | "STANDALONE";
let _currentMode: MemoryMode = "LOCAL";

import { getGenClient } from "./genAIClient";
import { ProviderFactory } from "./llm/ProviderFactory";

// Track if we've already logged Cortex unavailability (to avoid spam)
let _cortexUnavailableLogged = false;

// Import lucaLinkManager for memory sync
let lucaLinkManager: any = null;
try {
  // Dynamic import to avoid circular dependency
  import("./lucaLink/manager").then((module) => {
    lucaLinkManager = module.lucaLinkManager;
  });
} catch {
  console.warn("[MEMORY] Luca Link Manager not available for memory sync");
}

// 2. Setup Memory Sync Listeners
if (lucaLinkManager) {
  lucaLinkManager.on("sync:memory_update", async (event: any) => {
    const { memory } = event.data;
    if (memory) {
      console.log(`[MEMORY SYNC] Received remote memory update: ${memory.key}`);

      const memories = memoryService.getAllMemories();
      const existingIndex = memories.findIndex(
        (m) =>
          m.id === memory.id ||
          (m.key === memory.key && m.category === memory.category),
      );

      if (existingIndex >= 0) {
        // Only update if newer
        if (memory.timestamp > memories[existingIndex].timestamp) {
          memories[existingIndex] = memory;
        }
      } else {
        memories.push(memory);
      }

      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memories));

      // If we are on desktop/primary, also sync to disk
      // We check this via window.electron or process.env (simple proxy)
      const isPrimary = !(window as any).Capacitor?.isNativePlatform();
      if (isPrimary) {
        fetch(`${CORE_URL}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(memories),
        }).catch(() => {});
      }
    }
  });

  lucaLinkManager.on("sync:memory_wipe", async () => {
    console.log(
      "[MEMORY SYNC] Received remote memory wipe. Resetting local storage.",
    );
    localStorage.removeItem(MEMORY_STORAGE_KEY);

    const isPrimary = !(window as any).Capacitor?.isNativePlatform();
    if (isPrimary) {
      fetch(`${CORE_URL}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([]),
      }).catch(() => {});
    }
  });

  lucaLinkManager.on("event:memory:ingest", async (event: any) => {
    const { text } = event.data;
    if (text) {
      console.log(`[MEMORY SYNC] Received proxy ingestion request: "${text}"`);
      // We are the desktop, so we save it to our local storage and cortex
      memoryService
        .saveMemory(`REMOTE_${Date.now()}`, text, "SEMANTIC")
        .catch((e) =>
          console.warn("[MEMORY SYNC] Failed to save proxied memory:", e),
        );
    }
  });
}

export const memoryService = {
  // Use unified cortexUrl helper which handles LAN/Cloud/Local resolution
  async getCortexUrl() {
    // 1. Try dynamic port from Electron Main Process (via IPC)
    if ((window as any).luca?.getCortexUrl) {
      try {
        const url = await (window as any).luca.getCortexUrl();
        if (url) return url;
      } catch (e) {
        console.warn("[MEMORY] Failed to get dynamic cortex URL:", e);
      }
    }
    // 2. Fallback to static config
    return cortexUrl("");
  },

  /**
   * Centralized filter for ignoring high-entropy system instructions or maintenance pulses.
   * Prevents system prompts from polluting the long-term memory archive.
   */
  isSystemPrompt(text: string): boolean {
    if (!text) return false;
    const lower = text.toLowerCase();
    const systemPatterns = [
      "[system awakening pulse]",
      "[ambient vision]",
      "[system instruction]",
      "do not repeat this header",
      "visual core activation",
      "standing by for instructions",
      "last autonomous action",
      "i autonomously executed",
      "tool execution",
    ];

    return systemPatterns.some((pattern) => lower.includes(pattern));
  },

  /**
   * Initialize Memory Service and determine operating mode
   */
  async initialize() {
    console.log("[MEMORY] Initializing Hybrid Architecture...");

    // 1. Check if Cortex is reachable (Local Mode)
    const isLocal = await this.checkCortexHealth();

    if (isLocal) {
      _currentMode = "LOCAL";
      console.log("[MEMORY] Cortex Detected. Operating in LOCAL mode.");
      return;
    }

    // 2. If not local, check Luca Link (Delegated Mode)
    // We wait a bit for Luca Link to connect if it's initializing
    if (lucaLinkManager?.isConnected()) {
      _currentMode = "DELEGATED";
      console.log(
        "[MEMORY] Cortex Offline. Luca Link Connected. Operating in DELEGATED mode.",
      );
    } else {
      _currentMode = "STANDALONE";
      console.log(
        "[MEMORY] Cortex Offline. Luca Link Disconnected. Operating in STANDALONE mode.",
      );

      // Listen for connection to upgrade mode later
      if (lucaLinkManager) {
        lucaLinkManager.on("connected", () => {
          if (_currentMode === "STANDALONE") {
            _currentMode = "DELEGATED";
            console.log(
              "[MEMORY] Luca Link Connected. Upgrading to DELEGATED mode.",
            );
          }
        });
      }
    }
  },

  /**
   * Returns the current operating mode
   */
  getMode(): MemoryMode {
    return _currentMode;
  },
  async syncWithCore(): Promise<MemoryNode[]> {
    try {
      const res = await fetch(`${CORE_URL}/load`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const serverMemories = await res.json();
        if (Array.isArray(serverMemories)) {
          localStorage.setItem(
            MEMORY_STORAGE_KEY,
            JSON.stringify(serverMemories),
          );
          return serverMemories;
        }
      }
    } catch {
      console.log("Core Memory Sync Failed. Using Local Cache.");
    }
    return this.getAllMemories();
  },

  /**
   * Retrieve all stored memories (Sync from LocalStorage).
   */
  getAllMemories(): MemoryNode[] {
    try {
      const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  /**
   * Fetch Graph Data for Visualization (Project Synapse V2)
   */
  async getGraphData(): Promise<any | null> {
    try {
      const res = await fetch(`${CORE_URL}/graph/visualize`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const backendGraph = await res.json();
        return this.transformGraphData(backendGraph);
      }
    } catch {
      console.warn("Graph Fetch Failed (Core Offline?)");
    }
    return null;
  },

  /**
   * Transform Backend Graph (Nodes/Edges) into ThoughtGraph Format
   */
  transformGraphData(backendGraph: { nodes: any[]; edges: any[] }): {
    nodes: any[];
    edges: any[];
  } {
    if (!backendGraph || !Array.isArray(backendGraph.nodes))
      return { nodes: [], edges: [] };

    // 1. Map Nodes
    const nodes = backendGraph.nodes.map((n) => {
      let details: any = {};
      try {
        details = n.description ? JSON.parse(n.description) : {};
      } catch {
        // Ignore invalid JSON in description
      }

      // Determine status based on type or existing status
      let status = "PENDING";
      if (n.type === "EVENT") status = "COMPLETE";

      // Generate human-readable label
      let label = details.tool || n.name;

      // If still looks like EXEC_toolName_timestamp, extract and format toolName
      if (label.startsWith("EXEC_")) {
        const parts = label.split("_");
        if (parts.length >= 2) {
          // Extract tool name (second part) and convert to Title Case with spaces
          const toolName = parts[1];
          label = toolName
            .replace(/([A-Z])/g, " $1") // Add space before capitals
            .replace(/^./, (str: string) => str.toUpperCase()) // Capitalize first letter
            .trim();
        }
      }

      return {
        id: n.name, // Keep original name as ID
        label: label,
        toolName: details.tool,
        status: status,
        timestamp: n.last_updated || Date.now(),
        details: details.result,
        type: n.type,
      };
    });

    // 2. Map Edges to find Parents (for Tree Layout)
    const mappedNodes = nodes.map((node: any) => {
      // Find an incoming edge that implies parentage (NEXT_STEP)
      const incoming = backendGraph.edges.find(
        (e: any) => e.target === node.id && e.relation === "NEXT_STEP",
      );

      if (incoming) {
        return { ...node, parentId: incoming.source };
      }
      return node;
    });

    // Filter for valid ThoughtNodes (Events)
    const eventsOnly = mappedNodes.filter((n: any) => n.type === "EVENT");

    return { nodes: eventsOnly, edges: [] };
  },

  /**
   * Generate Embedding Vector for text/multimodal content using configured model (Cloud or Local)
   * HYBRID: Routes to Cortex for local models, Gemini API for cloud models
   */
  async generateEmbedding(contents: string | any | any[]): Promise<number[]> {
    const text = typeof contents === "string" ? contents : "";
    const settings = settingsService.get("brain");
    const memoryModel = settings?.memoryModel || BRAIN_CONFIG.defaults.brain;

    // Check if using local embedding model (IDs from ModelManagerService - single source of truth)
    const isLocalModel = LOCAL_EMBEDDING_MODEL_IDS.some(
      (id: string) => memoryModel === id || memoryModel.includes(id),
    );

    // --- LOCAL EMBEDDING PATH ---
    if (isLocalModel) {
      try {
        console.log(`[MEMORY] Using LOCAL embedding model: ${memoryModel}`);
        const url = await this.getCortexUrl();
        const response = await fetch(`${url}/embed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            texts: [text],
            model: memoryModel,
            localOnly: true, // If we are in the local path, we want to enforce privacy
          }),
          signal: AbortSignal.timeout(15000), // 15s for local processing
        });

        if (response.ok) {
          const data = await response.json();
          // Cortex returns { embeddings: [[...]], model, dimension }
          return data.embeddings?.[0] || [];
        } else {
          console.warn(
            `[MEMORY] Local embedding failed (${response.status}), falling back to Cloud`,
          );
        }
      } catch (e: any) {
        console.warn(
          `[MEMORY] Local embedding error: ${e.message}, falling back to Cloud`,
        );
      }
    }

    // --- CLOUD EMBEDDING PATH (Provider Agnostic) ---
    try {
      const provider = await ProviderFactory.createEmbeddingProvider(settings!);
      if (provider.embed) {
        return await provider.embed(text);
      }
      
      // Legacy fallback just in case
      const ai = getGenClient();
      const result = await (ai.models as any).embedContent({
        model: "text-embedding-004", // Use canonical high-quality model
        content: { parts: [{ text }] },
      });
      return result.embedding?.values || [];
    } catch (e: any) {
      if (
        e.message?.includes("Failed to fetch") ||
        e.message?.includes("NetworkError")
      ) {
        console.warn("[MEMORY] Embedding generation skipped (Network Offline)");
      } else {
        console.error(
          "[MEMORY] Embedding Generation Failed (Skipping):",
          e.message || e,
        );
      }
      return []; // Fallback safely to empty vector instead of crashing
    }
  },

  /**
   * Save a new memory with Mem0 category support
   * Supports automatic expiry for SESSION_STATE memories
   * @param autoConsolidate - If true, check for and merge duplicates after saving (default: false)
   */
  async saveMemory(
    key: string,
    value: string,
    category: MemoryNode["category"] = "SEMANTIC",
    autoConsolidate: boolean = false,
    importance?: number,
    tenantId?: string,
  ): Promise<MemoryNode | null> {
    // --- SYSTEM FILTER ---
    if (this.isSystemPrompt(value) || this.isSystemPrompt(key)) {
      console.log(`[MEMORY] Skipping system-level prompt/pulse: ${key}`);
      return null;
    }

    const memories = this.getAllMemories();

    // 1. Generate Embedding
    const contentToEmbed = `${key}: ${value}`;
    const vector = await this.generateEmbedding(contentToEmbed);

    // 2. Active Learning: Extract Entities & Map to Graph
    if (
      category === "FACT" ||
      category === "USER_STATE" ||
      category === "PROTOCOL"
    ) {
      this.extractEntities(contentToEmbed)
        .then((data) => {
          if (data.entities?.length > 0 || data.relationships?.length > 0) {
            console.log(
              `[MEMORY] Active Learning: Mapped ${data.entities.length} entities and ${data.relationships.length} relations.`,
            );
            // Map to Knowledge Graph via backend
            fetch(apiUrl("/api/memory/graph/merge"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                triples: data.relationships.map((r: any) => ({
                  source: r.source,
                  relation: r.relation,
                  target: r.target,
                })),
                entities: data.entities,
              }),
            }).catch(() => {});
          }
        })
        .catch((e) => console.warn("[MEMORY] Active Learning failed:", e));
    }

    // 3. Determine expiry for SESSION_STATE
    const expiresAt =
      category === "SESSION_STATE"
        ? Date.now() + 86400000 // 24 hours
        : undefined;

    // 4. Create new memory node with metadata
    const newNode: MemoryNode = {
      id: crypto.randomUUID(),
      key,
      value,
      category,
      tenantId,
      timestamp: Date.now(),
      confidence: 0.99,
      expiresAt,
      metadata: {
        source: "manual",
        importance:
          importance ||
          (category === "USER_STATE" ? 10 : category === "AGENT_STATE" ? 8 : 5),
        lastAccessed: Date.now(),
      },
    };

    // Update existing or add new
    const existingIndex = memories.findIndex(
      (m) =>
        m.key.toLowerCase() === key.toLowerCase() && m.category === category,
    );
    if (existingIndex >= 0) memories[existingIndex] = newNode;
    else memories.push(newNode);

    // 4. Save to Browser
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memories));

    // 3. Save to Disk (Background Sync)
    fetch(`${CORE_URL}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(memories),
    }).catch(() => {});

    // 4. Save Vector to Core (Level 4 Upgrade)
    if (vector.length > 0) {
      fetch(`${CORE_URL}/vector-save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newNode.id,
          content: contentToEmbed,
          embedding: vector,
          metadata: { category },
        }),
      }).catch((e) => console.warn("Vector Save Failed", e));
    }

    // 5. Save to LightRAG Cortex (Level 5 Upgrade)
    this.saveToCortex(contentToEmbed).catch((e) =>
      console.warn("Cortex Save Failed", e),
    );

    // 6. Sync memory to all linked devices (State Propagation)
    if (lucaLinkManager?.isConnected()) {
      try {
        console.log(`[MEMORY SYNC] Broadcasting "${key}" to linked devices...`);
        lucaLinkManager.syncState("memory_update", {
          memory: newNode,
          category: category,
          timestamp: Date.now(),
        });
      } catch (e) {
        console.warn("[MEMORY SYNC] Failed to sync to linked devices:", e);
      }
    }

    // 7. Auto-consolidation check (if enabled)
    if (autoConsolidate) {
      // Check for similar memories and merge if found
      try {
        const similar = await this.findSimilarMemories(newNode, 0.9);
        if (similar.length > 0) {
          // Found similar memories - merge the first one
          const similarMemory = similar[0].memory;
          const merged = await this.mergeMemories(newNode, similarMemory);

          // Update the memory in storage
          const allMemoriesAfter = this.getAllMemories();
          const index = allMemoriesAfter.findIndex(
            (m) => m.id === newNode.id || m.id === similarMemory.id,
          );
          if (index >= 0) {
            allMemoriesAfter[index] = merged;
            // Remove duplicate if it exists
            const duplicateIndex = allMemoriesAfter.findIndex(
              (m) =>
                m.id !== merged.id &&
                (m.id === newNode.id || m.id === similarMemory.id),
            );
            if (duplicateIndex >= 0) {
              allMemoriesAfter.splice(duplicateIndex, 1);
            }
            localStorage.setItem(
              MEMORY_STORAGE_KEY,
              JSON.stringify(allMemoriesAfter),
            );

            // Sync to disk
            fetch(`${CORE_URL}/save`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(allMemoriesAfter),
            }).catch(() => {});

            console.log(
              `[MEMORY] Auto-consolidated similar memory: "${similarMemory.key}" merged into "${merged.key}"`,
            );
            return merged;
          }
        }
      } catch (e) {
        console.warn("[MEMORY] Auto-consolidation check failed:", e);
      }
    }

    return newNode;
  },

  /**
   * MEM0: Extract entities from text using Cortex distillation
   */
  async extractEntities(text: string): Promise<any> {
    try {
      const url = await this.getCortexUrl();
      const res = await fetch(`${url}/knowledge/import?platform=generic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          entities: data.entities || [],
          relationships: data.relationships || [],
          facts: data.facts || [],
        };
      }
    } catch (e) {
      console.warn("[MEMORY] Entity extraction failed:", e);
    }
    return { entities: [], relationships: [], facts: [] };
  },

  /**
   * MEM0: Get aggregated knowledge for workforce injection
   * Prioritizes high-importance facts and active session state
   */
  getWorkforceKnowledge(limit: number = 20): string {
    const memories = this.getAllMemories();
    const now = Date.now();

    // 1. Filter for high importance or active session
    const filtered = memories
      .filter((m) => {
        const importance = m.metadata?.importance || 0;
        const isSession = m.category === "SESSION_STATE";
        const isUser = m.category === "USER_STATE";
        const notExpired = !m.expiresAt || m.expiresAt > now;

        return notExpired && (importance >= 7 || isSession || isUser);
      })
      .sort((a, b) => {
        // Sort by importance primarily, then timestamp
        const impA = a.metadata?.importance || 0;
        const impB = b.metadata?.importance || 0;
        if (impA !== impB) return impB - impA;
        return b.timestamp - a.timestamp;
      })
      .slice(0, limit);

    if (filtered.length === 0) return "No critical workforce knowledge found.";

    return filtered
      .map((m) => `[${m.category}] ${m.key}: ${m.value}`)
      .join("\n");
  },

  /**
   * Search memories using Vector Similarity (Semantic Search)
   */
  async retrieveMemory(query: string, tenantId?: string): Promise<MemoryNode[]> {
    // 1. Try LightRAG Cortex (Level 5)
    try {
      const cortexResults = await this.queryCortex(query);
      if (cortexResults) {
        // --- REFUSAL FILTER ---
        // If Cortex returns a "not enough information" response, do NOT inject it.
        // Doing so siloes the agent's capabilities because it treats the refusal as a high-confidence fact.
        const refusalPatterns = [
          "do not have enough information",
          "not mentioned in the provided text",
          "no information regarding",
          "not found in the database",
        ];

        const isRefusal = refusalPatterns.some((pattern) =>
          cortexResults.toLowerCase().includes(pattern),
        );

        if (isRefusal) {
          console.log(
            "[MEMORY] Cortex refusal detected. Discarding synthesis to prevent capability siloing.",
          );
          return []; // Fall back to vector/keyword search
        }

        // LightRAG returns a string answer usually, but we can parse it or wrap it
        // For now, let's treat it as a high-confidence "synthesized" memory
        return [
          {
            id: "cortex-result",
            key: "CORTEX_SYNTHESIS",
            value: cortexResults,
            category: "SEMANTIC",
            timestamp: Date.now(),
            confidence: 1.0,
          },
        ];
      }
    } catch (e: any) {
      // Only log if it's not a simple "unavailable" error (expected when Cortex is down)
      if (
        e.message &&
        !e.message.includes("unavailable") &&
        !e.message.includes("timeout")
      ) {
        console.warn(
          "Cortex search failed, falling back to vectors:",
          e.message,
        );
      }
    }

    // 2. Try Vector Search (Level 4)
    try {
      const vector = await this.generateEmbedding(query);
      if (vector.length > 0) {
        const res = await fetch(`${CORE_URL}/vector-search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ embedding: vector, limit: 5 }),
        });

        if (res.ok) {
          const vectorResults = await res.json();
          if (vectorResults.length > 0) {
            return vectorResults.map((v: any) => ({
              id: v.id,
              key: v.content.split(":")[0],
              value: v.content.substring(v.content.indexOf(":") + 1).trim(),
              category: v.metadata?.category || "FACT",
              timestamp: Date.now(),
              confidence: v.similarity,
            }));
          }
        }
      }
    } catch {
      console.warn("Vector search failed, falling back to keyword match.");
    }

    // 3. Fallback to Keyword Match (Level 3)
    const memories = this.getAllMemories();
    const lowerQuery = query.toLowerCase();
    return memories.filter(
      (m) =>
        (!tenantId || m.tenantId === tenantId) &&
        (m.key.toLowerCase().includes(lowerQuery) ||
          m.value.toLowerCase().includes(lowerQuery)),
    );
  },

  // --- LIGHTRAG CORTEX METHODS ---

  /**
   * Check if Cortex (LightRAG) is available
   */
  /**
   * Check if Cortex/Gateway is reachable
   */
  async checkCortexHealth(): Promise<boolean> {
    try {
      // 1. Try hitting the API Gateway first (Node server)
      // This is the most reliable way to check if LUCA's "Hands" are available
      // The Node server mounts root routes at /api/ (e.g., /api/health)
      const gatewayUrl = apiUrl("/api/health");
      const gatewayRes = await fetch(gatewayUrl, {
        signal: AbortSignal.timeout(3000),
      });
      if (gatewayRes.ok) return true;

      // 2. Fallback to direct Cortex port if gateway is bypassed
      const url = await this.getCortexUrl();
      const res = await fetch(`${url}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Get Cortex status with diagnostic information
   */
  async getCortexStatus(): Promise<{ available: boolean; message: string }> {
    try {
      const url = await this.getCortexUrl();
      const res = await fetch(`${url}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000), // Increased to 5s
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "online") {
          const isReady = data.rag_initialized === true;
          return {
            available: true,
            message: isReady
              ? "Cortex is online and ready"
              : "Cortex is online (Initializing memory...)",
          };
        } else {
          return {
            available: false,
            message: "Cortex is running but not online",
          };
        }
      } else {
        return {
          available: false,
          message: `Cortex health check failed: ${res.status}`,
        };
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        return {
          available: false,
          message: "Cortex connection timeout (service may not be running)",
        };
      }
      return {
        available: false,
        message: `Cortex unavailable: ${e.message || "Connection failed"}`,
      };
    }
  },

  async saveToCortex(text: string) {
    // Check health first to avoid unnecessary errors
    const isHealthy = await this.checkCortexHealth();

    if (!isHealthy) {
      // If in delegated mode, we proxy instead of throwing
      if (_currentMode === "DELEGATED" && lucaLinkManager) {
        console.log("[MEMORY] Proxying ingestion to Desktop via Luca Link...");
        lucaLinkManager.sendEvent("all", "memory:ingest", { text });
        return;
      }
      // If standalone, we just log and skip (fail gracefully)
      if (_currentMode === "STANDALONE") {
        console.warn(
          "[MEMORY] Standalone Mode: Skipping vector ingestion (Desktop required).",
        );
        return; // Graceful degradation
      }
      throw new Error("Cortex unavailable");
    }

    try {
      const url = await this.getCortexUrl();
      const settings = settingsService.get("brain");
      const res = await fetch(`${url}/memory/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          model: settings?.memoryModel || "gemini-pro-latest",
        }),
        signal: AbortSignal.timeout(30000), // Increased to 30s
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "Unknown error");
        throw new Error(`Cortex Insert Failed: ${res.status} ${errorText}`);
      }
    } catch (e: any) {
      // Re-throw with more context if it's a network error
      if (e.name === "AbortError" || e.message?.includes("fetch")) {
        throw new Error("Cortex connection timeout or network error");
      }
      throw e;
    }
  },

  async queryCortex(query: string) {
    // Check health first to avoid unnecessary errors
    const isHealthy = await this.checkCortexHealth();

    if (!isHealthy) {
      // If in delegated mode, we proxy
      if (_currentMode === "DELEGATED" && lucaLinkManager) {
        console.log("[MEMORY] Proxying query to Desktop via Luca Link...");
        console.warn(
          "[MEMORY] Delegated Query not fully implemented yet - falling back to Local Keyword Search.",
        );
        return null;
      }
      if (_currentMode === "STANDALONE") {
        console.warn("[MEMORY] Standalone Mode: Skipping Cortex query.");
        return null;
      }
      throw new Error("Cortex unavailable");
    }

    try {
      const url = await this.getCortexUrl(); // Use dynamic URL
      const settings = settingsService.get("brain");
      const res = await fetch(`${url}/memory/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          mode: "hybrid",
          model: settings?.memoryModel || "gemini-pro-latest",
        }),
        signal: AbortSignal.timeout(30000), // Increased to 30s
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "Unknown error");
        throw new Error(`Cortex Query Failed: ${res.status} ${errorText}`);
      }

      const data = await res.json();
      return data.result;
    } catch (e: any) {
      // Re-throw with more context if it's a network error
      if (e.name === "AbortError" || e.message?.includes("fetch")) {
        throw new Error("Cortex connection timeout or network error");
      }
      throw e;
    }
  },

  /**
   * Ingest conversation messages into LightRAG Cortex
   * This is called automatically when new messages are added
   */
  async ingestConversation(
    messages: Array<{ sender: string; text: string; timestamp?: number }>,
  ): Promise<void> {
    // Check if Cortex is available first
    const isHealthy = await this.checkCortexHealth();
    if (!isHealthy) {
      // Silent skip - this is expected when Cortex is not running
      // Only log on first failure to avoid spam
      if (!_cortexUnavailableLogged) {
        console.log(
          "[CORTEX] Cortex unavailable (service may not be running). Conversation ingestion skipped. This is normal if Cortex is not started.",
        );
        _cortexUnavailableLogged = true;
      }
      return;
    }

    // Reset the flag if Cortex is back online
    _cortexUnavailableLogged = false;

    // Filter out system pulses, empty messages and format conversation
    const validMessages = messages
      .filter((msg) => {
        if (!msg.text || msg.text.trim().length === 0) return false;
        // Skip system maintenance pulses
        if (this.isSystemPrompt(msg.text)) return false;
        return true;
      })
      .map((msg) => {
        const senderLabel = msg.sender === "user" ? "User" : "LUCA";
        const timestamp = msg.timestamp
          ? new Date(msg.timestamp).toISOString()
          : new Date().toISOString();
        return `[${timestamp}] ${senderLabel}: ${msg.text.trim()}`;
      });

    if (validMessages.length === 0) return;

    // Combine messages into a conversation block
    // Group messages in chunks to avoid overwhelming the API
    const conversationText = validMessages.join("\n\n");

    // Split into chunks if too long (LightRAG can handle long text, but we'll be safe)
    const MAX_CHUNK_SIZE = 5000; // characters
    if (conversationText.length <= MAX_CHUNK_SIZE) {
      // Single chunk
      try {
        await this.saveToCortex(conversationText);
        console.log(
          `[CORTEX] Ingested ${validMessages.length} messages into LightRAG`,
        );
      } catch (e) {
        console.warn("[CORTEX] Failed to ingest conversation:", e);
      }
    } else {
      // Multiple chunks - split by message boundaries
      let currentChunk = "";
      let chunkCount = 0;

      for (const msg of validMessages) {
        if (
          currentChunk.length + msg.length + 2 > MAX_CHUNK_SIZE &&
          currentChunk.length > 0
        ) {
          // Save current chunk
          try {
            await this.saveToCortex(currentChunk);
            chunkCount++;
          } catch (e) {
            console.warn("[CORTEX] Failed to ingest conversation chunk:", e);
          }
          currentChunk = msg;
        } else {
          currentChunk += (currentChunk ? "\n\n" : "") + msg;
        }
      }

      // Save remaining chunk
      if (currentChunk.length > 0) {
        try {
          await this.saveToCortex(currentChunk);
          chunkCount++;
        } catch (e) {
          console.warn("[CORTEX] Failed to ingest conversation chunk:", e);
        }
      }

      console.log(
        `[CORTEX] Ingested ${validMessages.length} messages in ${chunkCount} chunks into LightRAG`,
      );
    }
  },

  /**
   * MEM0: Get memories by category
   * Automatically filters out expired sessions
   */
  getMemoriesByCategory(category: MemoryNode["category"]): MemoryNode[] {
    const now = Date.now();
    return this.getAllMemories()
      .filter((m) => m.category === category)
      .filter((m) => !m.expiresAt || m.expiresAt > now); // Remove expired
  },

  /**
   * MEM0: Get all USER_STATE memories (permanent user preferences)
   */
  getUserState(): MemoryNode[] {
    return this.getMemoriesByCategory("USER_STATE");
  },

  /**
   * MEM0: Get all SESSION_STATE memories (temporary, auto-expire after 24h)
   */
  getSessionState(): MemoryNode[] {
    return this.getMemoriesByCategory("SESSION_STATE");
  },

  /**
   * MEM0: Get all AGENT_STATE memories (learned skills and evolution tracking)
   */
  getAgentState(): MemoryNode[] {
    return this.getMemoriesByCategory("AGENT_STATE");
  },

  /**
   * MEM0: Clean expired SESSION_STATE memories
   * Should be called periodically (every hour)
   */
  cleanExpiredSessions(): void {
    const now = Date.now();
    const memories = this.getAllMemories();
    const filtered = memories.filter((m) => !m.expiresAt || m.expiresAt > now);

    const removedCount = memories.length - filtered.length;
    if (removedCount > 0) {
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(filtered));
      console.log(`[MEMORY] Cleaned ${removedCount} expired session(s)`);

      // Sync to disk
      fetch(`${CORE_URL}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtered),
      }).catch(() => {});
    }
  },

  /**
   * Formatted Memory Output For LLM Context
   * UPDATED: Token Safeguard Applied - Truncates large memory values.
   */
  getMemoryContext(): string {
    const memories = this.getAllMemories();
    if (memories.length === 0) return "Memory Core Empty.";

    // Mem0 Logic: Separate into distinct state layers
    const userState = memories.filter((m) => m.category === "USER_STATE");
    const sessionState = memories.filter((m) => m.category === "SESSION_STATE");
    const agentState = memories.filter((m) => m.category === "AGENT_STATE");
    const facts = memories.filter(
      (m) =>
        !["USER_STATE", "SESSION_STATE", "AGENT_STATE"].includes(m.category),
    );

    // HELPER: Truncate huge memories to prevent 429 Quota errors
    const formatMem = (m: MemoryNode) => {
      let val = m.value;
      if (val.length > 300) val = val.substring(0, 300) + "...[TRUNCATED]";
      return `- ${m.key}: ${val}`;
    };

    let context = "=== MEM0 MEMORY LAYER ===\n";
    if (userState.length)
      context +=
        "[USER STATE]:\n" + userState.map(formatMem).join("\n") + "\n\n";
    if (sessionState.length)
      context +=
        "[SESSION CONTEXT]:\n" +
        sessionState.map(formatMem).join("\n") +
        "\n\n";
    if (agentState.length)
      context +=
        "[AGENT KNOWLEDGE]:\n" + agentState.map(formatMem).join("\n") + "\n\n";
    if (facts.length)
      context += "[SEMANTIC FACTS]:\n" + facts.map(formatMem).join("\n");

    return context;
  },

  /**
   * LANGGRAPH: Persist Tool Execution to Graph
   */
  async logExecutionEvent(
    toolName: string,
    args: any,
    result: string,
    sessionId: string,
    previousEventId: string | null = null,
  ): Promise<string | null> {
    try {
      const res = await fetch(`${CORE_URL}/log-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolName,
          args,
          result: typeof result === "string" ? result : JSON.stringify(result),
          sessionId,
          previousEventId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.eventId;
      }
    } catch (e) {
      console.warn("[MEMORY] Failed to persist persist execution event:", e);
    }
    return null;
  },

  /**
   * Delete a memory by key or id
   */
  deleteMemory(keyOrId: string): boolean {
    const memories = this.getAllMemories();
    const initialLength = memories.length;
    const filtered = memories.filter(
      (m) => m.id !== keyOrId && m.key.toLowerCase() !== keyOrId.toLowerCase(),
    );

    if (filtered.length < initialLength) {
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(filtered));

      // Sync deletion to all linked devices
      if (lucaLinkManager) {
        try {
          lucaLinkManager.syncState("memory", {
            type: "delete",
            keyOrId: keyOrId,
            allMemories: filtered,
          });
        } catch (e) {
          console.warn(
            "[MEMORY SYNC] Failed to sync deletion to linked devices:",
            e,
          );
        }
      }

      // Sync to disk
      fetch(`${CORE_URL}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtered),
      }).catch(() => {});

      return true;
    }
    return false;
  },

  /**
   * Wipe memory (Factory Reset).
   */
  wipeMemory() {
    localStorage.removeItem(MEMORY_STORAGE_KEY);

    // 6. Sync memory to all linked devices (State Propagation)
    if (lucaLinkManager?.isConnected()) {
      try {
        console.log(`[MEMORY SYNC] Broadcasting "wipe" to linked devices...`);
        lucaLinkManager.syncState("memory_wipe", {
          timestamp: Date.now(),
        });
      } catch (e) {
        console.warn("[MEMORY SYNC] Failed to sync wipe to linked devices:", e);
      }
    }

    fetch(`${CORE_URL}/wipe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).catch(() => {});
  },

  // --- MEMORY CONSOLIDATION METHODS (Phase 1: Similarity Detection) ---

  /**
   * Calculate cosine similarity between two vectors
   * Returns a value between 0 (no similarity) and 1 (identical)
   */
  async computeSimilarity(
    memory1: MemoryNode,
    memory2: MemoryNode,
  ): Promise<number> {
    try {
      // Generate embeddings for both memories
      const content1 = `${memory1.key}: ${memory1.value}`;
      const content2 = `${memory2.key}: ${memory2.value}`;

      const [vector1, vector2] = await Promise.all([
        this.generateEmbedding(content1),
        this.generateEmbedding(content2),
      ]);

      // If embeddings failed, fall back to string similarity
      if (vector1.length === 0 || vector2.length === 0) {
        return this.computeStringSimilarity(content1, content2);
      }

      // Calculate cosine similarity
      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let i = 0; i < vector1.length; i++) {
        dotProduct += vector1[i] * vector2[i];
        norm1 += vector1[i] * vector1[i];
        norm2 += vector2[i] * vector2[i];
      }

      const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
      if (denominator === 0) return 0;

      return dotProduct / denominator;
    } catch (e) {
      console.warn(
        "[MEMORY] Similarity computation failed, using string similarity:",
        e,
      );
      // Fallback to string similarity
      const content1 = `${memory1.key}: ${memory1.value}`;
      const content2 = `${memory2.key}: ${memory2.value}`;
      return this.computeStringSimilarity(content1, content2);
    }
  },

  /**
   * Calculate string similarity using Jaccard index and edit distance
   * Returns a value between 0 and 1
   */
  computeStringSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    // Jaccard similarity
    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    const jaccard = intersection.size / union.size;

    // Edit distance similarity (normalized)
    const maxLength = Math.max(text1.length, text2.length);
    const editDistance = this.levenshteinDistance(
      text1.toLowerCase(),
      text2.toLowerCase(),
    );
    const editSimilarity = 1 - editDistance / maxLength;

    // Combine both metrics (weighted average)
    return jaccard * 0.6 + editSimilarity * 0.4;
  },

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1, // deletion
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j - 1] + 1, // substitution
          );
        }
      }
    }

    return matrix[len1][len2];
  },

  /**
   * Find similar memories for a given memory
   * Returns array of similar memories with similarity scores
   */
  async findSimilarMemories(
    targetMemory: MemoryNode,
    threshold: number = 0.85,
  ): Promise<Array<{ memory: MemoryNode; similarity: number }>> {
    const allMemories = this.getAllMemories();
    const similar: Array<{ memory: MemoryNode; similarity: number }> = [];

    // Skip if target is already processed (by ID)
    for (const memory of allMemories) {
      if (memory.id === targetMemory.id) continue;

      // Quick check: same category increases chance of similarity
      if (memory.category !== targetMemory.category) continue;

      const similarity = await this.computeSimilarity(targetMemory, memory);
      if (similarity >= threshold) {
        similar.push({ memory, similarity });
      }
    }

    // Sort by similarity (highest first)
    similar.sort((a, b) => b.similarity - a.similarity);

    return similar;
  },

  /**
   * Calculate confidence score for a memory based on:
   * - Age (newer = higher confidence initially, but very old = established fact)
   * - Similar memories (more similar = lower confidence, might be duplicate)
   * - Category (FACT > PREFERENCE > SESSION_STATE)
   */
  async calculateConfidence(memory: MemoryNode): Promise<number> {
    let confidence = memory.confidence || 0.5;

    // Base confidence by category
    const categoryWeights: Record<string, number> = {
      FACT: 0.9,
      PROTOCOL: 0.85,
      SECURITY: 0.9,
      USER_STATE: 0.8,
      PREFERENCE: 0.75,
      SESSION_STATE: 0.5,
      AGENT_STATE: 0.8,
    };
    confidence = categoryWeights[memory.category] || 0.7;

    // Age factor: Memories older than 7 days are "established"
    const ageDays = (Date.now() - memory.timestamp) / (1000 * 60 * 60 * 24);
    if (ageDays > 7) {
      confidence = Math.min(confidence + 0.1, 1.0); // Boost for established memories
    } else if (ageDays < 1) {
      confidence = Math.max(confidence - 0.1, 0.3); // Slight reduction for very new memories
    }

    // Similarity penalty: If there are many similar memories, confidence might be lower (possible duplicate)
    const similar = await this.findSimilarMemories(memory, 0.8);
    if (similar.length > 0) {
      // Reduce confidence if highly similar memories exist
      const maxSimilarity = similar[0].similarity;
      if (maxSimilarity > 0.95) {
        confidence *= 0.7; // Strong penalty for near-duplicates
      } else if (maxSimilarity > 0.9) {
        confidence *= 0.85; // Moderate penalty
      }
    }

    return Math.max(0, Math.min(1, confidence)); // Clamp between 0 and 1
  },

  // --- MEMORY CONSOLIDATION METHODS (Phase 2: Memory Merging) ---

  /**
   * Merge two similar memories into one
   * Keeps the most recent timestamp, highest confidence, and combines values
   */
  async mergeMemories(
    memory1: MemoryNode,
    memory2: MemoryNode,
  ): Promise<MemoryNode> {
    // Determine which memory is "primary" (higher confidence, or newer if same confidence)
    let primary = memory1;
    let secondary = memory2;

    if (memory2.confidence > memory1.confidence) {
      primary = memory2;
      secondary = memory1;
    } else if (
      memory2.confidence === memory1.confidence &&
      memory2.timestamp > memory1.timestamp
    ) {
      primary = memory2;
      secondary = memory1;
    }

    // Merge values intelligently
    let mergedValue = primary.value;
    if (primary.value !== secondary.value) {
      // Combine values if they're different
      // For simple values, prefer primary; for longer values, try to combine
      if (primary.value.length < 100 && secondary.value.length < 100) {
        // Short values - check if one contains the other
        if (
          primary.value.toLowerCase().includes(secondary.value.toLowerCase())
        ) {
          mergedValue = primary.value; // Primary already contains secondary
        } else if (
          secondary.value.toLowerCase().includes(primary.value.toLowerCase())
        ) {
          mergedValue = secondary.value; // Secondary contains primary
        } else {
          // Combine with separator
          mergedValue = `${primary.value} | ${secondary.value}`;
        }
      } else {
        // Longer values - prefer primary but note secondary
        mergedValue = `${primary.value}\n\n[Also noted: ${secondary.value}]`;
      }
    }

    // Create merged memory
    const merged: MemoryNode = {
      id: primary.id, // Keep primary ID
      key: primary.key, // Keep primary key
      value: mergedValue,
      category: primary.category, // Keep primary category
      timestamp: Math.max(primary.timestamp, secondary.timestamp), // Most recent
      confidence: Math.max(primary.confidence, secondary.confidence), // Highest confidence
    };

    // Recalculate confidence for merged memory
    merged.confidence = await this.calculateConfidence(merged);

    return merged;
  },

  /**
   * Consolidate all memories by merging duplicates
   * Returns consolidation report with statistics
   */
  async consolidateAllMemories(
    options: {
      similarityThreshold?: number;
      dryRun?: boolean;
      autoMerge?: boolean;
    } = {},
  ): Promise<{
    before: number;
    after: number;
    merged: number;
    removed: string[];
    mergedPairs: Array<{
      primary: string;
      secondary: string;
      similarity: number;
    }>;
  }> {
    const threshold = options.similarityThreshold || 0.9;
    const dryRun = options.dryRun || false;
    const autoMerge = options.autoMerge !== false; // Default true

    const allMemories = this.getAllMemories();
    const before = allMemories.length;

    if (before === 0) {
      return {
        before: 0,
        after: 0,
        merged: 0,
        removed: [],
        mergedPairs: [],
      };
    }

    const processed = new Set<string>();
    const merged: MemoryNode[] = [];
    const removed: string[] = [];
    const mergedPairs: Array<{
      primary: string;
      secondary: string;
      similarity: number;
    }> = [];

    console.log(
      `[MEMORY] Starting consolidation of ${before} memories (threshold: ${threshold})...`,
    );

    for (const memory of allMemories) {
      if (processed.has(memory.id)) continue;

      // Find similar memories
      const similar = await this.findSimilarMemories(memory, threshold);

      if (similar.length === 0) {
        // No similar memories, keep as-is
        merged.push(memory);
        processed.add(memory.id);
        continue;
      }

      // Found similar memories - merge them
      let mergedMemory = memory;
      for (const { memory: similarMemory, similarity } of similar) {
        if (processed.has(similarMemory.id)) continue;

        if (autoMerge) {
          // Merge the similar memory into the current one
          mergedMemory = await this.mergeMemories(mergedMemory, similarMemory);
          processed.add(similarMemory.id);
          removed.push(similarMemory.id);
          mergedPairs.push({
            primary: mergedMemory.id,
            secondary: similarMemory.id,
            similarity,
          });
          console.log(
            `[MEMORY] Merged: "${similarMemory.key}" into "${
              mergedMemory.key
            }" (similarity: ${(similarity * 100).toFixed(1)}%)`,
          );
        }
      }

      merged.push(mergedMemory);
      processed.add(memory.id);
    }

    const after = merged.length;

    if (!dryRun) {
      // Save consolidated memories
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(merged));

      // Sync to disk
      fetch(`${CORE_URL}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      }).catch(() => {});

      // Sync to linked devices
      if (lucaLinkManager) {
        try {
          lucaLinkManager.syncState("memory", {
            type: "consolidate",
            allMemories: merged,
            removed: removed,
          });
        } catch (e) {
          console.warn(
            "[MEMORY SYNC] Failed to sync consolidation to linked devices:",
            e,
          );
        }
      }

      console.log(
        `[MEMORY] ✅ Consolidation complete: ${before} → ${after} memories (${
          before - after
        } merged)`,
      );
    } else {
      console.log(
        `[MEMORY] [DRY RUN] Would consolidate: ${before} → ${after} memories (${
          before - after
        } would be merged)`,
      );
    }

    return {
      before,
      after,
      merged: before - after,
      removed,
      mergedPairs,
    };
  },

  /**
   * MEM0: Start the background Synapse task (Consolidation + Cleanup)
   * Runs every 1 hour to keep memory healthy
   */
  _synapseTimer: null as any,
  startSynapse() {
    if (this._synapseTimer) return;
    console.log("[MEMORY] Starting Synapse background task (1h cycle)");

    // Run immediately on start
    this.runSynapse();

    this._synapseTimer = setInterval(
      () => {
        this.runSynapse();
      },
      1000 * 60 * 60,
    ); // 1 hour
  },

  /**
   * MEM0: Manually trigger a memory synapse (Reconciliation)
   */
  async runSynapse() {
    console.log("--------------------------------------------------");
    console.log("[MEMORY] ⚡ SYNAPSE TRIGGERED: Reconciling Intelligence...");
    console.log("--------------------------------------------------");

    // 1. Clean expired sessions
    this.cleanExpiredSessions();

    // 2. Consolidate memories (merge similar facts)
    await this.consolidateAllMemories({
      similarityThreshold: 0.9,
      autoMerge: true,
    });

    // 3. Incrementally sync to LightRAG if available
    const isHealthy = await this.checkCortexHealth();
    if (isHealthy) {
      console.log("[MEMORY] Cortex Healthy. Synapse triggering deep sync.");
      // Cortex (Python) handles its own sync via sync_master_to_rag
      // but we can poke it if needed via a health check which triggers logic.
    }

    console.log("--------------------------------------------------");
    console.log("[MEMORY] ✅ SYNAPSE COMPLETE: Intelligence Matrix Balanced.");
    console.log("--------------------------------------------------");

    return true;
  },

  /**
   * MEM0: Get recent synthesized intelligence for UI
   */
  getRecentIntelligence(limit: number = 5): MemoryNode[] {
    const memories = this.getAllMemories();
    return memories
      .filter((m) => m.category !== "SESSION_STATE")
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  },
};
