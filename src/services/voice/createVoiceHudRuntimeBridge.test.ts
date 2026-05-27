import { describe, expect, it } from "vitest";
import { createVoiceHudRuntimeBridge } from "./createVoiceHudRuntimeBridge";

describe("createVoiceHudRuntimeBridge", () => {
  it("exposes expected factory surface", () => {
    const runtime = createVoiceHudRuntimeBridge();
    expect(runtime.bridge).toBeDefined();
    expect(typeof runtime.sendControl).toBe("function");
    expect(typeof runtime.getState).toBe("function");
    expect(typeof runtime.reset).toBe("function");
    expect(typeof runtime.updateTranscript).toBe("function");
    expect(typeof runtime.updateResponse).toBe("function");
    expect(typeof runtime.updateCommand).toBe("function");
    expect(typeof runtime.updateConfirmation).toBe("function");
    expect(typeof runtime.updateError).toBe("function");
    expect(typeof runtime.syncFromVoiceRuntimeState).toBe("function");
  });

  it("proxies HUD runtime bridge controls and state", () => {
    const runtime = createVoiceHudRuntimeBridge();
    runtime.sendControl("start_listening");
    runtime.updateTranscript("hello");
    runtime.updateResponse("world");

    expect(runtime.getState().status).toBe("listening");
    expect(runtime.getState().currentTranscript).toBe("hello");
    expect(runtime.getState().currentResponse).toBe("world");

    runtime.reset();
    expect(runtime.getState().status).toBe("idle");
    expect(runtime.getState().mode).toBe("text");
  });
});
