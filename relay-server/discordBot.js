/**
 * Discord Bot Gateway
 * Connects Discord slash commands and thread channels to LucaOS Desktop & BDI Engine
 */

import { channelSessionRouter } from "./channelSessionRouter.js";

export class DiscordBotGateway {
  constructor() {
    this.token = process.env.DISCORD_BOT_TOKEN || null;
    this.isInitialized = false;
    this.devicesMap = null;
  }

  /**
   * Initializes the Discord gateway adapter
   */
  initialize(ioServer, devicesMap) {
    this.devicesMap = devicesMap;
    if (!this.token) {
      console.log("[DISCORD_GATEWAY] No DISCORD_BOT_TOKEN provided. Gateway disabled.");
      return false;
    }
    this.isInitialized = true;
    console.log("[DISCORD_GATEWAY] Initialized for LucaOS Relay Hub");
    return true;
  }

  /**
   * Processes incoming Discord Interaction or Message event
   */
  async handleInteraction(event) {
    if (!event) return null;

    const channelId = String(event.channel_id || event.channelId || "default");
    const command = event.data?.name || event.command || "";
    const user = event.member?.user?.username || event.user || "DiscordUser";

    console.log(`[DISCORD_GATEWAY] Interaction received from ${user} (${channelId}): command="${command}"`);

    let targetDeviceId = null;
    if (this.devicesMap) {
      for (const [id, dev] of this.devicesMap.entries()) {
        if (dev.type === "desktop" || id.includes("desktop")) {
          targetDeviceId = id;
          break;
        }
      }
    }

    if (targetDeviceId) {
      channelSessionRouter.registerSession("discord", channelId, targetDeviceId);
    }

    if (command === "screen" || command === "desktop") {
      return {
        action: "capture_screen",
        channelId,
        text: `[LucaOS] Capturing host desktop screen for ${user}...`,
        targetDeviceId,
      };
    }

    return {
      action: "forward_prompt",
      channelId,
      text: event.data?.options?.[0]?.value || command,
      user,
      targetDeviceId,
    };
  }
}

export const discordBotGateway = new DiscordBotGateway();
