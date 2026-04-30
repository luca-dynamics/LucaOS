import { Type, FunctionDeclaration } from "@google/genai";

export const sendInstantMessageTool: FunctionDeclaration = {
  name: "sendInstantMessage",
  description:
    "Send a message to a contact using a specific messaging app (WhatsApp, Discord, Slack, etc.) via system automation.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      app: {
        type: Type.STRING,
        description: 'The messaging app name (e.g. "WhatsApp", "Discord").',
      },
      recipient: {
        type: Type.STRING,
        description: "The name of the recipient/contact.",
      },
      message: {
        type: Type.STRING,
        description: "The content of the message to send.",
      },
    },
    required: ["app", "recipient", "message"],
  },
};

// --- DISCORD TOOLS ---

export const sendDiscordMessageTool: FunctionDeclaration = {
  name: "sendDiscordMessage",
  description: "Send a message to a Discord channel or DM.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      channelId: {
        type: Type.STRING,
        description: "The Discord channel ID to send the message to.",
      },
      message: {
        type: Type.STRING,
        description: "The message content to send.",
      },
    },
    required: ["channelId", "message"],
  },
};

export const readDiscordMessagesTool: FunctionDeclaration = {
  name: "readDiscordMessages",
  description: "Read recent messages from a Discord channel.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      channelId: {
        type: Type.STRING,
        description: "The Discord channel ID to read from.",
      },
      count: {
        type: Type.NUMBER,
        description: "Number of messages to retrieve (default 20).",
      },
    },
    required: ["channelId"],
  },
};

export const listDiscordServersTool: FunctionDeclaration = {
  name: "listDiscordServers",
  description: "List all Discord servers the user is in.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

// --- WHATSAPP TOOLS ---

export const whatsappGetChatsTool: FunctionDeclaration = {
  name: "whatsappGetChats",
  description:
    "Fetch a list of recent WhatsApp chats via the Luca Link API (MCP). Use this to see who messaged recently.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      limit: {
        type: Type.NUMBER,
        description: "Number of chats to retrieve (default 10).",
      },
    },
  },
};

export const whatsappGetContactsTool: FunctionDeclaration = {
  name: "whatsappGetContacts",
  description:
    "Search the WhatsApp address book for contacts via Luca Link. Use this to find people not in the recent chat list.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "Search query (name or number).",
      },
    },
  },
};

export const whatsappReadChatTool: FunctionDeclaration = {
  name: "whatsappReadChat",
  description:
    "Read message history from a specific WhatsApp chat via Luca Link. Use this to get context of a conversation.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      contactName: { type: Type.STRING, description: "Name of the contact" },
      limit: {
        type: Type.NUMBER,
        description: "Number of messages to retrieve",
      },
    },
    required: ["contactName"],
  },
};

export const whatsappSendImageTool: FunctionDeclaration = {
  name: "whatsappSendImage",
  description:
    "Send an image to a WhatsApp contact via Luca Link. Automatically uses the currently attached image or the last generated image in the chat history as the payload.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      contactName: {
        type: Type.STRING,
        description: 'The name of the contact (e.g. "Mom", "Alice").',
      },
      caption: {
        type: Type.STRING,
        description: "Optional caption for the image.",
      },
    },
    required: ["contactName"],
  },
};

export const whatsappSendMessageTool: FunctionDeclaration = {
  name: "whatsappSendMessage",
  description:
    "Send a WhatsApp message directly via the Luca Link API (MCP). Use this PREFERENTIALLY for speed and background execution. Supports text sending to contacts.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      contactName: {
        type: Type.STRING,
        description: 'The name of the contact (e.g. "Mom", "Alice").',
      },
      message: { type: Type.STRING, description: "The message text." },
    },
    required: ["contactName", "message"],
  },
};

// --- TELEGRAM TOOLS ---

export const telegramGetChatsTool: FunctionDeclaration = {
  name: "telegramGetChats",
  description:
    "Fetch a list of recent Telegram chats via the Luca Link API. Use this to see recent conversations.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      limit: {
        type: Type.NUMBER,
        description: "Number of chats to retrieve (default 10).",
      },
    },
  },
};

export const telegramGetContactsTool: FunctionDeclaration = {
  name: "telegramGetContacts",
  description: "Search the Telegram address book for contacts via Luca Link.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "Search query (name or number).",
      },
    },
  },
};

export const telegramReadChatTool: FunctionDeclaration = {
  name: "telegramReadChat",
  description:
    "Read message history from a specific Telegram chat via Luca Link.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      contactName: { type: Type.STRING, description: "Name of the contact" },
      limit: {
        type: Type.NUMBER,
        description: "Number of messages to retrieve",
      },
    },
    required: ["contactName"],
  },
};

export const telegramSendMessageTool: FunctionDeclaration = {
  name: "telegramSendMessage",
  description:
    "Send a Telegram message directly via the Luca Link API. Use this for speed and background execution.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      contactName: {
        type: Type.STRING,
        description: 'The name of the contact (e.g. "Mom", "Alice").',
      },
      message: { type: Type.STRING, description: "The message text." },
    },
    required: ["contactName", "message"],
  },
};

// --- WECHAT TOOLS ---

export const wechatGetChatsTool: FunctionDeclaration = {
  name: "wechatGetChats",
  description:
    "Fetch a list of recent WeChat chats via the Luca Link API. Use this to see recent conversations.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      limit: {
        type: Type.NUMBER,
        description: "Number of chats to retrieve (default 10).",
      },
    },
  },
};

export const wechatGetContactsTool: FunctionDeclaration = {
  name: "wechatGetContacts",
  description: "Search the WeChat address book for contacts via Luca Link.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "Search query (name, WeChat ID, or alias).",
      },
    },
  },
};

export const wechatReadChatTool: FunctionDeclaration = {
  name: "wechatReadChat",
  description:
    "Read message history from a specific WeChat chat via Luca Link.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      contactName: { type: Type.STRING, description: "Name of the contact" },
      limit: {
        type: Type.NUMBER,
        description: "Number of messages to retrieve",
      },
    },
    required: ["contactName"],
  },
};

export const wechatSendMessageTool: FunctionDeclaration = {
  name: "wechatSendMessage",
  description:
    "Send a WeChat message directly via the Luca Link API. Use this for speed and background execution.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      contactName: {
        type: Type.STRING,
        description: 'The name of the contact (e.g. "Mom", "Alice").',
      },
      message: { type: Type.STRING, description: "The message text." },
    },
    required: ["contactName", "message"],
  },
};

export const wechatSendImageTool: FunctionDeclaration = {
  name: "wechatSendImage",
  description:
    "Send an image to a WeChat contact via Luca Link. Automatically uses the currently attached image or the last generated image.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      contactName: {
        type: Type.STRING,
        description: 'The name of the contact (e.g. "Mom", "Alice").',
      },
      caption: {
        type: Type.STRING,
        description: "Optional caption for the image.",
      },
    },
    required: ["contactName"],
  },
};
