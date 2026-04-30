import { ToolRegistry } from "../../services/toolRegistry";
import {
  autonomousWebBrowseTool,
  manageGoalsTool,
  openAutonomyDashboardTool,
  executeRpcScriptTool,
  createCustomSkillTool,
  generateAndRegisterSkillTool,
  executeCustomSkillTool,
  listCustomSkillsTool,
} from "../definitions";

/**
 * AutonomousProvider
 * Bridges the modular ToolRegistry with the core Agent engine
 */
export const AutonomousProvider = {
  register: () => {
    // 1. Goal Management
    ToolRegistry.register(
      manageGoalsTool,
      "CORE",
      ["goals", "autonomous", "management", "long-term"],
      async (args, _context) => {
        const { managementService, lucaWorkforce } = _context;
        const { action, description, schedule, id } = args;

        if (action === "ADD" && description) {
          // Check if goal should be multi-persona (Phase 8 Integrated Strategy)
          const isWorkforce =
            args.useWorkforce ||
            description.toLowerCase().includes("workforce");

          if (isWorkforce && lucaWorkforce) {
            const workflowId = await lucaWorkforce.startWorkflow(
              description,
              "default",
            );
            return `WORKFORCE INITIALIZED: Starting parallel lane execution for goal: "${description}". Workflow ID: ${workflowId}`;
          }

          if (managementService) {
            await managementService.addGoal({
              description,
              schedule,
              type: schedule ? "RECURRING" : "ONCE",
            });
            return `GOAL ADDED: "${description}" has been added to the autonomous queue.`;
          }
        }

        if (action === "LIST" && managementService) {
          const goals = await managementService.getGoals();
          return JSON.stringify(goals, null, 2);
        }

        if (action === "DELETE" && id && managementService) {
          await managementService.removeGoal(id);
          return `GOAL DELETED: ${id}`;
        }

        return "Goal management action failed or service unavailable.";
      },
    );

    // 2. Autonomous Web Browsing
    ToolRegistry.register(
      autonomousWebBrowseTool,
      "CORE",
      ["browse", "web", "ghost", "nav"],
      async (args, context) => {
        // This will eventually call the specific GhostBrowser engine
        return `AUTONOMOUS BROWSE INITIALIZED: Moving to "${args.url || "google.com"}" to achieve: "${args.goal}"`;
      },
    );

    // 3. UI Dashboard
    ToolRegistry.register(
      openAutonomyDashboardTool,
      "SYSTEM",
      ["ui", "dashboard", "autonomy"],
      async (_args, context) => {
        const { uiNotificationService } = context;
        uiNotificationService?.notify("OPEN_DASHBOARD", { type: "AUTONOMY" });
        return "Dashboard triggered.";
      },
    );

    // 4. Custom Skills & Self-Evolution (PHASE 8C)
    ToolRegistry.register(
      generateAndRegisterSkillTool,
      "DEV",
      ["evolve", "learn", "create", "tool"],
      async (args, context) => {
        const { learningEngine } = context;
        if (learningEngine) {
          const result = await learningEngine.generateSkill(
            args.description,
            args.language,
          );
          return `SKILL GENERATED: ${result.name}. Logic: ${result.summary}`;
        }
        return "Learning engine unavailable.";
      },
    );

    ToolRegistry.register(
      executeRpcScriptTool,
      "SYSTEM",
      ["rpc", "script", "automation"],
      async (args) => {
        return `RPC Script execution requested with ${Object.keys(args.script || {}).length} steps.`;
      },
    );

    ToolRegistry.register(
      createCustomSkillTool,
      "DEV",
      ["create", "skill"],
      async (args) => {
        return `Custom skill "${args.name}" creation initialized.`;
      },
    );

    ToolRegistry.register(
      executeCustomSkillTool,
      "DEV",
      ["run", "skill"],
      async (args) => {
        // Logic handled via Cortex or dynamic eval
        return `Custom skill "${args.skillName}" execution requested.`;
      },
    );

    ToolRegistry.register(
      listCustomSkillsTool,
      "DEV",
      ["list", "skills"],
      async () => {
        return "Retrieving custom skill registry...";
      },
    );
  },
};
