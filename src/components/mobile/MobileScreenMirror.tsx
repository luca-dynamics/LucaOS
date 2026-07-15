import React, { useState } from "react";
import { Icon } from "../ui/Icon";
import { SmartDevice } from "../../types";
import UiTreeOverlay, { UiNode } from "./UiTreeOverlay";
import {
  lucaMaterialCardStyle,
  lucaMaterialControlActiveStyle,
  lucaMaterialControlStyle,
} from "../../styles/lucaMaterialSystem";

interface MobileScreenMirrorProps {
  device: SmartDevice;
  isAdbConnected: boolean;
  screenImage: string | null;
  uiTree?: UiNode | null;
  onSendKey: (keyCode: number) => void;
  onSendTap: (x: number, y: number) => void;
  onStartNativeStream: () => void;
}

const MobileScreenMirror: React.FC<MobileScreenMirrorProps> = ({
  isAdbConnected,
  screenImage,
  uiTree,
  onSendKey,
  onSendTap,
  onStartNativeStream,
}) => {
  const [visionMode, setVisionMode] = useState(true);

  // Handle Tap on Image
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAdbConnected) return;

    // Calculate relative coordinates
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    // Assuming 1080x2340 standard resolution for modern Android
    const realX = Math.round(xRatio * 1080);
    const realY = Math.round(yRatio * 2340);

    onSendTap(realX, realY);
  };

  const handleElementClick = (node: UiNode) => {
    // Logic to click the center of the node bounds
    const match = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (match) {
      const x1 = parseInt(match[1]);
      const y1 = parseInt(match[2]);
      const x2 = parseInt(match[3]);
      const y2 = parseInt(match[4]);
      onSendTap(Math.round((x1 + x2) / 2), Math.round((y1 + y2) / 2));
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center">
      {!isAdbConnected ? (
        <div className="text-center text-[var(--luca-text-secondary)]">
          <Icon name="Cast" size={48} className="mx-auto mb-4 opacity-20" variant="BoldDuotone" />
          <h3 className="mb-2 text-lg font-bold text-[var(--luca-text-primary)]">
            ADB LINK OFFLINE
          </h3>
          <p className="text-xs font-mono max-w-md mx-auto">
            To enable remote control, connect your device via USB and enable USB
            Debugging in Developer Options. Ensure ADB is running on the host.
          </p>
        </div>
      ) : (
        <div className="relative flex-1 w-full flex justify-center items-center gap-8">
          {/* Phone Frame */}
          <div
            className="relative h-full aspect-[9/19.5] bg-black border-4 border-slate-800 rounded-3xl overflow-hidden shadow-2xl group/frame"
            style={{
              boxShadow:
                "0 0 50px rgba(0,0,0,0.8), 0 0 20px rgba(6,182,212,0.1)",
            }}
          >
            {/* Screen Content Container */}
            <div
              className="relative w-full h-full cursor-crosshair overflow-hidden"
              onClick={handleImageClick}
            >
              {screenImage ? (
                <img
                  src={`data:image/png;base64,${screenImage}`}
                  alt="Device Screen"
                  className="w-full h-full object-cover select-none"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 animate-pulse gap-2 bg-slate-950">
                  <div className="w-8 h-8 border-2 border-slate-800 border-t-rq-blue rounded-full animate-spin"></div>
                  <span className="text-[10px] font-mono tracking-widest mt-2">
                    LINKING CORE...
                  </span>
                </div>
              )}

              {/* UI Tree Overlay */}
              {visionMode && uiTree && (
                <UiTreeOverlay
                  tree={uiTree}
                  onElementClick={handleElementClick}
                />
              )}

              {/* Scanline Effect */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_2px,3px_100%]"></div>
            </div>

            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-900 rounded-b-xl z-50"></div>
          </div>

          {/* Controls Sidebar */}
          <div className="flex flex-col gap-3 w-48">
            {/* VISION MODES */}
            <div className="rounded-xl border p-3" style={lucaMaterialCardStyle}>
              <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--luca-accent-primary)]">
                Vision Systems
              </div>
              <button
                onClick={() => setVisionMode(!visionMode)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-sm text-xs font-bold transition-all ${
                  visionMode
                    ? "text-[var(--luca-accent-primary)]"
                    : "text-[var(--luca-text-secondary)]"
                }`}
                style={visionMode ? lucaMaterialControlActiveStyle : lucaMaterialControlStyle}
              >
                <span className="flex items-center gap-2">
                  {visionMode ? <Icon name="Eye" size={14} variant="BoldDuotone" /> : <Icon name="EyeOff" size={14} variant="BoldDuotone" />}
                  INSPECTOR
                </span>
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    visionMode
                      ? "bg-[var(--luca-accent-primary)] animate-pulse"
                      : "bg-[var(--luca-text-tertiary)]"
                  }`}
                ></div>
              </button>
            </div>

            {/* NAVIGATION */}
            <div className="flex flex-col gap-2 rounded-xl border p-3" style={lucaMaterialCardStyle}>
              <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--luca-text-tertiary)]">
                Hardware Navigation
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onSendKey(3)}
                  className="luca-material-pressable rounded-lg border px-3 py-2 text-[10px] font-bold transition-colors hover:text-[var(--luca-text-primary)]"
                  style={lucaMaterialControlStyle}
                >
                  HOME
                </button>
                <button
                  onClick={() => onSendKey(4)}
                  className="luca-material-pressable rounded-lg border px-3 py-2 text-[10px] font-bold transition-colors hover:text-[var(--luca-text-primary)]"
                  style={lucaMaterialControlStyle}
                >
                  BACK
                </button>
                <button
                  onClick={() => onSendKey(187)}
                  className="luca-material-pressable rounded-lg border px-3 py-2 text-[10px] font-bold transition-colors hover:text-[var(--luca-text-primary)]"
                  style={lucaMaterialControlStyle}
                >
                  RECENTS
                </button>
                <button
                  onClick={() => onSendKey(26)}
                  className="rounded-lg border border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] px-3 py-2 text-[10px] font-bold text-[var(--luca-danger,#f87171)] transition-colors hover:text-[var(--luca-text-primary)]"
                >
                  POWER
                </button>
              </div>
            </div>

            <button
              onClick={onStartNativeStream}
              className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_12%,transparent)] px-4 py-3 text-[10px] font-bold text-[var(--luca-accent-primary,#9b7cff)] transition-colors hover:text-[var(--luca-text-primary)]"
            >
              <div className="absolute inset-x-0 bottom-0 h-[1px] bg-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_12%,transparent)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <Icon name="Cast" size={14} variant="BoldDuotone" />
              <span className="tracking-widest">CROSS-LINK MIRROR</span>
            </button>

            <div className="mt-2 p-2 rounded bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)] border border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] flex gap-2">
              <Icon name="Target" size={12} className="text-rq-blue shrink-0 mt-0.5" variant="BoldDuotone" />
              <div className="font-mono text-[9px] leading-tight text-[var(--luca-text-secondary)]">
                Precision Mode Active. Tap screen to send raw events. Use
                Inspector to target meta-elements.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileScreenMirror;
