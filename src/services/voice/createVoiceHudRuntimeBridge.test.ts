import { describe, expect, it } from "vitest";
import { createVoiceHudRuntimeBridge } from "./createVoiceHudRuntimeBridge";

describe("createVoiceHudRuntimeBridge", () => {
  it("exposes the expected factory surface", () => {
    const hud = createVoiceHudRuntimeBridge();
    expect(hud.bridge).toBeDefined();
    expect(typeof hud.sendControl).toBe("function");
    expect(typeof hud.getState).toBe("function");
    expect(typeof hud.reset).toBe("function");
    expect(typeof hud.updateTranscript).toBe("function");
    expect(typeof hud.updateResponse).toBe("function");
    expect(typeof hud.syncFromVoiceRuntimeState).toBe("function");
  });

  it("supports control, updates, runtime sync and reset", () => {
    const hud = createVoiceHudRuntimeBridge();

    hud.sendControl("start_listening");
    hud.updateTranscript("hey luca");
    hud.updateResponse("hello");

    expect(hud.getState().status).toBe("listening");
    expect(hud.getState().currentTranscript).toBe("hey luca");
    expect(hud.getState().currentResponse).toBe("hello");

    hud.syncFromVoiceRuntimeState({ status: "speaking", metadata: { runtimeKind: "voice_scaffold", audioApisCalled: false, sttApisCalled: false, ttsApisCalled: false, systemApisCalled: false, heavyModelsLoaded: false, storageWritesEnabled: false, requiresExplicitOptIn: true } });
    expect(hud.getState().status).toBe("speaking");

    hud.reset();
    expect(hud.getState().status).toBe("idle");
    expect(hud.getState().visible).toBe(false);
  });
});
