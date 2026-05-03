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
import { ToolRegistry } from "../../toolRegistry";

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

const BACKEND_EXECUTABLE_TOOLS = new Set([
  "readFile",
  "writeProjectFile",
  "listFiles",
  "batchAnalyzeAndOrganizeDirectory",
  "executeTerminalCommand",
  "runPythonScript",
  "auditSourceCode",
  "osintUsernameSearch",
  "osintDomainIntel",
  "osintDarkWebScan",
  "storeMemory",
  "retrieveMemory",
  "reconcileMemories",
  "getSystemSettings",
  "updateSystemSettings",
  "controlSystem",
  "readClipboard",
  "writeClipboard",
  "system_doctor",
  "readUrl",
  "addGraphRelations",
  "queryGraphKnowledge",
  "createTask",
  "updateTaskStatus",
  "manageGoals",
  "createCustomSkill",
  "generateAndRegisterSkill",
  "listCustomSkills",
  "executeCustomSkill",
  "executeRpcScript",
  "listSubsystems",
  "startSubsystem",
]);

/**
 * Bridge between Agent Workforce and Luca's tool ecosystem
 */
export class AgentToolBridge {
  private traceId?: string;

  constructor(traceId?: string) {
    this.traceId = traceId;
  }

  /**
   * Runtime-registered tools are the source of truth for what this build can
   * actually expose to the workforce right now.
   */
  private getRegisteredToolNames(): Set<string> {
    return new Set(
      ToolRegistry.getAll()
        .map((tool) => tool.name)
        .filter((name): name is string => Boolean(name)),
    );
  }

  /**
   * Persona access is still modeled separately, but we intersect it with the
   * live registry so the workforce does not advertise unavailable tools.
   */
  private getAvailablePersonaToolNames(persona: PersonaType): string[] {
    const registeredToolNames = this.getRegisteredToolNames();
    return getPersonaTools(persona).filter((toolName) =>
      registeredToolNames.has(toolName) &&
      BACKEND_EXECUTABLE_TOOLS.has(toolName),
    );
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
    const availablePersonaTools = this.getAvailablePersonaToolNames(persona);

    if (
      !hasToolAccess(persona, toolName) ||
      !availablePersonaTools.includes(toolName)
    ) {
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
    return this.getAvailablePersonaToolNames(persona);
  }

  /**
   * List all available tools (200+)
   */
  listAllTools(): ToolDefinition[] {
    const tools: ToolDefinition[] = [];
    const registeredToolNames = this.getRegisteredToolNames();

    for (const tool of ToolRegistry.getAll()) {
      const name = tool.name;
      if (!name || !registeredToolNames.has(name)) continue;
      const schema = ToolSchemas[name as keyof typeof ToolSchemas];
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
      ENGINEER: this.getToolsForPersona("ENGINEER").length,
      HACKER: this.getToolsForPersona("HACKER").length,
      ASSISTANT: this.getToolsForPersona("ASSISTANT").length,
      RUTHLESS: this.getToolsForPersona("RUTHLESS").length,
      DICTATION: this.getToolsForPersona("DICTATION").length,
      DEFAULT: this.getToolsForPersona("DEFAULT").length,
      LUCAGENT: this.getToolsForPersona("LUCAGENT").length,
      LOCALCORE: this.getToolsForPersona("LOCALCORE").length,
      AUDITOR: this.getToolsForPersona("AUDITOR").length,
    };

    return {
      totalTools: this.listAllTools().length,
      toolsByPersona,
    };
  }
}

// Export singleton for convenience
export const agentToolBridge = new AgentToolBridge();
