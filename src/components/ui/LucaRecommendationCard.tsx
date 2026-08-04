import React from "react";
import { LucaStateIcon } from "./LucaStateIcon";
import { isDarkSkin } from "../../config/lucaSkins";

export interface LucaRecommendationCardProps {
  title: string;
  description: string;
  confidenceScore?: number;
  acceptLabel?: string;
  dismissLabel?: string;
  onAccept?: () => void;
  onDismiss?: () => void;
  skinId?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * LucaRecommendationCard — Proactive agent recommendation card primitive.
 * Beautiful UI Primitive #08, tailored to LucaOS with skin awareness.
 */
export const LucaRecommendationCard: React.FC<LucaRecommendationCardProps> = ({
  title,
  description,
  confidenceScore,
  acceptLabel = "Accept Recommendation",
  dismissLabel = "Dismiss",
  onAccept,
  onDismiss,
  skinId,
  className = "",
  style = {},
}) => {
  const dark = isDarkSkin(skinId);

  return (
    <div
      className={`rounded-2xl border p-4 shadow-lg transition-all duration-200 ${className}`}
      style={{
        background: dark ? "rgba(30, 36, 46, 0.8)" : "rgba(255, 255, 255, 0.8)",
        borderColor: dark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
        WebkitBackdropFilter: "blur(16px)",
        backdropFilter: "blur(16px)",
        fontFamily: "var(--app-font-sans, system-ui, sans-serif)",
        maxWidth: 420,
        ...style,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <LucaStateIcon status="streaming" size={18} skinId={skinId} />
          <h4 className="text-sm font-semibold leading-snug">{title}</h4>
        </div>
        {confidenceScore !== undefined && (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold"
            style={{
              background: dark ? "rgba(56, 189, 248, 0.2)" : "rgba(2, 132, 199, 0.1)",
              color: dark ? "#38bdf8" : "#0284c7",
            }}
          >
            {Math.round(confidenceScore * 100)}% match
          </span>
        )}
      </div>

      <p
        className="text-xs mb-4 leading-relaxed"
        style={{ color: dark ? "#94a3b8" : "#64748b" }}
      >
        {description}
      </p>

      <div className="flex items-center gap-2">
        {onAccept && (
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm hover:opacity-90 transition-opacity"
          >
            {acceptLabel}
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="px-3 py-2 rounded-xl text-xs font-medium border border-white/10 opacity-70 hover:opacity-100 transition-opacity"
          >
            {dismissLabel}
          </button>
        )}
      </div>
    </div>
  );
};
