import { describe, expect, it } from "vitest";
import lucaLinkSource from "./SettingsLucaLinkTab.tsx?raw";
import { LUCA_LINK_FORBIDDEN_DEVICE_CENTER_ACTION_LABELS } from "../../services/lucaLink/lucaLinkArchitectureInvariants";

const tabs = [
  "Devices",
  "Hosts",
  "Approvals",
  "Guests",
  "Sync",
  "Bridge Review",
  "Advanced",
];

describe("Settings LucaLink Device Center runtime safety", () => {
  it("defines all no-crash snapshot dependencies and empty-state guards", () => {
    const snapshot = lucaLinkSource.slice(
      lucaLinkSource.indexOf("function readLucaLinkDeviceCenterSnapshot"),
      lucaLinkSource.indexOf("export function formatLucaLinkTimestamp"),
    );
    for (const getter of [
      "getState",
      "getPendingApprovalRequests",
      "getContinuationTokens",
      "getHandoffs",
      "getTrustedDevices",
      "getGuestSecuritySessions",
      "getFreshHostConnections",
      "getApprovalSurfaces",
      "getBridgeReviews",
      "getEmbodiedHostCapabilityEnvelopes",
      "getAdapterDrafts",
    ]) {
      expect(snapshot).toContain(`lucaLink.${getter}()`);
    }
    expect(lucaLinkSource).toContain("hostConnections.length === 0");
    expect(lucaLinkSource).toContain("bridgeReviews.map");
    expect(lucaLinkSource).toContain("adapterDrafts.map");
  });

  it("exposes every required Device Center tab", () => {
    for (const label of tabs) {
      expect(lucaLinkSource).toContain(`label: "${label}"`);
    }
  });

  it("does not expose forbidden execution, probing, takeover, or device-control actions", () => {
    const lowerSource = lucaLinkSource.toLowerCase();
    for (const label of LUCA_LINK_FORBIDDEN_DEVICE_CENTER_ACTION_LABELS) {
      expect(lowerSource).not.toContain(`>${label.toLowerCase()}<`);
      expect(lowerSource).not.toContain(`"${label.toLowerCase()}"`);
    }
  });

  it("uses host-aware terminology and explicit model-only safety copy", () => {
    expect(lucaLinkSource).toContain('label="Primary Host"');
    expect(lucaLinkSource).not.toMatch(/Origin approval/i);
    expect(lucaLinkSource).toContain(
      "Memory handoff is intent-only; raw memory databases are not",
    );
    expect(lucaLinkSource).toContain("generatedTextOnly true");
    expect(lucaLinkSource).toContain("canWriteToDisk false");
    expect(lucaLinkSource).toContain("canExecute false");
    expect(lucaLinkSource).toContain("canInstall false");
    expect(lucaLinkSource).toContain(
      "Approval for sandbox does not execute or install the adapter.",
    );
    expect(lucaLinkSource).toContain(
      "payment, and safety-critical actions are never auto-approved.",
    );
  });
});
