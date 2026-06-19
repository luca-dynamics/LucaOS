// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

const source = process.getBuiltinModule("node:fs").readFileSync("src/components/ChatWidgetMode.tsx", "utf8");

describe("ChatWidgetMode shared chat surface integration", () => {
  it("imports and renders LucaChatSurface", () => {
    expect(source).toContain('import LucaChatSurface from "./chat/LucaChatSurface"');
    expect(source).toContain("<LucaChatSurface");
  });

  it("keeps desktop runtime orchestration in ChatWidgetMode", () => {
    for (const reference of ["lucaService", "conversationService", "awarenessService", "lucaLinkManager", "ScreenShare", "SecurityGate"]) {
      expect(source).toContain(reference);
    }
  });

  it("maps runtime message/input/model state into surface props", () => {
    expect(source).toContain("messages={state.history as any}");
    expect(source).toContain("inputValue={input}");
    expect(source).toContain("brainModel={state.brainModel}");
    expect(source).toContain("embeddingModel={state.embeddingModel}");
    expect(source).toContain("pending={state.isProcessing}");
  });

  it("delegates the old primary visible chat markup to the shared surface", () => {
    expect(source).not.toContain("<ChatWidgetHistory");
    expect(source).not.toContain("<ChatWidgetInput");
    expect(source).not.toContain("<SuggestionChips");
  });
});
