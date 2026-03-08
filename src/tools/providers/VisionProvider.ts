import { ToolRegistry } from "../../services/toolRegistry";
import { readScreenTool, aiClickTool } from "../definitions";
import { apiUrl } from "../../config/api";

const CORTEX_URL = apiUrl("");

export const VisionProvider = {
  register: () => {
    // Register readScreen handler
    ToolRegistry.register(
      readScreenTool,
      "CORE",
      ["vision", "screen", "see", "capture"],
      async (args, context) => {
        const {
          screenCaptureService,
          soundService,
          lucaService,
          lucaLinkManager,
          currentDeviceType,
          visionModel,
        } = context;

        soundService?.play("SHUTTER");

        try {
          const data = await screenCaptureService.captureScreen();
          if (data && data.image) {
            const instruction = args.focusApp
              ? `I am looking at ${args.focusApp}. Analyze this screen.`
              : "What is on the screen?";

            // LUCA LINK ROUTING
            const isMobile =
              currentDeviceType === "mobile" || currentDeviceType === "tablet";
            if (isMobile && lucaLinkManager) {
              const availableDevices = Array.from(
                (lucaLinkManager as any).devices?.values() || [],
              ).map((d: any) => ({
                type: d.type,
                deviceId: d.deviceId,
                name: d.name,
              }));
              const desktopDevice = availableDevices.find(
                (d: any) => d.type === "desktop",
              );

              if (desktopDevice) {
                const result = await (lucaLinkManager as any).delegateTool(
                  desktopDevice.deviceId,
                  "readScreen",
                  {
                    ...args,
                    screenshot: data.image,
                    instruction,
                  },
                );
                return (
                  result?.result ||
                  `SCREEN ANALYSIS COMPLETE (via ${desktopDevice.name}):\n${result}`
                );
              }
            }

            // Local vs Cloud Vision
            try {
              if (visionModel && visionModel.startsWith("gemini")) {
                throw new Error("User preference: Cloud Vision");
              }

              const visionRes = await fetch(`${CORTEX_URL}/vision/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  screenshot: data.image,
                  instruction,
                  model: visionModel,
                }),
              });

              const visionData = await visionRes.json();
              if (visionData.status === "success") {
                return `SCREEN ANALYSIS COMPLETE (Local Vision):\n${visionData.prediction}`;
              }
              throw new Error(visionData.message || "Vision analysis failed");
            } catch (error: any) {
              console.warn(
                "[VisionProvider] Local vision fallback triggered:",
                error.message,
              );
              const analysis = await lucaService.analyzeImage(
                data.image,
                instruction,
              );
              return `SCREEN ANALYSIS COMPLETE (Gemini Fallback):\n${analysis}`;
            }
          }
          return "Failed to capture screenshot.";
        } catch (e: any) {
          return `Error reading screen: ${e.message}`;
        }
      },
    );

    // Register aiClick handler
    ToolRegistry.register(
      aiClickTool,
      "CORE",
      ["click", "vision", "automation", "gui"],
      async (args, context) => {
        const { soundService, screenCaptureService } = context;
        soundService?.play("PROCESSING");

        try {
          const data = await screenCaptureService.captureScreen();
          if (!data || !data.image)
            return "Failed to capture screen for AI click.";

          const res = await fetch(`${CORTEX_URL}/vision/agent-click`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              target: args.target,
              screenshot: data.image,
            }),
          });

          const result = await res.json();
          if (result.status === "success") {
            soundService?.play("SUCCESS");
            return `✅ AI Vision successfully clicked [${args.target}].`;
          }
          return `❌ AI Vision failed to find/click [${args.target}]: ${result.message}`;
        } catch (e: any) {
          return `Error performing AI click: ${e.message}`;
        }
      },
    );
  },
};
