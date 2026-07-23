/**
 * Channel Session Router
 * Maps external channel chat/user IDs (Telegram, Discord, Webhooks)
 * to active LucaOS Desktop Socket.io sessions.
 */

export class ChannelSessionRouter {
  constructor() {
    // Map: channelKey -> { channel, chatId, desktopDeviceId, missionId, lastActive }
    this.sessions = new Map();
  }

  /**
   * Generates a unique key for a channel and chat ID
   */
  makeKey(channel, chatId) {
    return `${channel.toLowerCase()}:${chatId}`;
  }

  /**
   * Registers or updates a channel session mapping to a desktop device
   */
  registerSession(channel, chatId, desktopDeviceId, missionId = null) {
    const key = this.makeKey(channel, chatId);
    const session = {
      channel,
      chatId,
      desktopDeviceId,
      missionId,
      lastActive: Date.now(),
    };
    this.sessions.set(key, session);
    console.log(`[CHANNEL_ROUTER] Registered session ${key} -> Desktop ${desktopDeviceId}`);
    return session;
  }

  /**
   * Retrieves active session mapping for a channel chat
   */
  getSession(channel, chatId) {
    const key = this.makeKey(channel, chatId);
    const session = this.sessions.get(key);
    if (session) {
      session.lastActive = Date.now();
    }
    return session || null;
  }

  /**
   * Clears inactive sessions older than specified ttlMs
   */
  pruneInactiveSessions(ttlMs = 3600000) {
    const now = Date.now();
    let pruned = 0;
    for (const [key, session] of this.sessions.entries()) {
      if (now - session.lastActive > ttlMs) {
        this.sessions.delete(key);
        pruned++;
      }
    }
    return pruned;
  }

  /**
   * Lists all active mapped channel sessions
   */
  listSessions() {
    return Array.from(this.sessions.values());
  }

  /**
   * Formats a standardized payload for external channels
   */
  formatPayload(message, options = {}) {
    return {
      text: message,
      mediaBuffer: options.mediaBuffer || null,
      mediaType: options.mediaType || "image/png",
      caption: options.caption || "",
      timestamp: Date.now(),
    };
  }
}

export const channelSessionRouter = new ChannelSessionRouter();
