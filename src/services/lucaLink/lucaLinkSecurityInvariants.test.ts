import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LUCA_LINK_FORBIDDEN_MODEL_RUNTIME_PATTERNS,
  LUCA_LINK_MODEL_ONLY_MODULES,
} from "./lucaLinkArchitectureInvariants";

const LUCA_LINK_DIR = "src/services/lucaLink";

function readLucaLinkModule(fileName: string): string {
  return readFileSync(join(LUCA_LINK_DIR, fileName), "utf8");
}

function readServiceRange(startNeedle: string, endNeedle: string): string {
  const source = readFileSync("src/services/lucaLinkService.ts", "utf8");
  const start = source.indexOf(startNeedle);
  const endStart = source.indexOf(endNeedle, start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(endStart).toBeGreaterThan(start);
  const end = source.indexOf("\n  }", endStart);
  expect(end).toBeGreaterThan(endStart);
  return source.slice(start, end + "\n  }".length);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const runtimePatternRegex = new Map(
  LUCA_LINK_FORBIDDEN_MODEL_RUNTIME_PATTERNS.map((pattern) => [
    pattern,
    new RegExp(escapeRegExp(pattern).replace(/\\\($/, "\\s*\\(")),
  ]),
);

describe("LucaLink production security invariants", () => {
  it("keeps model-only modules free of direct runtime, transport, persistence, process, and file-write calls", () => {
    for (const moduleName of LUCA_LINK_MODEL_ONLY_MODULES) {
      const source = readLucaLinkModule(moduleName);
      for (const [pattern, matcher] of runtimePatternRegex) {
        expect(source, `${moduleName} must not contain ${pattern}`).not.toMatch(
          matcher,
        );
      }
    }
  });

  it("keeps Origin out of LucaLink host, trust, approval, bridge, adaptation, and adapter-draft authority", () => {
    const architectureSource = readLucaLinkModule("lucaLinkArchitectureMap.ts");
    const hostModelSource = readLucaLinkModule(
      "lucaLinkHostConnectionModel.ts",
    );
    const approvalQueueSource = readLucaLinkModule("lucaLinkApprovalQueue.ts");
    const multiHostApprovalSource = readLucaLinkModule(
      "lucaLinkMultiHostApproval.ts",
    );
    const hostAdaptationSource = readLucaLinkModule(
      "lucaLinkHostAdaptation.ts",
    );
    const bridgeReviewSource = readLucaLinkModule("lucaLinkBridgeReview.ts");
    const adapterDraftsSource = readLucaLinkModule("lucaLinkAdapterDrafts.ts");

    const typeUnionSource = architectureSource.slice(
      architectureSource.indexOf("export type LucaLinkHostRoleId"),
      architectureSource.indexOf(
        "export interface LucaLinkPermissionDescriptor",
      ),
    );
    expect(typeUnionSource).not.toMatch(/["']origin["']/);
    expect(typeUnionSource).not.toMatch(/["']Origin["']/);

    expect(hostModelSource).not.toMatch(/hostClass:\s*["']origin/i);
    expect(hostModelSource).not.toMatch(/trustLevel:\s*["']origin/i);
    expect(hostModelSource).not.toMatch(/approvalCapability:\s*["']origin/i);
    expect(approvalQueueSource).not.toContain("Origin approval");
    expect(multiHostApprovalSource).not.toContain("Origin approval");

    for (const source of [
      hostAdaptationSource,
      bridgeReviewSource,
      adapterDraftsSource,
    ]) {
      expect(source).not.toMatch(
        /Origin[^\n]*(execute|execution|authority|approval)/i,
      );
    }
  });

  it("keeps PR 202 service helpers state-only with no transport, persistence, execution, or file writes", () => {
    const helperSource = readServiceRange(
      "  getApprovalSurfaces",
      "  clearAdapterDrafts",
    );

    expect(helperSource).toContain("registerBridgeReview");
    expect(helperSource).toContain("updateBridgeReview");
    expect(helperSource).toContain("registerAdapterDraft");
    expect(helperSource).toContain("updateAdapterDraft");
    expect(helperSource).toContain("this.adapterDraftRegistry.records = []");

    for (const forbidden of [
      /\bsend\s*\(/,
      /\bbeamPacket\s*\(/,
      /socket\.emit\s*\(/,
      /\.emit\s*\(/,
      /\bfetch\s*\(/,
      /\bio\s*\(/,
      /\bwriteFile\s*\(/,
      /\bfs\.write/,
      /\bunlink\s*\(/,
      /\brmSync\s*\(/,
      /localStorage|sessionStorage/,
      /\bexec\s*\(/,
      /\bspawn\s*\(/,
      /\beval\s*\(/,
      /new Function/,
    ]) {
      expect(helperSource).not.toMatch(forbidden);
    }
  });

  it("does not add bridge review, adapter draft, or approval-surface socket event names", () => {
    const architectureSource = readLucaLinkModule("lucaLinkArchitectureMap.ts");
    const eventMapSource = architectureSource.slice(
      architectureSource.indexOf("export const lucaLinkCurrentEventMap"),
      architectureSource.indexOf(
        "// ===========================================================================\n// Implementation Roadmap",
      ),
    );

    expect(eventMapSource).not.toMatch(/bridge[-:]review/i);
    expect(eventMapSource).not.toMatch(/adapter[-:]draft/i);
    expect(eventMapSource).not.toMatch(/approval[-:]surface/i);
  });
});
