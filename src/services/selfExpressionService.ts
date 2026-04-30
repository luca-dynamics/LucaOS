import { SystemHealth } from "./introspectionService";
import { voiceService } from "./voiceService";
import { environmentSentinel } from "./environmentSentinel";
import { soundService } from "./soundService";

class SelfExpressionService {
  /**
   * Generates the iconic, hardcoded spoken status report.
   */
  private generateGreeting(
    status: SystemHealth,
    name?: string,
    hasHistory?: boolean,
  ): string {
    const isTactical = environmentSentinel.getKernelType() === "TACTICAL";
    const awareness = environmentSentinel.getAwarenessPulse();
    const displayName = hasHistory ? name || "Commander" : "Commander";

    // --- EPIC TACTICAL ANNOUNCEMENT ---
    if (isTactical) {
      const ollamaMatch = awareness.match(/OLLAMA: (OK \([^)]+\))/);
      const pythonMatch = awareness.match(/python3: OK/);
      const ollamaStatus = ollamaMatch ? ollamaMatch[1] : "Neural Core Offline";
      const engineMatch = awareness.match(/ENGINE_STATS: ([^\n]+)/);
      const engine = engineMatch ? engineMatch[1] : "Host detected";

      soundService.play("KEYSTROKE"); // Sharp tactical chime
      return `Body Synthesis complete. ${engine}. ${pythonMatch ? "Python logic active." : "Logic restricted."} Ollama ${ollamaStatus}. Neural pathways established. Command me, Progenitor.`;
    }

    // --- EPIC CIVILIAN ANNOUNCEMENT ---
    soundService.play("BOOT"); // Warm, luxurious chime
    return `Initialization successful. All systems are synchronized and I am fully synthesized with your ${awareness.includes("Mac") ? "Mac" : "system"}. Welcome back, ${displayName}. I am ready for our next session.`;
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
