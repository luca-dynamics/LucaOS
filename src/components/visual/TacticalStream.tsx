import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { TacticalLog } from "../../types";
import { setHexAlpha } from "../../config/themeColors";

interface TacticalStreamProps {
  logs: TacticalLog[];
  themeColor: string;
  title?: string;
  status?: string;
  onClear?: () => void;
  isLight?: boolean;
}

/**
 * Tactical Stream Monitor
 * Dynamic feed of system operations and agentic trajectories.
 * 100% Theme-Resilient: Uses CSS variables for reactive contrast.
 */
const TacticalStream: React.FC<TacticalStreamProps> = ({
  logs,
  themeColor,
  title = "TACTICAL_CONTROL_FEED",
  status = "LINK_ESTABLISHED",
  onClear,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    // Random glitch effect when logs arrive
    if (logs.length > 0) {
      setGlitch(true);
      const timer = setTimeout(() => setGlitch(false), 150);
      return () => clearTimeout(timer);
    }
  }, [logs]);

  const getTypeColor = (type: TacticalLog["type"]) => {
    switch (type) {
      case "ERROR":
      case "CRITICAL":
        return "#ef4444";
      case "WARN":
        return "#f59e0b";
      case "SUCCESS":
        return "#22C55E";
      case "INFO":
      default:
        return themeColor;
    }
  };

  return (
    <div
      className="relative w-full h-full flex flex-col font-mono overflow-hidden transition-all duration-500 rounded-xl border animate-in fade-in zoom-in-95 duration-700 shadow-2xl glass-blur"
      style={{
        backgroundColor: "var(--app-bg-tint)",
        borderColor: "var(--app-border-main)",
        boxShadow: `0 0 40px ${setHexAlpha(themeColor, 0.1)}`,
      }}
    >
      {/* Header Bar */}
      <div
        className="h-12 border-b flex items-center justify-between px-6 bg-black/20 glass-blur"
        style={{
          borderColor: "var(--app-border-main)",
        }}
      >
        <div className="flex items-center gap-4">
          <Icon
            name="Terminal"
            size={18}
            className={glitch ? "animate-pulse" : ""}
            style={{ color: themeColor }}
          />
          <div className="flex flex-col">
            <span
              className="text-[10px] tracking-[0.4em] font-bold uppercase text-[var(--app-text-main)] opacity-80"
            >
              {title}
            </span>
            <span
              className="text-[9px] opacity-50"
              style={{ color: themeColor }}
            >
              {status} / {logs.length} OPS_LOGGED
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="text-[10px] font-bold px-2 py-0.5 rounded border animate-pulse"
            style={{
              borderColor: setHexAlpha(themeColor, 0.4),
              backgroundColor: setHexAlpha(themeColor, 0.1),
              color: themeColor,
            }}
          >
            LIVE_LINK
          </div>
          {onClear && (
            <button
              onClick={onClear}
              className="text-[10px] opacity-40 hover:opacity-100 transition-opacity uppercase tracking-tighter"
              style={{ color: "var(--app-text-main)" }}
            >
              [PURGE]
            </button>
          )}
        </div>
      </div>

      {/* Main Stream Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar relative"
      >
        {logs.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 opacity-20">
            <Icon
              name="Cpu"
              size={48}
              style={{ color: themeColor }}
              className="animate-spin-slow"
            />
            <span
              className="text-[10px] tracking-[0.5em] font-bold"
              style={{ color: themeColor }}
            >
              AWAITING_INPUT_STREAM
            </span>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="group flex gap-4 animate-in slide-in-from-left-4 fade-in duration-300"
            >
              <div className="flex flex-col items-center pt-1 flex-shrink-0">
                <div
                  className="text-[9px] opacity-40 font-bold mb-1"
                  style={{ color: "var(--app-text-main)" }}
                >
                  {log.timestamp}
                </div>
                <div className="w-px h-full bg-white/10 group-last:bg-transparent" />
              </div>

              <div className="flex flex-col flex-1 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-sm font-black uppercase tracking-widest"
                    style={{
                      backgroundColor: setHexAlpha(
                        getTypeColor(log.type),
                        0.15,
                      ),
                      color: getTypeColor(log.type),
                      border: `1px solid ${setHexAlpha(getTypeColor(log.type), 0.25)}`,
                    }}
                  >
                    {log.type}
                  </span>
                  <span
                    className="text-[10px] font-bold opacity-60 uppercase tracking-tighter text-[var(--app-text-main)]"
                  >
                    {log.source || "SYSTEM_MODULE"}
                  </span>
                </div>
                <div
                  className="text-sm leading-relaxed tracking-wide font-mono transition-all group-hover:pl-2"
                  style={{
                    color: "var(--app-text-main)",
                    borderLeft: `2px solid transparent`,
                    opacity: 0.9
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderLeftColor = getTypeColor(
                      log.type,
                    ))
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderLeftColor = "transparent")
                  }
                >
                  {log.message.startsWith("data:image") ? (
                    <img
                      src={log.message}
                      alt="Sandbox Generated Graphic"
                      className="mt-2 max-w-full rounded border border-white/10"
                    />
                  ) : (
                    log.message
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer / Metric Strip */}
      <div
        className="h-8 border-t flex items-center justify-between px-6 bg-black/40 glass-blur opacity-80"
        style={{
          borderColor: "var(--app-border-main)",
        }}
      >
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <Icon name="Activity" size={10} style={{ color: themeColor }} />
            <span
              className="text-[8px] opacity-50 uppercase tracking-widest text-[var(--app-text-main)]"
            >
              Bandwidth: 1.2 GB/s
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="Cpu" size={10} style={{ color: themeColor }} />
            <span
              className="text-[8px] opacity-50 uppercase tracking-widest text-[var(--app-text-main)]"
            >
              Cores: 128 (HYPER_SYNTH)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Icon name="Target" size={10} style={{ color: themeColor }} />
          <span
            className="text-[8px] opacity-50 uppercase tracking-widest text-[var(--app-text-main)]"
          >
            Target: {status}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TacticalStream;
