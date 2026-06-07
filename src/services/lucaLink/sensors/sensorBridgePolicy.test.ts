import { describe, expect, it } from "vitest";
import { createLucaLinkReadOnlySensorSnapshot } from "./sensorSnapshot";
import { evaluateLucaLinkReadOnlySensorPolicy } from "./sensorBridgePolicy";
import {
  LUCA_LINK_BLOCKED_SENSOR_KINDS,
  type LucaLinkBlockedSensorKind,
} from "./sensorBridgeTypes";

const base = () =>
  createLucaLinkReadOnlySensorSnapshot({
    snapshotId: "policy-test",
    hostId: "host-test",
    capturedAt: "2026-06-07T00:00:00.000Z",
    expiresAt: "2099-06-07T00:00:00.000Z",
    sensorKinds: ["battery_status", "network_status", "host_health"],
    values: { batteryBand: "healthy", networkState: "available" },
  });

describe("LucaLink read-only sensor policy", () => {
  it("allows explicitly allowed summary kinds", () => {
    const result = evaluateLucaLinkReadOnlySensorPolicy(base(), {
      now: "2026-06-07T01:00:00.000Z",
    });
    expect(result.allowed).toBe(true);
    expect(result.status).toBe("ready");
    expect(result.allowedSensorKinds).toEqual([
      "battery_status",
      "network_status",
      "host_health",
    ]);
    expect(result.sideEffectsPerformed).toBe(false);
  });

  it.each(LUCA_LINK_BLOCKED_SENSOR_KINDS)(
    "blocks %s",
    (kind: LucaLinkBlockedSensorKind) => {
      const snapshot = { ...base(), sensorKinds: [kind] };
      const result = evaluateLucaLinkReadOnlySensorPolicy(snapshot);
      expect(result.allowed).toBe(false);
      expect(result.status).toBe("blocked");
      expect(result.blockedSensorKinds).toContain(kind);
    },
  );

  it.each([
    "credential bundle present",
    "access token included",
    "private-key material",
    "hidden prompt text",
    "private reasoning trace",
    "raw file contents",
  ])("blocks sensitive value phrase: %s", (value: string) => {
    const result = evaluateLucaLinkReadOnlySensorPolicy({
      ...base(),
      values: { unsafeSummary: value },
    });
    expect(result.allowed).toBe(false);
    expect(result.blockers.join(" ")).toMatch(
      /credential|hidden-prompt|raw-payload/i,
    );
  });

  it("blocks claims that are not read-only or side-effect-free", () => {
    expect(
      evaluateLucaLinkReadOnlySensorPolicy({
        ...base(),
        readOnly: false,
      } as never).allowed,
    ).toBe(false);
    expect(
      evaluateLucaLinkReadOnlySensorPolicy({
        ...base(),
        sideEffectsPerformed: true,
      } as never).allowed,
    ).toBe(false);
  });

  it("requires approval metadata for private snapshots by default", () => {
    const privateSnapshot = { ...base(), privacyLevel: "private" as const };
    expect(evaluateLucaLinkReadOnlySensorPolicy(privateSnapshot).allowed).toBe(
      false,
    );
    expect(
      evaluateLucaLinkReadOnlySensorPolicy(privateSnapshot, {
        explicitApprovalMetadata: {
          approvedByHostId: "primary-host",
          approvedAt: "2026-06-07T00:30:00.000Z",
        },
      }).allowed,
    ).toBe(true);
  });
});
