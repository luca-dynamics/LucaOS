import { SchemaType, FunctionDeclaration } from "@google/generative-ai";

export const getMarketNewsTool: FunctionDeclaration = {
  name: "getMarketNews",
  description: "Retrieve real-time market news for a specific asset or sector.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      asset: {
        type: SchemaType.STRING,
        description: 'Asset name or ticker (e.g., "BTC", "Apple", "Oil").',
      },
      sector: {
        type: SchemaType.STRING,
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
    type: SchemaType.OBJECT,
    properties: {
      symbol: {
        type: SchemaType.STRING,
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
    type: SchemaType.OBJECT,
    properties: {
      query: { type: SchemaType.STRING, description: "Market search query." },
    },
    required: ["query"],
  },
};

export const placePolymarketBetTool: FunctionDeclaration = {
  name: "placePolymarketBet",
  description:
    "Place a bet (take a position) on a Polymarket prediction market.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      marketId: { type: SchemaType.STRING, description: "Polymarket market ID." },
      outcome: {
        type: SchemaType.STRING,
        enum: ["YES", "NO"], format: "enum",
        description: "Outcome to bet on.",
      },
      amount: { type: SchemaType.NUMBER, description: "Bet amount in USDC." },
    },
    required: ["marketId", "outcome", "amount"],
  },
};

export const getPolymarketPositionsTool: FunctionDeclaration = {
  name: "getPolymarketPositions",
  description: "List all active positions on Polymarket.",
  parameters: { type: SchemaType.OBJECT, properties: {} },
};

export const executeTradeTool: FunctionDeclaration = {
  name: "executeTrade",
  description: "Execute a trade order on the exchange.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      symbol: {
        type: SchemaType.STRING,
        description: "Trading pair symbol (e.g., BTCUSDT).",
      },
      side: {
        type: SchemaType.STRING,
        enum: ["BUY", "SELL"], format: "enum",
        description: "Order side.",
      },
      amount: { type: SchemaType.NUMBER, description: "Quantity to trade." },
      type: {
        type: SchemaType.STRING,
        enum: ["MARKET", "LIMIT"], format: "enum",
        description: "Order type (MARKET default).",
      },
    },
    required: ["symbol", "side", "amount"],
  },
};

export const getPositionsTool: FunctionDeclaration = {
  name: "getPositions",
  description: "List all currently active trading positions.",
  parameters: { type: SchemaType.OBJECT, properties: {} },
};

export const closeAllPositionsTool: FunctionDeclaration = {
  name: "closeAllPositions",
  description: "EMERGENCY: Close all open positions immediately.",
  parameters: { type: SchemaType.OBJECT, properties: {} },
};

export const startDebateTool: FunctionDeclaration = {
  name: "startDebate",
  description:
    "Start a trading debate session for a specific symbol to analyze market sentiment.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      symbol: {
        type: SchemaType.STRING,
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
    type: SchemaType.OBJECT,
    properties: {
      limit: {
        type: SchemaType.NUMBER,
        description: "Number of recent commits to retrieve (default: 10).",
      },
    },
  },
};

export const listProtocolSkillsTool: FunctionDeclaration = {
  name: "listProtocolSkills",
  description: "List all official protocol skill suites (Jupiter, AgentKit, etc.) and their available actions (swap, dca, stake, etc.).",
  parameters: { type: SchemaType.OBJECT, properties: {} },
};

export const executeProtocolSkillTool: FunctionDeclaration = {
  name: "executeProtocolSkill",
  description: "Execute a specific action within an official protocol suite (e.g. swap, lend, stake). Requires protocol path and arguments.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      path: { type: SchemaType.STRING, description: "The skill path (e.g. 'jupiter/swap' or 'agentkit/supply')" },
      args: { type: SchemaType.OBJECT, properties: {}, description: "Action arguments (symbols, amounts, etc.)" }
    },
    required: ["path", "args"]
  }
};

export const registerDroppedSkillTool: FunctionDeclaration = {
  name: "registerDroppedSkill",
  description: "Register a new skill or protocol suite from an uploaded file or folder path. Automagically detects the format and layout.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      path: { type: SchemaType.STRING, description: "The absolute path of the uploaded file or folder to register as a skill." }
    },
    required: ["path"]
  }
};
