import * as fs from "fs";
import * as path from "path";
import { describe, expect, it, beforeEach } from "vitest";
import { CodingContextService } from "./codingContextService";

describe("CodingContextService", () => {
  let contextService: CodingContextService;
  let testDir: string;

  beforeEach(() => {
    contextService = new CodingContextService();
    testDir = path.join(process.cwd(), "tmp_test_workspace_" + Math.random().toString(36).substring(2, 7));
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    fs.writeFileSync(path.join(testDir, "package.json"), '{"name":"test-repo"}');
    fs.writeFileSync(path.join(testDir, "tsconfig.json"), "{}");
  });

  it("detects coding posture when project markers are present", () => {
    const isCoding = contextService.detectCodingPosture(testDir);
    expect(isCoding).toBe(true);
  });

  it("caches CodingContextSnapshot ONCE and returns byte-identical result", () => {
    const snapshot1 = contextService.getCachedCodingContext(testDir);
    const snapshot2 = contextService.getCachedCodingContext(testDir);

    expect(snapshot1).toBe(snapshot2);
    expect(snapshot1.cachedAt).toBe(snapshot2.cachedAt);
    expect(snapshot1.isCodingWorkspace).toBe(true);
    expect(snapshot1.detectedMarkers).toContain("package.json");
  });

  it("generates byte-stable system prompt brief", () => {
    const brief1 = contextService.getSystemPromptBrief(testDir);
    const brief2 = contextService.getSystemPromptBrief(testDir);

    expect(brief1).toBe(brief2);
    expect(brief1).toContain("**RUNTIME POSTURE**: Autonomous Pair-Programmer");
    expect(brief1).toContain("Prompt Cache Safety: Active");
  });

  it("clears cache on reset", () => {
    const snapshot1 = contextService.getCachedCodingContext(testDir);
    contextService.clearCache();
    const snapshot2 = contextService.getCachedCodingContext(testDir);

    expect(snapshot1).not.toBe(snapshot2);
  });
});
