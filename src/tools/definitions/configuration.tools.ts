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
          backgroundBlur: { type: Type.NUMBER, description: "Background blur intensity in pixels (e.g., 12)" },
          backgroundOpacity: { type: Type.NUMBER, description: "Background opacity (0.0 to 1.0)" },
          syncThemeWithPersona: { type: Type.BOOLEAN },
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
            enum: ["native", "google", "local-luca", "gemini-genai", "openai", "deepgram"],
          },
          voiceId: { type: Type.STRING, description: "Specific voice ID or speaker profile name" },
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
          relayServerUrl: { type: Type.STRING },
          vpnServerUrl: { type: Type.STRING },
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
      socialPersistence: {
        type: Type.OBJECT,
        description: "Control 'Always Online' (ALWAYS_ON) vs 'On Demand' (LAZY) status for social connectors.",
        properties: {
          whatsapp: { type: Type.STRING, enum: ["ALWAYS_ON", "LAZY"] },
          telegram: { type: Type.STRING, enum: ["ALWAYS_ON", "LAZY"] },
          linkedin: { type: Type.STRING, enum: ["ALWAYS_ON", "LAZY"] },
          google: { type: Type.STRING, enum: ["ALWAYS_ON", "LAZY"] },
          twitter: { type: Type.STRING, enum: ["ALWAYS_ON", "LAZY"] },
          discord: { type: Type.STRING, enum: ["ALWAYS_ON", "LAZY"] },
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

export const applyConfigFromSourceTool: FunctionDeclaration = {
  name: "applyConfigFromSource",
  description:
    "Apply a configuration to LUCA's settings from a raw JSON config block that the user has pasted or uploaded, or from a URL pointing to a config file. Parse the config and merge it into the current settings. Use this when the user shares a settings file, pastes config JSON, or sends a link to a config they want applied.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      configJson: {
        type: Type.STRING,
        description: "Raw JSON string of the configuration to apply. Can be a full or partial settings object.",
      },
      configUrl: {
        type: Type.STRING,
        description: "URL to a JSON config file to fetch and apply.",
      },
      preview: {
        type: Type.BOOLEAN,
        description: "If true, return what would be applied without saving. Useful for confirming the config before applying.",
      },
    },
  },
};

export const triggerConnectorAuthTool: FunctionDeclaration = {
  name: "triggerConnectorAuth",
  description:
    "Trigger the authentication/linking process for a specific connector (e.g., WhatsApp, Google, Telegram). Use this when the user asks to link, connect, or authenticate a social or productivity account. This will autonomously start the flow (opening Ghost Browser or triggering a manual link event) so the user doesn't have to navigate to settings.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      connectorId: {
        type: Type.STRING,
        description: "ID of the connector (e.g., 'whatsapp', 'google', 'telegram', 'twitter', 'linkedin', 'youtube', 'discord').",
      },
    },
    required: ["connectorId"],
  },
};

export const performSettingsActionTool: FunctionDeclaration = {
  name: "performSettingsAction",
  description:
    "Perform a specific action within a settings tab that goes beyond a simple state update. Use this when the user asks to 'Sync Notion', 'Load Google Files', 'Reset Brain to Defaults', 'Clear Fact Memory', or 'Re-distill Knowledge'. This autonomously triggers the logic associated with buttons in the Settings UI.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      actionId: {
        type: Type.STRING,
        description: `The specific action to perform. Supported actions:
- General: 'browser-import-session', 'browser-clear-session', 'os-link-check', 'os-link-grant'
- Voice: 'voice-apply-preset' (payload: { preset: 'performance'|'speedster'|'balanced'|'privacy' }), 'voice-calibrate-rhythm' (payload: { pacing: 'Slow'|'Normal'|'Fast'|'Dramatic' }), 'voice-clone-delete' (payload: { voiceId: string }), 'voice-clone-activate' (payload: { voiceId: string })
- Data: 'memory-export-json', 'memory-wipe-store', 'session-reset-chat', 'memory-delete-node' (payload: { nodeId: string })
- Luca Link: 'link-pin-set' (payload: { pin: string }), 'link-pin-clear' (payload: { currentPin: string }), 'link-guest-generate', 'link-room-create', 'link-join-token' (payload: { token: string })
- MCP/Skills: 'mcp-connect' (payload: { name, type, command, args, url, env, autoConnect }), 'mcp-remove' (payload: { id }), 'mcp-sync', 'model-download' (payload: { modelId }), 'skills-refresh'
- Knowledge: 'knowledge-obsidian-sync' (payload: { filePath }), 'knowledge-obsidian-configure' (payload: { vaultPath }), 'knowledge-obsidian-load', 'knowledge-import' (payload: { platform: 'openai'|'claude'|'gemini'|'cursor'|'generic' })`,
      },
      payload: {
        type: Type.OBJECT,
        description: "Required parameters for the action.",
        properties: {
          preset: { type: Type.STRING },
          pacing: { type: Type.STRING },
          voiceId: { type: Type.STRING },
          nodeId: { type: Type.STRING },
          pin: { type: Type.STRING },
          token: { type: Type.STRING },
          modelId: { type: Type.STRING },
          pageId: { type: Type.STRING },
          fileId: { type: Type.STRING },
          vaultPath: { type: Type.STRING },
          filePath: { type: Type.STRING },
          platform: { type: Type.STRING },
          id: { type: Type.STRING, description: "Generic ID for connector, server, or file" },
          name: { type: Type.STRING, description: "Generic name for connector or server" }
        },
      },
    },
    required: ["actionId"],
  },
};



