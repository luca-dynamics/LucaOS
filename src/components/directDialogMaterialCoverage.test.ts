const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const directDialogs = [
  "src/components/HumanInputModal.tsx",
  "src/components/SecurityGate.tsx",
  "src/components/SkillPreview.tsx",
  "src/components/SkillsMatrix.tsx",
  "src/components/AdminGrantModal.tsx",
  "src/components/IngestionModal.tsx",
  "src/components/RemoteAccessModal.tsx",
  "src/components/ChromeProfilePrompt.tsx",
  "src/components/VoiceCommandConfirmation.tsx",
  "src/components/AppExplorerModal.tsx",
  "src/components/ProfileManager.tsx",
  "src/components/llm/OfflineModelManager.tsx",
  "src/components/LucaLinkModal.tsx",
  "src/components/SmartTVRemote.tsx",
  "src/components/WirelessManager.tsx",
  "src/components/ThoughtProcessPanel.tsx",
  "src/components/AgentModePanel.tsx",
].map(read);

const enrollment = read("src/components/AdminEnrollmentModal.tsx");

describe("direct dialog material coverage", () => {
  it("routes every high-value direct dialog through the shared foreground role", () => {
    for (const source of directDialogs) {
      expect(source).toContain("lucaMaterialDialogStyle");
      expect(source).toContain("data-luca-material-role");
    }
  });

  it("removes the old fixed dark dialog substrates", () => {
    const source = directDialogs.join("\n");
    expect(source).not.toContain("bg-[#0a0a0a]");
    expect(source).not.toContain("bg-[#050505]");
    expect(source).not.toContain("bg-gray-900/95");
    expect(source).not.toContain("glass-blur[20px]");
  });

  it("keeps the embedded biometric surface skin-aware without blurring camera content", () => {
    expect(enrollment).toContain("lucaMaterialControlActiveStyle");
    expect(enrollment).toContain("lucaMaterialControlStyle");
    expect(enrollment).not.toContain("border glass-blur");
    expect(enrollment).toContain("rounded-xl border bg-black/40");
  });
});
