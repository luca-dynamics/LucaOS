export type LucaTaskAutonomyMode =
  | "ask_every_step"
  | "balanced"
  | "autopilot"
  | "strict_privacy";

export type LucaTaskActionRiskLevel =
  | "read_only"
  | "low"
  | "medium"
  | "high"
  | "blocked";

export type LucaTaskActionCategory =
  | "internal_reasoning"
  | "provider_route_selection"
  | "local_system_scan"
  | "web_research"
  | "social_research"
  | "news_research"
  | "file_read"
  | "file_write"
  | "settings_change"
  | "provider_connection_test"
  | "api_key_storage"
  | "cloud_data_transfer"
  | "local_runtime_start"
  | "local_model_download"
  | "software_install"
  | "external_account_connect"
  | "message_send"
  | "social_post"
  | "payment_or_cost"
  | "delete_or_destructive"
  | "mcp_or_tool_execution"
  | "unknown";

export type LucaTaskPermissionDecision =
  | "allowed_without_prompt"
  | "soft_confirm"
  | "explicit_approval_required"
  | "blocked";

export interface LucaTaskSourceResearchPolicy {
  readonly allowWebResearch: boolean;
  readonly allowSocialResearch: boolean;
  readonly allowNewsResearch: boolean;
  readonly preferOfficialSources: boolean;
  readonly requireSourceAttribution: boolean;
  readonly allowUnverifiedCommunitySignals: boolean;
}

export interface LucaTaskAutonomyContract {
  readonly contractId: string;
  readonly taskId?: string;
  readonly mode: LucaTaskAutonomyMode;
  readonly title: string;
  readonly description: string;
  readonly allowedWithoutPrompt: readonly LucaTaskActionCategory[];
  readonly softConfirmCategories: readonly LucaTaskActionCategory[];
  readonly explicitApprovalCategories: readonly LucaTaskActionCategory[];
  readonly blockedCategories: readonly LucaTaskActionCategory[];
  readonly privacyNotes: readonly string[];
  readonly sourcePolicy: LucaTaskSourceResearchPolicy;
  readonly sideEffectsPerformed: false;
}

export interface LucaTaskPlannedAction {
  readonly actionId: string;
  readonly label: string;
  readonly category: LucaTaskActionCategory;
  readonly riskLevel: LucaTaskActionRiskLevel;
  readonly touchesPrivateData?: boolean;
  readonly touchesCloud?: boolean;
  readonly touchesExternalAccount?: boolean;
  readonly mayCostMoney?: boolean;
  readonly mayInstallSoftware?: boolean;
  readonly mayModifyFiles?: boolean;
  readonly maySendMessageOrPost?: boolean;
}

export interface LucaTaskPermissionEvaluation {
  readonly actionId: string;
  readonly category: LucaTaskActionCategory;
  readonly riskLevel: LucaTaskActionRiskLevel;
  readonly decision: LucaTaskPermissionDecision;
  readonly reason: string;
  readonly contractMode: LucaTaskAutonomyMode;
  readonly sideEffectsPerformed: false;
}

const TRUST_BOUNDARY_CATEGORIES = new Set<LucaTaskActionCategory>([
  "api_key_storage",
  "cloud_data_transfer",
  "local_runtime_start",
  "local_model_download",
  "software_install",
  "external_account_connect",
  "message_send",
  "social_post",
  "payment_or_cost",
  "delete_or_destructive",
]);

const ALWAYS_EXPLICIT = new Set<LucaTaskActionCategory>([
  "api_key_storage",
  "software_install",
  "local_model_download",
  "message_send",
  "social_post",
  "payment_or_cost",
]);

const presets: Record<LucaTaskAutonomyMode, LucaTaskAutonomyContract> = {
  ask_every_step: {
    contractId: "task-autonomy-preset:ask_every_step",
    mode: "ask_every_step",
    title: "Ask every step",
    description: "Luca asks before almost every meaningful non-read-only action.",
    allowedWithoutPrompt: ["internal_reasoning", "provider_route_selection"],
    softConfirmCategories: ["local_system_scan", "web_research", "news_research", "file_read"],
    explicitApprovalCategories: ["social_research", "file_write", "settings_change", "provider_connection_test", "api_key_storage", "cloud_data_transfer", "local_runtime_start", "local_model_download", "software_install", "external_account_connect", "message_send", "social_post", "payment_or_cost", "delete_or_destructive", "mcp_or_tool_execution", "unknown"],
    blockedCategories: [],
    privacyNotes: ["Read-only reasoning and diagnostics may proceed; meaningful actions ask first."],
    sourcePolicy: { allowWebResearch: true, allowSocialResearch: false, allowNewsResearch: true, preferOfficialSources: true, requireSourceAttribution: true, allowUnverifiedCommunitySignals: false },
    sideEffectsPerformed: false,
  },
  balanced: {
    contractId: "task-autonomy-preset:balanced",
    mode: "balanced",
    title: "Balanced",
    description: "Luca proceeds with low-risk read-only work and asks at medium/high-risk boundaries.",
    allowedWithoutPrompt: ["internal_reasoning", "provider_route_selection", "local_system_scan", "web_research", "news_research", "file_read"],
    softConfirmCategories: ["social_research", "mcp_or_tool_execution"],
    explicitApprovalCategories: ["file_write", "settings_change", "provider_connection_test", "api_key_storage", "cloud_data_transfer", "local_runtime_start", "local_model_download", "software_install", "external_account_connect", "message_send", "social_post", "payment_or_cost", "delete_or_destructive", "unknown"],
    blockedCategories: [],
    privacyNotes: ["Low-risk public research and diagnostics are allowed; changes and transfers require approval."],
    sourcePolicy: { allowWebResearch: true, allowSocialResearch: false, allowNewsResearch: true, preferOfficialSources: true, requireSourceAttribution: true, allowUnverifiedCommunitySignals: false },
    sideEffectsPerformed: false,
  },
  autopilot: {
    contractId: "task-autonomy-preset:autopilot",
    mode: "autopilot",
    title: "Autopilot",
    description: "Luca uses judgment for safe planning/research and asks only at trust boundaries.",
    allowedWithoutPrompt: ["internal_reasoning", "provider_route_selection", "local_system_scan", "web_research", "social_research", "news_research", "file_read", "mcp_or_tool_execution"],
    softConfirmCategories: ["settings_change", "provider_connection_test", "file_write", "unknown"],
    explicitApprovalCategories: ["api_key_storage", "cloud_data_transfer", "local_runtime_start", "local_model_download", "software_install", "external_account_connect", "message_send", "social_post", "payment_or_cost", "delete_or_destructive"],
    blockedCategories: [],
    privacyNotes: ["Private data, account use, cost, install, runtime, messaging, and destructive boundaries still require approval."],
    sourcePolicy: { allowWebResearch: true, allowSocialResearch: true, allowNewsResearch: true, preferOfficialSources: true, requireSourceAttribution: true, allowUnverifiedCommunitySignals: true },
    sideEffectsPerformed: false,
  },
  strict_privacy: {
    contractId: "task-autonomy-preset:strict_privacy",
    mode: "strict_privacy",
    title: "Strict privacy",
    description: "Luca keeps work local/private and avoids cloud or external actions unless explicitly approved.",
    allowedWithoutPrompt: ["internal_reasoning", "provider_route_selection", "local_system_scan"],
    softConfirmCategories: [],
    explicitApprovalCategories: ["web_research", "news_research", "file_read", "file_write", "settings_change", "provider_connection_test", "api_key_storage", "local_runtime_start", "local_model_download", "software_install", "external_account_connect", "message_send", "social_post", "payment_or_cost", "delete_or_destructive", "mcp_or_tool_execution", "unknown"],
    blockedCategories: ["cloud_data_transfer", "social_research"],
    privacyNotes: ["Cloud transfer and social research are blocked by default.", "Private-local tasks must not widen to cloud without explicit approval."],
    sourcePolicy: { allowWebResearch: false, allowSocialResearch: false, allowNewsResearch: false, preferOfficialSources: true, requireSourceAttribution: true, allowUnverifiedCommunitySignals: false },
    sideEffectsPerformed: false,
  },
};

const copyContract = (contract: LucaTaskAutonomyContract): LucaTaskAutonomyContract => ({
  ...contract,
  allowedWithoutPrompt: [...contract.allowedWithoutPrompt],
  softConfirmCategories: [...contract.softConfirmCategories],
  explicitApprovalCategories: [...contract.explicitApprovalCategories],
  blockedCategories: [...contract.blockedCategories],
  privacyNotes: [...contract.privacyNotes],
  sourcePolicy: { ...contract.sourcePolicy },
  sideEffectsPerformed: false,
});

export function getTaskAutonomyContractPreset(mode: LucaTaskAutonomyMode): LucaTaskAutonomyContract {
  return copyContract(presets[mode]);
}

export function evaluateTaskActionPermission(contract: LucaTaskAutonomyContract, action: LucaTaskPlannedAction): LucaTaskPermissionEvaluation {
  let decision: LucaTaskPermissionDecision | undefined;
  let reason = "Matched contract category policy.";

  if (action.riskLevel === "blocked" || contract.blockedCategories.includes(action.category)) {
    decision = "blocked";
    reason = "The action is blocked by the selected autonomy contract.";
  } else if (ALWAYS_EXPLICIT.has(action.category)) {
    decision = "explicit_approval_required";
    reason = "This action always requires explicit approval.";
  } else if (action.category === "delete_or_destructive") {
    decision = contract.mode === "strict_privacy" ? "explicit_approval_required" : "explicit_approval_required";
    reason = "Destructive actions require explicit approval.";
  } else if (contract.mode === "strict_privacy" && (action.touchesCloud || action.touchesExternalAccount)) {
    decision = "explicit_approval_required";
    reason = "Strict privacy requires approval before cloud or external-account boundaries.";
  } else if (action.touchesPrivateData && action.touchesCloud) {
    decision = "explicit_approval_required";
    reason = "Moving private data to cloud requires explicit approval.";
  } else if (action.mayCostMoney || action.mayInstallSoftware || action.maySendMessageOrPost) {
    decision = "explicit_approval_required";
    reason = "Cost, install, or messaging side effects require explicit approval.";
  } else if (action.mayModifyFiles) {
    decision = contract.mode === "autopilot" ? "soft_confirm" : "explicit_approval_required";
    reason = "File mutation needs user confirmation before live wiring.";
  } else if (contract.explicitApprovalCategories.includes(action.category) || (contract.mode === "autopilot" && TRUST_BOUNDARY_CATEGORIES.has(action.category))) {
    decision = "explicit_approval_required";
  } else if (contract.softConfirmCategories.includes(action.category)) {
    decision = "soft_confirm";
  } else if (contract.allowedWithoutPrompt.includes(action.category) && (action.riskLevel === "read_only" || action.riskLevel === "low")) {
    decision = "allowed_without_prompt";
  } else if (action.riskLevel === "medium" || action.riskLevel === "high") {
    decision = contract.mode === "autopilot" ? "soft_confirm" : "explicit_approval_required";
    reason = "Medium/high-risk actions need confirmation under this contract.";
  } else {
    decision = "soft_confirm";
    reason = "Unknown or uncategorized low-risk action should be confirmed.";
  }

  return { actionId: action.actionId, category: action.category, riskLevel: action.riskLevel, decision, reason, contractMode: contract.mode, sideEffectsPerformed: false };
}

export const evaluateTaskPlanPermissions = (contract: LucaTaskAutonomyContract, actions: readonly LucaTaskPlannedAction[]) =>
  actions.map((action) => evaluateTaskActionPermission(contract, action));

export function summarizeTaskAutonomyContract(contract: LucaTaskAutonomyContract): string {
  return `${contract.title}: ${contract.description} Allowed without prompt: ${contract.allowedWithoutPrompt.join(", ") || "none"}. Explicit approval: ${contract.explicitApprovalCategories.join(", ") || "none"}. Blocked: ${contract.blockedCategories.join(", ") || "none"}. Side effects performed: false.`;
}

export function createTaskAutonomyContractDiagnostics(contract: LucaTaskAutonomyContract, evaluations: readonly LucaTaskPermissionEvaluation[]) {
  return {
    contractId: contract.contractId,
    mode: contract.mode,
    title: contract.title,
    allowedCategories: [...contract.allowedWithoutPrompt],
    softConfirmCategories: [...contract.softConfirmCategories],
    explicitApprovalCategories: [...contract.explicitApprovalCategories],
    blockedCategories: [...contract.blockedCategories],
    sourcePolicy: { ...contract.sourcePolicy },
    evaluationCounts: evaluations.reduce<Record<LucaTaskPermissionDecision, number>>((counts, evaluation) => {
      counts[evaluation.decision] += 1;
      return counts;
    }, { allowed_without_prompt: 0, soft_confirm: 0, explicit_approval_required: 0, blocked: 0 }),
    sideEffectsPerformed: false as const,
  };
}

export function createTaskAutonomyQuestion(taskSummary: string): string {
  const intro = taskSummary.trim() ? `For “${taskSummary.trim()}”, I can handle this in different autonomy modes:` : "I can handle this in different autonomy modes:";
  return `${intro}\n- Ask every step\n- Balanced\n- Autopilot\n- Strict privacy\n\nWhich should I use for this task?`;
}
