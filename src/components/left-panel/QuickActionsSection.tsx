import React from "react";
import { Icon } from "../ui/Icon";

interface QuickActionsSectionProps {
  isLight: boolean;
  isLightCream: boolean;
  onAgentMode: () => void;
  onCognitiveEngine: () => void;
  onLockdown: () => void;
}

/**
 * QUICK ACTIONS section (formerly "Core Actions").
 *
 * Lockdown remains a high-authority safety action that calls the existing
 * `initiateLockdown` tool (toolRegistry: SecurityLevel.LEVEL_3). Its behaviour
 * is intentionally unchanged here.
 *
 * TODO: direct high-risk actions like Lockdown should eventually route through
 * the governed action request / provenance gate services rather than calling
 * executeTool directly. Not wired in this UI refactor.
 */
const QuickActionsSection: React.FC<QuickActionsSectionProps> = ({
  isLight,
  isLightCream,
  onAgentMode,
  onCognitiveEngine,
  onLockdown,
}) => {
  const actionTileStyle: React.CSSProperties = {
    backgroundColor: isLightCream
      ? "rgba(108, 106, 88, var(--app-bg-opacity, 0.9))"
      : isLight
        ? "rgba(0, 0, 0, calc(var(--app-bg-opacity, 0.3) * 0.3))"
        : "rgba(0, 0, 0, calc(var(--app-bg-opacity, 0.3) * 0.4))",
  };

  return (
    <div className="p-5 rounded-lg relative overflow-hidden group glass-blur bg-black/20 shadow-xl animate-in slide-in-from-left duration-700">
      <div className="absolute top-0 right-0 p-3 opacity-30 text-[var(--app-text-main)]">
        <Icon name="Pulse" size={14} variant="BoldDuotone" />
      </div>
      <div
        className={`flex items-center gap-3 mb-5 text-[var(--app-text-main)] ${
          isLight ? "opacity-90" : ""
        }`}
      >
        <Icon
          name="EyeScan"
          size={18}
          variant="BoldDuotone"
          className={isLight ? "opacity-100" : "opacity-70"}
        />
        <h2 className="font-semibold text-xs tracking-tight">
          Quick actions
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onAgentMode}
          className="p-3 min-h-[60px] flex flex-col gap-1 transition-all text-left group/btn touch-manipulation rounded-lg border glass-blur hover:opacity-90 active:opacity-100"
          style={actionTileStyle}
        >
          <span
            className={`text-[10px] font-medium ${
              isLightCream ? "text-[#E5E1CD]/80" : "text-[var(--app-text-muted)]"
            } ${isLight && !isLightCream ? "opacity-70" : ""}`}
          >
            Agent
          </span>
          <span
            className={`text-xs font-semibold ${
              isLightCream ? "text-[#E5E1CD]" : "text-[var(--app-text-main)]"
            } tracking-tight`}
          >
            Mode
          </span>
          <div className="h-0.5 w-full bg-[var(--app-border-main)] mt-2 overflow-hidden rounded-full">
            <div className="h-full w-full -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-500 bg-[var(--app-text-main)] opacity-30" />
          </div>
        </button>

        <button
          type="button"
          onClick={onCognitiveEngine}
          className="p-3 min-h-[60px] flex flex-col gap-1 transition-all text-left group/btn touch-manipulation rounded-lg border glass-blur hover:opacity-90 active:opacity-100"
          style={actionTileStyle}
        >
          <span
            className={`text-[10px] font-medium ${
              isLightCream ? "text-[#E5E1CD]/80" : "text-[var(--app-text-muted)]"
            } ${isLight && !isLightCream ? "opacity-70" : ""}`}
          >
            Cognitive
          </span>
          <span
            className={`text-xs font-semibold ${
              isLightCream ? "text-[#E5E1CD]" : "text-[var(--app-text-main)]"
            } tracking-tight`}
          >
            Engine
          </span>
          <div className="h-0.5 w-full bg-[var(--app-border-main)] mt-2 overflow-hidden rounded-full">
            <div className="h-full w-full -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-500 bg-[var(--app-text-main)] opacity-30" />
          </div>
        </button>

        {/* MANUAL LOCKDOWN TRIGGER — safety action (LEVEL_3). Behaviour unchanged. */}
        <button
          type="button"
          onClick={onLockdown}
          className={`col-span-2 py-3.5 flex items-center justify-center gap-3 transition-all group/btn rounded-lg border ${
            isLightCream ? "" : "glass-blur hover:opacity-90 active:opacity-100"
          }`}
          style={{
            backgroundColor: isLightCream
              ? "rgba(180, 80, 80, 0.15)"
              : isLight
                ? "rgba(239, 68, 68, calc(var(--app-bg-opacity, 0.3) * 0.5))"
                : "rgba(239, 68, 68, calc(var(--app-bg-opacity, 0.3) * 0.3))",
            borderColor: isLightCream ? "rgba(150, 40, 40, 0.4)" : "var(--app-border-main)",
          }}
        >
          <Icon
            name="Lock"
            size={14}
            color={isLightCream ? "#991b1b" : "#ef4444"}
            className="group-hover/btn:animate-bounce transition-all"
            variant="BoldDuotone"
          />
          <span
            className="text-[11px] font-medium transition-colors"
            style={{ color: isLightCream ? "#991b1b" : "#ef4444" }}
          >
            Initiate lockdown
          </span>
        </button>
      </div>
    </div>
  );
};

export default QuickActionsSection;
