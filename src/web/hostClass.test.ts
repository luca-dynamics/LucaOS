import { describe, expect, it } from "vitest";
import { classifyWebHost } from "./hostClass";

describe("classifyWebHost", () => {
  it("classifies desktop and mobile browser hosts", () => {
    expect(
      classifyWebHost({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        viewportWidth: 1440,
        finePointer: true,
      }),
    ).toBe("desktop-web");
    expect(
      classifyWebHost({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Mobile",
        viewportWidth: 390,
        maxTouchPoints: 5,
        coarsePointer: true,
      }),
    ).toBe("mobile-web");
  });

  it("classifies explicit and signal-derived smart TV hosts", () => {
    expect(
      classifyWebHost({
        userAgent: "Mozilla/5.0 (SMART-TV; LINUX; Tizen 8.0)",
        screenWidth: 1920,
      }),
    ).toBe("smart-tv-web");
    expect(
      classifyWebHost({
        userAgent: "Custom Display Browser",
        screenWidth: 3840,
        coarsePointer: true,
        finePointer: false,
        maxTouchPoints: 0,
      }),
    ).toBe("smart-tv-web");
  });

  it("falls back to unknown when browser signals are insufficient", () => {
    expect(classifyWebHost({ userAgent: "CustomBrowser" })).toBe(
      "unknown-web",
    );
  });
});
