import { describe, expect, it } from "vitest";
import { canReadPrivacyZone, canWritePrivacyZone } from "./privacyPolicy";

const policy = {
  policyId: "project-agent",
  zones: { public: { read: true, write: false }, project: { read: true, write: true }, credential: { read: false, write: false } },
  defaultAccess: { read: false, write: false },
} as const;

describe("privacy policy", () => {
  it("allows only explicitly granted zone operations", () => {
    expect(canReadPrivacyZone(policy, "public")).toBe(true);
    expect(canWritePrivacyZone(policy, "public")).toBe(false);
    expect(canWritePrivacyZone(policy, "project")).toBe(true);
    expect(canReadPrivacyZone(policy, "health")).toBe(false);
  });
});
