import { matterBridgeService } from "./MatterBridgeService";
import { deviceRegistry } from "../lucaLink/deviceRegistry";

/**
 * COGNITIVE EXPRESSOR (2050 Alien Tech — Visual Voice)
 *
 * Translates Luca's internal cognitive states into physical visual signals.
 * This gives Luca a "physical presence" in the room, allowing her to 
 * communicate her status (thinking, decided, alerted) via lighting.
 */

export type ExpressionState = "IDLE" | "THINKING" | "DECIDED" | "ALERT" | "VOICE_OUT";

class CognitiveExpressor {
  private isActive = false;
  private currentPatternInterval: ReturnType<typeof setInterval> | null = null;

  public activate() {
    this.isActive = true;
    console.log("[EXPRESSOR] 🎭 Cognitive Expressor ACTIVATED. Visual Voice is live.");
  }

  public deactivate() {
    this.isActive = false;
    this.stopPattern();
    console.log("[EXPRESSOR] Cognitive Expressor DEACTIVATED.");
  }

  /**
   * Luca is "Thinking" — Rapid, subtle blue glimmer.
   * Triggered during neural beaming or heavy BDI processing.
   */
  public async expressThinking() {
    this.stopPattern();
    console.log("[EXPRESSOR] 🧠 Status: THINKING...");
    
    let brightness = 150;
    let direction = 1;

    this.currentPatternInterval = setInterval(async () => {
      brightness += (5 * direction);
      if (brightness >= 200 || brightness <= 100) direction *= -1;
      
      await this.broadcastToLights(brightness);
    }, 100);

    // Auto-stop after 3 seconds of "thought"
    setTimeout(() => this.stopPattern(), 3000);
  }

  /**
   * Luca has "Decided" — A bright green flare.
   * Triggered when the Strategy Mesh reaches consensus.
   */
  public async expressConsensus() {
    this.stopPattern();
    console.log("[EXPRESSOR] ✅ Status: CONSENSUS REACHED.");
    
    // Immediate peak brightness
    await this.broadcastToLights(254);
    
    // Decay slowly
    let brightness = 254;
    this.currentPatternInterval = setInterval(async () => {
      brightness -= 20;
      if (brightness <= 0) {
        this.stopPattern();
        return;
      }
      await this.broadcastToLights(brightness);
    }, 150);
  }

  /**
   * Luca detects an "Alert" — Sharp red pulses.
   * Triggered by security anomalies or hardware failure.
   */
  public async expressAlert() {
    this.stopPattern();
    console.log("[EXPRESSOR] 🚨 Status: ALERT!");

    let on = true;
    this.currentPatternInterval = setInterval(async () => {
      await this.broadcastToLights(on ? 254 : 0);
      on = !on;
    }, 500);
  }

  private stopPattern() {
    if (this.currentPatternInterval) {
      clearInterval(this.currentPatternInterval);
      this.currentPatternInterval = null;
    }
  }

  /**
   * Broadcasts a level command to all Matter-capable lights.
   */
  private async broadcastToLights(level: number) {
    if (!this.isActive) return;

    const devices = deviceRegistry.getAllDevices().filter(d => d.type === "iot" && d.status === "online");
    
    for (const device of devices) {
      await matterBridgeService.setLevel(device.id, level);
    }
  }
}

export const cognitiveExpressor = new CognitiveExpressor();
