import { describe, expect, it } from "vitest";
import { createLucaLinkRuntimeCapabilityRegistry } from "./lucaLinkRuntimeAuthorityRegistry";

describe("LucaLink runtime capability registry", () => {
  it("builds defensive, read-only classifications from all supported model sources", () => {
    const warnings = ["fixture warning"];
    const records = createLucaLinkRuntimeCapabilityRegistry({
      adapterSandboxPlans: [{ id: "adapter", warnings }],
      webDisplayIntents: [{ id: "display" }],
      approvalNotifications: [{ requestId: "approval" }],
      sensorSnapshots: [{ id: "sensor" }],
      transportPermissionDecisions: [{ requestId: "transport" }],
      adapterFileInstallDecisions: [{ requestId: "install", operation: "package_install" }],
      dryRunHandoffSimulations: [{ simulationId: "handoff", requestedByHostId: "primary", targetHostId: "companion" }],
    });
    warnings.push("later mutation");
    expect(records).toHaveLength(7);
    expect(records.filter((record) => record.authorityClass === "review_only")).toHaveLength(6);
    expect(records.find((record) => record.relatedSimulationId === "handoff")?.authorityClass).toBe("dry_run_only");
    expect(records[0].warnings).toEqual(["fixture warning"]);
    expect(records.every((record) => !record.sideEffectsPerformed && !record.authorityGranted)).toBe(true);
  });
});
