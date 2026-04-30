import { Type, FunctionDeclaration } from "@google/genai";

export const changeDirectoryTool: FunctionDeclaration = {
  name: "changeDirectory",
  description:
    'Change the current working directory (CWD) for file operations and shell execution. Supports relative paths ("..", "./src") or absolute paths.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: { type: Type.STRING, description: "The path to switch to." },
    },
    required: ["path"],
  },
};

export const listFilesTool: FunctionDeclaration = {
  name: "listFiles",
  description:
    "List files and folders in the current working directory (or a specific target path).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: {
        type: Type.STRING,
        description: "Optional specific path to list. Defaults to CWD.",
      },
    },
  },
};

export const readFileTool: FunctionDeclaration = {
  name: "readFile",
  description:
    "Read the text content of a specific file. Use this to analyze code, read logs, or understand project structure.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: {
        type: Type.STRING,
        description: "Path to the file (relative to CWD or absolute).",
      },
    },
    required: ["path"],
  },
};

export const writeProjectFileTool: FunctionDeclaration = {
  name: "writeProjectFile",
  description:
    "Write text content to a file at a specific path relative to the project root. Can overwrite existing files or create new ones. Use this to MODIFY THE APP ITSELF (self-evolution), write code, config files, or documentation.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: {
        type: Type.STRING,
        description:
          'The file path (relative to Project Root, e.g., "src/App.tsx").',
      },
      content: {
        type: Type.STRING,
        description: "The full text content to write.",
      },
    },
    required: ["path", "content"],
  },
};

export const auditSourceCodeTool: FunctionDeclaration = {
  name: "auditSourceCode",
  description:
    "Analyze a block of source code OR a local file for security vulnerabilities. Provide either a code snippet OR a filename/path (relative to Downloads folder).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      language: { type: Type.STRING, description: "Programming language." },
      snippet: {
        type: Type.STRING,
        description: "The code to analyze (optional if filePath provided).",
      },
      filePath: {
        type: Type.STRING,
        description:
          'Filename in Downloads folder (e.g. "script.py") to read and analyze.',
      },
    },
    required: ["language"],
  },
};

export const createOrUpdateFileTool: FunctionDeclaration = {
  name: "createOrUpdateFile",
  description:
    "Write code or text content to a file on the local system (Downloads folder). Use this to fix bugs, write scripts, or save reports.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      fileName: {
        type: Type.STRING,
        description: 'Name of the file to create (e.g. "fixed_script.py").',
      },
      content: {
        type: Type.STRING,
        description: "The full content to write to the file.",
      },
    },
    required: ["fileName", "content"],
  },
};

export const analyzeSpreadsheetTool: FunctionDeclaration = {
  name: "analyzeSpreadsheet",
  description:
    "Analyze an Excel spreadsheet (XLSX). Can perform calculations, extract data, or answer queries about the spreadsheet content.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      filePath: { type: Type.STRING, description: "Path to the Excel file." },
      query: {
        type: Type.STRING,
        description:
          'Optional query (e.g., "Calculate average of column B", "List all values in row 5").',
      },
    },
    required: ["filePath"],
  },
};

export const compileSelfTool: FunctionDeclaration = {
  name: "compileSelf",
  description:
    'Compile the current LUCA agent source code into standalone executable binaries for desktop and mobile platforms. Desktop: Windows (.exe installer, portable), macOS (.dmg, .zip), Linux (.AppImage, .deb, .rpm). Mobile: Android (.apk), iOS (.ipa - requires macOS/Xcode). Can build for current platform, specific platform, or all platforms. Use this when asked to "Build yourself", "Create an app", "Self-replicate", "Create Windows version", "Create macOS version", "Create Linux version", "Create Android app", "Create iOS app", "Build APK", "Build IPA", or "Build for all platforms".',
  parameters: {
    type: Type.OBJECT,
    properties: {
      target: {
        type: Type.STRING,
        enum: ["win", "mac", "linux", "android", "ios", "all", "all-mobile"],
        description:
          'Target platform. Desktop: "win", "mac", "linux", or "all" (all desktop). Mobile: "android" (APK), "ios" (IPA - requires macOS/Xcode), or "all-mobile" (both Android and iOS). Omit for current platform.',
      },
      arch: {
        type: Type.STRING,
        enum: ["x64", "ia32", "arm64"],
        description:
          "Target architecture for desktop builds (x64, ia32, arm64). Optional, defaults to host architecture. Not used for mobile builds.",
      },
      publish: {
        type: Type.BOOLEAN,
        description:
          "Whether to publish to GitHub Releases (optional, requires GitHub token).",
      },
    },
  },
};

export const createDocumentTool: FunctionDeclaration = {
  name: "createDocument",
  description:
    "Create a new document (PDF, DOCX, or PPTX) with specified content. Saves the file to the current working directory.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      fileName: {
        type: Type.STRING,
        description: "Name of the file to create (include extension).",
      },
      type: {
        type: Type.STRING,
        enum: ["PDF", "DOCX", "PPTX"],
        description: "Document format.",
      },
      content: {
        type: Type.STRING,
        description:
          "Text content for PDF/DOCX, or JSON structure for PPTX slides.",
      },
      title: { type: Type.STRING, description: "Document title (optional)." },
    },
    required: ["fileName", "type", "content"],
  },
};

export const getForgeRecipesTool: FunctionDeclaration = {
  name: "getForgeRecipes",
  description:
    "Get available recipe templates for common AI tools (Stable Diffusion, Local LLaMA, etc.). Use these as templates or modify them for custom installations.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const installFromRecipeTool: FunctionDeclaration = {
  name: "installFromRecipe",
  description:
    "Install a complex AI tool or application using a declarative JSON recipe. This enables sandboxed installation of tools like Stable Diffusion, Local LLaMA, or any application with dependencies. The recipe defines git clones, virtual environments, and package installations in a safe, isolated manner.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      appName: {
        type: Type.STRING,
        description:
          'Name for the installed application (e.g., "stable-diffusion", "local-llama").',
      },
      recipe: {
        type: Type.OBJECT,
        description:
          'JSON recipe object with install array. Each step has method (shell.run, git.clone, fs.write, fs.mkdir) and params. Example: { install: [{ method: "git.clone", params: { url: "https://github.com/user/repo" } }, { method: "shell.run", params: { message: "pip install -r requirements.txt", venv: "venv" } }] }',
      },
    },
    required: ["appName", "recipe"],
  },
};

export const listForgeAppsTool: FunctionDeclaration = {
  name: "listForgeApps",
  description: "List all applications installed via Luca Forge.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const listSubsystemsTool: FunctionDeclaration = {
  name: "listSubsystems",
  description:
    "List all managed subsystems with their status, CPU, memory, and uptime. Opens the Subsystem Dashboard UI.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const openCodeEditorTool: FunctionDeclaration = {
  name: "openCodeEditor",
  description:
    "Launch the Holographic IDE (Code Editor) for writing code, refactoring, or software development tasks. Use this when the user wants to see, edit, or write code.",
  parameters: { type: Type.OBJECT, properties: {} },
};

export const readDocumentTool: FunctionDeclaration = {
  name: "readDocument",
  description:
    "Read and extract text from documents (PDF, DOCX, XLSX, PPTX). Returns the document content as structured text.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      filePath: {
        type: Type.STRING,
        description: "Path to the document file.",
      },
      type: {
        type: Type.STRING,
        enum: ["PDF", "DOCX", "XLSX", "PPTX", "AUTO"],
        description: "Document type (AUTO to detect from extension).",
      },
    },
    required: ["filePath"],
  },
};

export const startSubsystemTool: FunctionDeclaration = {
  name: "startSubsystem",
  description:
    "Start a new background subsystem (long-running process). Useful for starting web servers, AI models, or any service that needs to run continuously. Opens the Subsystem Dashboard to monitor it.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description:
          'Human-readable name for the subsystem (e.g., "Stable Diffusion Server", "Local LLaMA").',
      },
      command: {
        type: Type.STRING,
        description: 'Command to execute (e.g., "python", "node", "gradio").',
      },
      args: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description:
          'Command arguments array (e.g., ["app.py", "--port", "7860"]).',
      },
      cwd: {
        type: Type.STRING,
        description: "Working directory (optional, defaults to current).",
      },
      port: {
        type: Type.NUMBER,
        description:
          "Expected port number if the process starts a web server (optional, for UI link).",
      },
      env: {
        type: Type.OBJECT,
        description:
          "Additional environment variables as key-value pairs (optional).",
      },
    },
    required: ["name", "command"],
  },
};

export const stopSubsystemTool: FunctionDeclaration = {
  name: "stopSubsystem",
  description: "Stop a running subsystem by its ID.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: {
        type: Type.STRING,
        description: "Subsystem ID (from listSubsystems).",
      },
    },
    required: ["id"],
  },
};

export const evolveCodeSafeTool: FunctionDeclaration = {
  name: "evolveCodeSafe",
  description:
    "Safely evolve/modify code using a sandbox. Use this for complex refactors. Logic: Sandbox -> Edit -> Verify -> Commit. If verification fails, changes are discarded.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      targetPath: {
        type: Type.STRING,
        description: "Path to the file to modify (relative to project root).",
      },
      code: {
        type: Type.STRING,
        description: "The complete, new source code for the file.",
      },
    },
    required: ["targetPath", "code"],
  },
};
