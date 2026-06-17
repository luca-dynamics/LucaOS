import { describe, expect, it } from "vitest";
import { personalIntelligenceRuntimeAuthorityFixtures } from "./runtimeAuthorityFixtures";
describe("runtime authority fixtures", () => { it("cover safe classifications with no executable payloads", () => { expect(personalIntelligenceRuntimeAuthorityFixtures.map((item) => item.authorityClass)).toEqual(expect.arrayContaining(["permanently_blocked", "review_only", "dry_run_only", "future_pilot_candidate", "unsupported"])); expect(JSON.stringify(personalIntelligenceRuntimeAuthorityFixtures)).not.toMatch(/https?:\/\/|password|api[_-]?key/i); }); });
