import { Type, FunctionDeclaration } from "@google/genai";

export const getMarketNewsTool: FunctionDeclaration = {
  name: "getMarketNews",
  description: "Retrieve real-time market news for a specific asset or sector.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      asset: {
        type: Type.STRING,
        description: 'Asset name or ticker (e.g., "BTC", "Apple", "Oil").',
      },
      sector: {
        type: Type.STRING,
        description: 'Market sector (e.g., "Tech", "Crypto", "Energy").',
      },
    },
  },
};

export const analyzeStockTool: FunctionDeclaration = {
  name: "analyzeStock",
  description:
    "Analyze a stock symbol (e.g., AAPL). Returns real-time price, technical indicators, and consensus analyst ratings.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      symbol: {
        type: Type.STRING,
        description: "Stock ticker symbol (e.g., TSLA, AAPL).",
      },
    },
    required: ["symbol"],
  },
};

export const searchPolymarketTool: FunctionDeclaration = {
  name: "searchPolymarket",
  description: "Search for prediction markets on Polymarket.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "Market search query." },
    },
    required: ["query"],
  },
};

export const placePolymarketBetTool: FunctionDeclaration = {
  name: "placePolymarketBet",
  description:
    "Place a bet (take a position) on a Polymarket prediction market.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      marketId: { type: Type.STRING, description: "Polymarket market ID." },
      outcome: {
        type: Type.STRING,
        enum: ["YES", "NO"],
        description: "Outcome to bet on.",
      },
      amount: { type: Type.NUMBER, description: "Bet amount in USDC." },
    },
    required: ["marketId", "outcome", "amount"],
  },
};

export const getPolymarketPositionsTool: FunctionDeclaration = {
  name: "getPolymarketPositions",
  description: "List all active positions on Polymarket.",
  parameters: { type: Type.OBJECT, properties: {} },
};

export const executeTradeTool: FunctionDeclaration = {
  name: "executeTrade",
  description: "Execute a trade order on the exchange.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      symbol: {
        type: Type.STRING,
        description: "Trading pair symbol (e.g., BTCUSDT).",
      },
      side: {
        type: Type.STRING,
        enum: ["BUY", "SELL"],
        description: "Order side.",
      },
      amount: { type: Type.NUMBER, description: "Quantity to trade." },
      type: {
        type: Type.STRING,
        enum: ["MARKET", "LIMIT"],
        description: "Order type (MARKET default).",
      },
    },
    required: ["symbol", "side", "amount"],
  },
};

export const getPositionsTool: FunctionDeclaration = {
  name: "getPositions",
  description: "List all currently active trading positions.",
  parameters: { type: Type.OBJECT, properties: {} },
};

export const closeAllPositionsTool: FunctionDeclaration = {
  name: "closeAllPositions",
  description: "EMERGENCY: Close all open positions immediately.",
  parameters: { type: Type.OBJECT, properties: {} },
};

export const startDebateTool: FunctionDeclaration = {
  name: "startDebate",
  description:
    "Start a trading debate session for a specific symbol to analyze market sentiment.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      symbol: {
        type: Type.STRING,
        description: "The symbol to debate (e.g., BTC, ETH, SOL).",
      },
    },
    required: ["symbol"],
  },
};
export const getTradingHistoryTool: FunctionDeclaration = {
  name: "getTradingHistory",
  description: "View the 'Git-like' audit history of AI trading actions, debates, and executions.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      limit: {
        type: Type.NUMBER,
        description: "Number of recent commits to retrieve (default: 10).",
      },
    },
  },
};

export const listProtocolSkillsTool: FunctionDeclaration = {
  name: "listProtocolSkills",
  description: "List all official protocol skill suites (Jupiter, AgentKit, etc.) and their available actions (swap, dca, stake, etc.).",
  parameters: { type: Type.OBJECT, properties: {} },
};

export const executeProtocolSkillTool: FunctionDeclaration = {
  name: "executeProtocolSkill",
  description: "Execute a specific action within an official protocol suite (e.g. swap, lend, stake). Requires protocol path and arguments.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: { type: Type.STRING, description: "The skill path (e.g. 'jupiter/swap' or 'agentkit/supply')" },
      args: { type: Type.OBJECT, description: "Action arguments (symbols, amounts, etc.)" }
    },
    required: ["path", "args"]
  }
};

export const registerDroppedSkillTool: FunctionDeclaration = {
  name: "registerDroppedSkill",
  description: "Register a new skill or protocol suite from an uploaded file or folder path. Automagically detects the format and layout.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: { type: Type.STRING, description: "The absolute path of the uploaded file or folder to register as a skill." }
    },
    required: ["path"]
  }
};
