import { describe, expect, it } from "vitest";
import {
  createLucaLinkPairingMobileUrl,
  resolveLucaLinkPairingRoute,
} from "./lucaLinkPairingRoute";

const ports = {
  wsPort: 3002,
  serverHttpPort: 3003,
};

describe("resolveLucaLinkPairingRoute", () => {
  it("uses relay in auto mode when a relay URL is configured", () => {
    const route = resolveLucaLinkPairingRoute({
      ...ports,
      localIp: "192.168.1.10",
      connectionMode: "auto",
      configuredRelayUrl: "https://relay.lucaos.space/",
    });

    expect(route).toMatchObject({
      kind: "relay",
      canGenerateQr: true,
      connectionUrl: "https://relay.lucaos.space",
      hostParam: "https://relay.lucaos.space",
      modeParam: "cloud",
      usesServerMintedToken: false,
    });
  });

  it("uses a configured VPN route in auto mode when relay is unavailable", () => {
    const route = resolveLucaLinkPairingRoute({
      ...ports,
      localIp: "192.168.1.10",
      connectionMode: "auto",
      configuredVpnUrl: "http://100.64.0.20:3002",
    });

    expect(route).toMatchObject({
      kind: "vpn",
      canGenerateQr: true,
      connectionUrl: "http://100.64.0.20:3002",
      mobileUrlBase: "http://100.64.0.20:3003/mobile/index.html",
      hostParam: "http://100.64.0.20:3002",
      modeParam: "local",
      usesServerMintedToken: true,
    });
  });

  it("falls back to local network in auto mode when no remote route is configured", () => {
    const route = resolveLucaLinkPairingRoute({
      ...ports,
      localIp: "192.168.1.10",
      connectionMode: "auto",
    });

    expect(route).toMatchObject({
      kind: "local",
      canGenerateQr: true,
      connectionUrl: "http://192.168.1.10:3002",
      mobileUrlBase: "http://192.168.1.10:3003/mobile/index.html",
      hostParam: "192.168.1.10:3002",
      modeParam: "local",
      usesServerMintedToken: true,
    });
  });

  it("does not silently show a LAN QR when explicit relay mode is missing config", () => {
    const route = resolveLucaLinkPairingRoute({
      ...ports,
      localIp: "192.168.1.10",
      connectionMode: "relay",
    });

    expect(route.kind).toBe("unavailable");
    expect(route.canGenerateQr).toBe(false);
    expect(route.warning).toMatch(/no relay server/i);
  });

  it("creates mobile URLs with encoded route parameters", () => {
    const route = resolveLucaLinkPairingRoute({
      ...ports,
      connectionMode: "relay",
      configuredRelayUrl: "https://relay.lucaos.space",
    });

    expect(createLucaLinkPairingMobileUrl(route, "token with spaces")).toBe(
      "https://relay.lucaos.space/mobile/index.html?token=token+with+spaces&host=https%3A%2F%2Frelay.lucaos.space&mode=cloud",
    );
  });
});
