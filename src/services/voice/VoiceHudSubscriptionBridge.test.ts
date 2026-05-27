import { describe, expect, it, vi } from "vitest";
import { VoiceHudRuntimeBridge } from "./VoiceHudRuntimeBridge";
import { VoiceHudSubscriptionBridge } from "./VoiceHudSubscriptionBridge";

describe("VoiceHudSubscriptionBridge", () => {
  it("notifies subscribers", () => {
    const bridge = new VoiceHudSubscriptionBridge(new VoiceHudRuntimeBridge());
    const fn = vi.fn();
    const unsub = bridge.subscribe(fn);
    bridge.sendControl("show");
    expect(fn).toHaveBeenCalled();
    unsub();
    const c = fn.mock.calls.length;
    bridge.sendControl("hide");
    expect(fn.mock.calls.length).toBe(c);
  });
});
