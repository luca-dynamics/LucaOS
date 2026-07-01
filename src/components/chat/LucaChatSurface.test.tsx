// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LucaChatSurface from "./LucaChatSurface";

const source = process.getBuiltinModule("node:fs").readFileSync("src/components/chat/LucaChatSurface.tsx", "utf8");
const forbiddenRuntimeImports = [
  "electron",
  "window.electron",
  "window.luca",
  "eventBus",
  "lucaService",
  "llmService",
  "liveService",
  "soundService",
  "settingsService",
  "personalityService",
  "awarenessService",
  "conversationService",
  "lucaLinkManager",
  "ToolRegistry",
  "ScreenShare",
  "SecurityGate",
  "node:fs",
  "better-sqlite3",
];

describe("LucaChatSurface", () => {
  it("exists as the extracted original MiniChat presentation surface", () => {
    expect(LucaChatSurface).toBeTypeOf("function");
    expect(source).toContain('data-luca-chat-surface="original-mini-chat-extraction"');
    expect(source).toContain("L.U.C.A OS");
    expect(source).toContain("glass-blur");
    expect(source).toContain("ChatWidgetHistory");
    expect(source).toContain("ChatWidgetInput");
  });

  it("renders history, composer, suggestion chips, pending state, and errors", () => {
    const html = renderToStaticMarkup(
      <LucaChatSurface
        messages={[{ id: "1", role: "user", content: "Hello Luca" }]}
        inputValue="Ping"
        pending
        errorLabel="Luca is still connecting this route."
        suggestions={[{ id: "s", label: "Scan", value: "Scan this" }]}
        showSuggestions
        onInputChange={() => undefined}
        onSend={() => undefined}
      />,
    );
    expect(html).toContain("Hello Luca");
    expect(html).toContain("Ping");
    expect(html).toContain("Scan");
    expect(html).toContain("Luca is still connecting this route.");
    expect(html).toContain("chat-input");
  });

  it("has no forbidden runtime imports or WebBridge/debug wording", () => {
    for (const reference of forbiddenRuntimeImports) {
      expect(source.toLowerCase()).not.toContain(reference.toLowerCase());
    }
    expect(source).not.toMatch(/WebBridge|browser-safe|runtime adapter|model execution adapter|Native routes guarded|debug route|capability manifest|host class/i);
  });
});
