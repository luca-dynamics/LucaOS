import { Type, FunctionDeclaration } from "@google/genai";

export const scanNetworkTool: FunctionDeclaration = {
  name: "scanNetwork",
  description:
    "Scan the local wireless spectrum (WiFi, Bluetooth) using Host Hardware. Detects SSIDs and Signal Strength. Use this when the user asks to 'scan the area' or 'find nearby networks'.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      frequency: {
        type: Type.STRING,
        description: 'Frequency band to scan (e.g., "2.4GHz", "5GHz", "ALL")',
        enum: ["2.4GHz", "5GHz", "ALL"],
      },
    },
  },
};

export const generateNetworkMapTool: FunctionDeclaration = {
  name: "generateNetworkMap",
  description:
    "Generate a high-fidelity 3D topology map of the current network facility. Use this for 'facility scans', 'network topology', or 'show me my infrastructure'. This provides a visual map of all connected nodes and their relationships.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      scanDepth: {
        type: Type.STRING,
        enum: ["QUICK", "DEEP", "FULL_FACILITY"],
        description: "The depth of the infrastructure scan.",
      },
    },
    required: ["scanDepth"],
  },
};
