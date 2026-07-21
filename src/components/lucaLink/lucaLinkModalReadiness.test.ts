import { describe, expect, it } from "vitest";
import { ConnectionState } from "../../services/lucaLink/types";
import { createLucaLinkModalReadinessItems } from "./lucaLinkModalReadiness";

describe("createLucaLinkModalReadinessItems", () => {
  it("explains an empty pairing session in user-facing terms", () => {
    const items = createLucaLinkModalReadinessItems({
      connectionState: ConnectionState.DISCONNECTED,
      isInitialized: false,
      linkedDevices: 0,
      trustedDevices: 0,
      blockedDevices: 0,
      onlineHosts: 0,
      activeGuests: 0,
      pendingGuestAuth: 0,
      deniedGuestInbound: 0,
      rateLimitedGuestInbound: 0,
    });

    expect(items.map((item) => item.label)).toEqual([
      "Pairing",
      "Host link",
      "Trust",
      "Continuity",
      "Guest access",
    ]);
    expect(items[0]).toMatchObject({
      value: "Preparing",
      detail: "No device has joined yet",
      tone: "waiting",
    });
    expect(items.find((item) => item.id === "trust")?.detail).toBe(
      "New devices start with limited access",
    );
    expect(items.find((item) => item.id === "continuity")?.value).toBe(
      "No active continuity",
    );
  });

  it("summarizes a ready linked host without exposing internal system terms", () => {
    const items = createLucaLinkModalReadinessItems({
      connectionState: ConnectionState.CONNECTED,
      isInitialized: true,
      linkedDevices: 2,
      trustedDevices: 2,
      blockedDevices: 0,
      onlineHosts: 1,
      activeGuests: 1,
      pendingGuestAuth: 0,
      deniedGuestInbound: 0,
      rateLimitedGuestInbound: 0,
      validContinuations: 1,
      pendingHandoffs: 0,
    });

    expect(items[0]).toMatchObject({
      value: "Ready",
      detail: "2 devices paired",
      tone: "ready",
    });
    expect(items.find((item) => item.id === "hosts")).toMatchObject({
      value: "1 host",
      tone: "ready",
    });
    expect(items.find((item) => item.id === "trust")?.detail).toBe(
      "Capability access still requires approval",
    );
    expect(items.find((item) => item.id === "continuity")).toMatchObject({
      value: "1 continuation ready",
      tone: "ready",
    });
    expect(JSON.stringify(items)).not.toMatch(/registry|handshake/i);
  });

  it("raises attention when pairing or guest protection needs review", () => {
    const items = createLucaLinkModalReadinessItems({
      connectionState: ConnectionState.ERROR,
      isInitialized: false,
      initError: "Local pairing service refused start (401)",
      linkedDevices: 0,
      trustedDevices: 1,
      blockedDevices: 1,
      onlineHosts: 0,
      activeGuests: 0,
      pendingGuestAuth: 1,
      deniedGuestInbound: 2,
      rateLimitedGuestInbound: 1,
      pendingHandoffs: 2,
    });

    expect(items[0]).toMatchObject({
      value: "Needs attention",
      detail: "Local pairing service refused start (401)",
      tone: "attention",
    });
    expect(items.find((item) => item.id === "trust")).toMatchObject({
      value: "1 blocked",
      tone: "attention",
    });
    expect(items.find((item) => item.id === "continuity")).toMatchObject({
      value: "2 handoffs pending",
      tone: "waiting",
    });
    expect(items.find((item) => item.id === "guest")).toMatchObject({
      detail: "3 guest events blocked or slowed",
      tone: "attention",
    });
  });
});
