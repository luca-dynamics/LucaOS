import { describe, expect, it } from "vitest"; import source from "./SandboxRuntimeSettingsPanel.tsx?raw";
describe("SandboxRuntimeSettingsPanel", () => { it("uses only the narrow desktop sandbox bridge", () => { expect(source).toContain("luca?.sandbox"); expect(source).not.toContain("child_process"); expect(source).not.toContain("host fallback is enabled"); }); });
