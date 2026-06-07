import { describe, expect, it } from "vitest";
import { createLucaLinkAdapterSandboxPlan } from "../adapters/adapterSandboxRuntime";
import { LUCA_LINK_SAFE_DISPLAY_ADAPTER_FIXTURE } from "../adapters/adapterSandboxFixtures";
import {
  createDisplayBridgeIntentFromAdapterPlan,
  createLucaLinkWebDisplaySessionIntent,
  expireLucaLinkWebDisplaySessionIntent,
  markLucaLinkWebDisplaySessionApprovedForPreview,
} from "./webDisplaySession";

const createdAt = "2026-06-07T10:00:00.000Z";
const expiresAt = "2026-06-07T10:15:00.000Z";

function createIntent() {
  return createLucaLinkWebDisplaySessionIntent({
    sessionId: "display-session-test",
    requestedByHostId: "primary-host",
    targetHostId: "display-host",
    title: "Project dashboard",
    contentKind: "dashboard_panel",
    createdAt,
    expiresAt,
  });
}

describe("LucaLink web display sessions", () => {
  it("defaults to required host approval and no side effects", () => {
    const intent = createIntent();
    expect(intent.hostApprovalRequired).toBe(true);
    expect(intent.status).toBe("approval_required");
    expect(intent.sideEffectsPerformed).toBe(false);
  });

  it("approval changes status only to approved_preview without execution or send state", () => {
    const approved = markLucaLinkWebDisplaySessionApprovedForPreview(
      createIntent(),
      {
        approvedByHostId: "display-host",
        approvedAt: "2026-06-07T10:01:00.000Z",
      },
    );
    expect(approved.status).toBe("approved_preview");
    expect(approved.sideEffectsPerformed).toBe(false);
    expect(approved).not.toHaveProperty("executed");
    expect(approved).not.toHaveProperty("sent");
  });

  it("requires explicit approval for private display content", () => {
    const privateIntent = {
      ...createIntent(),
      privacyLevel: "private" as const,
    };
    const blocked = markLucaLinkWebDisplaySessionApprovedForPreview(
      privateIntent,
      {
        approvedByHostId: "display-host",
        approvedAt: "2026-06-07T10:01:00.000Z",
      },
    );
    expect(blocked.status).toBe("blocked");
    expect(blocked.blockers.join(" ")).toMatch(/explicit host approval/i);
  });

  it("blocks an expired session", () => {
    const expired = expireLucaLinkWebDisplaySessionIntent(
      createIntent(),
      "2026-06-07T10:16:00.000Z",
    );
    expect(expired.status).toBe("expired");
    expect(expired.blockers).toContain("Display session intent has expired.");
    expect(expired.sideEffectsPerformed).toBe(false);
  });

  it("creates an approval-required intent from a display.present adapter plan", () => {
    const plan = createLucaLinkAdapterSandboxPlan({
      manifest: LUCA_LINK_SAFE_DISPLAY_ADAPTER_FIXTURE,
      config: { enabled: true },
      requestedByHostId: "primary-host",
      targetHostId: "display-host",
    });
    const intent = createDisplayBridgeIntentFromAdapterPlan(plan, {
      createdAt,
      expiresAt,
    });
    expect(plan.requestedCapabilities).toContain("display.present");
    expect(intent.status).toBe("approval_required");
    expect(intent.sideEffectsPerformed).toBe(false);
  });

  it("creates a blocked display intent from a blocked adapter plan", () => {
    const plan = createLucaLinkAdapterSandboxPlan({
      manifest: {
        ...LUCA_LINK_SAFE_DISPLAY_ADAPTER_FIXTURE,
        requestedCapabilities: ["display.present", "file.write.request"],
        requestedPermissions: ["display.present", "file.write.request"],
      },
      requestedByHostId: "primary-host",
      targetHostId: "display-host",
    });
    expect(plan.status).toBe("blocked");
    const intent = createDisplayBridgeIntentFromAdapterPlan(plan, {
      createdAt,
      expiresAt,
    });
    expect(intent.status).toBe("blocked");
    expect(intent.sideEffectsPerformed).toBe(false);
  });
});
