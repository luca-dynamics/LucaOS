import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WebChatSurface } from "./WebChatSurface";
import { WEB_CHAT_RUNTIME_UNAVAILABLE } from "./webChatRuntime";

describe("WebChatSurface", () => {
  it("uses user-facing LucaOS copy instead of debug adapter wording", () => {
    const html = renderToStaticMarkup(<WebChatSurface />);
    expect(html).toContain("Luca is ready. Ask anything or open a workspace.");
    expect(html).toContain("Luca Prime connection is preparing");
    expect(html).not.toContain("browser-safe mode");
    expect(html).not.toContain("runtime adapter");
    expect(WEB_CHAT_RUNTIME_UNAVAILABLE).not.toContain("Model execution adapter is not connected yet");
  });
});
