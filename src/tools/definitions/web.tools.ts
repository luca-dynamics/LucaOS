import { SchemaType, FunctionDeclaration } from "@google/generative-ai";

export const navigateWebPageTool: FunctionDeclaration = {
  name: "navigateWebPage",
  description:
    "Navigate the active web session to a new URL. Returns the page title, content, and an AI Snapshot (Accessibility Tree) of the page.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      url: { type: SchemaType.STRING, description: "The URL to navigate to." },
      sessionId: {
        type: SchemaType.STRING,
        description: "The session ID (optional, defaults to active).",
      },
    },
    required: ["url"],
  },
};

export const clickWebElementTool: FunctionDeclaration = {
  name: "clickWebElement",
  description:
    "Click an interactive element on the web page using its Ref ID (e.g. 'e12') from the AI Snapshot, or a CSS selector.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      elementRef: {
        type: SchemaType.STRING,
        description:
          "The Ref ID (e.g., 'e12') or CSS selector of the element to click.",
      },
      sessionId: { type: SchemaType.STRING, description: "The session ID." },
    },
    required: ["elementRef"],
  },
};

export const typeWebElementTool: FunctionDeclaration = {
  name: "typeWebElement",
  description:
    "Type text into an input field on the web page using its Ref ID (e.g. 'e12') from the AI Snapshot, or a CSS selector.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      elementRef: {
        type: SchemaType.STRING,
        description:
          "The Ref ID (e.g., 'e12') or CSS selector of the input element.",
      },
      text: { type: SchemaType.STRING, description: "The text to type." },
      pressEnter: {
        type: SchemaType.BOOLEAN,
        description: "Press Enter after typing?",
      },
      sessionId: { type: SchemaType.STRING, description: "The session ID." },
    },
    required: ["elementRef", "text"],
  },
};

export const scrollWebPageTool: FunctionDeclaration = {
  name: "scrollWebPage",
  description: "Scroll the web page.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      direction: {
        type: SchemaType.STRING,
        enum: ["up", "down"], format: "enum",
        description: "Scroll direction.",
      },
      amount: {
        type: SchemaType.NUMBER,
        description: "Pixels to scroll (default 500).",
      },
      sessionId: { type: SchemaType.STRING, description: "The session ID." },
    },
    required: ["direction"],
  },
};

export const scrapeWebPageTool: FunctionDeclaration = {
  name: "scrapeWebPage",
  description: "Extract the full text content of the current web page.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      sessionId: { type: SchemaType.STRING, description: "The session ID." },
    },
  },
};

export const getWebStateTool: FunctionDeclaration = {
  name: "getWebState",
  description:
    "Get the current state of the web page, including the URL, Title, and the AI Snapshot (Accessibility Tree).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      sessionId: { type: SchemaType.STRING, description: "The session ID." },
    },
  },
};

export const storeCredentialsTool: FunctionDeclaration = {
  name: "storeCredentials",
  description:
    "Securely store login credentials for a website in the Encrypted Vault.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      site: {
        type: SchemaType.STRING,
        description: 'The website or service name (e.g. "twitter.com").',
      },
      username: { type: SchemaType.STRING, description: "Username/Email." },
      password: { type: SchemaType.STRING, description: "Password." },
      notes: { type: SchemaType.STRING, description: "Optional notes." },
    },
    required: ["site", "username", "password"],
  },
};

export const retrieveCredentialsTool: FunctionDeclaration = {
  name: "retrieveCredentials",
  description: "Retrieve stored credentials for a website.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      site: { type: SchemaType.STRING, description: "The website or service name." },
    },
    required: ["site"],
  },
};

export const listCredentialsTool: FunctionDeclaration = {
  name: "listCredentials",
  description:
    "List all sites for which credentials are stored (passwords hidden).",
  parameters: { type: SchemaType.OBJECT, properties: {} },
};

export const deleteCredentialsTool: FunctionDeclaration = {
  name: "deleteCredentials",
  description: "Delete stored credentials for a website.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      site: { type: SchemaType.STRING, description: "The website or service name." },
    },
    required: ["site"],
  },
};

export const openWebviewTool: FunctionDeclaration = {
  name: "openWebview",
  description:
    "Open a URL in the Ghost Browser (Webview) for the user to see. Use this for simple browsing.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      url: { type: SchemaType.STRING, description: "The URL to open." },
    },
    required: ["url"],
  },
};

export const closeWebviewTool: FunctionDeclaration = {
  name: "closeWebview",
  description: "Close the Ghost Browser (Webview) window.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
};
