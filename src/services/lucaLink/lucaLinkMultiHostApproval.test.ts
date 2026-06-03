import { describe, expect, it } from "vitest";
import { createLucaLinkHostConnectionRecord } from "./lucaLinkHostConnectionModel";
import {
  deriveLucaLinkApprovalSurface,
  evaluateLucaLinkApprovalSurfaceForRequest,
  rankEligibleApprovalSurfaces,
  summarizeLucaLinkApprovalSurfaces,
} from "./lucaLinkMultiHostApproval";
const host = (
  input: Parameters<typeof createLucaLinkHostConnectionRecord>[0],
) =>
  createLucaLinkHostConnectionRecord(
    {
      displayName: "Host",
      trustLevel: "trusted",
      status: "connected",
      ...input,
    },
    { now: 1 },
  );
const req = (
  risk: "low" | "medium" | "high" | "critical" = "low",
  extra = {},
) => ({
  id: `request-${risk}`,
  status: "pending" as const,
  source: "manual" as const,
  createdAt: 1,
  updatedAt: 1,
  expiresAt: 2,
  risk,
  title: "Approval",
  summary: "Software approval",
  reason: "test",
  explain: "test",
  warnings: [],
  errors: [],
  ...extra,
});
describe("LucaLink multi-host approval surface", () => {
  it("lets Primary Host owner approve normal software approvals but escalates payment/physical/safety", () => {
    const surface = deriveLucaLinkApprovalSurface(
      host({
        id: "primary",
        hostClass: "primary-host",
        trustLevel: "owner",
        presenceCapability: "user-present-strong",
      }),
    );
    expect(
      evaluateLucaLinkApprovalSurfaceForRequest(surface, req("high")).eligible,
    ).toBe(true);
    const payment = evaluateLucaLinkApprovalSurfaceForRequest(
      surface,
      req("critical", { permission: "payment" }),
    );
    expect(payment.decision).toBe("primary-host-only");
    expect(payment.requiresFreshPrimaryHostConfirmation).toBe(true);
  });
  it("allows trusted companion low/medium only with strong user presence", () => {
    const surface = deriveLucaLinkApprovalSurface(
      host({
        id: "phone",
        hostClass: "companion-host",
        presenceCapability: "user-present-strong",
      }),
    );
    expect(surface.canApproveLowRisk).toBe(true);
    expect(surface.canApproveMediumRisk).toBe(true);
    expect(
      evaluateLucaLinkApprovalSurfaceForRequest(surface, req("high")).decision,
    ).toBe("must-escalate-primary-host");
  });
  it("allows trusted watch low/medium max and never high/critical", () => {
    const surface = deriveLucaLinkApprovalSurface(
      host({
        id: "watch",
        hostClass: "watch-host",
        approvalCapability: "low-medium-risk",
        presenceCapability: "user-present-strong",
      }),
    );
    expect(
      evaluateLucaLinkApprovalSurfaceForRequest(surface, req("medium"))
        .eligible,
    ).toBe(true);
    expect(
      evaluateLucaLinkApprovalSurfaceForRequest(surface, req("high")).eligible,
    ).toBe(false);
  });
  it("keeps TV/display/web-display and public screens display-only or none", () => {
    const tv = deriveLucaLinkApprovalSurface(
      host({
        id: "tv",
        hostClass: "tv-host",
        presenceCapability: "display-only",
      }),
    );
    const pub = deriveLucaLinkApprovalSurface(
      host({
        id: "public",
        hostClass: "web-display-host",
        presenceCapability: "public-surface",
      }),
    );
    expect(tv.authority).toBe("display-only");
    expect(tv.canApproveLowRisk).toBe(false);
    expect(pub.authority).toBe("none");
  });
  it("blocks guest, sensor, embodied own physical action, revoked, and unknown hosts", () => {
    for (const hostClass of [
      "guest-host",
      "sensor-host",
      "embodied-host",
      "unknown-host",
    ] as const)
      expect(
        deriveLucaLinkApprovalSurface(host({ id: hostClass, hostClass }))
          .canApproveLowRisk,
      ).toBe(false);
    const embodied = deriveLucaLinkApprovalSurface(
      host({ id: "robot", hostClass: "embodied-host", canActPhysically: true }),
    );
    expect(
      evaluateLucaLinkApprovalSurfaceForRequest(
        embodied,
        req("high", {
          permission: "physical actuation",
          requestedByDeviceId: "robot",
        }),
      ).eligible,
    ).toBe(false);
    const revoked = deriveLucaLinkApprovalSurface(
      host({ id: "revoked", hostClass: "companion-host", status: "revoked" }),
    );
    expect(revoked.canDisplayApprovals).toBe(false);
  });
  it("prevents execution host self-approval unless Primary Host", () => {
    const exec = deriveLucaLinkApprovalSurface(
      host({ id: "exec", hostClass: "execution-host", canExecute: true }),
    );
    expect(
      evaluateLucaLinkApprovalSurfaceForRequest(
        exec,
        req("high", { requestedByDeviceId: "exec" }),
      ).eligible,
    ).toBe(false);
    const primaryExec = deriveLucaLinkApprovalSurface(
      host({
        id: "exec",
        hostClass: "execution-host",
        trustLevel: "owner",
        deviceRole: "primary-host",
      }),
      { currentPrimaryHostId: "exec" },
    );
    expect(primaryExec.canApproveHighRisk).toBe(true);
  });
  it("summarizes and ranks approval surfaces", () => {
    const surfaces = [
      deriveLucaLinkApprovalSurface(
        host({ id: "p", hostClass: "primary-host", trustLevel: "owner" }),
      ),
      deriveLucaLinkApprovalSurface(
        host({
          id: "c",
          hostClass: "companion-host",
          presenceCapability: "user-present-strong",
        }),
      ),
      deriveLucaLinkApprovalSurface(
        host({ id: "d", hostClass: "display-host" }),
      ),
    ];
    expect(summarizeLucaLinkApprovalSurfaces(surfaces).total).toBe(3);
    expect(
      rankEligibleApprovalSurfaces(surfaces, req("low"))[0].surfaceKind,
    ).toBe("primary-host-console");
  });
});
