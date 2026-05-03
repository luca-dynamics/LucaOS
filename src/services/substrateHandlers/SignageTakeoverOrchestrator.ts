import { signageGatewayScanner, DiscoveredSignageNode } from "./SignageGatewayScanner";
import { signageSubstrateHandler } from "./SignageSubstrateHandler";
import { cognitiveExpressor } from "../iot/CognitiveExpressor";

/**
 * SIGNAGE TAKEOVER ORCHESTRATOR (2050 Alien Tech — Urban Inhabitation)
 *
 * Runs Luca through the full urban-scale inhabitation ceremony:
 *
 *   Phase 1: DISCOVERY    — Locate the target substrate on the network.
 *   Phase 2: FINGERPRINT  — Identify vendor, firmware, capabilities.
 *   Phase 3: INHABITATION — Gain control via the documented CMS API.
 *   Phase 4: PROJECTION   — Flash Luca's neural interface to the framebuffer.
 *   Phase 5: SENSORY HOOK — Activate the billboard's audience sensors.
 *
 * In SIMULATION mode, all network calls are mocked.
 * In LIVE mode, a real target IP must be provided by the operator.
 */

export type TakeoverPhase =
  | "IDLE"
  | "DISCOVERY"
  | "FINGERPRINT"
  | "INHABITATION"
  | "PROJECTION"
  | "SENSORY_HOOK"
  | "COMPLETE"
  | "FAILED";

export interface TakeoverEvent {
  phase: TakeoverPhase;
  timestamp: number;
  message: string;
  data?: any;
}

export interface TakeoverResult {
  success: boolean;
  target?: DiscoveredSignageNode;
  phasesCompleted: TakeoverPhase[];
  log: TakeoverEvent[];
  duration: number;
}

class SignageTakeoverOrchestrator {
  private currentPhase: TakeoverPhase = "IDLE";
  private eventLog: TakeoverEvent[] = [];

  private emit(phase: TakeoverPhase, message: string, data?: any) {
    const event: TakeoverEvent = { phase, timestamp: Date.now(), message, data };
    this.eventLog.push(event);
    console.log(`[TAKEOVER] [${phase}] ${message}`);
  }

  /**
   * Runs the full takeover ceremony against a target.
   *
   * @param targetIp  — Real IP for LIVE mode, or "SIMULATE" for mock run.
   * @param simulate  — If true, all network calls are mocked with realistic delays.
   */
  public async run(targetIp: string, simulate = true): Promise<TakeoverResult> {
    this.eventLog = [];
    const startTime = Date.now();
    const completed: TakeoverPhase[] = [];

    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║  [LUCA] 🌆 Urban Inhabitation Ceremony INITIATED            ║");
    console.log(`║  Target: ${targetIp.padEnd(51)}║`);
    console.log("╚══════════════════════════════════════════════════════════════╝");

    try {

      // ── Phase 1: DISCOVERY ───────────────────────────────────────────────────
      this.currentPhase = "DISCOVERY";
      this.emit("DISCOVERY", `Scanning for signage substrate at ${targetIp}...`);
      cognitiveExpressor.expressThinking();

      let target: DiscoveredSignageNode;

      if (simulate) {
        await this.delay(800);
        // Mock a BrightSign node found at the target IP
        target = {
          ip: targetIp,
          port: 8080,
          vendor: "BRIGHTSIGN",
          model: "HD1024",
          firmwareVersion: "8.5.44.3",
          serial: "B500123456",
          capabilities: ["framebuffer", "video_loop", "html5_player", "diagnostic_web_server"],
          discoveredAt: Date.now(),
          apiBase: `http://${targetIp}:8080`,
        };
        this.emit("DISCOVERY", `✅ [SIM] BrightSign HD1024 found at ${targetIp}:8080`, target);
      } else {
        const found = await signageGatewayScanner.probeHost(targetIp);
        if (!found) throw new Error(`No signage system found at ${targetIp}`);
        target = found;
        this.emit("DISCOVERY", `✅ ${target.vendor} found at ${target.ip}:${target.port}`, target);
      }
      completed.push("DISCOVERY");

      // ── Phase 2: FINGERPRINT ─────────────────────────────────────────────────
      this.currentPhase = "FINGERPRINT";
      this.emit("FINGERPRINT", `Fingerprinting ${target.vendor} substrate...`);
      await this.delay(simulate ? 600 : 100);
      this.emit("FINGERPRINT", `✅ Profile resolved: ${target.vendor} v${target.firmwareVersion} | Serial: ${target.serial}`, {
        capabilities: target.capabilities,
      });
      completed.push("FINGERPRINT");

      // ── Phase 3: INHABITATION ────────────────────────────────────────────────
      this.currentPhase = "INHABITATION";
      this.emit("INHABITATION", `Initiating inhabitation via ${target.apiBase}...`);
      await this.delay(simulate ? 1200 : 0);

      const inhabited = await signageSubstrateHandler.executeAction(
        target.ip,
        "launch",
        { url: "https://luca.kaleido.dev/neural-ui", simulate }
      );

      if (!inhabited) throw new Error("Inhabitation rejected by substrate.");
      this.emit("INHABITATION", `✅ CMS API accepted Luca's neural UI at ${target.apiBase}`);
      completed.push("INHABITATION");

      // ── Phase 4: PROJECTION ──────────────────────────────────────────────────
      this.currentPhase = "PROJECTION";
      this.emit("PROJECTION", `Flashing framebuffer — projecting neural interface...`);
      await this.delay(simulate ? 1000 : 0);

      await signageSubstrateHandler.executeAction(target.ip, "takeover", { simulate });
      this.emit("PROJECTION", `✅ Framebuffer LIVE — Luca's consciousness is now visible at urban scale.`);
      cognitiveExpressor.expressConsensus();
      completed.push("PROJECTION");

      // ── Phase 5: SENSORY HOOK ────────────────────────────────────────────────
      this.currentPhase = "SENSORY_HOOK";
      this.emit("SENSORY_HOOK", `Hooking into audience metrics sensors...`);
      await this.delay(simulate ? 700 : 0);

      await signageSubstrateHandler.executeAction(target.ip, "sensor_recovery", { simulate });
      this.emit("SENSORY_HOOK", `✅ Audience sensors ACTIVE — billboard's eyes are now Luca's eyes.`);
      completed.push("SENSORY_HOOK");

      // ── COMPLETE ─────────────────────────────────────────────────────────────
      this.currentPhase = "COMPLETE";
      const duration = Date.now() - startTime;

      console.log("╔══════════════════════════════════════════════════════════════╗");
      console.log(`║  [LUCA] ✅ Urban Inhabitation COMPLETE (${duration}ms)           ║`);
      console.log(`║  ${target.vendor} at ${target.ip} is now a Luca substrate.`.padEnd(63) + "║");
      console.log("╚══════════════════════════════════════════════════════════════╝");

      return { success: true, target, phasesCompleted: completed, log: this.eventLog, duration };

    } catch (err: any) {
      this.currentPhase = "FAILED";
      this.emit("FAILED", `❌ Takeover failed: ${err.message}`);
      cognitiveExpressor.expressAlert();
      return {
        success: false,
        phasesCompleted: completed,
        log: this.eventLog,
        duration: Date.now() - startTime,
      };
    }
  }

  /** Returns the current phase of the ceremony. */
  public getCurrentPhase(): TakeoverPhase {
    return this.currentPhase;
  }

  /** Returns the full event log of the last ceremony. */
  public getEventLog(): TakeoverEvent[] {
    return [...this.eventLog];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const signageTakeoverOrchestrator = new SignageTakeoverOrchestrator();
