import React from "react";
import { Icon } from "../ui/Icon";

export interface LocalPlanReviewItem {
  key: string;
  title: string;
  subtitle: string;
  modelId: string;
  label: string;
  optional?: boolean;
  sizeFormatted?: string;
}

interface OnboardingLocalPlanReviewPanelProps {
  accentTextColor: string;
  panelBorderColor: string;
  panelSurfaceColor: string;
  tintedPanelGradient: string;
  estimatedDownload: string;
  showTechnicalLocalPlan: boolean;
  skipVisionForNow: boolean;
  reviewItems: LocalPlanReviewItem[];
  onToggleTechnical: () => void;
  onToggleSkipVision: (checked: boolean) => void;
  onConfirm: () => void;
  onBack: () => void;
}

export const OnboardingLocalPlanReviewPanel: React.FC<
  OnboardingLocalPlanReviewPanelProps
> = ({
  accentTextColor,
  panelBorderColor,
  panelSurfaceColor,
  tintedPanelGradient,
  estimatedDownload,
  showTechnicalLocalPlan,
  skipVisionForNow,
  reviewItems,
  onToggleTechnical,
  onToggleSkipVision,
  onConfirm,
  onBack,
}) => (
  <div className="space-y-2.5 sm:space-y-3 animate-fade-in-up w-full max-w-[min(92vw,700px)] mx-auto relative z-10">
    <div className="text-center space-y-1 sm:space-y-1.5">
      <div
        className="mx-auto flex items-center justify-center rounded-2xl border"
        style={{
          width: "clamp(2rem, 6.2vmin, 2.8rem)",
          height: "clamp(2rem, 6.2vmin, 2.8rem)",
          borderColor: panelBorderColor,
          backgroundColor: panelSurfaceColor,
        }}
      >
        <Icon
          name="Cpu"
          variant="Linear"
          style={{
            color: accentTextColor,
            width: "50%",
            height: "50%",
          }}
        />
      </div>
      <h2
        className="font-bold tracking-widest uppercase"
        style={{
          color: accentTextColor,
          fontSize: "clamp(0.76rem, 1.8vw, 1rem)",
        }}
      >
        Recommended Local Setup
      </h2>
      <p
        className="max-w-2xl mx-auto leading-relaxed"
        style={{
          color: "var(--app-text-main)",
          opacity: 0.88,
          fontSize: "clamp(0.55rem, 0.95vw, 0.68rem)",
        }}
      >
        Luca found a local stack that fits your machine. You can install the
        full private experience, or keep it lighter and skip vision for now.
      </p>
    </div>

    <div
      className="rounded-2xl border p-2 sm:p-2.5 backdrop-blur-md space-y-2 sm:space-y-2.5"
      style={{
        borderColor: panelBorderColor,
        backgroundColor: panelSurfaceColor,
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
        <div>
          <div
            className="font-bold uppercase tracking-widest"
            style={{ color: "var(--app-text-main)", fontSize: "0.62rem" }}
          >
            Luca Recommendation
          </div>
          <div
            style={{
              color: "var(--app-text-muted)",
              fontSize: "0.58rem",
            }}
          >
            Estimated download now:{" "}
            <strong style={{ color: "var(--app-text-main)" }}>
              {estimatedDownload}
            </strong>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleTechnical}
          className="rounded-xl border px-2 sm:px-2.5 py-1 uppercase tracking-widest text-[7px] sm:text-[8px] font-bold transition-all self-stretch sm:self-auto"
          style={{
            borderColor: panelBorderColor,
            backgroundColor: panelSurfaceColor,
            color: "var(--app-text-main)",
          }}
        >
          {showTechnicalLocalPlan
            ? "Hide Technical Stack"
            : "Show Technical Stack"}
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-1.5 sm:gap-2">
        {reviewItems.map((item) => {
          const isVisionSkipped = item.key === "vision" && skipVisionForNow;

          return (
            <div
              key={item.key}
              className="rounded-2xl border p-2 sm:p-2.5 space-y-1 backdrop-blur-md min-h-[64px] sm:min-h-[78px]"
              style={{
                borderColor: panelBorderColor,
                backgroundColor: panelSurfaceColor,
                opacity: isVisionSkipped ? 0.65 : 1,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div
                    className="font-bold uppercase tracking-widest"
                    style={{
                      color: "var(--app-text-main)",
                      fontSize: "0.5rem",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    className="hidden sm:block"
                    style={{
                      color: "var(--app-text-muted)",
                      fontSize: "0.53rem",
                      lineHeight: 1.16,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.subtitle}
                  </div>
                </div>
                {item.optional && (
                  <span
                    className="hidden sm:inline-flex px-1.5 py-0.5 rounded-full border uppercase tracking-widest text-[6px] sm:text-[7px] font-bold shrink-0"
                    style={{
                      borderColor: panelBorderColor,
                      color: "var(--app-text-muted)",
                    }}
                  >
                    Optional
                  </span>
                )}
              </div>
              <div
                className="font-semibold"
                style={{
                  color: "var(--app-text-main)",
                  fontSize: "0.54rem",
                  lineHeight: 1.16,
                }}
              >
                {isVisionSkipped ? "Skip for now" : item.label}
              </div>
              {showTechnicalLocalPlan && !isVisionSkipped && (
                <div
                  style={{
                    color: "var(--app-text-muted)",
                    fontSize: "0.52rem",
                    lineHeight: 1.18,
                  }}
                >
                  <div>Model ID: {item.modelId}</div>
                  {item.sizeFormatted && <div>Download: {item.sizeFormatted}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <label
        className="flex items-start gap-2 rounded-2xl border p-2 sm:p-2.5 cursor-pointer"
        style={{
          borderColor: panelBorderColor,
          backgroundColor: panelSurfaceColor,
        }}
      >
        <input
          type="checkbox"
          checked={skipVisionForNow}
          onChange={(e) => onToggleSkipVision(e.target.checked)}
          className="mt-1"
        />
        <div>
          <div
            className="font-bold uppercase tracking-widest"
            style={{ color: "var(--app-text-main)", fontSize: "0.56rem" }}
          >
            Keep it lighter
          </div>
          <div
            style={{
              color: "var(--app-text-muted)",
              fontSize: "0.54rem",
              lineHeight: 1.16,
            }}
          >
            Skip the local vision download for now. Luca will still install
            local chat, voice, and memory support first.
          </div>
        </div>
      </label>
    </div>

    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={onConfirm}
        className="w-full max-w-xs mx-auto rounded-2xl py-2 sm:py-2.5 border uppercase tracking-widest text-[9px] sm:text-[10px] font-bold transition-all"
        style={{
          borderColor: panelBorderColor,
          backgroundColor: panelSurfaceColor,
          backgroundImage: tintedPanelGradient,
          color: "var(--app-text-main)",
        }}
      >
        Install Recommended Local Stack
      </button>

      <button
        type="button"
        onClick={onBack}
        className="w-full max-w-xs mx-auto uppercase tracking-widest text-[7px] sm:text-[8px] font-bold transition-all"
        style={{ color: "var(--app-text-muted)" }}
      >
        Back to Core Choice
      </button>
    </div>
  </div>
);
