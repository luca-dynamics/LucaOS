import { SchemaType, FunctionDeclaration } from "@google/generative-ai";

export const runNmapScanTool: FunctionDeclaration = {
  name: "runNmapScan",
  description:
    "Use Nmap (Network Cartographer) to scan a target. Detects open ports, services, versions, and OS fingerprinting. Use for Recon.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      target: { type: SchemaType.STRING, description: "Target IP or Domain." },
      scanType: {
        type: SchemaType.STRING,
        enum: ["QUICK", "FULL", "SERVICE", "OS_DETECT"], format: "enum",
        description: "Type of scan execution.",
      },
    },
    required: ["target", "scanType"],
  },
};

export const runMetasploitExploitTool: FunctionDeclaration = {
  name: "runMetasploitExploit",
  description:
    "Use Metasploit Framework to verify a known vulnerability or simulate an exploit payload against a target.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      target: { type: SchemaType.STRING, description: "Target IP." },
      module: {
        type: SchemaType.STRING,
        description:
          "Metasploit module path (e.g. exploit/windows/smb/ms17_010_eternalblue).",
      },
    },
    required: ["target", "module"],
  },
};

export const generatePayloadTool: FunctionDeclaration = {
  name: "generatePayload",
  description:
    "Generate a payload (shellcode/binary) using msfvenom (or simulation). Create payloads like reverse shells or meterpreter sessions for authorized testing.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      os: {
        type: SchemaType.STRING,
        enum: ["windows", "linux", "android", "osx"], format: "enum",
        description: "Target Operating System.",
      },
      lhost: { type: SchemaType.STRING, description: "Listening Host IP (Your IP)." },
      lport: { type: SchemaType.NUMBER, description: "Listening Port (e.g., 4444)." },
      format: {
        type: SchemaType.STRING,
        enum: ["exe", "elf", "apk", "raw"], format: "enum",
        description: "Output format.",
      },
    },
    required: ["os", "lhost", "lport"],
  },
};

export const runBurpSuiteTool: FunctionDeclaration = {
  name: "runBurpSuite",
  description:
    "Initiate a Web Vulnerability Scan using Burp Suite integration (or simulated web spider). Detects SQLi, XSS, CSRF.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      url: { type: SchemaType.STRING, description: "Target URL." },
      scanMode: {
        type: SchemaType.STRING,
        enum: ["PASSIVE", "ACTIVE"], format: "enum",
        description: "Scan intrusiveness.",
      },
    },
    required: ["url"],
  },
};

export const runWiresharkTool: FunctionDeclaration = {
  name: "runWiresharkCapture",
  description:
    "Start a Network Packet Capture using Wireshark/TShark. Analyzes traffic for anomalies or credentials.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      interface: {
        type: SchemaType.STRING,
        description: "Network interface (e.g. eth0, wlan0).",
      },
      duration: {
        type: SchemaType.NUMBER,
        description: "Capture duration in seconds.",
      },
    },
    required: ["duration"],
  },
};

export const runJohnRipperTool: FunctionDeclaration = {
  name: "runJohnRipper",
  description:
    "Use John the Ripper to test password strength by attempting to crack a hash string.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      hash: { type: SchemaType.STRING, description: "The password hash string." },
      format: {
        type: SchemaType.STRING,
        description: "Hash format (e.g. md5, sha256).",
      },
    },
    required: ["hash"],
  },
};

export const runCobaltStrikeTool: FunctionDeclaration = {
  name: "runCobaltStrike",
  description:
    "Deploy a simulated Cobalt Strike Beacon for Adversary Emulation drills. Red Team operation.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      listenerIP: {
        type: SchemaType.STRING,
        description: "Team Server Listener IP.",
      },
      payloadType: {
        type: SchemaType.STRING,
        enum: ["HTTP", "DNS", "SMB"], format: "enum",
        description: "Beacon communication protocol.",
      },
    },
    required: ["listenerIP"],
  },
};

export const deployCaptivePortalTool: FunctionDeclaration = {
  name: "deployCaptivePortal",
  description: "Deploy a captive portal hotspot for mobile hacking.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      ssid: { type: SchemaType.STRING, description: "SSID for the hotspot." },
      portalContent: {
        type: SchemaType.STRING,
        description: "HTML content for the portal.",
      },
    },
    required: ["ssid"],
  },
};

export const wifiDeauthTool: FunctionDeclaration = {
  name: "wifiDeauth",
  description: "Perform a WiFi deauthentication attack.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      targetMAC: {
        type: SchemaType.STRING,
        description: "MAC address of the target device.",
      },
      count: { type: SchemaType.NUMBER, description: "Number of packets to send." },
    },
    required: ["targetMAC"],
  },
};

export const scanWifiDevicesTool: FunctionDeclaration = {
  name: "scanWifiDevices",
  description: "Scan for devices on the local WiFi network.",
  parameters: { type: SchemaType.OBJECT, properties: {} },
};

export const exfiltrateDataTool: FunctionDeclaration = {
  name: "exfiltrateData",
  description: "Exfiltrate data (SMS, Call Logs) from the Android device.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      type: {
        type: SchemaType.STRING,
        enum: ["SMS", "CALLS"], format: "enum",
        description: "Type of data to exfiltrate.",
      },
    },
    required: ["type"],
  },
};

export const deployPhishingKitTool: FunctionDeclaration = {
  name: "deployPhishingKit",
  description:
    "Deploy a Social Engineering Phishing Template (L0p4 Style) on a local port to capture credentials during Red Team assessments.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      template: {
        type: SchemaType.STRING,
        enum: ["LOGIN_GENERIC", "GOOGLE", "BANK"], format: "enum",
        description: "The fake site template to serve.",
      },
      port: {
        type: SchemaType.NUMBER,
        description: "Local port to host on (default 8080).",
      },
    },
    required: ["template"],
  },
};

export const generateHttpPayloadTool: FunctionDeclaration = {
  name: "generateHttpPayload",
  description:
    "Generate a custom Python HTTP Reverse Shell payload that connects back to LUCA C2 infrastructure. Returns the script content or file path.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      lhost: {
        type: SchemaType.STRING,
        description:
          "Listening Host IP (LUCA server IP). Defaults to Local IP.",
      },
      lport: {
        type: SchemaType.NUMBER,
        description: "Listening Port. Defaults to 3001.",
      },
      fileName: { type: SchemaType.STRING, description: "Output filename." },
    },
  },
};

export const listC2SessionsTool: FunctionDeclaration = {
  name: "listC2Sessions",
  description:
    "List all active HTTP C2 sessions (Zombies) connected to the internal listener.",
  parameters: { type: SchemaType.OBJECT, properties: {} },
};

export const performStressTestTool: FunctionDeclaration = {
  name: "performStressTest",
  description:
    "Perform a Load/Stress Test (DoS) against a target to verify infrastructure resilience. Supports HTTP Flood, UDP Flood, and SYN Flood modes.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      target: { type: SchemaType.STRING, description: "Target IP or URL." },
      port: { type: SchemaType.NUMBER, description: "Target Port." },
      method: {
        type: SchemaType.STRING,
        enum: ["HTTP_FLOOD", "UDP_FLOOD", "SYN_FLOOD"], format: "enum",
        description: "Attack vector.",
      },
      duration: { type: SchemaType.NUMBER, description: "Duration in seconds." },
    },
    required: ["target", "port", "method"],
  },
};

export const runSqlInjectionScanTool: FunctionDeclaration = {
  name: "runSqlInjectionScan",
  description:
    "Execute an automated SQL Injection vulnerability scan against a target URL using custom Python fuzzing logic (L0p4 Style).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      targetUrl: {
        type: SchemaType.STRING,
        description:
          "The target URL with query parameters (e.g. http://site.com?id=1).",
      },
      params: {
        type: SchemaType.STRING,
        description: "Specific parameters to fuzz.",
      },
    },
    required: ["targetUrl"],
  },
};

export const scanPublicCamerasTool: FunctionDeclaration = {
  name: "scanPublicCameras",
  description:
    "Scan internet-facing IP ranges or Shodan dorks for unsecured RTSP/CCTV camera feeds. Returns a list of potentially accessible streams.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: 'Search query or country code (e.g., "webcam", "US").',
      },
      limit: { type: SchemaType.NUMBER, description: "Number of results to return." },
    },
  },
};

export const sendC2CommandTool: FunctionDeclaration = {
  name: "sendC2Command",
  description: "Send a shell command to a specific C2 session (Zombie).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      sessionId: { type: SchemaType.STRING, description: "The Zombie ID." },
      command: {
        type: SchemaType.STRING,
        description: "The shell command to execute.",
      },
    },
    required: ["sessionId", "command"],
  },
};

export const wifiDeauthAttackTool: FunctionDeclaration = {
  name: "wifiDeauthAttack",
  description:
    "Launch WiFi deauthentication attack to force target device off its network. Device may then auto-connect to your malicious hotspot. Requires aircrack-ng suite and monitor mode. Use scanWiFiDevices first to get target MAC address.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      targetMAC: {
        type: SchemaType.STRING,
        description: 'Target device MAC address (e.g., "aa:bb:cc:dd:ee:ff").',
      },
      interface: {
        type: SchemaType.STRING,
        description: 'Network interface (default: "wlan0").',
      },
      count: {
        type: SchemaType.NUMBER,
        description: "Number of deauth packets to send (default: 5).",
      },
    },
    required: ["targetMAC"],
  },
};
