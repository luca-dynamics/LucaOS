import React, { useState } from "react";
import { LucaStateIcon } from "./LucaStateIcon";
import { isDarkSkin } from "../../config/lucaSkins";

export interface LucaApprovalOption {
  id: string;
  label: string;
  description?: string;
}

export interface LucaApprovalCardProps {
  title: string;
  description?: string;
  options?: LucaApprovalOption[];
  onSelectOption?: (optionId: string, customInput?: string) => void;
  onDismiss?: () => void;
  allowCustomInput?: boolean;
  customPlaceholder?: string;
  skinId?: string;
  currentStep?: number;
  totalSteps?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * LucaApprovalCard — Human-in-the-loop permission & approval card.
 * Beautiful UI Primitive #04, tailored to LucaOS with skin awareness and LucaStateIcon.
 */
export const LucaApprovalCard: React.FC<LucaApprovalCardProps> = ({
  title,
  description,
  options = [],
  onSelectOption,
  onDismiss,
  allowCustomInput = true,
  customPlaceholder = "Type something...",
  skinId,
  currentStep = 1,
  totalSteps = 1,
  className = "",
  style = {},
}) => {
  const dark = isDarkSkin(skinId);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");

  const handleOptionClick = (optionId: string) => {
    setSelectedOptionId(optionId);
    onSelectOption?.(optionId, customText);
  };

  const handleCustomSubmit = () => {
    if (customText.trim()) {
      onSelectOption?.("custom", customText.trim());
    }
  };

  return (
    <div
      className={`rounded-2xl border p-4 shadow-lg transition-all duration-200 ${className}`}
      style={{
        background: dark ? "rgba(30, 36, 46, 0.75)" : "rgba(255, 255, 255, 0.75)",
        borderColor: dark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
        WebkitBackdropFilter: "blur(16px)",
        backdropFilter: "blur(16px)",
        color: dark ? "#f8fafc" : "#0f172a",
        fontFamily: "var(--app-font-sans, system-ui, sans-serif)",
        maxWidth: 420,
        ...style,
      }}
    >
      {/* Header with skin-aware LucaStateIcon in approval mode */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <LucaStateIcon status="approval" size={18} skinId={skinId} />
          <h4 className="text-sm font-semibold leading-snug">{title}</h4>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss approval card"
            className="text-xs opacity-60 hover:opacity-100 p-1 rounded-md transition-opacity"
          >
            ✕
          </button>
        )}
      </div>

      {description && (
        <p
          className="text-xs mb-3 leading-relaxed"
          style={{ color: dark ? "#94a3b8" : "#64748b" }}
        >
          {description}
        </p>
      )}

      {/* Option choices */}
      {options.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {options.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleOptionClick(opt.id)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border text-left text-xs font-medium transition-all duration-150"
                style={{
                  background: isSelected
                    ? dark
                      ? "rgba(245, 158, 11, 0.15)"
                      : "rgba(245, 158, 11, 0.1)"
                    : dark
                    ? "rgba(255, 255, 255, 0.04)"
                    : "rgba(0, 0, 0, 0.03)",
                  borderColor: isSelected
                    ? "#f59e0b"
                    : dark
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 0, 0, 0.08)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0"
                    style={{
                      borderColor: isSelected ? "#f59e0b" : "currentColor",
                      opacity: isSelected ? 1 : 0.4,
                    }}
                  >
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                    )}
                  </span>
                  <span>{opt.label}</span>
                </div>
                {opt.description && (
                  <span
                    className="text-[11px]"
                    style={{ color: dark ? "#94a3b8" : "#64748b" }}
                  >
                    {opt.description}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Custom Write-in Field */}
      {allowCustomInput && (
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCustomSubmit();
            }}
            placeholder={customPlaceholder}
            className="flex-1 px-3 py-2 rounded-xl text-xs border outline-none bg-transparent"
            style={{
              borderColor: dark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
              color: dark ? "#f8fafc" : "#0f172a",
            }}
          />
          {customText.trim() && (
            <button
              type="button"
              onClick={handleCustomSubmit}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-white bg-[#f59e0b] shadow-sm hover:opacity-90 transition-opacity"
            >
              Submit
            </button>
          )}
        </div>
      )}

      {/* Step Progress Footer */}
      {totalSteps > 1 && (
        <div className="flex items-center justify-between pt-2 border-t text-[11px] font-mono border-white/10 opacity-70">
          <span>Step {currentStep} of {totalSteps}</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <span
                key={idx}
                className="w-1.5 h-1.5 rounded-full transition-all"
                style={{
                  background: idx + 1 === currentStep ? "#f59e0b" : "currentColor",
                  opacity: idx + 1 === currentStep ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
