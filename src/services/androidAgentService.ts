import { AndroidXmlParser } from "../utils/androidXmlParser";
import { getGenClient } from "./genAIClient";
import { apiUrl } from "../config/api";

import { deviceRegistry } from "./lucaLink/deviceRegistry";
// Dynamic import for LucaLinkManager to avoid circular dependencies/init issues
let lucaLinkManager: any = null;
try {
  import("./lucaLink/manager").then((module) => {
    lucaLinkManager = module.lucaLinkManager;
    console.log("[AndroidAgent] Luca Link Manager loaded.");
  });
} catch {
  console.warn("[AndroidAgent] Luca Link Manager not available.");
}

// Use local server API instead of direct child_process
const SERVER_URL = apiUrl("/api/android");

interface AgentStep {
  action: "TAP" | "TYPE" | "HOME" | "BACK" | "SCROLL" | "DONE" | "FAIL";
  targetId?: number;
  text?: string;
  reasoning: string;
  // Vision Mode Extras
  x?: number;
  y?: number;
}

export class AndroidAgentService {
  private isRunning = false;
  private maxSteps = 10;

  /**
   * Executes a high-level goal on the connected Android device.
   * @param goal Natural language goal
   * @param strategy 'ACCURACY' (XML) or 'WIRELESS' (Vision/Screenshot)
   */
  async executeGoal(
    goal: string,
    strategy: "ACCURACY" | "WIRELESS" = "ACCURACY"
  ): Promise<string> {
    if (this.isRunning) {
      throw new Error("Agent is already running a task.");
    }
    this.isRunning = true;
    let stepCount = 0;
    const history: string[] = [];

    try {
      while (stepCount < this.maxSteps) {
        let step: AgentStep;
        let uiTree: any[] | null = null;
        let screenshotBase64: string | null = null;

        // 1. OBSERVE
        if (strategy === "ACCURACY") {
          uiTree = await this.getUiTree();
          if (!uiTree) {
            console.warn(
              "[AndroidAgent] XML Dump failed. Falling back to Vision."
            );
            strategy = "WIRELESS";
          }
        }

        if (strategy === "WIRELESS") {
          screenshotBase64 = await this.getScreenshot();
          if (!screenshotBase64) {
            return "Failed to acquire vision. Ensure device is connected via Luca Link (QR) or USB (ADB).";
          }
        }

        // 2. THINK
        if (strategy === "ACCURACY" && uiTree) {
          step = await this.decideNextStepXml(goal, uiTree, history);
        } else if (strategy === "WIRELESS" && screenshotBase64) {
          step = await this.decideNextStepVision(
            goal,
            screenshotBase64,
            history
          );
        } else {
          return "Observation failed for all strategies.";
        }

        history.push(
          `Step ${stepCount + 1}: ${step.action} - ${step.reasoning}`
        );

        // 3. ACT
        if (step.action === "DONE") {
          return `Goal Reached: ${step.reasoning}`;
        }
        if (step.action === "FAIL") {
          return `Aborted: ${step.reasoning}`;
        }

        // Execute physical action
        await this.performAction(step, uiTree, strategy);

        // Wait for UI to settle
        await new Promise((resolve) => setTimeout(resolve, 3000));
        stepCount++;
      }
      return "Max steps reached without explicit completion.";
    } catch (error: any) {
      console.error("Android Agent Error:", error);
      return `Error: ${error.message}`;
    } finally {
      this.isRunning = false;
    }
  }

  public getConnectedMobileDevice() {
    // Priority: Use the intelligent selector from DeviceRegistry
    // This finds the best device based on trust, battery, and stability
    const bestDevice = deviceRegistry.selectBestDevice("controlMobileDevice");
    if (bestDevice && (bestDevice.platform === "android" || bestDevice.type === "mobile" || bestDevice.type === "tablet")) {
      // Convert Device to the format expected by Agent (if needed, here we just return the Device object)
      // The delegateTool expects a deviceId
      return { ...bestDevice, deviceId: bestDevice.id };
    }

    // Fallback if registry selector is empty but manager has devices (legacy/direct access)
    if (!lucaLinkManager) return null;
    for (const device of lucaLinkManager.getDevices()) {
      if (device.status === "online" && (device.platform === "android" || device.type === "mobile" || device.type === "tablet")) {
        return { ...device, deviceId: device.id };
      }
    }
    return null;
  }

  /**
   * Reads a file from the Android device.
   */
  async readFile(filePath: string): Promise<string> {
    const res = await fetch(`${SERVER_URL}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: `pull ${filePath}` }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to read file");
    return data.result;
  }

  /**
   * Writes a file to the Android device.
   */
  async writeFile(
    filePath: string,
    content: string,
    isBase64: boolean = false
  ): Promise<boolean> {
    const res = await fetch(`${SERVER_URL}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command: `push ${filePath}`,
        content,
        isBase64,
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to write file");
    return true;
  }

  public async getUiTree() {
    try {
      // Priority 1: Luca Link (Wireless)
      const mobileDevice = this.getConnectedMobileDevice();
      if (mobileDevice && lucaLinkManager) {
        console.log(`[AndroidAgent] Requesting UI Tree via Luca Link (${mobileDevice.deviceId})...`);
        const response = await lucaLinkManager.delegateTool(
          mobileDevice.deviceId,
          "controlMobileDevice",
          { action: "UI_TREE" }
        );

        if (response.success && response.xml) {
          return await AndroidXmlParser.parse(response.xml);
        }
        console.warn("[AndroidAgent] Luca Link UI Tree failed, falling back to ADB.");
      }

      // Priority 2: ADB Fallback
      const res = await fetch(`${apiUrl("/api/android/ui-tree")}`);
      const data = await res.json();
      if (!data.success) return null;
      
      if (data.xml) {
        return await AndroidXmlParser.parse(data.xml);
      }
      return null;
    } catch (e) {
      console.error("UI Tree extraction failed:", e);
      return null;
    }
  }

  public async getScreenshot(): Promise<string | null> {
    try {
      // Priority 1: Luca Link (Wireless)
      const mobileDevice = this.getConnectedMobileDevice();
      if (mobileDevice && lucaLinkManager) {
        console.log(
          `[AndroidAgent] Requesting screenshot via Luca Link (${mobileDevice.deviceId})...`
        );
        const response = await lucaLinkManager.delegateTool(
          mobileDevice.deviceId,
          "controlMobileDevice",
          { action: "SCREENSHOT" }
        );

        if (response.success && response.result) {
          // Expecting result to be the base64 string or an object with it
          // Adjust based on actual mobile implementation. Assuming direct base64 string or { base64: string }
          return typeof response.result === "string"
            ? response.result
            : response.result.base64;
        }
        console.warn(
          "[AndroidAgent] Luca Link screenshot failed:",
          response.error
        );
      }

      // Priority 2: ADB Fallback (if USB connected)
      console.log("[AndroidAgent] Falling back to ADB Screenshot...");
      const res = await fetch(`${apiUrl("/api/android/screenshot")}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.success && data.image) {
        return data.image;
      }
      return null;
    } catch (e) {
      console.error("Screenshot failed:", e);
      return null;
    }
  }

  private async decideNextStepXml(
    goal: string,
    uiElements: any[],
    history: string[]
  ): Promise<AgentStep> {
    const genAI = getGenClient();
    const elementList = uiElements
      .map(
        (e) =>
          `ID: ${e.id} | Type: ${e.type.split(".").pop()} | Text: "${
            e.text || ""
          }" | Desc: "${e.contentDesc || ""}"`
      )
      .join("\n");

    const prompt = `
        You are an Android Automation Agent (XML Mode).
        GOAL: "${goal}"

        CURRENT SCREEN STATE:
        ${elementList}

        HISTORY:
        ${history.join("\n")}

        INSTRUCTIONS:
        Return JSON with:
        - "action": "TAP", "TYPE", "HOME", "BACK", "SCROLL", "DONE", "FAIL"
        - "targetId": ID for TAP
        - "text": for TYPE
        - "reasoning": explanation
        `;

    try {
      const result = await genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: { parts: [{ text: prompt }] },
        config: { responseMimeType: "application/json" },
      });
      return JSON.parse(result.text || "{}") as AgentStep;
    } catch (e) {
      console.error("XML Decision failed:", e);
      return { action: "FAIL", reasoning: "Brain failure" };
    }
  }

  private async decideNextStepVision(
    goal: string,
    screenshotBase64: string,
    history: string[]
  ): Promise<AgentStep> {
    // Priority 1: Try Mobile Offline Brain if available
    try {
      const { mobileOfflineBrain } = await import(
        "./mobile/MobileOfflineBrain"
      );
      if (mobileOfflineBrain.isReady()) {
        console.log(
          "[AndroidAgent] Using Mobile Offline Brain for decision..."
        );
        const prompt = `
          You are an Android Automation Agent (Vision Mode).
          GOAL: "${goal}"
          
          HISTORY:
          ${history.join("\n")}

          INSTRUCTIONS:
          1. Analyze the user's goal and history.
          2. Estimate the best next action.
          3. Return JSON:
          - "action": "TAP", "TYPE", "HOME", "BACK", "SCROLL", "DONE", "FAIL"
          - "x": number (Tap X, estimate 540 for center on most phones)
          - "y": number (Tap Y)
          - "text": string (for TYPE)
          - "reasoning": string
          
          If unsure, choose FAIL.
        `;

        const response = await mobileOfflineBrain.generateContent(prompt);
        try {
          return JSON.parse(response) as AgentStep;
        } catch {
          // If parsing fails, return FAIL
          return {
            action: "FAIL",
            reasoning: "Offline brain response parsing failed",
          };
        }
      }
    } catch {
      console.warn(
        "[AndroidAgent] Mobile Offline Brain not available, falling back to Cloud"
      );
    }

    // Priority 2: Cloud Brain (Gemini)
    const genAI = getGenClient();

    const prompt = `
        You are an Android Automation Agent (Vision Mode).
        GOAL: "${goal}"
        
        HISTORY:
        ${history.join("\n")}

        INSTRUCTIONS:
        1. Analyze the screenshot. find the element that matches the GOAL.
        2. Estimate its CENTER (X, Y) coordinates (use image dimensions).
        3. Return JSON:
        - "action": "TAP", "TYPE", "HOME", "BACK", "SCROLL", "DONE", "FAIL"
        - "x": number (Tap X)
        - "y": number (Tap Y)
        - "text": string (for TYPE)
        - "reasoning": string
        
        If unsure, choose FAIL.
        `;

    try {
      const result = await genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/png", data: screenshotBase64 } },
          ],
        },
        config: { responseMimeType: "application/json" },
      });
      return JSON.parse(result.text || "{}") as AgentStep;
    } catch (e) {
      console.error("Vision Decision failed:", e);
      return { action: "FAIL", reasoning: "Visual Brain failure" };
    }
  }

  private async performAction(
    step: AgentStep,
    uiElements: any[] | null,
    strategy: string
  ) {
    // --- HELPER: LUCA LINK EXECUTION ---
    const lucaCommand = async (action: string, args: any) => {
      const device = this.getConnectedMobileDevice();
      if (device && lucaLinkManager) {
        try {
          console.log(`[AndroidAgent] Sending Luca Command: ${action}`, args);
          const result = await lucaLinkManager.delegateTool(
            device.deviceId,
            "controlMobileDevice",
            {
              action,
              ...args,
            }
          );
          return result;
        } catch (error) {
          console.warn(`[AndroidAgent] Luca Link command failed: ${action}. Falling back to ADB.`, error);
          // Fall through to manual ADB logic below
        }
      } 
      
      console.warn(
          "[AndroidAgent] No Luca Link device available or command failed. Using ADB fallback."
      );
        // Fallback to ADB structured endpoints
        if (action === "TAP" && args.x && args.y) {
           await fetch(`${apiUrl("/api/android/click")}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ x: args.x, y: args.y })
           });
        }
        if (action === "TEXT" && args.text) {
           await fetch(`${apiUrl("/api/android/type")}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: args.text })
           });
        }
        if (action === "KEY" && args.keyCode) {
           await fetch(`${apiUrl("/api/android/intent")}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "KEYCODE", data: args.keyCode })
           });
        }
    };

    // --- EXECUTE ---
    switch (step.action) {
      case "TAP": {
        let x = step.x;
        let y = step.y;
        if (uiElements && step.targetId !== undefined) {
          const target = uiElements.find((e) => e.id === step.targetId);
          if (target) {
            x = target.center.x;
            y = target.center.y;
          }
        }
        if (x !== undefined && y !== undefined) {
          if (strategy === "WIRELESS") {
            await lucaCommand("TAP", { x, y });
          } else {
            await fetch(`${apiUrl("/api/android/click")}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ x, y })
            });
          }
        }
        break;
      }
 
      case "TYPE":
        if (step.text) {
          if (strategy === "WIRELESS") {
            await lucaCommand("TEXT", { text: step.text });
          } else {
            await fetch(`${apiUrl("/api/android/type")}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: step.text })
            });
          }
        }
        break;

      case "HOME":
        if (strategy === "WIRELESS") await lucaCommand("KEY", { keyCode: 3 });
        else await fetch(`${apiUrl("/api/android/intent")}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "KEYCODE", data: "KEYCODE_HOME" })
           });
        break;
 
      case "BACK":
        if (strategy === "WIRELESS") await lucaCommand("KEY", { keyCode: 4 });
        else await fetch(`${apiUrl("/api/android/intent")}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "KEYCODE", data: "KEYCODE_BACK" })
           });
        break;
 
      case "SCROLL":
        if (strategy === "WIRELESS")
          await lucaCommand("SWIPE", {
            x: 500,
            y: 1500,
            x2: 500,
            y2: 500,
          });
        // Approximate up-swipe via custom action in future or specialized route
        else await fetch(`${apiUrl("/api/android/intent")}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "SWIPE", data: "500 1500 500 500 300" })
           });
        break;
    }
  }
}

export const androidAgent = new AndroidAgentService();
