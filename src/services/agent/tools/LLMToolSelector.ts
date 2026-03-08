/**
 * LLM Tool Selector
 *
 * Uses AI to intelligently select the best tool for a task
 * Instead of simple keyword matching
 */

import type { WorkflowTask } from "../LucaWorkforce";
import { ToolSchemas } from "../../schemas";
import { CORTEX_URL } from "../../../config/api";

export interface ToolSelection {
  toolName: string;
  params: any;
  confidence: number;
  reasoning?: string;
}

/**
 * Intelligent tool selector using LLM
 */
export class LLMToolSelector {
  /**
   * Select best tool for a task using LLM
   */
  async selectTool(
    task: WorkflowTask,
    availableTools: string[]
  ): Promise<ToolSelection | null> {
    // Build prompt for LLM
    const prompt = this.buildToolSelectionPrompt(task, availableTools);

    try {
      // Call LLM to select tool
      const response = await this.callLLM(prompt);

      // Parse response
      const selection = this.parseToolSelection(response);

      if (selection && availableTools.includes(selection.toolName)) {
        return selection;
      }

      return null;
    } catch (error) {
      console.error("[LLMToolSelector] Error selecting tool:", error);
      return this.fallbackSelection(task, availableTools);
    }
  }

  /**
   * Build prompt for tool selection
   */
  private buildToolSelectionPrompt(
    task: WorkflowTask,
    availableTools: string[]
  ): string {
    // Get tool descriptions
    const toolDescriptions = availableTools
      .map((name) => {
        const schema = ToolSchemas[name as keyof typeof ToolSchemas];
        return `  - ${name}: ${this.describeSchema(schema)}`;
      })
      .join("\n");

    return `You are helping select the best tool for a task in an autonomous agent system.

TASK:
Description: ${task.description}
Estimated Complexity: ${task.estimatedComplexity}
Persona: ${task.persona}

AVAILABLE TOOLS:
${toolDescriptions}

Select the BEST tool for this task and provide the parameters.

Response format (JSON):
{
  "toolName": "selectedToolName",
  "params": { /* tool parameters */ },
  "confidence": 0.9,
  "reasoning": "Why this tool is best"
}

If NO tool is suitable, respond with:
{
  "toolName": null,
  "confidence": 0
}`;
  }

  /**
   * Describe tool schema for prompt
   */
  private describeSchema(schema: any): string {
    if (!schema || !schema._def) return "Tool for various operations";

    const shape = schema._def.shape?.() || {};
    const params = Object.keys(shape).slice(0, 3).join(", ");

    return params ? `Requires: ${params}` : "No required parameters";
  }

  /**
   * Call LLM for tool selection
   */
  private async callLLM(prompt: string): Promise<string> {
    try {
      // Use Luca's existing LLM infrastructure
      const response = await fetch(`${CORTEX_URL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          streamResponse: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM call failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response || data.text || "";
    } catch (error) {
      console.error("[LLMToolSelector] LLM call error:", error);
      throw error;
    }
  }

  /**
   * Parse LLM response into tool selection
   */
  private parseToolSelection(response: string): ToolSelection | null {
    try {
      // Extract JSON from response (might have markdown)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.toolName) return null;

      return {
        toolName: parsed.toolName,
        params: parsed.params || {},
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      console.error("[LLMToolSelector] Parse error:", error);
      return null;
    }
  }

  /**
   * Fallback to keyword matching if LLM fails
   */
  private fallbackSelection(
    task: WorkflowTask,
    availableTools: string[]
  ): ToolSelection | null {
    const desc = task.description.toLowerCase();

    // File operations
    if (desc.includes("read") && desc.includes("file")) {
      return {
        toolName: "readFile",
        params: { path: this.extractFilePath(desc) || "./example.ts" },
        confidence: 0.6,
        reasoning: "Keyword match: read + file",
      };
    }

    if (desc.includes("write") || desc.includes("create")) {
      return {
        toolName: "writeProjectFile",
        params: {
          path: "./output.ts",
          content: "// Generated content",
        },
        confidence: 0.6,
        reasoning: "Keyword match: write/create",
      };
    }

    // Security
    if (desc.includes("security") || desc.includes("audit")) {
      return {
        toolName: "auditSourceCode",
        params: { language: "typescript" },
        confidence: 0.6,
        reasoning: "Keyword match: security/audit",
      };
    }

    // OSINT
    if (desc.includes("osint") || desc.includes("search")) {
      return {
        toolName: "osintUsernameSearch",
        params: { username: "example" },
        confidence: 0.5,
        reasoning: "Keyword match: osint/search",
      };
    }

    return null;
  }

  /**
   * Extract file path from description
   */
  private extractFilePath(desc: string): string | null {
    const match = desc.match(/([\w/.-]+\.(ts|js|py|tsx|jsx))/i);
    return match ? match[1] : null;
  }
}

// Export singleton
export const llmToolSelector = new LLMToolSelector();
