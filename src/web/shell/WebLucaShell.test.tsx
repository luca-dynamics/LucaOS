const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";

const shellSource = readFileSync("src/web/WebLucaShell.tsx", "utf8");
const chatSource = readFileSync("src/web/chat/WebChatSurface.tsx", "utf8");

describe("WebLucaShell dashboard presentation", () => {
  it("uses LucaOS dashboard-shell presentation copy instead of debug placeholder copy", () => {
    expect(shellSource).toContain("Luca dashboard");
    expect(shellSource).toContain("Luca is ready. Ask anything or open a workspace.");
    expect(shellSource).toContain("<WebChatSurface");
    for (const source of [shellSource, chatSource]) {
      expect(source).not.toContain("browser-safe mode");
      expect(source).not.toContain("runtime adapter");
      expect(source).not.toContain("Model execution adapter is not connected yet");
      expect(source).not.toContain("Native routes guarded");
    }
  });
});
