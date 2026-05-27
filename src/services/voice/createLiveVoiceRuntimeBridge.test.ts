import { describe, expect, it } from "vitest";
import { createLiveVoiceRuntimeBridge } from "./createLiveVoiceRuntimeBridge";

describe("createLiveVoiceRuntimeBridge", () => {
  it("exposes expected surface", () => {
    const runtime = createLiveVoiceRuntimeBridge();
    expect(runtime.bridge).toBeDefined();
    expect(typeof runtime.syncFromLiveSession).toBe("function");
    expect(typeof runtime.syncFromDiagnostics).toBe("function");
    expect(typeof runtime.syncFromVoiceHudProps).toBe("function");
    expect(typeof runtime.syncFromSettings).toBe("function");
    expect(typeof runtime.getRealtimeState).toBe("function");
    expect(typeof runtime.getSnapshot).toBe("function");
    expect(typeof runtime.reset).toBe("function");
  });
});
