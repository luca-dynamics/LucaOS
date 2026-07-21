import { describe, expect, it, vi } from "vitest";
import {
  hasElectronSandboxIpc,
  resolveElectronSandboxInvoke,
} from "./resolveElectronSandboxInvoke";

describe("resolveElectronSandboxInvoke", () => {
  it("returns false without window APIs", () => {
    expect(resolveElectronSandboxInvoke(undefined).ok).toBe(false);
    expect(hasElectronSandboxIpc(undefined)).toBe(false);
  });

  it("uses luca.sandbox when present", async () => {
    const create = vi.fn(async () => ({ sessionId: "s1" }));
    const execute = vi.fn(async () => ({ exitCode: 0 }));
    const destroy = vi.fn(async () => true);
    const win = {
      luca: {
        sandbox: {
          probe: vi.fn(),
          create,
          list: vi.fn(),
          listSnapshots: vi.fn(),
          snapshot: vi.fn(),
          cleanupExpired: vi.fn(),
          execute,
          exportArtifact: vi.fn(),
          importArtifact: vi.fn(),
          destroy,
        },
      },
    } as unknown as Window;

    const resolved = resolveElectronSandboxInvoke(win);
    expect(resolved.ok).toBe(true);
    expect(resolved.source).toBe("luca.sandbox");

    await resolved.invoke!("sandbox:create", { capabilities: ["browser"] });
    expect(create).toHaveBeenCalled();
    await resolved.invoke!("sandbox:execute", "s1", { executable: "x" });
    expect(execute).toHaveBeenCalledWith("s1", { executable: "x" });
  });

  it("falls back to electron.ipcRenderer.invoke", async () => {
    const invoke = vi.fn(async () => "ok");
    const win = {
      electron: { ipcRenderer: { invoke } },
    } as unknown as Window;

    const resolved = resolveElectronSandboxInvoke(win);
    expect(resolved.ok).toBe(true);
    expect(resolved.source).toBe("electron.ipcRenderer");
    await resolved.invoke!("sandbox:probe");
    expect(invoke).toHaveBeenCalledWith("sandbox:probe");
  });
});
