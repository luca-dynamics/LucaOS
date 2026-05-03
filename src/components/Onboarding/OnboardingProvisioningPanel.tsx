import React from "react";
import { motion } from "framer-motion";
import { Icon } from "../ui/Icon";
import type {
  ProvisionDownloadState,
  ProvisionRow,
  ProvisioningOutcome,
} from "../../services/onboarding/LocalProvisioningService";

interface OnboardingProvisioningPanelProps {
  accentTextColor: string;
  panelBorderColor: string;
  panelSurfaceColor: string;
  provisionRows: ProvisionRow[];
  downloadStates: Record<string, ProvisionDownloadState>;
  provisioningOutcome: ProvisioningOutcome;
  provisionError: boolean;
  onContinueWithoutVision: () => void;
  onRetryVisionCore: () => void;
  onRetryProvisioning: () => void;
}

export const OnboardingProvisioningPanel: React.FC<
  OnboardingProvisioningPanelProps
> = ({
  accentTextColor,
  panelBorderColor,
  panelSurfaceColor,
  provisionRows,
  downloadStates,
  provisioningOutcome,
  provisionError,
  onContinueWithoutVision,
  onRetryVisionCore,
  onRetryProvisioning,
}) => (
  <div className="space-y-6 animate-fade-in-up w-full max-w-md mx-auto relative z-10">
    <div className="text-center space-y-2 mb-8">
      <h2
        className="font-bold tracking-widest uppercase"
        style={{
          color: accentTextColor,
          fontSize: "clamp(1.2rem, 3.5vw, 1.5rem)",
        }}
      >
        Core Integration
      </h2>
      <p
        className="max-w-sm mx-auto"
        style={{ fontSize: "clamp(0.6rem, 1.8vw, 0.75rem)" }}
      >
        Preparing Luca's local reasoning, speech, vision, and memory stack.
      </p>
    </div>

    <div className="space-y-4">
      {provisionRows.map((row) => {
        const state = row.isExternalReady
          ? { progress: 100, status: "ready" }
          : downloadStates[row.modelId] || {
              progress: 0,
              status: "not_downloaded",
            };
        const isError = state.status === "error";
        const isReady = state.status === "ready";

        return (
          <div
            key={row.key}
            className="space-y-2 p-4 rounded-xl border backdrop-blur-md transition-all shadow-lg"
            style={{
              backgroundColor: panelSurfaceColor,
              borderColor: isError ? "#ef444450" : panelBorderColor,
            }}
          >
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
              <span
                style={{
                  color: "var(--app-text-main)",
                  opacity: 0.9,
                }}
              >
                {row.label}
              </span>
              <span
                style={{
                  color: isError
                    ? "#ef4444"
                    : isReady
                      ? accentTextColor
                      : "inherit",
                }}
              >
                {isError
                  ? "FAILED"
                  : isReady
                    ? "READY"
                    : `${Math.round(state.progress)}%`}
              </span>
            </div>
            <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${isError ? 100 : state.progress}%`,
                }}
                className="h-full"
                style={{
                  backgroundColor: isError ? "#ef4444" : accentTextColor,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>

    {provisioningOutcome === "degraded_ready" && (
      <div
        className="space-y-4 p-4 rounded-xl border backdrop-blur-md shadow-lg"
        style={{
          backgroundColor: panelSurfaceColor,
          borderColor: panelBorderColor,
        }}
      >
        <div className="space-y-2 text-center">
          <p
            className="text-xs font-bold uppercase tracking-[0.28em]"
            style={{ color: accentTextColor }}
          >
            Degraded Local Ready
          </p>
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: "var(--app-text-muted)" }}
          >
            Luca&apos;s local reasoning, voice, and memory stack are ready.
            Vision can be repaired later without blocking setup.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onContinueWithoutVision}
            className="w-full border rounded-xl py-4 uppercase tracking-widest text-sm font-bold transition-all backdrop-blur-md flex items-center justify-center gap-2"
            style={{
              borderColor: panelBorderColor,
              color: accentTextColor,
              backgroundColor: panelSurfaceColor,
            }}
          >
            <Icon name="ArrowRight2" variant="Linear" size={16} />
            Continue Without Vision
          </button>
          <button
            type="button"
            onClick={onRetryVisionCore}
            className="w-full border rounded-xl py-4 uppercase tracking-widest text-sm font-bold transition-all backdrop-blur-md flex items-center justify-center gap-2"
            style={{
              borderColor: panelBorderColor,
              color: "var(--app-text-main)",
              backgroundColor: panelSurfaceColor,
            }}
          >
            <Icon name="Refresh" variant="Linear" size={16} />
            Retry Vision Core
          </button>
        </div>
      </div>
    )}

    {provisionError && (
      <button
        type="button"
        onClick={onRetryProvisioning}
        className="w-full max-w-sm mx-auto border border-red-500/50 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl py-4 uppercase tracking-widest text-sm font-bold transition-all backdrop-blur-md mt-6 flex items-center justify-center gap-2"
      >
        <Icon name="Activity" variant="Linear" size={16} />
        Retry Neural Sync
      </button>
    )}
  </div>
);
