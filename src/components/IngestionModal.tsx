import React, { useState } from "react";
import { Icon } from "./ui/Icon";

interface Props {
  onClose: () => void;
  onIngest: (url: string) => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

const IngestionModal: React.FC<Props> = ({ onClose, onIngest, theme }) => {
  const themePrimary = theme?.primary || "text-green-400";
  const themeBorder = theme?.border || "border-green-500";
  const themeHex = theme?.hex || "#22c55e";
  const [url, setUrl] = useState("");

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 glass-blur animate-in fade-in duration-200 p-4">
      <div
        className={`w-full max-w-lg bg-black/40 glass-blur border ${themeBorder}/30 rounded-lg p-4 sm:p-6 relative overflow-hidden`}
        style={{ boxShadow: `0 0 80px -20px ${themeHex}40` }}
      >
        {/* Liquid background effect 1 (Center) */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none transition-all duration-700 z-0"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${themeHex}25, transparent 60%)`,
            filter: "blur(40px)",
          }}
        />
        {/* Liquid background effect 2 (Top Right Offset) */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none transition-all duration-700 z-0"
          style={{
            background: `radial-gradient(circle at 80% 20%, ${themeHex}15, transparent 50%)`,
            filter: "blur(40px)",
          }}
        />
        <div
          className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent opacity-50 z-10`}
          style={{
            background: `linear-gradient(to right, transparent, ${themeHex}, transparent)`,
          }}
        ></div>

        {/* Header */}
        <div
          className={`h-16 border-b ${themeBorder}/50 flex items-center justify-between px-6 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-6 relative z-10`}
          style={{ backgroundColor: `${themeHex}1F` }}
        >
          <div className="flex items-center gap-4">
            <div
              className={`p-2 rounded border ${themeBorder}/50 ${themePrimary}`}
              style={{ backgroundColor: `${themeHex}1F` }}
            >
              <Icon name="Programming" size={24} variant="BoldDuotone" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white tracking-widest">
                KNOWLEDGE INGESTION
              </h2>
              <div
                className={`text-[10px] font-mono ${themePrimary} flex gap-4`}
              >
                <span>INTEGRATE EXTERNAL OPEN SOURCE INTELLIGENCE</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <Icon name="Close" size={24} variant="BoldDuotone" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-400">
              TARGET REPOSITORY URL
            </label>
            <div className="relative">
              <Icon
                name="Programming"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                size={16}
                variant="BoldDuotone"
              />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/username/repo"
                className={`w-full bg-black border border-slate-800 rounded p-3 pl-10 text-sm font-mono ${themePrimary} focus:outline-none placeholder:text-slate-700`}
                style={
                  {
                    borderColor: "rgb(30 41 59)",
                    "--tw-ring-color": themeHex,
                  } as any
                }
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = themeHex;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgb(30 41 59)";
                }}
                autoFocus
              />
            </div>
          </div>

          <div
            className={`p-4 border ${themeBorder}/30 rounded text-[10px] font-mono text-slate-400`}
            style={{ backgroundColor: `${themeHex}0A` }}
          >
            <div
              className={`flex items-center gap-2 ${themePrimary} mb-2 font-bold`}
            >
              <Icon name="Database" size={12} variant="BoldDuotone" /> LUCA PROTOCOL:
            </div>
            <ul className="space-y-1 list-disc pl-4">
              <li>Deep recursive scan of source trees.</li>
              <li>Extracts core logic patterns (Python/JS/Rust).</li>
              <li>Vectorizes capabilities for autonomous usage.</li>
              <li>Auto-generates wrapper scripts via Engineer Persona.</li>
            </ul>
          </div>

          <button
            onClick={() => {
              if (url) onIngest(url);
            }}
            disabled={!url}
            className={`w-full py-4 font-bold tracking-[0.2em] flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            style={{
              backgroundColor: themeHex,
              color: "#000000",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${themeHex}cc`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = themeHex;
            }}
          >
            <Icon name="Download" size={18} variant="BoldDuotone" /> INITIATE TRANSFER
          </button>
        </div>
      </div>
    </div>
  );
};

export default IngestionModal;
