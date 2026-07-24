// Relay / assist inline tool handlers, extracted verbatim from
// toolRegistry.execute so the dispatcher is not a single god-method.
// Behaviour is unchanged: each handler returns its result string, and
// dispatchInlineTools returns null for a name it does not handle so the caller
// falls through to the next dispatch stage exactly as before.
import { nativeControl } from "../../services/nativeControlService";

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

    return null;
}
