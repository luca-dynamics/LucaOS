import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");

describe("Provider Hub runtime route selection setting", () => {
  it("defaults to false", () => {
    const source = readFileSync("src/services/settingsService.ts", "utf8");
    expect(source).toMatch(/runtimeRouteSelectionEnabled\??: boolean/);
    expect(source).toMatch(/providerHub:\s*{[\s\S]*disabledProviderIds:\s*\[\],[\s\S]*runtimeRouteSelectionEnabled:\s*false/);
  });
});
