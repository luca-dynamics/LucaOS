import { SchemaType, FunctionDeclaration } from "@google/generative-ai";

export const scanNetworkTool: FunctionDeclaration = {
  name: "scanNetwork",
  description:
    "Scan the local wireless spectrum (WiFi, Bluetooth) using Host Hardware. Detects SSIDs and Signal Strength. Use this when the user asks to 'scan the area' or 'find nearby networks'.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      frequency: {
        type: SchemaType.STRING,
        description: 'Frequency band to scan (e.g., "2.4GHz", "5GHz", "ALL")',
        enum: ["2.4GHz", "5GHz", "ALL"], format: "enum",
      },
    },
  },
};

export const generateNetworkMapTool: FunctionDeclaration = {
  name: "generateNetworkMap",
  description:
    "Generate a high-fidelity 3D topology map of the current network facility. Use this for 'facility scans', 'network topology', or 'show me my infrastructure'. This provides a visual map of all connected nodes and their relationships.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      scanDepth: {
        type: SchemaType.STRING,
        enum: ["QUICK", "DEEP", "FULL_FACILITY"], format: "enum",
        description: "The depth of the infrastructure scan.",
      },
    },
    required: ["scanDepth"],
  },
};
