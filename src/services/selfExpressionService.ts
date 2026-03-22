import { SystemHealth } from "./introspectionService";
import { voiceService } from "./voiceService";

class SelfExpressionService {
  /**
   * Generates the iconic, hardcoded spoken status report.
   */
  private generateGreeting(
    status: SystemHealth,
    name?: string,
    hasHistory?: boolean,
  ): string {
    const isAllOnline =
      status.vision.status === "online" &&
      status.audio.status === "online" &&
      status.cortex.status === "online";

    const displayName = hasHistory ? name || "Commander" : "Commander";

    if (isAllOnline) {
      // Signature Iconic Greeting
      return `Luca Initialization Successful. All systems synchronized. Welcome back ${displayName}.`;
    } else {
      // Fault-aware report (Cinematic version)
      const faults: string[] = [];
      if (status.cortex.status !== "online")
        faults.push("Luca link: unreachable.");
      if (status.vision.status !== "online")
        faults.push("Visual cortex: offline.");
      if (status.audio.status !== "online")
        faults.push("Audio receptors: inactive.");

      return `Luca System Initialization : Online. ${faults.join(" ")} System status reported. Welcome back, ${displayName}.`;
    }
  }

  /**
   * Vocalizes the system status.
   */
  async announceStatus(
    status: SystemHealth,
    name?: string,
    hasHistory?: boolean,
  ) {
    const greeting = this.generateGreeting(status, name, hasHistory);
    console.log(`[EXPRESSION] Saying: "${greeting}"`);

    // Use voice service to speak
    // Ensure we don't block the main thread too long, but speaking is async anyway
    try {
      const apiKey = import.meta.env.VITE_API_KEY || "";
      // Voice Config: Premium Studio Voice (Female/Assistant)
      const voiceConfig = {
        languageCode: "en-US",
        name: "en-US-Studio-O", // O for Female premium voice
      };

      await voiceService.speak(greeting, apiKey, voiceConfig);
    } catch (e) {
      console.warn("[EXPRESSION] Voice module failed:", e);
    }
  }
}

export const selfExpressionService = new SelfExpressionService();
