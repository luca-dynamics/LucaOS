import { SchemaType, FunctionDeclaration } from "@google/generative-ai";

// --- SEARCH & MAPS ---

export const searchWebTool: FunctionDeclaration = {
  name: "searchWeb",
  description:
    "Use Google Search to find real-time information.    - **MANDATORY VISUALIZATION**: If you search for products, specs, or images, the VERY NEXT STEP after getting data MUST be 'presentVisualData'.\n    - **NO IMAGES**: Do NOT use this tool to find images. Use 'googleImageSearch' for that. This tool returns text only.\n    - **NO CHATTING**: Do NOT write a text summary of the specs. Use the tool to show them.\n    - **SEARCH LIMIT**: Do NOT call 'searchWeb' more than twice. Gather basic info and SHOW IT.\n    - **VISUAL CORE**: 'presentVisualData' is the ONLY way to show the \"Smart Screen\" comparison view. Use it.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "The optimized, highly specific search query.",
      },
    },
    required: ["query"],
  },
};

export const searchMapsTool: FunctionDeclaration = {
  name: "searchMaps",
  description:
    "Use Google Maps to find locations, places, businesses, or navigation info.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "Location or place to search for.",
      },
    },
    required: ["query"],
  },
};

export const googleImageSearchTool: FunctionDeclaration = {
  name: "googleImageSearch",
  description:
    "Search for images on Google. Returns image URLs and contexts. MUST be used before 'presentVisualData' when the user asks for products or comparisons, to provide the 'items' array.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "Image search query (e.g. 'iPhone 17 Pro render').",
      },
    },
    required: ["query"],
  },
};

// --- YOUTUBE TOOLS ---

export const searchYouTubeTool: FunctionDeclaration = {
  name: "searchYouTube",
  description: "Search for videos on YouTube.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "The search query.",
      },
      count: {
        type: SchemaType.NUMBER,
        description: "Number of results to return (default 10).",
      },
    },
    required: ["query"],
  },
};

export const getYouTubeSubscriptionsTool: FunctionDeclaration = {
  name: "getYouTubeSubscriptions",
  description: "Get recent videos from YouTube subscriptions.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      count: {
        type: SchemaType.NUMBER,
        description: "Number of videos to retrieve (default 20).",
      },
    },
  },
};

export const likeYouTubeVideoTool: FunctionDeclaration = {
  name: "likeYouTubeVideo",
  description: "Like a YouTube video. Requires login.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      videoUrl: {
        type: SchemaType.STRING,
        description: "The full URL of the YouTube video.",
      },
    },
    required: ["videoUrl"],
  },
};

export const commentYouTubeVideoTool: FunctionDeclaration = {
  name: "commentYouTubeVideo",
  description: "Post a comment on a YouTube video. Requires login.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      videoUrl: {
        type: SchemaType.STRING,
        description: "The full URL of the YouTube video.",
      },
      comment: {
        type: SchemaType.STRING,
        description: "The comment text.",
      },
    },
    required: ["videoUrl", "comment"],
  },
};

// --- GSUITE TOOLS ---

export const gmailListMessagesTool: FunctionDeclaration = {
  name: "gmail_list_messages",
  description: "Retrieve a list of Gmail messages matching a query.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "Gmail search query (e.g. 'from:boss', 'is:unread')",
      },
      maxResults: {
        type: SchemaType.NUMBER,
        description: "Maximum number of messages to return (default 10)",
      },
    },
  },
};

export const gmailGetMessageTool: FunctionDeclaration = {
  name: "gmail_get_message",
  description: "Retrieve full content of a specific Gmail message by ID.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      messageId: {
        type: SchemaType.STRING,
        description: "The unique ID of the Gmail message.",
      },
    },
    required: ["messageId"],
  },
};

export const gmailSendMessageTool: FunctionDeclaration = {
  name: "gmail_send_message",
  description: "Send a new email message via Gmail.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      to: { type: SchemaType.STRING, description: "Recipient's email address." },
      subject: { type: SchemaType.STRING, description: "Subject of the email." },
      body: {
        type: SchemaType.STRING,
        description: "HTML or plain text body of the email.",
      },
      attachments: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
        },
        description:
          "Optional. Array of file paths or base64 data strings to attach to the email.",
      },
    },
    required: ["to", "subject", "body"],
  },
};

export const driveListFilesTool: FunctionDeclaration = {
  name: "drive_list_files",
  description: "List files and folders in Google Drive.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description:
          "Drive search query (e.g. 'mimeType = \"application/pdf\"')",
      },
      maxResults: {
        type: SchemaType.NUMBER,
        description: "Maximum number of files to return (default 10)",
      },
    },
  },
};

export const driveSearchTool: FunctionDeclaration = {
  name: "drive_search",
  description: "Search for files in Google Drive by name or content.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "Name or text content to search for.",
      },
    },
    required: ["query"],
  },
};

export const driveUploadFileTool: FunctionDeclaration = {
  name: "drive_upload_file",
  description: "Upload a file to Google Drive.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      filePath: {
        type: SchemaType.STRING,
        description: "Local path or Base64 data of the file to upload.",
      },
      fileName: {
        type: SchemaType.STRING,
        description: "Name to give the file in Drive.",
      },
      mimeType: {
        type: SchemaType.STRING,
        description: "MIME type of the file (optional).",
      },
      folderId: {
        type: SchemaType.STRING,
        description: "ID of the folder to upload into (optional).",
      },
    },
    required: ["filePath", "fileName"],
  },
};

export const calendarListEventsTool: FunctionDeclaration = {
  name: "calendar_list_events",
  description: "Retrieve upcoming events from a Google Calendar.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      calendarId: {
        type: SchemaType.STRING,
        description: "Calendar ID (default 'primary')",
      },
      timeMin: {
        type: SchemaType.STRING,
        description: "ISO DateTime string (e.g. '2023-10-01T00:00:00Z')",
      },
      maxResults: {
        type: SchemaType.NUMBER,
        description: "Maximum number of events to return",
      },
    },
  },
};

export const calendarCreateEventTool: FunctionDeclaration = {
  name: "calendar_create_event",
  description: "Create a new event in Google Calendar.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      summary: { type: SchemaType.STRING, description: "Event title." },
      description: { type: SchemaType.STRING, description: "Event description." },
      start: { type: SchemaType.STRING, description: "Start ISO DateTime." },
      end: { type: SchemaType.STRING, description: "End ISO DateTime." },
      location: { type: SchemaType.STRING, description: "Event location." },
    },
    required: ["summary", "start", "end"],
  },
};

export const docsGetDocumentTool: FunctionDeclaration = {
  name: "docs_get_document",
  description: "Retrieve the full content of a Google Document.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      documentId: {
        type: SchemaType.STRING,
        description: "The unique ID of the Google Document.",
      },
    },
    required: ["documentId"],
  },
};

export const docsCreateDocumentTool: FunctionDeclaration = {
  name: "docs_create_document",
  description: "Create a new blank Google Document.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      title: {
        type: SchemaType.STRING,
        description: "The title of the new document.",
      },
    },
    required: ["title"],
  },
};

// --- SHEETS TOOLS ---

export const sheetsReadRangeTool: FunctionDeclaration = {
  name: "sheets_read_range",
  description: "Read data from a specific range in a Google Sheet.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      spreadsheetId: {
        type: SchemaType.STRING,
        description: "The unique ID of the Google Sheet.",
      },
      range: {
        type: SchemaType.STRING,
        description: "A1 notation range (e.g., 'Sheet1!A1:B10').",
      },
    },
    required: ["spreadsheetId", "range"],
  },
};

export const sheetsWriteRangeTool: FunctionDeclaration = {
  name: "sheets_write_range",
  description: "Write data to a specific range in a Google Sheet.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      spreadsheetId: {
        type: SchemaType.STRING,
        description: "The unique ID of the Google Sheet.",
      },
      range: {
        type: SchemaType.STRING,
        description: "A1 notation range (e.g., 'Sheet1!A1').",
      },
      values: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.STRING, // Or NUMBER/BOOLEAN, but STRING is safest for generic JSON
          },
        },
        description: "2D array of values to write.",
      },
    },
    required: ["spreadsheetId", "range", "values"],
  },
};

export const sheetsCreateTool: FunctionDeclaration = {
  name: "sheets_create",
  description: "Create a new Google Sheet.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      title: {
        type: SchemaType.STRING,
        description: "The title of the new spreadsheet.",
      },
    },
    required: ["title"],
  },
};

// --- CONTACTS TOOLS ---

export const contactsSearchTool: FunctionDeclaration = {
  name: "contacts_search",
  description: "Search for Google Contacts by name, email, or phone.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "Search query (e.g. 'Bob', 'bob@example.com').",
      },
    },
    required: ["query"],
  },
};

export const contactsGetTool: FunctionDeclaration = {
  name: "contacts_get",
  description: "Get details for a specific contact by resource name.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      resourceName: {
        type: SchemaType.STRING,
        description: "The resource name (people/12345).",
      },
    },
    required: ["resourceName"],
  },
};
