const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";
import { webAppRuntime } from "../runtime/webAppRuntime";

const shellSource = readFileSync("src/web/WebLucaShell.tsx", "utf8");
const chatSource = readFileSync("src/web/chat/WebRealChatPanel.tsx", "utf8");
const headerSource = readFileSync("src/web/shell/WebRealHeader.tsx", "utf8");

describe("WebLucaShell dashboard presentation", () => {
  it("uses LucaOS dashboard-shell presentation copy instead of debug placeholder copy", () => {
    expect(headerSource).toContain("WebRealHeader");
    // Web now mounts the real desktop ChatPanel (via WebRealChatPanel), not a
    // bespoke web chat surface.
    expect(shellSource).toContain("<WebRealChatPanel");
    expect(shellSource).toContain("<WebRealHeader");
    expect(chatSource).toContain('from "../../components/layout/ChatPanel"');
    expect(headerSource).toContain('from "../../components/layout/Header"');
    // Workspace copy now comes from the web app runtime (real-app Phase 4),
    // not a literal in the shell.
    expect(shellSource).toContain("getWorkspaceState");
    expect(webAppRuntime.getWorkspaceState().emptyMessage).toBe(
      "Luca is ready. Ask anything or open a workspace.",
    );
    for (const source of [shellSource, chatSource, headerSource]) {
      expect(source).not.toContain("browser-safe mode");
      expect(source).not.toContain("runtime adapter");
      expect(source).not.toContain("Model execution adapter is not connected yet");
      expect(source).not.toContain("Native routes guarded");
    }
  });
});
