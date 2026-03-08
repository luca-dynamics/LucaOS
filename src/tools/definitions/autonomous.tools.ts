import { Type, FunctionDeclaration } from "@google/genai";

export const startSocialSkillRecordingTool: FunctionDeclaration = {
  name: "startSocialSkillRecording",
  description:
    "Start recording a new social platform action to learn it as a skill. A browser window will open for the user to perform the action.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      skillName: {
        type: Type.STRING,
        description: "Unique name for the skill (e.g., 'twitter_retweet').",
      },
      platform: {
        type: Type.STRING,
        description:
          "The platform name (twitter, instagram, linkedin, discord, youtube).",
      },
      description: {
        type: Type.STRING,
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
    type: Type.OBJECT,
    properties: {},
  },
};

export const listSocialSkillsTool: FunctionDeclaration = {
  name: "listSocialSkills",
  description: "List all learned social skills.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const deleteSocialSkillTool: FunctionDeclaration = {
  name: "deleteSocialSkill",
  description: "Delete a learned social skill.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      skillName: {
        type: Type.STRING,
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
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description: 'Skill name in camelCase (e.g., "scrapeReddit").',
      },
      description: { type: Type.STRING, description: "What this skill does." },
      script: {
        type: Type.STRING,
        description: "The code to execute (Python or Node.js).",
      },
      language: {
        type: Type.STRING,
        enum: ["python", "node"],
        description: "Programming language.",
      },
      inputs: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
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
    type: Type.OBJECT,
    properties: {
      description: {
        type: Type.STRING,
        description:
          'Natural language description of what the skill should do (e.g., "Scrape top 10 Hacker News stories and return titles, URLs, and scores as JSON")',
      },
      language: {
        type: Type.STRING,
        enum: ["python", "node"],
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
    type: Type.OBJECT,
    properties: {
      skillName: {
        type: Type.STRING,
        description: "Name of the skill to execute.",
      },
      args: {
        type: Type.OBJECT,
        description:
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
    type: Type.OBJECT,
    properties: {},
  },
};

export const listMacrosTool: FunctionDeclaration = {
  name: "listMacros",
  description: "List all saved RPC macros.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const saveMacroTool: FunctionDeclaration = {
  name: "saveMacro",
  description:
    "Save an RPC script as a reusable macro. Macros can be executed later by name, making complex automations reusable.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description:
          'Unique name for the macro (camelCase, e.g., "deployApp").',
      },
      description: {
        type: Type.STRING,
        description: "Description of what the macro does.",
      },
      script: {
        type: Type.OBJECT,
        description: "RPC script object (same format as executeRpcScript).",
      },
    },
    required: ["name", "script"],
  },
};

export const manageGoalsTool: FunctionDeclaration = {
  name: "manageGoals",
  description: "Manage autonomous goals (add, list, delete).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        description: 'Action to perform: "ADD", "LIST", "DELETE".',
      },
      description: {
        type: Type.STRING,
        description: "Description of the goal (for ADD).",
      },
      schedule: {
        type: Type.STRING,
        description:
          'Schedule for the goal (e.g., "0 9 * * *" or "EVERY_HOUR") (for ADD).',
      },
      id: { type: Type.STRING, description: "ID of the goal (for DELETE)." },
    },
    required: ["action"],
  },
};

export const openAutonomyDashboardTool: FunctionDeclaration = {
  name: "openAutonomyDashboard",
  description: "Open the Autonomy Dashboard UI.",
  parameters: { type: Type.OBJECT, properties: {}, required: [] },
};

export const executeRpcScriptTool: FunctionDeclaration = {
  name: "executeRpcScript",
  description:
    'Execute a structured RPC script (JSON-RPC format) for complex multi-step automations. Instead of guessing shell commands, output a structured JSON object with method calls. This makes automations savable, reusable, and secure. Example: { run: [{ method: "shell.run", params: { message: "python server.py", path: "./app" } }, { method: "subsystem.start", params: { name: "Server", command: "python", args: ["server.py"], port: 8000 } }] }',
  parameters: {
    type: Type.OBJECT,
    properties: {
      script: {
        type: Type.OBJECT,
        description:
          "RPC script object with run array. Each step has: method (shell.run, fs.write, fs.read, fs.mkdir, fs.list, subsystem.start, http.get), params (method-specific), id (optional step identifier), store (optional variable name to store result). Available methods: shell.run (message, path, venv), fs.write (path, content), fs.read (path), fs.mkdir (path), fs.list (path), subsystem.start (name, command, args, cwd, port, env), http.get (url, headers).",
      },
      stopOnError: {
        type: Type.BOOLEAN,
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
    type: Type.OBJECT,
    properties: {
      goal: {
        type: Type.STRING,
        description:
          'The high-level goal (e.g. "Find the cheapest flight to Tokyo").',
      },
      url: { type: Type.STRING, description: "Starting URL (optional)." },
      useVision: {
        type: Type.BOOLEAN,
        description: "Enable visual analysis (slower but more robust).",
      },
      maxIterations: {
        type: Type.NUMBER,
        description: "Max steps to take (default 20).",
      },
      useUserChrome: {
        type: Type.BOOLEAN,
        description:
          "If true, uses your real Chrome browser (requires remote debugging). If false, uses Ghost Browser (headless/overlay).",
      },
    },
    required: ["goal"],
  },
};
