import { describe, expect, it } from "vitest";
import { authorizeLucaLinkInbound } from "./lucaLinkInboundAuthorization";

const valid = {
  sourceId: "peer-1",
  targetId: "primary-1",
  localDeviceId: "primary-1",
  sourceKnown: true,
  sourceActive: true,
  sourceTrust: "trusted" as const,
};

describe("shared LucaLink inbound authorization", () => {
  it("allows a known active peer when transport requirements are satisfied", () => {
    expect(authorizeLucaLinkInbound(valid)).toMatchObject({
      allowed: true,
      code: "allowed",
    });
  });

  it.each([
    [{ ...valid, sourceId: undefined }, "missing-source"],
    [{ ...valid, sourceKnown: false }, "unknown-source"],
    [{ ...valid, sourceActive: false }, "inactive-source"],
    [{ ...valid, targetId: "other" }, "misaddressed"],
    [
      { ...valid, sourceTrust: "paired", requiresTrustedSource: true },
      "insufficient-trust",
    ],
    [
      { ...valid, requiresPinnedIdentity: true, hasPinnedIdentity: false },
      "unpinned-identity",
    ],
    [
      {
        ...valid,
        requiresAuthenticatedSession: true,
        hasAuthenticatedSession: false,
      },
      "unauthenticated-session",
    ],
  ] as const)("denies policy violation with %s", (input, code) => {
    expect(authorizeLucaLinkInbound(input)).toMatchObject({
      allowed: false,
      code,
    });
  });

  it("enforces freshness and replay protection when requested", () => {
    const protectedInput = {
      ...valid,
      messageId: "cmd-1",
      timestamp: 1_000,
      now: 1_500,
      maxAgeMs: 1_000,
      futureSkewMs: 100,
    };
    expect(authorizeLucaLinkInbound(protectedInput).allowed).toBe(true);
    expect(
      authorizeLucaLinkInbound({ ...protectedInput, replayed: true }).code,
    ).toBe("replayed");
    expect(
      authorizeLucaLinkInbound({ ...protectedInput, timestamp: 0 }).code,
    ).toBe("invalid-timestamp");
  });
});
