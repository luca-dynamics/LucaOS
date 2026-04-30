import { SchemaType, FunctionDeclaration } from "@google/generative-ai";

export const completeOnboardingTool: FunctionDeclaration = {
  name: "completeOnboarding",
  description:
    "Signal that the conversational onboarding process is complete and the user's profile is ready. Use this when the conversation has reached a natural conclusion and all required information has been gathered. Calling this tool will transition the system to the next phase (Calibration).",
  parameters: { type: SchemaType.OBJECT, properties: {} },
};

export const createTaskTool: FunctionDeclaration = {
  name: "createTask",
  description:
    "Create a new task in the project management queue. Use this when the user implies a goal or future action.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      title: { type: SchemaType.STRING, description: "Short title of the task." },
      priority: {
        type: SchemaType.STRING,
        enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], format: "enum",
      },
      description: { type: SchemaType.STRING, description: "Detailed description." },
    },
    required: ["title", "priority"],
  },
};

export const updateTaskStatusTool: FunctionDeclaration = {
  name: "updateTaskStatus",
  description: "Update the status of an existing task.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      taskId: { type: SchemaType.STRING, description: "Task ID or Title keyword." },
      status: {
        type: SchemaType.STRING,
        enum: ["IN_PROGRESS", "COMPLETED", "BLOCKED"], format: "enum",
      },
    },
    required: ["taskId", "status"],
  },
};

export const translateTextTool: FunctionDeclaration = {
  name: "translateText",
  description: "Translate a text string from one language to another.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      text: { type: SchemaType.STRING, description: "Text to translate." },
      targetLanguage: {
        type: SchemaType.STRING,
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
    type: SchemaType.OBJECT,
    properties: {
      summary: { type: SchemaType.STRING, description: "Executive summary." },
      status: { type: SchemaType.STRING, enum: ["NORMAL", "ALERT", "CRITICAL"], format: "enum" },
      data: { type: SchemaType.OBJECT, properties: {}, description: "Tactical data points (JSON)." },
    },
    required: ["summary", "status"],
  },
};

export const scheduleEventTool: FunctionDeclaration = {
  name: "scheduleEvent",
  description: "Add an event to the calendar.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      title: { type: SchemaType.STRING },
      startTimeISO: {
        type: SchemaType.STRING,
        description: 'ISO Date string or "tomorrow at 2pm" (agent infers).',
      },
      type: { type: SchemaType.STRING, enum: ["MEETING", "DEADLINE", "MAINTENANCE"], format: "enum" },
    },
    required: ["title", "type"],
  },
};

export const presentVisualDataTool: FunctionDeclaration = {
  name: "presentVisualData",
  description:
    "ACTIVATE THE VISUAL CORE (SMART SCREEN). Use this for product comparisons, specs, shopping research, or data visualization. This is the ONLY way to show a visual report. usage: call googleImageSearch first. IF IMAGE SEARCH FAILS, USE PLACEHOLDERS. DO NOT RETRY SEARCH ENDLESSLY.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      topic: {
        type: SchemaType.STRING,
        description: "The title/topic of the data.",
      },
      type: {
        type: SchemaType.STRING,
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
        ], format: "enum",
        description: "The type of visualization.",
      },
      layout: {
        type: SchemaType.STRING,
        enum: ["GRID", "CAROUSEL", "COMPARISON"], format: "enum",
        description:
          "Layout style. Use 'COMPARISON' for products, 'GRID' for galleries.",
      },
      data: {
        type: SchemaType.OBJECT, properties: {}, description:
          "The raw data object (JSON). If type is PRODUCT, this usually contains an 'items' array.",
      },
      items: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            title: {
              type: SchemaType.STRING,
              description: 'Title of the item (e.g., "iPhone 17 Pro").',
            },
            imageUrl: {
              type: SchemaType.STRING,
              description: "Valid image URL.",
            },
            videoUrl: {
              type: SchemaType.STRING,
              description: "Optional video URL.",
            },
            details: {
              type: SchemaType.OBJECT, properties: {}, description: "Key-value pairs for specs.",
            },
            source: {
              type: SchemaType.STRING,
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
