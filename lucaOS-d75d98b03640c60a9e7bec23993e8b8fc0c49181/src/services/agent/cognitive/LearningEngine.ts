/**
 * Phase 10 Stage 4 - Learning Engine
 * AI-powered pattern detection and improvement suggestions
 */

import type { WorkflowExecution } from "./WorkflowMemory";
import type { AgentStep } from "../types";

/**
 * Learning insights from workflow analysis
 */
export interface LearningInsight {
  type: "success_pattern" | "failure_pattern" | "improvement" | "warning";
  message: string;
  confidence: number; // 0-1
  relatedExecutions: string[]; // Execution IDs
}

/**
 * Pattern detected in workflow executions
 */
export interface WorkflowPattern {
  pattern: string;
  occurrences: number;
  successRate: number;
  examples: WorkflowExecution[];
}

export class LearningEngine {
  private isEnabled: boolean = false;

  constructor() {
    // Will be enabled when LLM integration is active
    this.isEnabled = false;
    console.log("[LearningEngine] Offline mode (LLM not integrated yet)");
  }

  /**
   * Analyze workflow failures to identify patterns
   */
  async analyzeFailures(
    goal: string,
    failedExecutions: WorkflowExecution[]
  ): Promise<LearningInsight[]> {
    if (!this.isEnabled || failedExecutions.length === 0) {
      return [];
    }

    try {
      // Future: Use LLM to analyze patterns
      // const response = await fetch('/chat/completions', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     messages: [{
      //       role: 'system',
      //       content: 'Analyze workflow failures and identify patterns'
      //     }, {
      //       role: 'user',
      //       content: JSON.stringify({
      //         goal,
      //         failures: failedExecutions.map(e => ({
      //           steps: e.steps,
      //           errors: e.errors,
      //           toolsUsed: e.toolsUsed
      //         }))
      //       })
      //     }],
      //     temperature: 0.3
      //   })
      // });

      console.log(
        "[LearningEngine] Analyzed",
        failedExecutions.length,
        "failures"
      );
      return [];
    } catch (error) {
      console.error("[LearningEngine] Failure analysis failed:", error);
      return [];
    }
  }

  /**
   * Detect patterns across successful executions
   */
  async detectSuccessPatterns(
    executions: WorkflowExecution[]
  ): Promise<WorkflowPattern[]> {
    if (!this.isEnabled || executions.length < 3) {
      return [];
    }

    try {
      // Future: LLM-based pattern detection
      // Group by goal similarity
      // Identify common tool sequences
      // Find optimal step counts

      console.log(
        "[LearningEngine] Patterns detected from",
        executions.length,
        "executions"
      );
      return [];
    } catch (error) {
      console.error("[LearningEngine] Pattern detection failed:", error);
      return [];
    }
  }

  /**
   * Suggest improvements for a specific goal based on history
   */
  async suggestImprovements(
    goal: string,
    pastExecutions: WorkflowExecution[]
  ): Promise<LearningInsight[]> {
    if (!this.isEnabled || pastExecutions.length === 0) {
      return [];
    }

    try {
      const insights: LearningInsight[] = [];

      // Analyze success vs failure rate
      const successful = pastExecutions.filter((e) => e.success);
      const failed = pastExecutions.filter((e) => !e.success);

      if (failed.length > 0) {
        // Get failure insights
        const failureInsights = await this.analyzeFailures(goal, failed);
        insights.push(...failureInsights);
      }

      if (successful.length > 0) {
        // Get success patterns
        const patterns = await this.detectSuccessPatterns(successful);

        // Convert patterns to insights
        patterns.forEach((pattern) => {
          insights.push({
            type: "success_pattern",
            message: `Success pattern: ${pattern.pattern} (${Math.round(
              pattern.successRate * 100
            )}% success rate)`,
            confidence: pattern.successRate,
            relatedExecutions: pattern.examples.map((e) => e.id),
          });
        });
      }

      // Future: Use LLM to generate specific suggestions
      // const response = await fetch('/chat/completions', {
      //   body: JSON.stringify({
      //     messages: [{
      //       role: 'system',
      //       content: 'Suggest workflow improvements based on history'
      //     }, {
      //       role: 'user',
      //       content: JSON.stringify({ goal, successful, failed })
      //     }]
      //   })
      // });

      console.log("[LearningEngine] Generated", insights.length, "insights");
      return insights;
    } catch (error) {
      console.error("[LearningEngine] Suggestion generation failed:", error);
      return [];
    }
  }

  /**
   * Predict likely success for a planned workflow
   */
  async predictSuccess(
    goal: string,
    plannedSteps: AgentStep[],
    pastExecutions: WorkflowExecution[]
  ): Promise<number> {
    if (!this.isEnabled || pastExecutions.length === 0) {
      return 0.5; // Neutral prediction
    }

    try {
      // Future: ML-based success prediction
      // Compare planned steps with successful patterns
      // Factor in past failures
      // Return confidence score 0-1

      console.log("[LearningEngine] Predicted success for:", goal);
      return 0.5;
    } catch (error) {
      console.error("[LearningEngine] Prediction failed:", error);
      return 0.5;
    }
  }

  /**
   * Learn from a completed execution
   * Updates internal knowledge and patterns
   */
  async learnFromExecution(execution: WorkflowExecution): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      // Future: Update internal patterns
      // Reinforce successful patterns
      // Learn from failures
      // Update success predictions

      console.log("[LearningEngine] Learned from execution:", execution.id);
    } catch (error) {
      console.error("[LearningEngine] Learning failed:", error);
    }
  }
}

// Export singleton
let learningEngineInstance: LearningEngine | null = null;

export function getLearningEngine(): LearningEngine {
  if (!learningEngineInstance) {
    learningEngineInstance = new LearningEngine();
  }
  return learningEngineInstance;
}
