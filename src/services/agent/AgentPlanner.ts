/**
 * Agent Planner Service - Phase 9
 *
 * Breaks down goals into executable steps
 * Phase 9: LLM-based intelligent planning with rule-based fallback
 */

import type { AgentStep } from "./types";
import { CORTEX_URL } from "../../config/api";

export class AgentPlannerService {
  /**
   * Break down a goal into executable steps
   * Phase 9: LLM-based intelligent planning with rule-based fallback
   */
  async createPlan(goal: string): Promise<AgentStep[]> {
    console.log(`[AgentPlanner] Creating plan for: ${goal}`);

    // Try LLM-based planning first
    const llmPlan = await this.createPlanWithLLM(goal);

    if (llmPlan && llmPlan.length > 0) {
      console.log(
        `[AgentPlanner] ✅ Generated ${llmPlan.length} steps via LLM`,
      );
      return llmPlan;
    }

    // Fallback to rule-based planning
    console.log("[AgentPlanner] ⚠️ Falling back to rule-based planning");
    return this.createPlanWithRules(goal);
  }

  /**
   * LLM-based intelligent planning (Phase 9)
   */
  private async createPlanWithLLM(goal: string): Promise<AgentStep[] | null> {
    try {
      const response = await fetch(`${CORTEX_URL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are a task planning AI. Break down user goals into specific, executable steps.

Available tool categories:
- file_read, file_write: File operations
- terminal: Shell commands  
- web_search: Internet research
- ai: AI generation/analysis
- osint: Intelligence gathering

Return ONLY valid JSON array format:
[
  {
    "description": "Specific action to take",
    "tools": ["tool1", "tool2"],
    "estimatedComplexity": 1-10,
    "dependencies": [step_ids]
  }
]`,
            },
            {
              role: "user",
              content: `Goal: ${goal}\n\nGenerate execution plan:`,
            },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        console.warn(`[AgentPlanner] LLM API error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const planText = data.choices?.[0]?.message?.content || "";

      return this.parseLLMPlan(planText);
    } catch (error) {
      console.warn("[AgentPlanner] LLM planning failed:", error);
      return null;
    }
  }

  /**
   * Parse LLM response into AgentStep array
   */
  private parseLLMPlan(planText: string): AgentStep[] | null {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch =
        planText.match(/```json\n([\s\S]*?)\n```/) ||
        planText.match(/\[[\s\S]*\]/);

      if (!jsonMatch) {
        console.warn("[AgentPlanner] No JSON found in LLM response");
        return null;
      }

      const rawPlan = JSON.parse(jsonMatch[1] || jsonMatch[0]);

      if (!Array.isArray(rawPlan) || rawPlan.length === 0) {
        console.warn("[AgentPlanner] Invalid plan structure from LLM");
        return null;
      }

      // Convert to AgentStep format
      const steps = rawPlan.map((step, idx) => ({
        id: idx + 1,
        description: step.description || "Unknown step",
        status: "pending" as const,
        estimatedComplexity: step.estimatedComplexity || 5,
        requiredTools: step.tools || ["ai"],
        successCriteria: this.generateSuccessCriteria(step.description || ""),
        dependencies: step.dependencies || [],
      }));

      // Validate plan
      if (!this.validatePlan(steps)) {
        console.warn("[AgentPlanner] Plan validation failed");
        return null;
      }

      return steps;
    } catch (error) {
      console.warn("[AgentPlanner] Plan parsing failed:", error);
      return null;
    }
  }

  /**
   * Validate plan structure
   */
  private validatePlan(plan: AgentStep[]): boolean {
    return plan.every(
      (step) =>
        step.description?.length > 0 &&
        Array.isArray(step.requiredTools) &&
        step.requiredTools.length > 0 &&
        step.estimatedComplexity >= 1 &&
        step.estimatedComplexity <= 10,
    );
  }

  /**
   * Rule-based planning (fallback for Phase 9)
   */
  private createPlanWithRules(goal: string): AgentStep[] {
    // Rule-based heuristic planning
    const steps: AgentStep[] = [];

    // Analyze goal to determine steps
    const goalLower = goal.toLowerCase();

    // Common patterns
    if (goalLower.includes("build") || goalLower.includes("create")) {
      steps.push(
        this.createStep(1, "Analyze requirements", 3, ["file_read"], []),
        this.createStep(2, "Plan architecture", 4, ["ai"], [1]),
        this.createStep(
          3,
          "Implement core functionality",
          7,
          ["file_write", "ai"],
          [2],
        ),
        this.createStep(4, "Add error handling", 5, ["file_write"], [3]),
        this.createStep(
          5,
          "Write tests",
          6,
          ["file_write", "terminal"],
          [3, 4],
        ),
        this.createStep(6, "Run quality checks", 4, ["terminal", "lint"], [5]),
        this.createStep(
          7,
          "Verify visually (if UI)",
          5,
          ["browser", "vision"],
          [6],
        ),
      );
    } else if (goalLower.includes("fix") || goalLower.includes("debug")) {
      steps.push(
        this.createStep(
          1,
          "Analyze error/bug",
          4,
          ["file_read", "terminal"],
          [],
        ),
        this.createStep(2, "Identify root cause", 5, ["ai", "file_read"], [1]),
        this.createStep(3, "Implement fix", 6, ["file_write"], [2]),
        this.createStep(4, "Test fix", 5, ["terminal"], [3]),
        this.createStep(
          5,
          "Verify no regressions",
          4,
          ["terminal", "lint"],
          [4],
        ),
      );
    } else if (
      goalLower.includes("system audit") ||
      goalLower.includes("self audit") ||
      goalLower.includes("governance audit")
    ) {
      steps.push(
        this.createStep(1, "Retrieve current system configuration", 3, ["getSystemSettings"], []),
        this.createStep(2, "Analyze configuration for inconsistencies or risks", 5, ["ai"], [1]),
        this.createStep(3, "Run formal system audit protocol", 4, ["auditSystem"], [1, 2]),
        this.createStep(4, "Repair or optimize configuration findings", 6, ["updateSystemSettings", "repairSystem"], [3]),
      );
    } else if (
      goalLower.includes("security") ||
      goalLower.includes("audit") ||
      goalLower.includes("pentest")
    ) {
      steps.push(
        this.createStep(1, "Scan for vulnerabilities", 5, ["hacking"], []),
        this.createStep(
          2,
          "Verify discovered vulnerabilities",
          6,
          ["hacking"],
          [1],
        ),
        this.createStep(
          3,
          "Implement security fixes for verified findings",
          7,
          ["ai", "file_write"],
          [2],
        ),
        this.createStep(4, "Verify fixes", 5, ["terminal", "hacking"], [3]),
      );
    } else if (
      goalLower.includes("research") ||
      goalLower.includes("analyze")
    ) {
      steps.push(
        this.createStep(
          1,
          "Gather information",
          5,
          ["web_search", "osint"],
          [],
        ),
        this.createStep(2, "Analyze data", 6, ["ai"], [1]),
        this.createStep(3, "Synthesize findings", 5, ["ai"], [2]),
        this.createStep(4, "Create report", 4, ["file_write"], [3]),
      );
    } else if (goalLower.includes("read") && goalLower.includes("file")) {
      // Simple file read task
      steps.push(this.createStep(1, goal, 2, ["file_read"], []));
    } else if (goalLower.includes("package.json")) {
      // Package.json specific task
      steps.push(
        this.createStep(1, "Read package.json file", 2, ["file_read"], []),
      );
    } else if (goalLower.includes("write") || goalLower.includes("update")) {
      // Simple file write task
      steps.push(this.createStep(1, goal, 4, ["file_write"], []));
    } else {
      // Generic plan - make it MORE specific
      steps.push(
        this.createStep(1, goal, 5, ["ai", "file_read", "file_write"], []),
      );
    }

    console.log(`[AgentPlanner] Created plan with ${steps.length} steps`);
    return steps;
  }

  /**
   * Helper to create a step
   */
  private createStep(
    id: number,
    description: string,
    complexity: number,
    tools: string[],
    dependencies: number[],
  ): AgentStep {
    return {
      id,
      description,
      status: "pending",
      estimatedComplexity: complexity,
      requiredTools: tools,
      successCriteria: this.generateSuccessCriteria(description),
      dependencies,
    };
  }

  /**
   * Generate success criteria for a step
   */
  private generateSuccessCriteria(description: string): string[] {
    const criteria: string[] = [];

    if (description.includes("test")) {
      criteria.push("All tests pass");
      criteria.push("No test failures");
    }

    if (description.includes("implement") || description.includes("write")) {
      criteria.push("Code compiles without errors");
      criteria.push("No lint warnings");
    }

    if (description.includes("fix")) {
      criteria.push("Bug no longer reproduces");
      criteria.push("Tests pass");
    }

    if (description.includes("verify") || description.includes("check")) {
      criteria.push("All checks pass");
    }

    // Default
    if (criteria.length === 0) {
      criteria.push("Task completed successfully");
    }

    return criteria;
  }

  /**
   * Select next step to execute based on dependencies
   */
  selectNextStep(steps: AgentStep[]): AgentStep | null {
    // Find first pending step whose dependencies are all complete
    for (const step of steps) {
      if (step.status !== "pending") continue;

      // Check if all dependencies are complete
      const dependenciesComplete = step.dependencies.every((depId) => {
        const depStep = steps.find((s) => s.id === depId);
        return depStep?.status === "complete";
      });

      if (dependenciesComplete) {
        return step;
      }
    }

    return null; // No executable step found
  }

  /**
   * Check if all steps are complete
   */
  isGoalComplete(steps: AgentStep[]): boolean {
    return steps.every((s) => s.status === "complete");
  }

  /**
   * Get progress percentage
   */
  getProgress(steps: AgentStep[]): number {
    const completed = steps.filter((s) => s.status === "complete").length;
    return Math.round((completed / steps.length) * 100);
  }
}

export const agentPlanner = new AgentPlannerService();
