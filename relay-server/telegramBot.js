/**
 * Telegram Bot Gateway
 * Connects Telegram messaging to LucaOS Desktop & BDI Engine
 */

import { channelSessionRouter } from "./channelSessionRouter.js";

export class TelegramBotGateway {
  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN || null;
    this.botName = "LucaOS_Bot";
    this.isInitialized = false;
    this.ioServer = null;
    this.devicesMap = null;
  }

  /**
   * Initializes the Telegram gateway adapter
   */
  initialize(ioServer, devicesMap) {
    this.ioServer = ioServer;
    this.devicesMap = devicesMap;
    if (!this.token) {
      console.log("[TELEGRAM_GATEWAY] No TELEGRAM_BOT_TOKEN provided. Gateway disabled.");
      return false;
    }
    this.isInitialized = true;
    console.log("[TELEGRAM_GATEWAY] Initialized for LucaOS Relay Hub");
    return true;
  }

  /**
   * Processes incoming Telegram webhook or polling update
   */
  async handleUpdate(update) {
    if (!update || !update.message) return null;

    const message = update.message;
    const chatId = String(message.chat.id);
    const text = message.text || message.caption || "";
    const sender = message.from ? (message.from.username || message.from.first_name) : "User";

    console.log(`[TELEGRAM_GATEWAY] Received message from ${sender} (${chatId}): "${text}"`);

    // Auto-discover target desktop device ID from active connected devices
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
      channelSessionRouter.registerSession("telegram", chatId, targetDeviceId);
    }

    // Command handling: /screen or /desktop
    if (text.startsWith("/screen") || text.startsWith("/desktop")) {
      return {
        action: "capture_screen",
        chatId,
        text: `[LucaOS] Capturing host desktop screen for ${sender}...`,
        targetDeviceId,
      };
    }

    // Default prompt forwarding payload
    return {
      action: "forward_prompt",
      chatId,
      text,
      sender,
      targetDeviceId,
    };
  }

  /**
   * Sends text reply to Telegram chat via Telegram Bot API
   */
  async sendText(chatId, text) {
    if (!this.token) return false;
    try {
      const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
      return res.ok;
    } catch (err) {
      console.error("[TELEGRAM_GATEWAY] sendText failed:", err);
      return false;
    }
  }

  /**
   * Sends photo buffer (e.g. desktop screenshot) to Telegram chat
   */
  async sendPhoto(chatId, photoBuffer, caption = "") {
    if (!this.token) return false;
    try {
      const formData = new FormData();
      formData.append("chat_id", chatId);
      formData.append("caption", caption);
      const blob = new Blob([photoBuffer], { type: "image/png" });
      formData.append("photo", blob, "screenshot.png");

      const url = `https://api.telegram.org/bot${this.token}/sendPhoto`;
      const res = await fetch(url, {
        method: "POST",
        body: formData,
      });
      return res.ok;
    } catch (err) {
      console.error("[TELEGRAM_GATEWAY] sendPhoto failed:", err);
      return false;
    }
  }
}

export const telegramBotGateway = new TelegramBotGateway();
