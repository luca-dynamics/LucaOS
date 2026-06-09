import evaluatorSource from "./lucaLinkRevocationPropagationEvaluator.ts?raw";
import fixturesSource from "./lucaLinkRevocationPropagationFixtures.ts?raw";
import policySource from "./lucaLinkRevocationPropagationPolicy.ts?raw";
import typesSource from "./lucaLinkRevocationPropagationTypes.ts?raw";
import { describe, expect, it } from "vitest";

const sources = [evaluatorSource, fixturesSource, policySource, typesSource];
const forbiddenRuntimePatterns = [
  /socket\.emit/,
  /socket\.io-client/,
  /\bWebSocket\b/,
  /RTCPeerConnection/,
  /\bfetch\s*\(/,
  /navigator\.mediaDevices/,
  /localStorage|sessionStorage|indexedDB/,
  /personal-intelligence/,
  /modelRouter|modelProvider/i,
  /from\s+["'](?:node:)?fs(?:\/promises)?["']/,
  /child_process/,
  /lucaLinkService/,
];

describe("LucaLink revocation propagation source safety", () => {
  it("does not import or call runtime, socket, transport, persistence, or execution APIs", () => {
    for (const source of sources) {
      for (const pattern of forbiddenRuntimePatterns) {
        expect(source, `source matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
