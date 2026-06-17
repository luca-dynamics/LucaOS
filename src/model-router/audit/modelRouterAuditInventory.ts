export type ModelRouterAuditSeverity = "low" | "medium" | "high" | "critical";

export type ModelRouterAuditFindingType =
  | "hardcoded_fallback"
  | "duplicated_default"
  | "provider_split"
  | "local_model_gap"
  | "byok_gap"
  | "voice_route_gap"
  | "vision_route_gap"
  | "memory_route_gap"
  | "operation_trace_gap"
  | "hardware_fit_gap"
  | "settings_sync_gap"
  | "onboarding_sync_gap";

export type ModelRouterFallbackClassification =
  | "safe_default"
  | "unsafe_hardcoded_runtime_fallback"
  | "ui_only_label"
  | "test_fixture"
  | "documentation_example"
  | "legacy_constant"
  | "provider_compatibility_alias";

export interface ModelRouterAuditEntry {
  readonly id: string;
  readonly area: string;
  readonly filePath: string;
  readonly findingType: ModelRouterAuditFindingType;
  readonly severity: ModelRouterAuditSeverity;
  readonly summary: string;
  readonly recommendation: string;
  readonly safeToFixNow: boolean;
  readonly deferredReason?: string;
}

export interface ModelRouterFallbackFinding extends ModelRouterAuditEntry {
  readonly findingType: "hardcoded_fallback" | "duplicated_default";
  readonly classification: ModelRouterFallbackClassification;
  readonly modelReference?: string;
  readonly runtimePath: boolean;
  readonly hardwareChecked?: boolean;
}

export interface ModelRouterProviderFinding extends ModelRouterAuditEntry {
  readonly findingType: "provider_split" | "byok_gap";
  readonly providerPath: "luca_prime" | "local" | "byok" | "voice" | "vision" | "unknown";
}

export interface ModelRouterConsumerFinding extends ModelRouterAuditEntry {
  readonly findingType:
    | "voice_route_gap"
    | "vision_route_gap"
    | "memory_route_gap"
    | "settings_sync_gap"
    | "onboarding_sync_gap"
    | "operation_trace_gap"
    | "hardware_fit_gap"
    | "local_model_gap";
  readonly consumer: "chat" | "voice" | "vision" | "memory" | "settings" | "onboarding" | "operation_center" | "local_models";
}

export interface ModelRouterMigrationStep {
  readonly id: string;
  readonly order: number;
  readonly title: string;
  readonly summary: string;
  readonly dependsOn?: readonly string[];
  readonly deferred: boolean;
}

export interface ModelRouterAuditSummary {
  readonly totalFindings: number;
  readonly bySeverity: Record<ModelRouterAuditSeverity, number>;
  readonly byFindingType: Record<ModelRouterAuditFindingType, number>;
  readonly runtimeFallbackRiskCount: number;
}

export type AnyModelRouterAuditFinding =
  | ModelRouterFallbackFinding
  | ModelRouterProviderFinding
  | ModelRouterConsumerFinding
  | ModelRouterAuditEntry;

export const MODEL_ROUTER_AUDIT_INVENTORY: readonly AnyModelRouterAuditFinding[] = [
  {
    id: "provider-factory-groq-compat-fallback",
    area: "chat_provider_factory",
    filePath: "src/services/llm/ProviderFactory.ts",
    findingType: "hardcoded_fallback",
    severity: "medium",
    classification: "provider_compatibility_alias",
    modelReference: "llama3-70b-8192",
    runtimePath: true,
    hardwareChecked: false,
    summary: "Groq provider override maps non-Llama/Mixtral selections to a hardcoded Groq-compatible Llama model.",
    recommendation: "Move provider compatibility aliases into a capability registry and emit route trace metadata when an alias is used.",
    safeToFixNow: false,
    deferredReason: "Changing this now could alter active provider override behavior.",
  },
  {
    id: "provider-factory-unknown-provider-gemini-default",
    area: "chat_provider_factory",
    filePath: "src/services/llm/ProviderFactory.ts",
    findingType: "hardcoded_fallback",
    severity: "high",
    classification: "unsafe_hardcoded_runtime_fallback",
    modelReference: "BRAIN_CONFIG.defaults.brain",
    runtimePath: true,
    hardwareChecked: false,
    summary: "Unknown cloud provider routes are silently converted to a Gemini/Luca Prime adapter default.",
    recommendation: "Replace silent adapter construction with typed fallback policy, approval requirements, and diagnostics trace.",
    safeToFixNow: false,
    deferredReason: "The current behavior may be relied on as an emergency runtime fallback.",
  },
  {
    id: "settings-default-local-provider-cloud-stt",
    area: "settings_defaults",
    filePath: "src/services/settingsService.ts",
    findingType: "duplicated_default",
    severity: "medium",
    classification: "legacy_constant",
    modelReference: "cloud-gemini",
    runtimePath: true,
    hardwareChecked: false,
    summary: "Default settings prefer local Luca while voice STT defaults to a cloud-Gemini string.",
    recommendation: "Express default voice STT as a route request with mode, provider, and fallback policy instead of a string literal.",
    safeToFixNow: false,
    deferredReason: "Changing defaults could modify onboarding/runtime behavior.",
  },
  {
    id: "settings-hardware-migration-cloud-fallbacks",
    area: "settings_migration",
    filePath: "src/services/settingsService.ts",
    findingType: "hardware_fit_gap",
    severity: "high",
    consumer: "settings",
    summary: "Hardware migration rewrites memory, STT, vision, and brain selections to cloud defaults for Intel Mac/Windows CPU-mode cases.",
    recommendation: "Replace one-off hardware rewrites with a hardware-fit evaluator and user-visible fallback decision trace.",
    safeToFixNow: false,
    deferredReason: "This migration mutates persisted settings and needs a compatibility-safe replacement.",
  },
  {
    id: "readiness-prime-stt-cloud-gemini",
    area: "model_readiness",
    filePath: "src/services/models/ModelReadinessResolver.ts",
    findingType: "hardcoded_fallback",
    severity: "medium",
    classification: "safe_default",
    modelReference: "cloud-gemini",
    runtimePath: true,
    hardwareChecked: false,
    summary: "Prime STT route falls back to the cloud-gemini literal when no voice STT setting exists.",
    recommendation: "Move STT defaults into the shared route contract and provider capability registry.",
    safeToFixNow: false,
    deferredReason: "Route readiness is observable by onboarding and settings.",
  },
  {
    id: "readiness-local-candidate-first-ready",
    area: "model_readiness",
    filePath: "src/services/models/ModelReadinessResolver.ts",
    findingType: "local_model_gap",
    severity: "high",
    consumer: "local_models",
    summary: "Local readiness falls back to first ready/category model or first catalog candidate without a central hardware/privacy/task-fit score.",
    recommendation: "Add a hardware-fit evaluator before selecting local fallback candidates.",
    safeToFixNow: false,
    deferredReason: "Candidate choice can affect local routing and download prompts.",
  },
  {
    id: "vision-config-action-gemini-fallback",
    area: "vision_config",
    filePath: "src/config/vision.config.ts",
    findingType: "hardcoded_fallback",
    severity: "high",
    classification: "unsafe_hardcoded_runtime_fallback",
    modelReference: "gemini-2.0-flash",
    runtimePath: true,
    hardwareChecked: false,
    summary: "Vision action route embeds a Gemini fallback under ui-tars without central policy or Operation Center trace.",
    recommendation: "Model vision fallback as a typed route decision with approval, privacy, and latency metadata.",
    safeToFixNow: false,
    deferredReason: "Vision runtime selection should remain unchanged in this audit PR.",
  },
  {
    id: "voice-provider-router-preference-order",
    area: "voice_router",
    filePath: "src/services/voice/VoiceProviderRouter.ts",
    findingType: "voice_route_gap",
    severity: "medium",
    consumer: "voice",
    summary: "Voice provider router has a local/cloud/BYOK preference order scaffold but no model IDs, hardware fit, or shared route contract.",
    recommendation: "Bridge voice route requests to the shared LucaModelTaskType and LucaModelRouteTrace types in a follow-up.",
    safeToFixNow: false,
    deferredReason: "Voice provider scaffolds intentionally avoid live provider calls today.",
  },
  {
    id: "onboarding-byok-provider-model-map",
    area: "onboarding_model_mode",
    filePath: "src/services/onboarding/OnboardingModelModeCoordinator.ts",
    findingType: "byok_gap",
    severity: "medium",
    providerPath: "byok",
    summary: "BYOK onboarding maps providers to specific hardcoded model IDs outside a provider capability registry.",
    recommendation: "Move BYOK provider defaults into typed provider metadata with readiness and key requirements.",
    safeToFixNow: false,
    deferredReason: "Onboarding mode selection writes user settings and must be migrated carefully.",
  },
  {
    id: "operation-center-route-trace-gap",
    area: "operation_center_diagnostics",
    filePath: "src/operation-center/operationCenterBridge.ts",
    findingType: "operation_trace_gap",
    severity: "medium",
    consumer: "operation_center",
    summary: "Operation Center has status normalization but no model route decision trace schema wired to model routing.",
    recommendation: "Emit LucaModelRouteTrace once routing decisions are centralized.",
    safeToFixNow: false,
    deferredReason: "This PR only adds the trace type and documentation plan.",
  },
];

export const MODEL_ROUTER_MIGRATION_STEPS: readonly ModelRouterMigrationStep[] = [
  { id: "centralize-contract", order: 1, title: "Centralize Model Router Contract", summary: "Use shared task, provider, mode, fallback, and trace types as the contract boundary.", deferred: false },
  { id: "replace-fallback-constants", order: 2, title: "Replace scattered fallback constants", summary: "Replace hardcoded runtime fallbacks with typed fallback policy records.", dependsOn: ["centralize-contract"], deferred: true },
  { id: "provider-capability-registry", order: 3, title: "Add provider capability registry", summary: "Record provider model capabilities, aliases, key requirements, latency/cost posture, and supported tasks.", dependsOn: ["centralize-contract"], deferred: true },
  { id: "hardware-fit-evaluator", order: 4, title: "Add hardware-fit evaluator for local models", summary: "Score local models by RAM, VRAM, runtime availability, privacy, and task type before recommending fallback.", deferred: true },
  { id: "byok-readiness", order: 5, title: "Add BYOK readiness evaluator", summary: "Separate key availability, provider support, and user approval from raw model string selection.", deferred: true },
  { id: "route-decision-helper", order: 6, title: "Add Luca Prime / Local / BYOK decision helper", summary: "Create pure route decisions before adapter construction or setting writes.", deferred: true },
  { id: "operation-trace", order: 7, title: "Add Operation Center route trace", summary: "Surface task, provider, model, fallback, privacy, hardware, latency, cost, and requirements in diagnostics.", deferred: true },
  { id: "settings-onboarding-migration", order: 8, title: "Migrate onboarding and settings", summary: "Update mode selection and settings UI to consume shared route decisions.", deferred: true },
  { id: "subsystem-route-migration", order: 9, title: "Migrate voice / vision / memory / tool planning routes", summary: "Bring subsystem-specific routers under the shared routing contract without changing UX intent.", deferred: true },
  { id: "remove-unsafe-fallbacks", order: 10, title: "Remove unsafe hardcoded fallback behavior", summary: "Delete silent runtime fallbacks once typed policies and traces are live.", deferred: true },
];

export function isRuntimeFallbackRisk(finding: Pick<ModelRouterFallbackFinding, "classification" | "runtimePath" | "hardwareChecked">): boolean {
  if (!finding.runtimePath) return false;
  if (finding.classification === "unsafe_hardcoded_runtime_fallback") return true;
  if (finding.classification === "provider_compatibility_alias") return true;
  if (finding.classification === "safe_default") return finding.hardwareChecked === false;
  return false;
}

export function classifyModelFallbackFinding(input: {
  readonly runtimePath: boolean;
  readonly context: "runtime" | "ui" | "test" | "docs" | "legacy" | "provider_alias";
  readonly localModelWithoutHardwareCheck?: boolean;
  readonly missingByokPath?: boolean;
}): { classification: ModelRouterFallbackClassification; severity: ModelRouterAuditSeverity } {
  if (input.context === "test") return { classification: "test_fixture", severity: "low" };
  if (input.context === "docs") return { classification: "documentation_example", severity: "low" };
  if (input.context === "ui") return { classification: "ui_only_label", severity: "low" };
  if (input.context === "provider_alias") return { classification: "provider_compatibility_alias", severity: input.runtimePath ? "medium" : "low" };
  if (input.localModelWithoutHardwareCheck) return { classification: "unsafe_hardcoded_runtime_fallback", severity: "high" };
  if (input.missingByokPath) return { classification: "legacy_constant", severity: input.runtimePath ? "medium" : "low" };
  if (input.runtimePath) return { classification: "unsafe_hardcoded_runtime_fallback", severity: "high" };
  return { classification: "legacy_constant", severity: "low" };
}

export function summarizeModelRouterAudit(findings: readonly AnyModelRouterAuditFinding[]): ModelRouterAuditSummary {
  const bySeverity: Record<ModelRouterAuditSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  const byFindingType: Record<ModelRouterAuditFindingType, number> = {
    hardcoded_fallback: 0,
    duplicated_default: 0,
    provider_split: 0,
    local_model_gap: 0,
    byok_gap: 0,
    voice_route_gap: 0,
    vision_route_gap: 0,
    memory_route_gap: 0,
    operation_trace_gap: 0,
    hardware_fit_gap: 0,
    settings_sync_gap: 0,
    onboarding_sync_gap: 0,
  };

  let runtimeFallbackRiskCount = 0;
  for (const finding of findings) {
    bySeverity[finding.severity] += 1;
    byFindingType[finding.findingType] += 1;
    if (
      (finding.findingType === "hardcoded_fallback" || finding.findingType === "duplicated_default") &&
      isRuntimeFallbackRisk(finding as ModelRouterFallbackFinding)
    ) {
      runtimeFallbackRiskCount += 1;
    }
  }

  return {
    totalFindings: findings.length,
    bySeverity,
    byFindingType,
    runtimeFallbackRiskCount,
  };
}
