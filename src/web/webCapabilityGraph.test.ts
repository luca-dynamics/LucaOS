import { describe, expect, it } from "vitest";
import { buildWebCapabilityGraph } from "./webCapabilityGraph";

describe("buildWebCapabilityGraph", () => {
  it("guards native features without probing or importing native runtimes", () => {
    const graph = buildWebCapabilityGraph();

    expect(graph.encryptedLocalVault.status).toBe("desktop-required");
    expect(graph.masterKeyStorage.status).toBe("desktop-required");
    expect(graph.localSQLiteMemory.status).toBe("desktop-required");
    expect(graph.nativeAutomation.status).toBe("paired-host-required");
    expect(graph.mobileNativeRuntime.status).toBe("mobile-app-required");
    expect(graph.localProcessExecution.unlockOptions).toContain(
      "generate-approved-route",
    );
  });

  it("models LucaLink as an approved route and connector foundation", () => {
    const graph = buildWebCapabilityGraph();

    expect(graph.lucaLinkPairing.status).toBe("connector-required");
    expect(graph.lucaLinkPairing.unlockOptions).toContain("luca-link-host");
    expect(graph.desktopLucaLinkHostRuntime.status).toBe("desktop-required");
    expect(graph.sessionPorting.unlockOptions).toContain("luca-link-host");
    expect(graph.remoteCapabilityRoute.unlockOptions).toContain(
      "generate-approved-route",
    );
  });

  it("reports configured browser-safe API routes as available", () => {
    const graph = buildWebCapabilityGraph({
      cloudApiConfigured: true,
      webChatConfigured: true,
    });

    expect(graph.cloudModelRouting.status).toBe("available");
    expect(graph.webChat.status).toBe("available");
  });
});
