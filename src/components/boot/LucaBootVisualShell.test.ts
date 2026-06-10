import { describe, expect, it } from "vitest";
import * as bootVisualShellModel from "./lucaBootVisualShellModel";
import {
  LUCA_BOOT_IDENTITY_ASSET_SRC,
  LUCA_BOOT_VISUAL_LANGUAGE,
  LUCA_BROWSER_SAFE_BOOT_STATUS,
  buildBrowserSafeLucaBootReadinessItems,
  buildLucaBootReadinessItems,
  getLucaBootLaunchIdentityPresence,
} from "./lucaBootVisualShellModel";
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
    expect(items.find((item) => item.id === "tools")).toMatchObject({
      label: "Model bridge",
      detail: "Local model bridge",
      source: "biosStatus",
      sourceKey: "ollama",
    });
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

  it("keeps launch identity presence visual-only and tied to existing boot sequences", () => {
    const launchPresence = getLucaBootLaunchIdentityPresence("INIT");
    const readinessPresence = getLucaBootLaunchIdentityPresence("BIOS");

    expect(launchPresence).toMatchObject({
      label: "LucaOS",
      subtitle: "Host-native AI operating system",
      assetSrc: LUCA_BOOT_IDENTITY_ASSET_SRC,
      emphasis: "launch",
      visualOnly: true,
      source: "existing-landing-hologram-face-asset",
      introducesBootPhase: false,
      usesHeavyHologramRuntime: false,
    });
    expect(readinessPresence).toMatchObject({
      assetSrc: LUCA_BOOT_IDENTITY_ASSET_SRC,
      emphasis: "supporting",
      visualOnly: true,
      introducesBootPhase: false,
      usesHeavyHologramRuntime: false,
    });
    expect(launchPresence.markOpacity).toBeGreaterThan(
      readinessPresence.markOpacity,
    );
  });

  it("models the browser-safe web boot shell without desktop polling", () => {
    const items = buildBrowserSafeLucaBootReadinessItems();

    expect(LUCA_BROWSER_SAFE_BOOT_STATUS).toMatchObject({
      headline: "Entering browser host",
      detail: "Resolving host interface",
      progress: 100,
    });
    expect(LUCA_BOOT_VISUAL_LANGUAGE).toMatchObject({
      shell: "premium-luca-hologram-presence",
      sharedAcrossDesktopAndWeb: true,
      primaryIdentity: "Existing landing hologram face presence",
      forbidsGenericWebOrbAsMainVisual: true,
      forbidsLogoIconAsMainVisual: true,
      usesHeavyHologramRuntime: false,
    });
    expect(items.map((item) => item.label)).toEqual([
      "Web surface",
      "Memory surface",
      "Model router",
      "Desktop runtime",
      "LucaLink",
      "Actions",
    ]);
    expect(items.map((item) => item.detail)).toEqual([
      "Web surface ready",
      "Memory surface prepared",
      "Model router guarded",
      "Desktop runtime requires LucaOS Desktop",
      "LucaLink requires pairing",
      "Actions remain permissioned",
    ]);
    expect(items.map((item) => item.statusLabel)).toEqual([
      "Ready",
      "Prepared",
      "Guarded",
      "Desktop required",
      "Pairing required",
      "Permissioned",
    ]);
    expect(items.every((item) => item.source === "webPolicy")).toBe(true);
    expect(JSON.stringify(items)).not.toMatch(
      /localhost|127\.0\.0\.1|ollama|cortex|Initializing Luca OS/i,
    );
  });

  it("keeps the pre-hydration loader aligned with the shared hologram presence", async () => {
    const { readFile } = await import("node:fs/promises");
    const html = await readFile("index.html", "utf8");

    expect(html).toContain("loader-presence");
    expect(html).toContain("loader-hologram-face");
    expect(html).toContain("landing/hologram.png");
    expect(html).not.toContain("loader-face");
    expect(html).not.toContain("loader-host-grid");
    expect(html).toContain("Entering browser host");
    expect(html).toContain("Host-native AI operating system");
    expect(html).not.toMatch(/loader-orb|loader-host-grid|loader-face|Preparing web-safe interface|yellow|gold|status::before/i);
    expect(html).not.toContain("#root-loader::before");
    expect(html).not.toContain("loader-scanline");
  });

  it("exposes no execution surfaces", () => {
    expect(Object.keys(bootVisualShellModel).join(" ")).not.toMatch(
      /execute|runTool|automation|screenshot|ocr|fileAccess|messaging|wireless|HologramScene|setTimeout|setInterval/i,
    );
  });
});
