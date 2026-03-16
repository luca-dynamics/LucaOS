import { ToolRegistry } from "../../services/toolRegistry";
import * as Definitions from "../definitions/configuration.tools";
import { settingsService } from "../../services/settingsService";
import { diagnosticsService } from "../../services/diagnosticsService";

export const ConfigurationProvider = {
  register: () => {
    // 1. Get Settings
    ToolRegistry.register(
      Definitions.getSystemSettingsTool,
      "SYSTEM",
      ["settings", "config", "preferences", "status"],
      async (args, context) => {
        const settings = settingsService.getSettings();

        // SECURITY: Sanitize sensitive keys before returning to LLM
        const sanitized = JSON.parse(JSON.stringify(settings));
        const sensitiveMapped = [
          { section: "brain", key: "geminiApiKey" },
          { section: "brain", key: "anthropicApiKey" },
          { section: "brain", key: "openaiApiKey" },
          { section: "brain", key: "xaiApiKey" },
          { section: "voice", key: "googleApiKey" },
          { section: "iot", key: "haToken" },
        ];

        sensitiveMapped.forEach((item) => {
          if (sanitized[item.section] && sanitized[item.section][item.key]) {
            sanitized[item.section][item.key] = "[SECURED]";
          }
        });

        // Add health status from context if available
        const healthStatus = context.biosStatus || "UNAVAILABLE";

        return JSON.stringify(
          {
            currentSettings: sanitized,
            systemHealth: healthStatus,
            timestamp: new Date().toISOString(),
          },
          null,
          2,
        );
      },
    );

    // 2. Update Settings
    ToolRegistry.register(
      Definitions.updateSystemSettingsTool,
      "SYSTEM",
      ["update", "set", "configure", "change"],
      async (args, context) => {
        const { soundService } = context;

        try {
          // Perform the update
          await settingsService.saveSettings(args);

          soundService?.play("SUCCESS");

          return "✓ System configuration updated successfully. LUCA is adapting to new parameters...";
        } catch (e: any) {
          return `ERROR updating settings: ${e.message}`;
        }
      },
    );

    // 3. Audit System
    ToolRegistry.register(
      Definitions.auditSystemTool,
      "SYSTEM",
      ["audit", "health", "check", "diagnostics"],
      async (args, context) => {
        try {
          const report = await diagnosticsService.audit();
          return JSON.stringify(report, null, 2);
        } catch (e: any) {
          return `ERROR running system audit: ${e.message}`;
        }
      },
    );

    // 4. Repair System
    ToolRegistry.register(
      Definitions.repairSystemTool,
      "SYSTEM",
      ["repair", "fix", "self-heal", "recovery"],
      async (args, context) => {
        try {
          const result = await diagnosticsService.repair();
          return JSON.stringify(
            {
              status: "SUCCESS",
              repairLog: result.log,
              finalReport: result.report,
            },
            null,
            2,
          );
        } catch (e: any) {
          return `ERROR executing self-repair protocol: ${e.message}`;
        }
      },
    );
  },
};
