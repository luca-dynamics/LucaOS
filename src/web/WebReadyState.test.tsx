const { readFileSync } = process.getBuiltinModule("node:fs");
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WebReadyState } from "./WebReadyState";

const source = readFileSync("src/web/WebReadyState.tsx", "utf8");
const lifecycleSource = readFileSync("src/web/WebLifecycleShell.tsx", "utf8");

const renderReady = () =>
  renderToStaticMarkup(
    <WebReadyState
      hostClass="public-web"
      browserCapabilities={[]}
      guardedNativeCapabilities={[]}
      lucaLinkStatus="connected"
      onContinueToShell={() => {}}
    />,
  );

describe("WebReadyState", () => {
  it("stays debug-gated out of the default lifecycle path", () => {
    expect(lifecycleSource).toContain("VITE_LUCA_SHOW_WEB_READY_DEBUG");
    expect(lifecycleSource).toContain('showWebReadyDebug ? "ready" : "main"');
    expect(lifecycleSource).toContain('lifecycleState === "ready" && showWebReadyDebug');
  });

  it("renders product-native LucaOS readiness copy when explicitly enabled", () => {
    const html = renderReady();

    expect(html).toContain("Workspace ready");
    expect(html).toContain("Luca is ready");
    expect(html).toContain("Your personal AI workspace is ready.");
    expect(html).toContain("Open LucaOS");
  });

  it("uses static presence visuals and avoids rotating hologram readiness treatment", () => {
    const html = renderReady();

    expect(source).toContain("LucaStaticFacePresence");
    expect(source).toContain("LucaCanvasPresenceOrb");
    expect(source).not.toMatch(/HologramFace|HologramScene|LucaHologramShaderPresence|LucaHologramShaderScene/);
    expect(html).toContain('src="/icon.png"');
    expect(html).toContain('data-visual-source="dictation-voice-canvas-orb"');
  });

  it("does not expose terminal or debug wording in rendered readiness UI", () => {
    const html = renderReady().toLowerCase();
    for (const forbidden of [
      "system ready",
      "original onboarding complete",
      "continue to lucaos web shell",
      "runtime adapter",
      "browser-safe",
      "native routes",
      "model execution adapter",
      "kernel",
      "protocol",
      "webbridge",
    ]) {
      expect(html, forbidden).not.toContain(forbidden);
    }
  });
});
