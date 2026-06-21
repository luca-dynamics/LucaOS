import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");
const source = readFileSync(
  "src/components/Onboarding/OnboardingConversationSurface.tsx",
  "utf8",
);

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
  "conversationService",
  "awarenessService",
  "lucaLinkManager",
  "ToolRegistry",
  "ScreenShare",
  "SecurityGate",
  "node:fs",
  "better-sqlite3",
  "@capacitor/",
];

describe("OnboardingConversationSurface", () => {
  it("uses original onboarding presentation primitives", () => {
    expect(source).toContain('import MessageBubble from "./MessageBubble"');
    expect(source).toContain('import TypingIndicator from "./TypingIndicator"');
    expect(source).not.toContain("WebSafeConversationalOnboarding");
    expect(source).not.toContain("WebOnboardingConversation");
  });

  it("has no forbidden runtime imports", () => {
    const lowerSource = source.toLowerCase();
    for (const reference of forbiddenRuntimeImports) {
      expect(lowerSource, reference).not.toContain(reference.toLowerCase());
    }
  });

  it("keeps generated WebBridge wording out of shared onboarding presentation", () => {
    expect(source).not.toMatch(
      /WebBridge|browser-safe|runtime adapter|model execution adapter|native routes guarded|host class|capability manifest|debug route|web onboarding|Original onboarding complete|Continue to LucaOS Web Shell|System Ready/i,
    );
  });
});
