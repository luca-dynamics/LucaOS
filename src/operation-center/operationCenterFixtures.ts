import { personalIntelligenceRuntimeAuthorityFixtures } from "../personal-intelligence/runtimeAuthority";
import { personalIntelligenceSkillDryRunFixtures } from "../personal-intelligence/skillDryRun";
import { LUCA_LINK_DRY_RUN_HANDOFF_FIXTURES } from "../services/lucaLink/dryRunHandoff";
import { LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES } from "../services/lucaLink/runtimeAuthority";
import { LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS } from "../services/lucaLink/adapterFileInstallPermissions";
import {
  createOperationItemsFromAdapterFileInstallDecisions,
  createOperationItemsFromAdapterSandboxPlans,
  createOperationItemsFromApprovalNotifications,
  createOperationItemsFromLearningEvents,
  createOperationItemsFromLucaLinkDryRunHandoffSimulations,
  createOperationItemsFromMemoryApprovalPilot,
  createOperationItemsFromMissionEvaluations,
  createOperationItemsFromRuntimeTraces,
  createOperationItemsFromSensorSnapshots,
  createOperationItemsFromSkillPermissionGates,
  createOperationItemsFromSkillDryRunSimulations,
  createOperationItemsFromSkillSandboxPlans,
  createOperationItemsFromTransportPermissionDecisions,
  createOperationItemsFromWebDisplayIntents,
} from "./operationCenterBridge";
import { createProviderHubOperationItems } from "./providerHubOperationBridge";
import { createProviderHubRouteTraceItems } from "./providerHubRouteTraceBridge";
import { createProviderFactoryProviderHubDryRunComparison } from "../model-router/providerHubProviderFactoryDryRun";
import { createProviderFactoryDryRunOperationItems } from "./providerHubDryRunBridge";
import { createProviderHubRouteDecision } from "../model-router/providerHubRoutePlanner";
import { createProviderHubShadowRouteTrace } from "../model-router/providerHubShadowRouteTrace";
import { createProviderHubShadowRouteTraceItems } from "./providerHubShadowRouteTraceBridge";
import { selectProviderHubRuntimeRoute } from "../model-router/providerHubRuntimeRouteSelection";
import { createProviderHubRuntimeRouteSelectionGuardItems } from "./providerHubRuntimeRouteSelectionBridge";
import { createProviderHubProviderFactoryRouteHandoff } from "../model-router/providerHubProviderFactoryRouteHandoff";
import { createProviderHubRouteHandoffGuardItems } from "./providerHubRouteHandoffBridge";
import type { OperationCenterItem } from "./operationCenterTypes";
import { createOperationItemsFromRuntimeAuthorityRecords } from "./operationCenterRuntimeAuthorityBridge";
import { createOperationItemsFromLucaLinkRuntimeAuthorityRecords } from "./operationCenterLucaLinkRuntimeAuthorityBridge";

const createdAt = "2026-06-07T12:00:00.000Z";

const runtimeAuthorityItems = createOperationItemsFromRuntimeAuthorityRecords(personalIntelligenceRuntimeAuthorityFixtures);
const lucaLinkRuntimeAuthorityItems = createOperationItemsFromLucaLinkRuntimeAuthorityRecords(LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES);

const memoryItems = createOperationItemsFromMemoryApprovalPilot([
  {
    id: "operation:memory-dry-run",
    requestId: "memory-review:safe-preference",
    title: "Memory approval dry-run",
    summary: "A harmless proposal summary passed dry-run checks and remains review-only.",
    status: "dry_run_passed",
    riskLevel: "medium",
    createdAt,
    requiredApprovals: ["explicit user approval"],
    blockedActions: ["live memory write"],
    warnings: ["Dry-run success does not authorize a live write."],
  },
  {
    id: "operation:memory-live-write-blocked",
    requestId: "memory-review:blocked-live-write",
    title: "Live memory write blocked",
    summary: "The model records that live persistence remains disabled.",
    status: "blocked",
    riskLevel: "high",
    createdAt,
    blockedActions: ["live memory write", "memory persistence"],
    blockers: ["Live write is outside Operation Center authority."],
  },
]);

const runtimeItems = createOperationItemsFromRuntimeTraces([
  {
    id: "operation:runtime-act-blocked",
    traceId: "trace:safe-act-stage",
    title: "Runtime trace: Act stage blocked",
    summary: "The trace reached review but the Act stage remained blocked and performed no side effects.",
    status: "blocked",
    riskLevel: "high",
    createdAt,
    blockedActions: ["Act stage", "runtime mutation"],
    blockers: ["Execution is disabled."],
  },
]);

const learningItems = createOperationItemsFromLearningEvents([
  {
    id: "operation:learning-proposal-ready",
    traceId: "trace:safe-learning-event",
    title: "Learning proposal ready",
    summary: "A bounded learning-event summary is ready for human review without persistence.",
    status: "proposal_ready",
    riskLevel: "low",
    createdAt,
    requiredApprovals: ["human review"],
    blockedActions: ["learning persistence"],
  },
]);

const missionItems = createOperationItemsFromMissionEvaluations([
  {
    id: "operation:mission-needs-review",
    missionId: "mission:safe-project",
    title: "Mission alignment needs review",
    summary: "The advisory model identified a bounded alignment concern for review.",
    status: "misaligned",
    riskLevel: "medium",
    createdAt,
    requiredApprovals: ["mission alignment review"],
    blockedActions: ["mission-directed execution"],
    warnings: ["Advisory output is not runtime authority."],
  },
]);

const skillSandboxItems = createOperationItemsFromSkillSandboxPlans([
  {
    id: "operation:skill-sandbox-review",
    planId: "plan:safe-skill-preview",
    skillId: "skill:safe-summary",
    title: "Skill sandbox plan",
    summary: "An inspection-only skill plan requires approval and cannot execute.",
    status: "approval_required",
    riskLevel: "high",
    createdAt,
    requiredApprovals: ["user", "sandbox"],
    blockedActions: ["skill execution", "tool invocation"],
    blockers: ["No isolated execution runtime is enabled."],
  },
]);

const skillPermissionItems = createOperationItemsFromSkillPermissionGates([
  { gateId: "gate:fixture-pending", skillId: "skill:safe-summary", planId: "plan:safe-skill-preview", kind: "permission", permissionKind: "tool", label: "Skill tool review pending", reason: "A tool permission needs review.", status: "pending", riskLevel: "high", required: true },
  { gateId: "gate:fixture-granted", skillId: "skill:safe-summary", planId: "plan:safe-skill-preview", kind: "approval", approvalKind: "user", label: "Skill review grant", reason: "A temporary review grant exists but cannot authorize execution.", status: "granted_for_review", riskLevel: "medium", required: true },
  { gateId: "gate:fixture-denied", skillId: "skill:safe-summary", planId: "plan:safe-skill-preview", kind: "permission", permissionKind: "network", label: "Skill network permission denied", reason: "Network permission was denied for review.", status: "denied", riskLevel: "high", required: true },
  { gateId: "gate:fixture-blocked", skillId: "skill:safe-summary", planId: "plan:safe-skill-preview", kind: "permission", permissionKind: "shell", label: "Skill shell permission blocked", reason: "Shell capability remains prohibited.", status: "blocked", riskLevel: "critical", required: true },
]);

const skillDryRunItems = createOperationItemsFromSkillDryRunSimulations(personalIntelligenceSkillDryRunFixtures);

const adapterItems = createOperationItemsFromAdapterSandboxPlans([
  {
    id: "operation:adapter-sandbox-review",
    planId: "adapter-plan:safe-display",
    hostId: "host:fixture-display",
    title: "Adapter sandbox plan",
    summary: "A fixture-backed adapter plan awaits host review and remains non-executable.",
    status: "approval_required",
    riskLevel: "high",
    createdAt,
    requiredApprovals: ["primary host approval"],
    blockedActions: ["adapter execution", "device control"],
  },
]);

const displayItems = createOperationItemsFromWebDisplayIntents([
  {
    id: "operation:web-display-review",
    requestId: "display-intent:safe-preview",
    hostId: "host:fixture-display",
    title: "Web display intent",
    summary: "A display preview intent is waiting for review; no display is opened or cast.",
    status: "approval_required",
    riskLevel: "medium",
    createdAt,
    requiredApprovals: ["display host approval"],
    blockedActions: ["open display", "cast display"],
  },
]);

const notificationItems = createOperationItemsFromApprovalNotifications([
  {
    id: "operation:approval-notification-pending",
    requestId: "approval-notification:safe-preview",
    hostId: "host:fixture-companion",
    title: "Companion approval notification",
    summary: "A local notification summary indicates that human action is required.",
    status: "action_required",
    riskLevel: "medium",
    createdAt,
    requiredApprovals: ["primary host review"],
    blockedActions: ["approval finalization", "notification transport"],
  },
]);

const sensorItems = createOperationItemsFromSensorSnapshots([
  {
    id: "operation:sensor-read-only",
    hostId: "host:fixture-sensor",
    title: "Sensor snapshot readiness",
    summary: "A static safe-metadata snapshot is available for read-only review.",
    status: "read_only",
    riskLevel: "low",
    createdAt,
    blockedActions: ["live sensor collection", "camera access", "microphone access"],
    warnings: ["Snapshot values are fixture-backed and contain no live readings."],
  },
]);

const transportItems = createOperationItemsFromTransportPermissionDecisions([
  {
    id: "operation:transport-preview",
    requestId: "transport:safe-preview",
    hostId: "host:fixture-companion",
    title: "Transport preview allowed by model",
    summary: "The policy model allows a preview classification only; no message is sent.",
    status: "allowed_preview",
    riskLevel: "low",
    createdAt,
    blockedActions: ["live transport send"],
    warnings: ["Allowed preview is not permission to send."],
  },
  {
    id: "operation:transport-blocked",
    requestId: "transport:blocked-sensitive",
    hostId: "host:fixture-guest",
    title: "Sensitive transport blocked",
    summary: "A sensitive fixture payload class is blocked by the transport permission model.",
    status: "blocked",
    riskLevel: "critical",
    createdAt,
    blockedActions: ["transport send", "sensitive payload relay"],
    blockers: ["Sensitive payload transport is prohibited."],
  },
]);

const fileInstallItems = createOperationItemsFromAdapterFileInstallDecisions(
  LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS,
);

const dryRunHandoffItems = createOperationItemsFromLucaLinkDryRunHandoffSimulations(
  LUCA_LINK_DRY_RUN_HANDOFF_FIXTURES,
);

const providerHubFixtureSnapshots = [
  { providerId: "luca_prime" as const, enabled: true },
  { providerId: "openai" as const, enabled: true, hasUserKey: false },
  { providerId: "anthropic" as const, enabled: true, hasUserKey: true, configuredModelId: "claude-sonnet-fixture" },
  { providerId: "ollama" as const, enabled: true, localRuntimeAvailable: false },
  { providerId: "lm_studio" as const, enabled: true, localRuntimeAvailable: false },
  { providerId: "custom_openai_compatible" as const, enabled: true, hasUserKey: true, hasCustomBaseUrl: false },
];

const providerHubItems = createProviderHubOperationItems(providerHubFixtureSnapshots);
const providerHubRouteDecision = createProviderHubRouteDecision({
  taskType: "chat",
  requiredCapabilities: ["text_generation"],
  preference: "balanced",
  connectionSnapshots: providerHubFixtureSnapshots,
  allowFallbacks: true,
  allowPaidProviders: true,
  allowLocalProviders: true,
  allowCloudProviders: true,
});
const providerHubRouteTraceItems = createProviderHubRouteTraceItems(providerHubRouteDecision);
const providerHubShadowTraceItems = createProviderHubShadowRouteTraceItems(createProviderHubShadowRouteTrace({
  currentProviderId: "luca-prime",
  currentRouteMode: "luca-prime",
  currentModelId: "gemini-fixture",
  taskType: "chat",
  requiredCapabilities: ["text_generation"],
  routePreference: "balanced",
  connectionSnapshots: providerHubFixtureSnapshots,
  allowFallbacks: true,
  allowPaidProviders: true,
  allowLocalProviders: true,
  allowCloudProviders: true,
  trigger: "operation_center_fixture",
  observedAt: createdAt,
}));
const providerHubRuntimeRouteSelectionGuardItems = createProviderHubRuntimeRouteSelectionGuardItems(selectProviderHubRuntimeRoute({
  runtimeRouteSelectionEnabled: false,
  currentProviderId: "luca-prime",
  currentModelId: "gemini-fixture",
  taskType: "chat",
  requiredCapabilities: ["text_generation"],
  routePreference: "balanced",
  connectionSnapshots: providerHubFixtureSnapshots,
  allowFallbacks: true,
  allowPaidProviders: true,
  allowLocalProviders: true,
  allowCloudProviders: true,
}));
const providerHubRouteHandoffGuardItems = createProviderHubRouteHandoffGuardItems(createProviderHubProviderFactoryRouteHandoff({
  runtimeRouteSelectionEnabled: true,
  providerHubSelectedProviderId: "anthropic",
  providerHubSelectedModelId: "claude-sonnet-fixture",
  decisionStatus: "selected",
  shouldUseProviderHubRoute: true,
  currentRoute: { kind: "LUCA_PRIME", provider: "gemini", model: "gemini-fixture" },
  settings: { useCustomApiKey: false, model: "gemini-fixture", provider: "cloud-managed", voiceModel: "", visionModel: "", memoryModel: "", temperature: 0.7, autoContextWindow: true, preferOllama: false, conversationMode: "fast", activePluginId: null, embeddingModel: "", geminiApiKey: "", anthropicApiKey: "configured", openaiApiKey: "", xaiApiKey: "", deepseekApiKey: "", groqApiKey: "" },
  taskType: "chat",
  requiredCapabilities: ["text_generation"],
}));

const providerFactoryDryRunItems = createProviderFactoryDryRunOperationItems(createProviderFactoryProviderHubDryRunComparison({
  currentProviderId: "luca-prime",
  currentRouteMode: "luca-prime",
  currentModelId: "gemini-fixture",
  taskType: "chat",
  requiredCapabilities: ["text_generation"],
  routePreference: "balanced",
  connectionSnapshots: providerHubFixtureSnapshots,
  allowFallbacks: true,
  allowPaidProviders: true,
  allowLocalProviders: true,
  allowCloudProviders: true,
}));

export const operationCenterFixtureItems: readonly OperationCenterItem[] = Object.freeze([
  ...runtimeAuthorityItems,
  ...lucaLinkRuntimeAuthorityItems,
  ...memoryItems,
  ...runtimeItems,
  ...learningItems,
  ...missionItems,
  ...skillSandboxItems,
  ...skillPermissionItems,
  ...skillDryRunItems,
  ...adapterItems,
  ...displayItems,
  ...notificationItems,
  ...sensorItems,
  ...transportItems,
  ...fileInstallItems,
  ...dryRunHandoffItems,
  ...providerHubItems,
  ...providerHubRouteTraceItems,
  ...providerHubShadowTraceItems,
  ...providerHubRuntimeRouteSelectionGuardItems,
  ...providerHubRouteHandoffGuardItems,
  ...providerFactoryDryRunItems,
]);
