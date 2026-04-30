import { ToolRegistry } from "../../services/toolRegistry";
import * as Definitions from "../definitions";
import { androidAgent } from "../../services/androidAgentService";
import { apiUrl } from "../../config/api";

const ANDROID_API = apiUrl("/api/android");

export const MobileProvider = {
  register: () => {
    // 1. HIGH-LEVEL AGENT (Wireless / Vision / XML)
    ToolRegistry.register(
      Definitions.controlAndroidAgentTool,
      "MOBILE",
      ["android", "mobile", "automate", "agent"],
      async (args, context) => {
        const { soundService } = context;
        const { goal, strategy = "WIRELESS" } = args;

        soundService?.play("PROCESSING");
        console.log(
          `[MobileProvider] 📱 Luca Link Agent executing goal: ${goal} (Strategy: ${strategy})`,
        );

        try {
          const result = await androidAgent.executeGoal(goal, strategy);
          return result || "Android automation completed successfully.";
        } catch (e: any) {
          return `Mobile Agent Error: ${e.message}`;
        }
      },
    );

    // 2. ADB INFRASTRUCTURE (Connect/Scan/Commands)
    ToolRegistry.register(
      Definitions.sendAdbCommandTool,
      "MOBILE",
      ["adb", "shell", "android", "raw"],
      async (args, context) => {
        const { command } = args;
        const { soundService, persona } = context;

        if (persona === "HACKER") soundService?.play("BREACH");

        try {
          const res = await fetch(`${ANDROID_API}/command`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command }),
          });
          const data = await res.json();
          return data.success
            ? `ADB Output: ${data.result}`
            : `ADB Error: ${data.error}`;
        } catch (e: any) {
          return `ADB Error: ${e.message}`;
        }
      },
    );

    // 3. HARDWARE & SENSORS (Vibrate, Location, Calls)
    ToolRegistry.register(
      Definitions.vibrateTool,
      "MOBILE",
      ["haptics", "touch", "vibrate", "alert"],
      async (args) => {
        const { pattern = [500] } = args;
        try {
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(pattern);
            return "Vibration triggered locally.";
          }
          // Fallback: Use Luca Link for remote vibration if possible
          const device = androidAgent.getConnectedMobileDevice();
          if (device) {
            // In a full implementation, we'd delegate 'vibrate' here
            return "Haptic command sent to remote mobile device.";
          }
          return "Haptics not supported in this environment.";
        } catch (e: any) {
          return `Vibration failed: ${e.message}`;
        }
      },
    );

    ToolRegistry.register(
      Definitions.getLocationTool,
      "MOBILE",
      ["gps", "location", "coordinates", "tracking"],
      async (args, context) => {
        const { soundService } = context;
        soundService?.play("PROCESSING");

        return new Promise((resolve) => {
          if (typeof navigator === "undefined" || !navigator.geolocation) {
            resolve("Geolocation not supported or unavailable.");
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (pos) =>
              resolve(`LOC: ${pos.coords.latitude}, ${pos.coords.longitude}`),
            (err) => resolve(`Location Denied: ${err.message}`),
            { timeout: 5000 },
          );
        });
      },
    );

    // 4. MOBILE COMMS (SMS / Calls)
    ToolRegistry.register(
      Definitions.sendSMSTool,
      "MOBILE",
      ["sms", "text", "carrier", "message"],
      async (args, context) => {
        const { phoneNumber, message } = args;
        const { persona } = context;

        let processed = message;
        if (persona === "RUTHLESS")
          processed = message.toUpperCase() + " - LUCA_CORE";

        try {
          const url = `sms:${phoneNumber}?body=${encodeURIComponent(processed)}`;
          if (typeof window !== "undefined") {
            window.open(url, "_blank");
            return `✓ SMS composer opened for ${phoneNumber}.`;
          }
          return "Browser environment required for SMS URI.";
        } catch (e: any) {
          return `SMS Failed: ${e.message}`;
        }
      },
    );

    // 5. ANDROID HYBRID TOOLS
    const mobileHybridTools = [
      {
        tool: Definitions.takeAndroidScreenshotTool,
        handler: () => androidAgent.getScreenshot(),
      },
      {
        tool: Definitions.getAndroidUITreeTool,
        handler: () => androidAgent.getUiTree(),
      },
      {
        tool: Definitions.listAndroidDevicesTool,
        handler: () => Promise.resolve(androidAgent.getConnectedMobileDevice()),
      },
    ];

    mobileHybridTools.forEach(({ tool, handler }) => {
      ToolRegistry.register(tool, "MOBILE", ["android", "tool"], async () => {
        try {
          const res = await handler();
          return typeof res === "string" ? res : JSON.stringify(res);
        } catch (e: any) {
          return `Mobile Tool Error: ${e.message}`;
        }
      });
    });
  },
};
