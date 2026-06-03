import { describe, expect, it } from "vitest";
import { createLucaLinkHostConnectionRecord } from "./lucaLinkHostConnectionModel";
import {
  deriveEmbodiedHostCapabilityEnvelope,
  evaluateEmbodiedHostPolicy,
  summarizeEmbodiedHostPolicies,
} from "./lucaLinkEmbodiedHostPolicy";
describe("LucaLink embodied host policy", () => {
  it("allows trusted sensor-read as read-only", () => {
    const r = evaluateEmbodiedHostPolicy({
      lane: "sensor-read",
      hostClass: "sensor-host",
      trustLevel: "trusted",
    });
    expect(r.decision).toBe("allow-read-only");
    expect(r.readOnly).toBe(true);
  });
  it("requires approval for camera, mic, and location", () => {
    for (const lane of [
      "camera-read",
      "microphone-read",
      "location-read",
    ] as const)
      expect(
        evaluateEmbodiedHostPolicy({ lane, trustLevel: "trusted" }).decision,
      ).toBe("require-primary-host-approval");
  });
  it("allows electronics/smart-home status and motion plan as read-only model", () => {
    for (const lane of [
      "electronics-status",
      "smart-home-status",
      "motion-plan",
    ] as const)
      expect(evaluateEmbodiedHostPolicy({ lane }).decision).toBe(
        "allow-read-only",
      );
  });
  it("requires fresh confirmation for smart-home control, motion execute, actuator, and payment", () => {
    for (const lane of [
      "smart-home-control",
      "motion-execute",
      "actuator-control",
      "payment",
    ] as const) {
      const r = evaluateEmbodiedHostPolicy({
        lane,
        hostClass: "embodied-host",
      });
      expect(r.decision).toBe("fresh-confirmation-required");
      expect(r.requiresFreshConfirmation).toBe(true);
    }
  });
  it("blocks safety-critical", () => {
    expect(
      evaluateEmbodiedHostPolicy({ lane: "safety-critical" }).decision,
    ).toBe("blocked");
  });
  it("blocks embodied self-approval and guest/public control", () => {
    expect(
      evaluateEmbodiedHostPolicy({
        lane: "actuator-control",
        hostClass: "embodied-host",
        requestedByHostId: "robot",
        targetHostId: "robot",
      }).decision,
    ).toBe("blocked");
    expect(
      evaluateEmbodiedHostPolicy({
        lane: "smart-home-control",
        hostClass: "guest-host",
        guest: true,
      }).decision,
    ).toBe("blocked");
  });
  it("denies unknown lanes and summarizes/envelopes", () => {
    const unknown = evaluateEmbodiedHostPolicy({
      lane: "unknown",
      hostClass: "unknown-host",
    });
    expect(unknown.decision).toBe("deny");
    const host = createLucaLinkHostConnectionRecord(
      {
        id: "sensor",
        displayName: "Sensor",
        hostClass: "sensor-host",
        trustLevel: "trusted",
      },
      { now: 1 },
    );
    const env = deriveEmbodiedHostCapabilityEnvelope(host);
    expect(env.readOnlyLanes).toContain("sensor-read");
    expect(summarizeEmbodiedHostPolicies([unknown]).denied).toBe(1);
  });
});
