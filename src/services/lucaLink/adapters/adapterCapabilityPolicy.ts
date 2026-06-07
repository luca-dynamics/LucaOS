import {
  REQUEST_ONLY_ADAPTER_CAPABILITIES,
  type LucaLinkAdapterCapability,
  type LucaLinkAdapterCapabilityPolicyEvaluation,
  type LucaLinkAdapterManifest,
  type LucaLinkAdapterRiskLevel,
  type LucaLinkAdapterSandboxConfig,
} from "./adapterSandboxTypes";

const REQUEST_ONLY = new Set<string>(REQUEST_ONLY_ADAPTER_CAPABILITIES);
const APPROVAL_CAPABILITIES = new Set<string>([
  "display.present",
  "notification.request",
  "approval.request",
  "message.send",
  ...REQUEST_ONLY_ADAPTER_CAPABILITIES,
]);
const HIGH_RISK_CAPABILITIES = new Set<string>([
  "file.write.request",
  "install.request",
  "network.request",
]);
const FORBIDDEN_CAPABILITY =
  /credential|secret|token|private[._-]?key|shell|generated[._-]?code|device[._-]?(?:control|actuat|motion)|payment/i;

function capabilitiesOf(manifest: LucaLinkAdapterManifest): string[] {
  return Array.isArray(manifest.requestedCapabilities)
    ? manifest.requestedCapabilities.map(String)
    : [];
}

export function listBlockedAdapterCapabilities(
  manifest: LucaLinkAdapterManifest,
  config: LucaLinkAdapterSandboxConfig,
): string[] {
  const blocked = new Set(config.blockedCapabilities);
  const allowed = new Set<string>(config.allowedCapabilities);
  return Array.from(
    new Set(
      capabilitiesOf(manifest).filter(
        (capability) =>
          FORBIDDEN_CAPABILITY.test(capability) ||
          blocked.has(capability) ||
          !allowed.has(capability),
      ),
    ),
  );
}

export function classifyAdapterRisk(
  manifest: LucaLinkAdapterManifest,
): LucaLinkAdapterRiskLevel {
  const capabilities = capabilitiesOf(manifest);
  if (capabilities.some((capability) => FORBIDDEN_CAPABILITY.test(capability)))
    return "critical";
  if (capabilities.some((capability) => HIGH_RISK_CAPABILITIES.has(capability)))
    return "high";
  if (capabilities.some((capability) => APPROVAL_CAPABILITIES.has(capability)))
    return "medium";
  return "low";
}

export function requiresHostApproval(
  manifest: LucaLinkAdapterManifest,
  config: LucaLinkAdapterSandboxConfig,
): boolean {
  return (
    config.requireHostApproval ||
    capabilitiesOf(manifest).some((capability) =>
      APPROVAL_CAPABILITIES.has(capability),
    )
  );
}

export function evaluateAdapterCapabilityPolicy(
  manifest: LucaLinkAdapterManifest,
  config: LucaLinkAdapterSandboxConfig,
): LucaLinkAdapterCapabilityPolicyEvaluation {
  const capabilities = capabilitiesOf(manifest);
  const blockedCapabilities = listBlockedAdapterCapabilities(manifest, config);
  const approvalRequiredCapabilities = capabilities.filter((capability) =>
    APPROVAL_CAPABILITIES.has(capability),
  );
  const permissionRequestCapabilities = capabilities.filter(
    (capability) =>
      REQUEST_ONLY.has(capability) || APPROVAL_CAPABILITIES.has(capability),
  );
  const blockers = blockedCapabilities.map(
    (capability) => `${capability} is blocked by the adapter sandbox policy.`,
  );
  const warnings = permissionRequestCapabilities.map(
    (capability) =>
      `${capability} creates a request only and performs no action.`,
  );

  if (!config.enabled) blockers.push("Adapter sandbox runtime is disabled.");
  if (!config.dryRun)
    blockers.push("Adapter sandbox runtime must remain in dry-run mode.");
  if (
    (config as { allowGeneratedCodeExecution?: boolean })
      .allowGeneratedCodeExecution
  )
    blockers.push("Generated-code execution is always blocked.");
  if ((config as { allowShellExecution?: boolean }).allowShellExecution)
    blockers.push("Shell execution is always blocked.");
  if ((config as { allowFileWrite?: boolean }).allowFileWrite)
    blockers.push("File writes are always blocked in this runtime phase.");
  if ((config as { allowInstall?: boolean }).allowInstall)
    blockers.push("Installation is always blocked in this runtime phase.");
  if ((config as { allowNetworkMutation?: boolean }).allowNetworkMutation)
    blockers.push("Network mutation is always blocked in this runtime phase.");
  if ((config as { allowDeviceControl?: boolean }).allowDeviceControl)
    blockers.push("Device control is always blocked in this runtime phase.");
  if ((config as { allowCredentialAccess?: boolean }).allowCredentialAccess)
    blockers.push("Credential access is always blocked.");

  return {
    riskLevel: classifyAdapterRisk(manifest),
    blockedCapabilities: Array.from(new Set(blockedCapabilities)),
    approvalRequiredCapabilities: Array.from(
      new Set(approvalRequiredCapabilities),
    ),
    permissionRequestCapabilities: Array.from(
      new Set(permissionRequestCapabilities),
    ),
    blockers: Array.from(new Set(blockers)),
    warnings: Array.from(new Set(warnings)),
    hostApprovalRequired: requiresHostApproval(manifest, config),
    executableCapabilities: [],
    sideEffectsAllowed: false,
  };
}

export function isKnownAdapterCapability(
  capability: string,
  config: LucaLinkAdapterSandboxConfig,
): capability is LucaLinkAdapterCapability {
  return config.allowedCapabilities.includes(
    capability as LucaLinkAdapterCapability,
  );
}
