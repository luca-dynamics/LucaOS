import { SchemaType, FunctionDeclaration } from "@google/generative-ai";
import { tradingService } from "../../tradingService";

export const tools: FunctionDeclaration[] = [
  {
    name: "get_trading_balance",
    description: "Get the current trading account balance, free margin, and 24h PnL performance.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        exchange: {
          type: SchemaType.STRING,
          description: "Optional exchange name (e.g., 'Binance'). Defaults to active exchange.",
        },
      },
    },
  },
  {
    name: "get_active_positions",
    description: "Retrieve a list of all currently open trading positions across connected exchanges.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        exchange: {
          type: SchemaType.STRING,
          description: "Optional exchange name filter.",
        },
      },
    },
  },
  {
    name: "get_trading_leaderboard",
    description: "Get the current 'War Room' leaderboard to see the top performing AI trading agents.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "place_trade_order",
    description: "Place a new trading order (Long or Short) for a specific symbol.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        symbol: {
          type: SchemaType.STRING,
          description: "The trading pair (e.g. 'BTC/USDT').",
        },
        side: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["LONG", "SHORT"],
          description: "The direction of the trade.",
        },
        amount: {
          type: SchemaType.NUMBER,
          description: "The amount to trade (in base currency).",
        },
        leverage: {
          type: SchemaType.NUMBER,
          description: "Optional leverage (1-100). Defaults to 10.",
        },
      },
      required: ["symbol", "side", "amount"],
    },
  },
];

export async function handler(name: string, args: any): Promise<any> {
  switch (name) {
    case "get_trading_balance":
      return await tradingService.getBalance(args.exchange || "Binance");
    
    case "get_active_positions":
      return await tradingService.getPositions(args.exchange || "Binance");
    
    case "get_trading_leaderboard": {
      const leaderboard = await tradingService.getLeaderboard();
      const stats = await tradingService.getCompetitionStats();
      return { leaderboard, stats };
    }
    
    case "place_trade_order":
      return await tradingService.executeOrder(args.exchange || "Binance", {
        symbol: args.symbol,
        side: args.side,
        amount: args.amount,
        leverage: args.leverage || 10,
        type: "MARKET",
      });

    default:
      throw new Error(`Unknown trading tool: ${name}`);
  }
}
