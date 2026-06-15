import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");
const source = readFileSync("src/web/WebLifecycleShell.tsx", "utf8");

describe("WebLifecycleShell", () => {
  it("transitions from ready to the wired main shell", () => {
    expect(source).toContain(
      'type WebLifecycleState = "post_boot" | "onboarding" | "ready" | "main"',
    );
    expect(source).toContain('onContinueToShell={() => setLifecycleState("main")}');
    expect(source).toContain('lifecycleState === "main"');
    expect(source).toContain("<WebLucaShell");
  });

  it("branches from post-boot by resolved user state", () => {
    expect(source).toContain('useState<WebLifecycleState>("post_boot")');
    expect(source).toContain("resolveWebPostBootState()");
    expect(source).toContain(
      'postBootState.userState === "new_user" ? "onboarding" : "ready"',
    );
    expect(source).toContain("<WebPostBootTransition");
  });

  it("renders an immediate loading surface while post-boot state resolves", () => {
    expect(source).toContain(
      'import { WebPostBootLoading } from "./postBoot/WebPostBootLoading"',
    );
    expect(source).toContain(
      'lifecycleState === "post_boot" && !postBootState',
    );
    expect(source).toContain("<WebPostBootLoading />");
  });

  it("reports the real lifecycle state to diagnostics", () => {
    expect(source).toContain("lifecycleState={lifecycleState}");
    expect(source).toContain('"web-luca-shell"');
  });
});
