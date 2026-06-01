import { describe, expect, it } from "vitest";
import * as bootVisualShellModel from "./lucaBootVisualShellModel";
import { buildLucaBootReadinessItems } from "./lucaBootVisualShellModel";
import { LUCA_BOOT_SEQUENCE_STATES } from "../../services/runtime/lucaBootExperienceMap";
import {
  getLucaBootDiagnosticCopy,
  getLucaBootStatusCopy,
} from "../../services/runtime/lucaBootCopyModel";

describe("LucaBootVisualShell readiness model", () => {
  it("derives readiness items from existing boot copy and biosStatus only", () => {
    const items = buildLucaBootReadinessItems("BIOS", {
      server: "OK",
      core: "PENDING",
      vision: "FAIL",
      audio: "OK",
      ollama: "PENDING",
    });

    expect(items.map((item) => item.id)).toEqual([
      "memory",
      "workspace",
      "localBrain",
      "vision",
      "voice",
      "safety",
      "tools",
    ]);
    expect(
      items.every((item) => ["biosStatus", "bootCopy"].includes(item.source)),
    ).toBe(true);
    expect(
      items
        .filter((item) => item.source === "biosStatus")
        .map((item) => item.sourceKey),
    ).toEqual(["server", "core", "vision", "audio", "ollama"]);
    expect(
      items
        .filter((item) => item.source === "bootCopy")
        .map((item) => item.sourceKey),
    ).toEqual(["checkingMemoryBanks", "securityProtocols"]);
    expect(items.find((item) => item.id === "workspace")?.statusLabel).toBe(
      getLucaBootStatusCopy("OK"),
    );
    expect(items.find((item) => item.id === "vision")?.statusLabel).toBe(
      getLucaBootStatusCopy("FAIL"),
    );
  });

  it("does not introduce new BootSequence values", () => {
    expect(LUCA_BOOT_SEQUENCE_STATES).toEqual([
      "INIT",
      "BIOS",
      "KERNEL",
      "ONBOARDING",
      "READY",
    ]);

    for (const bootSequence of LUCA_BOOT_SEQUENCE_STATES) {
      const items = buildLucaBootReadinessItems(bootSequence, {
        server: "PENDING",
        core: "PENDING",
        vision: "PENDING",
        audio: "PENDING",
      });

      expect(items.length).toBe(6);
      expect(
        items.every((item) => ["OK", "FAIL", "PENDING"].includes(item.status)),
      ).toBe(true);
    }
  });

  it("keeps BIOS diagnostics as secondary readiness data", () => {
    const items = buildLucaBootReadinessItems("INIT", {
      server: "PENDING",
      core: "PENDING",
      vision: "PENDING",
      audio: "PENDING",
    });
    const memory = items.find((item) => item.id === "memory");
    const safety = items.find((item) => item.id === "safety");

    expect(memory).toMatchObject({
      label: "Memory",
      detail: getLucaBootDiagnosticCopy("checkingMemoryBanks").standardLabel,
      source: "bootCopy",
    });
    expect(safety).toMatchObject({
      label: "Safety",
      detail: getLucaBootDiagnosticCopy("securityProtocols").standardLabel,
      source: "bootCopy",
    });
    expect(
      [memory?.label, safety?.label, memory?.detail, safety?.detail].join(" "),
    ).not.toContain(getLucaBootDiagnosticCopy("biosIdentity").tacticalLabel);
  });

  it("exposes no execution surfaces", () => {
    expect(Object.keys(bootVisualShellModel).join(" ")).not.toMatch(
      /execute|runTool|browser|automation|screenshot|ocr|fileAccess|messaging|wireless/i,
    );
  });
});
