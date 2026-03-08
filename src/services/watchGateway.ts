import { registerPlugin, PluginListenerHandle } from "@capacitor/core";

export interface LucaWatchPlugin {
  sendToWatch(options: { message: any }): Promise<void>;
  addListener(
    eventName: "watchMessage",
    listenerFunc: (data: any) => void,
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
}

const WatchPlugin = registerPlugin<LucaWatchPlugin>("LucaWatchPlugin");

/**
 * WatchGateway
 *
 * Orchestrates communication between the Apple Watch and the L.U.C.A. Core.
 */
class WatchGateway {
  private listener: PluginListenerHandle | null = null;

  async init() {
    try {
      this.listener = await WatchPlugin.addListener("watchMessage", (data) => {
        console.log("[WatchGateway] Received from Watch:", data);
        this.handleWatchCommand(data);
      });
      console.log("[WatchGateway] Native bridge initialized");
    } catch (e) {
      console.warn(
        "[WatchGateway] Failed to initialize native bridge (probably not on iOS)",
        e,
      );
    }
  }

  /**
   * Send UI state or notifications to the watch face
   */
  async updateWatchState(state: any) {
    try {
      await WatchPlugin.sendToWatch({ message: state });
    } catch {
      // Silent fail if no watch connected
    }
  }

  /**
   * Handle commands coming FROM the watch
   */
  private handleWatchCommand(data: any) {
    const { command, payload } = data;

    switch (command) {
      case "START_VOICE":
        // Trigger voice mode on the phone/desktop
        window.dispatchEvent(
          new CustomEvent("luca:trigger-voice", {
            detail: { source: "watch" },
          }),
        );
        break;
      case "STOP_VOICE":
        window.dispatchEvent(
          new CustomEvent("luca:stop-voice", { detail: { source: "watch" } }),
        );
        break;
      case "SWITCH_PERSONA":
        window.dispatchEvent(
          new CustomEvent("luca:switch-persona", {
            detail: { persona: payload?.persona },
          }),
        );
        break;
      default:
        console.warn("[WatchGateway] Unknown command:", command);
    }
  }
}

export const watchGateway = new WatchGateway();
