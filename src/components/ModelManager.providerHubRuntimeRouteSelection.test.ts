import modelManagerSource from "./ModelManager.tsx?raw";
import { describe, expect, it } from "vitest";

describe("ModelManager Provider Hub runtime selection toggle", () => {
  it("renders copy and persists through settingsService", () => {
    expect(modelManagerSource).toContain("Use Provider Hub route selection");
    expect(modelManagerSource).toContain("Preview/runtime guard. Existing runtime remains default unless enabled.");
    expect(modelManagerSource).toContain("runtimeRouteSelectionEnabled");
    expect(modelManagerSource).toContain("settingsService.saveSettings({ providerHub:");
    expect(modelManagerSource).toContain("selectProviderHubRuntimeRoute");
  });
});
