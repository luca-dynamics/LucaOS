import { describe, expect, it, vi } from "vitest";
import { createElectronSandboxBrowserDriver } from "./ElectronSandboxBrowserDriver";

describe("ElectronSandboxBrowserDriver", () => {
  it("creates session and navigates via luca-browser plan", async () => {
    const invoke = vi.fn(async (channel: string, ...args: unknown[]) => {
      if (channel === "sandbox:create") return { sessionId: "sess-1" };
      if (channel === "sandbox:execute") return { exitCode: 0 };
      if (channel === "sandbox:destroy") return true;
      throw new Error(`unexpected ${channel} ${JSON.stringify(args)}`);
    });

    const driver = createElectronSandboxBrowserDriver({ invoke });
    expect(driver.kind).toBe("electron_sandbox");

    const nav = await driver.navigate("https://example.com");
    expect(nav.ok).toBe(true);
    expect(invoke).toHaveBeenCalledWith("sandbox:create", expect.any(Object));
    expect(invoke).toHaveBeenCalledWith(
      "sandbox:execute",
      "sess-1",
      expect.objectContaining({
        executable: "/usr/local/bin/luca-browser",
      }),
    );

    const execCall = invoke.mock.calls.find((c) => c[0] === "sandbox:execute");
    const plan = JSON.parse(
      Buffer.from((execCall?.[2] as { args: string[] }).args[0], "base64url").toString(
        "utf8",
      ),
    );
    expect(plan.url).toBe("https://example.com");
    expect(plan.actions).toEqual([]);

    await driver.dispose();
    expect(invoke).toHaveBeenCalledWith("sandbox:destroy", "sess-1");
  });

  it("clicks with role/name semantics", async () => {
    const invoke = vi.fn(async (channel: string) => {
      if (channel === "sandbox:create") return { sessionId: "s2" };
      return { exitCode: 0 };
    });
    const driver = createElectronSandboxBrowserDriver({
      invoke,
      defaultUrl: "https://example.com",
    });

    const result = await driver.click(undefined, {
      role: "button",
      name: "Continue",
    });
    expect(result.ok).toBe(true);

    const execCall = invoke.mock.calls.find((c) => c[0] === "sandbox:execute");
    const plan = JSON.parse(
      Buffer.from((execCall?.[2] as { args: string[] }).args[0], "base64url").toString(
        "utf8",
      ),
    );
    expect(plan.actions[0]).toEqual({
      type: "click",
      role: "button",
      name: "Continue",
    });
  });

  it("rejects file:// navigate", async () => {
    const driver = createElectronSandboxBrowserDriver({
      invoke: vi.fn(async () => ({ sessionId: "x" })),
    });
    const result = await driver.navigate("file:///etc/passwd");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/protocol/i);
  });

  it("requires accessible name for click", async () => {
    const driver = createElectronSandboxBrowserDriver({
      invoke: vi.fn(async () => ({ sessionId: "x" })),
      defaultUrl: "https://example.com",
    });
    const result = await driver.click(undefined, { role: "button" });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/name/i);
  });

  it("extract and screenshot are explicitly unsupported", async () => {
    const driver = createElectronSandboxBrowserDriver({
      invoke: vi.fn(async () => ({ sessionId: "x" })),
    });
    expect((await driver.extract()).ok).toBe(false);
    expect((await driver.screenshot()).ok).toBe(false);
  });
});
