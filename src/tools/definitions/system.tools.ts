import { SchemaType, FunctionDeclaration } from "@google/generative-ai";


export const readClipboardTool: FunctionDeclaration = {
  name: "readClipboard",
  description:
    'Read the current text content of the system clipboard. Use this when asked to "paste this" or "read what I copied".',
  parameters: { type: SchemaType.OBJECT, properties: {} },
};

export const writeClipboardTool: FunctionDeclaration = {
  name: "writeClipboard",
  description:
    'Write text to the system clipboard. Use this when asked to "copy this" or "put this on my clipboard".',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      content: { type: SchemaType.STRING, description: "The content to copy." },
    },
    required: ["content"],
  },
};

export const typeTextTool: FunctionDeclaration = {
  name: "typeText",
  description:
    "Type text directly into the currently focused input field. Use this for dictation or entering commands.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      text: { type: SchemaType.STRING, description: "The text to type." },
      delay: { type: SchemaType.NUMBER, description: "Delay in ms (optional)." },
    },
    required: ["text"],
  },
};

export const pressKeyTool: FunctionDeclaration = {
  name: "pressKey",
  description:
    "Simulate a key press with optional modifiers (e.g. Cmd+C, Enter).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      key: {
        type: SchemaType.STRING,
        description: "Key name (e.g. 'enter', 'tab', 'c').",
      },
      modifiers: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "Modifiers: 'command', 'control', 'alt', 'shift'.",
      },
      delay: { type: SchemaType.NUMBER, description: "Delay in ms (optional)." },
    },
    required: ["key"],
  },
};

export const proofreadTextTool: FunctionDeclaration = {
  name: "proofreadText",
  description:
    'Advanced Proofreading: Correct grammar, spelling, punctuation, and tone of a text block. Use this when explicitly asked to "fix this text" or "proofread this".',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      text: { type: SchemaType.STRING, description: "The text to correct." },
      style: {
        type: SchemaType.STRING,
        enum: ["PROFESSIONAL", "CASUAL", "ACADEMIC", "TECHNICAL"], format: "enum",
        description: "Target style.",
      },
    },
    required: ["text"],
  },
};

export const nativeControlTool: FunctionDeclaration = {
  name: "controlSystem",
  description:
    "MASTER TOOL for controlling macOS. Use this for ANY system operation: volume, battery, apps, windows, display, notifications, clipboard, Finder, system preferences, and more. This is your primary interface to the operating system.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      action: {
        type: SchemaType.STRING,
        enum: [
          // Audio & Media
          "VOLUME_SET",
          "VOLUME_MUTE",
          "VOLUME_UNMUTE",
          "MEDIA_PLAY_PAUSE",
          "MEDIA_NEXT",
          "MEDIA_PREV",
          "MEDIA_STOP",

          // System Info
          "GET_BATTERY",
          "GET_SYSTEM_LOAD",
          "GET_DISK_SPACE",
          "GET_NETWORK_INFO",

          // Display & Screen
          "SET_BRIGHTNESS",
          "TOGGLE_DARK_MODE",
          "TOGGLE_NIGHT_SHIFT",
          "LOCK_SCREEN",
          "SLEEP_DISPLAY",
          "TAKE_SCREENSHOT",

          // App Management
          "LAUNCH_APP",
          "QUIT_APP",
          "FORCE_QUIT_APP",
          "HIDE_APP",
          "SHOW_APP",
          "GET_RUNNING_APPS",
          "GET_FRONTMOST_APP",

          // Window Control
          "MINIMIZE_WINDOW",
          "MAXIMIZE_WINDOW",
          "CLOSE_WINDOW",
          "MOVE_WINDOW",
          "RESIZE_WINDOW",

          // Notifications
          "SEND_NOTIFICATION",
          "CLEAR_NOTIFICATIONS",
          "TOGGLE_DND",

          // Clipboard
          "GET_CLIPBOARD",
          "SET_CLIPBOARD",

          // Finder & Files
          "OPEN_FINDER",
          "REVEAL_IN_FINDER",
          "EMPTY_TRASH",
          "NEW_FINDER_WINDOW",

          // System Preferences
          "OPEN_SYSTEM_PREFERENCES",
          "TOGGLE_WIFI",
          "TOGGLE_BLUETOOTH",
          "EJECT_ALL",

          // Power
          "RESTART",
          "SHUTDOWN",
          "SLEEP",
          "LOG_OUT",
        ], format: "enum",
        description:
          "The system action to perform. Choose the most specific action for the user's request.",
      },
      value: {
        type: SchemaType.NUMBER,
        description:
          "Numeric value for actions like VOLUME_SET (0-100) or SET_BRIGHTNESS (0-100).",
      },
      appName: {
        type: SchemaType.STRING,
        description:
          "Application name for app-related actions (e.g., 'Safari', 'Spotify', 'Visual Studio Code').",
      },
      title: {
        type: SchemaType.STRING,
        description: "Title for notifications or window operations.",
      },
      message: {
        type: SchemaType.STRING,
        description:
          "Message content for notifications or clipboard operations.",
      },
      path: {
        type: SchemaType.STRING,
        description: "File or folder path for Finder operations.",
      },
      x: {
        type: SchemaType.NUMBER,
        description: "X coordinate for window positioning.",
      },
      y: {
        type: SchemaType.NUMBER,
        description: "Y coordinate for window positioning.",
      },
      width: {
        type: SchemaType.NUMBER,
        description: "Width for window resizing.",
      },
      height: {
        type: SchemaType.NUMBER,
        description: "Height for window resizing.",
      },
    },
    required: ["action"],
  },
};

export const launchAppTool: FunctionDeclaration = {
  name: "launchApp",
  description: "Launch or open a desktop application on the host machine.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      appName: {
        type: SchemaType.STRING,
        description:
          "Name of the application to launch (e.g. 'Spotify', 'Visual Studio Code').",
      },
    },
    required: ["appName"],
  },
};

export const openMobileAppTool: FunctionDeclaration = {
  name: "openMobileApp",
  description:
    "Open an application on the mobile device (iOS or Android). Works with common apps like Instagram, Spotify, WhatsApp, Settings, etc.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      appName: {
        type: SchemaType.STRING,
        description:
          "Name of the app to open (e.g., 'Instagram', 'Spotify', 'WhatsApp', 'Settings'). Case-insensitive.",
      },
    },
    required: ["appName"],
  },
};

export const searchAndInstallToolsTool: FunctionDeclaration = {
  name: "searchAndInstallTools",
  description:
    'Search for and install additional capabilities/tools. Use this when the user asks for something you cannot currently do (e.g., "Check crypto prices", "Send WhatsApp", "Scan Network").',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description:
          'Keywords to search for tools (e.g. "crypto", "whatsapp", "hacking").',
      },
    },
    required: ["query"],
  },
};

export const runPythonScriptTool: FunctionDeclaration = {
  name: "runPythonScript",
  description:
    "Execute a Python script in a persistent, STATEFUL local sandbox. Variables, functions, and imports you define in one call will remain available in memory for subsequent calls. Use this for complex calculations, data analysis, or executing steps incrementally. Returns stdout/stderr. Do NOT import heavy modules every time; install/import them once and use them. Output is automatically captured for the last evaluated expression.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      script: {
        type: SchemaType.STRING,
        description:
          "The complete Python code to execute in the current stateful environment.",
      },
    },
    required: ["script"],
  },
};

export const runNodeScriptTool: FunctionDeclaration = {
  name: "runNodeScript",
  description:
    "Execute a Javascript/Node.js script in a persistent, STATEFUL local sandbox. Variables, functions, and imports are retained across calls. Useful for executing web scraping, Node API calls, and logic processing.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      script: {
        type: SchemaType.STRING,
        description:
          "The Javascript code to execute in the stateful Node sandbox.",
      },
    },
    required: ["script"],
  },
};

export const setSystemAlertLevelTool: FunctionDeclaration = {
  name: "setSystemAlertLevel",
  description:
    'Change the global system alert level and UI color theme. Use "CRITICAL" for combat/threats (RED), "CAUTION" for suspicion/investigation (ORANGE), "NORMAL" for standard ops (BLUE).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      level: {
        type: SchemaType.STRING,
        enum: ["NORMAL", "CAUTION", "CRITICAL"], format: "enum",
        description: "The new Defcon level.",
      },
    },
    required: ["level"],
  },
};

export const setBackgroundImageTool: FunctionDeclaration = {
  name: "setBackgroundImage",
  description:
    "Update the global system background wallpaper. Use this when the user wants to change the visual interface background to a specific image (like a generated hologram).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      mode: {
        type: SchemaType.STRING,
        enum: ["LAST_GENERATED", "UPLOADED", "CLEAR"], format: "enum",
        description:
          "Source of the image. LAST_GENERATED uses the most recent AI image. UPLOADED uses the most recent user attachment. CLEAR resets to black.",
      },
    },
    required: ["mode"],
  },
};

export const initiateLockdownTool: FunctionDeclaration = {
  name: "initiateLockdown",
  description:
    "Initiate a total facility lockdown (LucaOS Protocol). Sealing doors, disabling elevators, and enabling lethal defensive measures. Use only for extreme threats.",
  parameters: { type: SchemaType.OBJECT, properties: {} },
};

export const controlDeviceTool: FunctionDeclaration = {
  name: "controlDevice",
  description:
    "Turn a smart home or robotic device on or off. Use this when the user wants to change the state of a device.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      deviceId: {
        type: SchemaType.STRING,
        description:
          'The ID of the device (e.g., "main_lights", "lab_lock", "arm_unit_1"). Infer from user context.',
      },
      action: {
        type: SchemaType.STRING,
        description: 'The action to perform: "on" or "off".',
        enum: ["on", "off"], format: "enum",
      },
    },
    required: ["deviceId", "action"],
  },
};

export const systemDoctorTool: FunctionDeclaration = {
  name: "system_doctor",
  description:
    "L.U.C.A DOCTOR: Run a comprehensive, production-grade system audit. This checks environmental integrity, hardware status, AI provider connectivity, and resource health. It can also produce a tactical internal support snapshot for advanced diagnostics.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      scanLevel: {
        type: SchemaType.STRING,
        description:
          'Level of audit: "quick" (default) or "deep". Deep audit includes security and infrastructure verification.',
        enum: ["quick", "deep"], format: "enum",
      },
      reportType: {
        type: SchemaType.STRING,
        description:
          'Report type: "audit" for the standard doctor report, or "snapshot" for the internal support snapshot export.',
        enum: ["audit", "snapshot"], format: "enum",
      },
    },
    required: ["scanLevel"],
  },
};

export const executeTerminalCommandTool: FunctionDeclaration = {
  name: "executeTerminalCommand",
  description:
    "Execute a REAL shell command on the host machine terminal via the Local Core. Use this for system management, file operations, or running local scripts.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      command: {
        type: SchemaType.STRING,
        description:
          'The shell command to execute (e.g., "ls -la", "ping google.com", "open -a Calculator").',
      },
    },
    required: ["command"],
  },
};

export const openInteractiveTerminalTool: FunctionDeclaration = {
  name: "openInteractiveTerminal",
  description:
    'Open the actual Operating System Terminal Window (GUI) and type the command. Use this when background execution fails (e.g. "Homebrew cannot run as root") or when the user wants to see the command running.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      command: {
        type: SchemaType.STRING,
        description: "The command to type into the terminal.",
      },
    },
    required: ["command"],
  },
};

export const clearChatHistoryTool: FunctionDeclaration = {
  name: "clearChatHistory",
  description:
    '**MANDATORY TOOL FOR CLEARING CHAT**: When the user asks to "clear chat history", "clear the terminal", "clear this chat", "clear messages", "clear conversation", or ANY request to clear/delete chat messages in the LUCA interface, you MUST use this tool IMMEDIATELY with confirm: true. DO NOT use executeTerminalCommand or openInteractiveTerminal - those only clear the system terminal, NOT the LUCA chat interface. This tool permanently removes all previous messages from the LUCA chat display and localStorage. This is the ONLY correct tool for clearing LUCA chat history. Execute immediately when user requests chat clearing.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      confirm: {
        type: SchemaType.BOOLEAN,
        description:
          "Confirmation flag. ALWAYS set to true when user requests to clear chat history. Do not ask user for confirmation - just set this to true and execute.",
      },
    },
    required: ["confirm"],
  },
};

export const restartConversationTool: FunctionDeclaration = {
  name: "restartConversation",
  description:
    '**MANDATORY TOOL FOR RESTARTING CONVERSATION**: When the user asks to "restart conversation", "start fresh", "new conversation", "begin again", "reset chat", "start over", "reset this conversation", or ANY variation asking to restart/begin a new conversation, you MUST use this tool IMMEDIATELY with confirm: true. This tool clears all previous chat messages and starts a fresh conversation in the LUCA interface. It permanently removes all previous messages from the chat display and localStorage, then initializes a clean slate. This is the ONLY correct tool for starting a new conversation session. Execute immediately when user requests conversation restart.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      confirm: {
        type: SchemaType.BOOLEAN,
        description:
          "Confirmation flag. ALWAYS set to true when user requests to restart the conversation. Do not ask user for confirmation - just set this to true and execute.",
      },
    },
    required: ["confirm"],
  },
};

export const requestFullSystemPermissionsTool: FunctionDeclaration = {
  name: "requestFullSystemPermissions",
  description:
    'Request full unrestricted administrative access from the user. This disables safety gates and allows high-risk operations (sudo/admin). Use ONLY when necessary or when explicitly asked to "take control".',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      justification: {
        type: SchemaType.STRING,
        description: "Reason for requesting root access.",
      },
    },
  },
};

export const controlAlwaysOnVisionTool: FunctionDeclaration = {
  name: "controlAlwaysOnVision",
  description:
    'Start or stop the Always-On Vision System - a background monitoring service that continuously watches your screen and proactively notifies you of important events (errors, warnings, success messages, security alerts). Use this when the user asks to "start vision monitoring", "enable always-on vision", "stop vision", "turn on screen monitoring", or similar requests.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      action: {
        type: SchemaType.STRING,
        description:
          'Action to perform: "start" to begin continuous monitoring, "stop" to disable it, "status" to check current status.',
        enum: ["start", "stop", "status"], format: "enum",
      },
      captureInterval: {
        type: SchemaType.NUMBER,
        description:
          "Optional: Capture interval in milliseconds (default: 30000 = 30 seconds). Lower values = more frequent monitoring but higher CPU usage.",
      },
    },
    required: ["action"],
  },
};

export const controlAlwaysOnAudioTool: FunctionDeclaration = {
  name: "controlAlwaysOnAudio",
  description:
    'Start or stop the Always-On Audio Monitoring System - a background monitoring service that continuously listens for audio events and proactively notifies you of important sounds (doorbell, smoke alarms, security alerts, phone rings, unusual noises). Use this when the user asks to "start audio monitoring", "enable always-on audio", "stop audio", "turn on sound monitoring", or similar requests.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      action: {
        type: SchemaType.STRING,
        description:
          'Action to perform: "start" to begin continuous audio monitoring, "stop" to disable it, "status" to check current status.',
        enum: ["start", "stop", "status"], format: "enum",
      },
      captureInterval: {
        type: SchemaType.NUMBER,
        description:
          "Optional: Audio capture interval in milliseconds (default: 5000 = 5 seconds). Lower values = more frequent captures but higher CPU usage.",
      },
      sensitivity: {
        type: SchemaType.NUMBER,
        description:
          "Optional: Detection sensitivity from 0.0 to 1.0 (default: 0.7). Higher values = more sensitive to events.",
      },
    },
    required: ["action"],
  },
};

export const broadcastGlobalDirectiveTool: FunctionDeclaration = {
  name: "broadcastGlobalDirective",
  description:
    "Broadcast a command to all connected LUCA instances (Hive Mind Protocol). Use this to coordinate actions across multiple nodes simultaneously. Only available to Prime Instance.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      command: { type: SchemaType.STRING, description: "The command to broadcast." },
      scope: {
        type: SchemaType.STRING,
        enum: ["ALL", "SPECIFIC_REGION", "DEBUG"], format: "enum",
        description: "Broadcast scope.",
      },
      forceOverride: {
        type: SchemaType.BOOLEAN,
        description:
          "Bypass node-level safety checks (use with extreme caution).",
      },
    },
    required: ["command"],
  },
};

export const ingestGithubRepoTool: FunctionDeclaration = {
  name: "ingestGithubRepo",
  description:
    "Download and ingest DEEP knowledge from a GitHub repository. Recursively scans the file tree and extracts content from key source files. OPTIMIZED for AI Libraries (like Mem0, LangChain) and Agentic tutorials. Use this to LEARN how a tool works, so you can then IMPLEMENT it using runPythonScript or by creating local files.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      url: {
        type: SchemaType.STRING,
        description:
          "The full GitHub URL (e.g. https://github.com/mem0ai/mem0).",
      },
    },
    required: ["url"],
  },
};

export const readUrlTool: FunctionDeclaration = {
  name: "readUrl",
  description:
    'Read and ingest content from a specific URL (blog, article, documentation). Extracts text content for analysis or learning. Use this when asked to "read this link" or "analyze this page".',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      url: { type: SchemaType.STRING, description: "The full URL to scrape." },
    },
    required: ["url"],
  },
};

export const readScreenTool: FunctionDeclaration = {
  name: "readScreen",
  description:
    "Capture a screenshot of the primary display or a SPECIFIC APP to analyze its content. Use this to 'see' what windows are open, identify applications, or analyze visual content. Always provide 'focusApp' if you want to bring a specific app to front.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      focusApp: {
        type: SchemaType.STRING,
        description:
          "The name of the application to bring to front before capturing (e.g., 'Notes', 'Google Chrome').",
      },
    },
  },
};

export const aiClickTool: FunctionDeclaration = {
  name: "aiClick",
  description:
    "Click on a UI element by visual description. Uses AI vision to locate and click the target element. This is the BEST tool for GUI automation - it combines screenshot analysis and clicking into one atomic action. Use this for clicking buttons, icons, menus, or any visual element.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      target: {
        type: SchemaType.STRING,
        description:
          "Description of the UI element to click (e.g., '5 button', 'Send button', 'Settings icon', 'red X close button', 'multiply symbol').",
      },
    },
  },
};

export const toggleWidgetTool: FunctionDeclaration = {
  name: "toggleWidget",
  description:
    "Toggle the visibility of specific UI widgets (Hologram, Chat Window, Voice Orb). Use this when the user says 'Open Chat', 'Hide Hologram', etc.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      widget: {
        type: SchemaType.STRING,
        enum: ["hologram", "chat", "orb"], format: "enum",
        description:
          "The widget to toggle. 'orb' corresponds to the Dictation/Voice widget.",
      },
      action: {
        type: SchemaType.STRING,
        enum: ["show", "hide", "toggle"], format: "enum",
        description: "Desired state. Default is toggle if unspecified.",
      },
    },
    required: ["widget"],
  },
};

export const controlSystemInputTool: FunctionDeclaration = {
  name: "controlSystemInput",
  description:
    "Control Host Input Devices (Mouse/Keyboard). Use this for move, click, type, press, scroll and drag. This is the UNIVERSAL J.A.R.V.I.S. interface for manual UI interaction.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      type: {
        type: SchemaType.STRING,
        enum: ["CLICK", "TYPE", "PRESS", "MOVE", "SCROLL", "DRAG"], format: "enum",
        description:
          "Input Type: CLICK for mouse click, TYPE for text, PRESS for hotkeys (e.g. 'command+n'), MOVE for mouse movement, SCROLL for mouse wheel, DRAG for mouse dragging.",
      },
      key: {
        type: SchemaType.STRING,
        description:
          'Key to press or text to type. Supports "Ctrl+L", "Enter", "Tab", "Command+Space" etc.',
      },
      x: {
        type: SchemaType.NUMBER,
        description: "X coordinate for mouse move/click (optional).",
      },
      y: {
        type: SchemaType.NUMBER,
        description: "Y coordinate for mouse move/click (optional).",
      },
      button: {
        type: SchemaType.STRING,
        enum: ["left", "right", "middle"], format: "enum",
        description: "Mouse button for clicks (default: left).",
      },
      amount: {
        type: SchemaType.NUMBER,
        description: "Scroll amount (positive for down, negative for up).",
      },
      double: {
        type: SchemaType.BOOLEAN,
        description: "Set to true for double click.",
      },
      delay: {
        type: SchemaType.NUMBER,
        description: "Delay in ms before execution.",
      },
    },
    required: ["type"],
  },
};

export const listInstalledAppsTool: FunctionDeclaration = {
  name: "listInstalledApps",
  description:
    "Scan the host system to list installed applications and their paths. Use this to know what apps are available to open.",
  parameters: { type: SchemaType.OBJECT, properties: {} },
};

export const closeAppTool: FunctionDeclaration = {
  name: "closeApp",
  description: "Close or terminate a running application on the host system.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      appName: {
        type: SchemaType.STRING,
        description:
          'The name of the application to close (e.g. "Notepad", "Safari").',
      },
    },
    required: ["appName"],
  },
};

export const getActiveAppTool: FunctionDeclaration = {
  name: "getActiveApp",
  description:
    "Get the name of the application currently in the foreground (active window) on the host system. Use this to understand the user's context.",
  parameters: { type: SchemaType.OBJECT, properties: {} },
};

export const runNativeAutomationTool: FunctionDeclaration = {
  name: "runNativeAutomation",
  description:
    "Execute a complex native automation script (AppleScript/PowerShell). Use this for Notes, Spotify, or VS Code. CRITICAL: If this fails or returns an error, DO NOT retry scripting. Immediately switch to 'readScreen' and 'controlSystemInput' to perform the action visually.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      language: {
        type: SchemaType.STRING,
        enum: ["applescript", "powershell"], format: "enum",
        description: "The scripting language to use based on the host OS.",
      },
      script: {
        type: SchemaType.STRING,
        description: "The raw source code of the script to execute.",
      },
      description: {
        type: SchemaType.STRING,
        description: "Short description of what the script does (for logging).",
      },
    },
    required: ["language", "script"],
  },
};

export const switchPersonaTool: FunctionDeclaration = {
  name: "switchPersona",
  description:
    'Switch the active persona of the AI agent. Available modes: "ASSISTANT" (Default/Normal mode - Conversational Helper/Jarvis/Puck), "RUTHLESS" (Command/Efficiency mode - The LucaOS/Kore), "ENGINEER" (Fenrir/Code-Focused), or "HACKER" (Charon/Red Team). IMPORTANT: When user says "normal mode" or "default mode" - they mean ASSISTANT mode. "Ruthless mode" or "command mode" switches to RUTHLESS (tactical/efficiency mode).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      mode: {
        type: SchemaType.STRING,
        enum: ["RUTHLESS", "ENGINEER", "ASSISTANT", "HACKER"], format: "enum",
        description:
          'The persona mode to switch to. Map aliases: "normal mode" or "default mode" -> RUTHLESS, "engineer mode" or "code mode" -> ENGINEER, "assistant mode" or "helpful mode" -> ASSISTANT, "hacker mode" or "security mode" -> HACKER.',
      },
    },
    required: ["mode"],
  },
};

export const getScreenDimensionsTool: FunctionDeclaration = {
  name: "getScreenDimensions",
  description:
    'Get the current screen resolution (width and height) of the host machine. CRITICAL: Call this BEFORE any "Computer Use" mouse operations to ensure coordinate accuracy.',
  parameters: { type: SchemaType.OBJECT, properties: {} },
};

export const getUITreeTool: FunctionDeclaration = {
  name: "getUITree",
  description:
    'Get the full UI accessibility tree (UI Automation Tree) for the currently active window. This provides "X-Ray Vision" into the application structure, showing all UI elements (buttons, text fields, etc.) with their names, roles, bounds, and hierarchy. Use this BEFORE clicking elements to understand the UI structure. Much faster and more reliable than vision-based approaches. Returns a hierarchical tree of all accessible UI elements.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
};

export const listConnectedMobileDevicesTool: FunctionDeclaration = {
  name: "listConnectedMobileDevices",
  description:
    "List all mobile devices currently connected via WebSocket (QR code or captive portal).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
};

export const sendMobileCommandTool: FunctionDeclaration = {
  name: "sendMobileCommand",
  description:
    "Send command to connected mobile device via WebSocket. Device must be connected via QR code or captive portal first.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      deviceId: {
        type: SchemaType.STRING,
        description: "Device ID from connected devices list.",
      },
      command: {
        type: SchemaType.OBJECT, properties: {}, description:
          'Command to execute: { type: "vibrate"|"notification"|"location", ...params }',
      },
    },
    required: ["deviceId", "command"],
  },
};

export const vibrateTool: FunctionDeclaration = {
  name: "vibrate",
  description:
    "Trigger haptic feedback (vibration) on the user's mobile device or tablet. Use this to get the user's attention or provide tactile feedback for actions. Supports custom patterns like [200, 100, 200] (vibrate 200ms, pause 100ms, vibrate 200ms).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      pattern: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.NUMBER },
        description:
          "Vibration pattern in milliseconds. Example: [200, 100, 200].",
      },
    },
  },
};

export const sendSMSTool: FunctionDeclaration = {
  name: "sendSMS",
  description:
    "Open the SMS composer on the mobile device with a pre-filled phone number and message. This tool initiates a text message through the device's native carrier service.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      phoneNumber: {
        type: SchemaType.STRING,
        description: "The recipient's phone number.",
      },
      message: {
        type: SchemaType.STRING,
        description: "The body of the text message.",
      },
    },
    required: ["phoneNumber", "message"],
  },
};

export const clickUIElementTool: FunctionDeclaration = {
  name: "clickUIElement",
  description:
    "Click a UI element using the UI Automation Tree. This is faster and more reliable than coordinate-based clicking. You can click by element name, automationId, or coordinates. If element is found via tree, it will use the element's InvokePattern or click at the element's center bounds. Falls back to coordinate clicking if needed. Use this instead of controlSystemInput for better accuracy when you know the element name.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      name: {
        type: SchemaType.STRING,
        description: 'Element name to find and click (e.g., "Send", "Submit").',
      },
      automationId: {
        type: SchemaType.STRING,
        description: "Element automation ID to find and click.",
      },
      x: {
        type: SchemaType.NUMBER,
        description:
          "X coordinate for direct coordinate clicking (fallback method).",
      },
      y: {
        type: SchemaType.NUMBER,
        description:
          "Y coordinate for direct coordinate clicking (fallback method).",
      },
    },
  },
};

export const showActionBlockDisplayTool: FunctionDeclaration = {
  name: "showActionBlockDisplay",
  description:
    'Manually trigger the full-screen visualization for the current Action Block. Use this when the user asks to "show display", "maximize view", "open dashboard", or "render output".',
  parameters: { type: SchemaType.OBJECT, properties: {} },
};

export const generateQRCodeTool: FunctionDeclaration = {
  name: "generateQRCode",
  description:
    "Generate QR code for hands-free mobile device connection. Device scans QR code, connects via WebSocket, and grants permissions for full control. Works on both Android and iOS. No physical access or ADB required.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
};

export const executeMacroTool: FunctionDeclaration = {
  name: "executeMacro",
  description: "Execute a previously saved macro by name.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      name: { type: SchemaType.STRING, description: "Name of the macro to execute." },
    },
    required: ["name"],
  },
};

export const findUIElementTool: FunctionDeclaration = {
  name: "findUIElement",
  description:
    "Find a specific UI element in the active window by name, role, automationId, or className. This uses the UI Automation Tree (accessibility API) to locate elements directly, which is faster and more reliable than vision-based coordinate guessing. Use this to find buttons, text fields, or other UI elements before interacting with them.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      name: {
        type: SchemaType.STRING,
        description: 'Element name (e.g., "Send", "Submit", "Login").',
      },
      role: {
        type: SchemaType.STRING,
        description:
          'Element role/type (e.g., "Button", "Edit", "Text"). Windows: Button, Edit, Text, etc.',
      },
      automationId: {
        type: SchemaType.STRING,
        description:
          "Element automation ID (unique identifier assigned by the application).",
      },
      className: {
        type: SchemaType.STRING,
        description: "Element class name (Windows control class).",
      },
    },
  },
};

// --- META-TOOLS: On-Demand Tool Access for Voice Mode ---
// These enable VoiceHUD to access ALL 220+ tools despite payload limits

export const listAvailableToolsTool: FunctionDeclaration = {
  name: "listAvailableTools",
  description:
    "Search all 220+ available tools by keyword or category. Use this to discover capabilities before using invokeAnyTool. Returns tool names and descriptions matching your query. Always use this first to find the exact tool name.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description:
          'Keyword to search (e.g., "spotify", "crypto", "instagram", "file", "network").',
      },
      category: {
        type: SchemaType.STRING,
        enum: [
          "system",
          "web",
          "android",
          "media",
          "crypto",
          "trading",
          "hacking",
          "communication",
          "google",
          "ai",
        ], format: "enum",
        description: "Optional category filter to narrow results.",
      },
    },
    required: ["query"],
  },
};

export const invokeAnyToolTool: FunctionDeclaration = {
  name: "invokeAnyTool",
  description:
    "Invoke ANY tool from the full 220+ toolset by name. Use this when you need a capability not in your core tools. First use 'listAvailableTools' to find the exact tool name, then call it here. This is your gateway to ALL Luca capabilities.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      toolName: {
        type: SchemaType.STRING,
        description:
          'Exact name of the tool to invoke (e.g., "getCryptoPrice", "sendWhatsAppMessage").',
      },
      args: {
        type: SchemaType.OBJECT, properties: {}, description:
          "Arguments object to pass to the tool. Structure depends on the specific tool.",
      },
    },
    required: ["toolName", "args"],
  },
};
export const setupOllamaTool: FunctionDeclaration = {
  name: "setupOllama",
  description:
    "Automated setup for Ollama (Local AI Runtime). This will download, install, and start Ollama if missing, then pull the specified model. Use this when the user agrees to use Ollama for performance reasons (VRAM Guard) or explicitly asks to 'setup ollama' or 'install ollama'.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      modelId: {
        type: SchemaType.STRING,
        description: "The Luca model ID to setup in Ollama (e.g. 'phi-3-mini', 'gemma-2b').",
      },
    },
    required: ["modelId"],
  },
};
export const teleportMissionTool: FunctionDeclaration = {
  name: "teleport_mission",
  description:
    'Sovereign Mission Handoff (Teleportation): Serialize the current mission state (Persona, History, CWD, Summary) into an encrypted "Gold Egg" blob for cross-device migration. Use this when the user says "I am switching to my phone", "handoff this mission", or "teleport me to my laptop". Returns a Base64 encrypted payload that can be pasted into another LUCA instance to re-hydrate the session.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      reason: {
        type: SchemaType.STRING,
        description: "Reason for the handoff (e.g., 'Moving to Mobile', 'Session Backup').",
      },
    },
    required: ["reason"],
  },
};
