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
    expect(source).toContain("<WebReadyState");
    expect(source).not.toContain("Original onboarding complete");
    expect(source).not.toContain("Continue to LucaOS Web Shell");
    expect(source).not.toContain("System Ready");
  });

  it("branches returning users directly to shell in default flow", () => {
    expect(source).toContain('useState<WebLifecycleState>("post_boot")');
    expect(source).toContain("resolveWebPostBootState()");
    expect(source).toContain("resolvePostBootTarget(snapshot)");
    expect(source).toContain('snapshot.userState === "new_user"');
    expect(source).toContain('return showWebReadyDebug ? "ready" : "main"');
  });

  it("does not show the debug ready state unless explicitly enabled", () => {
    expect(source).toContain('lifecycleState === "ready" && showWebReadyDebug');
    expect(source).toContain('setLifecycleState(showWebReadyDebug ? "ready" : "main")');
    expect(source).not.toMatch(/lifecycleState === "ready" && \(/);
  });

  it("drives the static boot loader while post-boot state resolves", () => {
    expect(source).not.toContain("WebPostBootLoading");
    expect(source).not.toContain("WebPostBootTransition");
    expect(source).toContain("__LUCA_SET_BOOT_STATUS__");
    expect(source).toContain("Preparing memory boundaries");
    expect(source).toContain("Preparing safe tool access");
    expect(source).toContain("document.getElementById(\"root-loader\")");
  });
});
