import { evaluateAdapterCapabilityPolicy } from "./adapterCapabilityPolicy";
import { validateLucaLinkAdapterManifest } from "./adapterManifest";
import {
  DEFAULT_LUCA_LINK_ADAPTER_SANDBOX_CONFIG,
  type LucaLinkAdapterExecutionPlan,
  type LucaLinkAdapterExecutionPlanStep,
  type LucaLinkAdapterManifest,
  type LucaLinkAdapterPermissionRequest,
  type LucaLinkAdapterSandboxConfig,
} from "./adapterSandboxTypes";

export interface CreateLucaLinkAdapterSandboxPlanInput {
  manifest: LucaLinkAdapterManifest;
  config?: Partial<LucaLinkAdapterSandboxConfig>;
  requestedByHostId: string;
  targetHostId: string;
  hostTrustLevel?: string;
}

function safeId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-|-$/g, "");
}

function createStep(
  type: LucaLinkAdapterExecutionPlanStep["type"],
  summary: string,
  status: LucaLinkAdapterExecutionPlanStep["status"] = "planned",
): LucaLinkAdapterExecutionPlanStep {
  return {
    id: `step-${type}`,
    type,
    summary,
    status,
    sideEffectsPerformed: false,
  };
}

function permissionForCapability(capability: string): string {
  const permissions: Record<string, string> = {
    "display.present": "display.present",
    "notification.request": "notification.request",
    "approval.request": "host.approval",
    "message.send": "message.send",
    "file.write.request": "file.write.request",
    "install.request": "install.request",
    "network.request": "network.request",
  };
  return permissions[capability] ?? capability;
}

function blockedStepForCapability(
  capability: string,
): LucaLinkAdapterExecutionPlanStep | undefined {
  if (capability === "file.write.request")
    return createStep(
      "blocked_file_write",
      "File-write request recorded without reading or writing files.",
      "blocked",
    );
  if (capability === "install.request")
    return createStep(
      "blocked_install",
      "Install request recorded without installing packages or adapters.",
      "blocked",
    );
  if (capability === "network.request")
    return createStep(
      "blocked_network",
      "Network request recorded without calling or mutating transport APIs.",
      "blocked",
    );
  if (/device[._-]?(?:control|actuat|motion)/i.test(capability))
    return createStep(
      "blocked_device_control",
      "Device-control request blocked without controlling hardware.",
      "blocked",
    );
  return undefined;
}

export function resolveLucaLinkAdapterSandboxConfig(
  config: Partial<LucaLinkAdapterSandboxConfig> = {},
): LucaLinkAdapterSandboxConfig {
  return {
    ...DEFAULT_LUCA_LINK_ADAPTER_SANDBOX_CONFIG,
    ...config,
    allowGeneratedCodeExecution: false,
    allowShellExecution: false,
    allowFileWrite: false,
    allowInstall: false,
    allowNetworkMutation: false,
    allowDeviceControl: false,
    allowCredentialAccess: false,
    allowedCapabilities:
      config.allowedCapabilities ??
      DEFAULT_LUCA_LINK_ADAPTER_SANDBOX_CONFIG.allowedCapabilities,
    blockedCapabilities:
      config.blockedCapabilities ??
      DEFAULT_LUCA_LINK_ADAPTER_SANDBOX_CONFIG.blockedCapabilities,
  };
}

export function createLucaLinkAdapterSandboxPlan({
  manifest,
  config: configInput,
  requestedByHostId,
  targetHostId,
  hostTrustLevel,
}: CreateLucaLinkAdapterSandboxPlanInput): LucaLinkAdapterExecutionPlan {
  const config = resolveLucaLinkAdapterSandboxConfig(configInput);
  const validation = validateLucaLinkAdapterManifest(manifest);
  const policy = evaluateAdapterCapabilityPolicy(manifest, config);
  const blockers = [...validation.blockers, ...policy.blockers];
  const warnings = [...validation.warnings, ...policy.warnings];

  if (config.requireManifestIntegrity && !manifest.integrity?.trim()) {
    blockers.push(
      "Manifest integrity is required by the sandbox configuration.",
    );
  }
  if (
    hostTrustLevel &&
    !["trusted", "primary", "admin"].includes(hostTrustLevel)
  ) {
    warnings.push(
      `Host trust level ${hostTrustLevel} does not remove approval requirements.`,
    );
  }

  const permissionRequests: LucaLinkAdapterPermissionRequest[] =
    policy.permissionRequestCapabilities.map((capability) => ({
      capability,
      permission: permissionForCapability(capability),
      targetHostId,
      status: policy.blockedCapabilities.includes(capability)
        ? "blocked"
        : "required",
      reason: `${capability} is represented as a permission request only.`,
      executesCapability: false,
    }));

  const requiredApprovals = policy.hostApprovalRequired
    ? [
        {
          approvalType: "host" as const,
          approverHostId: targetHostId,
          reason:
            "Host approval is required for this dry-run plan and does not grant execution.",
          status: "required" as const,
          grantsExecution: false as const,
        },
      ]
    : [];

  const steps: LucaLinkAdapterExecutionPlanStep[] = [
    createStep(
      "validate_manifest",
      "Validate declarative manifest fields without loading the adapter entrypoint.",
      validation.valid ? "planned" : "blocked",
    ),
    createStep(
      "evaluate_capabilities",
      "Evaluate capability policy without invoking adapter or host behavior.",
      policy.blockers.length > 0 ? "blocked" : "planned",
    ),
  ];
  if (policy.hostApprovalRequired) {
    steps.push(
      createStep(
        "request_host_approval",
        "Prepare a host approval record; approval does not execute the adapter.",
      ),
    );
  }
  for (const capability of manifest.requestedCapabilities ?? []) {
    const blockedStep = blockedStepForCapability(String(capability));
    if (blockedStep) steps.push(blockedStep);
  }
  steps.push(
    createStep(
      "prepare_dry_run",
      "Prepare an inert plan without importing or executing entrypointRef.",
      blockers.length > 0 ? "blocked" : "planned",
    ),
    createStep(
      "audit_only",
      "Record an audit-only result with sideEffectsPerformed false.",
      "audit_only",
    ),
  );

  const uniqueBlockers = Array.from(new Set(blockers));
  const uniqueWarnings = Array.from(new Set(warnings));
  const maxPlanSteps = Math.max(1, Math.floor(config.maxPlanSteps));
  const status = !validation.valid
    ? "rejected"
    : uniqueBlockers.length > 0
      ? "blocked"
      : requiredApprovals.length > 0
        ? "approval_required"
        : "dry_run_ready";

  return {
    planId: `adapter-plan-${safeId(manifest.id || "invalid")}-${safeId(targetHostId)}`,
    adapterId: manifest.id || "invalid-adapter",
    requestedByHostId,
    targetHostId,
    requestedCapabilities: (manifest.requestedCapabilities ?? []).map(String),
    requiredApprovals,
    permissionRequests,
    steps: steps.slice(0, maxPlanSteps),
    riskLevel: policy.riskLevel,
    status,
    blockers: uniqueBlockers,
    warnings: uniqueWarnings,
    sideEffectsPerformed: false,
  };
}
