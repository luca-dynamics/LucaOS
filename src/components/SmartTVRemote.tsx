import React, { useState } from "react";
import { SmartDevice } from "../types";
import { Icon } from "./ui/Icon";
import {
  lucaMaterialCardStyle,
  lucaMaterialControlStyle,
  lucaMaterialDialogStyle,
  lucaMaterialSolidCardStyle,
} from "../styles/lucaMaterialSystem";

interface Props {
  device: SmartDevice | null;
  onClose: () => void;
  onCommand: (cmd: string, params?: any) => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

const SmartTVRemote: React.FC<Props> = ({
  device,
  onClose,
  onCommand,
  theme,
}) => {
  const [pressed, setPressed] = useState<string | null>(null);
  const [pairingMode, setPairingMode] = useState(false); // Simulating auth requirement
  const [pin, setPin] = useState("");
  const [isMuted, setIsMuted] = useState(false);

  if (!device) return null;

  // Determine brand for UI customization
  const nameLower = device.name.toLowerCase();
  let brand = "UNIVERSAL";
  let osName = "SMART_TV";

  if (nameLower.includes("samsung")) {
    brand = "SAMSUNG";
    osName = "TIZEN_OS";
  } else if (nameLower.includes("lg")) {
    brand = "LG";
    osName = "WEB_OS";
  } else if (nameLower.includes("sony")) {
    brand = "SONY";
    osName = "ANDROID_TV";
  } else if (nameLower.includes("hisense") || nameLower.includes("vidaa")) {
    brand = "HISENSE";
    osName = "VIDAA_OS";
  } else if (nameLower.includes("roku")) {
    brand = "ROKU";
    osName = "ROKU_OS";
  }

  const handlePress = (cmd: string) => {
    console.log(`[REMOTE] Button Pressed: ${cmd}`); // DEBUG LOG
    setPressed(cmd);
    if (cmd === "MUTE") setIsMuted(!isMuted);
    onCommand(cmd);
    setTimeout(() => setPressed(null), 200);
  };

  const handlePinSubmit = () => {
    if (pin.length >= 4) {
      // Send PIN to backend
      onCommand("AUTH_PAIR", { pin });
      setPairingMode(false);
      setPin("");
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 animate-in fade-in zoom-in-95 duration-300">
      {/* Remote Body */}
      <div className="relative flex w-80 flex-col overflow-hidden rounded-3xl border" data-luca-material-role="dialog" role="dialog" aria-modal="true" aria-label={`${device.name} remote control`} style={lucaMaterialDialogStyle}>
        {/* IR Blaster Visual */}
        <div className="flex h-4 w-full items-center justify-center" style={lucaMaterialSolidCardStyle}>
          <div
            className={`w-2 h-2 rounded-full transition-all duration-200`}
            style={
              pressed
                ? {
                    backgroundColor: theme?.hex || "#ef4444",
                    boxShadow: `0 0 10px ${theme?.hex || "#ef4444"}`,
                  }
                : {
                    backgroundColor: "#7f1d1d",
                  }
            }
          ></div>
        </div>

        {/* Screen / Status */}
        <div className="relative flex h-32 flex-col justify-between overflow-hidden border-b p-5" style={lucaMaterialSolidCardStyle}>
          {/* Scanline */}
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[size:100%_4px]"></div>

          <div className="flex justify-between items-start z-10">
            <div className="text-[10px] font-mono text-slate-500">
              {brand} REMOTE
            </div>
            <button
              onClick={onClose}
              className="luca-material-pressable rounded-lg border p-1.5 hover:text-[var(--luca-text-primary)]"
              style={lucaMaterialControlStyle}
            >
              <Icon name="Play" size={18} />
            </button>
          </div>
          <div className="z-10">
            <div
              className="font-display font-bold text-xl truncate"
              style={{ color: theme?.hex || "#3b82f6" }}
            >
              {device.name}
            </div>
            <div className="flex items-center justify-between mt-1">
              <div className="text-[10px] font-mono text-[var(--luca-success,#4fbf7a)] flex items-center gap-2">
                <div
                  className={`w-1.5 h-1.5 bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] rounded-full ${
                    pairingMode ? "" : "animate-pulse"
                  }`}
                ></div>
                {pairingMode ? "AUTH_REQUIRED" : `${osName} LINKED`}
              </div>
              {pairingMode ? (
                <Icon name="Lock" size={14} className="text-[var(--luca-warning,#f2b23e)] animate-pulse" />
              ) : (
                <Icon name="Wifi" size={14} style={{ color: theme?.hex || "#3b82f6" }} />
              )}
            </div>
          </div>
        </div>

        {/* PAIRING OVERLAY */}
        {pairingMode ? (
          <div className="absolute bottom-0 z-20 flex h-[450px] w-full flex-col items-center justify-center gap-4 p-6" style={lucaMaterialSolidCardStyle}>
            <div className="text-[var(--luca-warning,#f2b23e)] text-xs font-bold tracking-widest flex items-center gap-2">
              <Icon name="Grid3x3" size={16} /> ENTER PAIRING PIN
            </div>
            <div className="text-[10px] text-slate-500 text-center px-4">
              Enter the code displayed on the{" "}
              {brand !== "UNIVERSAL" ? brand : "Target"} TV screen.
            </div>
            <input
              type="text"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
              className="w-40 rounded border py-2 text-center font-mono text-2xl tracking-[0.5em] outline-none transition-colors"
              style={
                {
                  ...lucaMaterialControlStyle,
                  borderColor: pressed === "pin" ? theme?.hex : "var(--luca-border-subtle)",
                } as any
              }
              onFocus={(e) =>
                (e.target.style.borderColor = theme?.hex || "#3b82f6")
              }
              onBlur={(e) => (e.target.style.borderColor = "#334155")}
              placeholder="----"
            />
            <div className="grid grid-cols-3 gap-2 w-full max-w-[200px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  onClick={() => setPin((p) => (p.length < 8 ? p + n : p))}
                  className="luca-material-pressable rounded border py-3 font-mono text-sm hover:text-[var(--luca-text-primary)]"
                  style={lucaMaterialControlStyle}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPin("")}
                className="bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] text-[var(--luca-danger,#f87171)] py-3 rounded font-mono text-[10px]"
              >
                CLR
              </button>
              <button
                onClick={() => setPin((p) => (p.length < 8 ? p + 0 : p))}
                className="luca-material-pressable rounded border py-3 font-mono text-sm hover:text-[var(--luca-text-primary)]"
                style={lucaMaterialControlStyle}
              >
                0
              </button>
              <button
                onClick={handlePinSubmit}
                className="py-3 rounded font-mono text-[10px] font-bold text-black"
                style={{ backgroundColor: theme?.hex || "#3b82f6" }}
              >
                OK
              </button>
            </div>
          </div>
        ) : (
          /* STANDARD CONTROLS */
          <div className="flex flex-col gap-6 p-6" style={lucaMaterialSolidCardStyle}>
            {/* Power & Sources */}
            <div className="flex justify-between px-6">
              <button
                onClick={() => handlePress("POWER")}
                className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all shadow-lg ${
                  pressed === "POWER"
                    ? "bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] text-white shadow-[color:var(--luca-danger,#f87171)]"
                    : "border-slate-800 bg-slate-900/50 text-[var(--luca-danger,#f87171)] hover:bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]"
                }`}
              >
                <Icon name="Power" size={24} />
              </button>
              <button
                onClick={() => handlePress("INPUT")}
                className="w-14 h-14 rounded-full flex items-center justify-center border border-slate-800 bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
              >
                <Icon name="Tv" size={22} />
              </button>
            </div>

            {/* Navigation Area */}
            <div className="relative flex flex-col items-center gap-2 rounded-2xl border p-4" style={lucaMaterialCardStyle}>
              {/* Nav Header Buttons */}
              <div className="flex justify-between w-full px-2 mb-2">
                <button
                  onClick={() => handlePress("MENU")}
                  className="text-[9px] font-bold text-slate-500 hover:text-white flex flex-col items-center gap-1 group"
                >
                  <Icon
                    name="Menu"
                    size={16}
                    className="transition-colors"
                    style={{
                      color: pressed === "MENU" ? theme?.hex : undefined,
                    }}
                  />{" "}
                  MENU
                </button>
                <button
                  onClick={() => handlePress("EXIT")}
                  className="text-[9px] font-bold text-slate-500 hover:text-white flex flex-col items-center gap-1 group"
                >
                  <Icon name="LogOut" size={16} className="group-hover:text-[var(--luca-danger,#f87171)]" /> EXIT
                </button>
              </div>

              {/* D-Pad */}
              <button
                onClick={() => handlePress("UP")}
                className="w-12 h-10 rounded-t-lg bg-slate-800 text-slate-400 flex items-center justify-center transition-colors border-b border-black"
                style={
                  pressed === "UP"
                    ? { backgroundColor: theme?.hex, color: "black" }
                    : {}
                }
              >
                <Icon name="ChevronUp" size={24} />
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => handlePress("LEFT")}
                  className="w-10 h-12 rounded-l-lg bg-slate-800 text-slate-400 flex items-center justify-center transition-colors border-r border-black"
                  style={
                    pressed === "LEFT"
                      ? { backgroundColor: theme?.hex, color: "black" }
                      : {}
                  }
                >
                  <Icon name="ChevronLeft" size={24} />
                </button>
                <button
                  onClick={() => handlePress("OK")}
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 text-white font-bold text-[10px] shadow-inner active:scale-95 transition-all"
                  style={{
                    borderColor: pressed === "OK" ? theme?.hex : "#334155",
                  }}
                >
                  OK
                </button>
                <button
                  onClick={() => handlePress("RIGHT")}
                  className="w-10 h-12 rounded-r-lg bg-slate-800 text-slate-400 flex items-center justify-center transition-colors border-l border-black"
                  style={
                    pressed === "RIGHT"
                      ? { backgroundColor: theme?.hex, color: "black" }
                      : {}
                  }
                >
                  <Icon name="ChevronRight" size={24} />
                </button>
              </div>
              <button
                onClick={() => handlePress("DOWN")}
                className="w-12 h-10 rounded-b-lg bg-slate-800 text-slate-400 flex items-center justify-center transition-colors border-t border-black"
                style={
                  pressed === "DOWN"
                    ? { backgroundColor: theme?.hex, color: "black" }
                    : {}
                }
              >
                <Icon name="ChevronDown" size={24} />
              </button>

              {/* Back Button */}
              <button
                onClick={() => handlePress("BACK")}
                className="absolute bottom-4 left-4 text-slate-500 hover:text-white flex items-center gap-1 text-[9px] font-bold"
              >
                <Icon name="ArrowLeft" size={20} /> BACK
              </button>
            </div>

            {/* Vol / Channel / Home */}
            <div className="flex justify-between items-center px-2">
              <div className="flex flex-col gap-2 bg-slate-900 rounded-full p-1 border border-slate-800">
                <button
                  onClick={() => handlePress("VOL_UP")}
                  className="w-10 h-10 rounded-full hover:bg-slate-800 text-slate-300 flex items-center justify-center"
                >
                  <Icon name="Volume2" size={16} />
                </button>
                <button
                  onClick={() => handlePress("VOL_DOWN")}
                  className="w-10 h-10 rounded-full hover:bg-slate-800 text-slate-300 flex items-center justify-center"
                >
                  <Icon name="Volume2" size={14} className="opacity-50" />
                </button>
              </div>

              <div className="flex flex-col gap-4 justify-center">
                <button
                  onClick={() => handlePress("HOME")}
                  className="w-12 h-12 rounded-full border border-slate-700 text-white hover:bg-white hover:text-black transition-colors flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                >
                  <Icon name="Home" size={20} />
                </button>
                <button
                  onClick={() => handlePress("MUTE")}
                  className={`w-12 h-8 rounded-lg flex items-center justify-center border transition-all ${
                    pressed === "MUTE"
                      ? "bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)] border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] text-black"
                      : "border-slate-800 bg-slate-900/50 text-slate-400 hover:text-[var(--luca-warning,#f2b23e)]"
                  }`}
                  title="Mute"
                >
                  <Icon name="Pause" size={18} />
                </button>
                <button
                  onClick={() => setPairingMode(true)}
                  className="text-[8px] font-mono text-[var(--luca-warning,#f2b23e)] hover:text-[var(--luca-warning,#f2b23e)] border border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] px-2 py-1 rounded text-center"
                  title="Force Re-Pair"
                >
                  PAIR
                </button>
              </div>

              <div className="flex flex-col gap-2 bg-slate-900 rounded-full p-1 border border-slate-800">
                <button
                  onClick={() => handlePress("CH_UP")}
                  className="w-10 h-10 rounded-full hover:bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold"
                >
                  CH+
                </button>
                <button
                  onClick={() => handlePress("CH_DOWN")}
                  className="w-10 h-10 rounded-full hover:bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold"
                >
                  CH-
                </button>
              </div>
            </div>

            {/* App Shortcuts */}
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                onClick={() => handlePress("NETFLIX")}
                className="h-10 bg-black border rounded font-bold text-[10px] tracking-wider transition-all hover:bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] hover:text-white"
                style={{
                  color: "#ef4444",
                  borderColor: "rgba(239, 68, 68, 0.4)",
                }}
              >
                NETFLIX
              </button>
              <button
                onClick={() => handlePress("YOUTUBE")}
                className="h-10 bg-black border border-white/20 rounded text-white font-bold text-[10px] tracking-wider transition-all hover:bg-white hover:text-black flex items-center justify-center gap-1"
              >
                <Icon name="Youtube" size={12} /> YouTube
              </button>
              <button
                onClick={() => handlePress("PRIME")}
                className="h-10 border rounded font-bold text-[10px] tracking-wider transition-all"
                style={{
                  backgroundColor: theme
                    ? `${theme.hex}1a`
                    : "rgba(59, 130, 246, 0.1)",
                  borderColor: theme
                    ? `${theme.hex}4d`
                    : "rgba(59, 130, 246, 0.3)",
                  color: theme?.hex || "#3b82f6",
                }}
              >
                PRIME
              </button>
              <button
                onClick={() => handlePress("DISNEY")}
                className="h-10 border rounded font-bold text-[10px] tracking-wider transition-all"
                style={{
                  backgroundColor: theme
                    ? `${theme.hex}1a`
                    : "rgba(99, 102, 241, 0.1)",
                  borderColor: theme
                    ? `${theme.hex}4d`
                    : "rgba(99, 102, 241, 0.3)",
                  color: theme?.hex || "#6366f1",
                }}
              >
                DISNEY+
              </button>
              <button
                onClick={() => handlePress("BROWSER")}
                className="h-10 bg-slate-800/50 border border-slate-700/50 rounded text-slate-300 font-bold text-[10px] tracking-wider hover:bg-slate-700 hover:text-white transition-colors"
              >
                BROWSER
              </button>
              <button
                onClick={() => handlePress("YT_MUSIC")}
                className="h-10 bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] border border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] rounded text-[var(--luca-danger,#f87171)] font-bold text-[10px] tracking-wider hover:bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] hover:text-white transition-colors flex items-center justify-center gap-1"
              >
                YT MUSIC
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartTVRemote;
