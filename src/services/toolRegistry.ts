import { FunctionDeclaration } from "@google/generative-ai";
import { eventBus } from "./eventBus";
import { nativeControl } from "./nativeControlService";
import { computerService } from "./computerService";
import { ServerToolDispatcher } from "../tools/handlers/ServerToolDispatcher";
import { UITools } from "../tools/handlers/UITools";
import { dispatchInlineTools, dispatchSystemTools } from "../tools/handlers/inlineToolHandlers";
import { onvifCameraHandler } from "./substrateHandlers/OnvifCameraHandler";
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
  GENERAL = "GENERAL MISSION",
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
  execute_script: {
    level: SecurityLevel.LEVEL_1,
    scope: MissionScope.SYSTEM,
    isConcurrencySafe: false,
  },
  init_luca_workspace: {
    level: SecurityLevel.LEVEL_1,
    scope: MissionScope.SYSTEM,
    isConcurrencySafe: true,
  },
  start_messaging_gateway: {
    level: SecurityLevel.LEVEL_1,
    scope: MissionScope.SYSTEM,
    isConcurrencySafe: true,
  },
  export_fine_tuning_dataset: {
    level: SecurityLevel.LEVEL_1,
    scope: MissionScope.SYSTEM,
    isConcurrencySafe: true,
  },
  run_sandboxed_command: {
    level: SecurityLevel.LEVEL_2,
    scope: MissionScope.SYSTEM,
    isConcurrencySafe: true,
  },
  curate_luca_skills: {
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

/**
 * Per-category security FLOOR for tools that have no explicit TOOL_CONFIGS
 * entry. An explicit entry always wins (in both directions); this only sets a
 * minimum for tools that would otherwise silently register at LEVEL_0.
 *
 * Deliberately narrow. Only categories that are unambiguously sensitive AND are
 * never the fallthrough default get a floor — a tool lands in one of these
 * because its name or provider actually says "hacking / crypto / messaging",
 * not by omission. SYSTEM is intentionally absent: the bulk registrar defaults
 * every unmatched tool to SYSTEM (toolInitialization.ts), so it is a dumping
 * ground rather than a danger signal, and its genuinely dangerous members
 * (run_terminal, wipeMemory, update_luca_settings, ...) are already listed
 * explicitly above. Flooring SYSTEM would train the operator to wave prompts
 * through — the opposite of protection.
 *
 * The point is defense in depth: a new offensive-security, financial, or
 * messaging tool can never reach the model ungated just because nobody
 * remembered to add a TOOL_CONFIGS row for it.
 */
export const CATEGORY_SECURITY_FLOOR: Partial<
  Record<ToolCategory, { level: SecurityLevel; scope: MissionScope }>
> = {
  HACKING: { level: SecurityLevel.LEVEL_2, scope: MissionScope.SYSTEM },
  CRYPTO: { level: SecurityLevel.LEVEL_1, scope: MissionScope.FINANCE },
  WHATSAPP: { level: SecurityLevel.LEVEL_1, scope: MissionScope.SOCIAL },
};

export const ToolRegistry = {
  register: (
    tool: FunctionDeclaration,
    category: ToolCategory,
    keywords: string[] = [],
    handler?: (args: any, context: any) => Promise<string>,
  ) => {
    // 🏷️ DEFINE SECURITY LEVELS & MISSION SCOPES BY TOOL NAME
    // Precedence: explicit per-tool TOOL_CONFIGS wins; otherwise a dangerous
    // category applies a floor (CATEGORY_SECURITY_FLOOR); otherwise LEVEL_0.
    // `??` not `||` so an explicit LEVEL_0 (0) is honoured rather than falling
    // through as falsy.
    const securityConfig = tool.name ? TOOL_CONFIGS[tool.name] : undefined;
    const categoryFloor = CATEGORY_SECURITY_FLOOR[category];

    const securityLevel =
      securityConfig?.level ?? categoryFloor?.level ?? SecurityLevel.LEVEL_0;
    const missionScope =
      securityConfig?.scope ?? categoryFloor?.scope ?? MissionScope.NONE;
    const isConcurrencySafe = securityConfig?.isConcurrencySafe ?? false;
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
    // Relay / assist tools extracted to inlineToolHandlers.ts. Returns null for
    // names it does not handle, so control flow continues unchanged.
    {
      const inlineResult = await dispatchInlineTools(name, args, context);
      if (inlineResult !== null) return inlineResult;
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
    // System / settings tools extracted to inlineToolHandlers.ts. Runs AFTER the
    // ServerToolDispatcher check (unchanged) and returns null for unhandled names.
    {
      const systemResult = await dispatchSystemTools(name, args, context);
      if (systemResult !== null) return systemResult;
    }

      return `ERROR: Unknown Tool "${name}".`;
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      eventBus.emit("tool:failure", { tool: name, error: errorMessage });
      return `❌ TOOL_ERROR [${name}]: ${errorMessage}`;
    }
  },
};
