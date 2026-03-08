import { Type, FunctionDeclaration } from "@google/genai";

export const navigateWebPageTool: FunctionDeclaration = {
  name: "navigateWebPage",
  description:
    "Navigate the active web session to a new URL. Returns the page title, content, and an AI Snapshot (Accessibility Tree) of the page.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: { type: Type.STRING, description: "The URL to navigate to." },
      sessionId: {
        type: Type.STRING,
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
    type: Type.OBJECT,
    properties: {
      elementRef: {
        type: Type.STRING,
        description:
          "The Ref ID (e.g., 'e12') or CSS selector of the element to click.",
      },
      sessionId: { type: Type.STRING, description: "The session ID." },
    },
    required: ["elementRef"],
  },
};

export const typeWebElementTool: FunctionDeclaration = {
  name: "typeWebElement",
  description:
    "Type text into an input field on the web page using its Ref ID (e.g. 'e12') from the AI Snapshot, or a CSS selector.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      elementRef: {
        type: Type.STRING,
        description:
          "The Ref ID (e.g., 'e12') or CSS selector of the input element.",
      },
      text: { type: Type.STRING, description: "The text to type." },
      pressEnter: {
        type: Type.BOOLEAN,
        description: "Press Enter after typing?",
      },
      sessionId: { type: Type.STRING, description: "The session ID." },
    },
    required: ["elementRef", "text"],
  },
};

export const scrollWebPageTool: FunctionDeclaration = {
  name: "scrollWebPage",
  description: "Scroll the web page.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      direction: {
        type: Type.STRING,
        enum: ["up", "down"],
        description: "Scroll direction.",
      },
      amount: {
        type: Type.NUMBER,
        description: "Pixels to scroll (default 500).",
      },
      sessionId: { type: Type.STRING, description: "The session ID." },
    },
    required: ["direction"],
  },
};

export const scrapeWebPageTool: FunctionDeclaration = {
  name: "scrapeWebPage",
  description: "Extract the full text content of the current web page.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      sessionId: { type: Type.STRING, description: "The session ID." },
    },
  },
};

export const getWebStateTool: FunctionDeclaration = {
  name: "getWebState",
  description:
    "Get the current state of the web page, including the URL, Title, and the AI Snapshot (Accessibility Tree).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      sessionId: { type: Type.STRING, description: "The session ID." },
    },
  },
};

export const storeCredentialsTool: FunctionDeclaration = {
  name: "storeCredentials",
  description:
    "Securely store login credentials for a website in the Encrypted Vault.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      site: {
        type: Type.STRING,
        description: 'The website or service name (e.g. "twitter.com").',
      },
      username: { type: Type.STRING, description: "Username/Email." },
      password: { type: Type.STRING, description: "Password." },
      notes: { type: Type.STRING, description: "Optional notes." },
    },
    required: ["site", "username", "password"],
  },
};

export const retrieveCredentialsTool: FunctionDeclaration = {
  name: "retrieveCredentials",
  description: "Retrieve stored credentials for a website.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      site: { type: Type.STRING, description: "The website or service name." },
    },
    required: ["site"],
  },
};

export const listCredentialsTool: FunctionDeclaration = {
  name: "listCredentials",
  description:
    "List all sites for which credentials are stored (passwords hidden).",
  parameters: { type: Type.OBJECT, properties: {} },
};

export const deleteCredentialsTool: FunctionDeclaration = {
  name: "deleteCredentials",
  description: "Delete stored credentials for a website.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      site: { type: Type.STRING, description: "The website or service name." },
    },
    required: ["site"],
  },
};

export const openWebviewTool: FunctionDeclaration = {
  name: "openWebview",
  description:
    "Open a URL in the Ghost Browser (Webview) for the user to see. Use this for simple browsing.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: { type: Type.STRING, description: "The URL to open." },
    },
    required: ["url"],
  },
};

export const closeWebviewTool: FunctionDeclaration = {
  name: "closeWebview",
  description: "Close the Ghost Browser (Webview) window.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};
