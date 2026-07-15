const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const manager = read("src/components/MobileManager.tsx");
const header = read("src/components/mobile/MobileHeader.tsx");
const files = read("src/components/mobile/MobileFileManager.tsx");
const apps = read("src/components/mobile/MobileAppManager.tsx");
const mirror = read("src/components/mobile/MobileScreenMirror.tsx");
const inspector = read("src/components/mobile/UiTreeOverlay.tsx");

describe("mobile manager material coverage", () => {
  it("uses the shared hierarchy for its dialog, workspace, cards, and controls", () => {
    expect(manager).toContain('data-luca-material-role="dialog"');
    expect(manager).toContain("lucaMaterialDialogStyle");
    expect(manager).toContain("lucaMaterialWorkspaceStyle");
    expect(manager).toContain("lucaMaterialCardStyle");
    expect(manager).not.toContain("bg-[#0a0a0a]");
  });

  it("keeps every tool panel on skin-aware materials", () => {
    expect(header).toContain("lucaMaterialSolidCardStyle");
    expect(header).toContain("lucaMaterialControlActiveStyle");
    expect(files).toContain("lucaMaterialControlStyle");
    expect(apps).toContain("lucaMaterialSolidCardStyle");
    expect(mirror).toContain("lucaMaterialCardStyle");
    expect(inspector).toContain("lucaMaterialPopoverStyle");
    expect([header, files, apps, mirror, inspector].join("\n")).not.toContain(
      "glass-blur",
    );
  });

  it("preserves black only for the real device preview, not its surrounding chrome", () => {
    expect(mirror).toContain("aspect-[9/19.5] bg-black");
    expect(mirror).not.toContain("bg-slate-900/60");
    expect(apps).not.toContain("flex-1 bg-black border");
  });
});
