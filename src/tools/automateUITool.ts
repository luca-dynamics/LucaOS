import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

/**
 * LLM Tool for UI Automation
 * Allows Luca to automate Android UI via natural language
 */
export const automateUITool: FunctionDeclaration = {
  name: "automateUI",
  description:
    "Automate Android app UI by clicking buttons, filling forms, scrolling, etc. Works on ANY app using Vision AI to find elements. (Android only, requires Accessibility Service enabled)",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      task: {
        type: SchemaType.STRING,
        description:
          "Natural language description of the UI automation task. Examples: 'Click the blue Send button', 'Turn on airplane mode in Settings', 'Type Hello into the message field', 'Scroll down to find more posts'",
      },
      screenshot: {
        type: SchemaType.STRING,
        description:
          "Optional base64-encoded screenshot for Vision AI element detection. If omitted, will use simple text matching.",
      },
    },
    required: ["task"],
  },
};
