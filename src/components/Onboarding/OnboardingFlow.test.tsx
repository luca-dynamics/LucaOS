import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");
const source = readFileSync(
  "src/components/Onboarding/OnboardingFlow.tsx",
  "utf8",
);
const webRuntimeSource = readFileSync(
  "src/web/adapters/webOnboardingRuntime.tsx",
  "utf8",
);

describe("OnboardingFlow kernel awakening presentation", () => {
  it("replaces the default public terminal with premium preparation visuals", () => {
    expect(source).toContain("<LucaHologramShaderPresence");
    expect(source).toContain("<LucaCanvasPresenceOrb");
    expect(source).toContain("Preparing LucaOS");
    expect(source).toContain(
      "Luca is setting up your personal AI environment.",
    );
    expect(source).not.toContain('{">"} {text}');
    expect(source).not.toMatch(/>\s*Luca is waking up/);
  });

  it("explicitly avoids replaying preparation after WebBridge post-boot", () => {
    expect(webRuntimeSource).toContain("skipKernelAwakeningVisual: true");
    expect(source).toContain("runtime.skipKernelAwakeningVisual");
    expect(source).toContain("onboardingController.afterKernelAwakening()");
  });
});
