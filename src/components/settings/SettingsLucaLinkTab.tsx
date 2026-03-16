import React, { useState, useEffect } from "react";
import {
  Wifi,
  WifiOff,
  Globe,
  Shield,
  Check,
  Smartphone,
  Copy,
  Lock,
  Unlock,
  Camera,
} from "lucide-react";
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
    themeName: string;
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
            dark: theme.themeName?.toLowerCase() === "lucagent" ? "#000000" : "#ffffff",
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
      className="rounded-xl p-4 text-center space-y-3 mt-4"
      style={{
        backgroundColor:
          theme.themeName?.toLowerCase() === "lucagent"
            ? "rgba(102,126,234,0.08)"
            : setHexAlpha(theme.hex, 0.05),
        border: `1px solid ${theme.themeName?.toLowerCase() === "lucagent" ? "rgba(0,0,0,0.15)" : setHexAlpha(theme.hex, 0.25)}`,
      }}
    >
      <div
        className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest"
        style={{
          color: theme.themeName?.toLowerCase() === "lucagent" ? "#1d4ed8" : theme.hex,
        }}
      >
        <Globe className="w-4 h-4" />
        Universal Access (Anywhere)
      </div>

      <p
        className={`text-xs ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-600" : "text-gray-500"}`}
      >
        Access your personal Luca assistant from any device in the world • Works
        over internet
      </p>

      {!guestUrl ? (
        <button
          onClick={generateGuestAccess}
          disabled={!connected || loading}
          className={`w-full py-3 rounded-lg text-sm font-bold transition-all disabled:opacity-50 ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.03] hover:bg-black/[0.06]" : ""}`}
          style={{
            backgroundColor:
              theme.themeName?.toLowerCase() === "lucagent" ? undefined : setHexAlpha(theme.hex, 0.1),
            border: `1px solid ${theme.themeName?.toLowerCase() === "lucagent" ? "rgba(0,0,0,0.2)" : theme.hex}`,
            color: theme.themeName?.toLowerCase() === "lucagent" ? "#111827" : theme.hex,
          }}
        >
          {loading ? "Generating..." : "Generate Access Link"}
        </button>
      ) : (
        <>
          {/* QR Code */}
          {guestQR && (
            <div className="flex justify-center">
              <div
                className={`p-3 rounded-lg ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-white border border-black/10" : "bg-white/5"}`}
                style={{
                  backgroundColor: theme.themeName?.toLowerCase() === "lucagent" ? undefined : setHexAlpha(theme.hex, 0.05),
                  borderColor: theme.themeName?.toLowerCase() === "lucagent" ? undefined : setHexAlpha(theme.hex, 0.1),
                }}
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
            <p className="text-xs text-gray-500">Or share this URL:</p>
            <div className="flex items-center justify-center gap-2">
              <code
                className="px-3 py-1 rounded text-xs font-mono max-w-[200px] truncate"
                style={{
                  backgroundColor:
                    theme.themeName?.toLowerCase() === "lucagent"
                      ? "rgba(0,0,0,0.05)"
                      : setHexAlpha(theme.hex, 0.1),
                  color: theme.themeName?.toLowerCase() === "lucagent" ? "#1e293b" : theme.hex,
                }}
              >
                {guestUrl}
              </code>
              <button
                onClick={copyUrl}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                title="Copy URL"
              >
                <Copy
                  className="w-4 h-4"
                  style={{ color: copied ? "#4ade80" : theme.hex }}
                />
              </button>
            </div>
            {copied && <p className="text-xs text-green-400">Copied!</p>}
          </div>

          <p className="text-xs text-gray-600">
            Valid for 24 hours • Live voice chat included
          </p>
        </>
      )}

      {!connected && (
        <p className="text-xs text-yellow-500">
          Enable Luca Link first to generate guest access
        </p>
      )}

      {/* SECURITY MODAL */}
      {showSecurityModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div
            className={`${theme.themeName?.toLowerCase() === "lucagent" ? "bg-white" : "bg-[#1a1a2e]"} border ${theme.themeName?.toLowerCase() === "lucagent" ? "border-black/10" : ""}`}
            style={{
              borderColor: theme.themeName?.toLowerCase() === "lucagent" ? undefined : setHexAlpha(theme.hex, 0.1),
              borderRadius: "0.75rem",
              padding: "1.5rem",
              maxWidth: "24rem",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              boxShadow:
                theme.themeName?.toLowerCase() === "lucagent"
                  ? "0 10px 40px rgba(0,0,0,0.1)"
                  : "0 0 50px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="p-2 rounded-full"
                style={{ backgroundColor: setHexAlpha(theme.hex, 0.12) }}
              >
                <Shield className="w-5 h-5" style={{ color: theme.hex }} />
              </div>
              <div className="text-left">
                <h3
                  className={`font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-white"}`}
                >
                  Link Security
                </h3>
                <p
                  className={`text-xs ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-600" : "text-gray-400"}`}
                >
                  Protect this public link
                </p>
              </div>
            </div>

            {checkingSecurity ? (
              <div className="text-center py-4 text-gray-500 text-xs">
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
                    <Lock className="w-4 h-4 text-green-400" />
                  ) : (
                    <Unlock className="w-4 h-4 text-red-400" />
                  )}
                  <div className="text-left">
                    <div
                      className="text-xs font-bold"
                      style={{
                        color: pinEnabled ? "#4ade80" : "#f87171",
                      }}
                    >
                      {pinEnabled ? "PIN Protection Active" : "No Protection"}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {pinEnabled
                        ? "Guests must enter PIN to access"
                        : "Anyone with the link can access"}
                    </div>
                  </div>
                </div>

                {/* PIN Interactions */}
                {pinEnabled ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 text-left">
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
                      className={`w-full ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.03] border-black/10 text-slate-900" : "bg-black/40 border-white/10 text-white"} rounded-lg p-2 outline-none font-mono text-sm`}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 text-left">
                      Set a PIN (Recommended):
                    </p>
                    <input
                      type="password"
                      placeholder="Enter 4-6 digit PIN"
                      value={newPin}
                      onChange={(e) =>
                        setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      className={`w-full ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.03] border-black/10 text-slate-900" : "bg-black/40 border-white/10 text-white"} rounded-lg p-2 outline-none font-mono text-sm`}
                    />
                  </div>
                )}

                {/* Error/Success Message */}
                {securityMessage && (
                  <div
                    className={`text-xs p-2 rounded ${
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
                    className="flex-1 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5"
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
                    className="flex-[2] py-2 rounded-lg text-sm font-bold text-white transition-all shadow-lg shadow-purple-500/20"
                    style={{
                      background: `linear-gradient(135deg, ${theme.hex}, ${theme.hex}aa)`,
                    }}
                  >
                    {loading
                      ? "Processing..."
                      : pinEnabled
                        ? currentPin
                          ? "Remove PIN & Generate"
                          : "Keep PIN & Generate"
                        : newPin
                          ? "Set PIN & Generate"
                          : "Generate without PIN"}
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
}

const SettingsLucaLinkTab: React.FC<SettingsLucaLinkTabProps> = ({
  settings,
  onUpdate,
  theme,
  connectionMode = "disconnected",
}) => {
  const isMobile = useMobile();
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
        return <Wifi className="w-4 h-4 text-green-400" />;
      case "vpn":
        return <Shield className="w-4 h-4" style={{ color: theme.hex }} />;
      case "relay":
        return <Globe className="w-4 h-4" style={{ color: theme.hex }} />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-500" />;
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
        return { text: "Disconnected", color: "text-gray-500" };
    }
  };

  const status = getConnectionStatus();

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: theme.themeName?.toLowerCase() === "lucagent" ? "rgba(0,0,0,0.03)" : setHexAlpha(theme.hex, 0.05),
          border: `1px solid ${theme.themeName?.toLowerCase() === "lucagent" ? "rgba(0,0,0,0.1)" : setHexAlpha(theme.hex, 0.2)}`,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <label
            className={`text-xs font-bold uppercase tracking-widest ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : ""}`}
            style={{
              color: theme.themeName?.toLowerCase() === "lucagent" ? undefined : theme.hex,
            }}
          >
            {isMobile ? "Desktop Connection" : "Connection Status"}
          </label>
          {getConnectionIcon()}
        </div>
        <div
          className={`text-sm font-medium ${status.color}`}
          style={(status as any).style}
        >
          {status.text}
        </div>
      </div>

      {/* ===== MOBILE CLIENT UI ===== */}
      {isMobile && (
        <>
          {/* Connection Mode */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-400">
              Connection Method
            </label>
            <select
              value={settings.lucaLink.connectionMode}
              onChange={(e) =>
                onUpdate("lucaLink", "connectionMode", e.target.value)
              }
              className={`w-full ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.03] border-black/10 text-slate-900" : "bg-black/40 border-white/10 text-white"} rounded-lg p-3 text-sm outline-none transition-all`}
              onFocus={(e) => (e.target.style.borderColor = theme.hex)}
              onBlur={(e) =>
                (e.target.style.borderColor =
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(0,0,0,0.1)"
                    : "rgba(255,255,255,0.1)")
              }
            >
              <option value="auto">Auto (Try All Methods)</option>
              <option value="local">Local Network (Same WiFi)</option>
              <option value="vpn">VPN (Tailscale/ZeroTier)</option>
              <option value="relay">Cloud Relay</option>
            </select>
            <p className="text-xs text-gray-500">
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
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400 flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
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
                className={`w-full ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.03] border-black/10 text-slate-900" : "bg-black/20 border-white/10 text-white"} rounded-lg p-3 outline-none font-mono text-sm transition-all`}
                onFocus={(e) => (e.target.style.borderColor = theme.hex)}
                onBlur={(e) =>
                  (e.target.style.borderColor =
                    theme.themeName?.toLowerCase() === "lucagent"
                      ? "rgba(0,0,0,0.1)"
                      : "rgba(255,255,255,0.1)")
                }
              />
            </div>
          )}

          {/* Cloud Relay Server */}
          {(settings.lucaLink.connectionMode === "auto" ||
            settings.lucaLink.connectionMode === "relay") && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Cloud Relay Server
              </label>
              <input
                type="text"
                value={settings.lucaLink.relayServerUrl || ""}
                onChange={(e) =>
                  onUpdate("lucaLink", "relayServerUrl", e.target.value)
                }
                placeholder="https://lucaos.onrender.com"
                className={`w-full ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.03] border-black/10 text-slate-900" : "bg-black/20 border-white/10 text-white"} rounded-lg p-3 outline-none font-mono text-sm transition-all`}
                onFocus={(e) => (e.target.style.borderColor = theme.hex)}
                onBlur={(e) =>
                  (e.target.style.borderColor =
                    theme.themeName?.toLowerCase() === "lucagent"
                      ? "rgba(0,0,0,0.1)"
                      : "rgba(255,255,255,0.1)")
                }
              />
              <p className="text-xs text-gray-500">
                Default relay provided. You can self-host your own.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {/* QR Code Scanner */}
            <button
              onClick={async () => {
                const success = await qrScanner.scanAndConnect();
                if (success) {
                  // Connection established via QR scan
                  console.log("[LucaLink] Connected via QR scan");
                }
              }}
              className={`w-full py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.03] border-black/10 text-slate-900 hover:bg-black/[0.08]" : "bg-white/5 border-white/10 text-white hover:bg-white/10"}`}
              style={{
                border: "1px solid",
              }}
            >
              <Camera size={14} /> Scan QR Code from Desktop
            </button>

            {/* Connect Button */}
            <button
              onClick={async () => {
                // Get pairing token from settings input
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
              className="w-full py-3 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
              style={{
                backgroundColor: linkState.connected
                  ? (theme.themeName?.toLowerCase() === "lucagent" ? "rgba(74,222,128,0.1)" : "rgba(74,222,128,0.2)")
                  : setHexAlpha(theme.hex, 0.1),
                border: `1px solid ${
                  linkState.connected ? (theme.themeName?.toLowerCase() === "lucagent" ? "rgba(74,222,128,0.3)" : "#4ade80") : theme.hex
                }`,
                color: linkState.connected ? (theme.themeName?.toLowerCase() === "lucagent" ? "#15803d" : "#4ade80") : theme.hex,
              }}
            >
              {linkState.connected ? (
                <span className="flex items-center gap-2">
                  <Check size={14} /> Connected to Desktop
                </span>
              ) : (
                "Connect to Desktop"
              )}
            </button>

            {/* Disconnect button if connected */}
            {linkState.connected && (
              <button
                onClick={() => lucaLink.disconnect()}
                className="w-full py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: "rgba(248,113,113,0.1)",
                  border: "1px solid rgba(248,113,113,0.3)",
                  color: "#f87171",
                }}
              >
                Disconnect
              </button>
            )}
          </div>

          {/* Privacy Note */}
          <div
            className={`p-3 rounded-lg text-xs backdrop-blur-sm ${theme.themeName?.toLowerCase() === "lucagent" ? "" : "opacity-80"}`}
            style={{
              backgroundColor:
                theme.themeName?.toLowerCase() === "lucagent"
                  ? "rgba(102,126,234,0.08)"
                  : setHexAlpha(theme.hex, 0.08),
              border: `1px solid ${theme.themeName?.toLowerCase() === "lucagent" ? "rgba(102,126,234,0.3)" : setHexAlpha(theme.hex, 0.25)}`,
              color: theme.themeName?.toLowerCase() === "lucagent" ? "#1e40af" : theme.hex,
            }}
          >
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-bold mb-1">End-to-End Encrypted</div>
                <p
                  className={`${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-600" : "opacity-80"}`}
                >
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
              <label className="text-sm font-bold text-gray-400">
                Enable Remote Access
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Allow devices to connect from anywhere
              </p>
            </div>
            <button
              onClick={async () => {
                const newValue = !settings.lucaLink.enabled;
                onUpdate("lucaLink", "enabled", newValue);

                // Call API to start or stop the socket server
                try {
                  if (newValue) {
                    await fetch(apiUrl("/api/luca-link/start"), {
                      method: "POST",
                    });
                    await lucaLink.createRoom(); // <--- FIX: Initialize room and token
                  } else {
                    await fetch(apiUrl("/api/luca-link/stop"), {
                      method: "POST",
                    });
                    lucaLink.disconnect();
                  }

                  console.log(
                    `[LucaLink] Server ${newValue ? "started" : "stopped"}`,
                  );
                } catch (e) {
                  console.error("[LucaLink] Failed to toggle server:", e);
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
              style={{
                backgroundColor: settings.lucaLink.enabled
                  ? theme.hex
                  : "rgba(75,85,99,1)",
              }}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.lucaLink.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* QR Code Pairing Section - Show when enabled */}
          {settings.lucaLink.enabled && (
            <div
              className={`rounded-xl p-4 text-center space-y-3 ${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light" : ""}`}
              style={{
                backgroundColor:
                  theme.themeName?.toLowerCase() === "lucagent" ? undefined : `${theme.hex}0d`,
                border:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? undefined
                    : `1px solid ${theme.hex}33`,
              }}
            >
              <div
                className={`text-xs font-bold uppercase tracking-widest ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : ""}`}
                style={{
                  color: theme.themeName?.toLowerCase() === "lucagent" ? undefined : theme.hex,
                }}
              >
                Device Pairing (App-to-App)
              </div>

              <p
                className={`text-xs ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-600" : "text-gray-500"} mb-2`}
              >
                Link multiple Luca apps (Desktop ↔ Mobile ↔ Tablet) into a
                unified ecosystem.
              </p>

              {/* QR Code */}
              {qrCodeUrl ? (
                <div className="flex justify-center">
                  <div
                    className={`p-3 rounded-lg ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-white border border-black/10" : "bg-white/5"}`}
                  >
                    <img
                      src={qrCodeUrl}
                      alt="Pairing QR Code"
                      className="w-40 h-40"
                    />
                  </div>
                </div>
              ) : (
                <div className="py-6 text-gray-500 text-sm">
                  Starting Luca Link...
                </div>
              )}

              {/* Pairing Token */}
              {linkState.pairingToken && (
                <div className="space-y-1">
                  <p
                    className={`text-xs ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-600" : "text-gray-500"}`}
                  >
                    Or enter this Pairing Token:
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <code
                      className="px-3 py-1 rounded text-sm font-mono"
                      style={{
                        backgroundColor:
                          theme.themeName?.toLowerCase() === "lucagent"
                            ? "rgba(0,0,0,0.05)"
                            : "rgba(255,255,255,0.1)",
                        color:
                          theme.themeName?.toLowerCase() === "lucagent"
                            ? "#1e293b"
                            : theme.hex,
                      }}
                    >
                      {linkState.pairingToken}
                    </code>
                    <button
                      onClick={copyRoomId}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                      title="Copy Token"
                    >
                      <Copy
                        className="w-4 h-4"
                        style={{ color: copied ? "#4ade80" : theme.hex }}
                      />
                    </button>
                  </div>
                  {copied && <p className="text-xs text-green-400">Copied!</p>}
                </div>
              )}
            </div>
          )}

          {/* ========== GUEST ACCESS SECTION (Long Distance) ========== */}
          <GuestAccessSection theme={theme} connected={linkState.connected} />

          {/* Relay Server Configuration */}
          {settings.lucaLink.enabled && (
            <div className="space-y-2 mt-4">
              <label className="text-sm font-bold text-gray-400">
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
                className={`w-full ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.03] border-black/10 text-slate-900" : "bg-black/20 border-white/10 text-white"} rounded-lg p-2 outline-none font-mono text-xs disabled:opacity-50 transition-all`}
                onFocus={(e) => (e.target.style.borderColor = theme.hex)}
                onBlur={(e) =>
                  (e.target.style.borderColor =
                    theme.themeName?.toLowerCase() === "lucagent"
                      ? "rgba(0,0,0,0.1)"
                      : "rgba(255,255,255,0.1)")
                }
              />
              <p className="text-xs text-gray-500">
                Default relay server provided. You can self-host your own.
              </p>
            </div>
          )}

          {/* VPN Server URL */}
          {(settings.lucaLink.connectionMode === "auto" ||
            settings.lucaLink.connectionMode === "vpn") && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400">
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
                className={`w-full ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.03] border-black/10 text-slate-900" : "bg-black/20 border-white/10 text-white"} rounded-lg p-2 outline-none font-mono text-xs disabled:opacity-50 transition-all`}
                onFocus={(e) => (e.target.style.borderColor = theme.hex)}
                onBlur={(e) =>
                  (e.target.style.borderColor =
                    theme.themeName?.toLowerCase() === "lucagent"
                      ? "rgba(0,0,0,0.1)"
                      : "rgba(255,255,255,0.1)")
                }
              />
              <p className="text-xs text-gray-500">
                Leave empty for auto-detection. Use Tailscale IP (100.x.x.x) if
                configured.
              </p>
            </div>
          )}

          {/* Info Box */}
          <div
            className={`p-3 rounded-lg text-xs ${theme.themeName?.toLowerCase() === "lucagent" ? "" : "backdrop-blur-sm opacity-80"}`}
            style={{
              backgroundColor:
                theme.themeName?.toLowerCase() === "lucagent"
                  ? "rgba(102,126,234,0.08)"
                  : `${theme.hex}1a`,
              border: `1px solid ${theme.themeName?.toLowerCase() === "lucagent" ? "rgba(102,126,234,0.3)" : theme.hex + "4d"}`,
              color: theme.themeName?.toLowerCase() === "lucagent" ? "#1e40af" : theme.hex,
            }}
          >
            <div className="flex items-start gap-2">
              <Shield
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                style={{ color: theme.hex }}
              />
              <div>
                <div className="font-bold mb-1">Privacy & Security</div>
                <ul
                  className="space-y-1 opacity-80"
                  style={{ color: theme.hex }}
                >
                  <li className="flex items-start gap-1">
                    <Check
                      className="w-3 h-3 mt-0.5 flex-shrink-0"
                      style={{
                        color:
                          theme.themeName?.toLowerCase() === "lucagent"
                            ? "#1e40af"
                            : theme.hex,
                      }}
                    />
                    <span>Local & VPN: 100% private, no cloud servers</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <Check
                      className="w-3 h-3 mt-0.5 flex-shrink-0"
                      style={{
                        color:
                          theme.themeName?.toLowerCase() === "lucagent"
                            ? "#1e40af"
                            : theme.hex,
                      }}
                    />
                    <span>
                      Relay: End-to-end encrypted, relay can&apos;t read
                      messages
                    </span>
                  </li>
                  <li className="flex items-start gap-1">
                    <Check
                      className="w-3 h-3 mt-0.5 flex-shrink-0"
                      style={{
                        color:
                          theme.themeName?.toLowerCase() === "lucagent"
                            ? "#1e40af"
                            : theme.hex,
                      }}
                    />
                    <span>Auto mode tries local first for maximum privacy</span>
                  </li>
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
