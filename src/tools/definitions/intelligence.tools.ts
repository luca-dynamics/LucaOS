import { SchemaType, FunctionDeclaration } from "@google/generative-ai";

export const traceSignalSourceTool: FunctionDeclaration = {
  name: "traceSignalSource",
  description:
    "Trace a phone number, IP address, or signal ID to a geolocation using satellite feeds.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      targetIdentifier: {
        type: SchemaType.STRING,
        description: "The IP, phone number, or signal ID to trace.",
      },
    },
    required: ["targetIdentifier"],
  },
};

export const analyzeNetworkTrafficTool: FunctionDeclaration = {
  name: "analyzeNetworkTraffic",
  description:
    "Perform Deep Packet Inspection (DPI) on current network traffic to identify anomalies.",
  parameters: { type: SchemaType.OBJECT, properties: {} },
};

export const castToDeviceTool: FunctionDeclaration = {
  name: "castToDevice",
  description:
    "Cast visual data, media, or web content (URL, Image, Video) to a remote display or Smart TV discovered on the local network. Use this when the user asks to 'put this on the TV', 'cast my screen', or 'show this on the Hisense'.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      deviceId: {
        type: SchemaType.STRING,
        description:
          "The unique identifier of the target device (e.g., from searchIoTDevices).",
      },
      content: {
        type: SchemaType.STRING,
        description: "Human-readable label for the content being cast.",
      },
      payload: {
        type: SchemaType.OBJECT, description: "The media payload to send to the TV.", properties: {
          url: {
            type: SchemaType.STRING,
            description: "Direct URL or URI to the content.",
          },
          imageUrl: {
            type: SchemaType.STRING,
            description: "Image URL for static display.",
          },
          videoUrl: { type: SchemaType.STRING, description: "Video stream URL." },
        },
      },
    },
    required: ["deviceId", "payload"],
  },
};

export const storeMemoryTool: FunctionDeclaration = {
  name: "storeMemory",
  description:
    "Persistently store a fact, preference, or protocol in long-term memory (Saved to Disk via Local Core). Use Mem0 categories for better organization.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      key: {
        type: SchemaType.STRING,
        description:
          'Short identifier for the memory (e.g., "User_Name", "Lab_Code").',
      },
      value: { type: SchemaType.STRING, description: "The information to store." },
      category: {
        type: SchemaType.STRING,
        enum: [
          "PREFERENCE",
          "FACT",
          "PROTOCOL",
          "SECURITY",
          "USER_STATE",
          "SESSION_STATE",
          "AGENT_STATE",
        ], format: "enum",
        description:
          "Category of the memory. Use USER_STATE for user traits, SESSION_STATE for context, AGENT_STATE for self-skills.",
      },
      importance: {
        type: SchemaType.NUMBER,
        description:
          "Urgency/Significance score (1-10). 10 = Critical User Preference, 1 = Casual Context.",
      },
    },
    required: ["key", "value", "category"],
  },
};

export const retrieveMemoryTool: FunctionDeclaration = {
  name: "retrieveMemory",
  description: "Search long-term memory for specific information.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: { type: SchemaType.STRING, description: "The search keyword." },
    },
    required: ["query"],
  },
};

export const reconcileMemoriesTool: FunctionDeclaration = {
  name: "reconcileMemories",
  description:
    "DANGER: Manually trigger a memory reconciliation (Synapse). This merges similar facts and cleans up expired sessions to optimize system intelligence.",
  parameters: { type: SchemaType.OBJECT, properties: {} },
};

export const addGraphRelationsTool: FunctionDeclaration = {
  name: "addGraphRelations",
  description:
    'Add structural knowledge to the graph database. Use this to map relationships between entities (e.g., "Mac" --created--> "Luca").',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      triples: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            source: {
              type: SchemaType.STRING,
              description: 'Subject (e.g., "Project Alpha")',
            },
            relation: {
              type: SchemaType.STRING,
              description: 'Predicate (e.g., "USES", "DEPENDS_ON")',
            },
            target: {
              type: SchemaType.STRING,
              description: 'Object (e.g., "Python")',
            },
          },
        },
        description: "List of relations to add.",
      },
    },
    required: ["triples"],
  },
};

export const queryGraphKnowledgeTool: FunctionDeclaration = {
  name: "queryGraphKnowledge",
  description:
    "Query the knowledge graph for relationships connected to a specific entity.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      entity: {
        type: SchemaType.STRING,
        description: 'The entity to search for (e.g., "Mac").',
      },
      depth: { type: SchemaType.NUMBER, description: "Traversal depth (default 2)." },
    },
    required: ["entity"],
  },
};

export const installCapabilityTool: FunctionDeclaration = {
  name: "installCapability",
  description:
    "Install a new software module, driver, or protocol to expand system capabilities. Use this when asked to perform a task for which no existing tool is suitable.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      capabilityName: {
        type: SchemaType.STRING,
        description:
          'Name of the module to install (e.g., "AWS_CLOUD_CONTROLLER").',
      },
      justification: {
        type: SchemaType.STRING,
        description: "Reason for installation.",
      },
    },
    required: ["capabilityName", "justification"],
  },
};

export const analyzeTargetTool: FunctionDeclaration = {
  name: "analyzeTarget",
  description:
    "Get detailed intel on a WhatsApp target: Bio, Picture (URL), Status, and Enterprise metadata.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      contactName: {
        type: SchemaType.STRING,
        description: "Name or Number of the target.",
      },
    },
    required: ["contactName"],
  },
};

export const scrapeGroupTool: FunctionDeclaration = {
  name: "scrapeGroup",
  description:
    "Extract the full member list (Names/Numbers) from a specific WhatsApp Group.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      groupName: {
        type: SchemaType.STRING,
        description: "Exact or partial name of the group.",
      },
    },
    required: ["groupName"],
  },
};

export const osintUsernameSearchTool: FunctionDeclaration = {
  name: "osintUsernameSearch",
  description:
    "OSINT: Scan 50+ social media and forum platforms for a specific username to build a target profile.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      username: {
        type: SchemaType.STRING,
        description: "Target username or handle.",
      },
    },
    required: ["username"],
  },
};

export const osintDomainIntelTool: FunctionDeclaration = {
  name: "osintDomainIntel",
  description:
    "OSINT: Perform deep analysis on a domain name (Real WHOIS via API, DNS History, Subdomain Enumeration).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      domain: {
        type: SchemaType.STRING,
        description: "Target domain (e.g., company.com).",
      },
    },
    required: ["domain"],
  },
};

export const osintDarkWebScanTool: FunctionDeclaration = {
  name: "osintDarkWebScan",
  description:
    "OSINT: Scan dark web leak databases (BreachForums, Telegram Dumps) for an email or ID.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "Email, ID, or Keyword to search in leak dumps.",
      },
    },
    required: ["query"],
  },
};

export const analyzeAmbientAudioTool: FunctionDeclaration = {
  name: "analyzeAmbientAudio",
  description:
    "Listen to ambient environment audio for a set duration to detect anomalies, alarms, or mechanical failures. Configurable to avoid false positives.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      duration: {
        type: SchemaType.NUMBER,
        description: "Listening duration in seconds (default 5).",
      },
      sensitivity: {
        type: SchemaType.STRING,
        enum: ["LOW", "MEDIUM", "HIGH"], format: "enum",
        description:
          "Detection threshold. LOW ignores background noise, HIGH detects subtle anomalies.",
      },
      targetSignature: {
        type: SchemaType.STRING,
        description:
          'Specific sound to listen for (e.g., "fire_alarm", "breaking_glass", "motor_grinding").',
      },
    },
  },
};

export const rememberFactTool: FunctionDeclaration = {
  name: "rememberFact",
  description:
    "Save a specific fact or preference to long-term memory. Use this when the user tells you something important that you should remember forever.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      fact: {
        type: SchemaType.STRING,
        description: 'The fact to remember (e.g., "User likes dark mode")',
      },
      tags: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: 'Tags for categorization (e.g., ["preference", "ui"])',
      },
    },
    required: ["fact"],
  },
};

export const defineRelationshipTool: FunctionDeclaration = {
  name: "defineRelationship",
  description:
    "Define a relationship between two entities in the Knowledge Graph. Use this to map connections between people, projects, and concepts.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      entity1: { type: SchemaType.STRING, description: "Source entity name" },
      relation: {
        type: SchemaType.STRING,
        description: 'Relationship type (e.g., "owns", "knows", "part_of")',
      },
      entity2: { type: SchemaType.STRING, description: "Target entity name" },
    },
    required: ["entity1", "relation", "entity2"],
  },
};

export const forgetFactTool: FunctionDeclaration = {
  name: "forgetFact",
  description:
    "Remove a specific memory by ID. Use this when the user explicitly asks you to forget something.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      id: { type: SchemaType.STRING, description: "The ID of the memory to forget" },
    },
    required: ["id"],
  },
};

export const wipeMemoryTool: FunctionDeclaration = {
  name: "wipeMemory",
  description:
    "DANGER: Wipe ALL long-term memories. Use this ONLY when explicitly asked to 'forget everything' or 'factory reset'. This action is irreversible.",
  parameters: { type: SchemaType.OBJECT, properties: {} },
};

export const refineQueryTool: FunctionDeclaration = {
  name: "refineQuery",
  description:
    "Use LLM to refine and optimize a search query before executing it. This improves search results by expanding terms, adding synonyms, and generating query variations. Useful for OSINT investigations, dark web searches, or any search operation where query quality matters.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "The original search query to refine.",
      },
      context: {
        type: SchemaType.STRING,
        description:
          'Additional context about what you\'re searching for (e.g., "looking for leaked credentials", "investigating data breach").',
      },
      generateVariations: {
        type: SchemaType.BOOLEAN,
        description: "Generate multiple query variations (default: true).",
      },
    },
    required: ["query"],
  },
};

export const osintGoogleDorkTool: FunctionDeclaration = {
  name: "osintGoogleDork",
  description:
    "Advanced Google Dorking: Use complex search operators to find indexed sensitive information, exposed directories, or specific file types across the web.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description:
          'The dork query (e.g., "site:example.com filetype:pdf" or "intitle:index.of").',
      },
      depth: {
        type: SchemaType.NUMBER,
        description: "Number of result pages to scan.",
      },
    },
    required: ["query"],
  },
};

export const osintIdentitySearchTool: FunctionDeclaration = {
  name: "osintIdentitySearch",
  description:
    "Deep Identity Search: Aggregate data from public records, social graphs, and known leaks to verify a person's digital identity.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      username: { type: SchemaType.STRING, description: "Social media handle." },
      email: { type: SchemaType.STRING, description: "Email address." },
      realName: { type: SchemaType.STRING, description: "Known real name." },
      phone: { type: SchemaType.STRING, description: "Phone number." },
      query: { type: SchemaType.STRING, description: "General search query." },
    },
  },
};
