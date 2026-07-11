import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("socket.io-client", () => ({ io: vi.fn() }));
vi.mock("../settingsService", () => ({
  settingsService: {
    getSettings: () => ({ lucaLink: {} }),
  },
}));
vi.mock("./sessionManager", () => ({
  sessionManager: {
    recoverSessionByDevice: vi.fn(),
  },
}));

import { lucaLink } from "./relayClientAdapter";
import { LucaLinkBridgeReviewStore } from "./lucaLinkBridgeReviewStore";
import { LucaLinkAdapterDraftStore } from "./lucaLinkAdapterDraftStore";

describe("LucaLinkService runtime QA model-only regressions", () => {
  beforeEach(() => {
    lucaLink.disableSoftEnforcement();
    lucaLink.disableRuntimeEnforcement();
    lucaLink.clearApprovalQueue();
    lucaLink.clearContinuationRegistry();
    lucaLink.clearHostConnections();
    lucaLink.clearAdapterDrafts();
    (lucaLink as any).bridgeReviewStore = new LucaLinkBridgeReviewStore();
    (lucaLink as any).adapterDraftStore = new LucaLinkAdapterDraftStore();
    (lucaLink as any).socket = null;
    (lucaLink as any).state = {
      connected: false,
      deviceId: null,
      pairingToken: null,
      connectedDevices: [],
      error: null,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes empty Device Center model dependencies without throwing", () => {
    expect(() => ({
      hosts: lucaLink.getFreshHostConnections(),
      approvals: lucaLink.getApprovalSurfaces(),
      reviews: lucaLink.getBridgeReviews(),
      drafts: lucaLink.getAdapterDrafts(),
      envelopes: lucaLink.getEmbodiedHostCapabilityEnvelopes(),
    })).not.toThrow();
    expect(lucaLink.getFreshHostConnections()).toEqual([]);
    expect(lucaLink.getApprovalSurfaces()).toEqual([]);
    expect(lucaLink.getBridgeReviews()).toEqual([]);
    expect(lucaLink.getAdapterDrafts()).toEqual([]);
  });

  it("creates and approves a bridge review by state mutation only", () => {
    const emit = vi.fn();
    (lucaLink as any).socket = { emit };
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const review = lucaLink.createBridgeReviewFromBlueprint({
      id: "qa-python-blueprint",
      strategyKind: "python-host-agent",
      title: "QA Python host draft",
      summary: "Model-only QA review",
    });
    const approved = lucaLink.approveBridgeReviewForSandbox(review.id, {
      approvedByDeviceId: "primary-host-1",
      now: 1_000,
    });

    expect(lucaLink.getBridgeReviews()).toHaveLength(1);
    expect(approved?.status).toBe("approved-for-sandbox");
    expect(approved?.warnings.join(" ")).toContain("does not execute");
    expect(emit).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("creates and clears generatedTextOnly adapter drafts without I/O", () => {
    const emit = vi.fn();
    (lucaLink as any).socket = { emit };
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const draft = lucaLink.createAdapterDraftFromBlueprint({
      id: "qa-web-display",
      strategyKind: "web-display-bridge",
      title: "QA display draft",
      summary: "Display-only model draft",
    });

    expect(draft).toMatchObject({
      generatedTextOnly: true,
      canWriteToDisk: false,
      canExecute: false,
      canInstall: false,
    });
    expect(lucaLink.getAdapterDrafts()).toHaveLength(1);
    expect(emit).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();

    lucaLink.clearAdapterDrafts();
    expect(lucaLink.getAdapterDrafts()).toEqual([]);
    expect(emit).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps runtime and soft enforcement disabled by default/reset", () => {
    expect(lucaLink.getRuntimeEnforcementMode()).toBe("disabled");
    expect(lucaLink.getSoftEnforcementMode()).toBe("disabled");
  });
});
