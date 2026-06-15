import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");
const source = readFileSync("src/web/WebLifecycleShell.tsx", "utf8");

describe("WebLifecycleShell", () => {
  it("transitions from ready to the wired main shell", () => {
    expect(source).toContain(
      'type WebLifecycleState = "onboarding" | "ready" | "main"',
    );
    expect(source).toContain('onContinueToShell={() => setLifecycleState("main")}');
    expect(source).toContain('lifecycleState === "main"');
    expect(source).toContain("<WebLucaShell");
  });

  it("reports the real lifecycle state to diagnostics", () => {
    expect(source).toContain("lifecycleState={lifecycleState}");
    expect(source).toContain('"web-luca-shell"');
  });
});
