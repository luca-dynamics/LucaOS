import { describe, expect, it } from "vitest";

import { resolveMobileLayout } from "./useMobile";

describe("resolveMobileLayout", () => {
  it("never converts a native desktop host into mobile layout on resize", () => {
    for (const viewportWidth of [320, 480, 767, 1024, 1920]) {
      expect(resolveMobileLayout({
        viewportWidth,
        mobileUserAgent: false,
        touchDevice: false,
        desktopHost: true,
      })).toBe(false);
    }
  });

  it("keeps native mobile hosts mobile at any viewport width", () => {
    expect(resolveMobileLayout({
      viewportWidth: 1400,
      mobileUserAgent: false,
      touchDevice: false,
      nativeMobileHost: true,
    })).toBe(true);
  });

  it("uses responsive mobile layout for narrow browser viewports", () => {
    expect(resolveMobileLayout({ viewportWidth: 600, mobileUserAgent: false, touchDevice: false })).toBe(true);
    expect(resolveMobileLayout({ viewportWidth: 900, mobileUserAgent: false, touchDevice: false })).toBe(false);
  });
});
