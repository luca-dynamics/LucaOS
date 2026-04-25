import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { LucaSettings } from "../../services/settingsService";
import { apiUrl, WS_PORT, cortexUrl } from "../../config/api";
import { useMobile } from "../../hooks/useMobile";
import { lucaLink, LucaLinkState } from "../../services/lucaLinkService";
import { qrScanner } from "../../services/qrScannerService";
import { setHexAlpha } from "../../config/themeColors";
import QRCode from "qrcode";

// Guest Access Section (Long Distance via Relay)
const GuestAccessSection: React.FC<{
  theme: {
    primary: string;
    hex: string;
    themeName?: string;
    isLight?: boolean;
  };
  connected: boolean;
}> = ({ theme, connected }) => {
  const [guestUrl, setGuestUrl] = useState<string | null>(null);
  const [guestQR, setGuestQR] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Security Modal State
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [securityMessage, setSecurityMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [checkingSecurity, setCheckingSecurity] = useState(false);

  // Check initial security state when modal opens
  useEffect(() => {
    if (showSecurityModal) {
      setCheckingSecurity(true);
      fetch(cortexUrl("/api/remote-access/info"))
        .then((r) => r.json())
        .then((data) => {
          setPinEnabled(data.pinRequired ?? false);
        })
        .catch(() => {})
        .finally(() => setCheckingSecurity(false));
    }
  }, [showSecurityModal]);

  const handleSetPin = async () => {
    if (!newPin || newPin.length < 4 || newPin.length > 6) {
      setSecurityMessage({ type: "error", text: "PIN must be 4-6 digits" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(cortexUrl("/api/remote-access/set-pin"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: newPin,
          currentPin: pinEnabled ? currentPin : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPinEnabled(true);
        setNewPin("");
        setCurrentPin("");
        return true;
      } else {
        setSecurityMessage({ type: "error", text: data.error });
        return false;
      }
    } catch {
      setSecurityMessage({ type: "error", text: "Failed to set PIN" });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleClearPin = async () => {
    if (!currentPin) {
      setSecurityMessage({ type: "error", text: "Enter current PIN to clear" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(cortexUrl("/api/remote-access/clear-pin"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin }),
      });
      const data = await res.json();
      if (data.success) {
        setPinEnabled(false);
        setCurrentPin("");
        return true;
      } else {
        setSecurityMessage({ type: "error", text: data.error });
        return false;
      }
    } catch {
      setSecurityMessage({ type: "error", text: "Failed to clear PIN" });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const generateGuestAccess = async () => {
    if (!connected) return;

    // Show security modal first
    setShowSecurityModal(true);
  };

  const finalizeGeneration = async () => {
    setLoading(true);
    try {
      const session = await lucaLink.generateGuestSession();
      if (session) {
        setGuestUrl(session.guestUrl);

        // Generate QR code
        const qr = await QRCode.toDataURL(session.guestUrl, {
          width: 180,
          margin: 2,
          color: {
            dark: "var(--app-text-main)",
            light: "#00000000",
          },
        });
        setGuestQR(qr);
        setShowSecurityModal(false); // Close modal
      }
    } catch (e) {
      console.error("[GuestAccess] Failed to generate:", e);
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = () => {
    if (guestUrl) {
      navigator.clipboard.writeText(guestUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`rounded-xl p-4 text-center space-y-3 mt-4 border transition-all bg-[var(--app-bg-tint)] border-[var(--app-border-main)] shadow-sm tech-border glass-blur`}
    >
      <div
        className="flex items-center justify-center gap-2 text-base font-black uppercase tracking-widest text-[var(--app-text-main)]"
      >
        <Icon name="Globus" variant="BoldDuotone" className="w-4 h-4" />
        Universal Access (Anywhere)
      </div>

      <p
        className={`text-xs text-[var(--app-text-muted)] opacity-70`}
      >
        Access your personal Luca assistant from any device in the world • Works
        over internet
      </p>

      {!guestUrl ? (
        <button
          onClick={generateGuestAccess}
          disabled={!connected || loading}
          className={`w-full py-3 rounded-lg text-sm font-black transition-all disabled:opacity-50 border bg-[var(--app-bg-tint)] border-[var(--app-border-main)] text-[var(--app-text-main)] hover:bg-white/5 opacity-80 hover:opacity-100`}
        >
          {loading ? "Generating..." : "Generate Access Link"}
        </button>
      ) : (
        <>
          {/* QR Code */}
          {guestQR && (
            <div className="flex justify-center">
              <div
                className={`p-3 rounded-lg bg-[var(--app-bg-tint)] border border-[var(--app-border-main)]`}
              >
                <img
                  src={guestQR}
                  alt="Guest Access QR"
                  className="w-36 h-36"
                />
              </div>
            </div>
          )}

          {/* URL Display */}
          <div className="space-y-1">
            <p className="text-xs text-[var(--app-text-muted)] font-bold">Or share this URL:</p>
            <div className="flex items-center justify-center gap-2">
              <code
                className="px-3 py-1 rounded text-sm font-mono max-w-[200px] truncate border bg-[var(--app-bg-tint)] border-[var(--app-border-main)] text-[var(--app-text-main)]"
              >
                {guestUrl}
              </code>
              <button
                onClick={copyUrl}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                title="Copy URL"
              >
                <Icon
                  name="Copy"
                  className="w-4 h-4"
                  style={{ color: copied ? "#4ade80" : "var(--app-text-main)" }}
                />
              </button>
            </div>
            {copied && <p className="text-xs text-green-400 font-bold">Copied!</p>}
          </div>

          <p className="text-xs italic text-[var(--app-text-muted)] opacity-60">
            Valid for 24 hours • Live voice chat included
          </p>
        </>
      )}

      {!connected && (
        <p className="text-xs text-yellow-500 font-bold italics opacity-80">
          Enable Luca Link first to generate guest access
        </p>
      )}

      {/* SECURITY MODAL */}
      {showSecurityModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div
            className={`border rounded-xl p-6 transition-all shadow-2xl bg-[var(--app-bg-tint)] border-[var(--app-border-main)] tech-border glass-blur max-w-sm w-full flex flex-col gap-4`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="p-2 rounded-full"
                style={{ backgroundColor: setHexAlpha(theme.hex, 0.12) }}
              >
                <Icon name="Shield" variant="BoldDuotone" className="w-5 h-5" style={{ color: theme.hex }} />
              </div>
              <div className="text-left">
                <h3
                  className={`font-black uppercase tracking-widest text-sm text-[var(--app-text-main)]`}
                >
                  Link Security
                </h3>
                <p
                  className={`text-xs text-[var(--app-text-muted)] opacity-70`}
                >
                  Protect this public link
                </p>
              </div>
            </div>

            {checkingSecurity ? (
              <div className="text-lg py-4 text-[var(--app-text-muted)] text-sm">
                Checking security status...
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status Card */}
                <div
                  className="p-3 rounded-lg flex items-center gap-3"
                  style={{
                    backgroundColor: pinEnabled
                      ? (theme.themeName?.toLowerCase() === "lucagent" ? "rgba(74, 222, 128, 0.05)" : "rgba(74, 222, 128, 0.1)")
                      : (theme.themeName?.toLowerCase() === "lucagent" ? "rgba(248, 113, 113, 0.05)" : "rgba(248, 113, 113, 0.1)"),
                    border: `1px solid ${
                      pinEnabled ? (theme.themeName?.toLowerCase() === "lucagent" ? "rgba(74, 222, 128, 0.2)" : "rgba(74, 222, 128, 0.25)") : (theme.themeName?.toLowerCase() === "lucagent" ? "rgba(248, 113, 113, 0.2)" : "rgba(248, 113, 113, 0.25)")
                    }`,
                  }}
                >
                  {pinEnabled ? (
                    <Icon name="Lock" variant="BoldDuotone" className="w-4 h-4 text-green-400" />
                  ) : (
                    <Icon name="LockOpen" variant="BoldDuotone" className="w-4 h-4 text-red-400" />
                  )}
                  <div className="text-left">
                    <div
                      className="text-sm font-bold"
                      style={{
                        color: pinEnabled ? "#4ade80" : "#f87171",
                      }}
                    >
                      {pinEnabled ? "PIN Protection Active" : "No Protection"}
                    </div>
                    <div className="text-base text-[var(--app-text-muted)]">
                      {pinEnabled
                        ? "Guests must enter PIN to access"
                        : "Anyone with the link can access"}
                    </div>
                  </div>
                </div>

                {/* PIN Interactions */}
                {pinEnabled ? (
                  <div className="space-y-2">
                    <p className="text-sm text-[var(--app-text-muted)] text-left">
                      To keep protection, just Continue. To remove it, verify
                      PIN.
                    </p>
                    <input
                      type="password"
                      placeholder="Current PIN to Remove (Optional)"
                      value={currentPin}
                      onChange={(e) =>
                        setCurrentPin(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      className={`w-full ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-[var(--app-bg-tint)] border-black/25 shadow-sm text-[var(--app-text-muted)]" : "bg-black/40 border-white/10 text-[var(--app-text-main)]"} rounded-lg p-2 outline-none font-mono text-sm border transition-all`}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-[var(--app-text-muted)] text-left">
                      Set a PIN (Recommended):
                    </p>
                    <input
                      type="password"
                      placeholder="Enter 4-6 digit PIN"
                      value={newPin}
                      onChange={(e) =>
                        setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      className={`w-full ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-[var(--app-bg-tint)] border-black/25 shadow-sm text-[var(--app-text-muted)]" : "bg-black/40 border-white/10 text-[var(--app-text-main)]"} rounded-lg p-2 outline-none font-mono text-base border transition-all`}
                    />
                  </div>
                )}

                {/* Error/Success Message */}
                {securityMessage && (
                  <div
                    className={`text-lg p-2 rounded ${
                      securityMessage.type === "error"
                        ? "bg-red-500/20 text-red-300"
                        : "bg-green-500/20 text-green-300"
                    }`}
                  >
                    {securityMessage.text}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowSecurityModal(false)}
                    className="flex-1 py-2 rounded-lg text-sm font-bold text-[var(--app-text-muted)] hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (pinEnabled) {
                        // If pin is enabled and they entered a current pin, it means they want to Disable it
                        if (currentPin) {
                          const result = await handleClearPin();
                          if (result) finalizeGeneration(); // Generate (Unprotected)
                        } else {
                          // If they left it empty, they want to KEEP it
                          finalizeGeneration(); // Generate (Protected)
                        }
                      } else {
                        // If pin is disable
                        if (newPin) {
                          // They want to set one
                          const result = await handleSetPin();
                          if (result) finalizeGeneration(); // Generate (Protected)
                        } else {
                          // They skipped setting one
                          finalizeGeneration(); // Generate (Unprotected)
                        }
                      }
                    }}
                    disabled={loading}
                    className="flex-[2] py-2 rounded-lg text-sm font-black text-[var(--app-text-main)] transition-all shadow-lg shadow-purple-500/20 uppercase tracking-widest"
                    style={{
                      background: `linear-gradient(135deg, ${theme.hex}, ${theme.hex}aa)`,
                    }}
                  >
                    {loading
                      ? "Processing..."
                      : pinEnabled
                        ? currentPin
                          ? "Remove & Generate"
                          : "Keep & Generate"
                        : newPin
                          ? "Set & Generate"
                          : "Generate unprotected"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface SettingsLucaLinkTabProps {
  settings: LucaSettings;
  onUpdate: (section: keyof LucaSettings, key: string, value: any) => void;
  theme: {
    hex: string;
    primary: string;
    border: string;
    bg: string;
    themeName?: string;
    isLight?: boolean;
  };
  connectionMode?: "local" | "vpn" | "relay" | "disconnected";
  isMobile?: boolean;
}

const SettingsLucaLinkTab: React.FC<SettingsLucaLinkTabProps> = ({
  settings,
  onUpdate,
  theme,
  connectionMode = "disconnected",
  isMobile: isMobileProp,
}) => {
  const isMobile = isMobileProp ?? useMobile();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [linkState, setLinkState] = useState<LucaLinkState>(
    lucaLink.getState(),
  );
  const [copied, setCopied] = useState(false);

  // Subscribe to Luca Link state changes
  useEffect(() => {
    const unsubscribe = lucaLink.onStateChange(setLinkState);
    return () => unsubscribe();
  }, []);

  // Auto-start room if enabled but missing token (e.g. on page refresh)
  useEffect(() => {
    if (
      settings.lucaLink.enabled &&
      !isMobile &&
      !linkState.pairingToken &&
      !linkState.connected
    ) {
      console.log("[Settings] Remote enabled but no token - Creating room...");
      lucaLink
        .createRoom()
        .catch((e) => console.error("[Settings] Auto-create room failed:", e));
    }
  }, [settings.lucaLink.enabled, linkState.pairingToken, linkState.connected]);

  // Generate QR code when room is created
  useEffect(() => {
    const generateQR = async () => {
      const pairingUrl = await lucaLink.getPairingUrl();
      if (pairingUrl) {
        try {
          const qr = await QRCode.toDataURL(pairingUrl, {
            width: 200,
            margin: 2,
            color: {
              dark: theme.themeName?.toLowerCase() === "lucagent" ? "#000000" : "#ffffff",
              light: "#00000000",
            },
          });
          setQrCodeUrl(qr);
        } catch (e) {
          console.error("[LucaLink] QR generation failed:", e);
        }
      } else {
        setQrCodeUrl(null);
      }
    };
    generateQR();
  }, [linkState.pairingToken]);

  // Copy pairing token to clipboard
  const copyRoomId = () => {
    if (linkState.pairingToken) {
      navigator.clipboard.writeText(linkState.pairingToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const getConnectionIcon = () => {
    switch (connectionMode) {
      case "local":
        return <Icon name="Wifi" className="w-4 h-4 text-green-400" />;
      case "vpn":
        return <Icon name="Shield" className="w-4 h-4" style={{ color: theme.hex }} />;
      case "relay":
        return <Icon name="Globus" className="w-4 h-4" style={{ color: theme.hex }} />;
      default:
        return <Icon name="WifiLow" className="w-4 h-4 text-[var(--app-text-muted)]" />;
    }
  };

  const getConnectionStatus = () => {
    switch (connectionMode) {
      case "local":
        return { text: "Connected (Local Network)", color: "text-green-400" };
      case "vpn":
        return {
          text: "Connected (VPN)",
          color: "",
          style: { color: theme.hex },
        };
      case "relay":
        return {
          text: "Connected (Cloud Relay)",
          color: "",
          style: { color: theme.hex },
        };
      default:
        return { text: "Disconnected", color: "text-[var(--app-text-muted)]" };
    }
  };

  const status = getConnectionStatus();

  return (
    <div className={`space-y-6 ${isMobile ? "px-0" : ""}`}>
      {/* Connection Status */}
      <div
        className={`p-6 border transition-all ${isMobile ? "border-x-0 border-y rounded-none bg-white/5" : "rounded-2xl bg-[var(--app-bg-tint)] border-[var(--app-border-main)] shadow-sm"} tech-border glass-blur`}
      >
        <div className="flex items-center justify-between mb-3">
          <label
            className={`text-base font-black uppercase tracking-widest text-[var(--app-text-main)]`}
          >
            {isMobile ? "Desktop Connection" : "Connection Status"}
          </label>
          {getConnectionIcon()}
        </div>
        <div
          className={`text-sm font-black uppercase tracking-wider ${status.color}`}
          style={(status as any).style}
        >
          {status.text}
        </div>
      </div>

      {/* ===== MOBILE CLIENT UI ===== */}
      {isMobile && (
        <>
          {/* Connection Mode */}
          <div className={`space-y-2 ${isMobile ? "px-4" : ""}`}>
            <label className="text-base font-black text-[var(--app-text-muted)] uppercase tracking-widest">
              Connection Method
            </label>
            <select
              value={settings.lucaLink.connectionMode}
              onChange={(e) =>
                onUpdate("lucaLink", "connectionMode", e.target.value)
              }
              className={`w-full bg-[var(--app-bg-tint)] border-[var(--app-border-main)] text-[var(--app-text-main)] border rounded-lg p-3 text-sm font-bold outline-none transition-all tech-border glass-blur shadow-sm`}
            >
              <option value="auto">Auto (Try All Methods)</option>
              <option value="local">Local Network (Same WiFi)</option>
              <option value="vpn">VPN (Tailscale/ZeroTier)</option>
              <option value="relay">Cloud Relay</option>
            </select>
            <p className="text-xs text-[var(--app-text-muted)] opacity-70 italic leading-tight">
              {settings.lucaLink.connectionMode === "auto" &&
                "Automatically tries local → VPN → cloud relay"}
              {settings.lucaLink.connectionMode === "local" &&
                "Connect when on the same WiFi as your Desktop"}
              {settings.lucaLink.connectionMode === "vpn" &&
                "Use Tailscale or ZeroTier for secure remote access"}
              {settings.lucaLink.connectionMode === "relay" &&
                "Connect via cloud relay (works everywhere)"}
            </p>
          </div>

          {/* Direct IP/VPN Address */}
          {(settings.lucaLink.connectionMode === "auto" ||
            settings.lucaLink.connectionMode === "local" ||
            settings.lucaLink.connectionMode === "vpn") && (
            <div className={`space-y-2 ${isMobile ? "px-4" : ""}`}>
              <label className="text-base font-black text-[var(--app-text-muted)] uppercase tracking-widest flex items-center gap-2">
                <Icon name="Smartphone" className="w-4 h-4" />
                Desktop Address
              </label>
              <input
                type="text"
                value={settings.lucaLink.vpnServerUrl || ""}
                onChange={(e) =>
                  onUpdate("lucaLink", "vpnServerUrl", e.target.value)
                }
                placeholder={
                  settings.lucaLink.connectionMode === "vpn"
                    ? "e.g., 100.x.x.x:8765 (Tailscale IP)"
                    : "e.g., 192.168.1.100:8765"
                }
                className={`w-full bg-[var(--app-bg-tint)] border-[var(--app-border-main)] text-[var(--app-text-main)] rounded-lg p-3 text-sm font-mono outline-none transition-all border tech-border glass-blur shadow-sm`}
              />
            </div>
          )}

          {/* Cloud Relay Server */}
          {(settings.lucaLink.connectionMode === "auto" ||
            settings.lucaLink.connectionMode === "relay") && (
            <div className={`space-y-2 ${isMobile ? "px-4" : ""}`}>
              <label className="text-base font-black text-[var(--app-text-muted)] uppercase tracking-widest flex items-center gap-2">
                <Icon name="Globus" variant="BoldDuotone" className="w-4 h-4" />
                Cloud Relay Server
              </label>
              <input
                type="text"
                value={settings.lucaLink.relayServerUrl || ""}
                onChange={(e) =>
                  onUpdate("lucaLink", "relayServerUrl", e.target.value)
                }
                placeholder="https://lucaos.onrender.com"
                className={`w-full bg-[var(--app-bg-tint)] border-[var(--app-border-main)] text-[var(--app-text-main)] rounded-lg p-3 outline-none font-mono text-sm transition-all border tech-border glass-blur shadow-sm`}
              />
              <p className="text-xs text-[var(--app-text-muted)] opacity-70 italic leading-tight">
                Default relay provided. You can self-host your own.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className={`flex flex-col gap-3 ${isMobile ? "px-4" : ""}`}>
            {/* QR Code Scanner */}
            <button
              onClick={async () => {
                const success = await qrScanner.scanAndConnect();
                if (success) {
                  console.log("[LucaLink] Connected via QR scan");
                }
              }}
              className={`w-full py-3 rounded-lg text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border bg-[var(--app-bg-tint)] border-[var(--app-border-main)] text-[var(--app-text-main)] hover:bg-white/5 tech-border glass-blur shadow-sm`}
            >
              <Icon name="QrCode" className="w-5 h-5" /> Scan QR Code from Desktop
            </button>

            {/* Connect Button */}
            <button
              onClick={async () => {
                const token = settings.lucaLink.vpnServerUrl?.trim();
                if (!token) {
                  alert("Please enter a Pairing Token or scan the QR code");
                  return;
                }
                try {
                  await lucaLink.joinWithToken(token);
                } catch (e) {
                  console.error("[LucaLink] Failed to connect:", e);
                  alert(
                    "Failed to connect to Desktop. Check the Pairing Token and try again.",
                  );
                }
              }}
              disabled={linkState.connected}
              className={`w-full py-3 rounded-lg text-sm font-black uppercase tracking-widest transition-all disabled:opacity-50 border ${
                linkState.connected 
                  ? "bg-green-500/10 border-green-500/30 text-green-400" 
                  : "bg-[var(--app-bg-tint)] border-[var(--app-border-main)] text-[var(--app-text-main)] hover:bg-white/5 shadow-sm"
              } tech-border glass-blur`}
            >
              {linkState.connected ? (
                <span className="flex items-center gap-2 justify-center">
                  <Icon name="CheckCircle" className="w-5 h-5" /> Connected to Desktop
                </span>
              ) : (
                "Connect to Desktop"
              )}
            </button>

            {/* Disconnect button if connected */}
            {linkState.connected && (
              <button
                onClick={() => lucaLink.disconnect()}
                className="w-full py-2 rounded-lg text-lg font-medium transition-all bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 shadow-sm"
              >
                Disconnect
              </button>
            )}
          </div>

          {/* Privacy Note */}
          <div
            className={`p-4 border transition-all ${isMobile ? "border-x-0 border-y rounded-none bg-white/5" : "rounded-xl bg-[var(--app-bg-tint)] border-[var(--app-border-main)]"} text-[var(--app-text-main)] tech-border glass-blur opacity-90 shadow-sm`}
          >
            <div className="flex items-start gap-3">
              <Icon name="Shield" variant="BoldDuotone" className="w-5 h-5 mt-0.5 flex-shrink-0 text-[var(--app-text-main)]" />
              <div>
                <div className="font-bold mb-1 uppercase tracking-wider text-sm opacity-60">Security Protocol</div>
                <div className="font-bold mb-1 font-bold">End-to-End Encrypted</div>
                <p className="text-[var(--app-text-muted)] text-sm opacity-80">
                  Your connection to Desktop is encrypted. Messages are never
                  stored on any server.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== DESKTOP SERVER UI ===== */}
      {!isMobile && (
        <>
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-base font-bold text-[var(--app-text-muted)]">
                Enable Remote Access
              </label>
              <p className="text-sm text-[var(--app-text-muted)] opacity-60 mt-1">
                Allow devices to connect from anywhere
              </p>
            </div>
            <button
              onClick={async () => {
                const newValue = !settings.lucaLink.enabled;
                onUpdate("lucaLink", "enabled", newValue);

                try {
                  if (newValue) {
                    await fetch(apiUrl("/api/luca-link/start"), {
                      method: "POST",
                    });
                    await lucaLink.createRoom(); 
                  } else {
                    await fetch(apiUrl("/api/luca-link/stop"), {
                      method: "POST",
                    });
                    lucaLink.disconnect();
                  }
                  console.log(`[LucaLink] Server ${newValue ? "started" : "stopped"}`);
                } catch (e) {
                  console.error("[LucaLink] Failed to toggle server:", e);
                }
              }}
              className={`w-7 h-3.5 rounded-full transition-all relative ${settings.lucaLink.enabled ? "" : "bg-[var(--app-border-main)] opacity-40 hover:opacity-100"}`}
              style={{
                backgroundColor: settings.lucaLink.enabled ? theme.hex : undefined,
              }}
            >
              <div
                className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-[var(--app-bg-tint)] transition-all ${settings.lucaLink.enabled ? "translate-x-4" : "translate-x-0.5"}`}
                style={{ 
                  backgroundColor: settings.lucaLink.enabled ? "white" : "var(--app-text-muted)" 
                }}
              />
            </button>
          </div>

          {/* QR Code Pairing Section - Show when enabled */}
          {settings.lucaLink.enabled && (
            <div
              className={`rounded-xl p-4 text-center space-y-3 bg-[var(--app-bg-tint)] border border-[var(--app-border-main)] tech-border glass-blur shadow-sm`}
            >
              <div
                className={`text-lg font-bold uppercase tracking-widest text-[var(--app-text-main)]`}
              >
                Device Pairing (App-to-App)
              </div>

              <p className={`text-lg text-[var(--app-text-muted)] mb-2 opacity-80`}>
                Link multiple Luca apps (Desktop ↔ Mobile ↔ Tablet) into a
                unified ecosystem.
              </p>

              {/* QR Code */}
              {qrCodeUrl ? (
                <div className="flex justify-center">
                  <div
                    className={`p-3 rounded-lg bg-[var(--app-bg-tint)] border border-[var(--app-border-main)]`}
                  >
                    <img
                      src={qrCodeUrl}
                      alt="Pairing QR Code"
                      className="w-40 h-40"
                    />
                  </div>
                </div>
              ) : (
                <div className="py-6 text-[var(--app-text-muted)] text-base opacity-60">
                  Starting Luca Link...
                </div>
              )}

              {/* Pairing Token */}
              {linkState.pairingToken && (
                <div className="space-y-1">
                  <p className={`text-lg text-[var(--app-text-muted)]`}>
                    Or enter this Pairing Token:
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <code
                      className="px-3 py-1 rounded text-base font-mono bg-[var(--app-bg-tint)] border border-[var(--app-border-main)] text-[var(--app-text-main)]"
                    >
                      {linkState.pairingToken}
                    </code>
                    <button
                      onClick={copyRoomId}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                      title="Copy Token"
                    >
                      <Icon
                        name="Copy"
                        className="w-4 h-4"
                        style={{ color: copied ? "#4ade80" : "var(--app-text-main)" }}
                      />
                    </button>
                  </div>
                  {copied && <p className="text-sm text-green-400">Copied!</p>}
                </div>
              )}
            </div>
          )}

          {/* ========== GUEST ACCESS SECTION (Long Distance) ========== */}
          <GuestAccessSection theme={theme} connected={linkState.connected} />

          {/* Relay Server Configuration */}
          {settings.lucaLink.enabled && (
            <div className="space-y-2 mt-4">
              <label className="text-base font-bold text-[var(--app-text-muted)]">
                Custom Relay Server
              </label>
              <input
                type="text"
                value={settings.lucaLink.relayServerUrl || ""}
                onChange={(e) =>
                  onUpdate("lucaLink", "relayServerUrl", e.target.value)
                }
                disabled={!settings.lucaLink.enabled}
                placeholder="https://lucaos.onrender.com"
                className={`w-full bg-[var(--app-bg-tint)] border border-[var(--app-border-main)] text-[var(--app-text-main)] rounded-lg p-3 outline-none font-mono text-sm disabled:opacity-50 transition-all tech-border glass-blur`}
              />
              <p className="text-sm text-[var(--app-text-muted)] opacity-60">
                Default relay server provided. You can self-host your own.
              </p>
            </div>
          )}

          {/* VPN Server URL */}
          {(settings.lucaLink.connectionMode === "auto" ||
            settings.lucaLink.connectionMode === "vpn") && (
            <div className="space-y-2">
              <label className="text-base font-bold text-[var(--app-text-muted)]">
                VPN Server URL (Optional)
              </label>
              <input
                type="text"
                value={settings.lucaLink.vpnServerUrl}
                onChange={(e) =>
                  onUpdate("lucaLink", "vpnServerUrl", e.target.value)
                }
                disabled={!settings.lucaLink.enabled}
                placeholder={`http://100.x.x.x:${WS_PORT} (Tailscale IP)`}
                className={`w-full bg-[var(--app-bg-tint)] border border-[var(--app-border-main)] text-[var(--app-text-main)] rounded-lg p-3 outline-none font-mono text-sm disabled:opacity-50 transition-all tech-border glass-blur`}
              />
              <p className="text-sm text-[var(--app-text-muted)] opacity-60">
                Leave empty for auto-detection. Use Tailscale IP (100.x.x.x) if
                configured.
              </p>
            </div>
          )}

          {/* Info Box */}
          <div
            className={`p-4 rounded-xl border transition-all bg-[var(--app-bg-tint)] border-[var(--app-border-main)] text-[var(--app-text-main)] tech-border glass-blur opacity-90 shadow-sm mt-6`}
          >
            <div className="flex items-start gap-3">
              <Icon
                name="Shield"
                variant="BoldDuotone"
                className="w-5 h-5 mt-0.5 flex-shrink-0 text-[var(--app-text-main)]"
              />
              <div>
                <div className="font-bold mb-1 uppercase tracking-wider text-sm opacity-60">Privacy & Security</div>
                <div className="font-bold mb-1">Protection Protocol</div>
                <ul className="space-y-1 opacity-80 text-sm list-disc pl-4 text-[var(--app-text-muted)]">
                  <li>Local & VPN: 100% private, no cloud servers</li>
                  <li>Relay: End-to-end encrypted, messages are unreadable by relay</li>
                  <li>Auto mode prioritizes local for maximum privacy</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SettingsLucaLinkTab;
