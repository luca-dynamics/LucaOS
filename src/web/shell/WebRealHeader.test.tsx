import { describe, expect, it } from "vitest";
import source from "./WebRealHeader.tsx?raw";

describe("WebRealHeader", () => {
  it("keeps the real Header mounted behind a browser-safe wrapper", () => {
    expect(source).toContain(
      'import Header from "../../components/layout/Header"',
    );
    expect(source).toContain("<Header");
    expect(source).toContain("data-luca-web-real-header");
    expect(source).not.toContain("components/VoiceHud");
  });

  it("owns local settings state and persists the web settings-open flag", () => {
    expect(source).toContain("readInitialWebSettingsOpen");
    expect(source).toContain("WEB_HEADER_SETTINGS_OPEN_KEY");
    expect(source).toContain("window.localStorage.getItem");
    expect(source).toContain("window.localStorage.setItem");
    expect(source).toContain("controlledSettingsOpen ?? isSettingsOpen");
    expect(source).toContain("setIsSettingsOpen={setSettingsOpen}");
  });

  it("passes browser-owned voice visibility into the real Header", () => {
    expect(source).toContain("showVoiceHud?: boolean");
    expect(source).toContain("setShowVoiceHud?: (show: boolean) => void");
    expect(source).toContain("showVoiceHud={showVoiceHud}");
    expect(source).toContain("setShowVoiceHud={setShowVoiceHud}");
  });
});
