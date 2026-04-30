import React, { useState, useEffect } from "react";
import { Icon } from "./ui/Icon";
import QRCode from "qrcode";
import { lucaLinkManager } from "../services/lucaLink/manager";
import { ConnectionStatus } from "./lucaLink/ConnectionStatus";
import { DeviceList } from "./lucaLink/DeviceList";
import { ErrorToast } from "./lucaLink/ErrorToast";
import type { Device, LucaLinkError } from "../services/lucaLink/types";
import { ConnectionState } from "../services/lucaLink/types";
import { WS_PORT, RELAY_SERVER_URL } from "../config/api";

interface LucaLinkModalProps {
  onClose: () => void;
  localIp: string;
}

const LucaLinkModal: React.FC<LucaLinkModalProps> = ({
  onClose,
  localIp,
}) => {
  const themeHex = getComputedStyle(document.documentElement).getPropertyValue('--app-primary').trim() || "#06b6d4";
  
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED
  );
  const [errors, setErrors] = useState<LucaLinkError[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Luca Link Manager
  useEffect(() => {
    if (!localIp) return; // Wait for IP

    // Reset initialization on IP change
    const initManager = async () => {
      try {
        setIsInitialized(false);
        setQrDataUrl(""); // Clear QR while regenerating

        // Initialize manager
        const connectionUrl =
          RELAY_SERVER_URL || `http://${localIp}:${WS_PORT}`;
        const isCloudRelay = !!RELAY_SERVER_URL;

        await lucaLinkManager.initialize(connectionUrl, {
          path: isCloudRelay ? "" : "/mobile/socket.io", // Cloud relays typically perform root routing
          deviceId: "desktop_main",
          deviceName: "Luca Desktop",
        });

        // Connect
        await lucaLinkManager.connect();

        // Generate pairing QR code
        const pairingData = await lucaLinkManager.generatePairingData();

        const mobileClientHost = isCloudRelay
          ? `${connectionUrl}/mobile`
          : `http://${localIp}:${WS_PORT}/mobile`;

        // The token params tell the mobile client where to connect
        const mobileUrl = `${mobileClientHost}/index.html?token=${
          pairingData.token
        }&host=${isCloudRelay ? connectionUrl : localIp}&mode=${
          isCloudRelay ? "cloud" : "local"
        }`;

        // Get computed style to detect dark/light for QR code color
        const isLightMode = document.body.classList.contains("theme-light") || 
                            getComputedStyle(document.documentElement).getPropertyValue('--app-theme-type').trim() === 'light';

        // Generate QR code
        const url = await QRCode.toDataURL(mobileUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: themeHex,
            light: isLightMode ? "#FFFFFFFF" : "#00000000",
          },
        });

        setQrDataUrl(url);
        setIsInitialized(true);

        // Load existing devices
        updateDevices();
      } catch {
        console.error("[LucaLinkModal] Initialization failed");
      }
    };

    initManager();
  }, [localIp]);

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

  return (
    <div className="fixed inset-0 bg-black/80 glass-blur z-50 flex items-center justify-center p-0 sm:p-4 font-normal">
      <div
        className="glass-blur border rounded-none sm:rounded-lg w-full h-full sm:h-auto sm:max-w-2xl p-4 sm:p-6 relative overflow-hidden flex flex-col max-h-screen bg-[var(--app-bg-tint)]/10"
        style={{
          boxShadow: `0 0 80px -20px rgba(var(--app-primary-rgb), 0.25)`,
          borderColor: "rgba(var(--app-primary-rgb), 0.3)"
        }}
      >
        {/* Liquid background effect 1 (Center) */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none transition-all duration-700 -z-10"
          style={{
            background: `radial-gradient(circle at 50% 50%, rgba(var(--app-primary-rgb), 0.15), transparent 60%)`,
            filter: "blur(40px)",
          }}
        />
        {/* Liquid background effect 2 (Top Right Offset) */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none transition-all duration-700 -z-10"
          style={{
            background: `radial-gradient(circle at 80% 20%, rgba(var(--app-primary-rgb), 0.1), transparent 50%)`,
            filter: "blur(40px)",
          }}
        />
        
        {/* Header */}
        <div
          className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-4 sm:mb-6 border-b relative z-30 flex-shrink-0 bg-[rgba(var(--app-primary-rgb),0.12)] border-[rgba(var(--app-primary-rgb),0.3)]"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-[var(--app-primary)]">
              <Icon name="Smartphone" size={20} className="sm:w-6 sm:h-6" variant="BoldDuotone" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-wider uppercase font-mono text-[var(--app-text-main)]">
              LUCA LINK
            </h2>
            <ConnectionStatus
              state={connectionState}
              themePrimary="text-[var(--app-primary)]"
              themeBorder="border-[rgba(var(--app-primary-rgb),0.3)]"
              themeBg="bg-[rgba(var(--app-primary-rgb),0.1)]"
            />
          </div>
          <button
            onClick={onClose}
            className="relative z-50 transition-all p-2 rounded-lg hover:bg-white/5 cursor-pointer active:scale-95 flex-shrink-0 text-[var(--app-text-muted)] hover:text-[var(--app-text-main)]"
          >
            <Icon name="Close" size={20} className="sm:w-6 sm:h-6" variant="BoldDuotone" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-6">
          {/* QR Code Section */}
          <div className="flex flex-col items-center">
            <h3
              className="text-xs sm:text-sm font-mono font-bold text-[var(--app-primary)] uppercase tracking-wider mb-3 sm:mb-4 flex items-center gap-2"
            >
              <Icon name="Smartphone" size={14} variant="BoldDuotone" /> PAIR NEW DEVICE
            </h3>

            <div className="relative group">
              <div
                className="absolute -inset-1 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 bg-[var(--app-primary)]"
              />
              <div
                className="relative p-2 sm:p-4 rounded-lg border bg-[var(--app-bg-tint)]/20 border-white/10"
              >
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Pairing QR Code"
                    className="w-32 h-32 xs:w-40 xs:h-40 sm:w-48 sm:h-48 object-contain"
                  />
                ) : (
                  <div className="w-32 h-32 xs:w-40 xs:h-40 sm:w-48 sm:h-48 flex flex-col items-center justify-center text-gray-600 gap-2">
                    <Icon name="Settings" className="animate-spin" size={32} variant="BoldDuotone" />
                    <span className="text-[10px] font-mono text-center">
                      {!localIp ? "DETECTING NET..." : "GENERATING..."}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[var(--app-text-muted)] text-xs sm:text-sm mt-3 sm:mt-4 text-center px-4">
              Scan with your mobile device to establish secure connection
            </p>
            <p className="text-[10px] sm:text-xs text-[var(--app-text-muted)] font-mono mt-1 opacity-50">
              {localIp}
            </p>
          </div>

          {/* Device List */}
          {devices.length > 0 && (
            <div className="border-t border-white/5 pt-4 sm:pt-6">
              <DeviceList
                devices={devices}
                onDeviceAction={handleDeviceAction}
                themePrimary="text-[var(--app-primary)]"
                themeBorder="border-[rgba(var(--app-primary-rgb),0.3)]"
                themeBg="bg-[rgba(var(--app-primary-rgb),0.1)]"
              />
            </div>
          )}
        </div>

        {/* Footer Decoration */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--app-primary)]/20 to-transparent"
        />

        {/* Scanning Line Animation - when waiting */}
        {connectionState === ConnectionState.CONNECTING && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="w-full h-1 bg-[var(--app-primary)]/50 shadow-[0_0_10px_var(--app-primary)] absolute top-0 animate-[scan_2s_linear_infinite]"
            />
          </div>
        )}
      </div>

      {/* Error Toasts */}
      {errors.map((error, index) => (
        <ErrorToast
          key={`${error.code}-${error.timestamp.getTime()}-${index}`}
          error={error}
          onDismiss={() => handleErrorDismiss(error)}
          themePrimary="text-[var(--app-primary)]"
          themeBorder="border-[rgba(var(--app-primary-rgb),0.3)]"
          themeBg="bg-[rgba(var(--app-primary-rgb),0.1)]"
        />
      ))}

      {/* Keyframe animations */}
      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
};

export default LucaLinkModal;
