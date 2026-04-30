import { SchemaType, FunctionDeclaration } from "@google/generative-ai";

export const playMediaTool: FunctionDeclaration = {
  name: "playMedia",
  description:
    "Play a movie, video, or stream in the Cinema Player. Supports YouTube, Netflix, Prime, Apple TV, and local files.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description:
          "The name of the movie, video, or service to play (e.g. 'Interstellar', 'Youtube', 'Netflix').",
      },
    },
    required: ["query"],
  },
};

export const controlMediaTool: FunctionDeclaration = {
  name: "controlMedia",
  description:
    "Control the Cinema Player playback. Use this to Pause, Play, Seek, Mute, or Toggle Fullscreen.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      action: {
        type: SchemaType.STRING,
        enum: ["PLAY", "PAUSE", "SEEK", "VOL_SET", "MUTE", "FULLSCREEN"], format: "enum",
        description: "Action to perform.",
      },
      value: {
        type: SchemaType.NUMBER,
        description: "Value for action (Seek seconds, Volume 0-100).",
      },
    },
    required: ["action"],
  },
};

export const generateOrEditImageTool: FunctionDeclaration = {
  name: "generateOrEditImage",
  description:
    "Generate a new image from a text prompt or edit an existing image. Use this tool when the user asks to 'draw something', 'create an image', 'generate a picture', or 'edit this image'. This uses a state-of-the-art AI image generation model (e.g., DALL-E 3, Imagen).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      prompt: {
        type: SchemaType.STRING,
        description:
          "Detailed text description of the image to generate. Be specific about style, subject, lighting, and composition.",
      },
      image: {
        type: SchemaType.STRING,
        description:
          "Base64 string of an existing image to edit. Optional. Only provide if editing.",
      },
    },
    required: ["prompt"],
  },
};

export const generateVideoTool: FunctionDeclaration = {
  name: "generateVideo",
  description:
    "Generate a video from a text prompt. Use this tool when the user asks to 'generate a video', 'make a movie', or 'animate this'. Uses state-of-the-art video generation models (e.g. Gemini Veo).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      prompt: {
        type: SchemaType.STRING,
        description:
          "Detailed text description of the video to generate. Include style, movement, and duration.",
      },
      durationSeconds: {
        type: SchemaType.NUMBER,
        description: "Duration in seconds (default 5).",
      },
    },
    required: ["prompt"],
  },
};

export const generateAudioTool: FunctionDeclaration = {
  name: "generateAudio",
  description:
    "Generate spoken audio (TTS) from text. Use this to create voice notes, narrations, or 'speak' a message. Returns an audio file.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      text: {
        type: SchemaType.STRING,
        description: "The text to speak.",
      },
      voice: {
        type: SchemaType.STRING,
        description:
          "Voice style (e.g., 'Puck', 'Kore', 'Fenrir', or 'CLONED_USER').",
      },
      language: {
        type: SchemaType.STRING,
        description: "Language code (default 'en-US').",
      },
    },
    required: ["text"],
  },
};
