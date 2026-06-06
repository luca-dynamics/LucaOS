import { describe, expect, it } from "vitest";
import {
  createLucaLinkRuntimeQaChecklist,
  listBlockingRuntimeQaChecks,
  listManualRuntimeQaChecks,
  listRealImplementationReadinessChecks,
  markLucaLinkRuntimeQaCheckStatus,
  summarizeLucaLinkRuntimeQaChecklist,
  type LucaLinkRuntimeQaArea,
} from "./lucaLinkRuntimeQaChecklist";

const REQUIRED_AREAS: LucaLinkRuntimeQaArea[] = [
  "primary-host-pairing",
  "companion-join",
  "qr-pairing",
  "relay-connection",
  "local-lan-connection",
  "vpn-connection",
  "reconnect-disconnect",
  "guest-session",
  "guest-pin-auth",
  "guest-chat",
  "guest-webrtc-signaling",
  "message-send-receive",
  "secure-beam-packet",
  "mission-sync",
  "sensor-pulse",
  "runtime-enforcement",
  "approval-queue",
  "continuation-records",
  "device-trust",
  "handoff-records",
  "host-connection-model",
  "host-adaptation-blueprints",
  "multi-host-approval-surface",
  "bridge-review",
  "embodied-policy",
  "adapter-drafts",
  "device-center-ui",
  "security-invariants",
];

describe("LucaLink runtime QA checklist", () => {
  it("covers every runtime QA area with unique stable ids", () => {
    const checks = createLucaLinkRuntimeQaChecklist();
    expect(new Set(checks.map((item) => item.id)).size).toBe(checks.length);
    expect(new Set(checks.map((item) => item.area))).toEqual(
      new Set(REQUIRED_AREAS),
    );
    expect(checks.every((item) => item.expectedResult.length > 0)).toBe(true);
    expect(checks.every((item) => item.failureSignals.length > 0)).toBe(true);
  });

  it("starts manual checks as manual-required and model checks as automated-covered", () => {
    const checks = createLucaLinkRuntimeQaChecklist();
    expect(
      checks
        .filter((item) => item.automationAvailable)
        .every((item) => item.status === "automated-covered"),
    ).toBe(true);
    expect(
      checks
        .filter((item) => !item.automationAvailable)
        .every((item) => item.status === "manual-required"),
    ).toBe(true);
  });

  it("updates immutably and can append or replace warnings", () => {
    const checks = createLucaLinkRuntimeQaChecklist();
    const updated = markLucaLinkRuntimeQaCheckStatus(
      checks,
      "relay-connect",
      "failed",
      { warning: "Relay unavailable" },
    );
    const replaced = markLucaLinkRuntimeQaCheckStatus(
      updated,
      "relay-connect",
      "blocked",
      { warnings: ["Environment blocked"], replaceWarnings: true },
    );

    expect(checks.find((item) => item.id === "relay-connect")?.status).toBe(
      "manual-required",
    );
    expect(updated.find((item) => item.id === "relay-connect")).toMatchObject({
      status: "failed",
      warnings: ["Relay unavailable"],
    });
    expect(replaced.find((item) => item.id === "relay-connect")).toMatchObject({
      status: "blocked",
      warnings: ["Environment blocked"],
    });
  });

  it("summarizes readiness only when every required gate passes", () => {
    const checks = createLucaLinkRuntimeQaChecklist();
    const initial = summarizeLucaLinkRuntimeQaChecklist(checks);
    expect(initial.total).toBe(checks.length);
    expect(initial.requiredOpen).toBeGreaterThan(0);
    expect(initial.readyForRealImplementation).toBe(false);

    const passed = checks.map((item) => ({
      ...item,
      status: item.requiredBeforeRealImplementation
        ? ("passed" as const)
        : item.status,
    }));
    const complete = summarizeLucaLinkRuntimeQaChecklist(passed);
    expect(complete.requiredPassed).toBe(complete.required);
    expect(complete.requiredOpen).toBe(0);
    expect(complete.readyForRealImplementation).toBe(true);
  });

  it("lists manual, blocking, and readiness gates without mutating input", () => {
    const checks = createLucaLinkRuntimeQaChecklist();
    const manual = listManualRuntimeQaChecks(checks);
    const blocking = listBlockingRuntimeQaChecks(checks);
    const readiness = listRealImplementationReadinessChecks(checks);

    expect(manual.length).toBeGreaterThan(0);
    expect(manual.every((item) => !item.automationAvailable)).toBe(true);
    expect(blocking.every((item) => item.requiredBeforeRealImplementation)).toBe(
      true,
    );
    expect(readiness).toHaveLength(
      checks.filter((item) => item.requiredBeforeRealImplementation).length,
    );
  });

  it("documents the model-only and terminology boundaries", () => {
    const text = JSON.stringify(createLucaLinkRuntimeQaChecklist());
    expect(text).toContain("generatedTextOnly");
    expect(text).toContain("raw memory databases");
    expect(text).toContain("does not execute or install");
    expect(text).toContain("never auto-approved");
    expect(text).toContain("Origin remains reserved");
    expect(text).toContain("Primary Host");
  });
});
