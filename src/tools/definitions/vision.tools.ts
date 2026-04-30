import { SchemaType, FunctionDeclaration } from "@google/generative-ai";

/**
 * Enable the live vision (camera or screen) feed for multimodal analysis.
 */
export const enableVisionTool: FunctionDeclaration = {
  name: "enableVision",
  description:
    "Enables the live vision feed to allow Luca to see. Supported sources are 'camera' (surroundings) and 'screen' (desktop/mobile display). This should be used when the user asks Luca to 'look at something', 'see my screen', or 'open your eyes'.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      source: {
        type: SchemaType.STRING,
        enum: ["camera", "screen"], format: "enum",
        description: "The visual source to activate.",
      },
    },
    required: ["source"],
  },
};

/**
 * Disable the live vision feed.
 */
export const disableVisionTool: FunctionDeclaration = {
  name: "disableVision",
  description:
    "Disables the live vision feed (camera or screen) and stops the stream.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
};
