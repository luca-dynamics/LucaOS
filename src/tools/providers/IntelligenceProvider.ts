import { ToolRegistry } from "../../services/toolRegistry";
import * as Definitions from "../definitions";
import { apiUrl } from "../../config/api";
import { canRegisterIntelligenceTool } from "../intelligenceToolSurfacePolicy";

export const IntelligenceProvider = {
  register: () => {
    // 1. OSINT & INVESTIGATIONS
    const OSINT_TOOLS = [
      {
        toolId: "osintUsernameSearch" as const,
        tool: Definitions.osintUsernameSearchTool,
        api: "/api/osint/username",
      },
      {
        toolId: "osintDomainIntel" as const,
        tool: Definitions.osintDomainIntelTool,
        api: "/api/osint/domain",
      },
      {
        toolId: "osintDarkWebScan" as const,
        tool: Definitions.osintDarkWebScanTool,
        api: "/api/osint/darkweb",
      },
      {
        toolId: "traceSignalSource" as const,
        tool: Definitions.traceSignalSourceTool,
        api: "/api/osint/trace",
      },
      {
        toolId: "refineQuery" as const,
        tool: Definitions.refineQueryTool,
        api: "/api/osint/refine-query",
      },
      {
        toolId: "osintGoogleDork" as const,
        tool: Definitions.osintGoogleDorkTool,
        api: "/api/osint/google-dork",
      },
      {
        toolId: "osintIdentitySearch" as const,
        tool: Definitions.osintIdentitySearchTool,
        api: "/api/osint/identity",
      },
    ];

    OSINT_TOOLS.forEach(({ toolId, tool, api }) => {
      if (!canRegisterIntelligenceTool(toolId, { enforceBoundary: true })) {
        return;
      }

      ToolRegistry.register(
        tool,
        "OSINT",
        ["intelligence", "search", "investigate", "profile"],
        async (args, context) => {
          const { soundService, persona, setVisualData } = context;

          // Tactical audio for deep intelligence gathering
          soundService?.play(
            persona === "HACKER" || persona === "RUTHLESS"
              ? "BREACH"
              : "PROCESSING",
          );

          // 1. TACTICAL FEEDBACK (Cyan Theme)
          const searchId = Math.random().toString(36).substring(7);
          const initialLogs = [
            {
              id: `init-${searchId}`,
              timestamp: new Date().toLocaleTimeString(),
              source: "OSINT_GRID",
              message: `Initializing search matrix for target: ${args.username || args.domain || args.query || "UNKNOWN"}`,
              type: "INFO",
            },
            {
              id: `scan-${searchId}`,
              timestamp: new Date().toLocaleTimeString(),
              source: "DATALINK_LAYER",
              message: "Cross-referencing global identity databases...",
              type: "INFO",
            },
          ];

          // Push initial "Scanning" state to Chat & HUD
          if (setVisualData) {
            setVisualData({
              type: "INTELLIGENCE",
              status: "SCANNING_DATABANKS",
              logs: initialLogs,
              title: "OSINT_INVESTIGATION",
              summonHUD: false, // User must request full dashboard
              profile: {
                target: args.username || args.domain || args.query || "UNKNOWN",
                riskScore: 0,
                hits: [],
                status: "SCANNING",
                meta: {
                  SOURCE: "LUCA_Core_V2",
                  TIMESTAMP: new Date().toISOString(),
                },
              },
            });
          }

          try {
            // Special mapping for osintIdentitySearch to match legacy chat compatibility
            if (tool.name === "osintIdentitySearch") {
              if (!args.username && !args.email && args.query) {
                if (args.query.includes("@")) args.email = args.query;
                else args.username = args.query;
              }
            }

            const response = await fetch(apiUrl(api), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(args),
            });
            const data = await response.json();

            if (!response.ok)
              throw new Error(data.error || "OSINT scan failed");

            // 2. SUCCESS FEEDBACK
            if (setVisualData) {
              setVisualData({
                type: "INTELLIGENCE",
                status: "INTELLIGENCE_SECURED",
                logs: [
                  ...initialLogs,
                  {
                    id: `success-${searchId}`,
                    timestamp: new Date().toLocaleTimeString(),
                    source: "ANALYSIS_CORE",
                    message: "Data pattern matched. compiling dossier.",
                    type: "SUCCESS",
                  },
                ],
                title: "OSINT_INVESTIGATION",
              });
            }

            return typeof data === "string"
              ? data
              : JSON.stringify(data, null, 2);
          } catch (e: any) {
            // 3. ERROR FEEDBACK
            if (setVisualData) {
              setVisualData({
                type: "INTELLIGENCE",
                status: "SEARCH_FAILED",
                logs: [
                  ...initialLogs,
                  {
                    id: `err-${searchId}`,
                    timestamp: new Date().toLocaleTimeString(),
                    source: "OSINT_GRID",
                    message: `Tracking failure: ${e.message}`,
                    type: "ERROR",
                  },
                ],
                title: "OSINT_INVESTIGATION",
              });
            }
            return `Intelligence Error: ${e.message}`;
          }
        },
      );
    });

    // 2. LONG-TERM MEMORY (MEM0 INTEGRATION)
    ToolRegistry.register(
      Definitions.storeMemoryTool,
      "CORE",
      ["memory", "save", "fact", "preference"],
      async (args, context) => {
        const { memoryService, soundService } = context;
        soundService?.play("SUCCESS");

        try {
          const memory = await memoryService.saveMemory(
            args.key,
            args.value,
            args.category || "FACT",
            false, // no auto-consolidate here, save it for the background synapse
            args.importance,
          );
          return `✓ Memory Synapsed: [${memory.category}] ${memory.key} (ID: ${memory.id})`;
        } catch (e: any) {
          return `Synapse Failure: ${e.message}`;
        }
      },
    );

    ToolRegistry.register(
      Definitions.retrieveMemoryTool,
      "CORE",
      ["memory", "search", "recall", "past"],
      async (args, context) => {
        const { memoryService, soundService } = context;
        soundService?.play("PROCESSING");

        try {
          const results = await memoryService.retrieveMemory(args.query);
          if (results.length === 0)
            return "No relevant memory fragments found.";

          return `RECALLED MEMORIES:\n${results
            .map(
              (m: any) =>
                `- [${m.memory.category}] ${m.memory.key}: ${m.memory.value} (${Math.round(m.similarity * 100)}% match)`,
            )
            .join("\n")}`;
        } catch (e: any) {
          return `Recall Error: ${e.message}`;
        }
      },
    );

    ToolRegistry.register(
      Definitions.reconcileMemoriesTool,
      "CORE",
      ["memory", "synapse", "reconcile", "optimize"],
      async (_args, context) => {
        const { memoryService, soundService } = context;
        soundService?.play("BREACH");
        try {
          await memoryService.runSynapse();
          return "✓ Intelligence matrix reconciled. Duplicate facts merged and session state purged.";
        } catch (e: any) {
          return `Reconciliation Error: ${e.message}`;
        }
      },
    );

    // 3. KNOWLEDGE GRAPH RELATIONSHIPS
    ToolRegistry.register(
      Definitions.addGraphRelationsTool,
      "CORE",
      ["graph", "knowledge", "mapping", "relations"],
      async (args, context) => {
        const { soundService } = context;
        soundService?.play("SUCCESS");

        try {
          const res = await fetch(apiUrl("/api/memory/graph/merge"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(args),
          });
          return res.ok
            ? "✓ Semantic relationships mapped to core graph."
            : "Failed to update Knowledge Graph.";
        } catch (e: any) {
          return `Graph Update Error: ${e.message}`;
        }
      },
    );

    ToolRegistry.register(
      Definitions.queryGraphKnowledgeTool,
      "CORE",
      ["graph", "query", "knowledge", "relationships"],
      async (args, context) => {
        const { soundService } = context;
        soundService?.play("PROCESSING");

        try {
          const res = await fetch(apiUrl("/api/memory/graph/query"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(args),
          });
          const data = await res.json();
          return JSON.stringify(data, null, 2);
        } catch (e: any) {
          return `Graph Query Error: ${e.message}`;
        }
      },
    );
  },
};
