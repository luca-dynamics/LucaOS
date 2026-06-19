// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WebChatSurface } from "./WebChatSurface";
import { WEB_CHAT_RUNTIME_UNAVAILABLE } from "./webChatRuntime";

const source = process.getBuiltinModule("node:fs").readFileSync("src/web/chat/WebChatSurface.tsx", "utf8");

describe("WebChatSurface", () => {
  it("renders the shared LucaChatSurface instead of primary generated web chat markup", () => {
    expect(source).toContain("LucaChatSurface");
    expect(source).toContain('from "../../components/chat/LucaChatSurface"');
    expect(source).toContain("runtime.sendMessage");
    expect(source).not.toContain("<section");
    expect(source).not.toContain("LucaOS web chat");
  });

  it("uses user-facing LucaOS copy instead of debug adapter wording", () => {
    const html = renderToStaticMarkup(<WebChatSurface />);
    expect(html).toContain("Luca is ready. Ask anything or open a workspace.");
    expect(html).toContain("Message Luca...");
    expect(html).not.toMatch(/WebBridge|browser-safe|runtime adapter|model execution adapter|debug route|capability manifest|host class/i);
    expect(WEB_CHAT_RUNTIME_UNAVAILABLE).not.toContain("Model execution adapter is not connected yet");
  });

  it("does not import desktop chat runtime", () => {
    expect(source).not.toMatch(/ChatWidgetMode|lucaService|conversationService|awarenessService|electron|ScreenShare|SecurityGate/);
  });
});
