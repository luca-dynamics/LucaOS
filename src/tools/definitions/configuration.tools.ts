import { SchemaType, FunctionDeclaration } from "@google/generative-ai";

export const getSystemSettingsTool: FunctionDeclaration = {
  name: "getSystemSettings",
  description:
    "Retrieve the current system configuration for LUCA, including brain models, voice providers, personality modes, IoT settings, and connection status. Use this to understand your current capabilities and configuration.",
  parameters: { type: SchemaType.OBJECT, properties: {} },
};

export const updateSystemSettingsTool: FunctionDeclaration = {
  name: "updateSystemSettings",
  description:
    "Update LUCA's system configuration across any category (Brain, Voice, IoT, Privacy, etc.). Use this to adapt LUCA to user commands or environment changes. Only provide the specific fields that need updating.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      general: {
        type: SchemaType.OBJECT,
        properties: {
          userName: { type: SchemaType.STRING },
          agencyLevel: {
            type: SchemaType.STRING,
            enum: ["PASSIVE", "PROACTIVE", "EXECUTIVE"], format: "enum",
          },
          persona: {
            type: SchemaType.STRING,
            description: "Persona mode (ASSISTANT, RUTHLESS, ENGINEER, HACKER)",
          },
          theme: {
            type: SchemaType.STRING,
            enum: ["PROFESSIONAL", "TACTICAL", "MINIMALIST", "CYBERPUNK"], format: "enum",
          },
          preferredMode: { type: SchemaType.STRING, enum: ["text", "voice"], format: "enum" },
          backgroundBlur: { type: SchemaType.NUMBER, description: "Background blur intensity in pixels (e.g., 12)" },
          backgroundOpacity: { type: SchemaType.NUMBER, description: "Background opacity (0.0 to 1.0)" },
          syncThemeWithPersona: { type: SchemaType.BOOLEAN },
        },
      },
      brain: {
        type: SchemaType.OBJECT,
        properties: {
          model: { type: SchemaType.STRING, description: "Main LLM model ID" },
          voiceModel: {
            type: SchemaType.STRING,
            description: "Native audio model for voice",
          },
          visionModel: {
            type: SchemaType.STRING,
            description: "Multimodal model for vision",
          },
          temperature: { type: SchemaType.NUMBER },
          preferOllama: { type: SchemaType.BOOLEAN },
        },
      },
      voice: {
        type: SchemaType.OBJECT,
        properties: {
          provider: {
            type: SchemaType.STRING,
            enum: ["native", "google", "local-luca", "gemini-genai", "openai", "deepgram"], format: "enum",
          },
          voiceId: { type: SchemaType.STRING, description: "Specific voice ID or speaker profile name" },
          rate: { type: SchemaType.NUMBER },
          pitch: { type: SchemaType.NUMBER },
          pacing: {
            type: SchemaType.STRING,
            enum: ["Fast", "Normal", "Slow", "Dramatic"], format: "enum",
          },
        },
      },
      iot: {
        type: SchemaType.OBJECT,
        properties: {
          haUrl: { type: SchemaType.STRING, description: "Home Assistant URL" },
          haToken: {
            type: SchemaType.STRING,
            description: "Home Assistant Access Token",
          },
        },
      },
      lucaLink: {
        type: SchemaType.OBJECT,
        properties: {
          enabled: { type: SchemaType.BOOLEAN },
          connectionMode: {
            type: SchemaType.STRING,
            enum: ["auto", "local", "vpn", "relay"], format: "enum",
          },
          relayServerUrl: { type: SchemaType.STRING },
          vpnServerUrl: { type: SchemaType.STRING },
        },
      },
      agentMode: {
        type: SchemaType.OBJECT,
        properties: {
          enabled: { type: SchemaType.BOOLEAN },
          maxIterations: { type: SchemaType.NUMBER },
          autoApprove: { type: SchemaType.BOOLEAN },
        },
      },
      socialPersistence: {
        type: SchemaType.OBJECT, description: "Control 'Always Online' (ALWAYS_ON) vs 'On Demand' (LAZY) status for social connectors.", properties: {
          whatsapp: { type: SchemaType.STRING, enum: ["ALWAYS_ON", "LAZY"], format: "enum" },
          telegram: { type: SchemaType.STRING, enum: ["ALWAYS_ON", "LAZY"], format: "enum" },
          linkedin: { type: SchemaType.STRING, enum: ["ALWAYS_ON", "LAZY"], format: "enum" },
          google: { type: SchemaType.STRING, enum: ["ALWAYS_ON", "LAZY"], format: "enum" },
          twitter: { type: SchemaType.STRING, enum: ["ALWAYS_ON", "LAZY"], format: "enum" },
          discord: { type: SchemaType.STRING, enum: ["ALWAYS_ON", "LAZY"], format: "enum" },
        },
      },
      privacy: {
        type: SchemaType.OBJECT,
        properties: {
          micEnabled: { type: SchemaType.BOOLEAN },
          cameraEnabled: { type: SchemaType.BOOLEAN },
          screenEnabled: { type: SchemaType.BOOLEAN },
        },
      },
      mcp: {
        type: SchemaType.OBJECT,
        properties: {
          servers: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                id: { type: SchemaType.STRING },
                name: { type: SchemaType.STRING },
                type: { type: SchemaType.STRING, enum: ["stdio", "sse"], format: "enum" },
                command: { type: SchemaType.STRING },
                args: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                url: { type: SchemaType.STRING },
                env: { type: SchemaType.OBJECT, properties: {} },
                autoConnect: { type: SchemaType.BOOLEAN },
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
  parameters: { type: SchemaType.OBJECT, properties: {} },
};

export const repairSystemTool: FunctionDeclaration = {
  name: "repairSystem",
  description:
    "Execute the LUCA Self-Repair Protocol. This autonomously identifies and attempts to fix degraded system components, reconfigures unhealthy infrastructure, and optimizes resource allocations. Use this for 'Self-Healing' when system health is degraded.",
  parameters: { type: SchemaType.OBJECT, properties: {} },
};

export const applyConfigFromSourceTool: FunctionDeclaration = {
  name: "applyConfigFromSource",
  description:
    "Apply a configuration to LUCA's settings from a raw JSON config block that the user has pasted or uploaded, or from a URL pointing to a config file. Parse the config and merge it into the current settings. Use this when the user shares a settings file, pastes config JSON, or sends a link to a config they want applied.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      configJson: {
        type: SchemaType.STRING,
        description: "Raw JSON string of the configuration to apply. Can be a full or partial settings object.",
      },
      configUrl: {
        type: SchemaType.STRING,
        description: "URL to a JSON config file to fetch and apply.",
      },
      preview: {
        type: SchemaType.BOOLEAN,
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
    type: SchemaType.OBJECT,
    properties: {
      connectorId: {
        type: SchemaType.STRING,
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
    type: SchemaType.OBJECT,
    properties: {
      actionId: {
        type: SchemaType.STRING,
        description: `The specific action to perform. Supported actions:
- General: 'browser-import-session', 'browser-clear-session', 'os-link-check', 'os-link-grant'
- Voice: 'voice-apply-preset' (payload: { preset: 'performance'|'speedster'|'balanced'|'privacy' }), 'voice-calibrate-rhythm' (payload: { pacing: 'Slow'|'Normal'|'Fast'|'Dramatic' }), 'voice-clone-delete' (payload: { voiceId: string }), 'voice-clone-activate' (payload: { voiceId: string })
- Data: 'memory-export-json', 'memory-wipe-store', 'session-reset-chat', 'memory-delete-node' (payload: { nodeId: string })
- Luca Link: 'link-pin-set' (payload: { pin: string }), 'link-pin-clear' (payload: { currentPin: string }), 'link-guest-generate', 'link-room-create', 'link-join-token' (payload: { token: string })
- MCP/Skills: 'mcp-connect' (payload: { name, type, command, args, url, env, autoConnect }), 'mcp-remove' (payload: { id }), 'mcp-sync', 'model-download' (payload: { modelId }), 'skills-refresh'
- Knowledge: 'knowledge-obsidian-sync' (payload: { filePath }), 'knowledge-obsidian-configure' (payload: { vaultPath }), 'knowledge-obsidian-load', 'knowledge-import' (payload: { platform: 'openai'|'claude'|'gemini'|'cursor'|'generic' })`,
      },
      payload: {
        type: SchemaType.OBJECT, description: "Required parameters for the action.", properties: {
          preset: { type: SchemaType.STRING },
          pacing: { type: SchemaType.STRING },
          voiceId: { type: SchemaType.STRING },
          nodeId: { type: SchemaType.STRING },
          pin: { type: SchemaType.STRING },
          token: { type: SchemaType.STRING },
          modelId: { type: SchemaType.STRING },
          pageId: { type: SchemaType.STRING },
          fileId: { type: SchemaType.STRING },
          vaultPath: { type: SchemaType.STRING },
          filePath: { type: SchemaType.STRING },
          platform: { type: SchemaType.STRING },
          id: { type: SchemaType.STRING, description: "Generic ID for connector, server, or file" },
          name: { type: SchemaType.STRING, description: "Generic name for connector or server" }
        },
      },
    },
    required: ["actionId"],
  },
};



