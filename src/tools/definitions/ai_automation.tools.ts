import { SchemaType, FunctionDeclaration } from "@google/generative-ai";

export const aiQueryTool: FunctionDeclaration = {
  name: "aiQuery",
  description:
    "Ask a natural language question about the visual state of the screen. Returns a text answer based on visual analysis. Use this when you need to understand the screen but coordinates aren't enough.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description:
          'Question to ask (e.g. "What is the status of the order?").',
      },
    },
    required: ["query"],
  },
};

export const aiBooleanTool: FunctionDeclaration = {
  name: "aiBoolean",
  description:
    "Check if a visual condition is true or false on the screen. Returns a boolean. Use this for conditional logic based on visual state.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      condition: {
        type: SchemaType.STRING,
        description:
          'Condition to check (e.g. "is the login button visible?").',
      },
    },
    required: ["condition"],
  },
};

export const aiAssertTool: FunctionDeclaration = {
  name: "aiAssert",
  description:
    "Assert that a visual condition is true on the screen. If false, the task will fail with the provided reason. Use this for validation steps.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      assertion: {
        type: SchemaType.STRING,
        description:
          'What to assert (e.g. "the payment successful message is shown").',
      },
      reason: {
        type: SchemaType.STRING,
        description: "Message to show if the assertion fails.",
      },
    },
    required: ["assertion"],
  },
};

export const aiLocateTool: FunctionDeclaration = {
  name: "aiLocate",
  description:
    "Locate a UI element on the screen using a natural language description. Returns coordinates (x, y) and bounding box. This is the most robust way to find elements.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      description: {
        type: SchemaType.STRING,
        description:
          'Description of the element (e.g. "the red close button").',
      },
    },
    required: ["description"],
  },
};

export const aiWaitForTool: FunctionDeclaration = {
  name: "aiWaitForTool",
  description:
    "Wait for a visual condition to become true on the screen. Times out if not met within the limit.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      condition: {
        type: SchemaType.STRING,
        description:
          'Condition to wait for (e.g. "the loading spinner disappears").',
      },
      timeout: {
        type: SchemaType.NUMBER,
        description: "Timeout in milliseconds (default 5000).",
      },
    },
    required: ["condition"],
  },
};

export const aiActTool: FunctionDeclaration = {
  name: "aiAct",
  description:
    "Perform a natural language action on the screen. Use this for high-level UI automation steps that involve visual reasoning.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      action: {
        type: SchemaType.STRING,
        description: 'Action to perform (e.g. "log in using my credentials").',
      },
    },
    required: ["action"],
  },
};
