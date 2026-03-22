import { ToolRegistry } from "../../services/toolRegistry";
import * as Definitions from "../definitions/configuration.tools";
import { settingsService } from "../../services/settingsService";
import { diagnosticsService } from "../../services/diagnosticsService";
import { voiceCloneService } from "../../services/VoiceCloneService";
import { modelManager } from "../../services/ModelManagerService";
import { lucaLink } from "../../services/lucaLinkService";
import { initializeToolRegistry } from "../../services/toolInitialization";
import { memoryService } from "../../services/memoryService";
import { cortexUrl, apiUrl } from "../../config/api";

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

          // Sync social persistence if updated
          if (args.socialPersistence) {
            await fetch(apiUrl("/api/system/social-settings"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(args.socialPersistence),
            });
          }

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
      async () => {
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
      async () => {
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

    // 5. Apply Config from Source (file upload, pasted JSON, or URL)
    ToolRegistry.register(
      Definitions.applyConfigFromSourceTool,
      "CORE",
      ["apply", "import", "upload", "config", "settings", "file", "json", "url", "link", "paste"],
      async (args) => {
        const { configJson, configUrl, preview = false } = args;
        let parsedConfig: any = null;

        // 1. Parse from raw JSON string
        if (configJson) {
          try {
            // Handle both bare JSON and markdown code-fenced JSON
            const cleaned = configJson
              .replace(/^```[\w]*\n/, "")
              .replace(/\n```$/, "")
              .trim();
            parsedConfig = JSON.parse(cleaned);
          } catch (e: any) {
            return `ERROR: Could not parse the config JSON. Please ensure it is valid JSON. Details: ${e.message}`;
          }
        }

        // 2. Fetch from URL
        if (!parsedConfig && configUrl) {
          try {
            const response = await fetch(configUrl, {
              signal: AbortSignal.timeout(8000),
            });
            if (!response.ok) {
              return `ERROR: Failed to fetch config from URL (${response.status} ${response.statusText}). Please check the URL is accessible.`;
            }
            parsedConfig = await response.json();
          } catch (e: any) {
            return `ERROR: Could not fetch or parse config from URL. Details: ${e.message}`;
          }
        }

        if (!parsedConfig) {
          return "ERROR: No config source provided. Please provide either a JSON config string or a URL to a config file.";
        }

        // 3. Security: block API key injection
        const BLOCKED_KEYS = ["geminiApiKey", "anthropicApiKey", "openaiApiKey", "xaiApiKey", "googleApiKey", "haToken"];
        const hasBlockedKey = (obj: any, depth = 0): boolean => {
          if (depth > 4 || typeof obj !== "object" || !obj) return false;
          return Object.keys(obj).some(
            (k) => BLOCKED_KEYS.includes(k) || hasBlockedKey(obj[k], depth + 1)
          );
        };

        if (hasBlockedKey(parsedConfig)) {
          return "SECURITY: Config contains sensitive API key fields. For security, API keys must be set through the Settings panel directly. All other settings in the config were valid — please remove the key fields and try again.";
        }

        // 4. Preview mode — show diff without saving
        if (preview) {
          const current = settingsService.getSettings();
          const changes: Record<string, any> = {};
          for (const section of Object.keys(parsedConfig)) {
            if (JSON.stringify((current as any)[section]) !== JSON.stringify(parsedConfig[section])) {
              changes[section] = parsedConfig[section];
            }
          }
          return `PREVIEW (not applied yet):\n\nChanges that would be made:\n${JSON.stringify(changes, null, 2)}`;
        }

        // 5. Apply
        try {
          await settingsService.saveSettings(parsedConfig);
          const sections = Object.keys(parsedConfig).join(", ");
          return `✓ Configuration applied successfully. Updated sections: ${sections}. LUCA is adapting to the new parameters.`;
        } catch (e: any) {
          return `ERROR applying configuration: ${e.message}`;
        }
      },
    );

    // 6. Trigger Connector Auth (WhatsApp, Google, etc.)
    ToolRegistry.register(
      Definitions.triggerConnectorAuthTool,
      "CORE",
      ["auth", "connect", "link", "whatsapp", "google", "telegram", "twitter", "linkedin", "youtube", "discord"],
      async (args) => {
        const { connectorId } = args;
        const normalizedId = connectorId.toLowerCase();

        const SOCIAL_EVENTS: Record<string, string> = {
          whatsapp: "WHATSAPP_LUCA_LINK",
          telegram: "TELEGRAM_LUCA_LINK",
          twitter: "TWITTER_LUCA_LINK",
          instagram: "INSTAGRAM_LUCA_LINK",
          linkedin: "LINKEDIN_LUCA_LINK",
          youtube: "YOUTUBE_LUCA_LINK",
          discord: "DISCORD_LUCA_LINK",
          wechat: "WECHAT_LUCA_LINK",
        };

        try {
          // Handle standard OAuth-style apps (Google, Twitter)
          if (normalizedId === "google" || normalizedId === "twitter") {
            const res = await fetch(apiUrl(`/api/${normalizedId}/auth/url`));
            const data = await res.json();
            if (data.url) {
              if (typeof window !== "undefined") {
                globalThis.dispatchEvent(
                  new CustomEvent("luca:open-browser", {
                    detail: {
                      url: data.url,
                      title: `${normalizedId.charAt(0).toUpperCase() + normalizedId.slice(1)} Workspace Auth`,
                      sessionId: `${normalizedId}_auth_${Date.now()}`,
                    },
                  }),
                );
              }
              return `✓ Auth flow triggered for ${connectorId}. The Ghost Browser (Secure Link) session is opening. Please complete the login in that window.`;
            } else {
              return `ERROR: API did not return a valid auth URL for ${connectorId}.`;
            }
          }

          // Handle manual link apps (WhatsApp, Telegram, etc.)
          const eventName = SOCIAL_EVENTS[normalizedId];
          if (eventName) {
            if (typeof window !== "undefined") {
              globalThis.dispatchEvent(new CustomEvent(eventName));
            }
            return `✓ Starting LinkedIn/WhatsApp/Telegram Link session for ${connectorId}. The protocol is initiating. Please stand by for the secure bridge.`;
          }

          return `ERROR: Unsupported connector ID: ${connectorId}. Supported IDs: google, twitter, whatsapp, telegram, linkedin, youtube, discord, etc.`;
        } catch (e: any) {
          return `ERROR triggering auth for ${connectorId}: ${e.message}`;
        }
      },
    );

    // 7. Perform Tab-Specific Settings Action (Syncing, Loading, Resetting)
    ToolRegistry.register(
      Definitions.performSettingsActionTool,
      "CORE",
      ["sync", "load", "reset", "clear", "notion", "google", "obsidian", "brain", "memory"],
      async (args) => {
        const { actionId, payload = {} } = args;
        const normalizedId = actionId.toLowerCase();

        try {
          switch (normalizedId) {
            // --- GENERAL ---
            case "browser-import-session":
              if (typeof window !== "undefined") {
                globalThis.dispatchEvent(new CustomEvent("luca:browser-import-session"));
              }
              return "✓ Importing Chrome/Edge profile sessions. Ghost Browser is synchronizing authentication tokens...";
            case "browser-clear-session":
              if (typeof window !== "undefined") {
                globalThis.dispatchEvent(new CustomEvent("luca:browser-clear-session"));
              }
              return "✓ Browser sessions cleared. All temporary authentication cookies and cache have been purged.";
            case "os-link-check":
              if (typeof window !== "undefined") {
                globalThis.dispatchEvent(new CustomEvent("luca:os-link-check"));
              }
              return "✓ Running OS Link diagnostic. Checking accessibility permissions and system integration status...";
            case "os-link-grant":
              if (typeof window !== "undefined") {
                globalThis.dispatchEvent(new CustomEvent("luca:os-link-grant"));
              }
              return "✓ OS Link grant triggered. Please approve the Accessibility/Screen Recording prompt in your System Settings if it appears.";

            // --- VOICE ---
            case "voice-apply-preset": {
              const { preset } = payload;
              const currentVoice = settingsService.getSettings().voice;
              const presets: Record<string, any> = {
                performance: { ...currentVoice, provider: "native", rate: 1.0, pitch: 1.0, pacing: "Normal" },
                speedster: { ...currentVoice, provider: "deepgram", rate: 1.2, pitch: 1.0, pacing: "Fast" },
                balanced: { ...currentVoice, provider: "google", rate: 1.0, pitch: 1.0, pacing: "Normal" },
                privacy: { ...currentVoice, provider: "local-luca", rate: 1.0, pitch: 1.0, pacing: "Normal" },
              };
              if (!presets[preset]) return `ERROR: Invalid voice preset: ${preset}. Supported: performance, speedster, balanced, privacy.`;
              await settingsService.saveSettings({ voice: presets[preset] });
              return `✓ Voice preset '${preset.toUpperCase()}' applied. Recalibrating speech synthesis pipeline...`;
            }
            case "voice-calibrate-rhythm": {
              const currentVoice = settingsService.getSettings().voice;
              await settingsService.saveSettings({ voice: { ...currentVoice, pacing: payload.pacing } });
              return `✓ Voice rhythm calibrated to ${payload.pacing}. Adjusting prosody and temporal patterns.`;
            }
            case "voice-clone-delete":
              await voiceCloneService.deleteVoice(payload.voiceId);
              return `✓ Voice clone ${payload.voiceId} has been deleted from the local vault.`;
            case "voice-clone-activate": {
              const currentVoice = settingsService.getSettings().voice;
              await settingsService.saveSettings({ voice: { ...currentVoice, voiceId: payload.voiceId, provider: "local-luca" } });
              return `✓ Voice clone ${payload.voiceId} activated. LUCA is now speaking with the new speaker profile.`;
            }

            // --- DATA & MEMORY ---
            case "memory-export-json":
              if (typeof window !== "undefined") {
                globalThis.dispatchEvent(new CustomEvent("luca:memory-export-json"));
              }
              return "✓ Exporting current memory store to JSON. Prepare for download...";
            case "memory-wipe-store":
              await fetch(apiUrl("/api/memory/save"), { 
                method: "POST", 
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify([]) 
              });
              localStorage.removeItem("LUCA_LUCA_ARCHIVE_V1");
              if (typeof window !== "undefined") {
                globalThis.dispatchEvent(new CustomEvent("luca:memory-cleared"));
              }
              return "⚠ GLOBAL WIPE: All local and remote memory archives have been purged. Zero-knowledge state established.";
            case "session-reset-chat":
              if (typeof window !== "undefined") {
                globalThis.dispatchEvent(new CustomEvent("luca:session-reset-chat"));
              }
              return "✓ Chat session reset. Clearing immediate context and resetting conversation history.";
            case "memory-delete-node": {
              const memories = memoryService.getAllMemories().filter(m => m.id !== payload.nodeId);
              await fetch(apiUrl("/api/memory/save"), { 
                method: "POST", 
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(memories) 
              });
              localStorage.setItem("LUCA_LUCA_ARCHIVE_V1", JSON.stringify(memories));
              return `✓ Memory node ${payload.nodeId} deleted successfully.`;
            }

            // --- LUCA LINK ---
            case "link-pin-set":
              await fetch(cortexUrl("/api/remote-access/set-pin"), { 
                method: "POST", 
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin: payload.pin }) 
              });
              return "✓ Remote Access PIN secured. LUCA Link guest access now requires authorization.";
            case "link-pin-clear":
              await fetch(cortexUrl("/api/remote-access/clear-pin"), { method: "POST" });
              return "✓ Remote Access PIN removed. Guest access is now open.";
            case "link-guest-generate": {
              const result = await lucaLink.generateGuestSession();
              return result ? `✓ Guest link generated: ${result.guestUrl}` : "ERROR: Failed to generate guest link. Ensure Luca Link is connected to relay.";
            }
            case "link-room-create":
              await lucaLink.createRoom();
              return "✓ Luca Link room created. Standing by for mobile client connection...";
            case "link-join-token":
              await lucaLink.joinWithToken(payload.token);
              return `✓ Joining Luca Link room with token ${payload.token}...`;

            // --- MCP & SKILLS ---
            case "mcp-connect":
              await fetch(apiUrl("/api/mcp/connect"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
              });
              return `✓ Connecting to MCP server: ${payload.name}. Initializing tool discovery...`;
            case "mcp-remove":
              await fetch(apiUrl("/api/mcp/remove"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: payload.id })
              });
              return `✓ MCP server ${payload.id} removed.`;
            case "mcp-sync":
              await fetch(apiUrl("/api/mcp/sync"), { method: "POST" });
              return "✓ Re-synchronizing all MCP servers. Tool Registry is updating...";
            case "model-download":
              modelManager.downloadModel(payload.modelId);
              return `✓ Triggered download for local model: ${payload.modelId}. Progress will appear in the Brain tab.`;
            case "skills-refresh":
              await initializeToolRegistry();
              return "⚛ SKILLS REFRESH: Full reload of the LUCA Tool Registry completed. Core capabilities and MCP skills re-initialized.";

            // --- LEGACY / KNOWLEDGE ---
            case "sync-notion":
            case "sync-notion-page": {
              const pageId = payload.pageId || payload.id;
              if (!pageId) return "ERROR: Missing 'pageId' in payload for Notion sync.";
              const res = await fetch(apiUrl(`/api/knowledge/notion/sync?page_id=${pageId}`), { method: "POST" });
              const data = await res.json();
              if (typeof window !== "undefined") {
                globalThis.dispatchEvent(new CustomEvent("luca:knowledge-synced", { detail: { platform: "notion", pageId, facts: data.facts } }));
              }
              return `✓ Successfully synced Notion page: ${pageId}. Distilled ${(data.facts || []).length} insights into LUCA's memory.`;
            }
            case "load-notion-pages": {
              const res = await fetch(cortexUrl("/knowledge/notion/pages"));
              const data = await res.json();
              if (typeof window !== "undefined") {
                globalThis.dispatchEvent(new CustomEvent("luca:request-notion-load"));
              }
              return `✓ Loaded ${data.pages?.length || 0} Notion pages. Available: ${data.pages?.map((p: any) => p.title).join(", ")}`;
            }
            case "sync-google-file": {
              const fileId = payload.fileId || payload.id;
              if (!fileId) return "ERROR: Missing 'fileId' in payload for Google Drive sync.";
              const res = await fetch(apiUrl(`/api/knowledge/google/sync?file_id=${fileId}`), { method: "POST" });
              const data = await res.json();
              if (typeof window !== "undefined") {
                globalThis.dispatchEvent(new CustomEvent("luca:knowledge-synced", { detail: { platform: "google", fileId, facts: data.facts } }));
              }
              return `✓ Successfully synced Google Drive file: ${fileId}. Logged ${(data.facts || []).length} new facts.`;
            }
            case "load-google-files": {
              const res = await fetch(cortexUrl("/knowledge/google/files"));
              const data = await res.json();
              if (typeof window !== "undefined") {
                globalThis.dispatchEvent(new CustomEvent("luca:request-google-load"));
              }
              return `✓ Loaded ${data.files?.length || 0} Google Drive files. Available: ${data.files?.map((f: any) => f.title).join(", ")}`;
            }
            case "reset-all-settings":
            case "reset-to-defaults":
              await settingsService.resetToDefaults();
              if (typeof window !== "undefined") {
                globalThis.dispatchEvent(new CustomEvent("luca:settings-reset"));
              }
              return "⚛ SYSTEM RESET: All settings have been reverted to factory defaults. LUCA is recalibrating personality and core protocols.";
            case "clear-fact-memory":
              await fetch(apiUrl("/api/knowledge/clear"), { method: "POST" });
              if (typeof window !== "undefined") {
                globalThis.dispatchEvent(new CustomEvent("luca:memory-cleared"));
              }
              return "⚠ MEMORY WIPE: All learned facts and distilled knowledge have been purged from the local mind. LUCA is now in a blank-slate awareness state regarding external data.";
            
            // --- KNOWLEDGE & OBSIDIAN ---
            case "knowledge-obsidian-sync": {
              const filePath = payload.filePath || payload.id;
              if (!filePath) return "ERROR: Missing 'filePath' for Obsidian sync.";
              const res = await fetch(cortexUrl(`/knowledge/obsidian/sync?file_path=${encodeURIComponent(filePath)}`), { method: "POST" });
              const data = await res.json();
              if (typeof window !== "undefined") {
                globalThis.dispatchEvent(new CustomEvent("luca:knowledge-synced", { detail: { platform: "obsidian", filePath, facts: data.facts } }));
              }
              return `✓ Successfully synced Obsidian file: ${filePath}. Distilled ${(data.facts || []).length} insights.`;
            }
            case "knowledge-obsidian-configure": {
              if (!payload.vaultPath) return "ERROR: Missing 'vaultPath' for Obsidian configuration.";
              const res = await fetch(cortexUrl(`/knowledge/obsidian/configure?vault_path=${encodeURIComponent(payload.vaultPath)}`), { method: "POST" });
              return (await res.json()).status === "success" ? `✓ Obsidian vault configured at: ${payload.vaultPath}` : "ERROR: Failed to configure Obsidian vault.";
            }
            case "knowledge-obsidian-load": {
              const res = await fetch(cortexUrl("/knowledge/obsidian/files"));
              const data = await res.json();
              if (typeof window !== "undefined") {
                globalThis.dispatchEvent(new CustomEvent("luca:request-obsidian-load"));
              }
              return `✓ Loaded ${data.files?.length || 0} Obsidian files. Available: ${data.files?.map((f: any) => f.title).join(", ")}`;
            }
            case "knowledge-import":
              if (typeof window !== "undefined") {
                globalThis.dispatchEvent(new CustomEvent("luca:knowledge-import", { detail: payload }));
              }
              return `✓ Triggering ${payload.platform || "generic"} intelligence ingestion. LUCA is ready for the data payload.`;
            case "connector-auth-start":
              // Redirect to triggerConnectorAuth tool logic via internal call or re-implementation
              // For simplicity, we just trigger the auth tool's event logic here if needed, 
              // but normally the LLM should just call triggerConnectorAuth directly.
              return "✓ Please use the 'triggerConnectorAuth' tool to initiate account linking flows.";

            default:
              return `ERROR: Unsupported action ID: ${actionId}. Check tool documentation for supported actions.`;
          }
        } catch (e: any) {
          return `ERROR performing action ${actionId}: ${e.message}`;
        }
      },
    );
  },
};


