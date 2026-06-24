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
    expect(secureVaultSource).toContain("window.__LUCA_WEB_SAFE_MODE__ = {");
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

  it("shows a compact recoverable Web Safe Mode indicator in the browser shell", () => {
    expect(webBridgeShellSource).toContain("Web Safe Mode");
    expect(webBridgeShellSource).toContain("Secure local memory disabled");
    expect(webBridgeShellSource).toContain("Details");
    expect(webBridgeShellSource).toContain("aria-expanded={expanded}");
    expect(webBridgeShellSource).toContain("role=\"status\"");
    expect(webBridgeShellSource).toContain("bottom-4 left-4");
    expect(webBridgeShellSource).not.toContain("LucaOS started in Web Safe Mode");
    expect(webBridgeShellSource).not.toContain("top-4");
    expect(webBridgeShellSource).not.toContain("right-4");
  });

  it("keeps full safe-mode diagnostics behind details unless boot debug is active", () => {
    expect(webBridgeShellSource).toContain("useState(isBootDebug)");
    expect(webBridgeShellSource).toContain('get("bootDebug") === "1"');
    expect(webBridgeShellSource).toContain("reason");
    expect(webBridgeShellSource).toContain("key status");
    expect(webBridgeShellSource).toContain("expected format");
    expect(webBridgeShellSource).toContain("secureRuntimeAvailable");
    expect(webBridgeShellSource).toContain("reactMountAllowed");
    expect(webBridgeShellSource).toContain("host");
    expect(webBridgeShellSource).toContain("path");
  });

  it("does not add secrets, root DOM mutations, providers, or motion to the safe-mode banner", () => {
    expect(webBridgeShellSource).not.toContain("MASTER_KEY_HEX");
    expect(webBridgeShellSource).not.toContain("LUCA_VAULT_KEY");
    expect(webBridgeShellSource).not.toContain("expectedKeyFormat: '64 hex characters / 32 bytes'");
    expect(webBridgeShellSource).not.toContain("crypto.randomBytes(32)");
    expect(webBridgeShellSource).not.toContain("document.documentElement");
    expect(webBridgeShellSource).not.toContain("style.setProperty");
    expect(webBridgeShellSource).not.toContain("document.body");
    expect(webBridgeShellSource).not.toContain("body.style");
    expect(webBridgeShellSource).not.toContain('document.querySelector("html")');
    expect(webBridgeShellSource).not.toContain("LucaSkinProvider");
    expect(webBridgeShellSource).not.toContain("@keyframes");
    expect(webBridgeShellSource).not.toContain("animation:");
    expect(webBridgeShellSource).not.toContain("requestAnimationFrame");
    expect(webBridgeShellSource).not.toContain("setInterval");
    expect(webBridgeShellSource).not.toContain("setTimeout");
    expect(webBridgeShellSource).not.toContain("parallax");
    expect(webBridgeShellSource).not.toContain("Onboarding");
    expect(webBridgeShellSource).not.toContain("ModeSelect");
    expect(webBridgeShellSource).not.toContain("lucaSkin");
  });
});
