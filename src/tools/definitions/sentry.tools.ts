import { Type, FunctionDeclaration } from "@google/genai";

export const controlSentryTool: FunctionDeclaration = {
  name: "controlSentry",
  description:
    "Control the Security Sentry (Audio/Visual Monitoring). Use this to turn monitoring on/off and set specific instructions (e.g., 'Watch for intruders', 'Listen for doorbell').",
  parameters: {
    type: Type.OBJECT,
    properties: {
      visualEnabled: {
        type: Type.BOOLEAN,
        description: "Turn Visual Sentry (Webcam/Room Guard) on or off.",
      },
      audioEnabled: {
        type: Type.BOOLEAN,
        description: "Turn Audio Sentry (Listening) on or off.",
      },
      instruction: {
        type: Type.STRING,
        description:
          "The specific event to monitor for (e.g., 'fire', 'person entering', 'glass breaking').",
      },
    },
  },
};
