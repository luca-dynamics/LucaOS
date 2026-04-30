import { ToolRegistry } from "../../services/toolRegistry";
import {
  readScreenTool,
  aiClickTool,
  aiLocateTool,
  aiActTool,
  aiQueryTool,
  aiBooleanTool,
  aiAssertTool,
} from "../definitions";
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

    // 2. Register aiClick handler
    ToolRegistry.register(
      aiClickTool,
      "CORE",
      ["click", "vision", "automation", "gui"],
      async (args, context) => {
        const { screenCaptureService, soundService } = context;
        soundService?.play("PROCESSING");
        (window as any).luca?.send(
          "hologram-intent",
          `CLICKING: ${args.target.toUpperCase()}`,
        );

        try {
          const data = await screenCaptureService.captureScreen();
          if (!data || !data.image) return "Failed to capture screen.";

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
            (window as any).luca?.send(
              "hologram-intent",
              `CLICK SUCCESS: ${args.target.toUpperCase()}`,
            );
            return `✅ AI Vision successfully clicked [${args.target}].`;
          }
          return `❌ AI Vision failed to find/click [${args.target}]: ${result.message}`;
        } catch (e: any) {
          return `Error performing AI click: ${e.message}`;
        }
      },
    );

    // 3. Register aiLocate handler
    ToolRegistry.register(
      aiLocateTool,
      "CORE",
      ["locate", "find", "coordinates", "vision"],
      async (args, context) => {
        const { screenCaptureService, soundService } = context;
        soundService?.play("PROCESSING");
        // Notify HUD
        (window as any).luca?.send(
          "hologram-intent",
          `LOCATING: ${args.description.toUpperCase()}`,
        );

        try {
          const data = await screenCaptureService.captureScreen();
          if (!data || !data.image) return "Failed to capture screen.";

          const res = await fetch(`${CORTEX_URL}/vision/agent-locate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              description: args.description,
              screenshot: data.image,
            }),
          });

          const result = await res.json();
          if (result.status === "success") {
            (window as any).luca?.send(
              "hologram-intent",
              `FOUND: ${args.description.toUpperCase()}`,
            );
            return JSON.stringify(result.coordinates);
          }
          return `❌ Failed to locate [${args.description}]: ${result.message}`;
        } catch (e: any) {
          return `Error in aiLocate: ${e.message}`;
        }
      },
    );

    // 4. Register aiAct handler (The J.A.R.V.I.S. Command)
    ToolRegistry.register(
      aiActTool,
      "CORE",
      ["automation", "jarvis", "act", "execute"],
      async (args, context) => {
        const { screenCaptureService, soundService } = context;
        soundService?.play("PROCESSING");
        (window as any).luca?.send(
          "hologram-intent",
          `PREPARING ACTION: ${args.action.toUpperCase()}`,
        );

        try {
          const data = await screenCaptureService.captureScreen();
          if (!data || !data.image) return "Failed to capture screen.";

          const res = await fetch(`${CORTEX_URL}/vision/agent-act`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              instruction: args.action,
              screenshot: data.image,
            }),
          });

          const result = await res.json();
          if (result.status === "success" && result.actions) {
            // result.actions is a list of steps like { type: 'click', x, y } or { type: 'type', text }
            for (const action of result.actions) {
              (window as any).luca?.send(
                "hologram-intent",
                `EXECUTING: ${action.type.toUpperCase()}`,
              );

              // Map vision actions to physical inputs via toolRegistry.execute
              // We call controlSystemInput for clicks/moves
              if (
                ["click", "double_click", "right_click", "move"].includes(
                  action.type,
                )
              ) {
                await ToolRegistry.execute(
                  "controlSystemInput",
                  {
                    action: action.type.toUpperCase(),
                    x: action.x,
                    y: action.y,
                  },
                  context,
                );
              } else if (action.type === "type") {
                await ToolRegistry.execute(
                  "typeText",
                  { text: action.text },
                  context,
                );
              } else if (action.type === "press") {
                await ToolRegistry.execute(
                  "pressKey",
                  { key: action.key },
                  context,
                );
              }

              // Small delay between steps
              await new Promise((r) => setTimeout(r, 500));
            }
            return `✅ Success: ${args.action}`;
          }
          return `❌ AI failed to perform action: ${result.message}`;
        } catch (e: any) {
          return `Error in aiAct: ${e.message}`;
        }
      },
    );

    // 5. Register aiQuery / aiBoolean / aiAssert (Simplified handlers)
    [aiQueryTool, aiBooleanTool, aiAssertTool].forEach((tool) => {
      ToolRegistry.register(
        tool,
        "CORE",
        ["vision", "query", "check"],
        async (args, context) => {
          const { screenCaptureService } = context;
          const data = await screenCaptureService.captureScreen();
          if (!data || !data.image) return "Failed to capture screen.";

          const res = await fetch(`${CORTEX_URL}/vision/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              instruction: args.query || args.condition || args.assertion,
              screenshot: data.image,
            }),
          });
          const result = await res.json();
          return result.prediction;
        },
      );
    });
  },
};
