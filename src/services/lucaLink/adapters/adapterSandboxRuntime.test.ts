import { describe, expect, it } from "vitest";
import { evaluateAdapterCapabilityPolicy } from "./adapterCapabilityPolicy";
import { validateLucaLinkAdapterManifest } from "./adapterManifest";
import { LUCA_LINK_SAFE_DISPLAY_ADAPTER_FIXTURE } from "./adapterSandboxFixtures";
import {
  createLucaLinkAdapterSandboxPlan,
  resolveLucaLinkAdapterSandboxConfig,
} from "./adapterSandboxRuntime";

function createPlan(capabilities: string[], enabled = true) {
  return createLucaLinkAdapterSandboxPlan({
    manifest: {
      ...LUCA_LINK_SAFE_DISPLAY_ADAPTER_FIXTURE,
      requestedCapabilities: capabilities,
    } as never,
    config: { enabled },
    requestedByHostId: "primary-host",
    targetHostId: "target-host",
  });
}

describe("LucaLink adapter sandbox runtime", () => {
  it("creates an approval-gated display dry-run with no side effects", () => {
    const plan = createPlan(["display.read", "display.present"]);
    expect(plan.status).toBe("approval_required");
    expect(plan.requiredApprovals).toHaveLength(1);
    expect(plan.requiredApprovals[0].grantsExecution).toBe(false);
    expect(plan.sideEffectsPerformed).toBe(false);
    expect(
      plan.steps.every((step) => step.sideEffectsPerformed === false),
    ).toBe(true);
  });

  it("keeps the default runtime disabled and blocked", () => {
    const plan = createPlan(["display.read"], false);
    expect(plan.status).toBe("blocked");
    expect(plan.blockers).toContain("Adapter sandbox runtime is disabled.");
    expect(plan.sideEffectsPerformed).toBe(false);
  });

  it("represents file write, install, network, and device control only as blocked plan steps", () => {
    const plan = createPlan([
      "file.write.request",
      "install.request",
      "network.request",
      "device.control",
    ]);
    expect(plan.status).toBe("rejected");
    expect(plan.steps.map((step) => step.type)).toEqual(
      expect.arrayContaining([
        "blocked_file_write",
        "blocked_install",
        "blocked_network",
        "blocked_device_control",
        "audit_only",
      ]),
    );
    expect(
      plan.permissionRequests.every((request) => !request.executesCapability),
    ).toBe(true);
    expect(plan.sideEffectsPerformed).toBe(false);
  });

  it("never turns shell or generated-code configuration into execution", () => {
    const config = resolveLucaLinkAdapterSandboxConfig({
      enabled: true,
      allowShellExecution: true,
      allowGeneratedCodeExecution: true,
    } as never);
    expect(config.allowShellExecution).toBe(false);
    expect(config.allowGeneratedCodeExecution).toBe(false);
    const plan = createPlan(["shell.execute", "generated-code.execute"]);
    expect(plan.status).toBe("rejected");
    expect(plan.sideEffectsPerformed).toBe(false);
  });

  it("requires integrity when configured", () => {
    const plan = createLucaLinkAdapterSandboxPlan({
      manifest: {
        ...LUCA_LINK_SAFE_DISPLAY_ADAPTER_FIXTURE,
        integrity: undefined,
      },
      config: { enabled: true, requireManifestIntegrity: true },
      requestedByHostId: "primary-host",
      targetHostId: "target-host",
    });
    expect(plan.status).toBe("blocked");
    expect(plan.blockers.join(" ")).toMatch(/integrity is required/i);
  });

  it("contains no Personal Intelligence dependency or unsafe runtime API in its executable functions", () => {
    const implementationText = [
      createLucaLinkAdapterSandboxPlan,
      resolveLucaLinkAdapterSandboxConfig,
      evaluateAdapterCapabilityPolicy,
      validateLucaLinkAdapterManifest,
    ]
      .map(String)
      .join("\n");
    expect(implementationText).not.toMatch(/personal-intelligence/i);
    expect(implementationText).not.toMatch(
      /\b(?:child_process|localStorage|ipcRenderer|ipcMain|WebSocket|fetch)\b|\bfs\./,
    );
  });
});
