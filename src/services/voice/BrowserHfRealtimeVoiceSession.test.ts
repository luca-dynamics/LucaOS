import { describe, expect, it } from "vitest";
import {
  BrowserHfRealtimeVoiceSession,
  browserHfRealtimeVoiceSession,
} from "./BrowserHfRealtimeVoiceSession";

describe("BrowserHfRealtimeVoiceSession", () => {
  it("exports session class and singleton", () => {
    expect(typeof BrowserHfRealtimeVoiceSession).toBe("function");
    expect(browserHfRealtimeVoiceSession).toBeInstanceOf(
      BrowserHfRealtimeVoiceSession,
    );
  });

  it("exposes connect/disconnect/send surface", () => {
    const session = new BrowserHfRealtimeVoiceSession();
    expect(typeof session.connect).toBe("function");
    expect(typeof session.disconnect).toBe("function");
  });
});
