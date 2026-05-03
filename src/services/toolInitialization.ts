import { ToolRegistry, ToolCategory } from "./toolRegistry";
import * as ToolDefinitions from "../tools/definitions";
import {
  TOOL_PROVIDER_REGISTRY,
  canRegisterToolProvider,
} from "../tools/providerSurfaceRegistry";

/**
 * Universal Tool Initializer
 * Automatically registers all modular tool definitions into the central registry.
 * This is the "Boot Sequence" for LUCA's capabilities.
 */
export const initializeToolRegistry = () => {
  console.log(`[REGISTRY] 🚀 Initializing Universal Capability Registry...`);

  let count = 0;

  // 1. Bulk Register Manifests from modular definitions
  // We iterate over the exported tools from the index.
  Object.values(ToolDefinitions).forEach((tool) => {
    if (typeof tool === "object" && "name" in tool && "description" in tool) {
      // --- DYNAMIC TOOL SELECTION SYSTEM (GEMINI OPTIMIZATION) ---
      // Distinguish between CORE (Permanent Reflexes) and DISCOVERABLE (Registry Skills)
      let category: ToolCategory = "SYSTEM"; // Default to SYSTEM instead of CORE

      const toolName = tool.name?.toLowerCase() || "";

      // 1. WHITELIST CORE TOOLS (The "Nerve Center")
      // These are ALWAYS loaded into the LLM context (High-Frequency)
      const CORE_WHITELIST = [
        "searchweb",
        "getsystemsettings",
        "updatesystemsettings",
        "applyconfigfromsource",
        "triggerconnectorauth",
        "performsettingsaction",
        "invokeanytool",
        "listavailabletools",
        "retrievememory",
        "storememory",
        "readscreen",
        "aiclick",
        "captureview",
      ];

      if (CORE_WHITELIST.includes(toolName)) {
        category = "CORE";
      } else if (toolName.includes("android") || toolName.includes("mobile")) {
        category = "MOBILE";
      } else if (
        toolName.includes("crypto") ||
        toolName.includes("trade") ||
        toolName.includes("forex")
      ) {
        category = "CRYPTO";
      } else if (
        toolName.includes("whatsapp") ||
        toolName.includes("message") ||
        toolName.includes("telegram") ||
        toolName.includes("linkedin") ||
        toolName.includes("twitter") ||
        toolName.includes("instagram")
      ) {
        category = "WHATSAPP"; // Group into Communication/Social category
      } else if (
        toolName.includes("terminal") ||
        toolName.includes("file") ||
        toolName.includes("system") ||
        toolName.includes("os")
      ) {
        category = "SYSTEM";
      } else if (toolName.includes("osint") || toolName.includes("search")) {
        category = "OSINT";
      } else if (toolName.includes("code") || toolName.includes("engineer")) {
        category = "DEV";
      }

      ToolRegistry.register(tool as any, category);
      count++;
    }
  });

  // 2. Register Specialized Providers (Handlers)
  // This overwrites the "Manifest-only" registration with real execution logic.
  // P2 note: public builds now skip providers explicitly classified as hidden,
  // while curated and shared providers continue to register.
  TOOL_PROVIDER_REGISTRY.forEach((provider) => {
    if (canRegisterToolProvider(provider, { enforceBoundary: true })) {
      provider.register();
    }
  });

  console.log(
    `[REGISTRY] ✅ ${count} capabilities discovered and initialized.`,
  );
};
