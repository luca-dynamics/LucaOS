import React, { useState, useEffect } from "react";
import { Icon } from "./ui/Icon";
import QRCode from "qrcode";
import { lucaLinkManager } from "../services/lucaLink/manager";
import { DeviceList } from "./lucaLink/DeviceList";
import { ErrorToast } from "./lucaLink/ErrorToast";
import { createLucaLinkModalReadinessItems } from "./lucaLink/lucaLinkModalReadiness";
import {
  createLucaLinkPairingMobileUrl,
  resolveLucaLinkPairingRoute,
  type LucaLinkPairingRoute,
} from "./lucaLink/lucaLinkPairingRoute";
import type { Device, LucaLinkError } from "../services/lucaLink/types";
import { ConnectionState } from "../services/lucaLink/types";
import { API_BASE_URL, SERVER_HTTP_PORT, WS_PORT, RELAY_SERVER_URL, getAuthHeaders, waitForAuth } from "../config/api";
import { settingsService } from "../services/settingsService";
import {
  lucaMaterialControlStyle,
  lucaMaterialDialogStyle,
  lucaMaterialSolidCardStyle,
} from "../styles/lucaMaterialSystem";

interface LucaLinkModalProps {
  onClose: () => void;
  localIp: string;
}

const readinessToneStyle = (tone: "ready" | "waiting" | "attention") => {
  if (tone === "ready") {
    return {
      background:
        "color-mix(in srgb, var(--luca-success,#4fbf7a) 8%, transparent)",
      borderColor:
        "color-mix(in srgb, var(--luca-success,#4fbf7a) 30%, transparent)",
      color: "var(--luca-success,#4fbf7a)",
    };
  }

  if (tone === "attention") {
    return {
      background:
        "color-mix(in srgb, var(--luca-danger,#f87171) 8%, transparent)",
      borderColor:
        "color-mix(in srgb, var(--luca-danger,#f87171) 30%, transparent)",
      color: "var(--luca-danger,#f87171)",
    };
  }

  return {
    background: "var(--luca-surface-glass, rgba(255,255,255,0.03))",
    borderColor: "var(--luca-border-subtle, rgba(255,255,255,0.08))",
    color: "var(--app-text-muted)",
  };
};

const LucaLinkModal: React.FC<LucaLinkModalProps> = ({
  onClose,
  localIp,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED
  );
  const [errors, setErrors] = useState<LucaLinkError[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [pairingRoute, setPairingRoute] =
    useState<LucaLinkPairingRoute | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  // Initialize Luca Link Manager
  useEffect(() => {
    // Reset initialization on IP change
    const initManager = async () => {
      try {
        setIsInitialized(false);
        setInitError(null);
        setQrDataUrl(""); // Clear QR while regenerating

        const lucaLinkSettings = settingsService.getSettings().lucaLink;
        const route = resolveLucaLinkPairingRoute({
          localIp,
          connectionMode: lucaLinkSettings.connectionMode,
          configuredRelayUrl:
            lucaLinkSettings.relayServerUrl || RELAY_SERVER_URL,
          configuredVpnUrl: lucaLinkSettings.vpnServerUrl,
          wsPort: Number(WS_PORT),
          serverHttpPort: Number(SERVER_HTTP_PORT),
        });
        setPairingRoute(route);

        if (!route.canGenerateQr) {
          throw new Error(route.warning ?? route.detail);
        }

        let pairingToken: string;
        if (!route.usesServerMintedToken) {
          // Relay flow keeps the client-minted token (relay does its own auth).
          pairingToken = (await lucaLinkManager.generatePairingData()).token;
        } else {
          // Direct routes use server-minted tokens; the socket server rejects
          // tokens it did not issue.
          await waitForAuth();
          const started = await fetch(`${API_BASE_URL}/api/luca-link/start`, {
            method: "POST",
            headers: getAuthHeaders(),
          });
          if (!started.ok) {
            throw new Error(
              `Local pairing service refused start (${started.status})`,
            );
          }
          const minted = await fetch(
            `${API_BASE_URL}/api/luca-link/pairing-token`,
            { method: "POST", headers: getAuthHeaders() },
          );
          if (!minted.ok) {
            throw new Error(
              `Pairing token mint failed (${minted.status})`,
            );
          }
          const body = await minted.json();
          if (!body?.token) throw new Error("Pairing token mint returned no token");
          pairingToken = body.token;
        }

        // Initialize manager (desktop side of the same socket server)
        await lucaLinkManager.initialize(route.connectionUrl, {
          path: route.managerPath,
          deviceId: "desktop_main",
          deviceName: "Luca Desktop",
        });

        // Connect
        await lucaLinkManager.connect();

        const mobileUrl = createLucaLinkPairingMobileUrl(route, pairingToken);

        // Scannability beats theming: dark ink on white, every skin.
        const url = await QRCode.toDataURL(mobileUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: "#0c0e12",
            light: "#FFFFFFFF",
          },
        });

        setQrDataUrl(url);
        setIsInitialized(true);

        // Load existing devices
        updateDevices();
      } catch (error) {
        console.error("[LucaLinkModal] Initialization failed:", error);
        setInitError(
          error instanceof Error ? error.message : "Pairing setup failed",
        );
      }
    };

    initManager();
  }, [localIp, retryNonce]);

  // Subscribe to events
  useEffect(() => {
    if (!isInitialized) return;

    const handleDeviceAdded = () => {
      updateDevices();
    };

    const handleDeviceRemoved = () => {
      updateDevices();
    };

    const handleConnected = () => {
      setConnectionState(ConnectionState.CONNECTED);
      updateDevices();
    };

    const handleDisconnected = () => {
      setConnectionState(ConnectionState.DISCONNECTED);
    };

    const handleReconnecting = () => {
      setConnectionState(ConnectionState.RECONNECTING);
    };

    lucaLinkManager.on("device:added", handleDeviceAdded);
    lucaLinkManager.on("device:removed", handleDeviceRemoved);
    lucaLinkManager.on("connected", handleConnected);
    lucaLinkManager.on("disconnected", handleDisconnected);
    lucaLinkManager.on("reconnecting", handleReconnecting);

    // Initial state
    setConnectionState(
      lucaLinkManager.getConnectionState() || ConnectionState.DISCONNECTED
    );

    return () => {
      lucaLinkManager.off("device:added", handleDeviceAdded);
      lucaLinkManager.off("device:removed", handleDeviceRemoved);
      lucaLinkManager.off("connected", handleConnected);
      lucaLinkManager.off("disconnected", handleDisconnected);
      lucaLinkManager.off("reconnecting", handleReconnecting);
    };
  }, [isInitialized]);

  const updateDevices = () => {
    setDevices(lucaLinkManager.getDevices());
  };

  const handleDeviceAction = async (
    deviceId: string,
    action: "test" | "unpair" | "reconnect"
  ) => {
    try {
      switch (action) {
        case "test":
          await lucaLinkManager.sendCommand(deviceId, "vibrate", {
            pattern: [200, 100, 200],
          });
          break;
        case "unpair":
          await lucaLinkManager.removeDevice(deviceId);
          updateDevices();
          break;
        case "reconnect":
          // Trigger reconnection logic (handled by manager)
          break;
      }
    } catch (error) {
      console.error("[LucaLinkModal] Device action failed:", error);
    }
  };

  const handleErrorDismiss = (error: LucaLinkError) => {
    setErrors(errors.filter((e) => e !== error));
  };

  const stateLabel =
    connectionState === ConnectionState.CONNECTED
      ? "ready"
      : connectionState === ConnectionState.RECONNECTING
        ? "reconnecting"
        : connectionState === ConnectionState.CONNECTING
          ? "connecting"
          : "offline";
  const stateTone =
    connectionState === ConnectionState.CONNECTED
      ? "var(--luca-success, #4fbf7a)"
      : connectionState === ConnectionState.DISCONNECTED
        ? "var(--luca-border-strong, rgba(255,255,255,0.25))"
        : "var(--luca-warning, #e0b15a)";
  const deviceTrustSummary = lucaLinkManager.console.getDeviceTrustSummary();
  const hostConnectionSummary =
    lucaLinkManager.console.getFreshHostConnectionSummary();
  const guestSecuritySummary =
    lucaLinkManager.console.getGuestSecuritySummary();
  const readinessItems = createLucaLinkModalReadinessItems({
    connectionState,
    isInitialized,
    initError,
    linkedDevices: devices.length,
    trustedDevices: deviceTrustSummary.trusted,
    blockedDevices: deviceTrustSummary.blocked,
    onlineHosts: hostConnectionSummary.online,
    activeGuests: guestSecuritySummary.active,
    pendingGuestAuth: guestSecuritySummary.authChallenge,
    deniedGuestInbound: guestSecuritySummary.deniedGuestInbound,
    rateLimitedGuestInbound: guestSecuritySummary.rateLimitedGuestInbound,
  });

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4">
      <div
        className="relative flex max-h-[86vh] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl border"
        data-luca-material-role="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Link a device"
        style={lucaMaterialDialogStyle}
      >
        {/* Header — calm row, state as a quiet word */}
        <div
          className="flex h-[52px] flex-none items-center gap-2.5 border-b px-5"
          style={lucaMaterialSolidCardStyle}
        >
          <Icon
            name="Smartphone"
            size={16}
            className="flex-none text-[var(--app-text-muted)]"
          />
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--app-text-main)]">
            Link a device
          </h2>
          <span className="ml-1 flex items-center gap-1.5 text-[11px] text-[var(--app-text-muted)]">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: stateTone }}
              aria-hidden="true"
            />
            {stateLabel}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="luca-material-pressable ml-auto rounded-lg border p-1.5 transition-colors hover:text-[var(--luca-text-primary)]"
            style={lucaMaterialControlStyle}
          >
            <Icon name="Close" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-sm leading-relaxed text-[var(--app-text-muted)]">
            Scan this from your phone to pair it with this LucaOS host. Luca can
            only use capabilities you approve, and you can unlink the device any
            time.
          </p>

          {pairingRoute && (
            <div
              className="mt-4 rounded-xl border p-3"
              style={{
                background:
                  pairingRoute.kind === "unavailable"
                    ? "color-mix(in srgb, var(--luca-danger,#f87171) 8%, transparent)"
                    : "var(--luca-surface-glass, rgba(255,255,255,0.03))",
                borderColor:
                  pairingRoute.kind === "unavailable"
                    ? "color-mix(in srgb, var(--luca-danger,#f87171) 30%, transparent)"
                    : "var(--luca-border-subtle, rgba(255,255,255,0.08))",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg border"
                  style={{
                    borderColor:
                      "var(--luca-border-subtle, rgba(255,255,255,0.08))",
                    background:
                      "var(--luca-background-panel, rgba(255,255,255,0.04))",
                  }}
                >
                  <Icon
                    name={
                      pairingRoute.kind === "relay"
                        ? "Globe"
                        : pairingRoute.kind === "vpn"
                          ? "Shield"
                          : pairingRoute.kind === "local"
                            ? "Wifi"
                            : "WifiLow"
                    }
                    size={15}
                    className="text-[var(--app-text-muted)]"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--app-text-main)]">
                    {pairingRoute.title}
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--app-text-muted)]">
                    {pairingRoute.detail}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--app-text-muted)] opacity-75">
                    {pairingRoute.requirement}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            {readinessItems.map((item) => {
              const toneStyle = readinessToneStyle(item.tone);
              return (
                <div
                  key={item.id}
                  className="min-h-[74px] rounded-xl border px-3 py-2.5"
                  style={{
                    background: toneStyle.background,
                    borderColor: toneStyle.borderColor,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">
                      {item.label}
                    </p>
                    <span
                      className="h-1.5 w-1.5 flex-none rounded-full"
                      style={{ background: toneStyle.color }}
                      aria-hidden="true"
                    />
                  </div>
                  <p
                    className="mt-1 truncate text-[13px] font-semibold"
                    style={{ color: toneStyle.color }}
                  >
                    {item.value}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[var(--app-text-muted)]">
                    {item.detail}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col items-center">
            <div
              className="rounded-2xl border bg-white p-3"
              style={{
                borderColor: "var(--luca-border-subtle, rgba(255,255,255,0.08))",
              }}
            >
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Pairing QR code"
                  className="h-44 w-44 object-contain"
                />
              ) : initError ? (
                <div className="flex h-44 w-44 flex-col items-center justify-center gap-2 px-3 text-center text-[#69737f]">
                  <span className="text-[11px] leading-relaxed">
                    Couldn&apos;t prepare pairing: {initError}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRetryNonce((n) => n + 1)}
                    className="rounded-lg bg-[#0c0e12] px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-85"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <div className="flex h-44 w-44 flex-col items-center justify-center gap-2 text-[#69737f]">
                  <Icon name="Restart" className="animate-spin" size={20} />
                  <span className="text-[11px]">
                    Preparing pairing route...
                  </span>
                </div>
              )}
            </div>
            {pairingRoute?.connectionUrl && (
              <p
                className="mt-3 text-[11px] text-[var(--app-text-muted)] opacity-70"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {pairingRoute.connectionUrl}
              </p>
            )}
          </div>

          {devices.length > 0 && (
            <div
              className="mt-5 border-t pt-4"
              style={{
                borderColor: "var(--luca-border-subtle, rgba(255,255,255,0.06))",
              }}
            >
              <p className="pb-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">
                Linked
              </p>
              <DeviceList
                devices={devices}
                onDeviceAction={handleDeviceAction}
                themePrimary="text-[var(--app-text-main)]"
                themeBorder="border-[var(--luca-border-subtle,rgba(255,255,255,0.08))]"
                themeBg="bg-[var(--luca-surface-glass,rgba(255,255,255,0.03))]"
              />
            </div>
          )}
        </div>

        {/* Trust line */}
        <div
          className="flex h-[44px] flex-none items-center border-t px-5"
          style={{ borderColor: "var(--luca-border-subtle, rgba(255,255,255,0.06))" }}
        >
          <span className="text-[11px] text-[var(--app-text-muted)] opacity-80">
            Nothing connects without pairing. Unlink any time.
          </span>
        </div>
      </div>

      {/* Error toasts */}
      {errors.map((error, index) => (
        <ErrorToast
          key={`${error.code}-${error.timestamp.getTime()}-${index}`}
          error={error}
          onDismiss={() => handleErrorDismiss(error)}
          themePrimary="text-[var(--app-text-main)]"
          themeBorder="border-[var(--luca-border-subtle,rgba(255,255,255,0.08))]"
          themeBg="bg-[var(--luca-surface-glass,rgba(255,255,255,0.03))]"
        />
      ))}
    </div>
  );
};

export default LucaLinkModal;
