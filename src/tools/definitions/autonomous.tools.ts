import { SchemaType, FunctionDeclaration } from "@google/generative-ai";

export const startSocialSkillRecordingTool: FunctionDeclaration = {
  name: "startSocialSkillRecording",
  description:
    "Start recording a new social platform action to learn it as a skill. A browser window will open for the user to perform the action.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      skillName: {
        type: SchemaType.STRING,
        description: "Unique name for the skill (e.g., 'twitter_retweet').",
      },
      platform: {
        type: SchemaType.STRING,
        description:
          "The platform name (twitter, instagram, linkedin, discord, youtube).",
      },
      description: {
        type: SchemaType.STRING,
        description: "Brief description of what this skill does.",
      },
    },
    required: ["skillName", "platform"],
  },
};

export const stopSocialSkillRecordingTool: FunctionDeclaration = {
  name: "stopSocialSkillRecording",
  description: "Stop recording the current social skill and save it.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
};

export const listSocialSkillsTool: FunctionDeclaration = {
  name: "listSocialSkills",
  description: "List all learned social skills.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
};

export const deleteSocialSkillTool: FunctionDeclaration = {
  name: "deleteSocialSkill",
  description: "Delete a learned social skill.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      skillName: {
        type: SchemaType.STRING,
        description: "The name of the skill to delete.",
      },
    },
    required: ["skillName"],
  },
};

export const createCustomSkillTool: FunctionDeclaration = {
  name: "createCustomSkill",
  description:
    "Create a new custom Python or Node.js skill that can be executed on demand. Opens the Skills Matrix UI for skill definition.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      name: {
        type: SchemaType.STRING,
        description: 'Skill name in camelCase (e.g., "scrapeReddit").',
      },
      description: { type: SchemaType.STRING, description: "What this skill does." },
      script: {
        type: SchemaType.STRING,
        description: "The code to execute (Python or Node.js).",
      },
      language: {
        type: SchemaType.STRING,
        enum: ["python", "node"], format: "enum",
        description: "Programming language.",
      },
      inputs: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "Array of input parameter names (optional).",
      },
    },
    required: ["name", "script", "language"],
  },
};

export const generateAndRegisterSkillTool: FunctionDeclaration = {
  name: "generateAndRegisterSkill",
  description:
    "Autonomously generate and register a new custom skill using AI. Describe what the skill should do in natural language, and the AI will generate the complete code, then automatically register it for immediate use. Use this when you need a new capability that doesn't exist yet.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      description: {
        type: SchemaType.STRING,
        description:
          'Natural language description of what the skill should do (e.g., "Scrape top 10 Hacker News stories and return titles, URLs, and scores as JSON")',
      },
      language: {
        type: SchemaType.STRING,
        enum: ["python", "node"], format: "enum",
        description: "Programming language to use (default: python).",
      },
    },
    required: ["description"],
  },
};

export const executeCustomSkillTool: FunctionDeclaration = {
  name: "executeCustomSkill",
  description:
    "Execute a previously created custom skill with provided arguments.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      skillName: {
        type: SchemaType.STRING,
        description: "Name of the skill to execute.",
      },
      args: {
        type: SchemaType.OBJECT, properties: {}, description:
          "Arguments object with key-value pairs matching the skill's input parameters.",
      },
    },
    required: ["skillName"],
  },
};

export const listCustomSkillsTool: FunctionDeclaration = {
  name: "listCustomSkills",
  description:
    "Retrieve a list of all registered custom skills with their names, descriptions, languages, inputs, and file paths. Use this to discover what skills are available before executing them.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
};

export const listMacrosTool: FunctionDeclaration = {
  name: "listMacros",
  description: "List all saved RPC macros.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
};

export const saveMacroTool: FunctionDeclaration = {
  name: "saveMacro",
  description:
    "Save an RPC script as a reusable macro. Macros can be executed later by name, making complex automations reusable.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      name: {
        type: SchemaType.STRING,
        description:
          'Unique name for the macro (camelCase, e.g., "deployApp").',
      },
      description: {
        type: SchemaType.STRING,
        description: "Description of what the macro does.",
      },
      script: {
        type: SchemaType.OBJECT, properties: {}, description: "RPC script object (same format as executeRpcScript).",
      },
    },
    required: ["name", "script"],
  },
};

export const manageGoalsTool: FunctionDeclaration = {
  name: "manageGoals",
  description: "Manage autonomous goals (add, list, delete).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      action: {
        type: SchemaType.STRING,
        description: 'Action to perform: "ADD", "LIST", "DELETE".',
      },
      description: {
        type: SchemaType.STRING,
        description: "Description of the goal (for ADD).",
      },
      schedule: {
        type: SchemaType.STRING,
        description:
          'Schedule for the goal (e.g., "0 9 * * *" or "EVERY_HOUR") (for ADD).',
      },
      id: { type: SchemaType.STRING, description: "ID of the goal (for DELETE)." },
    },
    required: ["action"],
  },
};

export const openAutonomyDashboardTool: FunctionDeclaration = {
  name: "openAutonomyDashboard",
  description: "Open the Autonomy Dashboard UI.",
  parameters: { type: SchemaType.OBJECT, properties: {}, required: [] },
};

export const executeRpcScriptTool: FunctionDeclaration = {
  name: "executeRpcScript",
  description:
    'Execute a structured RPC script (JSON-RPC format) for complex multi-step automations. Instead of guessing shell commands, output a structured JSON object with method calls. This makes automations savable, reusable, and secure. Example: { run: [{ method: "shell.run", params: { message: "python server.py", path: "./app" } }, { method: "subsystem.start", params: { name: "Server", command: "python", args: ["server.py"], port: 8000 } }] }',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      script: {
        type: SchemaType.OBJECT, properties: {}, description:
          "RPC script object with run array. Each step has: method (shell.run, fs.write, fs.read, fs.mkdir, fs.list, subsystem.start, http.get), params (method-specific), id (optional step identifier), store (optional variable name to store result). Available methods: shell.run (message, path, venv), fs.write (path, content), fs.read (path), fs.mkdir (path), fs.list (path), subsystem.start (name, command, args, cwd, port, env), http.get (url, headers).",
      },
      stopOnError: {
        type: SchemaType.BOOLEAN,
        description:
          "Whether to stop execution on first error (default: true).",
      },
    },
    required: ["script"],
  },
};

export const autonomousWebBrowseTool: FunctionDeclaration = {
  name: "autonomousWebBrowse",
  description:
    'Start an autonomous web browsing agent to achieve a complex goal. The agent will navigate, click, type, and reason until the goal is met. Use this for multi-step tasks like "Research X", "Buy Y", "Log into Z".',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      goal: {
        type: SchemaType.STRING,
        description:
          'The high-level goal (e.g. "Find the cheapest flight to Tokyo").',
      },
      url: { type: SchemaType.STRING, description: "Starting URL (optional)." },
      useVision: {
        type: SchemaType.BOOLEAN,
        description: "Enable visual analysis (slower but more robust).",
      },
      maxIterations: {
        type: SchemaType.NUMBER,
        description: "Max steps to take (default 20).",
      },
      useUserChrome: {
        type: SchemaType.BOOLEAN,
        description:
          "If true, uses your real Chrome browser (requires remote debugging). If false, uses Ghost Browser (headless/overlay).",
      },
    },
    required: ["goal"],
  },
};

export const ingestSkillFromURLTool: FunctionDeclaration = {
  name: "ingestSkillFromURL",
  description:
    "Autonomously ingest a new skill from a URL (e.g., GitHub repo, documentation, or article). LUCA will scrape the content, analyze the capabilities, generate the execution logic, and register the skill automatically. This enables immediate expansion of capabilities based on external knowledge.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      url: {
        type: SchemaType.STRING,
        description: "The URL to ingest (GitHub, documentation, or any technical page).",
      },
    },
    required: ["url"],
  },
};

export const controlSmartScreenTool: FunctionDeclaration = {
  name: "controlSmartScreen",
  description:
    "Direct and control the Smart Screen (Visual Core). Use this to navigate slides, scroll through data dossiers, or control the Ghost Browser during a presentation. This tool allows LUCA to autonomously drive her own visual explanations.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      action: {
        type: SchemaType.STRING,
        enum: ["NEXT", "PREV", "SET_INDEX", "SCROLL", "BROWSER_NAVIGATE", "HIGHLIGHT"], format: "enum",
        description: "The action to perform on the Smart Screen.",
      },
      value: {
        type: SchemaType.STRING,
        description:
          "The value for the action (e.g., target URL for BROWSER_NAVIGATE, index for SET_INDEX, or selector for HIGHLIGHT).",
      },
    },
    required: ["action"],
  },
};
