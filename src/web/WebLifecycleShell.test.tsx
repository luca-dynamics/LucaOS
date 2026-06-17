import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");
const source = readFileSync("src/web/WebLifecycleShell.tsx", "utf8");

describe("WebLifecycleShell", () => {
  it("auto-enters the LucaOS shell after onboarding unless debug ready is explicit", () => {
    expect(source).toContain('type WebLifecycleState = "post_boot" | "onboarding" | "ready" | "main"');
    expect(source).toContain("VITE_LUCA_SHOW_WEB_READY_DEBUG");
    expect(source).toContain('showWebReadyDebug ? "ready" : "main"');
    expect(source).toContain('lifecycleState === "main"');
    expect(source).toContain("<WebLucaShell");
    expect(source).not.toContain("Original onboarding complete");
    expect(source).not.toContain("Continue to LucaOS Web Shell");
  });

  it("branches returning users directly to shell in default flow", () => {
    expect(source).toContain('useState<WebLifecycleState>("post_boot")');
    expect(source).toContain("resolveWebPostBootState()");
    expect(source).toContain('postBootState.userState === "new_user"');
    expect(source).toContain(': showWebReadyDebug');
    expect(source).toContain(': "main"');
  });

  it("renders an immediate loading surface while post-boot state resolves", () => {
    expect(source).toContain('import { WebPostBootLoading } from "./postBoot/WebPostBootLoading"');
    expect(source).toContain('lifecycleState === "post_boot" && !postBootState');
    expect(source).toContain("<WebPostBootLoading />");
  });
});
