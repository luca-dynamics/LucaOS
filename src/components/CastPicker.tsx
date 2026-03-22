import React, { useEffect, useState } from "react";
import * as LucideIcons from "lucide-react";
const {
  Cast,
  Monitor,
  Tv,
  Smartphone,
  X,
  QrCode,
  Wifi,
  Shield,
} = LucideIcons as any;
import { setHexAlpha } from "../config/themeColors";
import { SmartDevice, DeviceType } from "../types";
import QRCode from "qrcode";
import { apiUrl, FRONTEND_PORT } from "../config/api";

interface CastPickerProps {
  devices: SmartDevice[];
  onSelect: (deviceId: string) => void;
  onCancel: () => void;
  theme?: {
    primary: string;
    border: string;
    bg: string;
    hex: string;
  };
}

type CastMethod = "SELECT" | "QR" | "HOTSPOT" | "LOCAL";

const CastPicker: React.FC<CastPickerProps> = ({
  devices,
  onSelect,
  onCancel,
  theme = {
    primary: "#22d3ee", // Cyan-400
    border: "rgba(6, 182, 212, 0.3)", // Cyan-500/30
    bg: "rgba(8, 51, 68, 0.2)", // Cyan-950/20
    hex: "#06b6d4",
  },
}) => {
  const [method, setMethod] = useState<CastMethod>("SELECT");
  const [qrUrl, setQrUrl] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [isBeaconActive, setIsBeaconActive] = useState(false);
  const [lanIp, setLanIp] = useState("localhost");

  // Use query param for routing as handled in index.tsx
  const localUrl = `http://${lanIp}:${FRONTEND_PORT}?mode=visual_core`;

  useEffect(() => {
    // Fetch LAN IP for mobile connection
    fetch(apiUrl("/api/network/ip"))
      .then((res) => res.json())
      .then((data) => {
        if (data.addresses && data.addresses.length > 0) {
          // Prefer EN0 or similar, but just take first non-internal for now
          const wifi = data.addresses.find(
            (a: any) => a.name.includes("en0") || a.name.includes("wlan"),
          );
          setLanIp(wifi ? wifi.address : data.addresses[0].address);
        }
      })
      .catch((err) => console.error("Failed to fetch IP", err));
  }, []);

  useEffect(() => {
    QRCode.toDataURL(localUrl)
      .then((url) => setQrUrl(url))
      .catch((err) => console.error(err));
  }, [localUrl]);

  const handleActivateBeacon = async () => {
    setIsActivating(true);
    try {
      const res = await fetch(apiUrl("/api/system/hotspot"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "on" }),
      });
      const data = await res.json();
      if (data.success) {
        setIsBeaconActive(true);
      }
    } catch (e) {
      console.error("Failed to activate beacon", e);
    } finally {
      setIsActivating(false);
    }
  };

  // Filter for devices that likely support casting (TVs, Screens, etc.)
  const castableDevices = devices.filter(
    (d) =>
      d.type === DeviceType.SMART_TV ||
      d.type === DeviceType.MOBILE ||
      d.type === DeviceType.WIRELESS_NODE,
  );

  return (
    <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center animate-in fade-in zoom-in duration-200">
      <div
        className="w-full max-w-md bg-black/40 backdrop-blur-xl border rounded-xl overflow-hidden relative"
        style={{
          borderColor: theme.border,
          boxShadow: `0 0 80px -20px ${setHexAlpha(theme.hex, 0.25)}`,
        }}
      >
        {/* Liquid background effect 1 (Center) */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none transition-all duration-700 -z-10"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${setHexAlpha(theme.hex, 0.15)}, transparent 60%)`,
            filter: "blur(40px)",
          }}
        />
        {/* Liquid background effect 2 (Top Right Offset) */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none transition-all duration-700 -z-10"
          style={{
            background: `radial-gradient(circle at 80% 20%, ${setHexAlpha(theme.hex, 0.08)}, transparent 50%)`,
            filter: "blur(40px)",
          }}
        />
        {/* Header */}
        <div
          className="p-4 border-b border-white/10 flex items-center justify-between relative z-10"
          style={{ backgroundColor: setHexAlpha(theme.hex, 0.12) }}
        >
          <div className="flex items-center gap-3">
            <Cast style={{ color: theme.primary }} size={20} />
            <div>
              <h3 className="text-white font-bold tracking-wide">
                CAST TARGET
              </h3>
              <p
                className="text-[10px] font-mono"
                style={{ color: theme.primary }}
              >
                {method === "SELECT"
                  ? "SELECT CONNECTION METHOD"
                  : "ESTABLISH UPLINK"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (method === "SELECT") onCancel();
              else {
                setMethod("SELECT");
                setIsBeaconActive(false);
              }
            }}
            className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar min-h-[300px] flex flex-col justify-center relative z-10">
          {/* METHOD SELECTION SCREEN */}
          {method === "SELECT" && (
            <div className="grid gap-2 p-2">
              <button
                onClick={() => setMethod("QR")}
                className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10 transition-all text-left group"
                style={
                  {
                    "--theme-color": theme.primary,
                    "--theme-hex": theme.hex,
                  } as React.CSSProperties
                }
              >
                {/* Hover effects handled via group-hover and standard tailwind for simplicity where possible, 
                    but for dynamic colors we use inline styles for the active elements */}
                <div
                  className="p-3 rounded-full bg-slate-800 transition-transform group-hover:scale-110"
                  style={{ color: theme.primary }}
                >
                  <QrCode size={24} />
                </div>
                <div>
                  <div
                    className="font-bold text-slate-200 transition-colors"
                    style={{
                      color: undefined, // Let CSS hover handle it if possible, or use inline
                    }}
                  >
                    <span className="group-hover:text-[var(--theme-color)]">
                      Luca Link (QR)
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Scan code to pair mobile device
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMethod("HOTSPOT")}
                className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all text-left group"
              >
                <div className="p-3 rounded-full bg-slate-800 text-purple-400 group-hover:scale-110 transition-transform">
                  <Shield size={24} />
                </div>
                <div>
                  <div className="font-bold text-slate-200 group-hover:text-purple-300">
                    Secure Hotspot
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Direct P2P Encrypted Uplink
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMethod("LOCAL")}
                className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:border-green-500/50 hover:bg-green-500/10 transition-all text-left group"
              >
                <div className="p-3 rounded-full bg-slate-800 text-green-400 group-hover:scale-110 transition-transform">
                  <Wifi size={24} />
                </div>
                <div>
                  <div className="font-bold text-slate-200 group-hover:text-green-300">
                    Local Network
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Cast to TV/Displays on WiFi
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* QR MODE */}
          {method === "QR" && (
            <div className="p-4 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div
                className="mb-3 bg-white p-2 rounded-lg"
                style={{ boxShadow: `0 0 20px ${setHexAlpha(theme.hex, 0.3)}` }}
              >
                {qrUrl ? (
                  <img src={qrUrl} alt="Connect QR" className="w-40 h-40" />
                ) : (
                  <div className="w-40 h-40 flex items-center justify-center text-slate-400">
                    <QrCode size={32} className="animate-pulse" />
                  </div>
                )}
              </div>
              <h4 className="text-white font-bold text-sm mt-4">SCAN TARGET</h4>
              <p className="text-[10px] text-slate-400 max-w-[200px] mt-1 mb-4">
                Use your mobile device to scan and establish visual uplink.
              </p>
              <div className="w-full bg-black/40 border border-white/10 rounded p-2 flex flex-col items-center max-w-[250px]">
                <span
                  className="text-[9px] uppercase font-mono tracking-wider mb-1"
                  style={{ color: setHexAlpha(theme.primary, 0.8) }} // 80% opacity
                >
                  Manual Link
                </span>
                <code className="text-[10px] text-slate-300 bg-transparent font-mono select-all break-all">
                  {localUrl}
                </code>
              </div>
            </div>
          )}

          {/* HOTSPOT MODE */}
          {method === "HOTSPOT" && (
            <div className="p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div
                className={`w-20 h-20 mx-auto bg-purple-900/20 rounded-full flex items-center justify-center mb-4 ${
                  isBeaconActive ? "bg-purple-500/30" : "animate-pulse"
                }`}
              >
                <Shield
                  size={32}
                  className={
                    isBeaconActive ? "text-green-400" : "text-purple-500"
                  }
                />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {isBeaconActive ? "BEACON ACTIVE" : "SECURE HOTSPOT"}
              </h3>
              <p className="text-xs text-slate-400 mb-6 font-mono">
                {isBeaconActive
                  ? "Encrypted P2P tunnel established."
                  : "Initializing P2P encrypted broadcasting..."}
                <br />
                SSID: <span className="text-purple-400">LUCA CORE SECURE</span>
              </p>
              {!isBeaconActive ? (
                <button
                  onClick={handleActivateBeacon}
                  disabled={isActivating}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded tracking-wider transition-colors disabled:opacity-50"
                >
                  {isActivating ? "ACTIVATING..." : "ACTIVATE BEACON"}
                </button>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="px-3 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-widest rounded border border-green-500/30 animate-pulse">
                    Broadcasting...
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await fetch(apiUrl("/api/system/hotspot"), {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "off" }),
                        });
                      } catch (e) {
                        console.error(e);
                      }
                      setIsBeaconActive(false);
                    }}
                    className="mt-4 text-[10px] text-slate-500 hover:text-slate-300 underline"
                  >
                    Reset Beacon
                  </button>
                </div>
              )}
            </div>
          )}

          {/* LOCAL NETWORK MODE */}
          {method === "LOCAL" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 h-full flex flex-col">
              <div
                className="px-4 py-2 text-[10px] font-mono uppercase tracking-wider mb-2"
                style={{ color: setHexAlpha(theme.primary, 0.5) }}
              >
                Discovered Nodes
              </div>

              {castableDevices.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-50">
                  <Wifi size={32} className="mb-2 text-slate-600" />
                  <div className="text-slate-500 font-mono text-xs">
                    NO EXTERNAL DISPLAYS DETECTED
                  </div>
                  <div className="text-[10px] text-slate-700 mt-1">
                    Scanning local subnet...
                  </div>
                </div>
              ) : (
                <div className="space-y-1 px-2">
                  {castableDevices.map((device) => (
                    <button
                      key={device.id}
                      onClick={() => onSelect(device.id)}
                      className="w-full text-left p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-green-500/30 group transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-green-400 group-hover:bg-green-500/10 transition-colors">
                          {device.type === DeviceType.SMART_TV && (
                            <Tv size={20} />
                          )}
                          {device.type === DeviceType.MOBILE && (
                            <Smartphone size={20} />
                          )}
                          {device.type === DeviceType.WIRELESS_NODE && (
                            <Monitor size={20} />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-200 group-hover:text-green-300">
                            {device.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 group-hover:text-green-500/70">
                            {device.location} • {device.status.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      {device.isOn ? (
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-700" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CastPicker;
