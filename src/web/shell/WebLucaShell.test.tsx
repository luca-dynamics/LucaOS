const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";

const shellSource = readFileSync("src/web/WebLucaShell.tsx", "utf8");
const chatSource = readFileSync("src/web/chat/WebRealChatPanel.tsx", "utf8");
const headerSource = readFileSync("src/web/shell/WebRealHeader.tsx", "utf8");
const operationsSidebarSource = readFileSync(
  "src/web/shell/WebRealOperationsSidebar.tsx",
  "utf8",
);
const voiceSource = readFileSync(
  "src/web/shell/WebRealVoiceSurface.tsx",
  "utf8",
);

describe("WebLucaShell dashboard presentation", () => {
  it("uses LucaOS dashboard-shell presentation copy instead of debug placeholder copy", () => {
    expect(headerSource).toContain("WebRealHeader");
    // Web now mounts the real desktop ChatPanel (via WebRealChatPanel), not a
    // bespoke web chat surface.
    expect(shellSource).toContain("<WebRealChatPanel");
    expect(shellSource).toContain("<WebRealHeader");
    expect(shellSource).toContain("<WebRealOperationsSidebar");
    expect(shellSource).toContain("<WebRealVoiceSurface");
    expect(chatSource).toContain('from "../../components/layout/ChatPanel"');
    expect(headerSource).toContain('from "../../components/layout/Header"');
    expect(headerSource).toContain("setShowVoiceHud");
    expect(operationsSidebarSource).toContain(
      'from "../../components/layout/OperationsSidebar"',
    );
    expect(operationsSidebarSource).toContain('experienceMode="basic"');
    expect(voiceSource).toContain(
      'from "../../components/voice/VoiceHudSurface"',
    );
    expect(voiceSource).toContain("<VoiceHudSurface");
    expect(shellSource).not.toContain("voiceSurface={null}");
    expect(shellSource).not.toContain("data-luca-web-workspace-session");
    for (const source of [shellSource, chatSource, headerSource]) {
      expect(source).not.toContain("browser-safe mode");
      expect(source).not.toContain("runtime adapter");
      expect(source).not.toContain(
        "Model execution adapter is not connected yet",
      );
      expect(source).not.toContain("Native routes guarded");
    }
  });
});
