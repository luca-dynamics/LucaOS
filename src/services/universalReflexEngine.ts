import { loggerService } from "./loggerService";

/**
 * UNIVERSAL REFLEX ENGINE (The Hands)
 * Responsible for autonomous diagnosis and remediation proposals.
 * Part of the Sovereign AGI Kernel (Developer-Partner Edition).
 */
export class UniversalReflexEngine {
  private static instance: UniversalReflexEngine;

  private constructor() {}

  public static getInstance(): UniversalReflexEngine {
    if (!UniversalReflexEngine.instance) {
      UniversalReflexEngine.instance = new UniversalReflexEngine();
    }
    return UniversalReflexEngine.instance;
  }

  /**
   * Assess a failed tool action and generate a remediation plan.
   * "Diagnosis-First" protocol.
   */
  public async diagnoseFailure(name: string, args: any, error: string): Promise<string> {
    if (typeof __LUCA_DEV_MODE__ === "undefined" || !__LUCA_DEV_MODE__) return "";

    loggerService.warn("SOVEREIGN", `Diagnosing failure: ${name}`, { error });

    // Simulate AGI reasoning to produce a remediation block.
    // In a full implementation, this could involve a recursive LLM call.
    
    let remediation = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    remediation += `[AGI_HANDS: AUTONOMOUS_REMEDIATION_PROPOSAL]\n`;
    remediation += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    remediation += `**FAILURE_ANALYSIS**: ${error}\n`;
    remediation += `**ROOT_CAUSE**: Possible file permission or existence issue in ${name}.\n`;
    remediation += `**PROPOSED_FIX**: Verify the target path and check for system-level locks.\n`;
    remediation += `**USER_ACTION**: Confirm & Apply Remediation?\n`;
    remediation += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    return remediation;
  }

  /**
   * [ZERO-CLOUD / OFFLINE SURVIVAL]
   * Classify user intent instantly without relying on a backend or LLM.
   * Now State-Aware: Uses the last system message to contextualize "Yes/No" replies.
   */
  public async classifyIntent(text: string, lastBotMessage?: string): Promise<{
    success: boolean;
    thought: string;
    tool: string | null;
    confidence: number;
    parameters?: any;
  }> {
    const input = text.toLowerCase();
    const isAffirmation = /^(yes|yeah|yep|sure|do it|go on|move on|go ahead|proceed|ok|okay)\b/.test(input);
    const lastMsgLower = (lastBotMessage || "").toLowerCase();
    
    // SCORING SYSTEM (Categorized for Zero-Cloud Tools)
    const scores: Record<string, number> = {
      // --- 1. SYSTEM & CONTROL ---
      clearChatHistory: (input.includes("clear") && (input.includes("chat") || input.includes("history"))) ? 0.95 : 0,
      restartConversation: (input.includes("restart") || input.includes("start over")) ? 0.95 : 0,
      controlSystemInput: (input.includes("type") || input.includes("click") || input.includes("press") || input.includes("move mouse")) ? 0.9 : 0,
      launchApp: (input.includes("open") || input.includes("launch") || input.includes("start")) && !input.includes("url") ? 0.8 : 0,
      closeApp: (input.includes("close") || input.includes("quit") || input.includes("kill")) && (input.includes("app") || input.includes("program")) ? 0.9 : 0,
      runSystemDiagnostics: (input.includes("diagnostic") || input.includes("system check") || input.includes("health check")) ? 0.95 : 0,
      setSystemAlertLevel: (input.includes("alert level") || input.includes("security level")) ? 0.95 : 0,
      readClipboard: (input.includes("read clipboard") || input.includes("what is in my clipboard")) ? 0.95 : 0,
      writeClipboard: (input.includes("copy to clipboard") || input.includes("write to clipboard")) ? 0.95 : 0,
      killProcess: (input.includes("kill process") || input.includes("stop process")) ? 0.95 : 0,

      // --- 2. FILE SYSTEM & PROJECTS ---
      listFiles: (input.includes("list files") || input.includes("show contents of directory") || input.includes("ls")) ? 0.95 : 0,
      readFile: (input.includes("read file") || input.includes("cat ") || input.includes("show file")) ? 0.9 : 0,
      changeDirectory: (input.includes("change directory") || input.includes("cd ") || input.includes("go to folder")) ? 0.95 : 0,
      createOrUpdateFile: (input.includes("create file") || input.includes("write file") || input.includes("save file")) ? 0.85 : 0,
      openFileBrowser: (input.includes("open browser") || input.includes("file explorer")) && input.includes("file") ? 0.95 : 0,

      // --- 3. EXECUTION & SCRIPTING ---
      runPythonScript: (input.includes("run") || input.includes("execute")) && (input.includes("script") || input.includes("python") || input.includes(".py")) ? 0.95 : 0,
      executeTerminalCommand: (input.includes("run") || input.includes("exec")) && (input.includes("command") || input.includes("terminal") || input.includes("shell") || input.includes("bash")) ? 0.95 : 0,
      openInteractiveTerminal: (input.includes("interactive terminal") || input.includes("open shell")) ? 0.95 : 0,

      // --- 4. COMMUNICATIONS (Relays) ---
      whatsappSendMessage: (input.includes("whatsapp") && input.includes("send")) ? 0.98 : 0,
      telegramSendMessage: (input.includes("telegram") && input.includes("send")) ? 0.98 : 0,
      sendInstantMessage: (input.includes("send") || input.includes("message") || input.includes("text")) && !input.includes("whatsapp") && !input.includes("telegram") ? 0.8 : 0,

      // --- 5. NETWORK & SECURITY ---
      runNmapScan: (input.includes("scan network") || input.includes("nmap") || input.includes("open ports") || input.includes("port scan")) ? 0.98 : 0,
      wifiDeauth: (input.includes("kick from wifi") || input.includes("deauth") || input.includes("disconnect user")) ? 0.98 : 0,
      scanWifiDevices: (input.includes("scan wifi") || input.includes("find networks") || input.includes("wifi scan")) ? 0.98 : 0,
      scanBluetoothSpectrum: (input.includes("bluetooth scan") || input.includes("find bluetooth") || input.includes("scan bt")) ? 0.98 : 0,
      analyzeNetworkTraffic: (input.includes("sniff") || input.includes("traffic") || input.includes("analyze network")) ? 0.9 : 0,

      // --- 6. MOBILE & ANDROID (ADB) ---
      takeAndroidScreenshot: (input.includes("phone screenshot") || input.includes("android screenshot") || input.includes("snap phone")) ? 0.98 : 0,
      listAndroidDevices: (input.includes("list devices") || input.includes("adb devices") || input.includes("show connected phones")) ? 0.98 : 0,
      sendAdbCommand: (input.includes("adb command") || input.includes("send to phone")) ? 0.9 : 0,
      tapAndroidElement: (input.includes("tap") || input.includes("touch")) && (input.includes("phone") || input.includes("android")) ? 0.9 : 0,
      installApk: (input.includes("install apk") || input.includes("sideload")) ? 0.98 : 0,

      // --- 7. MEMORY & LOCAL DB ---
      rememberFact: (input.includes("remember") || input.includes("save to memory") || input.includes("keep in mind")) ? 0.95 : 0,
      retrieveMemory: (input.includes("search memory") || input.includes("recall") || input.includes("what do you know about")) ? 0.9 : 0,
      storeCredentials: (input.includes("save password") || input.includes("store credentials")) ? 0.98 : 0,
      retrieveCredentials: (input.includes("get password") || input.includes("retrieve login")) ? 0.98 : 0,

      // --- 8. SYSTEM INFORMATION & HARDWARE CONTROL ---
      getBatteryStatus: (input.includes("battery") && (input.includes("percentage") || input.includes("level") || input.includes("status") || input.includes("charge") || input.includes("how much") || input.includes("what") || input.includes("check"))) ? 0.98 : 0,
      controlSystem: (
        (input.includes("volume") && (input.includes("set") || input.includes("change") || input.includes("increase") || input.includes("decrease") || input.match(/\d+/))) ||
        (input.includes("mute") || input.includes("unmute")) ||
        (input.includes("brightness") && (input.includes("set") || input.includes("change") || input.includes("increase") || input.includes("decrease"))) ||
        (input.includes("play") || input.includes("pause") || input.includes("next") || input.includes("previous")) && (input.includes("song") || input.includes("track") || input.includes("music"))
      ) ? 0.95 : 0,
      getSystemLoad: (input.includes("cpu") || input.includes("memory") || input.includes("ram") || input.includes("system load") || input.includes("performance")) && (input.includes("usage") || input.includes("status") || input.includes("check") || input.includes("how much")) ? 0.95 : 0,
      getScreenDimensions: (input.includes("screen") && (input.includes("size") || input.includes("resolution") || input.includes("dimensions"))) ? 0.95 : 0,
      
      // --- 9. SMART HOME & IOT ---
      controlSmartTV: (input.includes("tv")) && (input.includes("on") || input.includes("off") || input.includes("volume") || input.includes("power")) ? 0.9 : 0,
      connectSmartTV: (input.includes("connect to tv") || input.includes("pair tv")) ? 0.95 : 0,
      // NEW: Autonomous Vision via CCTV
      check_camera_footage: (input.includes("camera") || input.includes("cctv") || input.includes("footage") || input.includes("check camera") || input.includes("security camera") || input.includes("look at the camera")) ? 0.98 : 0,
      
      // NEW: Autonomous Model Repair (State-Aware Affirmation)
      pull_moondream: (input.includes("pull moondream") || input.includes("install moondream") || 
                      (isAffirmation && lastMsgLower.includes("would you like me to install it"))) ? 0.99 : 0,

      // --- 10. SETTINGS & PERSONA (ZERO-CLOUD INTERCEPT) ---
      performSettingsAction: (
        input.includes("wipe") || input.includes("export") || input.includes("reset") || 
        input.includes("sync") || input.includes("refresh") || input.includes("calibrate") ||
        (input.includes("clear") && (input.includes("memory") || input.includes("session") || input.includes("chat"))) ||
        (input.includes("grant") && input.includes("access")) ||
        (input.includes("check") && input.includes("status"))
      ) ? 0.98 : 0,

      updateSystemSettings: (
        (input.includes("set") || input.includes("change") || input.includes("switch") || input.includes("turn") || input.includes("enable") || input.includes("disable") || input.includes("toggle") || input.includes("use")) && 
        (input.includes("theme") || input.includes("persona") || input.includes("mode") || input.includes("style") || 
         input.includes("mic") || input.includes("camera") || input.includes("screen") || input.includes("privacy") ||
         input.includes("model") || input.includes("brain") || input.includes("voice") || input.includes("tone") ||
         input.includes("opacity") || input.includes("blur") || input.includes("ollama") || input.includes("sync") ||
         input.includes("boot") || input.includes("tray") || input.includes("debug") || input.includes("wake word") ||
         input.includes("always on") || input.includes("lazy mode") || input.includes("home assistant"))
      ) ? 0.98 : 0,
    };

    // Find the highest score
    const sortedTools = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [bestTool, confidence] = sortedTools[0];

    if (confidence > 0.6) {
      const parameters: any = {};
      
      // URL Extraction
      const urlMatch = input.match(/https?:\/\/[^\s]+/);
      if (urlMatch) parameters.url = urlMatch[0];

      // Recipient Extraction
      const toMatch = input.match(/to ([\w\s]+)/);
      if (toMatch && toMatch[1]) {
          parameters.recipient = toMatch[1].split(" ")[0].trim();
      }

      // Command/Text Extraction (for execution/messaging)
      if (input.includes(" \"") && input.includes("\"")) {
          const textMatch = input.match(/"([^"]+)"/);
          if (textMatch) parameters.text = textMatch[1];
          if (textMatch) parameters.command = textMatch[1];
      }

      // System Control Action Extraction
      if (bestTool === 'controlSystem') {
          if (input.includes('volume')) {
              const volumeMatch = input.match(/\d+/);
              if (volumeMatch) {
                  parameters.action = 'SET_VOLUME';
                  parameters.level = parseInt(volumeMatch[0]);
              } else if (input.includes('mute')) {
                  parameters.action = 'MUTE';
              } else if (input.includes('unmute')) {
                  parameters.action = 'UNMUTE';
              }
          } else if (input.includes('play')) parameters.action = 'PLAY';
          else if (input.includes('pause')) parameters.action = 'PAUSE';
          else if (input.includes('next')) parameters.action = 'NEXT_TRACK';
          else if (input.includes('previous') || input.includes('prev')) parameters.action = 'PREV_TRACK';
          else if (input.includes('brightness')) {
              const brightnessMatch = input.match(/\d+/);
              if (brightnessMatch) {
                  parameters.action = 'SET_BRIGHTNESS';
                  parameters.level = parseInt(brightnessMatch[0]);
              }
          }
      }

      // Settings extraction mapping skipped for brevity in local component 
      // but retained as full shell block to keep intent sync

      // Autonomous Repair Override
      if (bestTool === 'pull_moondream') {
          return {
            success: true,
            thought: `Zero-Cloud Intercept: Auto-Remediation triggered. Installing missing vision model.`,
            tool: 'executeTerminalCommand',
            confidence,
            parameters: { command: "ollama pull moondream" }
          };
      }

      // Battery Status override
      if (bestTool === 'getBatteryStatus') {
          parameters.action = 'GET_BATTERY';
          return {
            success: true,
            thought: `Zero-Cloud Intercept: Battery query mapped to controlSystem with ${(confidence * 100).toFixed(0)}% confidence.`,
            tool: 'controlSystem',
            confidence,
            parameters
          };
      }

      return {
        success: true,
        thought: `Zero-Cloud Intercept: ${bestTool} mapped with ${(confidence * 100).toFixed(0)}% confidence.`,
        tool: bestTool,
        confidence,
        parameters
      };
    }

    return {
      success: true,
      thought: "Intent requires cloud reasoning or no high-confidence local tool found.",
      tool: null,
      confidence: 0
    };
  }

  /**
   * [2050 ALIEN TECH]: Lattice Export
   * Snapshots the autonomic behavioral patterns for teleportation.
   */
  public exportLattice() {
    return {
      activeRules: [], // Autonomic ruleset socket
      learnedPatterns: [], // ML-derived pattern socket
      timestamp: Date.now(),
    };
  }
}

export const universalReflexEngine = UniversalReflexEngine.getInstance();

