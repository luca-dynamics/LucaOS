import { describe, expect, it, vi } from "vitest";
import {
  getComputerUseSettings,
  resolveComputerUseStackFromSettings,
  resolveDriverKindFromSettings,
} from "./resolveComputerUseStackFromSettings";
import type { BrowserDriver } from "../browserRuntime/types";

describe("resolveComputerUseStackFromSettings", () => {
  it("defaults all computerUse flags to safe values", () => {
    expect(getComputerUseSettings({})).toEqual({
      realSandboxEnabled: false,
      driverKind: "auto",
      headless: true,
      enableMissionTapeSink: false,
    });
  });

  it("resolves auto driver to playwright without electron sandbox", () => {
    const kind = resolveDriverKindFromSettings(
      { computerUse: { realSandboxEnabled: true, driverKind: "auto" } },
      {} as Window,
    );
    expect(kind).toBe("playwright");
  });

  it("builds scaffold stack when realSandboxEnabled is false", async () => {
    const stack = await resolveComputerUseStackFromSettings({
      computerUse: { realSandboxEnabled: false },
    });
    expect(stack.enabled).toBe(false);
    expect(stack.driverKind).toBe("none");
  });

  it("builds real stack with injected driver from settings enablement", async () => {
    const driver: BrowserDriver = {
      kind: "injected",
      navigate: vi.fn(async () => ({ ok: true })),
      click: vi.fn(async () => ({ ok: true })),
      type: vi.fn(async () => ({ ok: true })),
      extract: vi.fn(async () => ({ ok: true })),
      screenshot: vi.fn(async () => ({ ok: true })),
    };

    const stack = await resolveComputerUseStackFromSettings(
      { computerUse: { realSandboxEnabled: true } },
      { driver },
    );

    expect(stack.enabled).toBe(true);
    expect(stack.driverKind).toBe("injected");
  });
});
