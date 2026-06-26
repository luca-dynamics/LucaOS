import { describe, expect, it } from "vitest";
import { webAppRuntime } from "./webAppRuntime";

describe("webAppRuntime (Phase 1 foundation)", () => {
  it("exposes the chat runtime as the chat surface", () => {
    expect(typeof webAppRuntime.chat.sendMessage).toBe("function");
  });

  it("reports honest control rows, mapping LucaLink status", () => {
    const ready = webAppRuntime.getControlState({ lucaLinkStatus: "ready-to-pair" });
    const link = ready.rows.find((r) => r.id === "lucalink");
    expect(link?.value).toBe("Ready to pair");
    expect(link?.availability).toBe("ready");

    const noConnector = webAppRuntime.getControlState({ lucaLinkStatus: "connector-required" });
    expect(noConnector.rows.find((r) => r.id === "lucalink")?.availability).toBe(
      "connect-required",
    );

    // Luca Prime and local routes stay honest about not being connected yet.
    const prime = ready.rows.find((r) => r.id === "luca-prime");
    expect(prime?.availability).toBe("preparing");
    expect(ready.rows.find((r) => r.id === "local-routes")?.availability).toBe(
      "connect-required",
    );
  });

  it("defaults LucaLink to connector-required when status is missing", () => {
    const row = webAppRuntime.getControlState().rows.find((r) => r.id === "lucalink");
    expect(row?.value).toBe("Connector required");
    expect(row?.availability).toBe("connect-required");
  });

  it("reports empty (not fabricated) activity and memory states", () => {
    expect(webAppRuntime.getActivityState().entries).toEqual([]);
    expect(webAppRuntime.getActivityState().emptyMessage.length).toBeGreaterThan(0);
    expect(webAppRuntime.getMemoryState().items).toEqual([]);
    expect(webAppRuntime.getMemoryState().emptyMessage.length).toBeGreaterThan(0);
  });

  it("exposes a default workspace session", () => {
    const workspace = webAppRuntime.getWorkspaceState();
    expect(workspace.sessions.some((s) => s.active)).toBe(true);
  });
});
