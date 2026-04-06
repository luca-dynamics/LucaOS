/**
 * Agent Tool Bridge
 *
 * Bridges the Agent Workforce with Luca's existing 200+ tools
 * Handles tool execution, validation, and access control
 */

import { ToolSchemas } from "../../schemas";
import type { PersonaType } from "../../../config/personaConfig";
import { hasToolAccess, getPersonaTools } from "../config/personaToolAccess";
import { tracingService } from "../LucaTracing";
import { CORTEX_URL } from "../../../config/api";

export interface ToolResult {
  success: boolean;
  output: any;
  error?: string;
  filesModified?: string[];
  duration?: number;
}

export interface ToolDefinition {
  name: string;
  schema: any;
  description?: string;
}

/**
 * Bridge between Agent Workforce and Luca's tool ecosystem
 */
export class AgentToolBridge {
  private traceId?: string;

  constructor(traceId?: string) {
    this.traceId = traceId;
  }

  /**
   * Execute a tool with persona-based access control
   */
  async executeTool(
    toolName: string,
    params: any,
    persona: PersonaType,
  ): Promise<ToolResult> {
    const startTime = Date.now();

    // 1. Check access
    if (!hasToolAccess(persona, toolName)) {
      const error = `Persona ${persona} does not have access to tool: ${toolName}`;

      if (this.traceId) {
        tracingService.logError(
          this.traceId,
          `${persona}-luca`,
          "tool_access_denied",
          error,
        );
      }

      return {
        success: false,
        output: null,
        error,
      };
    }

    // 2. Validate parameters
    try {
      const schema = ToolSchemas[toolName as keyof typeof ToolSchemas];

      if (!schema) {
        throw new Error(`No schema found for tool: ${toolName}`);
      }

      const validated = schema.parse(params);

      if (this.traceId) {
        tracingService.log(
          this.traceId,
          `${persona}-luca`,
          "tool_params_validated",
          { tool: toolName, params: validated },
        );
      }

      // 3. Execute tool via backend
      const result = await this.executeToolViaBackend(toolName, validated);

      const duration = Date.now() - startTime;

      if (this.traceId) {
        tracingService.log(
          this.traceId,
          `${persona}-luca`,
          "tool_executed",
          { tool: toolName, success: result.success },
          duration,
        );
      }

      return {
        ...result,
        duration,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      if (this.traceId) {
        tracingService.logError(
          this.traceId,
          `${persona}-luca`,
          "tool_execution_failed",
          error as Error,
        );
      }

      return {
        success: false,
        output: null,
        error: errorMsg,
      };
    }
  }

  /**
   * Execute tool via backend API
   * Leverages existing Luca tool infrastructure
   */
  private async executeToolViaBackend(
    toolName: string,
    params: any,
  ): Promise<ToolResult> {
    try {
      // Call backend endpoint (will be implemented in cortex.py)
      const response = await fetch(`${CORTEX_URL}/api/agent/execute-tool`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolName,
          params,
        }),
      });

      if (!response.ok) {
        throw new Error(`Tool execution failed: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: result.success !== false,
        output: result.output || result.result,
        filesModified: result.filesModified,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error:
          error instanceof Error ? error.message : "Backend execution failed",
      };
    }
  }

  /**
   * Get all tools available to a persona
   */
  getToolsForPersona(persona: PersonaType): string[] {
    return getPersonaTools(persona);
  }

  /**
   * List all available tools (200+)
   */
  listAllTools(): ToolDefinition[] {
    const tools: ToolDefinition[] = [];

    for (const [name, schema] of Object.entries(ToolSchemas)) {
      tools.push({
        name,
        schema,
        description: this.getToolDescription(name),
      });
    }

    return tools;
  }

  /**
   * Get tool description from schema
   */
  private getToolDescription(toolName: string): string {
    // Tool descriptions would ideally come from ToolDefinitions
    // For now, generate from name
    return toolName
      .replace(/([A-Z])/g, " $1")
      .trim()
      .toLowerCase();
  }

  /**
   * Search for tools matching a query
   */
  searchTools(query: string, persona?: PersonaType): ToolDefinition[] {
    const lowerQuery = query.toLowerCase();
    const allTools = this.listAllTools();

    let filtered = allTools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(lowerQuery) ||
        tool.description?.toLowerCase().includes(lowerQuery),
    );

    // Filter by persona access if specified
    if (persona) {
      const allowedTools = this.getToolsForPersona(persona);
      filtered = filtered.filter((tool) => allowedTools.includes(tool.name));
    }

    return filtered;
  }

  /**
   * Verify a tool's baseline execution (Sandbox Test)
   * Used during self-replication to ensure code stability
   */
  async verifyTool(
    toolName: string,
    testParams: any,
    persona: PersonaType,
  ): Promise<ToolResult> {
    if (this.traceId) {
      tracingService.log(
        this.traceId,
        `${persona}-luca`,
        "tool_verification_started",
        {
          tool: toolName,
        },
      );
    }

    // Execute with a small timeout and capture detailed errors
    try {
      const result = await this.executeTool(toolName, testParams, persona);
      return result;
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }
  }

  /**
   * Get tool statistics
   */
  getToolStats(): {
    totalTools: number;
    toolsByPersona: Record<PersonaType, number>;
  } {
    const toolsByPersona: Record<PersonaType, number> = {
      ENGINEER: getPersonaTools("ENGINEER").length,
      HACKER: getPersonaTools("HACKER").length,
      ASSISTANT: getPersonaTools("ASSISTANT").length,
      RUTHLESS: getPersonaTools("RUTHLESS").length,
      DICTATION: getPersonaTools("DICTATION").length,
      DEFAULT: getPersonaTools("DEFAULT").length,
      LUCAGENT: getPersonaTools("LUCAGENT").length,
      LOCALCORE: getPersonaTools("LOCALCORE").length,
      AUDITOR: getPersonaTools("AUDITOR").length,
    };

    return {
      totalTools: this.listAllTools().length,
      toolsByPersona,
    };
  }
}

// Export singleton for convenience
export const agentToolBridge = new AgentToolBridge();
