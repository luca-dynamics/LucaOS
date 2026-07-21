import modelManagerSource from "./ModelManager.tsx?raw";
import { describe, expect, it } from "vitest";

describe("ModelManager Provider Hub runtime selection toggle", () => {
  it("renders copy and persists through settingsService", () => {
    expect(modelManagerSource).toContain("Use Provider Hub route selection (chat cohort)");
    expect(modelManagerSource).toContain("Task scope for runtime handoff");
    expect(modelManagerSource).toContain("chat_only");
    expect(modelManagerSource).toContain("runtimeRouteSelectionTaskScope");
    expect(modelManagerSource).toContain("runtimeRouteSelectionEnabled");
    expect(modelManagerSource).toContain("settingsService.saveSettings({ providerHub:");
    expect(modelManagerSource).toContain("selectProviderHubRuntimeRoute");
  });
});
