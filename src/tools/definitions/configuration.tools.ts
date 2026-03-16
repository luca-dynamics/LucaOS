import { Type, FunctionDeclaration } from "@google/genai";

export const getSystemSettingsTool: FunctionDeclaration = {
  name: "getSystemSettings",
  description:
    "Retrieve the current system configuration for LUCA, including brain models, voice providers, personality modes, IoT settings, and connection status. Use this to understand your current capabilities and configuration.",
  parameters: { type: Type.OBJECT, properties: {} },
};

export const updateSystemSettingsTool: FunctionDeclaration = {
  name: "updateSystemSettings",
  description:
    "Update LUCA's system configuration across any category (Brain, Voice, IoT, Privacy, etc.). Use this to adapt LUCA to user commands or environment changes. Only provide the specific fields that need updating.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      general: {
        type: Type.OBJECT,
        properties: {
          userName: { type: Type.STRING },
          agencyLevel: {
            type: Type.STRING,
            enum: ["PASSIVE", "PROACTIVE", "EXECUTIVE"],
          },
          persona: {
            type: Type.STRING,
            description: "Persona mode (ASSISTANT, RUTHLESS, ENGINEER, HACKER)",
          },
          theme: {
            type: Type.STRING,
            enum: ["PROFESSIONAL", "TACTICAL", "MINIMALIST", "CYBERPUNK"],
          },
          preferredMode: { type: Type.STRING, enum: ["text", "voice"] },
        },
      },
      brain: {
        type: Type.OBJECT,
        properties: {
          model: { type: Type.STRING, description: "Main LLM model ID" },
          voiceModel: {
            type: Type.STRING,
            description: "Native audio model for voice",
          },
          visionModel: {
            type: Type.STRING,
            description: "Multimodal model for vision",
          },
          temperature: { type: Type.NUMBER },
          preferOllama: { type: Type.BOOLEAN },
        },
      },
      voice: {
        type: Type.OBJECT,
        properties: {
          provider: {
            type: Type.STRING,
            enum: ["native", "google", "local-luca", "gemini-genai"],
          },
          rate: { type: Type.NUMBER },
          pitch: { type: Type.NUMBER },
          pacing: {
            type: Type.STRING,
            enum: ["Fast", "Normal", "Slow", "Dramatic"],
          },
        },
      },
      iot: {
        type: Type.OBJECT,
        properties: {
          haUrl: { type: Type.STRING, description: "Home Assistant URL" },
          haToken: {
            type: Type.STRING,
            description: "Home Assistant Access Token",
          },
        },
      },
      lucaLink: {
        type: Type.OBJECT,
        properties: {
          enabled: { type: Type.BOOLEAN },
          connectionMode: {
            type: Type.STRING,
            enum: ["auto", "local", "vpn", "relay"],
          },
        },
      },
      agentMode: {
        type: Type.OBJECT,
        properties: {
          enabled: { type: Type.BOOLEAN },
          maxIterations: { type: Type.NUMBER },
          autoApprove: { type: Type.BOOLEAN },
        },
      },
      privacy: {
        type: Type.OBJECT,
        properties: {
          micEnabled: { type: Type.BOOLEAN },
          cameraEnabled: { type: Type.BOOLEAN },
          screenEnabled: { type: Type.BOOLEAN },
        },
      },
      mcp: {
        type: Type.OBJECT,
        properties: {
          servers: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["stdio", "sse"] },
                command: { type: Type.STRING },
                args: { type: Type.ARRAY, items: { type: Type.STRING } },
                url: { type: Type.STRING },
                env: { type: Type.OBJECT },
                autoConnect: { type: Type.BOOLEAN },
              },
              required: ["id", "name", "type"],
            },
          },
        },
      },
    },
  },
};

export const auditSystemTool: FunctionDeclaration = {
  name: "auditSystem",
  description:
    "Run a comprehensive production-grade system audit of LUCA's core components, infrastructure (Cortex, MCP, IoT), security protocols, and resource health. Use this for 'Survival Awareness' and system health reporting.",
  parameters: { type: Type.OBJECT, properties: {} },
};

export const repairSystemTool: FunctionDeclaration = {
  name: "repairSystem",
  description:
    "Execute the LUCA Self-Repair Protocol. This autonomously identifies and attempts to fix degraded system components, reconfigures unhealthy infrastructure, and optimizes resource allocations. Use this for 'Self-Healing' when system health is degraded.",
  parameters: { type: Type.OBJECT, properties: {} },
};
