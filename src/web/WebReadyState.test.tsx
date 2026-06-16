const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";

const source = readFileSync("src/web/WebReadyState.tsx", "utf8");
const lifecycleSource = readFileSync("src/web/WebLifecycleShell.tsx", "utf8");

describe("WebReadyState", () => {
  it("does not expose the old completion interstitial in default flow", () => {
    expect(source).not.toContain("Original onboarding complete");
    expect(source).not.toContain("Continue to LucaOS Web Shell");
    expect(lifecycleSource).toContain("VITE_LUCA_SHOW_WEB_READY_DEBUG");
    expect(lifecycleSource).toContain('showWebReadyDebug ? "ready" : "main"');
  });
});
