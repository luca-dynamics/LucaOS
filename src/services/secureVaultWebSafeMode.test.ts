import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const secureVaultSource = readFileSync("src/services/secureVault.js", "utf8");
const webBridgeShellSource = readFileSync("src/web/WebBridgeShell.tsx", "utf8");
const diagnosticsSource = readFileSync("src/web/WebBridgeDiagnostics.tsx", "utf8");

describe("secure vault web safe mode boot guard", () => {
  it("keeps native/secure runtime validation strict for invalid master keys", () => {
    expect(secureVaultSource).toContain("const MASTER_KEY_FORMAT_ERROR");
    expect(secureVaultSource).toContain("throw new Error(MASTER_KEY_FORMAT_ERROR)");
    expect(secureVaultSource).toMatch(/if \(this\.webSafeMode\) \{[\s\S]*?return;[\s\S]*?\}[\s\S]*?throw new Error\(MASTER_KEY_FORMAT_ERROR\)/);
  });

  it("degrades browser hosts instead of throwing before React can mount", () => {
    expect(secureVaultSource).toContain("publishWebSafeModeDiagnostic(validation)");
    expect(secureVaultSource).toContain("reason: 'invalid-master-key'");
    expect(secureVaultSource).toContain("secureRuntimeAvailable: false");
    expect(secureVaultSource).toContain("canMountWebUi: true");
    expect(secureVaultSource).toContain("this.key = null");
  });

  it("reports safe-mode diagnostics without leaking key material", () => {
    expect(secureVaultSource).toContain("keyStatus: validation.status");
    expect(secureVaultSource).toContain("expectedKeyFormat: '64 hex characters / 32 bytes'");
    expect(secureVaultSource).not.toContain("MASTER_KEY_HEX,");
    expect(secureVaultSource).not.toContain("weak fallback");
    expect(diagnosticsSource).toContain("masterKeyStatus");
    expect(diagnosticsSource).toContain("secureRuntimeAvailable");
  });

  it("shows a recoverable Web Safe Mode warning in the browser shell", () => {
    expect(webBridgeShellSource).toContain("LucaOS started in Web Safe Mode");
    expect(webBridgeShellSource).toContain("protected");
    expect(webBridgeShellSource).toContain("runtime features are disabled");
  });
});
