import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WebVoiceOnboardingSurface } from "./WebVoiceOnboardingSurface";

describe("WebVoiceOnboardingSurface", () => {
  it("renders a dedicated voice-first onboarding surface with navigation", () => {
    const html = renderToStaticMarkup(
      <WebVoiceOnboardingSurface mode="voice" userName="Maya" theme={{ primary: "PROFESSIONAL", hex: "#8be9fd" }} onBack={() => {}} onComplete={() => {}} />,
    );
    expect(html).toContain("Luca voice onboarding");
    expect(html).toContain("Back / Change mode");
    expect(html).toContain("Enable microphone");
    expect(html).toContain("Typed fallback note");
    expect(html).not.toContain("Text mode selected");
  });
});
