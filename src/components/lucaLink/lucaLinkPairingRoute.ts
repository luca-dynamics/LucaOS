export type LucaLinkPairingConnectionMode = "auto" | "local" | "vpn" | "relay";

export type LucaLinkPairingRouteKind =
  | "local"
  | "relay"
  | "vpn"
  | "unavailable";

export interface LucaLinkPairingRouteInput {
  localIp?: string | null;
  connectionMode?: LucaLinkPairingConnectionMode | null;
  configuredRelayUrl?: string | null;
  configuredVpnUrl?: string | null;
  wsPort: number;
  serverHttpPort: number;
}

export interface LucaLinkPairingRoute {
  kind: LucaLinkPairingRouteKind;
  canGenerateQr: boolean;
  connectionUrl: string;
  managerPath: string;
  mobileUrlBase: string;
  hostParam: string;
  modeParam: "local" | "cloud";
  title: string;
  detail: string;
  requirement: string;
  warning?: string;
  usesServerMintedToken: boolean;
}

function cleanUrl(value?: string | null): string {
  return (value ?? "").trim().replace(/\/+$/, "");
}

function createUnavailableRoute(
  title: string,
  detail: string,
  requirement: string,
): LucaLinkPairingRoute {
  return {
    kind: "unavailable",
    canGenerateQr: false,
    connectionUrl: "",
    managerPath: "",
    mobileUrlBase: "",
    hostParam: "",
    modeParam: "local",
    title,
    detail,
    requirement,
    warning: detail,
    usesServerMintedToken: false,
  };
}

function deriveHttpUrlFromSocketUrl(
  socketUrl: string,
  wsPort: number,
  serverHttpPort: number,
): string {
  try {
    const url = new URL(socketUrl);
    if (url.port === String(wsPort)) {
      url.port = String(serverHttpPort);
    }
    return cleanUrl(url.toString());
  } catch {
    return cleanUrl(socketUrl);
  }
}

function createLocalRoute(
  localIp: string,
  wsPort: number,
  serverHttpPort: number,
): LucaLinkPairingRoute {
  return {
    kind: "local",
    canGenerateQr: true,
    connectionUrl: `http://${localIp}:${wsPort}`,
    managerPath: "/mobile/socket.io",
    mobileUrlBase: `http://${localIp}:${serverHttpPort}/mobile/index.html`,
    hostParam: `${localIp}:${wsPort}`,
    modeParam: "local",
    title: "Local network",
    detail: "Best when both devices are on the same Wi-Fi or LAN.",
    requirement: "Phone must be able to reach this computer on the local network.",
    usesServerMintedToken: true,
  };
}

function createRelayRoute(relayUrl: string): LucaLinkPairingRoute {
  return {
    kind: "relay",
    canGenerateQr: true,
    connectionUrl: relayUrl,
    managerPath: "",
    mobileUrlBase: `${relayUrl}/mobile/index.html`,
    hostParam: relayUrl,
    modeParam: "cloud",
    title: "Relay route",
    detail: "Works when the phone is away from this Wi-Fi or LAN.",
    requirement: "Both devices need internet access and the relay must be reachable.",
    usesServerMintedToken: false,
  };
}

function createVpnRoute(
  vpnUrl: string,
  wsPort: number,
  serverHttpPort: number,
): LucaLinkPairingRoute {
  return {
    kind: "vpn",
    canGenerateQr: true,
    connectionUrl: vpnUrl,
    managerPath: "/mobile/socket.io",
    mobileUrlBase: `${deriveHttpUrlFromSocketUrl(vpnUrl, wsPort, serverHttpPort)}/mobile/index.html`,
    hostParam: vpnUrl,
    modeParam: "local",
    title: "Private tunnel",
    detail: "Uses the configured VPN or private tunnel address.",
    requirement: "Phone must be connected to the same VPN or private tunnel.",
    usesServerMintedToken: true,
  };
}

export function resolveLucaLinkPairingRoute(
  input: LucaLinkPairingRouteInput,
): LucaLinkPairingRoute {
  const mode = input.connectionMode ?? "auto";
  const localIp = (input.localIp ?? "").trim();
  const relayUrl = cleanUrl(input.configuredRelayUrl);
  const vpnUrl = cleanUrl(input.configuredVpnUrl);

  if (mode === "relay") {
    return relayUrl
      ? createRelayRoute(relayUrl)
      : createUnavailableRoute(
          "Relay route",
          "Relay pairing is selected, but no relay server is configured.",
          "Add a relay server in LucaLink settings or switch to Auto.",
        );
  }

  if (mode === "vpn") {
    return vpnUrl
      ? createVpnRoute(vpnUrl, input.wsPort, input.serverHttpPort)
      : createUnavailableRoute(
          "Private tunnel",
          "VPN pairing is selected, but no VPN address is configured.",
          "Add a VPN/private tunnel URL in LucaLink settings or switch to Auto.",
        );
  }

  if (mode === "local") {
    return localIp
      ? createLocalRoute(localIp, input.wsPort, input.serverHttpPort)
      : createUnavailableRoute(
          "Local network",
          "Local pairing is selected, but this computer has no local network address yet.",
          "Connect to Wi-Fi/LAN or switch to Relay.",
        );
  }

  if (relayUrl) return createRelayRoute(relayUrl);
  if (vpnUrl) return createVpnRoute(vpnUrl, input.wsPort, input.serverHttpPort);
  if (localIp) return createLocalRoute(localIp, input.wsPort, input.serverHttpPort);

  return createUnavailableRoute(
    "Choose a route",
    "LucaLink needs a local network address, relay server, or VPN address before pairing.",
    "Connect to Wi-Fi/LAN or configure relay/VPN in LucaLink settings.",
  );
}

export function createLucaLinkPairingMobileUrl(
  route: LucaLinkPairingRoute,
  pairingToken: string,
): string {
  const params = new URLSearchParams({
    token: pairingToken,
    host: route.hostParam,
    mode: route.modeParam,
  });
  return `${route.mobileUrlBase}?${params.toString()}`;
}
