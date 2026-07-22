import { describe, expect, it } from "vitest";
import {
  coerceSkillImport,
  LUCA_SKILL_CATALOG_FORMAT,
} from "./skillImportFormats";

describe("coerceSkillImport", () => {
  it("imports openclaw-style skills array", () => {
    const r = coerceSkillImport({
      skills: [
        {
          name: "Summarize",
          description: "Summarize text",
          version: "1.0.0",
          tools: ["summarize"],
          permissions: ["text.read"],
        },
      ],
    });
    expect("candidates" in r).toBe(true);
    if ("candidates" in r) {
      expect(r.candidates).toHaveLength(1);
      expect(r.candidates[0].name).toBe("Summarize");
      expect(r.candidates[0].source).toMatch(/openclaw|skills/);
    }
  });

  it("imports claude tools array", () => {
    const r = coerceSkillImport([
      {
        name: "get_weather",
        description: "Weather lookup",
        input_schema: { type: "object" },
      },
    ]);
    expect("candidates" in r).toBe(true);
    if ("candidates" in r) {
      expect(r.detected).toMatch(/claude|plain_array/);
      expect(r.candidates[0].manifest.allowedTools).toContain("get_weather");
    }
  });

  it("imports mcp servers map", () => {
    const r = coerceSkillImport({
      mcpServers: {
        filesystem: { command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem"] },
      },
    });
    expect("candidates" in r).toBe(true);
    if ("candidates" in r) {
      expect(r.detected).toBe("mcp_servers");
      expect(r.candidates[0].name).toBe("filesystem");
      expect(r.candidates[0].requiredPermissions).toContain("mcp.connect");
    }
  });

  it("imports native luca catalog", () => {
    const r = coerceSkillImport({
      format: LUCA_SKILL_CATALOG_FORMAT,
      skills: [
        {
          name: "Demo",
          version: "0.1.0",
          source: "test",
          manifest: {
            id: "demo.skill",
            name: "Demo",
            description: "Demo skill",
            version: "0.1.0",
            lifecycleState: "candidate",
            ownerTier: "normal",
            allowedUserTiers: ["normal"],
            allowedTools: ["demo"],
            deniedTools: [],
            safetyPolicy: {
              riskLevel: "low",
              requiresConfirmation: false,
              requiresOriginApproval: false,
              allowedOperationTiers: ["normal"],
            },
            evalPolicy: { evalRequired: false, regressionCheckRequired: false },
            promotionPolicy: {
              promotionRequiresOrigin: false,
              promotionRequiresPassingEvals: false,
              promotionRequiresRollbackPlan: false,
              promotionSource: "manual",
            },
            rollbackPolicy: { rollbackAvailable: true },
            source: "test",
            createdAt: new Date().toISOString(),
            metadata: {
              contractKind: "luca_skill_manifest",
              autonomousSelfModificationEnabled: false,
              runtimeBehaviorChanged: false,
              migrationRequired: false,
            },
          },
          requiredPermissions: [],
          capabilities: ["demo"],
          riskLevel: "low",
        },
      ],
    });
    expect("candidates" in r).toBe(true);
    if ("candidates" in r) {
      expect(r.detected).toBe(LUCA_SKILL_CATALOG_FORMAT);
      expect(r.candidates[0].manifest.id).toBe("demo.skill");
    }
  });
});
