import { voiceService } from "./voiceService";
import { overlayService } from "./overlayService";
import { eventBus, VisionEvent, EventPriority } from "./eventBus";
import { settingsService } from "./settingsService";

/**
 * Notification Service
 * Handles proactive notifications for Always-On Vision System
 * Supports voice (TTS), visual (toast), and text (chat) notifications
 */

// Simple sound service stub (backend doesn't need full sound service)
const soundService = {
  play: (type: string) => {
    // Backend can't play sounds, just log
    console.log(`[SOUND] Would play: ${type}`);
  },
};

export interface NotificationPreferences {
  enabled: boolean;
  voiceEnabled: boolean;
  visualEnabled: boolean;
  chatEnabled: boolean;
  tradingVoiceEnabled: boolean; // Mute trading alerts specifically
  priorityThreshold: EventPriority;
}

class NotificationService {
  private preferences: NotificationPreferences = {
    voiceEnabled: true,
    visualEnabled: true,
    chatEnabled: true,
    tradingVoiceEnabled: true,
    priorityThreshold: "MEDIUM", // Notify for MEDIUM, HIGH, and CRITICAL
    enabled: true,
  };

  private notificationHistory: any[] = [];

  constructor() {
    console.log("[NOTIFICATION] Service initialized");
    this.loadPreferences();
  }

  /**
   * Notify user about a vision event
   */
  async notify(event: VisionEvent) {
    if (!this.preferences.enabled) {
      console.log("[NOTIFICATION] Notifications disabled, skipping");
      return;
    }

    // Check priority threshold
    if (!this.shouldNotifyForPriority(event.priority)) {
      console.log(
        `[NOTIFICATION] Event priority ${event.priority} below threshold ${this.preferences.priorityThreshold}`
      );
      return;
    }

    try {
      // Voice notification (TTS)
      if (this.preferences.voiceEnabled) {
        await this.notifyVoice(event);
      }

      // Visual notification (toast)
      if (this.preferences.visualEnabled) {
        await this.notifyVisual(event);
      }

      // Chat notification (if chat enabled)
      if (this.preferences.chatEnabled) {
        await this.notifyChat(event);
      }

      // Log to history
      this.notificationHistory.push({
        event,
        timestamp: Date.now(),
        delivered: true,
      });

      // Keep history size manageable (last 50)
      if (this.notificationHistory.length > 50) {
        this.notificationHistory.shift();
      }

      console.log(`[NOTIFICATION] ✓ Notified: ${event.message}`);
    } catch (error: any) {
      console.error(
        "[NOTIFICATION] Failed to send notification:",
        error.message
      );
    }
  }

  /**
   * Voice notification using TTS
   */
  async notifyVoice(event: VisionEvent) {
    // 1. Check if trading event and if trading voice is disabled
    const isTrading = event.type === "trading" || event.type === "opportunity";
    if (isTrading && !this.preferences.tradingVoiceEnabled) {
      console.log("[NOTIFICATION] Trading voice muted, skipping TTS");
      return;
    }

    // Format message for voice
    const voiceMessage = this.formatVoiceMessage(event);

    // Use sound service for audio feedback (legacy alert)
    soundService.play("ALERT");

    console.log(`[NOTIFICATION] 🔊 Voice: ${voiceMessage}`);

    // Call TTS service
    try {
      await voiceService.speak(voiceMessage);
    } catch (e: any) {
      console.warn("[NOTIFICATION] TTS voice spoke failed:", e.message);
    }
  }

  /**
   * Visual notification (toast)
   * This would emit an event that the frontend can listen to
   */
  async notifyVisual(event: VisionEvent) {
    // Format visual notification for the event bus
    // Mapping VisionEvent to a system-notification type event
    console.log(
      `[NOTIFICATION] 📺 Visual: ${this.getNotificationTitle(event)} - ${
        event.message
      }`
    );

    // Emit event that frontend can listen to
    // Use the existing eventBus which is already connected to the UI
    eventBus.emitEvent({
      ...event,
      type: `notification:${event.type || "info"}`,
    });
  }

  /**
   * Chat notification
   * Adds a message to the conversation from LUCA
   */
  async notifyChat(event: VisionEvent) {
    if (!this.preferences.chatEnabled) return;

    // Use [TYPE] prefix for the system bubble to detect it
    const typeLabel = (event.type || event.priority || "INFO").toUpperCase();
    const chatMessage = `[${typeLabel}] ${this.formatChatMessage(event)}`;

    // Add message to the chat overlay (Mobile/Overlay)
    try {
      await overlayService.addMessage("assistant", chatMessage);
    } catch {
      // Non-blocking fail
    }

    // Emit for Desktop Chat UI
    eventBus.emit("chat:notification", {
      role: "system", // Use system role for specialized bubble
      content: chatMessage,
      type: event.type,
      priority: event.priority
    });
  }

  /**
   * Format message for voice notification
   */
  formatVoiceMessage(event: VisionEvent) {
    const prefix =
      event.priority === "CRITICAL"
        ? "Sir, urgent: "
        : event.priority === "HIGH"
        ? "Sir, "
        : "";

    return `${prefix}${event.message}`;
  }

  /**
   * Format message for chat notification
   */
  formatChatMessage(event: VisionEvent) {
    const priorityEmoji: Record<string, string> = {
      CRITICAL: "[AlertTriangle]",
      HIGH: "[AlertTriangle]",
      MEDIUM: "[Info]",
      LOW: "[Lightbulb]",
    };

    const emoji = priorityEmoji[event.priority] || "[Info]";
    let message = `${emoji} **${event.priority}**: ${event.message}`;

    const context = event.context as any;
    if (context?.actionSuggested) {
      message += `\n\n*Suggested action: ${context.actionSuggested}*`;
    }

    return message;
  }

  /**
   * Get notification title based on event type
   */
  getNotificationTitle(event: VisionEvent) {
    const titles: Record<string, string> = {
      error: "[AlertTriangle] Error Detected",
      warning: "[AlertTriangle] Warning",
      success: "[Check] Success",
      info: "[Info] Information",
      opportunity: "[Lightbulb] Opportunity",
    };

    return titles[event.type] || "Notification";
  }

  /**
   * Check if we should notify for this priority
   */
  shouldNotifyForPriority(priority: EventPriority) {
    const priorityOrder: Record<EventPriority, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    const thresholdOrder =
      priorityOrder[this.preferences.priorityThreshold] || 2;
    const eventOrder = priorityOrder[priority] || 2;

    return eventOrder >= thresholdOrder;
  }

  /**
   * Update notification preferences
   */
  updatePreferences(prefs: Partial<NotificationPreferences>) {
    this.preferences = { ...this.preferences, ...prefs };
    this.savePreferences();
    console.log("[NOTIFICATION] Preferences updated:", this.preferences);
  }

  /**
   * Get current preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Load preferences from storage (centralized settingsService)
   */
  loadPreferences() {
    try {
      // First try to load from settingsService (custom key for now as it's not in the interface)
      const allSettings = settingsService.getSettings() as any;
      if (allSettings.notifications) {
        this.preferences = {
          ...this.preferences,
          ...allSettings.notifications,
        };
        console.log("[NOTIFICATION] Preferences loaded from settingsService");
        return;
      }

      // Fallback to legacy localStorage
      if (typeof localStorage !== "undefined") {
        const saved = localStorage.getItem("luca_notification_prefs");
        if (saved) {
          this.preferences = { ...this.preferences, ...JSON.parse(saved) };
          console.log("[NOTIFICATION] Preferences loaded from localStorage");
        }
      }
    } catch {
      console.warn("[NOTIFICATION] Failed to load preferences, using defaults");
    }
  }

  /**
   * Save preferences to storage
   */
  savePreferences() {
    try {
      // Save to centralized settingsService
      settingsService.saveSettings({
        notifications: this.preferences,
      } as any);

      // Legacy fallback
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(
          "luca_notification_prefs",
          JSON.stringify(this.preferences)
        );
      }
    } catch {
      console.warn("[NOTIFICATION] Failed to save preferences");
    }
  }

  /**
   * Get notification history
   */
  getHistory(limit?: number) {
    const history = [...this.notificationHistory].reverse(); // Newest first
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Clear notification history
   */
  clearHistory() {
    this.notificationHistory = [];
    console.log("[NOTIFICATION] History cleared");
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
