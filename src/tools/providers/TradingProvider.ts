import { ToolRegistry } from "../../services/toolRegistry";
import * as Definitions from "../definitions";
import { tradingService } from "../../services/tradingService";
import { apiUrl } from "../../config/api";

export const TradingProvider = {
  register: () => {
    // 1. TRADING DEBATE & ANALYSIS
    ToolRegistry.register(
      Definitions.startDebateTool,
      "CORE", // Categorized as core for strategic importance
      ["debate", "trading", "analysis", "sentiment", "bull", "bear"],
      async (args, context) => {
        const { symbol } = args;
        const {
          lucaService,
          currentDeviceType,
          setVisualData,
          soundService,
          lucaLinkManager,
        } = context;

        soundService?.play("PROCESSING");

        // LUCA LINK ROUTING: If on mobile, delegate to desktop for full multi-agent performance
        const isMobile =
          currentDeviceType === "mobile" || currentDeviceType === "tablet";

        if (isMobile && lucaLinkManager) {
          try {
            const availableDevices = Array.from(
              lucaLinkManager.devices?.values() || [],
            ) as any[];
            const desktopDevice = availableDevices.find(
              (d: any) => d.type === "desktop",
            );

            if (desktopDevice) {
              const result = await lucaLinkManager.delegateTool(
                desktopDevice.deviceId,
                "startDebate",
                args,
              );
              return (
                result?.result ||
                `DEBATE STARTED (via ${desktopDevice.name}): ${symbol}. Check the Debate Arena.`
              );
            }
          } catch {
            console.warn(
              "[TradingProvider] Luca Link delegation failed, using degraded mode.",
            );
          }
        }

        // DEGRADED MODE: Single-agent analysis if mobile and no desktop
        if (isMobile && lucaService) {
          const quickAnalysis = await lucaService.sendMessage(
            `Provide a brief market analysis for ${symbol}. Include: current sentiment (bullish/bearish), key support/resistance levels, and a risk assessment.`,
            null,
            null,
            null,
          );
          return `QUICK ANALYSIS (Mobile Mode): ${symbol}\n\n${quickAnalysis.text}\n\n💡 Tip: Connect to desktop for full multi-agent debate analysis.`;
        }

        // FULL MODE: Standard server execution
        // 1. TACTICAL FEEDBACK (Gold Theme)
        const debateId = Math.random().toString(36).substring(7);
        if (setVisualData) {
          setVisualData({
            type: "FINANCE",
            status: "MARKET_CONSENSUS_PROTOCOL",
            logs: [
              {
                id: `init-${debateId}`,
                timestamp: new Date().toLocaleTimeString(),
                source: "MARKET_MAKER_CORE",
                message: `Initializing debate parameters for ${symbol}...`,
                type: "INFO",
              },
              {
                id: `sentiment-${debateId}`,
                timestamp: new Date().toLocaleTimeString(),
                source: "SENTIMENT_ENGINE",
                message: "Aggregating global news sentiment and volume data...",
                type: "INFO",
              },
            ],
            title: "FINANCIAL_WAR_ROOM",
            summonHUD: false, // User must request full dashboard
            symbol: symbol,
          });
        }

        const result = await tradingService.startDebate({
          topic: `Analysis of ${symbol}`,
          participants: ["BULL", "BEAR", "ANALYST"],
          symbol: symbol,
        });

        if (setVisualData && result.success) {
          setVisualData({
            type: "FINANCE",
            status: "DEBATE_ACTIVE",
            logs: [
              {
                id: `active-${debateId}`,
                timestamp: new Date().toLocaleTimeString(),
                source: "DEBATE_ORCHESTRATOR",
                message: "Agents deployed. Live debate session established.",
                type: "SUCCESS",
              },
            ],
            title: "FINANCIAL_WAR_ROOM",
          });
        }

        return result.success
          ? `DEBATE STARTED: ${symbol}. Check the Debate Arena for live updates.`
          : `FAILED to start debate: ${(result as any).error || "Unknown error"}`;
      },
    );

    // 2. EXCHANGE EXECUTION (Binance/Standard)
    const EXCHANGE_TOOLS = [
      {
        tool: Definitions.executeTradeTool,
        handler: async (args: any) => tradingService.executeOrder("Binance", args),
        sound: "SUCCESS",
      },
      {
        tool: Definitions.getPositionsTool,
        handler: async () => {
          const positions = await tradingService.getPositions();
          if (positions.length === 0) return "No active positions found.";
          return "ACTIVE POSITIONS:\n" + positions.map((p: any) => 
            `- ${p.symbol}: ${p.side} ${p.amount} @ ${p.entryPrice} (PnL: ${p.unrealizedPnl})`
          ).join("\n");
        },
        sound: "PROCESSING",
      },
      {
        tool: Definitions.closeAllPositionsTool,
        handler: async () => tradingService.closeAllPositions(),
        sound: "ALARM",
      },
      {
        tool: Definitions.getTradingHistoryTool,
        handler: async (args: any) => {
          const commits = await tradingService.getRecentCommits(args.limit || 10);
          if (commits.length === 0) return "No trading history (commits) found in LUCA memory.";
          return "📜 LUCA TRADING AUDIT LOG (Git-like Commits):\n\n" + 
            commits.map(c => `[${new Date(c.timestamp).toLocaleTimeString()}] COMMIT ${c.hash}\nACTION: ${c.action} ${c.symbol}\nSTRATEGY: ${c.strategyId}\nTRANSCRIPT: ${c.transcript.substring(0, 100)}...\n---`).join("\n");
        },
        sound: "PROCESSING"
      }
    ];

    EXCHANGE_TOOLS.forEach(({ tool, handler, sound }) => {
      ToolRegistry.register(
        tool,
        "CORE",
        ["trading", "exchange", "orders", "execution", "audit", "history"],
        async (args, context) => {
          const { soundService, persona } = context;

          if (
            persona === "RUTHLESS" &&
            (tool.name === "executeTrade" || tool.name === "closeAllPositions")
          ) {
            soundService?.play("BREACH");
          } else {
            soundService?.play(sound as any);
          }

          try {
            const result = await handler(args);
            return typeof result === "string" ? result : JSON.stringify(result, null, 2);
          } catch (e: any) {
            return `${tool.name} Error: ${e.message}`;
          }
        },
      );
    });

    // 3. CRYPTO & WALLET MANAGEMENT
    const CRYPTO_TOOLS = [
      { tool: Definitions.createWalletTool, api: "/api/crypto/wallet/create" },
      { tool: Definitions.getWalletBalanceTool, api: "/api/crypto/balance" },
      {
        tool: Definitions.sendCryptoTransactionTool,
        api: "/api/crypto/transaction",
      },
      { tool: Definitions.listWalletsTool, api: "/api/crypto/wallets" },
    ];

    CRYPTO_TOOLS.forEach(({ tool, api }) => {
      ToolRegistry.register(
        tool,
        "CRYPTO",
        ["crypto", "wallet", "blockchain", "web3"],
        async (args, context) => {
          const { soundService, persona } = context;
          soundService?.play(persona === "HACKER" ? "BREACH" : "PROCESSING");

          try {
            let url = apiUrl(api);
            let method = "POST";
            let body = JSON.stringify(args);

            if (tool.name === "getWalletBalance") {
              url += `?chain=${args.chain || "ethereum"}&address=${args.address}`;
              method = "GET";
              body = undefined as any;
            } else if (tool.name === "listWallets") {
              method = "GET";
              body = undefined as any;
            }

            const res = await fetch(url, {
              method,
              headers: { "Content-Type": "application/json" },
              body,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Request failed");

            return typeof data === "string"
              ? data
              : JSON.stringify(data, null, 2);
          } catch (e: any) {
            return `Crypto Error: ${e.message}`;
          }
        },
      );
    });

    // 4. FOREX & MT4 BRIDGE
    const FOREX_TOOLS = [
      { tool: Definitions.executeForexTradeTool, api: "/api/forex/trade" },
      { tool: Definitions.getForexPositionsTool, api: "/api/forex/positions" },
      { tool: Definitions.closeForexPositionTool, api: "/api/forex/close" },
      {
        tool: Definitions.closeAllForexPositionsTool,
        api: "/api/forex/closeAll",
      },
    ];

    FOREX_TOOLS.forEach(({ tool, api }) => {
      ToolRegistry.register(
        tool,
        "CORE",
        ["forex", "mt4", "currency", "fiat"],
        async (args, context) => {
          const { soundService } = context;
          soundService?.play("PROCESSING");

          try {
            const method = tool.name === "getForexPositions" ? "GET" : "POST";
            const res = await fetch(apiUrl(api), {
              method,
              headers: { "Content-Type": "application/json" },
              body: method === "POST" ? JSON.stringify(args) : undefined,
            });
            const data = await res.json();
            return typeof data === "string" ? data : JSON.stringify(data);
          } catch (e: any) {
            return `Forex Error: ${e.message}`;
          }
        },
      );
    });

    // 5. MARKET NEWS & POLYMARKET
    ToolRegistry.register(
      Definitions.getMarketNewsTool,
      "CORE",
      ["news", "market", "alerts", "intel"],
      async (args) => {
        const sectorParam = args.sector
          ? `?sector=${encodeURIComponent(args.sector)}`
          : "";
        try {
          const res = await fetch(apiUrl(`/api/finance/news${sectorParam}`));
          return await res.text();
        } catch (err: any) {
          return `News Retrieval Failed: ${err.message}`;
        }
      },
    );

    ToolRegistry.register(
      Definitions.searchPolymarketTool,
      "CORE",
      ["polymarket", "prediction", "bet", "politics"],
      async (args) => {
        try {
          const res = await fetch(
            apiUrl(
              `/api/finance/polymarket/markets?query=${encodeURIComponent(args.query)}`,
            ),
          );
          const data = await res.json();
          return JSON.stringify(data, null, 2);
        } catch (err: any) {
          return `Polymarket Search Error: ${err.message}`;
        }
      },
    );

    // 6. OFFICIAL PROTOCOL SKILLS
    ToolRegistry.register(
      Definitions.listProtocolSkillsTool,
      "CORE",
      ["protocol", "skills", "official", "decentralized", "defi"],
      async () => {
        try {
          const res = await fetch(apiUrl("/api/skills/list"));
          const data = await res.json();
          const official = data.skills?.filter((s: any) => s.format === "protocol-suite") || [];
          if (official.length === 0) return "No official protocol skills discovered.";
          return "OFFICIAL PROTOCOL SUITES:\n" + official.map((s: any) => 
            `🪐 ${s.name} (v${s.version}): ${s.description}\n   Actions: ${s.actions?.join(", ")}\n   Chains: ${s.chains?.join(", ")}`
          ).join("\n\n");
        } catch (err: any) {
          return `Protocol Discovery Error: ${err.message}`;
        }
      }
    );

    ToolRegistry.register(
      Definitions.executeProtocolSkillTool,
      "CORE",
      ["protocol", "execute", "defi", "swap", "lend", "stake"],
      async (args, context) => {
        const { soundService } = context;
        soundService?.play("BREACH"); // High alert for financial execution

        try {
          const res = await fetch(apiUrl("/api/skills/execute"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: args.path, // We use 'path' as the name for routing
              args: args.args
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Execution failed");
          return `PROTOCOL EXECUTION SUCCESS (${args.path}):\n${JSON.stringify(data.result, null, 2)}`;
        } catch (err: any) {
          return `Protocol Execution Error (${args.path}): ${err.message}`;
        }
      }
    );

    ToolRegistry.register(
      Definitions.registerDroppedSkillTool,
      "CORE",
      ["skill", "register", "drop", "upload", "automation"],
      async (args, context) => {
        const { soundService } = context;
        soundService?.play("SUCCESS");

        try {
          const res = await fetch(apiUrl("/api/skills/drop"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: args.path
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Registration failed");
          return `SKILL REGISTERED SUCCESS:\n${JSON.stringify(data, null, 2)}`;
        } catch (err: any) {
          return `Skill Registration Error: ${err.message}`;
        }
      }
    );
  },
};
