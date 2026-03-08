import { ToolRegistry } from "../../services/toolRegistry";
import * as Definitions from "../definitions";
import { apiUrl } from "../../config/api";

export const CommunicationProvider = {
  register: () => {
    // --- 1. CROSS-PLATFORM AUTOMATION (System Scripts) ---
    ToolRegistry.register(
      Definitions.sendInstantMessageTool,
      "MOBILE",
      ["message", "send", "chat", "automation"],
      async (args, context) => {
        const { hostPlatform, soundService, persona } = context;
        const { app, recipient, message } = args;

        soundService?.play("PROCESSING");
        const isTactical = persona === "RUTHLESS" || persona === "HACKER";

        if (isTactical) {
          console.log(
            "[CommunicationProvider] 🛡️ Tactical Theme: Enabling Encrypted Expression",
          );
        }

        const processedMessage = message;

        const language =
          hostPlatform === "win32" ? "powershell" : "applescript";
        const isMac = hostPlatform === "darwin";
        const normalizedApp = app.toLowerCase();

        let script = "";
        if (isMac) {
          if (normalizedApp.includes("whatsapp")) {
            script = `
              tell application "${app}" to activate
              delay 0.5
              tell application "System Events"
                keystroke "n" using {command down}
                delay 0.8
                keystroke "${recipient}"
                delay 1.0
                key code 36
                delay 0.5
                keystroke "${processedMessage}"
                delay 0.2
                key code 36
              end tell
            `;
          } else {
            script = `
              tell application "${app}" to activate
              delay 0.5
              tell application "System Events"
                keystroke "f" using {command down}
                delay 0.5
                keystroke "${recipient}"
                delay 0.8
                key code 36
                delay 0.5
                keystroke "${processedMessage}"
                delay 0.1
                key code 36
              end tell
            `;
          }
        } else {
          const searchKey =
            normalizedApp.includes("discord") || normalizedApp.includes("slack")
              ? "^k"
              : "^n";
          script = `
            $wshell = New-Object -ComObject WScript.Shell
            $wshell.AppActivate("${app}")
            Start-Sleep -Milliseconds 500
            $wshell.SendKeys("${searchKey}")
            Start-Sleep -Milliseconds 500
            $wshell.SendKeys("${recipient}")
            Start-Sleep -Milliseconds 800
            $wshell.SendKeys("{ENTER}")
            Start-Sleep -Milliseconds 500
            $wshell.SendKeys("${processedMessage}")
            Start-Sleep -Milliseconds 200
            $wshell.SendKeys("{ENTER}")
          `;
        }

        try {
          const res = await fetch(apiUrl("/api/system/script"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ script, language }),
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          soundService?.play("SUCCESS");
          return `✓ Message sent to ${recipient} via ${app}.`;
        } catch (e: any) {
          return `Failed to send message via ${app}: ${e.message}`;
        }
      },
    );

    // --- 2. MULTI-PLATFORM API DISPATCH (Categorized by Platform) ---

    const API_CONTROL_GROUPS = [
      {
        name: "WHATSAPP",
        tools: [
          {
            tool: Definitions.whatsappSendMessageTool,
            api: "whatsappSendMessage",
          },
          { tool: Definitions.whatsappGetChatsTool, api: "whatsappGetChats" },
          { tool: Definitions.whatsappReadChatTool, api: "whatsappReadChat" },
          {
            tool: Definitions.whatsappGetContactsTool,
            api: "whatsappGetContacts",
          },
          { tool: Definitions.whatsappSendImageTool, api: "whatsappSendImage" },
        ],
      },
      {
        name: "TELEGRAM",
        tools: [
          {
            tool: Definitions.telegramSendMessageTool,
            api: "telegramSendMessage",
          },
          { tool: Definitions.telegramGetChatsTool, api: "telegramGetChats" },
          { tool: Definitions.telegramReadChatTool, api: "telegramReadChat" },
          {
            tool: Definitions.telegramGetContactsTool,
            api: "telegramGetContacts",
          },
        ],
      },
      {
        name: "TWITTER",
        tools: [
          { tool: Definitions.postTweetTool, api: "postTweet" },
          {
            tool: Definitions.readTwitterTimelineTool,
            api: "readTwitterTimeline",
          },
          { tool: Definitions.likeTwitterPostTool, api: "likeTwitterPost" },
          { tool: Definitions.replyToTweetTool, api: "replyToTweet" },
          {
            tool: Definitions.retweetTwitterPostTool,
            api: "retweetTwitterPost",
          },
          { tool: Definitions.quoteTwitterPostTool, api: "quoteTwitterPost" },
          { tool: Definitions.followTwitterUserTool, api: "followTwitterUser" },
          {
            tool: Definitions.unfollowTwitterUserTool,
            api: "unfollowTwitterUser",
          },
          { tool: Definitions.sendTwitterDMTool, api: "sendTwitterDM" },
          { tool: Definitions.searchTwitterTool, api: "searchTwitter" },
          {
            tool: Definitions.getTwitterTrendingTool,
            api: "getTwitterTrending",
          },
        ],
      },
      {
        name: "LINKEDIN",
        tools: [
          { tool: Definitions.postLinkedInTool, api: "postLinkedIn" },
          { tool: Definitions.readLinkedInFeedTool, api: "readLinkedInFeed" },
          { tool: Definitions.likeLinkedInPostTool, api: "likeLinkedInPost" },
          {
            tool: Definitions.commentLinkedInPostTool,
            api: "commentLinkedInPost",
          },
          {
            tool: Definitions.sendLinkedInConnectionTool,
            api: "sendLinkedInConnection",
          },
          {
            tool: Definitions.searchLinkedInJobsTool,
            api: "searchLinkedInJobs",
          },
          {
            tool: Definitions.sendLinkedInMessageTool,
            api: "sendLinkedInMessage",
          },
          {
            tool: Definitions.readLinkedInMessagesTool,
            api: "readLinkedInMessages",
          },
          {
            tool: Definitions.viewLinkedInProfileTool,
            api: "viewLinkedInProfile",
          },
        ],
      },
      {
        name: "INSTAGRAM",
        tools: [
          { tool: Definitions.postInstagramTool, api: "postInstagram" },
          { tool: Definitions.readInstagramFeedTool, api: "readInstagramFeed" },
          { tool: Definitions.likeInstagramPostTool, api: "likeInstagramPost" },
          {
            tool: Definitions.commentInstagramPostTool,
            api: "commentInstagramPost",
          },
          {
            tool: Definitions.postInstagramStoryTool,
            api: "postInstagramStory",
          },
          {
            tool: Definitions.getInstagramStoriesTool,
            api: "getInstagramStories",
          },
          {
            tool: Definitions.followInstagramUserTool,
            api: "followInstagramUser",
          },
          {
            tool: Definitions.unfollowInstagramUserTool,
            api: "unfollowInstagramUser",
          },
          { tool: Definitions.sendInstagramDMTool, api: "sendInstagramDM" },
          { tool: Definitions.readInstagramDMsTool, api: "readInstagramDMs" },
          {
            tool: Definitions.exploreInstagramContentTool,
            api: "exploreInstagramContent",
          },
          { tool: Definitions.getInstagramStatsTool, api: "getInstagramStats" },
        ],
      },
      {
        name: "DISCORD",
        tools: [
          {
            tool: Definitions.sendDiscordMessageTool,
            api: "sendDiscordMessage",
          },
          {
            tool: Definitions.readDiscordMessagesTool,
            api: "readDiscordMessages",
          },
          {
            tool: Definitions.listDiscordServersTool,
            api: "listDiscordServers",
          },
        ],
      },
    ];

    // Generic Dispatcher for Social API tools
    API_CONTROL_GROUPS.forEach((group) => {
      group.tools.forEach(({ tool, api }) => {
        ToolRegistry.register(
          tool,
          "MOBILE",
          [group.name.toLowerCase(), "social", "api"],
          async (args, context) => {
            const { soundService, persona } = context;

            // Thematic sound mapping
            const sound =
              persona === "RUTHLESS" || persona === "HACKER"
                ? "BREACH"
                : "PROCESSING";
            soundService?.play(sound);

            try {
              const res = await fetch(apiUrl("/api/tools/execute"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: api, args }),
              });
              const data = await res.json();
              if (data.status === "error") throw new Error(data.message);
              return typeof data.result === "string"
                ? data.result
                : JSON.stringify(data.result);
            } catch (e: any) {
              return `${group.name} API Error (${api}): ${e.message}`;
            }
          },
        );
      });
    });
  },
};
