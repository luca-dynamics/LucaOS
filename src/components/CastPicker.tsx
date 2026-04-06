import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Icon } from "./ui/Icon";
import { DeviceType, SmartDevice } from "../types";
import { apiUrl, FRONTEND_PORT } from "../config/api";

interface CastPickerProps {
  devices: SmartDevice[];
  onSelect: (deviceId: string) => void;
  onCancel: () => void;
  theme?: any;
}

type CastMethod = "SELECT" | "QR" | "HOTSPOT" | "LOCAL";

const CastPicker: React.FC<CastPickerProps> = ({
  devices,
  onSelect,
  onCancel,
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
          const wifi = data.addresses.find(
            (a: any) => a.name.includes("en0") || a.name.includes("wlan"),
          );
          setLanIp(wifi ? wifi.address : data.addresses[0].address);
        }
      })
      .catch((err: any) => console.error("Failed to fetch IP", err));
  }, []);

  useEffect(() => {
    QRCode.toDataURL(localUrl)
      .then((url) => setQrUrl(url))
      .catch((err: any) => console.error(err));
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

  const castableDevices = devices.filter(
    (d) =>
      d.type === DeviceType.SMART_TV ||
      d.type === DeviceType.MOBILE ||
      d.type === DeviceType.WIRELESS_NODE,
  );

  return (
    <div className="absolute inset-0 z-[200] bg-black/60 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-300">
      <div
        className="w-full max-w-md bg-[var(--app-bg-main)]/40 glass-blur border border-[var(--app-border-main)] rounded-2xl overflow-hidden relative shadow-2xl shadow-black/50"
      >
        {/* Liquid background effects using reactive vars */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none transition-all duration-700 -z-10"
          style={{
            background: `radial-gradient(circle at 50% 50%, var(--app-primary), transparent 70%)`,
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute inset-0 opacity-20 pointer-events-none transition-all duration-700 -z-10"
          style={{
            background: `radial-gradient(circle at 80% 20%, var(--app-primary), transparent 50%)`,
            filter: "blur(40px)",
          }}
        />

        {/* Header */}
        <div
          className="p-5 border-b border-[var(--app-border-main)] flex items-center justify-between relative z-10 bg-[var(--app-primary)]/5"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2 rounded-xl bg-[var(--app-primary)]/10 border border-[var(--app-primary)]/20 shadow-inner">
              <Icon name="Cast" size={20} variant="BoldDuotone" className="text-[var(--app-primary)]" />
            </div>
            <div>
              <h3 className="text-[var(--app-text-main)] font-black tracking-[0.1em] uppercase italic">
                Cast Target
              </h3>
              <p
                className="text-[9px] font-black font-mono tracking-widest text-[var(--app-primary)] uppercase"
              >
                {method === "SELECT"
                  ? "Select Connection Method"
                  : "Establish Uplink"}
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
            className="p-2 rounded-xl transition-all duration-300 bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/40 text-[var(--app-text-muted)] hover:text-red-500"
          >
            <Icon name="CloseCircle" size={20} variant="BoldDuotone" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 max-h-[450px] overflow-y-auto custom-scrollbar min-h-[320px] flex flex-col justify-center relative z-10">
          {/* METHOD SELECTION SCREEN */}
          {method === "SELECT" && (
            <div className="grid gap-3 p-1">
              <button
                onClick={() => setMethod("QR")}
                className="flex items-center gap-4 p-4 rounded-xl bg-black/20 border border-[var(--app-border-main)] transition-all text-left group hover:bg-[var(--app-primary)]/10 hover:border-[var(--app-primary)]/30 hover:scale-[1.02] shadow-sm hover:shadow-lg hover:shadow-[var(--app-primary)]/5"
              >
                <div
                  className="p-3.5 rounded-xl bg-black/40 border border-white/5 transition-all group-hover:scale-110 group-hover:shadow-inner group-hover:bg-[var(--app-primary)]/20 text-[var(--app-primary)]"
                >
                  <Icon name="QrCode" size={26} variant="BoldDuotone" />
                </div>
                <div>
                  <div className="font-black text-sm tracking-[0.05em] uppercase italic text-[var(--app-text-main)] group-hover:text-[var(--app-primary)] transition-colors">
                    Luca Link (QR)
                  </div>
                  <div className="text-[9px] text-[var(--app-text-muted)] font-black font-mono uppercase tracking-widest opacity-60">
                    Scan code to pair mobile device
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMethod("HOTSPOT")}
                className="flex items-center gap-4 p-4 rounded-xl bg-black/20 border border-[var(--app-border-main)] transition-all text-left group hover:bg-purple-500/10 hover:border-purple-500/30 hover:scale-[1.02] shadow-sm hover:shadow-lg hover:shadow-purple-500/5"
              >
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 transition-all group-hover:scale-110 group-hover:shadow-inner group-hover:bg-purple-500/20 text-purple-400">
                  <Icon name="Shield" size={26} variant="BoldDuotone" />
                </div>
                <div>
                  <div className="font-black text-sm tracking-[0.05em] uppercase italic text-[var(--app-text-main)] group-hover:text-purple-400 transition-colors">
                    Secure Hotspot
                  </div>
                  <div className="text-[9px] text-[var(--app-text-muted)] font-black font-mono uppercase tracking-widest opacity-60">
                    Direct P2P Encrypted Uplink
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMethod("LOCAL")}
                className="flex items-center gap-4 p-4 rounded-xl bg-black/20 border border-[var(--app-border-main)] transition-all text-left group hover:bg-green-500/10 hover:border-green-500/30 hover:scale-[1.02] shadow-sm hover:shadow-lg hover:shadow-green-500/5"
              >
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 transition-all group-hover:scale-110 group-hover:shadow-inner group-hover:bg-green-500/20 text-green-400">
                  <Icon name="Wifi" size={26} variant="BoldDuotone" />
                </div>
                <div>
                  <div className="font-black text-sm tracking-[0.05em] uppercase italic text-[var(--app-text-main)] group-hover:text-green-400 transition-colors">
                    Local Network
                  </div>
                  <div className="text-[9px] text-[var(--app-text-muted)] font-black font-mono uppercase tracking-widest opacity-60">
                    Cast to TV/Displays on WiFi
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* QR MODE */}
          {method === "QR" && (
            <div className="p-6 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
              <div
                className="mb-5 bg-white p-3 rounded-2xl shadow-2xl shadow-[var(--app-primary)]/20 tech-border border-4 border-white"
              >
                {qrUrl ? (
                  <img src={qrUrl} alt="Connect QR" className="w-44 h-44 mix-blend-multiply" />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                    <Icon name="QrCode" size={40} className="animate-pulse" />
                  </div>
                )}
              </div>
              <h4 className="text-[var(--app-text-main)] font-black text-xs tracking-[0.3em] uppercase italic">Scan Target</h4>
              <p className="text-[10px] text-[var(--app-text-muted)] max-w-[220px] mt-2 mb-6 font-black font-mono uppercase tracking-widest opacity-60">
                Establish direct visual uplink via mobile linkage
              </p>
              <div className="w-full bg-black/40 border border-[var(--app-border-main)] rounded-xl p-3 flex flex-col items-center max-w-[280px] shadow-inner">
                <span
                  className="text-[9px] font-black font-mono tracking-[0.2em] mb-1.5 text-[var(--app-primary)] uppercase italic"
                >
                  Manual Link
                </span>
                <code className="text-[10px] text-[var(--app-text-main)] bg-transparent font-mono select-all break-all opacity-80 leading-relaxed group-hover:opacity-100 transition-all">
                  {localUrl}
                </code>
              </div>
            </div>
          )}

          {/* HOTSPOT MODE */}
          {method === "HOTSPOT" && (
            <div className="p-8 text-center animate-in fade-in slide-in-from-bottom-6 duration-500">
              <div
                className={`w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-6 transition-all duration-500 tech-border border
                  ${isBeaconActive ? "bg-green-500/10 border-green-500/30 shadow-lg shadow-green-500/20" : "bg-purple-500/10 border-purple-500/30 animate-pulse"}
                `}
              >
                <Icon
                  name="Shield"
                  size={40}
                  variant="BoldDuotone"
                  className={isBeaconActive ? "text-green-400" : "text-purple-400"}
                />
              </div>
              <h3 className="text-sm font-black text-[var(--app-text-main)] mb-2 tracking-[0.2em] uppercase italic">
                {isBeaconActive ? "Beacon Active" : "Secure Hotspot"}
              </h3>
              <p className="text-[10px] text-[var(--app-text-muted)] mb-8 font-black font-mono tracking-widest uppercase opacity-60">
                {isBeaconActive
                  ? "Encrypted P2P tunnel established"
                  : "Initializing P2P encrypted broadcast"}
                <br />
                <span className="mt-1 block text-purple-400/80">SSID: LUCA CORE SECURE</span>
              </p>
              {!isBeaconActive ? (
                <button
                  onClick={handleActivateBeacon}
                  disabled={isActivating}
                  className="px-6 py-3 bg-[var(--app-primary)] hover:scale-105 active:scale-95 text-black text-[10px] font-black uppercase tracking-[0.3em] italic rounded-xl transition-all shadow-lg shadow-[var(--app-primary)]/20 disabled:opacity-50"
                >
                  {isActivating ? "Activating..." : "Activate Beacon"}
                </button>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="px-4 py-1.5 bg-green-500/10 text-green-400 text-[10px] font-black uppercase tracking-[0.3em] italic rounded-xl border border-green-500/20 animate-pulse">
                    Broadcasting
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
                    className="mt-2 text-[9px] font-black font-mono tracking-widest text-[var(--app-text-muted)] hover:text-red-500 transition-colors uppercase italic"
                  >
                    Reset Beacon
                  </button>
                </div>
              )}
            </div>
          )}

          {/* LOCAL NETWORK MODE */}
          {method === "LOCAL" && (
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 h-full flex flex-col p-2">
              <div
                className="px-2 py-2 text-[9px] font-black font-mono uppercase tracking-[0.3em] mb-3 text-[var(--app-text-muted)] italic opacity-50"
              >
                Discovered Nodes
              </div>

              {castableDevices.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-30">
                  <Icon name="Wifi" size={40} className="mb-3 text-[var(--app-text-muted)]" />
                  <div className="text-[var(--app-text-main)] font-black text-xs tracking-[0.1em] uppercase italic">
                    No External Nodes
                  </div>
                  <div className="text-[9px] text-[var(--app-text-muted)] font-mono mt-2 tracking-widest uppercase">
                    Scanning local subnet...
                  </div>
                </div>
              ) : (
                <div className="space-y-2 px-1">
                  {castableDevices.map((device) => (
                    <button
                      key={device.id}
                      onClick={() => onSelect(device.id)}
                      className="w-full text-left p-4 rounded-xl bg-black/20 border border-[var(--app-border-main)] hover:border-[var(--app-primary)]/40 hover:bg-[var(--app-primary)]/10 group transition-all flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center text-[var(--app-text-muted)] group-hover:text-[var(--app-primary)] group-hover:bg-[var(--app-primary)]/20 group-hover:shadow-inner transition-all duration-300">
                          {device.type === DeviceType.SMART_TV && (
                            <Icon name="Tv" size={22} variant="BoldDuotone" />
                          )}
                          {device.type === DeviceType.MOBILE && (
                            <Icon name="Smartphone" size={22} variant="BoldDuotone" />
                          )}
                          {device.type === DeviceType.WIRELESS_NODE && (
                            <Icon name="Monitor" size={22} variant="BoldDuotone" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-black text-[var(--app-text-main)] group-hover:text-[var(--app-primary)] tracking-wide uppercase italic transition-colors">
                            {device.name}
                          </div>
                          <div className="text-[9px] font-black font-mono text-[var(--app-text-muted)] group-hover:text-[var(--app-primary)] opacity-60 uppercase tracking-widest transition-opacity mt-0.5">
                            {device.location} • {device.status}
                          </div>
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full transition-all duration-500 ${device.isOn ? "bg-green-500 shadow-lg shadow-green-500/50" : "bg-white/10"}`} />
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
