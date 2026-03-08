import { Type, FunctionDeclaration } from "@google/genai";

export const runNmapScanTool: FunctionDeclaration = {
  name: "runNmapScan",
  description:
    "Use Nmap (Network Cartographer) to scan a target. Detects open ports, services, versions, and OS fingerprinting. Use for Recon.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      target: { type: Type.STRING, description: "Target IP or Domain." },
      scanType: {
        type: Type.STRING,
        enum: ["QUICK", "FULL", "SERVICE", "OS_DETECT"],
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
    type: Type.OBJECT,
    properties: {
      target: { type: Type.STRING, description: "Target IP." },
      module: {
        type: Type.STRING,
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
    type: Type.OBJECT,
    properties: {
      os: {
        type: Type.STRING,
        enum: ["windows", "linux", "android", "osx"],
        description: "Target Operating System.",
      },
      lhost: { type: Type.STRING, description: "Listening Host IP (Your IP)." },
      lport: { type: Type.NUMBER, description: "Listening Port (e.g., 4444)." },
      format: {
        type: Type.STRING,
        enum: ["exe", "elf", "apk", "raw"],
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
    type: Type.OBJECT,
    properties: {
      url: { type: Type.STRING, description: "Target URL." },
      scanMode: {
        type: Type.STRING,
        enum: ["PASSIVE", "ACTIVE"],
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
    type: Type.OBJECT,
    properties: {
      interface: {
        type: Type.STRING,
        description: "Network interface (e.g. eth0, wlan0).",
      },
      duration: {
        type: Type.NUMBER,
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
    type: Type.OBJECT,
    properties: {
      hash: { type: Type.STRING, description: "The password hash string." },
      format: {
        type: Type.STRING,
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
    type: Type.OBJECT,
    properties: {
      listenerIP: {
        type: Type.STRING,
        description: "Team Server Listener IP.",
      },
      payloadType: {
        type: Type.STRING,
        enum: ["HTTP", "DNS", "SMB"],
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
    type: Type.OBJECT,
    properties: {
      ssid: { type: Type.STRING, description: "SSID for the hotspot." },
      portalContent: {
        type: Type.STRING,
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
    type: Type.OBJECT,
    properties: {
      targetMAC: {
        type: Type.STRING,
        description: "MAC address of the target device.",
      },
      count: { type: Type.NUMBER, description: "Number of packets to send." },
    },
    required: ["targetMAC"],
  },
};

export const scanWifiDevicesTool: FunctionDeclaration = {
  name: "scanWifiDevices",
  description: "Scan for devices on the local WiFi network.",
  parameters: { type: Type.OBJECT, properties: {} },
};

export const exfiltrateDataTool: FunctionDeclaration = {
  name: "exfiltrateData",
  description: "Exfiltrate data (SMS, Call Logs) from the Android device.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        enum: ["SMS", "CALLS"],
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
    type: Type.OBJECT,
    properties: {
      template: {
        type: Type.STRING,
        enum: ["LOGIN_GENERIC", "GOOGLE", "BANK"],
        description: "The fake site template to serve.",
      },
      port: {
        type: Type.NUMBER,
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
    type: Type.OBJECT,
    properties: {
      lhost: {
        type: Type.STRING,
        description:
          "Listening Host IP (LUCA server IP). Defaults to Local IP.",
      },
      lport: {
        type: Type.NUMBER,
        description: "Listening Port. Defaults to 3001.",
      },
      fileName: { type: Type.STRING, description: "Output filename." },
    },
  },
};

export const listC2SessionsTool: FunctionDeclaration = {
  name: "listC2Sessions",
  description:
    "List all active HTTP C2 sessions (Zombies) connected to the internal listener.",
  parameters: { type: Type.OBJECT, properties: {} },
};

export const performStressTestTool: FunctionDeclaration = {
  name: "performStressTest",
  description:
    "Perform a Load/Stress Test (DoS) against a target to verify infrastructure resilience. Supports HTTP Flood, UDP Flood, and SYN Flood modes.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      target: { type: Type.STRING, description: "Target IP or URL." },
      port: { type: Type.NUMBER, description: "Target Port." },
      method: {
        type: Type.STRING,
        enum: ["HTTP_FLOOD", "UDP_FLOOD", "SYN_FLOOD"],
        description: "Attack vector.",
      },
      duration: { type: Type.NUMBER, description: "Duration in seconds." },
    },
    required: ["target", "port", "method"],
  },
};

export const runSqlInjectionScanTool: FunctionDeclaration = {
  name: "runSqlInjectionScan",
  description:
    "Execute an automated SQL Injection vulnerability scan against a target URL using custom Python fuzzing logic (L0p4 Style).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      targetUrl: {
        type: Type.STRING,
        description:
          "The target URL with query parameters (e.g. http://site.com?id=1).",
      },
      params: {
        type: Type.STRING,
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
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'Search query or country code (e.g., "webcam", "US").',
      },
      limit: { type: Type.NUMBER, description: "Number of results to return." },
    },
  },
};

export const sendC2CommandTool: FunctionDeclaration = {
  name: "sendC2Command",
  description: "Send a shell command to a specific C2 session (Zombie).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      sessionId: { type: Type.STRING, description: "The Zombie ID." },
      command: {
        type: Type.STRING,
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
    type: Type.OBJECT,
    properties: {
      targetMAC: {
        type: Type.STRING,
        description: 'Target device MAC address (e.g., "aa:bb:cc:dd:ee:ff").',
      },
      interface: {
        type: Type.STRING,
        description: 'Network interface (default: "wlan0").',
      },
      count: {
        type: Type.NUMBER,
        description: "Number of deauth packets to send (default: 5).",
      },
    },
    required: ["targetMAC"],
  },
};
