import { ToolRegistry } from "../../services/toolRegistry";
import * as Definitions from "../definitions";
import { apiUrl } from "../../config/api";
import { nativeControl } from "../../services/nativeControlService";
import { diagnosticsService } from "../../services/diagnosticsService";

export const SystemProvider = {
  register: () => {
    // 1. Terminal Execution (The "Nerve Center")
    ToolRegistry.register(
      Definitions.executeTerminalCommandTool,
      "SYSTEM",
      ["terminal", "shell", "bash", "zsh", "command"],
      async (args, context) => {
        const { soundService, persona, setVisualData } = context;
        const { command } = args;

        // Thematic Audio
        const isTactical = persona === "RUTHLESS" || persona === "HACKER";
        soundService?.play(isTactical ? "BREACH" : "PROCESSING");

        // 1. TACTICAL FEEDBACK (Blue Theme)
        const cmdId = Math.random().toString(36).substring(7);
        if (setVisualData) {
          setVisualData({
            type: "SYSTEM",
            status: "EXECUTING_SHELL_COMMAND",
            logs: [
              {
                id: `init-${cmdId}`,
                timestamp: new Date().toLocaleTimeString(),
                source: "KERNEL_SHELL",
                message: `Initializing subprocess for: ${command}`,
                type: "INFO",
              },
            ],
            title: "SYSTEM_TERMINAL",
            summonHUD: false, // User must request full dashboard
          });
        }

        try {
          const res = await fetch(apiUrl("/api/system/execute"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command }),
          });
          const data = await res.json();

          if (data.error) throw new Error(data.error);

          // Thematic Output Processing
          const output =
            data.stdout || data.stderr || "Command executed with no output.";
          if (isTactical) {
            console.log(
              `[SystemProvider] ⚡ Tactical Shell Output Ingested (${command})`,
            );
          }

          if (setVisualData) {
            setVisualData({
              type: "SYSTEM",
              status: "COMMAND_EXECUTED",
              logs: [
                {
                  id: `out-${cmdId}`,
                  timestamp: new Date().toLocaleTimeString(),
                  source: "STDOUT",
                  message:
                    output.substring(0, 100) +
                    (output.length > 100 ? "..." : ""),
                  type: "SUCCESS",
                },
              ],
              title: "SYSTEM_TERMINAL",
            });
          }

          return output;
        } catch (e: any) {
          return `Terminal Error: ${e.message}`;
        }
      },
    );

    // 2. Interactive Terminal (GUI)
    ToolRegistry.register(
      Definitions.openInteractiveTerminalTool,
      "SYSTEM",
      ["terminal", "gui", "window"],
      async (args, context) => {
        const { soundService, hostPlatform } = context;
        const { command } = args;

        soundService?.play("BREACH"); // Opening a window is a "High Presence" action

        const language =
          hostPlatform === "win32" ? "powershell" : "applescript";
        let script = "";

        if (hostPlatform === "darwin") {
          script = `
            tell application "Terminal"
              activate
              do script "${command.replace(/"/g, '\\"')}"
            end tell
          `;
        } else {
          script = `Start-Process powershell -ArgumentList "-NoExit", "-Command", "${command}" `;
        }

        try {
          await fetch(apiUrl("/api/system/script"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ script, language }),
          });
          return `✓ Interactive terminal launched with command: ${command}`;
        } catch (e: any) {
          return `Failed to launch GUI terminal: ${e.message}`;
        }
      },
    );

    // 3. System Doctor (Consolidated Diagnostics)
    ToolRegistry.register(
      Definitions.systemDoctorTool,
      "SYSTEM",
      ["doctor", "diagnostics", "status", "health", "audit", "fix"],
      async (args, context) => {
        const { soundService, setVisualData } = context;
        soundService?.play("PROCESSING");

        const diagId = Math.random().toString(36).substring(7);

        if (setVisualData) {
          setVisualData({
            type: "SYSTEM",
            status: "LUCA_DOCTOR_RUNNING",
            logs: [
              {
                id: `init-${diagId}`,
                timestamp: new Date().toLocaleTimeString(),
                source: "DOCTOR_PROT",
                message: "Initiating multi-sector production audit...",
                type: "INFO",
              },
            ],
            title: "L.U.C.A_DOCTOR",
            summonHUD: true, // Always show the doctor report
          });
        }

        try {
          const report = await diagnosticsService.audit();

          if (setVisualData) {
            setVisualData({
              type: "SYSTEM",
              status: `AUDIT_${report.overall.toUpperCase()}`,
              logs: report.results.map((r) => ({
                id: r.id,
                timestamp: new Date().toLocaleTimeString(),
                source: r.name,
                message: r.message + (r.fix ? ` (Suggested Fix: ${r.fix})` : ""),
                type: r.status === "pass" ? "SUCCESS" : (r.status === "warn" ? "WARNING" : "ERROR"),
              })),
              title: "L.U.C.A_DOCTOR_REPORT",
            });
          }

          const summary = report.results
            .map((r) => `${r.status === "pass" ? "✓" : (r.status === "warn" ? "⚠" : "✗")} ${r.name}: ${r.message}`)
            .join("\n");

          return `L.U.C.A DOCTOR REPORT [${report.overall.toUpperCase()}]\n\n${summary}\n\nSYSTEM: ${report.system.platform} (${report.system.arch}) | RAM Free: ${(report.system.freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`;
        } catch (e: any) {
          return `Doctor Audit Failed: ${e.message}`;
        }
      },
    );

    // 4. Master Control System (Volume, Display, etc.)
    ToolRegistry.register(
      Definitions.nativeControlTool,
      "SYSTEM",
      ["control", "volume", "audio", "display"],
      async (args, context) => {
        const { action, value } = args;
        const { soundService } = context;

        soundService?.play("SUCCESS");

        switch (action) {
          case "VOLUME_SET":
            return (await nativeControl.setVolume(value)) || "Volume adjusted.";
          case "VOLUME_MUTE":
            return (await nativeControl.mute()) || "Audio muted.";
          case "VOLUME_UNMUTE":
            return (await nativeControl.unmute()) || "Audio restored.";
          case "GET_BATTERY":
            return await nativeControl.getBatteryStatus();
          case "GET_SYSTEM_LOAD":
            return await nativeControl.getSystemLoad();
          case "MEDIA_PLAY_PAUSE":
            return (
              (await nativeControl.mediaPlayPause()) || "Playback toggled."
            );
          case "MEDIA_NEXT":
            return (await nativeControl.mediaNext()) || "Skipped track.";
          default:
            return `Action ${action} initiated.`;
        }
      },
    );

    // 5. Admin / Lockdown Tools
    ToolRegistry.register(
      Definitions.initiateLockdownTool,
      "SYSTEM",
      ["lockdown", "secure", "critical"],
      async (args, context) => {
        const { soundService, handlePersonaSwitch } = context;

        soundService?.play("ALARM");
        if (handlePersonaSwitch) await handlePersonaSwitch("RUTHLESS");

        return "⚠️ LOCKDOWN INITIATED. All non-essential services suspended. Persona force-switched to RUTHLESS.";
      },
    );

    // 6. Manual Display Trigger (Opt-In Visualization)
    ToolRegistry.register(
      Definitions.showActionBlockDisplayTool,
      "SYSTEM",
      ["show", "display", "maximize", "render", "ui"],
      async (args, context) => {
        const { setVisualData, soundService } = context;
        soundService?.play("success");

        if (setVisualData) {
          // Send signal to VisualCore to MAXIMIZE the current view
          // We use "SHOW_DISPLAY" as a special control type
          setVisualData({
            type: "SHOW_DISPLAY",
            status: "DISPLAY_MAXIMIZED",
            logs: [],
            title: "VISUAL_INTERFACE",
          });
          return "Display maximized.";
        }
        return "Visual Core not available.";
      },
    );
  },
};
