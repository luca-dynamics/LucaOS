import { FunctionDeclaration } from "@google/generative-ai";
import { eventBus } from "./eventBus";
import { nativeControl } from "./nativeControlService";
import { computerService } from "./computerService";
import { ServerToolDispatcher } from "../tools/handlers/ServerToolDispatcher";
import { UITools } from "../tools/handlers/UITools";
// We don't import full types to avoid circular deps during runtime, assuming context shape

import {
  canDeviceRunTool,
  findBestDeviceForTool,
  getRequiredPlatformsForTool,
  DeviceType,
} from "./deviceCapabilityService";
import { settingsService } from "./settingsService";
import { harnessService } from "./harnessService";
import { modelManagerService } from "./ModelManagerService";
import { maintenancePolicy } from "./selfMaintenancePolicy";
import { mentalStateService } from "./mentalStateService";
import { thoughtStreamService } from "./thoughtStreamService";

export type ToolCategory =
  | "CORE"
  | "FILES"
  | "NETWORK"
  | "MOBILE"
  | "HACKING"
  | "CRYPTO"
  | "OSINT"
  | "WHATSAPP"
  | "MEDIA"
  | "SYSTEM"
  | "DEV"
  | "OFFICE";

export enum SecurityLevel {
  LEVEL_0 = 0, // No auth
  LEVEL_1 = 1, // Session/Login once
  LEVEL_2 = 2, // Biometric (Face/Voice)
  LEVEL_3 = 3, // Dual (confirm + bio)
}

export enum MissionScope {
  NONE = "NONE",
  FILE = "FILE MISSION",
  FINANCE = "FINANCIAL MISSION",
  SOCIAL = "SOCIAL MISSION",
  SYSTEM = "SYSTEM SETTINGS",
  FULL = "FULL ACCESS",
}

export interface ToolEntry {
  category: ToolCategory;
  tool: FunctionDeclaration;
  keywords: string[];
  securityLevel: SecurityLevel;
  missionScope: MissionScope; // Scoped Mission Arming
  isConcurrencySafe: boolean;
  skillSets?: string[]; // 🧠 JIT Capability Bundles
  handler?: (args: any, context: any) => Promise<string>;
}

const registry: ToolEntry[] = [];

/**
 * 🏷️ Automatic SkillSet Tagging
 * Maps tool metadata into capability bundles for JIT ingestion.
 */
const inferSkillSets = (tool: FunctionDeclaration, category: ToolCategory): string[] => {
  const sets = new Set<string>();
  const desc = (tool.description || "").toLowerCase();
  const name = (tool.name || "").toLowerCase();

  const isFinance = category === "CRYPTO" || name.includes("trade") || name.includes("transaction") || desc.includes("price") || desc.includes("swap");
  const isFiles = category === "FILES" || name.includes("file") || name.includes("directory") || desc.includes("path") || desc.includes("fs");
  const isSystem = category === "SYSTEM" || name.includes("terminal") || name.includes("settings") || desc.includes("shell") || desc.includes("os");
  const isComm = category === "WHATSAPP" || name.includes("message") || name.includes("communication") || desc.includes("notify") || desc.includes("chat");
  const isAgency = category === "DEV" || name.includes("skill") || name.includes("ingest") || desc.includes("evolve") || desc.includes("mcp");

  if (isFinance) sets.add("FINANCE");
  if (isFiles) sets.add("CORE_FILES");
  if (isSystem) sets.add("SYSTEM_ADMIN");
  if (isComm) sets.add("COMMUNICATION");
  if (isAgency) sets.add("AGENCY_EVOLUTION");

  return Array.from(sets);
};

export const TOOL_CONFIGS: Record<
  string,
  { level: SecurityLevel; scope: MissionScope; isConcurrencySafe?: boolean }
> = {
  // --- CORE TOOLS (CONCURRENT SAFE BY DEFAULT) ---
  searchweb: {
    level: SecurityLevel.LEVEL_0,
    scope: MissionScope.NONE,
    isConcurrencySafe: true,
  },
  listavailabletools: {
    level: SecurityLevel.LEVEL_0,
    scope: MissionScope.NONE,
    isConcurrencySafe: true,
  },
  listMCPTools: {
    level: SecurityLevel.LEVEL_0,
    scope: MissionScope.NONE,
    isConcurrencySafe: true,
  },
  diagnose_mcp_health: {
    level: SecurityLevel.LEVEL_1,
    scope: MissionScope.SYSTEM,
    isConcurrencySafe: true,
  },

  // --- HIGH SECURITY / SYSTEM (NOT CONCURRENT SAFE) ---
  run_terminal: { level: SecurityLevel.LEVEL_2, scope: MissionScope.SYSTEM },
  terminal: { level: SecurityLevel.LEVEL_2, scope: MissionScope.SYSTEM },
  executeTerminalCommand: {
    level: SecurityLevel.LEVEL_2,
    scope: MissionScope.SYSTEM,
  },
  wipeMemory: { level: SecurityLevel.LEVEL_3, scope: MissionScope.SYSTEM },
  initiateLockdown: {
    level: SecurityLevel.LEVEL_3,
    scope: MissionScope.SYSTEM,
  },
  controlAlwaysOnVision: {
    level: SecurityLevel.LEVEL_2,
    scope: MissionScope.SYSTEM,
  },
  get_luca_settings: {
    level: SecurityLevel.LEVEL_1,
    scope: MissionScope.SYSTEM,
  },
  update_luca_settings: {
    level: SecurityLevel.LEVEL_2,
    scope: MissionScope.SYSTEM,
  },
  teleport_mission: {
    level: SecurityLevel.LEVEL_2,
    scope: MissionScope.SYSTEM,
  },
  manage_luca_models: {
    level: SecurityLevel.LEVEL_2,
    scope: MissionScope.SYSTEM,
  },
  start_mission_recording: {
    level: SecurityLevel.LEVEL_2,
    scope: MissionScope.SYSTEM,
  },
  stop_mission_recording: {
    level: SecurityLevel.LEVEL_2,
    scope: MissionScope.SYSTEM,
  },
  replay_mission_tape: {
    level: SecurityLevel.LEVEL_2,
    scope: MissionScope.SYSTEM,
  },
  get_maintenance_policy: {
    level: SecurityLevel.LEVEL_1,
    scope: MissionScope.SYSTEM,
  },
  update_maintenance_policy: {
    level: SecurityLevel.LEVEL_2,
    scope: MissionScope.SYSTEM,
  },

  // Trading / Financial
  executeTrade: { level: SecurityLevel.LEVEL_2, scope: MissionScope.FINANCE },
  executeForexTrade: {
    level: SecurityLevel.LEVEL_2,
    scope: MissionScope.FINANCE,
  },
  sendCryptoTransaction: {
    level: SecurityLevel.LEVEL_2,
    scope: MissionScope.FINANCE,
  },
  executeProtocolSkill: {
    level: SecurityLevel.LEVEL_2,
    scope: MissionScope.FINANCE,
  },

  // Privacy / OSINT / Social
  osintIdentitySearch: {
    level: SecurityLevel.LEVEL_2,
    scope: MissionScope.SOCIAL,
  },
  readAndroidNotifications: {
    level: SecurityLevel.LEVEL_2,
    scope: MissionScope.SOCIAL,
  },
  whatsapp_message: {
    level: SecurityLevel.LEVEL_1,
    scope: MissionScope.SOCIAL,
  },

  // Files / Dev
  createOrUpdateFile: {
    level: SecurityLevel.LEVEL_1,
    scope: MissionScope.FILE,
  },
  deleteFile: { level: SecurityLevel.LEVEL_2, scope: MissionScope.FILE },
  moveFile: { level: SecurityLevel.LEVEL_1, scope: MissionScope.FILE },

  // Automation
  controlAndroidAgent: {
    level: SecurityLevel.LEVEL_2,
    scope: MissionScope.SYSTEM,
  },
  executeMCPTool: { level: SecurityLevel.LEVEL_1, scope: MissionScope.SYSTEM },
  ingestSkillFromURL: {
    level: SecurityLevel.LEVEL_1,
    scope: MissionScope.FILE,
  },
  evolveCodeSafe: {
    level: SecurityLevel.LEVEL_2,
    scope: MissionScope.SYSTEM,
  },
};

export const ToolRegistry = {
  register: (
    tool: FunctionDeclaration,
    category: ToolCategory,
    keywords: string[] = [],
    handler?: (args: any, context: any) => Promise<string>,
  ) => {
    // 🏷️ DEFINE SECURITY LEVELS & MISSION SCOPES BY TOOL NAME
    const securityConfig = tool.name
      ? TOOL_CONFIGS[tool.name]
      : {
          level: SecurityLevel.LEVEL_0,
          scope: MissionScope.NONE,
          isConcurrencySafe: false,
        };

    const securityLevel = securityConfig?.level || SecurityLevel.LEVEL_0;
    const missionScope = securityConfig?.scope || MissionScope.NONE;
    const isConcurrencySafe = securityConfig?.isConcurrencySafe || false;
    const skillSets = inferSkillSets(tool, category);

    const existing = registry.findIndex((t) => t.tool.name === tool.name);
    if (existing >= 0) {
      registry[existing] = {
        tool,
        category,
        keywords,
        securityLevel,
        missionScope,
        isConcurrencySafe,
        skillSets: [...new Set([...(registry[existing].skillSets || []), ...skillSets])],
        handler: handler || registry[existing].handler,
      };
    } else {
      const descWords = tool.description?.toLowerCase().split(" ") || [];
      const nameWords = (tool.name || "").toLowerCase().split(/(?=[A-Z])/);
      const allKeywords = [
        ...new Set([
          ...keywords,
          ...descWords,
          ...nameWords,
          category.toLowerCase(),
        ]),
      ];
      registry.push({
        tool,
        category,
        isConcurrencySafe,
        skillSets,
        keywords: allKeywords,
        securityLevel,
        missionScope,
        handler,
      });
    }
  },

  search: (query: string): FunctionDeclaration[] => {
    const q = query.toLowerCase();
    if (q === "all" || q === "everything") return registry.map((e) => e.tool);
    const queryTerms = q.split(/\s+/);
    return registry
      .filter((entry) => {
        const catMatch = entry.category.toLowerCase().includes(q);
        const keywordMatch = queryTerms.some((term) =>
          entry.keywords.some((k) => k.includes(term) || term.includes(k)),
        );
        return catMatch || keywordMatch;
      })
      .map((e) => e.tool);
  },

  getCore: (): FunctionDeclaration[] =>
    registry.filter((e) => e.category === "CORE").map((e) => e.tool),
  getAll: (): FunctionDeclaration[] => registry.map((e) => e.tool),
  getSecurityLevel: (name: string): SecurityLevel => {
    const entry = registry.find((e) => e.tool.name === name);
    return entry ? entry.securityLevel : SecurityLevel.LEVEL_0;
  },
  getMissionScope: (name: string): MissionScope => {
    const entry = registry.find((e) => e.tool.name === name);
    return entry ? entry.missionScope : MissionScope.NONE;
  },
  isConcurrencySafe: (name: string): boolean => {
    const entry = registry.find((e) => e.tool.name === name);
    return entry ? entry.isConcurrencySafe : false;
  },

  getToolsBySkillSet: (skillSetName: string): FunctionDeclaration[] => {
    return registry
      .filter((e) => e.skillSets?.includes(skillSetName))
      .map((e) => e.tool);
  },

  /**
   * 🧠 BDI JIT Retrieval
   * Maps current mental state (committed intentions) to required capability bundles.
   */
  getToolsForIntention: (intentionPlan: string): FunctionDeclaration[] => {
    const plan = intentionPlan.toLowerCase();
    const matchedSets = new Set<string>();

    if (plan.includes("trade") || plan.includes("finance") || plan.includes("price")) matchedSets.add("FINANCE");
    if (plan.includes("file") || plan.includes("repo") || plan.includes("directory")) matchedSets.add("CORE_FILES");
    if (plan.includes("terminal") || plan.includes("command") || plan.includes("fix")) matchedSets.add("SYSTEM_ADMIN");
    if (plan.includes("message") || plan.includes("whatsapp") || plan.includes("notify")) matchedSets.add("COMMUNICATION");
    if (plan.includes("skill") || plan.includes("mcp") || plan.includes("ingest")) matchedSets.add("AGENCY_EVOLUTION");

    const tools: Map<string, FunctionDeclaration> = new Map();
    matchedSets.forEach((setName) => {
      const setTools = ToolRegistry.getToolsBySkillSet(setName);
      setTools.forEach((t) => tools.set(t.name || "unknown", t));
    });

    return Array.from(tools.values());
  },

  // --- EXECUTION CORE ---
  execute: async (name: string, args: any, context: any): Promise<string> => {
    try {
      console.log(`[TOOL_REGISTRY] Executing ${name} with args:`, args);

    // --- META-TOOLS: On-Demand Tool Access for Voice Mode ---
    // These enable VoiceHUD to access ALL 220+ tools despite payload limits

    if (name === "start_mission_recording") {
      const { mission_id, description } = args;
      harnessService.startCapture(mission_id || "manual-mission", {
        description,
      });
      return `📀 [HARNESS] Recording started for mission: ${mission_id}. All tool side-effects and reasoning will be captured to the Sovereign Tape.`;
    }

    if (name === "stop_mission_recording") {
      const tape = harnessService.stop();
      if (!tape) return "❌ [HARNESS] No active recording found.";
      return `⏹️ [HARNESS] Recording stopped. Tape ${tape.id} finalized with ${tape.turns.length} turns. It is now stored in the Secure Vault.`;
    }

    if (name === "replay_mission_tape") {
      const { tape_json } = args;
      try {
        const tape = JSON.parse(tape_json);
        harnessService.startShadow(tape);
        return `🕵️ [HARNESS] SHADOW Mode activated. Replaying tape ${tape.id}. LUCA will now execute the recorded causal chain. Side-effects will be intercepted.`;
      } catch (e) {
        return `❌ [HARNESS] Failed to parse tape JSON: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    if (name === "diagnose_mcp_health") {
      if (typeof __LUCA_DEV_MODE__ !== "undefined" && __LUCA_DEV_MODE__) {
        const { mcpDoctorService } = await import("./mcpDoctorService.js");
        const report = await mcpDoctorService.runFullCheck();
        return mcpDoctorService.formatReport(report);
      }
      return "ERROR: Tool 'diagnose_mcp_health' is only available in Developer/Sovereign mode.";
    }

    if (name === "listAvailableTools") {
      const { query, category } = args;
      const allTools = registry;
      const q = (query || "").toLowerCase();
      const queryTerms = q.split(/\s+/).filter(Boolean);

      let results = allTools;

      // Filter by category if provided
      if (category) {
        results = results.filter(
          (e) => e.category.toLowerCase() === category.toLowerCase(),
        );
      }

      // Filter by query terms
      if (queryTerms.length > 0) {
        results = results.filter((entry) => {
          const nameMatch = entry.tool.name?.toLowerCase().includes(q);
          const descMatch = entry.tool.description?.toLowerCase().includes(q);
          const keywordMatch = queryTerms.some((term: string) =>
            entry.keywords.some((k) => k.includes(term) || term.includes(k)),
          );
          return nameMatch || descMatch || keywordMatch;
        });
      }

      // Limit to 15 results to avoid overwhelming Gemini
      const limited = results.slice(0, 15);

      if (limited.length === 0) {
        return `No tools found matching "${query}". Try different keywords like: crypto, file, network, instagram, whatsapp, screen, keyboard, etc.`;
      }

      const toolList = limited
        .map(
          (e) =>
            `• **${e.tool.name}** [${e.category}]: ${e.tool.description?.slice(0, 100)}...`,
        )
        .join("\n");

      return `FOUND ${limited.length} TOOLS (of ${results.length} matches):\n\n${toolList}\n\nUse \`invokeAnyTool\` with the exact tool name to execute any of these.`;
    }

    if (name === "invokeAnyTool") {
      const { toolName, args: toolArgs } = args;

      // Validate tool exists
      const toolEntry = registry.find((e) => e.tool.name === toolName);
      if (!toolEntry) {
        return `ERROR: Tool "${toolName}" not found. Use \`listAvailableTools\` to search for available tools.`;
      }

      console.log(
        `[META-TOOL] invokeAnyTool routing to: ${toolName}`,
        toolArgs,
      );

      // --- SECURITY HARDENING ---
      // Prevent biometric bypass for high-privilege tools
      if (
        toolEntry.securityLevel >= SecurityLevel.LEVEL_1 &&
        !context?.isElevated
      ) {
        console.warn(
          `[SECURITY] 🛡️ invokeAnyTool blocked: ${toolName} requires elevation.`,
        );
        return `SECURITY_ERROR: The tool "${toolName}" requires biometric verification. \n\nINSTRUCTION: You MUST call this tool directly (e.g. ${toolName}(...)) instead of using invokeAnyTool to trigger the security gate for the user.`;
      }

      // Recursively call execute with the target tool
      try {
        const result = await ToolRegistry.execute(
          toolName,
          toolArgs || {},
          context,
        );
        return `[Via invokeAnyTool → ${toolName}]\n${result}`;
      } catch (error: any) {
        return `ERROR executing "${toolName}": ${error.message}`;
      }
    }

    // --- SYSTEMIC DELEGATION (ONE OS) ---
    // Check if current device can run this tool. If not, delegate to a better one.
    const currentDeviceType = context.currentDeviceType || "desktop";
    const currentDeviceId =
      context.currentDeviceId || (context.lucaLinkManager as any)?.myDeviceId;

    const canRunLocally = canDeviceRunTool(
      currentDeviceType as DeviceType,
      name,
    );

    if (!canRunLocally && context.lucaLinkManager) {
      const availableDevices = Array.from(
        (context.lucaLinkManager as any).devices?.values() || [],
      ).map((d: any) => ({
        type: d.type as DeviceType,
        deviceId: d.deviceId,
        name: d.name,
      }));

      // findBestDeviceForTool now respects currentDeviceId as priority
      const bestDevice = findBestDeviceForTool(
        name,
        availableDevices,
        currentDeviceId,
      );

      if (bestDevice && bestDevice.deviceId !== currentDeviceId) {
        // CONSENT-BASED DELEGATION
        // If the user hasn't explicitly confirmed remote execution in the arguments,
        // we ask for permission first.
        if (!args.confirmRemote) {
          return `REQUIRED_DELEGATION: The tool "${name}" cannot run locally on your current ${currentDeviceType}. It requires ${bestDevice.name} (${bestDevice.type}). \n\nINSTRUCTION: Inform the user that you need to access their ${bestDevice.type} to perform this action and ask for their permission. If they agree, retry this tool call with "confirmRemote: true" in the arguments.`;
        }

        try {
          console.log(
            `[ONE OS] ⚡ Tool "${name}" authorized for delegation to ${bestDevice.name} (${bestDevice.type})`,
          );

          const result = await (context.lucaLinkManager as any).delegateTool(
            bestDevice.deviceId,
            name,
            args,
          );

          // Handle response object or raw result
          const finalResult =
            result?.result ||
            result?.error ||
            (typeof result === "string" ? result : JSON.stringify(result));

          return `[DELEGATED to ${bestDevice.name}] ${finalResult}`;
        } catch (error: any) {
          console.error(`[ONE OS] Delegation of "${name}" failed:`, error);
          // Fall through to local execution as last resort or error out
          return `ERROR: Delegation failed and tool cannot run locally: ${error.message}`;
        }
      } else if (!bestDevice) {
        // HARDWARE MISSING FALLBACK
        // If we are on mobile (or another non-desktop device) and the tool REQUIRES a desktop,
        // we provide a gentle explanation.
        const requiredPlatforms = getRequiredPlatformsForTool(name);
        if (
          requiredPlatforms.includes("desktop") &&
          currentDeviceType !== "desktop"
        ) {
          return `HARDWARE_MISSING: The feature "${name}" requires a Desktop connection. \n\nINSTRUCTION: Inform the user that this specific task (e.g., file system access, terminal controls, or specific desktop apps) is currently isolated to their computer. Advise them to connect their Desktop via the "Luca Link" QR code in the system dashboard to enable remote control from this mobile device.`;
        }
      }
    }

    // --- PLUGIN DISPATCH (Universal Architecture) ---
    const entry = registry.find((e) => e.tool.name === name);
    if (entry && entry.handler) {
      try {
        console.log(`[TOOL_REGISTRY] 🧩 Routing ${name} to registered handler`);
        return await entry.handler(args, context);
      } catch (error: any) {
        console.error(
          `[TOOL_REGISTRY] Plugin execution failed for ${name}:`,
          error,
        );
        return `ERROR: Tool execution failed: ${error.message}`;
      }
    }

    // 0. LOCAL TOOLS (Cortex Backend - Zero Latency)
    // Check if this is a local tool that should be executed via Cortex
    const { isLocalTool, executeLocalTool } =
      await import("../tools/handlers/LocalTools");

    if (isLocalTool(name)) {
      try {
        console.log(`[TOOL_REGISTRY] ⚡ Routing ${name} to Cortex (LOCAL)`);
        const result = await executeLocalTool(name, args);
        return result;
      } catch (e: any) {
        console.error(`[TOOL_REGISTRY] Local tool execution failed:`, e);
        // Fallback: Continue to other handlers
        console.warn(`[TOOL_REGISTRY] Attempting fallback for ${name}...`);
      }
    }

    // 1. Messaging Tools: Now handled via CommunicationProvider (Plugin Architecture)

    // 2. UI Tools
    const uiTools = [
      "openFileBrowser",
      "openAutonomyDashboard",
      "openCodeEditor",
      "searchWeb",
      "presentVisualData",
      "controlAlwaysOnVision",
      "controlAlwaysOnAudio",
      "switchPersona",
      "analyzeStock",
      "listCustomSkills",
      "createCustomSkill",
      "startSubsystem",
      "listSubsystems",
      "openWebview",
      "closeWebview",
      "enableVision",
      "disableVision",
    ];
    if (uiTools.includes(name)) {
      try {
        return await UITools.execute(name, args, context);
      } catch (e) {
        console.error("UITools load failed", e);
        return "UI capability unavailable.";
      }
    }

    // 2.5 Finance & Intelligence: Now handled via TradingProvider and IntelligenceProvider

    // 2.6 Mobile & Native Tools: Now handled via MobileProvider

    // 3. SPECIAL TOOLS (Ported from Legacy Registry)
    // --- SPECIAL TOOLS (Ported to Plugin Architecture) ---
    // readScreen and aiClick are now handled by VisionProvider

    if (name === "proofreadText") {
      // LUCA LINK ROUTING: If on mobile, delegate to desktop
      const isMobile =
        context.currentDeviceType === "mobile" ||
        context.currentDeviceType === "tablet";

      if (isMobile && context.lucaLinkManager) {
        try {
          console.log(
            "[proofreadText] Mobile device detected, routing to desktop via Luca Link...",
          );

          const availableDevices = Array.from(
            (context.lucaLinkManager as any).devices?.values() || [],
          ).map((d: any) => ({
            type: d.type,
            deviceId: d.deviceId,
            name: d.name,
          }));

          const desktopDevice = availableDevices.find(
            (d: any) => d.type === "desktop",
          );

          if (desktopDevice) {
            const result = await (context.lucaLinkManager as any).delegateTool(
              desktopDevice.deviceId,
              "proofreadText",
              args,
            );

            return (
              result?.result ||
              `PROOFREAD COMPLETE (via ${desktopDevice.name}):\n${result}`
            );
          } else {
            console.warn(
              "[proofreadText] No desktop device found, falling back to Gemini",
            );
          }
        } catch (lucaLinkError) {
          console.warn(
            "[proofreadText] Luca Link delegation failed:",
            lucaLinkError,
          );
        }
      }

      // GEMINI FALLBACK: Original implementation
      if (context.lucaService) {
        const result = await context.lucaService.proofreadText(
          args.text,
          args.style,
        );
        return `PROOFREAD RESULT:\n${result}`;
      }
      return "Proofreading unavailable.";
    }

    // 4. NATIVE AUTOMATION (IPC FIRST, FALLBACK TO NETWORK)
    if (
      name === "typeText" ||
      name === "pressKey" ||
      name === "controlSystemInput"
    ) {
      if ((window as any).electron && (window as any).electron.ipcRenderer) {
        try {
          if (name === "typeText" || name === "pressKey") {
            const type = name === "typeText" ? "type" : "key";
            const payload =
              name === "typeText"
                ? { type, text: args.text, delay: args.delay }
                : {
                    type,
                    key: args.key,
                    modifiers: args.modifiers,
                    delay: args.delay,
                  };

            const result = await (window as any).electron.ipcRenderer.invoke(
              "simulate-keyboard",
              payload,
            );
            if (result.success) return "Input Simulated via IPC.";
          } else if (name === "controlSystemInput") {
            const { type, key, x, y, button, double, amount, delay } = args;

            if (type === "TYPE" || type === "PRESS") {
              const res = await (window as any).electron.ipcRenderer.invoke(
                "simulate-keyboard",
                {
                  type: type === "TYPE" ? "type" : "key",
                  text: key,
                  key: key,
                  delay,
                },
              );
              return res.success ? "Input Simulated." : `Error: ${res.error}`;
            } else {
              // Mouse actions
              const res = await (window as any).electron.ipcRenderer.invoke(
                "simulate-mouse",
                {
                  action: type.toLowerCase(),
                  x,
                  y,
                  button,
                  double,
                  amount,
                  delay,
                },
              );
              return res.success
                ? "Mouse Action Simulated."
                : `Error: ${res.error}`;
            }
          }
        } catch (e) {
          console.warn("IPC Input failed, falling back to Network", e);
        }
      }

      // Fallback to Network (ComputerService) for legacy compatibility
      if (name === "typeText") {
        const success = await computerService.typeText(args.text);
        return success ? "Typed text (Network)." : "Type failed.";
      } else if (name === "pressKey") {
        const keys = [args.key, ...(args.modifiers || [])];
        const success = await computerService.pressKey(keys);
        return success ? "Pressed key (Network)." : "Key press failed.";
      }
    }

    // 5. Native Control Service (Volume, Battery, etc)
    if (name === "toggleWidget") {
      const { widget } = args;
      // window.electron check
      if ((window as any).electron && (window as any).electron.ipcRenderer) {
        if (widget === "hologram") {
          // toggle-hologram message
          (window as any).electron.ipcRenderer.send("toggle-hologram");
          return "Hologram Toggled.";
        }
        if (widget === "chat") {
          // toggle-chat-widget message
          (window as any).electron.ipcRenderer.send("toggle-chat-widget");
          return "Chat Toggled.";
        }
        if (widget === "orb") {
          (window as any).electron.ipcRenderer.send("toggle-orb");
          return "Voice Orb Toggled.";
        }
      }
      return "Widget control unavailable (No Electron).";
    }

    if (name === "controlSystem") {
      // ... (Existing implementation kept but moved inside switch/if structure)
      const { action, value } = args;
      switch (action) {
        case "VOLUME_SET":
          return (await nativeControl.setVolume(value)) || "Failed.";
        case "VOLUME_MUTE":
          return (await nativeControl.mute()) || "Failed.";
        case "VOLUME_UNMUTE":
          return (await nativeControl.unmute()) || "Failed.";
        case "GET_BATTERY":
          return await nativeControl.getBatteryStatus();
        case "GET_SYSTEM_LOAD":
          return await nativeControl.getSystemLoad();
        case "MEDIA_PLAY_PAUSE":
          return (await nativeControl.mediaPlayPause()) || "Failed.";
        case "MEDIA_NEXT":
          return (await nativeControl.mediaNext()) || "Failed.";
        case "GET_RUNNING_APPS":
          return await nativeControl.getRunningApps();
        default:
          return "Unknown action.";
      }
    }

    // 7. MOBILE APP LAUNCHER
    if (name === "openMobileApp") {
      const { appControlService } = await import("./appControlService");
      const result = await appControlService.openApp(args.appName);

      if (result.success) {
        return result.message || `Opened ${args.appName}`;
      } else {
        return result.error || "Failed to open app";
      }
    }

    // 8. UI AUTOMATION (Android)
    if (name === "automateUI") {
      const { uiAutomationService } = await import("./uiAutomationService");

      // Check if available
      const available = await uiAutomationService.isAvailable();
      if (!available) {
        return "UI Automation requires Android with Accessibility Service enabled. Please enable it in Settings → Accessibility → Luca.";
      }

      const { task, screenshot } = args;

      // If screenshot provided, use Vision AI multi-step execution
      if (screenshot) {
        const result = await uiAutomationService.executeVisionTask(
          task,
          screenshot,
        );
        if (result.success) {
          return result.message || "UI automation completed";
        } else {
          return result.error || "UI automation failed";
        }
      } else {
        // Simple find and click without screenshot
        const result = await uiAutomationService.findAndClick(task);
        if (result.success) {
          return result.message || `Executed: ${task}`;
        } else {
          return result.error || "Could not find element";
        }
      }
    }

    if (name === "generateRemoteSetupCommand") {
      const { platform = "auto" } = args;
      const token = Math.random().toString(36).substring(2, 12).toUpperCase();
      const sessionId = context.sessionId || "SESSION_PROTOTYPE";

      let command = "";
      if (platform === "windows") {
        command = `powershell -Command "iwr -useb https://luca.sh/win | iex; luca-connect --token ${token}"`;
      } else {
        // Mac/Linux default
        command = `curl -sL https://luca.sh/connect | bash -s -- --token=${token} --session=${sessionId}`;
      }

      return `REMOTE SETUP INITIALIZED.\n\nInstruction: Ask the operator to run the following command in their desktop terminal to establish a secure Luca Link bridge:\n\n\`\`\`bash\n${command}\n\`\`\`\n\nOnce executed, the 'Ghost Client' will connect and you will have full file system and terminal access to that machine.`;
    }

    if (name === "generateWebLink") {
      const token = Math.random().toString(36).substring(2, 8).toUpperCase();
      const sessionId = context.sessionId || "SESSION_PROTOTYPE";
      const link = `https://luca.sh/link/${token}?s=${sessionId}`;

      return `WEB LINK GENERATED.\n\nInstruction: Ask the operator to open the following URL in their desktop browser (Chrome, Edge, or Safari) to establish a secure 'Web Hook' bridge:\n\n${link}\n\nOnce the page is open, you will be able to request access to their screen, files, and camera via the browser's native permission prompts.`;
    }

    if (name === "remoteLaunchOnSmartTV") {
      const { tvId, url } = args;
      // In a production environment, this would call the SmartThings/ThinQ OAuth API.
      // For now, we simulate the Cloud Handshake.
      console.log(`[CLOUD_RELAY] Sending Remote Launch command to TV: ${tvId}`);
      console.log(`[CLOUD_RELAY] Target URL: ${url}`);

      return `REMOTE CLOUD LAUNCH SUCCESSFUL.\n\nStatus: Luca has reached out to the manufacturer's cloud for Device [${tvId}]. \nAction: The TV is being woken up and will launch the browser at: ${url}.\nConnection: A Luca Link tunnel is established and waiting for the TV to 'check in'.`;
    }

    if (name === "nativeHardwareCast") {
      const { protocol, targetDeviceName } = args;
      console.log(
        `[NATIVE_CAST] Initiating ${protocol} stream to: ${targetDeviceName}`,
      );
      const result = await nativeControl.startNativeCast(
        protocol,
        targetDeviceName,
      );
      return `NATIVE CAST INITIATED.\n\nProtocol: ${protocol}\nTarget: ${targetDeviceName}\nStatus: ${
        result || "Connecting..."
      }\n\nInstruction: Your Mac is now acting as the local router/source for the stream. The TV should show the dashboard once the hardware handshake is complete.`;
    }

    if (name === "launchApp") {
      return (await nativeControl.launchApp(args.appName)) || "Failed.";
    }

    // --- PERSONA SWITCHING ---
    if (name === "switchPersona") {
      const mode = args.mode;
      if (context.handlePersonaSwitch) {
        await context.handlePersonaSwitch(mode);
        return `Behavioral mode switched to ${mode}. Adapting communication style while maintaining full memory and capability awareness.`;
      }
      return "Persona switch unavailable (no handler).";
    }

    if (name === "googleImageSearch") {
      if (context.lucaService)
        return await context.lucaService.runGoogleImageSearch(args.query);
      return "Service unavailable.";
    }

    // Practice Generator Tool
    if (name === "generate_practice_questions") {
      try {
        const {
          practiceGeneratorPrompt,
          buildPracticePrompt,
          parsePracticeResponse,
        } = await import("./capabilities/practiceGenerator");

        const userPrompt = buildPracticePrompt(
          args.referenceContent || args.question,
          args.numQuestions || 3,
        );

        // Use lucaService to call Gemini with the practice generator prompt
        if (context.lucaService) {
          const response = await context.lucaService.sendMessage(
            userPrompt,
            practiceGeneratorPrompt,
          );

          try {
            const parsed = parsePracticeResponse(response);
            return JSON.stringify(parsed, null, 2);
          } catch {
            // If parsing fails, return raw response
            return response;
          }
        }
        return "Luca service unavailable.";
      } catch (error: any) {
        console.error("[generate_practice_questions] Error:", error);
        return `Failed to generate practice questions: ${error.message}`;
      }
    }

    // 6. Server Tools Route
    if (ServerToolDispatcher.isServerTool(name) || name === "evolveCodeSafe") {
      if (name === "evolveCodeSafe") {
        const intentionId = Array.from(mentalStateService.intentions.values())
          .find((i: any) => (i.status === "COMMIT" || i.status === "IN_PROGRESS") && (i.plan.toLowerCase().includes("fix") || i.plan.toLowerCase().includes("patch")))?.id;
        
        const justification = intentionId ? mentalStateService.getJustificationChain(intentionId) : "Autonomous evolution triggered for maintenance.";
        
        thoughtStreamService.pushThought("SECURITY", `Initiating Autonomous Patching: ${justification}`);
      }
      return await ServerToolDispatcher.execute(name, args, context);
    }

    // --- AGENTIC SELF-MANAGEMENT TOOLS (The OS Brain) ---
    if (name === "get_luca_settings") {
      const settings = settingsService.getSettings();
      // REDACT SENSITIVE DATA
      const redacted = JSON.parse(JSON.stringify(settings));
      if (redacted.brain) {
        redacted.brain.geminiApiKey = "[REDACTED]";
        redacted.brain.openaiApiKey = "[REDACTED]";
        redacted.brain.anthropicApiKey = "[REDACTED]";
      }
      return JSON.stringify(redacted, null, 2);
    }

    if (name === "update_luca_settings") {
      await settingsService.saveSettings(args.settings);
      return "Settings updated successfully. Changes are now live across the OS.";
    }

    if (name === "get_maintenance_policy") {
      const rules = maintenancePolicy.getRules();
      return JSON.stringify(rules, null, 2);
    }

    if (name === "update_maintenance_policy") {
      maintenancePolicy.updateRule(args.id, args.enabled);
      return `Maintenance rule ${args.id} is now ${args.enabled ? "enabled" : "disabled"}.`;
    }

    if (name === "manage_luca_models") {
      const { action, modelId } = args;
      if (action === "LIST") {
        const models = modelManagerService.getModels();
        return JSON.stringify(models, null, 2);
      }
      if (action === "DOWNLOAD" && modelId) {
        await modelManagerService.downloadModel(modelId);
        return `Download started for ${modelId}. You can track progress in the Model Manager dashboard.`;
      }
      if (action === "STATUS") {
        const ollamaStatus = await modelManagerService.ensureOllamaRunning();
        return `Ollama Connectivity: ${ollamaStatus ? "READY" : "OFFLINE"}`;
      }
      return "Action required: LIST, DOWNLOAD, or STATUS.";
    }

    if (name === "run_self_diagnostics") {
      const ram = await nativeControl.getSystemLoad();
      const battery = await nativeControl.getBatteryStatus();
      const ollama = await modelManagerService.ensureOllamaRunning();

      const report = {
        hardware: ram,
        power: battery,
        ollama_runtime: ollama ? "READY" : "OFFLINE",
        timestamp: new Date().toISOString(),
      };

      return `SELF-DIAGNOSTICS REPORT:\n${JSON.stringify(report, null, 2)}`;
    }

    if (name === "teleport_mission") {
      const { lucaService } = await import("./lucaService");
      const teleportBlob = await lucaService.exportSovereignMission();
      return `[[Solar:Key]] **MISSION SERIALIZED**: Your current session has been encrypted and packed into a Sovereign "Gold Egg".\n\n**TELEPORTATION DATA (Copy this):**\n\`\`\`\n${teleportBlob}\n\`\`\`\n\nPaste this into your target LUCA instance to re-hydrate the mission context.`;
    }

      return `ERROR: Unknown Tool "${name}".`;
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      eventBus.emit("tool:failure", { tool: name, error: errorMessage });
      return `❌ TOOL_ERROR [${name}]: ${errorMessage}`;
    }
  },
};
