import { describe, expect, it } from "vitest";
import {
  createDisabledWebRuntimeAction,
  createLucaLinkWebState,
  createPersonalIntelligenceWebState,
  resolveWebRuntimeCapabilities,
} from "./webRuntimeCapabilities";

describe("webRuntimeCapabilities", () => {
  it("marks visual shell surfaces inspectable but desktop-required in web", () => {
    const capabilities = resolveWebRuntimeCapabilities({ isWebRuntime: true });

    expect(capabilities.hologram.status).toBe("desktop_required");
    expect(capabilities.lucaScreen.status).toBe("desktop_required");
    expect(capabilities.operationCenter.status).toBe("available");
  });

  it("keeps provider, local model, desktop, filesystem, and browser-tool execution disabled or desktop-required", () => {
    const capabilities = resolveWebRuntimeCapabilities({ isWebRuntime: true });

    expect(capabilities.providerRouting.status).toBe("disabled_in_web");
    expect(capabilities.localModels.status).toBe("desktop_required");
    expect(capabilities.desktopControl.status).toBe("desktop_required");
    expect(capabilities.fileSystemAccess.status).toBe("desktop_required");
    expect(capabilities.browserTools.status).toBe("disabled_in_web");
  });

  it("returns disabled/no-op results for privileged browser actions", () => {
    const capabilities = resolveWebRuntimeCapabilities({ isWebRuntime: true });
    const result = createDisabledWebRuntimeAction(capabilities.desktopControl);

    expect(result.ok).toBe(false);
    expect(result.capability).toBe("desktopControl");
    expect(result.status).toBe("desktop_required");
    expect(result.reason).toContain("browser-safe LucaOS web build");
  });

  it("does not expose raw Personal Intelligence memory in web state", () => {
    const capabilities = resolveWebRuntimeCapabilities({ isWebRuntime: true });
    const state = createPersonalIntelligenceWebState(
      capabilities.personalIntelligence,
    );

    expect(state.status).toBe("api_required");
    expect(state.rawMemory).toBeUndefined();
    expect(state.canPersist).toBe(false);
  });

  it("does not allow LucaLink host execution without pairing/desktop host", () => {
    const capabilities = resolveWebRuntimeCapabilities({ isWebRuntime: true });
    const state = createLucaLinkWebState(capabilities.lucaLink);

    expect(state.status).toBe("pairing_required");
    expect(state.canExecuteHostActions).toBe(false);
    expect(state.requires).toBe("Secure desktop pairing");
  });
});
