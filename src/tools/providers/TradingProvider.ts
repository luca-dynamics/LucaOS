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
          : `FAILED to start debate: ${result.error}`;
      },
    );

    // 2. EXCHANGE EXECUTION (Binance/Standard)
    const EXCHANGE_TOOLS = [
      {
        tool: Definitions.executeTradeTool,
        api: "/api/trading/execute",
        sound: "SUCCESS",
      },
      {
        tool: Definitions.getPositionsTool,
        api: "/api/trading/positions",
        sound: "PROCESSING",
      },
      {
        tool: Definitions.closeAllPositionsTool,
        api: "/api/trading/closeAll",
        sound: "ALARM",
      },
    ];

    EXCHANGE_TOOLS.forEach(({ tool, api, sound }) => {
      ToolRegistry.register(
        tool,
        "CORE",
        ["trading", "exchange", "orders", "execution"],
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
            const method = tool.name === "getPositions" ? "GET" : "POST";
            const response = await fetch(apiUrl(api), {
              method,
              headers: { "Content-Type": "application/json" },
              body: method === "POST" ? JSON.stringify(args) : undefined,
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || "Execution failed");

            if (tool.name === "getPositions") {
              if (!data.positions || data.positions.length === 0)
                return "No active positions found.";
              return (
                "ACTIVE POSITIONS:\n" +
                data.positions
                  .map(
                    (p: any) =>
                      `- ${p.symbol}: ${p.side} ${p.amount} @ ${p.entryPrice} (PnL: ${p.unrealizedPnl})`,
                  )
                  .join("\n")
              );
            }

            return `✓ ${tool.name} executed successfully. ${data.orderId ? `Order ID: ${data.orderId}` : ""}`;
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
  },
};
