import componentSource from "./SettingsLucaLinkDryRunHandoff.tsx?raw";
import { describe, expect, it } from "vitest";

describe("Settings LucaLink dry-run handoff card", () => {
  it("renders safety copy and no operational controls", () => {
    expect(componentSource).toContain("Dry-run Handoff Simulation");
    expect(componentSource).toContain("Dry-run only — no LucaLink handoff is performed.");
    expect(componentSource).toContain("No transport message is sent.");
    expect(componentSource).toContain("No adapter, display, sensor, file, or install action is executed.");
    expect(componentSource).not.toMatch(/<button\b/i);
  });
});
