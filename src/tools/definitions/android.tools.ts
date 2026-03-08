import { Type, FunctionDeclaration } from "@google/genai";

export const connectToAndroidDeviceTool: FunctionDeclaration = {
  name: "connectToAndroidDevice",
  description: "Connect to an Android device via ADB (Wireless or USB).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      ip: { type: Type.STRING, description: "IP address of the device." },
      port: { type: Type.NUMBER, description: "Port (default 5555)." },
      pairingCode: {
        type: Type.STRING,
        description: "Pairing code (for Android 11+).",
      },
    },
    required: ["ip"],
  },
};

export const startHighSpeedStreamTool: FunctionDeclaration = {
  name: "startHighSpeedStream",
  description:
    "Launch a high-performance (60fps, <35ms latency) native video stream of the connected Android device using scrcpy.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      deviceId: {
        type: Type.STRING,
        description: "Optional specific device ID to stream.",
      },
    },
    required: [],
  },
};

export const listAndroidDevicesTool: FunctionDeclaration = {
  name: "listAndroidDevices",
  description: "List connected Android devices.",
  parameters: { type: Type.OBJECT, properties: {} },
};

export const automateUITool: FunctionDeclaration = {
  name: "automateUI",
  description:
    "Automate Android app UI by clicking buttons, filling forms, scrolling, etc. Works on ANY app using Vision AI to find elements. (Android only, requires Accessibility Service enabled)",
  parameters: {
    type: Type.OBJECT,
    properties: {
      task: {
        type: Type.STRING,
        description:
          "Natural language description of the UI automation task. Examples: 'Click the blue Send button', 'Turn on airplane mode in Settings', 'Type Hello into the message field', 'Scroll down to find more posts'",
      },
      screenshot: {
        type: Type.STRING,
        description:
          "Optional base64-encoded screenshot for Vision AI element detection. If omitted, will use simple text matching.",
      },
    },
    required: ["task"],
  },
};

export const controlMobileDeviceTool: FunctionDeclaration = {
  name: "controlMobileDevice",
  description:
    "Control a connected Android device via ADB (Android Debug Bridge). Can tap specific coordinates, type text, or press physical keys (HOME/BACK). Use this when the user asks to interact with their phone.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        enum: ["TAP", "TEXT", "KEY", "SWIPE", "SCREENSHOT"],
        description: "The action to perform on the mobile device.",
      },
      x: { type: Type.NUMBER, description: "X coordinate for TAP/SWIPE." },
      y: { type: Type.NUMBER, description: "Y coordinate for TAP/SWIPE." },
      text: {
        type: Type.STRING,
        description: "Text to type (for TEXT action).",
      },
      keyCode: {
        type: Type.NUMBER,
        description: "Android KeyCode (3=HOME, 4=BACK, 26=POWER).",
      },
    },
    required: ["action"],
  },
};

export const getAndroidUITreeTool: FunctionDeclaration = {
  name: "getAndroidUITree",
  description:
    'Get the UI hierarchy of the connected Android device. Use this to "see" the screen elements.',
  parameters: { type: Type.OBJECT, properties: {} },
};

export const tapAndroidElementTool: FunctionDeclaration = {
  name: "tapAndroidElement",
  description: "Tap a UI element on the Android device.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      resourceId: {
        type: Type.STRING,
        description: "Resource ID of the element.",
      },
      text: { type: Type.STRING, description: "Text content of the element." },
      contentDesc: {
        type: Type.STRING,
        description: "Content description of the element.",
      },
      x: { type: Type.NUMBER, description: "X coordinate (if no element ID)." },
      y: { type: Type.NUMBER, description: "Y coordinate (if no element ID)." },
    },
  },
};

export const inputTextAndroidTool: FunctionDeclaration = {
  name: "inputTextAndroid",
  description: "Type text into the Android device.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING, description: "Text to type." },
    },
    required: ["text"],
  },
};

export const sendAdbCommandTool: FunctionDeclaration = {
  name: "sendAdbCommand",
  description: "Send a raw ADB command to the device.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      command: {
        type: Type.STRING,
        description:
          'The ADB command to execute (e.g. "shell input keyevent 26").',
      },
    },
    required: ["command"],
  },
};

export const installApkTool: FunctionDeclaration = {
  name: "installApk",
  description: "Install an APK file onto the Android device.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      apkPath: {
        type: Type.STRING,
        description: "Local path or URL to the APK.",
      },
      packageName: {
        type: Type.STRING,
        description: "Package name (optional).",
      },
    },
    required: ["apkPath"],
  },
};

export const enableWirelessAdbTool: FunctionDeclaration = {
  name: "enableWirelessAdb",
  description: "Enable wireless ADB on a device connected via USB.",
  parameters: { type: Type.OBJECT, properties: {} },
};

export const takeAndroidScreenshotTool: FunctionDeclaration = {
  name: "takeAndroidScreenshot",
  description: "Take a screenshot of the Android device.",
  parameters: { type: Type.OBJECT, properties: {} },
};

export const listAndroidFilesTool: FunctionDeclaration = {
  name: "listAndroidFiles",
  description: "List files on the Android device.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: {
        type: Type.STRING,
        description: "Path to list (default /sdcard).",
      },
    },
  },
};

export const clickAndroidElementTool: FunctionDeclaration = {
  name: "clickAndroidElement",
  description:
    "Click an Android UI element using the UI hierarchy. This is faster and more reliable than coordinate-based clicking. You can click by resource ID, text, content description, or coordinates. If element is found via hierarchy, it will click at the element's center bounds. Falls back to coordinate clicking if needed. Use this instead of controlMobileDevice for better accuracy when you know the element identifier.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      resourceId: {
        type: Type.STRING,
        description:
          'Android resource ID to find and click (e.g., "com.whatsapp:id/send").',
      },
      text: {
        type: Type.STRING,
        description: 'Element text to find and click (e.g., "Send", "Submit").',
      },
      contentDesc: {
        type: Type.STRING,
        description: "Content description to find and click.",
      },
      x: {
        type: Type.NUMBER,
        description:
          "X coordinate for direct coordinate clicking (fallback method).",
      },
      y: {
        type: Type.NUMBER,
        description:
          "Y coordinate for direct coordinate clicking (fallback method).",
      },
    },
  },
};

export const findAndroidElementTool: FunctionDeclaration = {
  name: "findAndroidElement",
  description:
    "Find a specific UI element in the current Android screen by resource ID, text, content description, or class name. This uses the UI hierarchy (uiautomator dump) to locate elements directly, which is faster and more reliable than vision-based coordinate guessing. Use this to find buttons, text fields, or other UI elements before interacting with them. Returns all matching elements with their bounds and properties.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      resourceId: {
        type: Type.STRING,
        description:
          'Android resource ID (e.g., "com.whatsapp:id/send", "android:id/button1").',
      },
      text: {
        type: Type.STRING,
        description: 'Element text content (e.g., "Send", "Submit", "Login").',
      },
      contentDesc: {
        type: Type.STRING,
        description:
          "Content description (accessibility label) of the element.",
      },
      className: {
        type: Type.STRING,
        description:
          'Android class name (e.g., "android.widget.Button", "android.widget.EditText").',
      },
      package: {
        type: Type.STRING,
        description: 'Package name to filter elements (e.g., "com.whatsapp").',
      },
    },
  },
};

export const getAndroidDeviceIPTool: FunctionDeclaration = {
  name: "getAndroidDeviceIP",
  description:
    "Get the WiFi IP address of the currently connected Android device. Useful for determining device IP after enabling wireless ADB mode.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const injectAndroidTextTool: FunctionDeclaration = {
  name: "injectAndroidText",
  description:
    "Inject text into the current Android input field. Can use direct input (character-by-character) or clipboard method (instant paste). For long text or code snippets, use clipboard method (useClipboard=true) for better performance. This is an enhanced version of controlMobileDevice TEXT action with clipboard support.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      text: {
        type: Type.STRING,
        description: "Text to inject into the Android device.",
      },
      useClipboard: {
        type: Type.BOOLEAN,
        description:
          "If true, sets clipboard first then pastes (faster for long text). If false, uses direct character input (original method).",
      },
    },
    required: ["text"],
  },
};

export const installAndroidAPKTool: FunctionDeclaration = {
  name: "installAndroidAPK",
  description:
    "Install an APK file on the connected Android device via ADB. Can install from local file path or download from URL. Useful for installing payloads, tools, or legitimate apps. Supports replacing existing apps.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      apkPath: {
        type: Type.STRING,
        description: "Path to APK file (local path or HTTP/HTTPS URL).",
      },
      packageName: {
        type: Type.STRING,
        description:
          "Optional: Package name (will be extracted from APK if not provided).",
      },
      replace: {
        type: Type.BOOLEAN,
        description:
          "If true, replace existing app if already installed (default false).",
      },
    },
    required: ["apkPath"],
  },
};

export const launchAndroidIntentTool: FunctionDeclaration = {
  name: "launchAndroidIntent",
  description:
    'Launch an Android app or activity using Intent injection (deep links). This allows LUCA to "teleport" directly to specific app screens without multi-step navigation. Much faster than manually tapping through UI. Examples: Open Maps to a location (geo:0,0?q=New+York), open dialer with number (tel:123456), launch app directly, or open specific activity.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        description:
          'Intent action (e.g., "android.intent.action.VIEW", "android.intent.action.DIAL", "android.intent.action.SEND").',
      },
      data: {
        type: Type.STRING,
        description:
          'Intent data URI (e.g., "geo:0,0?q=New+York" for Maps, "tel:1234567890" for dialer, "https://example.com" for browser).',
      },
      component: {
        type: Type.STRING,
        description:
          'Full component name (e.g., "com.android.settings/.Settings$DisplaySettingsActivity").',
      },
      package: {
        type: Type.STRING,
        description:
          'Package name (e.g., "com.whatsapp"). If activity is also provided, will launch specific activity.',
      },
      activity: {
        type: Type.STRING,
        description:
          'Activity name (e.g., "Main", "Settings"). Must be used with package parameter.',
      },
      extras: {
        type: Type.OBJECT,
        description:
          "Additional intent extras as key-value pairs (strings, numbers, or booleans).",
      },
    },
  },
};

export const pairAndroidDeviceTool: FunctionDeclaration = {
  name: "pairAndroidDevice",
  description:
    "Pair with an Android device wirelessly using ADB pairing (Android 11+). This allows wireless connection without initial USB connection. Can initiate pairing (device shows code) or complete pairing with code.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      ip: {
        type: Type.STRING,
        description: "Target device IP address.",
      },
      port: {
        type: Type.NUMBER,
        description: "Pairing port (default 5555).",
      },
      pairingCode: {
        type: Type.STRING,
        description:
          "6-digit pairing code shown on device screen. Omit to initiate pairing and get code.",
      },
    },
    required: ["ip"],
  },
};

export const readAndroidNotificationsTool: FunctionDeclaration = {
  name: "readAndroidNotifications",
  description:
    "Read all active notifications from the Android notification center. This allows LUCA to intercept 2FA codes, read incoming messages from any app (WhatsApp, Telegram, SMS, System), and see notification details without needing to visually inspect the lock screen. Returns a list of notifications with package name, title, text, ticker, and timestamp.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const getLocationTool: FunctionDeclaration = {
  name: "getLocation",
  description:
    "Get the current physical GPS coordinates (latitude, longitude) of the mobile device. Requires user permission on the device. Useful for mapping, local weather, or location-based reminders.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const readAndroidFileTool: FunctionDeclaration = {
  name: "readAndroidFile",
  description:
    "Read the contents of a file from the connected Android device. Returns the file content as text or base64. Use this to retrieve documents or data from the phone to the desktop.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      filePath: {
        type: Type.STRING,
        description: "Full path to the file on the Android device.",
      },
    },
    required: ["filePath"],
  },
};

export const writeAndroidFileTool: FunctionDeclaration = {
  name: "writeAndroidFile",
  description:
    "Write text or base64 content to a file on the connected Android device. Use this to send documents or data from the desktop to the phone.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      filePath: {
        type: Type.STRING,
        description:
          "Full path where the file should be saved on the Android device.",
      },
      content: {
        type: Type.STRING,
        description: "Content to write to the file.",
      },
      isBase64: {
        type: Type.BOOLEAN,
        description: "Set to true if content is a base64 string.",
      },
    },
    required: ["filePath", "content"],
  },
};

export const makeCallTool: FunctionDeclaration = {
  name: "makeCall",
  description:
    "Initiate a phone call to a specific number using the mobile device's native dialer. Opens the phone app pre-filled with the number.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      phoneNumber: {
        type: Type.STRING,
        description: "The phone number to call.",
      },
    },
    required: ["phoneNumber"],
  },
};

export const scanAndroidDevicesTool: FunctionDeclaration = {
  name: "scanAndroidDevices",
  description:
    "Scan local network for Android devices with ADB enabled. Discovers devices with ADB debugging enabled on the network. Useful for finding vulnerable targets or discovering devices on the local network. Set autoConnect=true to automatically connect to the first found device.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      network: {
        type: Type.STRING,
        description:
          'Network CIDR to scan (e.g., "192.168.1.0/24"). Default: "192.168.1.0/24".',
      },
      port: {
        type: Type.NUMBER,
        description: "ADB port to scan (default 5555).",
      },
      timeout: {
        type: Type.NUMBER,
        description: "Timeout per host in milliseconds (default 2000).",
      },
      useNmap: {
        type: Type.BOOLEAN,
        description:
          "Use nmap for faster scanning if available (default false, uses ADB connect method).",
      },
      autoConnect: {
        type: Type.BOOLEAN,
        description:
          "If true, automatically connect to the first device found (default false).",
      },
    },
  },
};

export const setAndroidClipboardTool: FunctionDeclaration = {
  name: "setAndroidClipboard",
  description:
    "Set the Android clipboard content. This allows instant pasting of long text, code snippets, or paragraphs into Android text fields, which is much faster than character-by-character typing. Use this before injecting text with useClipboard option.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      text: {
        type: Type.STRING,
        description: "Text content to set in the clipboard.",
      },
    },
    required: ["text"],
  },
};

export const uninstallAndroidAPKTool: FunctionDeclaration = {
  name: "uninstallAndroidAPK",
  description:
    "Uninstall an APK from the connected Android device by package name.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      packageName: {
        type: Type.STRING,
        description: 'Package name to uninstall (e.g., "com.example.app").',
      },
      keepData: {
        type: Type.BOOLEAN,
        description: "If true, keep app data and cache (default false).",
      },
    },
    required: ["packageName"],
  },
};

export const controlAndroidAgentTool: FunctionDeclaration = {
  name: "controlAndroidAgent",
  description:
    "Control Android devices wirelessly through Luca Link. Use this for HIGH-LEVEL goals on a mobile device (e.g., 'Send a WhatsApp to Mom', 'Check settings', 'Open Spotify'). This tool runs a smart loop that sees the screen and interacts automatically. Works wirelessly via Luca Link (recommended) or USB/ADB (fallback). PREFER THIS over raw ADB commands.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      goal: {
        type: Type.STRING,
        description:
          "The natural language goal for the agent (e.g., 'Open Settings and turn on Dark Mode')",
      },
      strategy: {
        type: Type.STRING,
        enum: ["WIRELESS", "ACCURACY"],
        description:
          "Strategy to use: 'WIRELESS' (default, recommended) uses Luca Link for wireless remote control. 'ACCURACY' uses XML/ADB for precision but requires USB connection.",
      },
    },
    required: ["goal"],
  },
};
