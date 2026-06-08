import { describe, expect, it } from "vitest";
import { createLucaLinkRuntimeCapabilityRegistry } from "./lucaLinkRuntimeAuthorityRegistry";

const declaration = {
  id: "safe-plan", source: "adapter_plan" as const, capabilityKind: "adapter_execution" as const,
  riskLevel: "medium" as const, requestedByHostId: "host:source", targetHostId: "host:target",
};

describe("LucaLink runtime capability registry", () => {
  it("creates defensive, side-effect-free authority records from source models", () => {
    const input = { adapterSandboxPlans: [declaration] };
    const records = createLucaLinkRuntimeCapabilityRegistry(input);
    records[0].blockedActions.push("test mutation");
    expect(input.adapterSandboxPlans[0]).toEqual(declaration);
    expect(records[0]).toMatchObject({ source: "adapter_plan", authorityClass: "review_only", authorityGranted: false, sideEffectsPerformed: false });
  });

  it("supports review declarations without granting send or execution authority", () => {
    const [record] = createLucaLinkRuntimeCapabilityRegistry({
      transportPermissionDecisions: [{ id: "transport-review", source: "transport_decision", capabilityKind: "transport_send", riskLevel: "low", reviewOnlyDeclaration: true }],
    });
    expect(record.authorityClass).toBe("review_only");
    expect(record.transportSendEnabled).toBe(false);
  });
});
