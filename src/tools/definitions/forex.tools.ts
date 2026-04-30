import { SchemaType, FunctionDeclaration } from "@google/generative-ai";

export const createForexAccountTool: FunctionDeclaration = {
  name: "createForexAccount",
  description:
    "Open a new Institutional Forex Trading Account. Enables fiat currency trading.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      leverage: {
        type: SchemaType.NUMBER,
        description:
          "Account leverage (e.g., 100 for 1:100, 500 for 1:500). Default 100.",
      },
      baseCurrency: {
        type: SchemaType.STRING,
        description: "Account currency (USD, EUR, GBP). Default USD.",
      },
    },
    required: ["leverage", "baseCurrency"],
  },
};

export const analyzeForexPairTool: FunctionDeclaration = {
  name: "analyzeForexPair",
  description:
    "Analyze a Forex Pair (e.g., EURUSD). Returns Macro-economic data, Technical Analysis levels, and Bank Sentiment.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      pair: {
        type: SchemaType.STRING,
        description: "Forex Pair (e.g., EURUSD, GBPJPY).",
      },
    },
    required: ["pair"],
  },
};

export const executeForexTradeTool: FunctionDeclaration = {
  name: "executeForexTrade",
  description:
    "Execute a Market Order on MT4 Forex. Requires MT4 bridge connection.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      symbol: {
        type: SchemaType.STRING,
        description: "Forex Pair Symbol (e.g., EURUSD, GBPJPY).",
      },
      type: {
        type: SchemaType.STRING,
        enum: ["BUY", "SELL"], format: "enum",
        description: "Order type: BUY (long) or SELL (short).",
      },
      lots: {
        type: SchemaType.NUMBER,
        description: "Volume in Lots (0.01 = micro lot, 1.0 = standard lot).",
      },
      stopLoss: {
        type: SchemaType.NUMBER,
        description: "Optional Stop Loss price.",
      },
      takeProfit: {
        type: SchemaType.NUMBER,
        description: "Optional Take Profit price.",
      },
    },
    required: ["symbol", "type", "lots"],
  },
};

export const getForexPositionsTool: FunctionDeclaration = {
  name: "getForexPositions",
  description: "Get all open positions from MT4 account.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
};

export const closeForexPositionTool: FunctionDeclaration = {
  name: "closeForexPosition",
  description: "Close a specific open position by ticket number.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      ticket: {
        type: SchemaType.NUMBER,
        description: "MT4 order ticket number.",
      },
    },
    required: ["ticket"],
  },
};

export const closeAllForexPositionsTool: FunctionDeclaration = {
  name: "closeAllForexPositions",
  description: "Close all open forex positions. Use with caution.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
};
