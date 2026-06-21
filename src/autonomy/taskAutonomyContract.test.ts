import { describe, expect, it } from "vitest";
import {
  createTaskAutonomyContractDiagnostics,
  createTaskAutonomyQuestion,
  evaluateTaskActionPermission,
  evaluateTaskPlanPermissions,
  getTaskAutonomyContractPreset,
  summarizeTaskAutonomyContract,
  type LucaTaskActionCategory,
  type LucaTaskAutonomyMode,
  type LucaTaskPlannedAction,
} from "./taskAutonomyContract";

const modes: LucaTaskAutonomyMode[] = ["ask_every_step", "balanced", "autopilot", "strict_privacy"];
const action = (category: LucaTaskActionCategory, overrides: Partial<LucaTaskPlannedAction> = {}): LucaTaskPlannedAction => ({
  actionId: `action:${category}`,
  label: category,
  category,
  riskLevel: "low",
  ...overrides,
});

describe("task autonomy contract presets", () => {
  it("defines every autonomy mode as a deterministic side-effect-free contract", () => {
    for (const mode of modes) {
      const first = getTaskAutonomyContractPreset(mode);
      const second = getTaskAutonomyContractPreset(mode);
      expect(first.mode).toBe(mode);
      expect(first.sideEffectsPerformed).toBe(false);
      expect(first).toEqual(second);
      expect(first).not.toBe(second);
    }
  });

  it("uses different source policies by mode", () => {
    expect(getTaskAutonomyContractPreset("autopilot").sourcePolicy.allowSocialResearch).toBe(true);
    expect(getTaskAutonomyContractPreset("strict_privacy").sourcePolicy.allowWebResearch).toBe(false);
    expect(getTaskAutonomyContractPreset("balanced").sourcePolicy).not.toEqual(getTaskAutonomyContractPreset("autopilot").sourcePolicy);
  });

  it("creates the pre-task autonomy question copy", () => {
    expect(createTaskAutonomyQuestion("research providers")).toContain("Which should I use for this task?");
    expect(createTaskAutonomyQuestion("research providers")).toContain("Strict privacy");
  });
});

describe("task autonomy action evaluation", () => {
  it("ask_every_step asks for most non-read-only actions", () => {
    const contract = getTaskAutonomyContractPreset("ask_every_step");
    expect(evaluateTaskActionPermission(contract, action("internal_reasoning", { riskLevel: "read_only" })).decision).toBe("allowed_without_prompt");
    expect(evaluateTaskActionPermission(contract, action("settings_change", { riskLevel: "medium" })).decision).toBe("explicit_approval_required");
    expect(evaluateTaskActionPermission(contract, action("file_write", { mayModifyFiles: true })).decision).toBe("explicit_approval_required");
  });

  it("balanced allows low-risk read-only actions but asks for settings, file, cloud, and system changes", () => {
    const contract = getTaskAutonomyContractPreset("balanced");
    expect(evaluateTaskActionPermission(contract, action("web_research", { riskLevel: "read_only" })).decision).toBe("allowed_without_prompt");
    expect(evaluateTaskActionPermission(contract, action("settings_change", { riskLevel: "medium" })).decision).toBe("explicit_approval_required");
    expect(evaluateTaskActionPermission(contract, action("file_write", { mayModifyFiles: true })).decision).toBe("explicit_approval_required");
    expect(evaluateTaskActionPermission(contract, action("cloud_data_transfer", { touchesCloud: true })).decision).toBe("explicit_approval_required");
    expect(evaluateTaskActionPermission(contract, action("local_runtime_start", { riskLevel: "high" })).decision).toBe("explicit_approval_required");
  });

  it("autopilot allows public research and diagnostics but asks for trust boundaries", () => {
    const contract = getTaskAutonomyContractPreset("autopilot");
    expect(evaluateTaskActionPermission(contract, action("web_research", { riskLevel: "read_only" })).decision).toBe("allowed_without_prompt");
    expect(evaluateTaskActionPermission(contract, action("news_research", { riskLevel: "read_only" })).decision).toBe("allowed_without_prompt");
    expect(evaluateTaskActionPermission(contract, action("local_system_scan", { riskLevel: "read_only" })).decision).toBe("allowed_without_prompt");
    expect(evaluateTaskActionPermission(contract, action("external_account_connect", { touchesExternalAccount: true })).decision).toBe("explicit_approval_required");
    expect(evaluateTaskActionPermission(contract, action("cloud_data_transfer", { touchesPrivateData: true, touchesCloud: true })).decision).toBe("explicit_approval_required");
  });

  it("strict_privacy blocks cloud transfer by default", () => {
    const contract = getTaskAutonomyContractPreset("strict_privacy");
    expect(evaluateTaskActionPermission(contract, action("cloud_data_transfer", { touchesCloud: true })).decision).toBe("blocked");
  });

  it.each(["api_key_storage", "software_install", "local_model_download", "message_send", "social_post"] as LucaTaskActionCategory[])(
    "%s always requires explicit approval",
    (category) => {
      for (const mode of modes) {
        const planned = action(category, { mayInstallSoftware: category === "software_install", maySendMessageOrPost: category === "message_send" || category === "social_post" });
        expect(evaluateTaskActionPermission(getTaskAutonomyContractPreset(mode), planned).decision).toBe("explicit_approval_required");
      }
    },
  );

  it("destructive delete actions are not allowed without approval", () => {
    for (const mode of modes) {
      const decision = evaluateTaskActionPermission(getTaskAutonomyContractPreset(mode), action("delete_or_destructive", { riskLevel: "high" })).decision;
      expect(["explicit_approval_required", "blocked"]).toContain(decision);
    }
  });

  it("keeps helpers pure and diagnostics secret-free", () => {
    const contract = getTaskAutonomyContractPreset("balanced");
    const original = JSON.stringify(contract);
    const evaluations = evaluateTaskPlanPermissions(contract, [action("web_research", { riskLevel: "read_only" }), action("api_key_storage", { label: "store sk-secret-value" })]);
    const diagnostics = createTaskAutonomyContractDiagnostics(contract, evaluations);
    expect(JSON.stringify(contract)).toBe(original);
    expect(evaluations.every((evaluation) => evaluation.sideEffectsPerformed === false)).toBe(true);
    expect(diagnostics.sideEffectsPerformed).toBe(false);
    expect(JSON.stringify(diagnostics)).not.toContain("sk-secret-value");
    expect(summarizeTaskAutonomyContract(contract)).toContain("Side effects performed: false");
  });
});
