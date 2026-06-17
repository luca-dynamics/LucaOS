import fixtureSource from "./lucaLinkRuntimeAuthorityFixtures.ts?raw";
import policySource from "./lucaLinkRuntimeAuthorityPolicy.ts?raw";
import registrySource from "./lucaLinkRuntimeAuthorityRegistry.ts?raw";
import evidenceSource from "./lucaLinkRuntimeAuthorityEvidence.ts?raw";
import readinessSource from "./lucaLinkRuntimeAuthorityReadiness.ts?raw";
import { describe, expect, it } from "vitest";
import { LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES } from "./lucaLinkRuntimeAuthorityFixtures";

const forbiddenPatterns = [
  /lucaLinkService/, /socket\.emit/, /socket\.io-client/, /\bWebSocket\b/, /RTCPeerConnection/, /\bfetch\s*\(/,
  /localStorage|sessionStorage|indexedDB/, /from\s+["'](?:node:)?fs/, /child_process/, /navigator\.(camera|mediaDevices|geolocation|clipboard)/,
  /adapterEntrypoint|executeAdapter|packageManager|npm\s+install|yarn\s+add|pnpm\s+add/,
];

describe("LucaLink runtime authority fixtures and source safety", () => {
  it("contains all safe fixture classifications with no enabled runtime flags", () => {
    const classes = new Set(LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES.map((record) => record.authorityClass));
    expect(classes).toEqual(new Set(["permanently_blocked", "review_only", "dry_run_only", "future_bounded_handoff_candidate", "unsupported"]));
    expect(LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES).toHaveLength(14);
    expect(LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES.every((record) => !record.authorityGranted && !record.handoffEnabled && !record.transportSendEnabled && !record.adapterExecutionEnabled && !record.displayOpenEnabled && !record.sensorCollectionEnabled && !record.fileWriteEnabled && !record.installEnabled && !record.sideEffectsPerformed)).toBe(true);
  });

  it("does not import or call forbidden runtime APIs", () => {
    for (const source of [fixtureSource, policySource, registrySource, evidenceSource, readinessSource]) {
      for (const pattern of forbiddenPatterns) expect(source, `source matched ${pattern}`).not.toMatch(pattern);
    }
  });
});
