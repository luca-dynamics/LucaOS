import { Type, FunctionDeclaration } from "@google/genai";

export const createWalletTool: FunctionDeclaration = {
  name: "createWallet",
  description:
    "Create a new EVM-compatible wallet (Ethereum, Polygon, Base). securely stores the Private Key in the local Vault.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      chain: {
        type: Type.STRING,
        enum: ["ethereum", "polygon", "base"],
        description: "Blockchain to create wallet for.",
      },
      alias: {
        type: Type.STRING,
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
    type: Type.OBJECT,
    properties: {
      address: { type: Type.STRING, description: "Wallet Address (0x...)" },
      chain: {
        type: Type.STRING,
        enum: ["ethereum", "polygon", "base"],
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
    type: Type.OBJECT,
    properties: {
      chain: {
        type: Type.STRING,
        enum: ["ethereum", "polygon", "base"],
      },
      vaultKey: {
        type: Type.STRING,
        description: "Key ID from listWallets (e.g., wallet_ethereum_main)",
      },
      to: { type: Type.STRING, description: "Recipient Address (0x...)" },
      amount: {
        type: Type.NUMBER,
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
    type: Type.OBJECT,
    properties: {},
  },
};
