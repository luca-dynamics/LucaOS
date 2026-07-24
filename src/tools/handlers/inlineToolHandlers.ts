// Relay / assist inline tool handlers, extracted verbatim from
// toolRegistry.execute so the dispatcher is not a single god-method.
// Behaviour is unchanged: each handler returns its result string, and
// dispatchInlineTools returns null for a name it does not handle so the caller
// falls through to the next dispatch stage exactly as before.
import { nativeControl } from "../../services/nativeControlService";
import { onvifCameraHandler } from "../../services/substrateHandlers/OnvifCameraHandler";

export async function dispatchInlineTools(
  name: string,
  args: any,
  context: any,
): Promise<string | null> {
    if (name === "generateRemoteSetupCommand") {
      const { platform = "auto" } = args;
      const token = Math.random().toString(36).substring(2, 12).toUpperCase();
      const sessionId = context.sessionId || "SESSION_PROTOTYPE";

      let command = "";
      if (platform === "windows") {
        command = `powershell -Command "iwr -useb https://luca.sh/win | iex; luca-connect --token ${token}"`;
      } else {
        // Mac/Linux default
        command = `curl -sL https://luca.sh/connect | bash -s -- --token=${token} --session=${sessionId}`;
      }

      return `REMOTE SETUP INITIALIZED.\n\nInstruction: Ask the operator to run the following command in their desktop terminal to establish a secure Luca Link bridge:\n\n\`\`\`bash\n${command}\n\`\`\`\n\nOnce executed, the 'Ghost Client' will connect and you will have full file system and terminal access to that machine.`;
    }

    if (name === "generateWebLink") {
      const token = Math.random().toString(36).substring(2, 8).toUpperCase();
      const sessionId = context.sessionId || "SESSION_PROTOTYPE";
      const link = `https://luca.sh/link/${token}?s=${sessionId}`;

      return `WEB LINK GENERATED.\n\nInstruction: Ask the operator to open the following URL in their desktop browser (Chrome, Edge, or Safari) to establish a secure 'Web Hook' bridge:\n\n${link}\n\nOnce the page is open, you will be able to request access to their screen, files, and camera via the browser's native permission prompts.`;
    }

    if (name === "remoteLaunchOnSmartTV") {
      const { tvId, url } = args;
      // In a production environment, this would call the SmartThings/ThinQ OAuth API.
      // For now, we simulate the Cloud Handshake.
      console.log(`[CLOUD_RELAY] Sending Remote Launch command to TV: ${tvId}`);
      console.log(`[CLOUD_RELAY] Target URL: ${url}`);

      return `REMOTE CLOUD LAUNCH SUCCESSFUL.\n\nStatus: Luca has reached out to the manufacturer's cloud for Device [${tvId}]. \nAction: The TV is being woken up and will launch the browser at: ${url}.\nConnection: A Luca Link tunnel is established and waiting for the TV to 'check in'.`;
    }

    if (name === "nativeHardwareCast") {
      const { protocol, targetDeviceName } = args;
      console.log(
        `[NATIVE_CAST] Initiating ${protocol} stream to: ${targetDeviceName}`,
      );
      const result = await nativeControl.startNativeCast(
        protocol,
        targetDeviceName,
      );
      return `NATIVE CAST INITIATED.\n\nProtocol: ${protocol}\nTarget: ${targetDeviceName}\nStatus: ${
        result || "Connecting..."
      }\n\nInstruction: Your Mac is now acting as the local router/source for the stream. The TV should show the dashboard once the hardware handshake is complete.`;
    }

    if (name === "launchApp") {
      return (await nativeControl.launchApp(args.appName)) || "Failed.";
    }

    // --- PERSONA SWITCHING ---
    if (name === "switchPersona") {
      const mode = args.mode;
      if (context.handlePersonaSwitch) {
        await context.handlePersonaSwitch(mode);
        return `Behavioral mode switched to ${mode}. Adapting communication style while maintaining full memory and capability awareness.`;
      }
      return "Persona switch unavailable (no handler).";
    }

    if (name === "googleImageSearch") {
      if (context.lucaService)
        return await context.lucaService.runGoogleImageSearch(args.query);
      return "Service unavailable.";
    }

    // Practice Generator Tool
    if (name === "generate_practice_questions") {
      try {
        const {
          practiceGeneratorPrompt,
          buildPracticePrompt,
          parsePracticeResponse,
        } = await import("../../services/capabilities/practiceGenerator");

        const userPrompt = buildPracticePrompt(
          args.referenceContent || args.question,
          args.numQuestions || 3,
        );

        // Use lucaService to call Gemini with the practice generator prompt
        if (context.lucaService) {
          const response = await context.lucaService.sendMessage(
            userPrompt,
            practiceGeneratorPrompt,
          );

          try {
            const parsed = parsePracticeResponse(response);
            return JSON.stringify(parsed, null, 2);
          } catch {
            // If parsing fails, return raw response
            return response;
          }
        }
        return "Luca service unavailable.";
      } catch (error: any) {
        console.error("[generate_practice_questions] Error:", error);
        return `Failed to generate practice questions: ${error.message}`;
      }
    }

    if (name === "toggleWidget") {
      const { widget } = args;
      // window.electron check
      if ((window as any).electron && (window as any).electron.ipcRenderer) {
        if (widget === "hologram") {
          // toggle-hologram message
          (window as any).electron.ipcRenderer.send("toggle-hologram");
          return "Hologram Toggled.";
        }
        if (widget === "chat") {
          // toggle-chat-widget message
          (window as any).electron.ipcRenderer.send("toggle-chat-widget");
          return "Chat Toggled.";
        }
        if (widget === "orb") {
          (window as any).electron.ipcRenderer.send("toggle-orb");
          return "Voice Orb Toggled.";
        }
      }
      return "Widget control unavailable (No Electron).";
    }

    if (name === "check_camera_footage") {
      const { targetIp, focusArea } = args;
      try {
        console.log(`[CAMERA_VISION] 👁️ Requesting on-demand analysis for ${targetIp}`);
        
        // 1. Capture Snapshot via ONVIF
        const snapshotUri = await onvifCameraHandler.executeAction(targetIp, "take_snapshot");
        
        // 2. Fetch the image and convert to base64
        // In production, the handler might return base64 directly or we fetch it here.
        // For simulation, we'll assume a success and provide a dummy image or real fetch.
        const response = await fetch(snapshotUri).catch(() => null);
        let base64;
        if (response && response.ok) {
          const buffer = await response.arrayBuffer();
          base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
        } else {
          // Simulation fallback: Use a placeholder or indicate simulation
          console.warn("[CAMERA_VISION] Fetch failed, using simulated vision state.");
          base64 = "SIMULATED_SNAPSHOT_BASE64";
        }

        // 3. Analyze via Vision Service
        const { visionAnalyzerService } = await import("../../services/visionAnalyzerService");
        const events = await visionAnalyzerService.analyzeScreen(base64, {
          mode: "ROOM_GUARD",
          customInstruction: focusArea ? `Focus on: ${focusArea}` : "Describe the general activity and security state of the room."
        });

        if (events.length === 0) {
          return "I've checked the camera feed. Everything appears normal and secure. No specific activity detected.";
        }

        const report = events.map(e => `[${e.priority}] ${e.message}`).join("\n");
        return `CAMERA FEED ANALYSIS (${targetIp}):\n\n${report}\n\nStatus: Luca is now standing by. Vision scan complete.`;
      } catch (e: any) {
        return `❌ [CAMERA_VISION] Failed to analyze footage: ${e.message}`;
      }
    }

    if (name === "controlSystem") {
      // ... (Existing implementation kept but moved inside switch/if structure)
      const { action, value } = args;
      switch (action) {
        case "VOLUME_SET":
          return (await nativeControl.setVolume(value)) || "Failed.";
        case "VOLUME_MUTE":
          return (await nativeControl.mute()) || "Failed.";
        case "VOLUME_UNMUTE":
          return (await nativeControl.unmute()) || "Failed.";
        case "GET_BATTERY":
          return await nativeControl.getBatteryStatus();
        case "GET_SYSTEM_LOAD":
          return await nativeControl.getSystemLoad();
        case "MEDIA_PLAY_PAUSE":
          return (await nativeControl.mediaPlayPause()) || "Failed.";
        case "MEDIA_NEXT":
          return (await nativeControl.mediaNext()) || "Failed.";
        case "GET_RUNNING_APPS":
          return await nativeControl.getRunningApps();
        default:
          return "Unknown action.";
      }
    }

    // 7. MOBILE APP LAUNCHER
    if (name === "openMobileApp") {
      const { appControlService } = await import("../../services/appControlService");
      const result = await appControlService.openApp(args.appName);

      if (result.success) {
        return result.message || `Opened ${args.appName}`;
      } else {
        return result.error || "Failed to open app";
      }
    }

    // 8. UI AUTOMATION (Android)
    if (name === "automateUI") {
      const { uiAutomationService } = await import("../../services/uiAutomationService");

      // Check if available
      const available = await uiAutomationService.isAvailable();
      if (!available) {
        return "UI Automation requires Android with Accessibility Service enabled. Please enable it in Settings → Accessibility → Luca.";
      }

      const { task, screenshot } = args;

      // If screenshot provided, use Vision AI multi-step execution
      if (screenshot) {
        const result = await uiAutomationService.executeVisionTask(
          task,
          screenshot,
        );
        if (result.success) {
          return result.message || "UI automation completed";
        } else {
          return result.error || "UI automation failed";
        }
      } else {
        // Simple find and click without screenshot
        const result = await uiAutomationService.findAndClick(task);
        if (result.success) {
          return result.message || `Executed: ${task}`;
        } else {
          return result.error || "Could not find element";
        }
      }
    }

    return null;
}
