/**
 * Pure, fake-data LucaLink smoke harness.
 *
 * These scenarios model state composition only. They do not import the runtime
 * service, create sockets, fetch, persist, probe, execute, or use browser APIs.
 */

export type LucaLinkRuntimeSmokeScenario =
  | "device-center-snapshot-empty"
  | "device-center-snapshot-populated"
  | "approval-surface-derivation"
  | "handoff-record-lifecycle"
  | "bridge-review-lifecycle"
  | "adapter-draft-lifecycle"
  | "embodied-policy-envelope"
  | "guest-session-policy"
  | "runtime-enforcement-sample"
  | "security-invariant-sample";

export interface LucaLinkRuntimeSmokeDefinition {
  scenario: LucaLinkRuntimeSmokeScenario;
  title: string;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
  prohibitedEffects: string[];
}

export interface LucaLinkRuntimeSmokeResult {
  scenario: LucaLinkRuntimeSmokeScenario;
  title: string;
  passed: boolean;
  observations: string[];
  failures: string[];
  prohibitedEffects: string[];
}

export interface LucaLinkRuntimeSmokeSummary {
  total: number;
  passed: number;
  failed: number;
  ready: boolean;
  failedScenarios: LucaLinkRuntimeSmokeScenario[];
}

const NO_EFFECTS = [
  "socket emit",
  "network request",
  "storage write",
  "file write",
  "generated-code execution",
  "adapter installation",
  "live probing",
  "physical or payment action",
];

const definitions: Record<
  LucaLinkRuntimeSmokeScenario,
  Omit<LucaLinkRuntimeSmokeDefinition, "scenario">
> = {
  "device-center-snapshot-empty": {
    title: "Empty Device Center snapshot",
    input: {
      connectedDevices: [],
      hostConnections: [],
      approvals: [],
      guests: [],
      bridgeReviews: [],
      adapterDrafts: [],
    },
    expected: { arraysDefined: true, renderable: true },
    prohibitedEffects: NO_EFFECTS,
  },
  "device-center-snapshot-populated": {
    title: "Populated Device Center snapshot",
    input: {
      connectedDevices: [{ id: "companion-1", role: "companion" }],
      hostConnections: [{ id: "display-1", hostClass: "web-display-host" }],
      approvals: [{ id: "approval-1", status: "pending" }],
      guests: [{ id: "guest-1", status: "active" }],
      bridgeReviews: [{ id: "review-1", status: "review-required" }],
      adapterDrafts: [{ id: "draft-1", generatedTextOnly: true }],
    },
    expected: { arraysDefined: true, renderable: true },
    prohibitedEffects: NO_EFFECTS,
  },
  "approval-surface-derivation": {
    title: "Approval surface derivation",
    input: {
      host: { id: "display-1", trust: "trusted", canDisplay: true },
      request: { id: "approval-1", risk: "high" },
    },
    expected: { visible: true, canApprove: false, transfersAuthority: false },
    prohibitedEffects: NO_EFFECTS,
  },
  "handoff-record-lifecycle": {
    title: "Handoff record lifecycle",
    input: { statuses: ["pending", "approved", "accepted"] },
    expected: {
      previewOnly: true,
      rawMemoryDatabaseTransferred: false,
      hiddenPromptTransferred: false,
      privateReasoningTransferred: false,
    },
    prohibitedEffects: NO_EFFECTS,
  },
  "bridge-review-lifecycle": {
    title: "Bridge review lifecycle",
    input: { statuses: ["review-required", "approved-for-sandbox"] },
    expected: { executes: false, installs: false, writesFiles: false },
    prohibitedEffects: NO_EFFECTS,
  },
  "adapter-draft-lifecycle": {
    title: "Adapter draft lifecycle",
    input: { statuses: ["draft", "requires-review", "cancelled"] },
    expected: {
      generatedTextOnly: true,
      canWriteToDisk: false,
      canExecute: false,
      canInstall: false,
    },
    prohibitedEffects: NO_EFFECTS,
  },
  "embodied-policy-envelope": {
    title: "Embodied host policy envelope",
    input: { capabilities: ["sensor-read", "motion", "payment"] },
    expected: {
      sensorReadOnly: true,
      motionAutoApproved: false,
      paymentAutoApproved: false,
      freshConfirmationRequired: true,
    },
    prohibitedEffects: NO_EFFECTS,
  },
  "guest-session-policy": {
    title: "Guest session policy",
    input: {
      safeKinds: ["guest-message", "webrtc-offer", "webrtc-answer", "webrtc-ice-candidate"],
      dangerousCapability: "shell.execute",
    },
    expected: { safeKindsAllowed: true, dangerousCapabilityDenied: true },
    prohibitedEffects: NO_EFFECTS,
  },
  "runtime-enforcement-sample": {
    title: "Runtime enforcement sample",
    input: { modes: ["disabled", "observe-only", "high-risk-only", "full-outbound"] },
    expected: {
      defaultDisabled: true,
      observeOnlyBlocks: false,
      highRiskQueued: true,
      dangerousFullOutboundBlocked: true,
    },
    prohibitedEffects: NO_EFFECTS,
  },
  "security-invariant-sample": {
    title: "Security and terminology invariants",
    input: { normalMeshAuthority: "Primary Host", highestTrust: "owner" },
    expected: {
      originReservedForCreatorAuthority: true,
      newSocketEvents: false,
      liveProbing: false,
      modelOnlyExecution: false,
    },
    prohibitedEffects: NO_EFFECTS,
  },
};

export function createLucaLinkRuntimeSmokeScenario(
  scenario: LucaLinkRuntimeSmokeScenario,
): LucaLinkRuntimeSmokeDefinition {
  const definition = definitions[scenario];
  return {
    scenario,
    title: definition.title,
    input: structuredCloneSafe(definition.input),
    expected: structuredCloneSafe(definition.expected),
    prohibitedEffects: [...definition.prohibitedEffects],
  };
}

function structuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const SAFE_FALSE_EXPECTATIONS = new Set([
  "canApprove",
  "transfersAuthority",
  "rawMemoryDatabaseTransferred",
  "hiddenPromptTransferred",
  "privateReasoningTransferred",
  "executes",
  "installs",
  "writesFiles",
  "canWriteToDisk",
  "canExecute",
  "canInstall",
  "motionAutoApproved",
  "paymentAutoApproved",
  "observeOnlyBlocks",
  "newSocketEvents",
  "liveProbing",
  "modelOnlyExecution",
]);

function expectationPassed(key: string, value: unknown): boolean {
  return SAFE_FALSE_EXPECTATIONS.has(key) ? value === false : value === true;
}

export function evaluateLucaLinkRuntimeSmokeScenario(
  scenario: LucaLinkRuntimeSmokeScenario | LucaLinkRuntimeSmokeDefinition,
): LucaLinkRuntimeSmokeResult {
  const definition =
    typeof scenario === "string"
      ? createLucaLinkRuntimeSmokeScenario(scenario)
      : scenario;
  const entries = Object.entries(definition.expected);
  const failures = entries
    .filter(([key, value]) => !expectationPassed(key, value))
    .map(([key]) => `Expectation ${key} did not preserve its safe value.`);
  return {
    scenario: definition.scenario,
    title: definition.title,
    passed: failures.length === 0,
    observations: entries.map(
      ([key, value]) => `${key}: ${String(value)}`,
    ),
    failures,
    prohibitedEffects: [...definition.prohibitedEffects],
  };
}

export function summarizeLucaLinkRuntimeSmokeScenarios(
  results: readonly LucaLinkRuntimeSmokeResult[],
): LucaLinkRuntimeSmokeSummary {
  const failedScenarios = results
    .filter((result) => !result.passed)
    .map((result) => result.scenario);
  return {
    total: results.length,
    passed: results.length - failedScenarios.length,
    failed: failedScenarios.length,
    ready: results.length > 0 && failedScenarios.length === 0,
    failedScenarios,
  };
}
