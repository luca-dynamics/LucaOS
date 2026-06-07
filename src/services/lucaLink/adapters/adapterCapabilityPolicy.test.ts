import { describe, expect, it } from "vitest";
import {
  classifyAdapterRisk,
  evaluateAdapterCapabilityPolicy,
  listBlockedAdapterCapabilities,
  requiresHostApproval,
} from "./adapterCapabilityPolicy";
import { LUCA_LINK_SAFE_DISPLAY_ADAPTER_FIXTURE } from "./adapterSandboxFixtures";
import { resolveLucaLinkAdapterSandboxConfig } from "./adapterSandboxRuntime";
import { DEFAULT_LUCA_LINK_ADAPTER_SANDBOX_CONFIG } from "./adapterSandboxTypes";

function manifest(capabilities: string[]) {
  return {
    ...LUCA_LINK_SAFE_DISPLAY_ADAPTER_FIXTURE,
    requestedCapabilities: capabilities,
  } as never;
}

describe("LucaLink adapter capability policy", () => {
  it("uses a disabled, dry-run, deny-dangerous default", () => {
    const config = DEFAULT_LUCA_LINK_ADAPTER_SANDBOX_CONFIG;
    expect(config.enabled).toBe(false);
    expect(config.dryRun).toBe(true);
    expect(config.allowGeneratedCodeExecution).toBe(false);
    expect(config.allowShellExecution).toBe(false);
    expect(config.allowFileWrite).toBe(false);
    expect(config.allowInstall).toBe(false);
    expect(config.allowNetworkMutation).toBe(false);
    expect(config.allowDeviceControl).toBe(false);
    expect(config.allowCredentialAccess).toBe(false);
    expect(config.blockedCapabilities).toEqual(
      expect.arrayContaining([
        "file.write.request",
        "install.request",
        "network.request",
        "device.control",
      ]),
    );
  });

  it("requires host approval for display, network, write, and install requests", () => {
    const config = resolveLucaLinkAdapterSandboxConfig({ enabled: true });
    for (const capability of [
      "display.present",
      "network.request",
      "file.write.request",
      "install.request",
    ]) {
      expect(requiresHostApproval(manifest([capability]), config)).toBe(true);
    }
  });

  it("keeps dangerous request capabilities blocked by default", () => {
    const adapter = manifest([
      "file.write.request",
      "install.request",
      "network.request",
    ]);
    expect(
      listBlockedAdapterCapabilities(
        adapter,
        resolveLucaLinkAdapterSandboxConfig({ enabled: true }),
      ),
    ).toEqual(["file.write.request", "install.request", "network.request"]);
    expect(classifyAdapterRisk(adapter)).toBe("high");
  });

  it("always blocks credential, shell, and generated-code capability attempts", () => {
    const policy = evaluateAdapterCapabilityPolicy(
      manifest([
        "credential.access",
        "shell.execute",
        "generated-code.execute",
      ]),
      resolveLucaLinkAdapterSandboxConfig({
        enabled: true,
        blockedCapabilities: [],
        allowedCapabilities: [] as never,
      }),
    );
    expect(policy.riskLevel).toBe("critical");
    expect(policy.blockedCapabilities).toEqual(
      expect.arrayContaining([
        "credential.access",
        "shell.execute",
        "generated-code.execute",
      ]),
    );
    expect(policy.executableCapabilities).toEqual([]);
    expect(policy.sideEffectsAllowed).toBe(false);
  });

  it("normalizes every dangerous allow flag back to false", () => {
    const config = resolveLucaLinkAdapterSandboxConfig({
      allowGeneratedCodeExecution: true,
      allowShellExecution: true,
      allowFileWrite: true,
      allowInstall: true,
      allowNetworkMutation: true,
      allowDeviceControl: true,
      allowCredentialAccess: true,
    } as never);
    expect(config.allowGeneratedCodeExecution).toBe(false);
    expect(config.allowShellExecution).toBe(false);
    expect(config.allowFileWrite).toBe(false);
    expect(config.allowInstall).toBe(false);
    expect(config.allowNetworkMutation).toBe(false);
    expect(config.allowDeviceControl).toBe(false);
    expect(config.allowCredentialAccess).toBe(false);
  });
});
