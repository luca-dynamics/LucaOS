import { describe, expect, it } from "vitest";
import {
  createPresenceSensorDisclosure,
  createPresenceSensorRouteEnvelope,
  createPresenceSensorRouteState,
  getPresenceSensorStatus,
  isPresenceSensorActive,
  mergePresenceSensorDisclosure,
  requiresPresenceSensorDisclosure,
  toLegacySensorDisclosure,
} from "./presenceSensorRoute";

describe("Presence sensor disclosure route helpers", () => {
  it("normalizes a raw microphone payload into a typed disclosure", () => {
    expect(createPresenceSensorDisclosure({ kind: "microphone", status: "active", source: "voice" })).toMatchObject({
      kind: "microphone",
      status: "active",
      source: "voice",
      active: true,
      requiresDisclosure: true,
    });
  });

  it("normalizes a raw screen payload into a typed disclosure", () => {
    expect(createPresenceSensorDisclosure({ sensor: "screen", state: "requesting", permission: "prompt" })).toMatchObject({
      kind: "screen",
      status: "requesting",
      permission: "prompt",
      active: true,
      requiresDisclosure: true,
    });
  });

  it("preserves unknown legacy fields", () => {
    const disclosure = createPresenceSensorDisclosure({ kind: "microphone", status: "active", legacyOnlyField: { keep: true } });
    expect(disclosure.legacyOnlyField).toEqual({ keep: true });
  });

  it("tolerates missing optional fields", () => {
    expect(createPresenceSensorDisclosure()).toMatchObject({ kind: "microphone", active: false, requiresDisclosure: false });
    expect(createPresenceSensorRouteState({})).toEqual({});
  });

  it("does not mutate input payloads", () => {
    const payload = { kind: "microphone", status: "active", metadata: { owner: "voice" } };
    const before = JSON.stringify(payload);
    createPresenceSensorDisclosure(payload);
    expect(JSON.stringify(payload)).toBe(before);
  });

  it("detects active status and disclosure requirements", () => {
    expect(isPresenceSensorActive({ status: "active" })).toBe(true);
    expect(isPresenceSensorActive({ active: false, status: "active" })).toBe(false);
    expect(getPresenceSensorStatus({ enabled: true })).toBe("active");
    expect(requiresPresenceSensorDisclosure({ status: "requesting" })).toBe(true);
    expect(requiresPresenceSensorDisclosure({ status: "available" })).toBe(false);
  });

  it("merges partial disclosure updates while preserving previous fields", () => {
    expect(
      mergePresenceSensorDisclosure(
        { kind: "screen", status: "active", label: "Screen Context", metadata: { displayId: 1 } },
        { status: "available", metadata: { source: "legacy" } },
      ),
    ).toMatchObject({
      kind: "screen",
      status: "available",
      label: "Screen Context",
      metadata: { displayId: 1, source: "legacy" },
    });
  });

  it("creates JSON-safe route envelopes", () => {
    const envelope = createPresenceSensorRouteEnvelope({ state: { microphone: { status: "active" } }, timestamp: 123 });
    expect(JSON.parse(JSON.stringify(envelope))).toEqual(envelope);
  });

  it("converts back to legacy shape while preserving current fields", () => {
    const legacy = toLegacySensorDisclosure(
      createPresenceSensorDisclosure({ kind: "screen", status: "active", displayText: "Screen Context" }),
      { legacyOnlyField: true, status: "available" },
    );
    expect(legacy).toMatchObject({ legacyOnlyField: true, kind: "screen", status: "active", displayText: "Screen Context" });
  });
});
