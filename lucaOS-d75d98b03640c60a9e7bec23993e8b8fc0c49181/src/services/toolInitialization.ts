import { ToolRegistry, ToolCategory } from "./toolRegistry";
import * as ToolDefinitions from "../tools/definitions";
import { VisionProvider } from "../tools/providers/VisionProvider";
import { HackingProvider } from "../tools/providers/HackingProvider";
import { CommunicationProvider } from "../tools/providers/CommunicationProvider";
import { SystemProvider } from "../tools/providers/SystemProvider";
import { MobileProvider } from "../tools/providers/MobileProvider";
import { TradingProvider } from "../tools/providers/TradingProvider";
import { IntelligenceProvider } from "../tools/providers/IntelligenceProvider";
import { AutonomousProvider } from "../tools/providers/AutonomousProvider";
import { IoTProvider } from "../tools/providers/IoTProvider";
import { ConfigurationProvider } from "../tools/providers/ConfigurationProvider";

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
      // Determine category based on tool name if possible, or use default
      let category: ToolCategory = "CORE";

      const toolName = tool.name?.toLowerCase() || "";

      if (toolName.includes("android") || toolName.includes("mobile"))
        category = "MOBILE";
      else if (
        toolName.includes("crypto") ||
        toolName.includes("trade") ||
        toolName.includes("forex")
      )
        category = "CRYPTO";
      else if (
        toolName.includes("terminal") ||
        toolName.includes("file") ||
        toolName.includes("system")
      )
        category = "SYSTEM";
      else if (toolName.includes("osint") || toolName.includes("search"))
        category = "OSINT";
      else if (toolName.includes("whatsapp") || toolName.includes("message"))
        category = "MOBILE";

      ToolRegistry.register(tool as any, category);
      count++;
    }
  });

  // 2. Register Specialized Providers (Handlers)
  // This overwrites the "Manifest-only" registration with real execution logic
  VisionProvider.register();
  HackingProvider.register();
  CommunicationProvider.register();
  SystemProvider.register();
  MobileProvider.register();
  TradingProvider.register();
  IntelligenceProvider.register();
  AutonomousProvider.register();
  IoTProvider.register();
  ConfigurationProvider.register();

  console.log(
    `[REGISTRY] ✅ ${count} capabilities discovered and initialized.`,
  );
};
