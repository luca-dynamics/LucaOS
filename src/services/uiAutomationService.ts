/**
 * UI Automation Service
 * High-level service for automating Android UI via Accessibility Service + Vision AI
 */

import { LucaAccessibility } from "../plugins/luca-accessibility";
import { Capacitor } from "@capacitor/core";

export interface UINode {
  id: string;
  text?: string;
  description?: string;
  className: string;
  bounds: [number, number, number, number]; // [left, top, right, bottom]
  clickable: boolean;
  editable: boolean;
  enabled: boolean;
  scrollable: boolean;
  depth: number;
  childCount: number;
}

export interface AutomationResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

class UIAutomationService {
  /**
   * Check if running on Android with Accessibility Service enabled
   */
  async isAvailable(): Promise<boolean> {
    if (Capacitor.getPlatform() !== "android") {
      return false;
    }

    try {
      const result = await LucaAccessibility.isEnabled();
      return result.enabled;
    } catch {
      return false;
    }
  }

  /**
   * Request user to enable accessibility service
   */
  async requestPermission(): Promise<void> {
    await LucaAccessibility.requestEnable();
  }

  /**
   * Get current UI tree
   */
  async getUITree(): Promise<UINode[]> {
    const result = await LucaAccessibility.getUITree();
    const treeData = JSON.parse(result.tree);
    return treeData.nodes || [];
  }

  /**
   * Find element by text content
   */
  async findElementByText(text: string): Promise<UINode | null> {
    const nodes = await this.getUITree();
    const normalized = text.toLowerCase();

    return (
      nodes.find(
        (node) =>
          node.text?.toLowerCase().includes(normalized) ||
          node.description?.toLowerCase().includes(normalized)
      ) || null
    );
  }

  /**
   * Find clickable elements
   */
  async findClickableElements(): Promise<UINode[]> {
    const nodes = await this.getUITree();
    return nodes.filter((node) => node.clickable && node.enabled);
  }

  /**
   * Find editable (input) elements
   */
  async findEditableElements(): Promise<UINode[]> {
    const nodes = await this.getUITree();
    return nodes.filter((node) => node.editable);
  }

  /**
   * Click element by ID
   */
  async click(nodeId: string): Promise<AutomationResult> {
    try {
      const result = await LucaAccessibility.performAction({
        nodeId,
        action: "click",
      });

      return {
        success: result.success,
        message: result.success ? `Clicked element ${nodeId}` : "Click failed",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Click failed",
      };
    }
  }

  /**
   * Type text into element
   */
  async type(nodeId: string, text: string): Promise<AutomationResult> {
    try {
      const result = await LucaAccessibility.performAction({
        nodeId,
        action: "type",
        text,
      });

      return {
        success: result.success,
        message: result.success ? `Typed "${text}"` : "Type failed",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Type failed",
      };
    }
  }

  /**
   * Scroll element
   */
  async scroll(
    nodeId: string,
    direction: "up" | "down"
  ): Promise<AutomationResult> {
    try {
      const result = await LucaAccessibility.performAction({
        nodeId,
        action: direction === "up" ? "scroll_up" : "scroll_down",
      });

      return {
        success: result.success,
        message: result.success ? `Scrolled ${direction}` : "Scroll failed",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Scroll failed",
      };
    }
  }

  /**
   * Navigate back
   */
  async goBack(): Promise<AutomationResult> {
    try {
      const result = await LucaAccessibility.performGlobalAction({
        action: "back",
      });
      return {
        success: result.success,
        message: "Navigated back",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Navigation failed",
      };
    }
  }

  /**
   * Go to home screen
   */
  async goHome(): Promise<AutomationResult> {
    try {
      const result = await LucaAccessibility.performGlobalAction({
        action: "home",
      });
      return {
        success: result.success,
        message: "Navigated to home",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Navigation failed",
      };
    }
  }

  /**
   * Open recent apps
   */
  async openRecents(): Promise<AutomationResult> {
    try {
      const result = await LucaAccessibility.performGlobalAction({
        action: "recents",
      });
      return {
        success: result.success,
        message: "Opened recent apps",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to open recents",
      };
    }
  }

  /**
   * Execute multi-step UI automation task autonomously (Self-Driving)
   */
  async executeTask(goal: string, maxSteps: number = 10, screenshot?: string): Promise<AutomationResult> {
    // 0. Ensure Permissions & Service Availability first
    const isReady = await this.isAvailable();
    if (!isReady) {
      console.log("[UIAutomation] Accessibility service not enabled. Requesting permission...");
      try {
        await this.requestPermission();
        // Give the user time to toggle it and the service to bind
        await new Promise((resolve) => setTimeout(resolve, 3000));
        
        // Re-check
        const recheck = await this.isAvailable();
        if (!recheck) {
          return {
            success: false,
            error: "Accessibility permission is required to automate tasks. Please enable it in Settings and try again.",
          };
        }
      } catch (e: any) {
        return {
          success: false,
          error: `Failed to request Accessibility permissions: ${e.message}`,
        };
      }
    }

    const { getGenClient } = await import("./genAIClient");
    const ai = getGenClient();
    
    const actionHistory: string[] = [];
    
    for (let step = 1; step <= maxSteps; step++) {
      console.log(`[UIAutomation] Executing task step ${step}/${maxSteps} - Goal: ${goal}`);
      
      // 1. Observe: Get screen and UI tree
      let base64Screenshot = screenshot || "";
      if (!base64Screenshot) {
        try {
          const screenResult = await LucaAccessibility.captureScreen();
          base64Screenshot = screenResult.base64;
        } catch (e: any) {
          return { success: false, error: `Failed to capture screen: ${e.message}` };
        }
      }
      
      const nodes = await this.getUITree();
      
      // Filter non-interactive elements and limit to save tokens
      const elementsSummary = nodes
        .filter((n) => n.clickable || n.editable || n.scrollable)
        .map((n) => ({
          id: n.id,
          text: n.text,
          description: n.description,
          className: n.className?.split(".").pop(),
          bounds: n.bounds,
        }))
        .slice(0, 40);

      // 2. Think: Ask Gemini 2.0 Flash for next single step
      const prompt = `You are an autonomous Android agent executing this goal: "${goal}"

CURRENT STATE:
Step: ${step}/${maxSteps}
Previous Actions History:
${actionHistory.length > 0 ? actionHistory.join("\n") : "None"}

INTERACTIVE ELEMENTS ON SCREEN:
${JSON.stringify(elementsSummary, null, 2)}

INSTRUCTIONS:
1. Look at the screenshot to understand the current app state.
2. Determine if the goal is completely achieved. Avoid early completion if intermediate steps are still needed.
3. If not achieved, determine the SINGLE next action to take to progress. Select the corresponding "nodeId" from the elements list if applicable.
4. If you are stuck (e.g. an ad, error modal, or unexpected screen), you can use the "back" or "home" actions to recover.

Return ONLY a valid JSON object matching this schema:
{
  "status": "in_progress" | "success" | "failed",
  "reasoning": "Explain what you see and why you are choosing the action",
  "action": {
    "type": "click" | "type" | "scroll" | "back" | "home" | "none",
    "nodeId": "the widget id to interact with (required for click, type, scroll)",
    "text": "text to type (required for type action)",
    "direction": "up" | "down" (required for scroll action)
  }
}`;

      try {
        const model = ai.getGenerativeModel({
          model: "gemini-2.0-flash", // Excellent at multimodal spatial reasoning
          generationConfig: {
            temperature: 0.1, // Low temp for deterministic logic
          }
        });

        const result = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: "image/png",
                    data: base64Screenshot.replace(/^data:image\/\w+;base64,/, ""),
                  },
                },
                { text: prompt },
              ],
            },
          ],
        });

        const responseText = result.response.text() || "";
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
          throw new Error("Invalid response format from Gemini");
        }
        
        const decision = JSON.parse(jsonMatch[0]);
        console.log(`[UIAutomation] Reasoning: ${decision.reasoning}`);
        
        // Check Status
        if (decision.status === "success") {
          actionHistory.push(`[${step}] SUCCESS: ${decision.reasoning}`);
          return {
            success: true,
            message: `Goal achieved: ${goal}`,
            data: { steps: step, history: actionHistory },
          };
        } else if (decision.status === "failed") {
          return {
            success: false,
            error: `Task failed: ${decision.reasoning}`,
            data: { history: actionHistory },
          };
        }
        
        // 3. Act: Execute the decided action
        const action = decision.action;
        let actionResult: AutomationResult = { success: false, error: "Empty action" };
        
        switch (action.type) {
          case "click":
             actionResult = await this.click(action.nodeId);
             actionHistory.push(`[${step}] Clicked node: ${action.nodeId}`);
             break;
          case "type":
             // AccessibilityType requires nodeId and text
             actionResult = await this.type(action.nodeId, action.text);
             actionHistory.push(`[${step}] Typed "${action.text}" into node: ${action.nodeId}`);
             break;
          case "scroll":
             actionResult = await this.scroll(action.nodeId, action.direction || "up");
             actionHistory.push(`[${step}] Scrolled ${action.direction} on node: ${action.nodeId}`);
             break;
          case "back":
             actionResult = await this.goBack();
             actionHistory.push(`[${step}] Pressed Back button`);
             break;
          case "home":
             actionResult = await this.goHome();
             actionHistory.push(`[${step}] Pressed Home button`);
             break;
          case "none":
             actionResult = { success: true, message: "Waited" };
             actionHistory.push(`[${step}] No action taken. Waiting.`);
             break;
          default:
             actionResult = { success: false, error: `Unknown action type: ${action.type}` };
        }
        
        if (!actionResult.success) {
          console.warn(`[UIAutomation] Action failed: ${actionResult.error}`);
          actionHistory.push(`[${step}] ACTION ERROR: ${actionResult.error}`);
          // Don't abort immediately on action fail. Let Gemini recover on the next loop iteration.
        }
        
        // Wait for UI animations/transitions to settle before next observation
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
      } catch (e: any) {
         console.error(`[UIAutomation] Error during task loop:`, e);
         return {
           success: false,
           error: `Crash during loop execution: ${e.message}`,
           data: { history: actionHistory }
         };
      }
    }
    
    return {
      success: false,
      error: `Maximum steps (${maxSteps}) reached without achieving goal.`,
      data: { history: actionHistory }
    };
  }

  /**
   * High-level Vision AI implementation for multi-step tasks (Alias for executeTask)
   */
  async executeVisionTask(goal: string, screenshot?: string): Promise<AutomationResult> {
    return this.executeTask(goal, 10, screenshot);
  }

  /**
   * Simple find and click automation
   */
  async findAndClick(text: string): Promise<AutomationResult> {
    const node = await this.findElementByText(text);
    if (!node) {
      return { success: false, error: `Could not find element with text: ${text}` };
    }
    return this.click(node.id);
  }
}

// Export singleton
export const uiAutomationService = new UIAutomationService();
