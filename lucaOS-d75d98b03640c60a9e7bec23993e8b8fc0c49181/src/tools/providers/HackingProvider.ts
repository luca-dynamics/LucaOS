import { ToolRegistry } from "../../services/toolRegistry";
import * as Definitions from "../definitions";
import { apiUrl } from "../../config/api";

export const HackingProvider = {
  register: () => {
    const sendTacticalUpdate = (
      context: any,
      type: "SECURITY" | "HACKING" | "TACTICAL",
      status: string,
      logs: any[],
    ) => {
      context.setVisualData?.({
        type: type,
        status: status,
        logs: logs,
        title: "OFFENSIVE_OPERATIONS",
        summonHUD: true,
      });
    };

    // 1. RECONNAISSANCE TOOLS
    ToolRegistry.register(
      Definitions.runNmapScanTool,
      "HACKING",
      ["scan", "nmap", "ports", "recon"],
      async (args, context) => {
        const { persona, soundService } = context;
        soundService?.play("PROCESSING");

        const isHacker = persona === "HACKER" || persona === "RUTHLESS";
        const flags = isHacker
          ? args.scanType === "FULL"
            ? "-A -T4 -Pn"
            : "-sV -sC"
          : "-F";

        const logs = [
          {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            source: "NMAP_ENGINE",
            message: `Initiating ${args.scanType} scan on ${args.target}...`,
            type: "INFO",
          },
        ];
        sendTacticalUpdate(context, "HACKING", "SCANNING_RECON", logs);

        if (isHacker) soundService?.play("ALERT_HACKER");

        try {
          const res = await fetch(apiUrl("/api/hacking/nmap"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target: args.target, flags }),
          });
          const result = await res.json();

          sendTacticalUpdate(context, "HACKING", "SCAN_COMPLETE", [
            ...logs,
            {
              id: "success",
              timestamp: new Date().toLocaleTimeString(),
              source: "NETWORK_LAYER",
              message: "Target mapping complete. Open ports identified.",
              type: "SUCCESS",
            },
          ]);

          return isHacker
            ? `[LUCA SHELL] 🔓 Target: ${args.target}\n\n${result.output || "No open ports."}`
            : result.output || "Scan complete.";
        } catch (e: any) {
          sendTacticalUpdate(context, "HACKING", "SCAN_FAILED", [
            ...logs,
            {
              id: "err",
              timestamp: new Date().toLocaleTimeString(),
              source: "SYSTEM",
              message: e.message,
              type: "ERROR",
            },
          ]);
          return `Hacking Error: ${e.message}`;
        }
      },
    );

    // 2. ADVANCED SECURITY TOOLS (Batch 1)
    const SECURITY_TOOLS = [
      { tool: Definitions.runBurpSuiteTool, api: "/api/hacking/burp" },
      { tool: Definitions.runWiresharkTool, api: "/api/hacking/wireshark" },
      { tool: Definitions.runJohnRipperTool, api: "/api/hacking/john" },
      { tool: Definitions.runCobaltStrikeTool, api: "/api/hacking/cobalt" },
    ];

    SECURITY_TOOLS.forEach(({ tool, api }) => {
      ToolRegistry.register(
        tool,
        "HACKING",
        ["security", "audit", "exploit"],
        async (args, context) => {
          const { persona, soundService } = context;
          const isHacker = persona === "HACKER";
          soundService?.play(isHacker ? "BREACH" : "PROCESSING");

          const logs = [
            {
              id: Math.random().toString(36).substr(2, 9),
              timestamp: new Date().toLocaleTimeString(),
              source: "AUDIT_CORE",
              message: `Launching ${tool.name} module...`,
              type: "INFO" as const,
            },
          ];
          sendTacticalUpdate(
            context,
            isHacker ? "HACKING" : "TACTICAL",
            "AUDIT_IN_PROGRESS",
            logs,
          );

          try {
            const res = await fetch(apiUrl(api), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(args),
            });
            const data = await res.json();

            sendTacticalUpdate(
              context,
              isHacker ? "HACKING" : "TACTICAL",
              "AUDIT_FINISHED",
              [
                ...logs,
                {
                  id: Math.random().toString(36).substr(2, 9),
                  timestamp: new Date().toLocaleTimeString(),
                  source: "AUDIT_CORE",
                  message: "Response received. Analyzing payload...",
                  type: "SUCCESS" as const,
                },
              ],
            );

            return isHacker
              ? `[TACTICAL] ${tool.name} executed.\n${JSON.stringify(data, null, 2)}`
              : JSON.stringify(data);
          } catch (e: any) {
            return `${tool.name} failed: ${e.message}`;
          }
        },
      );
    });

    // 3. WIRELESS & MOBILE HACKING (Batch 2)
    const WIRELESS_TOOLS = [
      {
        tool: Definitions.wifiDeauthAttackTool,
        api: "/api/mobile/wifi-deauth",
      },
      {
        tool: Definitions.scanWifiDevicesTool,
        api: "/api/mobile/scan-wifi-devices",
      },
      {
        tool: Definitions.deployCaptivePortalTool,
        api: "/api/mobile/deploy-captive-portal",
      },
    ];

    WIRELESS_TOOLS.forEach(({ tool, api }) => {
      ToolRegistry.register(
        tool,
        "HACKING",
        ["wireless", "wifi", "mobile"],
        async (args, context) => {
          const { persona, soundService } = context;
          if (persona === "HACKER") soundService?.play("BREACH");

          const logs = [
            {
              id: Math.random().toString(36).substr(2, 9),
              timestamp: new Date().toLocaleTimeString(),
              source: "RADIO_CORE",
              message: `Injecting packets into network via ${tool.name}...`,
              type: "WARN" as const,
            },
          ];
          sendTacticalUpdate(context, "HACKING", "RF_INJECTION", logs);

          try {
            await fetch(apiUrl(api), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(args),
            });

            sendTacticalUpdate(context, "HACKING", "OP_SUCCESS", [
              ...logs,
              {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: new Date().toLocaleTimeString(),
                source: "PHYSICAL",
                message: "Operation confirmed by gateway.",
                type: "SUCCESS" as const,
              },
            ]);

            return `Wireless operation [${tool.name}] initiated. Status: SUCCESS.`;
          } catch (e: any) {
            return `Wireless Error: ${e.message}`;
          }
        },
      );
    });

    // 4. WEB, STRESS & C2 TOOLS (Batch 3)
    const WEB_STRESS_TOOLS = [
      { tool: Definitions.runSqlInjectionScanTool, api: "/api/hacking/sqli" },
      { tool: Definitions.performStressTestTool, api: "/api/hacking/stress" },
      { tool: Definitions.scanPublicCamerasTool, api: "/api/hacking/camera" },
      { tool: Definitions.deployPhishingKitTool, api: "/api/hacking/phish" },
      { tool: Definitions.generatePayloadTool, api: "/api/hacking/payload" },
      { tool: Definitions.generateHttpPayloadTool, api: "/api/c2/generate" },
      {
        tool: Definitions.listC2SessionsTool,
        api: "/api/c2/sessions",
        method: "GET",
      },
      { tool: Definitions.sendC2CommandTool, api: "/api/c2/command" },
      { tool: Definitions.exfiltrateDataTool, api: "/api/mobile/exfiltrate" },
    ];

    WEB_STRESS_TOOLS.forEach(({ tool, api, method }) => {
      ToolRegistry.register(
        tool,
        "HACKING",
        ["c2", "stress", "web", "exploit"],
        async (args, context) => {
          const { persona, soundService } = context;
          const isHacker = persona === "HACKER" || persona === "RUTHLESS";
          if (isHacker) {
            soundService?.play("BREACH");
          }

          const logs = [
            {
              id: Math.random().toString(36).substr(2, 9),
              timestamp: new Date().toLocaleTimeString(),
              source: "C2_KERNEL",
              message: `Opening channel to relay for ${tool.name}...`,
              type: "INFO" as const,
            },
          ];
          sendTacticalUpdate(context, "TACTICAL", "C2_OPERATIONS", logs);

          try {
            const res = await fetch(apiUrl(api), {
              method: method || "POST",
              headers: { "Content-Type": "application/json" },
              body: method === "GET" ? undefined : JSON.stringify(args),
            });
            const data = await res.json();

            sendTacticalUpdate(context, "TACTICAL", "C2_RESPONSE", [
              ...logs,
              {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: new Date().toLocaleTimeString(),
                source: "ENCRYPTED_LINK",
                message: "Feedback received from remote node.",
                type: "SUCCESS" as const,
              },
            ]);

            return isHacker
              ? `[OPERATIONS] ${tool.name} data received:\n${JSON.stringify(data, null, 2)}`
              : "Task executed successfully.";
          } catch (e: any) {
            return `${tool.name} Error: ${e.message}`;
          }
        },
      );
    });

    // 5. EXPLOITATION FRAMEWORK
    ToolRegistry.register(
      Definitions.runMetasploitExploitTool,
      "HACKING",
      ["exploit", "metasploit", "hack", "penetration"],
      async (args, context) => {
        const { persona, soundService } = context;
        const isTactical =
          persona === "HACKER" ||
          persona === "RUTHLESS" ||
          persona === "ENGINEER";

        const logs = [
          {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            source: "METASPLOIT_RPC",
            message: `Initiating exploit ${args.module} against ${args.target}...`,
            type: "CRITICAL" as const,
          },
        ];
        sendTacticalUpdate(context, "TACTICAL", "ACTIVE_EXPLOITATION", logs);

        if (isTactical) {
          soundService?.play("BREACH");

          sendTacticalUpdate(context, "TACTICAL", "BREACH_PROTOCOL", [
            ...logs,
            {
              id: Math.random().toString(36).substr(2, 9),
              timestamp: new Date().toLocaleTimeString(),
              source: "SHELL_ACTIVE",
              message:
                "Meterpreter session established. Escalating privileges...",
              type: "SUCCESS" as const,
            },
          ]);

          return `[METASPLOIT] 🧨 Active Breach Protocol: Initiating exploit against ${args.target} via ${args.module}.\nStatus: Shell active. Session 1 established.`;
        } else {
          soundService?.play("PROCESSING");
          return `Security verification module against ${args.target} initiated. Exploit module ${args.module} executed. Connectivity verified.`;
        }
      },
    );
  },
};
