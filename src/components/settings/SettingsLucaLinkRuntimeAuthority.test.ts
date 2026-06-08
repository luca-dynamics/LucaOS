import componentSource from "./SettingsLucaLinkRuntimeAuthority.tsx?raw";
import { describe, expect, it } from "vitest";

describe("Settings LucaLink runtime authority card", () => {
  it("renders the authority boundary and safety copy without operational controls", () => {
    expect(componentSource).toContain("Runtime Authority Boundary");
    expect(componentSource).toContain("Runtime authority is not granted.");
    expect(componentSource).toContain("Future bounded handoff candidate does not mean sendable.");
    expect(componentSource).toContain("Dry-run success does not authorize handoff.");
    expect(componentSource).toContain("No transport, adapter, display, sensor, file, install, or host mutation is performed.");
    expect(componentSource).not.toMatch(/<button\b/i);
    expect(componentSource).not.toContain("useEffect");
  });
});
