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
      expect(snapshot).toContain(`lucaLinkManager.console.${getter}()`);
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

  it("shows read-only adapter sandbox status without execution controls", () => {
    expect(lucaLinkSource).toContain("Adapter Sandbox Runtime");
    expect(lucaLinkSource).toContain('label: "Runtime status"');
    expect(lucaLinkSource).toContain('label: "Safety check"');
    expect(lucaLinkSource).toContain('label: "Code and shell"');
    expect(lucaLinkSource).toContain('label: "Host approval"');
    expect(lucaLinkSource).toContain("Safety-check plan");
    expect(lucaLinkSource).toContain("sideEffectsPerformed");
    expect(lucaLinkSource).not.toMatch(/>Execute adapter</i);
    expect(lucaLinkSource).not.toMatch(/>Install adapter</i);
  });

  it("shows companion approval notifications as intent-only read-only cards", () => {
    expect(lucaLinkSource).toContain("Companion Approval Notifications");
    expect(lucaLinkSource).toContain("intent-only notification preview");
    expect(lucaLinkSource).toMatch(/No\s+execution, queue\s+mutation/);
    expect(lucaLinkSource).toContain('label: "Risk"');
    expect(lucaLinkSource).toContain('label: "Surface decision"');
    expect(lucaLinkSource).toContain("Allowed notification actions");
    expect(lucaLinkSource).toContain("Blocked actions");
    expect(lucaLinkSource).toContain("sideEffectsPerformed");
    expect(lucaLinkSource).not.toMatch(/>Approve notification</i);
    expect(lucaLinkSource).not.toMatch(/>Cast notification</i);
    expect(lucaLinkSource).not.toMatch(/>Open notification</i);
    expect(lucaLinkSource).not.toMatch(/>Execute notification</i);
  });

  it("shows the Display Bridge as read-only and approval-gated", () => {
    expect(lucaLinkSource).toContain("Display Bridge");
    expect(lucaLinkSource).toContain("Read-only");
    expect(lucaLinkSource).toContain(
      "Presentation requires target-host approval",
    );
    expect(lucaLinkSource).toContain("Display session status");
    expect(lucaLinkSource).toContain("display package status");
    expect(lucaLinkSource).not.toMatch(/>Execute display</i);
    expect(lucaLinkSource).not.toMatch(/>Cast</i);
    expect(lucaLinkSource).not.toMatch(/>Control browser</i);
    expect(lucaLinkSource).not.toMatch(/>Open browser</i);
  });

  it("uses host-aware terminology and explicit safety copy", () => {
    expect(lucaLinkSource).toContain('label: "Primary Host"');
    expect(lucaLinkSource).not.toMatch(/Origin approval/i);
    expect(lucaLinkSource).toContain(
      "Memory handoff is intent-only; raw memory databases are not",
    );
    // Adapter draft safety flags render as humanized copy, not raw camelCase
    // field dumps.
    expect(lucaLinkSource).toContain("Text only {draft.generatedTextOnly");
    expect(lucaLinkSource).toContain("Disk write {draft.canWriteToDisk");
    expect(lucaLinkSource).toContain('Execute {draft.canExecute ? "yes" : "no"}');
    expect(lucaLinkSource).toContain("{draft.canInstall ? \"yes\" : \"no\"}");
    expect(lucaLinkSource).toContain(
      "Approval for sandbox does not execute or install the adapter.",
    );
    expect(lucaLinkSource).toContain(
      "payment, and safety-critical actions are never auto-approved.",
    );
  });
});
