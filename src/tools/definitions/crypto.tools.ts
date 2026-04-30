import { SchemaType, FunctionDeclaration } from "@google/generative-ai";

export const createWalletTool: FunctionDeclaration = {
  name: "createWallet",
  description:
    "Create a new EVM-compatible wallet (Ethereum, Polygon, Base). securely stores the Private Key in the local Vault.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      chain: {
        type: SchemaType.STRING,
        enum: ["ethereum", "polygon", "base"], format: "enum",
        description: "Blockchain to create wallet for.",
      },
      alias: {
        type: SchemaType.STRING,
        description:
          "Optional alias/label for the wallet (e.g., 'main_savings').",
      },
    },
    required: ["chain"],
  },
};

export const getWalletBalanceTool: FunctionDeclaration = {
  name: "getWalletBalance",
  description: "Get the Native Token balance (ETH, MATIC) of a wallet address.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      address: { type: SchemaType.STRING, description: "Wallet Address (0x...)" },
      chain: {
        type: SchemaType.STRING,
        enum: ["ethereum", "polygon", "base"], format: "enum",
        description: "Blockchain to query.",
      },
    },
    required: ["address"],
  },
};

export const sendCryptoTransactionTool: FunctionDeclaration = {
  name: "sendCryptoTransaction",
  description:
    "Send native cryptocurrency to another address. REQUIRES AUTONOMY LEVEL 5 or User Confirmation.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      chain: {
        type: SchemaType.STRING,
        enum: ["ethereum", "polygon", "base"], format: "enum",
      },
      vaultKey: {
        type: SchemaType.STRING,
        description: "Key ID from listWallets (e.g., wallet_ethereum_main)",
      },
      to: { type: SchemaType.STRING, description: "Recipient Address (0x...)" },
      amount: {
        type: SchemaType.NUMBER,
        description: "Amount in native token (e.g., 0.01)",
      },
    },
    required: ["chain", "vaultKey", "to", "amount"],
  },
};

export const listWalletsTool: FunctionDeclaration = {
  name: "listWallets",
  description: "List all managed wallets in the secure vault.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
};
