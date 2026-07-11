import { describe, expect, it } from "vitest";
import managerSource from "./manager.ts?raw";
import boundarySource from "./lucaLinkRelayBoundary.ts?raw";

describe("LucaLink relay boundary", () => {
  it("keeps the concrete relay implementation behind one boundary module", () => {
    expect(managerSource).not.toContain('from "./relayClientAdapter"');
    expect(boundarySource).toContain(
      'from "./relayClientAdapter"',
    );
  });

  it("exposes a stable manager-facing relay instance", async () => {
    const { lucaLinkRelayBoundary } = await import(
      "./lucaLinkRelayBoundary"
    );
    expect(typeof lucaLinkRelayBoundary.getState).toBe("function");
    expect(typeof lucaLinkRelayBoundary.send).toBe("function");
    expect(typeof lucaLinkRelayBoundary.onMessage).toBe("function");
  });
});
