import { memoryService } from "./memoryService";
import { getAllTools } from "./lucaService";

export interface SystemHealth {
  timestamp: number;
  vision: {
    status: "online" | "offline" | "permission_denied";
    details?: string;
  };
  audio: {
    status: "online" | "offline" | "permission_denied";
    details?: string;
  };
  cortex: {
    status: "online" | "offline" | "connecting";
    url?: string;
    backend?: string;
    runtime?: string;
    acceleration?: "cuda" | "mps" | "cpu" | "unavailable" | "unknown";
    acceleratorReady?: boolean;
    device?: string;
    localModelsReady?: boolean;
  };
  tools: {
    count: number;
    hash: string; // Simple hash to detect changes
  };
}

export interface LocalCoreReadiness {
  ready: boolean;
  level: "ready" | "limited" | "offline";
  reason: string;
}

export const introspectionService = {
  /**
   * Run a full system diagnostic scan
   */
  async scan(): Promise<SystemHealth> {
    console.log("[INTROSPECTION] Initiating System Self-Scan...");
    const timestamp = Date.now();

    const [vision, audio, cortex, tools] = await Promise.all([
      this.checkVision(),
      this.checkAudio(),
      this.checkCortex(),
      this.checkTools(),
    ]);

    const status: SystemHealth = {
      timestamp,
      vision,
      audio,
      cortex,
      tools,
    };

    console.log("[INTROSPECTION] Scan Complete:", status);
    return status;
  },

  /**
   * Determine whether the local core is truly ready for local reasoning/voice work.
   * We require the Cortex backend plus a usable microphone signal path.
   * Vision stays informative, but does not block "core ready" because many voice-only
   * sessions do not require an active camera.
   */
  getLocalCoreReadiness(health: SystemHealth): LocalCoreReadiness {
    if (health.cortex.status !== "online") {
      return {
        ready: false,
        level: "offline",
        reason: "Local cortex backend is offline.",
      };
    }

    if (health.audio.status !== "online") {
      return {
        ready: false,
        level: "offline",
        reason: health.audio.details || "Microphone is unavailable.",
      };
    }

    if (!health.cortex.acceleratorReady) {
      return {
        ready: false,
        level: "limited",
        reason:
          health.cortex.acceleration === "cpu"
            ? "Local cortex is reachable, but running on CPU fallback."
            : health.cortex.device || "Local accelerator is not ready.",
      };
    }

    return {
      ready: true,
      level: "ready",
      reason: `Local ${health.cortex.acceleration?.toUpperCase() || "AI"} core and microphone are ready.`,
    };
  },

  /**
   * Check Vision System (Camera Access)
   */
  async checkVision(): Promise<SystemHealth["vision"]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === "videoinput");
      if (cameras.length > 0) {
        // We have cameras, but do we have permission?
        // Trying to get a stream is the only sure way to check permission without prompting if already granted
        // For a passive check, we just rely on enumeration
        return {
          status: "online",
          details: `${cameras.length} cameras detected.`,
        };
      }
      return { status: "offline", details: "No video input devices found." };
    } catch (e: any) {
      return { status: "permission_denied", details: e.message };
    }
  },

  /**
   * Check Audio System (Mic Access)
   */
  async checkAudio(): Promise<SystemHealth["audio"]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter((d) => d.kind === "audioinput");
      if (mics.length > 0) {
        return {
          status: "online",
          details: `${mics.length} microphones detected.`,
        };
      }
      return { status: "offline", details: "No audio input devices found." };
    } catch (e: any) {
      return { status: "permission_denied", details: e.message };
    }
  },

  /**
   * Check Cortex Backend (Python Server)
   */
  async checkCortex(): Promise<SystemHealth["cortex"]> {
    const url = await memoryService.getCortexUrl();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

      const res = await fetch(`${url}/health`, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return {
          status: "online",
          url,
          backend: data.backend || "Unknown",
          runtime: data.runtime || "python",
          acceleration: data.acceleration || "unknown",
          acceleratorReady: Boolean(data.accelerator_ready),
          device: data.device || "Unknown device",
          localModelsReady: Boolean(data.local_models_ready),
        };
      }
      return { status: "offline", url };
    } catch {
      return { status: "offline", url };
    }
  },

  /**
   * Check Available Tools (Cognitive Capabilities)
   */
  async checkTools(): Promise<SystemHealth["tools"]> {
    const tools = getAllTools();
    const count = tools.length;
    // Simple hash based on tool names
    const names = tools
      .map((t) => t.name)
      .sort()
      .join("|");
    const hash = this.simpleHash(names);

    return {
      count,
      hash,
    };
  },

  /**
   * Simple string hash for change detection
   */
  simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  },
};
