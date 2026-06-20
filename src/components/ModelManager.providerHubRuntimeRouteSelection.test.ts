import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ModelManager Provider Hub runtime selection toggle", () => {
  it("renders copy and persists through settingsService", () => {
    const source = readFileSync("src/components/ModelManager.tsx", "utf8");
    expect(source).toContain("Use Provider Hub route selection");
    expect(source).toContain("Preview/runtime guard. Existing runtime remains default unless enabled.");
    expect(source).toContain("runtimeRouteSelectionEnabled");
    expect(source).toContain("settingsService.saveSettings({ providerHub:");
    expect(source).toContain("selectProviderHubRuntimeRoute");
  });
});
