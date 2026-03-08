import { Type, FunctionDeclaration } from "@google/genai";

export const completeOnboardingTool: FunctionDeclaration = {
  name: "completeOnboarding",
  description:
    "Signal that the conversational onboarding process is complete and the user's profile is ready. Use this when the conversation has reached a natural conclusion and all required information has been gathered. Calling this tool will transition the system to the next phase (Calibration).",
  parameters: { type: Type.OBJECT, properties: {} },
};

export const createTaskTool: FunctionDeclaration = {
  name: "createTask",
  description:
    "Create a new task in the project management queue. Use this when the user implies a goal or future action.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Short title of the task." },
      priority: {
        type: Type.STRING,
        enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      },
      description: { type: Type.STRING, description: "Detailed description." },
    },
    required: ["title", "priority"],
  },
};

export const updateTaskStatusTool: FunctionDeclaration = {
  name: "updateTaskStatus",
  description: "Update the status of an existing task.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskId: { type: Type.STRING, description: "Task ID or Title keyword." },
      status: {
        type: Type.STRING,
        enum: ["IN_PROGRESS", "COMPLETED", "BLOCKED"],
      },
    },
    required: ["taskId", "status"],
  },
};

export const translateTextTool: FunctionDeclaration = {
  name: "translateText",
  description: "Translate a text string from one language to another.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING, description: "Text to translate." },
      targetLanguage: {
        type: Type.STRING,
        description: 'Target language (e.g., "Spanish", "French", "Japanese").',
      },
    },
    required: ["text", "targetLanguage"],
  },
};

export const visualTacticalUpdateTool: FunctionDeclaration = {
  name: "visualTacticalUpdate",
  description:
    "Present a visual tactical update to the user. Use this when major systems change state or when a summary of multiple operations is needed.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING, description: "Executive summary." },
      status: { type: Type.STRING, enum: ["NORMAL", "ALERT", "CRITICAL"] },
      data: { type: Type.OBJECT, description: "Tactical data points (JSON)." },
    },
    required: ["summary", "status"],
  },
};

export const scheduleEventTool: FunctionDeclaration = {
  name: "scheduleEvent",
  description: "Add an event to the calendar.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      startTimeISO: {
        type: Type.STRING,
        description: 'ISO Date string or "tomorrow at 2pm" (agent infers).',
      },
      type: { type: Type.STRING, enum: ["MEETING", "DEADLINE", "MAINTENANCE"] },
    },
    required: ["title", "type"],
  },
};

export const presentVisualDataTool: FunctionDeclaration = {
  name: "presentVisualData",
  description:
    "ACTIVATE THE VISUAL CORE (SMART SCREEN). Use this for product comparisons, specs, shopping research, or data visualization. This is the ONLY way to show a visual report. usage: call googleImageSearch first. IF IMAGE SEARCH FAILS, USE PLACEHOLDERS. DO NOT RETRY SEARCH ENDLESSLY.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      topic: {
        type: Type.STRING,
        description: "The title/topic of the data.",
      },
      type: {
        type: Type.STRING,
        enum: [
          "table",
          "chart",
          "list",
          "PRODUCT",
          "PLACE",
          "PERSON",
          "NEWS",
          "SOCIAL",
          "DOCUMENT",
          // New Visual Core Modes
          "SECURITY",
          "CINEMA",
          "OSINT",
          "STOCKS",
          "AUTONOMY",
          "SUBSYSTEMS",
          "CODE_EDITOR",
          "SKILLS",
          "CRYPTO",
          "FOREX",
          "PREDICTIONS",
          "NETWORK",
          "HACKING",
          "REPORTS",
          "GEO",
          "LIVE",
          "FILES",
          "VISION",
          "RECORDER",
          "TELEGRAM",
          "WHATSAPP",
          "WIRELESS",
          "INGESTION",
        ],
        description: "The type of visualization.",
      },
      layout: {
        type: Type.STRING,
        enum: ["GRID", "CAROUSEL", "COMPARISON"],
        description:
          "Layout style. Use 'COMPARISON' for products, 'GRID' for galleries.",
      },
      data: {
        type: Type.OBJECT,
        description:
          "The raw data object (JSON). If type is PRODUCT, this usually contains an 'items' array.",
      },
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Title of the item (e.g., "iPhone 17 Pro").',
            },
            imageUrl: {
              type: Type.STRING,
              description: "Valid image URL.",
            },
            videoUrl: {
              type: Type.STRING,
              description: "Optional video URL.",
            },
            details: {
              type: Type.OBJECT,
              description: "Key-value pairs for specs.",
            },
            source: {
              type: Type.STRING,
              description: "Source domain.",
            },
          },
          required: ["title", "imageUrl"],
        },
        description:
          "List of items to display (alternative to putting them in 'data').",
      },
    },
    required: ["topic", "type"],
  },
};
