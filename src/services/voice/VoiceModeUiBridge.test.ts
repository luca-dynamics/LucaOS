import { describe, expect, it, vi } from "vitest";
import { VoiceModeUiBridge } from "./VoiceModeUiBridge";

describe("VoiceModeUiBridge", () => {
  it("subscribes/unsubscribes and updates mode/session", () => {
    const bridge = new VoiceModeUiBridge();
    const fn = vi.fn();
    bridge.subscribe(fn);
    bridge.setMode("voice");
    expect(fn).toHaveBeenCalled();
    expect(bridge.getState().mode).toBe("voice");
    bridge.unsubscribe(fn);
    const c = fn.mock.calls.length;
    bridge.setMode("text");
    expect(fn.mock.calls.length).toBe(c);
  });
});
