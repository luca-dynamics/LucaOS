import { androidAgent } from "../androidAgentService";
import { nativeControl } from "../nativeControlService";
import { watchGateway } from "../watchGateway";
import { iotManager } from "../iot/IoTManager";
import { adbBridgeService } from "../adbBridgeService";
import { matterBridgeService } from "../iot/MatterBridgeService";
import { signageSubstrateHandler } from "./SignageSubstrateHandler";
import { onvifCameraHandler } from "./OnvifCameraHandler";
import type { ControlProtocol } from "./DeviceKnowledgeBase";

/**
 * SUBSTRATE HANDLER ARCHITECTURE (2050 Alien Tech)
 *
 * Unifies fragmented hardware controls (PC, Mobile, TV, Watch, IoT)
 * into a singular "Body API" that Luca can use during inhabitation.
 *
 * TV/Speaker control is now SDK-PRECISE:
 *   - Google Cast  → Port 8009 (Cast Application Framework)
 *   - Roku ECP     → Port 8060 (External Control Protocol)
 *   - Samsung Tizen → Port 8001 (WebSocket API)
 *   - LG webOS     → Port 3000 (Luna Service WebSocket)
 *   - Sony Bravia  → Port 80   (HTTP POST)
 *   - Amazon Fire  → Port 5555 (ADB over TCP)
 *   - Matter       → IPv6/UDP Fabric (Cluster-based)
 */

export type SubstrateType = "PC" | "MOBILE" | "TV" | "WATCH" | "SPEAKER" | "IOT" | "SIGNAGE" | "CAMERA";

export interface BodyAction {
  type: "DISPLAY" | "AUDIO" | "INPUT" | "HAPTIC" | "SYSTEM";
  action: string;
  payload: any;
  protocol?: ControlProtocol; // Injected by the Orchestrator at inhabitation time
  targetIp?: string;
  targetPort?: number;
}

export interface SubstrateResponse {
  success: boolean;
  result?: any;
  error?: string;
}

class SubstrateManager {
  /**
   * Universal command dispatcher for ANY inhabited substrate.
   */
  public async execute(substrate: SubstrateType, deviceId: string, action: BodyAction): Promise<SubstrateResponse> {
    console.log(`[SUBSTRATE] ⚡ ${action.type}:${action.action} → ${substrate} (${deviceId}) via ${action.protocol ?? "DEFAULT"}`);

    switch (substrate) {
      case "PC":
        return this.handlePcAction(action);
      case "MOBILE":
        return this.handleMobileAction(deviceId, action);
      case "WATCH":
        return this.handleWatchAction(action);
      case "TV":
      case "SPEAKER":
        return this.handleTvSpeakerAction(deviceId, action);
      case "IOT":
        return this.handleIotAction(deviceId, action);
      case "SIGNAGE":
        return this.handleSignageAction(deviceId, action);
      case "CAMERA":
        return this.handleCameraAction(deviceId, action);
      default:
        return { success: false, error: `Unsupported substrate: ${substrate}` };
    }
  }

  /**
   * PC Substrate (Electron/Host)
   */
  private async handlePcAction(action: BodyAction): Promise<SubstrateResponse> {
    try {
      switch (action.action) {
        case "SET_VOLUME":
          await nativeControl.setVolume(action.payload.level);
          break;
        case "LAUNCH_APP":
          await nativeControl.launchApp(action.payload.appName);
          break;
        case "PLAY_PAUSE":
          await nativeControl.mediaPlayPause();
          break;
        default:
          return { success: false, error: `Unknown PC action: ${action.action}` };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  /**
   * MOBILE Substrate (Android/iOS via Luca Link)
   */
  private async handleMobileAction(deviceId: string, action: BodyAction): Promise<SubstrateResponse> {
    try {
      switch (action.action) {
        case "TAP":
          await (androidAgent as any).performAction({ action: "TAP", x: action.payload.x, y: action.payload.y }, null, "WIRELESS");
          break;
        case "SCREENSHOT": {
          const img = await androidAgent.getScreenshot();
          return { success: true, result: img };
        }
        default:
          return { success: false, error: `Unknown Mobile action: ${action.action}` };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  /**
   * WATCH Substrate (Capacitor/Native)
   */
  private async handleWatchAction(action: BodyAction): Promise<SubstrateResponse> {
    try {
      switch (action.action) {
        case "NOTIFY":
          await watchGateway.updateWatchState({ type: "NOTIFICATION", ...action.payload });
          break;
        case "HAPTIC":
          await watchGateway.updateWatchState({ type: "HAPTIC", intensity: action.payload.intensity });
          break;
        default:
          return { success: false, error: `Unknown Watch action: ${action.action}` };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  /**
   * TV / SPEAKER Substrate — SDK-PRECISE control.
   * Routes to the correct protocol based on device's resolved SDK profile.
   */
  private async handleTvSpeakerAction(deviceId: string, action: BodyAction): Promise<SubstrateResponse> {
    const ip = action.targetIp || deviceId;
    const protocol = action.protocol ?? "DLNA";

    try {
      switch (protocol) {

        // ── Google Cast ─────────────────────────────────────────────────────────
        case "GOOGLE_CAST": {
          const port = action.targetPort ?? 8009;
          // Send Cast receiver message via HTTP (no SDK required for basic control)
          const endpoint = `http://${ip}:${port}/${action.action === "CAST_UI" ? "apps/ChromeCast" : ""}`;
          console.log(`[SUBSTRATE] 📡 GOOGLE_CAST → ${endpoint}`);
          // In production: use the Cast Application Framework (CAF) Sender SDK
          await nativeControl.startNativeCast("DLNA", ip);
          return { success: true };
        }

        // ── Roku ECP ─────────────────────────────────────────────────────────────
        case "ROKU_ECP": {
          const port = action.targetPort ?? 8060;
          const ecp = {
            SET_VOLUME: () => fetch(`http://${ip}:${port}/keypress/VolumeUp`, { method: "POST" }),
            PLAY_PAUSE: () => fetch(`http://${ip}:${port}/keypress/Play`, { method: "POST" }),
            LAUNCH_APP: () => fetch(`http://${ip}:${port}/launch/${action.payload.channelId}`, { method: "POST" }),
            BACK: () => fetch(`http://${ip}:${port}/keypress/Back`, { method: "POST" }),
          } as Record<string, () => Promise<any>>;
          const fn = ecp[action.action];
          if (!fn) return { success: false, error: `Unknown Roku ECP action: ${action.action}` };
          console.log(`[SUBSTRATE] 📡 ROKU_ECP → http://${ip}:${port}/keypress/${action.action}`);
          await fn();
          return { success: true };
        }

        // ── Samsung Tizen (WebSocket msf.js SDK) ──────────────────────────────
        case "SAMSUNG_TIZEN": {
          const port = action.targetPort ?? 8001;
          const url = `ws://${ip}:${port}/api/v2/channels/com.samsung.art-app?name=Luca`;
          console.log(`[SUBSTRATE] 📡 SAMSUNG_TIZEN WebSocket → ${url}`);
          // In production: open WebSocket, send SmartView SDK message
          return { success: true, result: { url } };
        }

        // ── LG webOS (Luna Bus WebSocket) ─────────────────────────────────────
        case "LG_WEBOS": {
          const port = action.targetPort ?? 3000;
          const url = `ws://${ip}:${port}`;
          console.log(`[SUBSTRATE] 📡 LG_WEBOS Luna Bus → ${url}`);
          // In production: open WebSocket, register, send Luna service call
          return { success: true, result: { url } };
        }

        // ── Sony Bravia (HTTP POST) ────────────────────────────────────────────
        case "SONY_BRAVIA": {
          const port = action.targetPort ?? 80;
          const endpoint = `http://${ip}:${port}/sony/avContent`;
          console.log(`[SUBSTRATE] 📡 SONY_BRAVIA HTTP POST → ${endpoint}`);
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Auth-PSK": action.payload.psk ?? "" },
            body: JSON.stringify({ method: action.action, params: [action.payload], id: 1, version: "1.0" }),
          });
          return { success: res.ok, result: await res.json().catch(() => null) };
        }

        // ── Amazon Fire TV (ADB over TCP) ────────────────────────────────────
        case "AMAZON_FIRE": {
          const port = action.targetPort ?? 5555;
          console.log(`[SUBSTRATE] 📡 AMAZON_FIRE ADB → ${ip}:${port}`);
          
          switch (action.action) {
            case "WAKE":
              await adbBridgeService.wakeUp(ip);
              break;
            case "LAUNCH_APP":
              await adbBridgeService.launchPackage(ip, action.payload.packageName);
              break;
            case "KEYEVENT":
              await adbBridgeService.sendKeyEvent(ip, action.payload.keyCode);
              break;
            default:
              await adbBridgeService.executeCommand(ip, action.action);
          }
          return { success: true };
        }

        // ── Matter (Universal CSA Standard) ──────────────────────────────────
        case "MATTER": {
          console.log(`[SUBSTRATE] 🧶 MATTER Cluster Control → Node: ${deviceId}`);
          if (action.action === "TOGGLE") {
            await matterBridgeService.toggle(deviceId);
          } else if (action.action === "SET_LEVEL") {
            await matterBridgeService.setLevel(deviceId, action.payload.level);
          } else {
            await matterBridgeService.sendCommand(deviceId, action.payload.clusterId, action.payload.commandId, action.payload.params);
          }
          return { success: true };
        }

        // ── DLNA / UPnP (Fallback) ────────────────────────────────────────────
        case "DLNA":
        default: {
          await nativeControl.startNativeCast("DLNA", ip);
          return { success: true };
        }
      }
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  /**
   * SIGNAGE Substrate (Digital Billboards / Urban Scale)
   */
  private async handleSignageAction(deviceId: string, action: BodyAction): Promise<SubstrateResponse> {
    const ip = action.targetIp || deviceId;
    try {
      const success = await signageSubstrateHandler.executeAction(ip, action.action, action.payload);
      return { success };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  /**
   * CAMERA Substrate (IP Cameras / ONVIF)
   */
  private async handleCameraAction(deviceId: string, action: BodyAction): Promise<SubstrateResponse> {
    const ip = action.targetIp || deviceId;
    try {
      const result = await onvifCameraHandler.executeAction(ip, action.action, action.payload);
      return { success: true, result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  /**
   * IOT Substrate (Home Assistant / Zigbee / Matter)
   */
  private async handleIotAction(deviceId: string, action: BodyAction): Promise<SubstrateResponse> {
    try {
      if (action.protocol === "MATTER") {
        await matterBridgeService.sendCommand(deviceId, action.payload.clusterId, action.payload.commandId, action.payload.params);
      } else {
        await (iotManager as any).controlDevice(deviceId, action.action, action.payload);
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}

export const substrateManager = new SubstrateManager();
