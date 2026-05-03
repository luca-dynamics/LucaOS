import React from "react";
import { Icon } from "../ui/Icon";

interface SharedPanelProps {
  accentTextColor: string;
  panelBorderColor: string;
  panelSurfaceColor: string;
}

export const HardwareScanPanel: React.FC<{
  accentTextColor: string;
}> = ({ accentTextColor }) => (
  <div className="text-center space-y-6 animate-fade-in-up w-full max-w-sm mx-auto">
    <div className="space-y-6">
      <div
        className="border-4 border-t-transparent rounded-full animate-pulse animate-spin mx-auto mix-blend-screen"
        style={{
          width: "clamp(2.5rem, 10vmin, 4.5rem)",
          height: "clamp(2.5rem, 10vmin, 4.5rem)",
          borderColor: accentTextColor,
          borderTopColor: "transparent",
        }}
      />
      <div className="space-y-2">
        <h2
          className="font-bold tracking-widest uppercase"
          style={{
            color: accentTextColor,
            fontSize: "clamp(1rem, 3vw, 1.25rem)",
          }}
        >
          Hardware Scan
        </h2>
        <p style={{ fontSize: "clamp(0.6rem, 1.5vw, 0.75rem)" }}>
          Analyzing architecture tensors...
        </p>
      </div>
    </div>
  </div>
);

interface OllamaInstallPanelProps extends SharedPanelProps {
  ambientThemeColor: string;
  isActivating: boolean;
  onInstall: () => void;
  onUseNative: () => void;
}

export const OllamaInstallPanel: React.FC<OllamaInstallPanelProps> = ({
  accentTextColor,
  panelBorderColor,
  panelSurfaceColor,
  ambientThemeColor,
  isActivating,
  onInstall,
  onUseNative,
}) => (
  <div className="space-y-6 animate-fade-in-up w-full max-w-md mx-auto relative z-10">
    <div
      className="p-8 rounded-3xl border backdrop-blur-xl text-center space-y-8 shadow-2xl"
      style={{
        borderColor: panelBorderColor,
        backgroundColor: panelSurfaceColor,
      }}
    >
      <div
        className="rounded-2xl mx-auto flex items-center justify-center bg-black/30 border-2"
        style={{
          borderColor: panelBorderColor,
          width: "clamp(3rem, 12vmin, 5rem)",
          height: "clamp(3rem, 12vmin, 5rem)",
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

      <div className="space-y-3">
        <h2
          className="text-2xl font-bold tracking-widest uppercase"
          style={{ color: accentTextColor }}
        >
          Upgrade to Ollama?
        </h2>
        <p className="text-sm leading-relaxed">
          I&apos;ve detected that your hardware is powerful enough to run
          high-fidelity models locally.
          <br className="my-2" />
          Would you like me to install and configure **Ollama**? It will allow
          me to run much smarter models with near-zero latency.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <button
          type="button"
          onClick={onInstall}
          disabled={isActivating}
          className="w-full max-w-md mx-auto flex items-center justify-center gap-3 rounded-2xl py-5 border uppercase tracking-widest text-sm font-bold transition-all relative group overflow-hidden"
          style={{
            backgroundColor: panelSurfaceColor,
            borderColor: panelBorderColor,
          }}
        >
          <div
            className="absolute inset-0 opacity-20 mix-blend-screen transition-opacity group-hover:opacity-40"
            style={{ backgroundColor: ambientThemeColor }}
          />
          {isActivating ? (
            <div
              className="w-5 h-5 border-2 rounded-full animate-spin"
              style={{
                borderColor: panelBorderColor,
                borderTopColor: "var(--app-text-main)",
              }}
            />
          ) : (
            <Icon
              name="Sparkles"
              variant="Bold"
              size={18}
              className="text-yellow-400"
            />
          )}
          <span style={{ color: "var(--app-text-main)" }}>
            {isActivating ? "Installing..." : "Yes, Let's do it"}
          </span>
        </button>

        <button
          type="button"
          onClick={onUseNative}
          className="w-full max-w-md mx-auto text-[10px] uppercase tracking-widest font-bold transition-all"
        >
          No thanks, use native models
        </button>
      </div>
    </div>
  </div>
);

interface OllamaWakePanelProps extends SharedPanelProps {
  ambientThemeColor: string;
  targetBrainModel: string | null;
  onResumeScan: () => void;
  onUseNative: () => void;
}

export const OllamaWakePanel: React.FC<OllamaWakePanelProps> = ({
  accentTextColor,
  panelBorderColor,
  panelSurfaceColor,
  ambientThemeColor,
  targetBrainModel,
  onResumeScan,
  onUseNative,
}) => (
  <div className="space-y-6 animate-fade-in-up w-full max-w-md mx-auto relative z-10">
    <div
      className="p-6 rounded-2xl border backdrop-blur-md text-center space-y-6 shadow-xl"
      style={{
        borderColor: panelBorderColor,
        backgroundColor: panelSurfaceColor,
      }}
    >
      <div
        className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center border"
        style={{
          borderColor: panelBorderColor,
          backgroundColor: panelSurfaceColor,
        }}
      >
        <Icon
          name="Cpu"
          variant="Linear"
          className="w-6 h-6"
          style={{ color: accentTextColor }}
        />
      </div>

      <div className="space-y-2">
        <h2
          className="text-xl font-bold tracking-widest uppercase"
          style={{ color: accentTextColor }}
        >
          Ollama Detected (Sleeping)
        </h2>
        <p className="text-xs leading-relaxed">
          Luca has detected an internal architecture capable of running{" "}
          <strong>{targetBrainModel}</strong>.
          <br className="my-2" />
          To achieve maximum raw speed and bypass the heavy native software
          download, please open your Mac terminal and execute:
        </p>
      </div>

      <div
        className="rounded-lg p-3 font-mono text-sm border font-bold tracking-widest select-all"
        style={{
          backgroundColor: panelSurfaceColor,
          borderColor: panelBorderColor,
          color: "var(--app-text-main)",
        }}
      >
        ollama serve
      </div>

      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={onResumeScan}
          className="w-full max-w-md mx-auto flex items-center justify-center gap-2 rounded-xl py-3 border uppercase tracking-widest text-[10px] font-bold transition-all relative group overflow-hidden"
          style={{
            backgroundColor: panelSurfaceColor,
            borderColor: panelBorderColor,
          }}
        >
          <div
            className="absolute inset-0 opacity-20 mix-blend-screen transition-opacity group-hover:opacity-40"
            style={{ backgroundColor: ambientThemeColor }}
          />
          <Icon
            name="Activity"
            variant="Linear"
            size={12}
            style={{ color: accentTextColor }}
          />
          <span style={{ color: "var(--app-text-main)" }}>
            Resume Hardware Scan
          </span>
        </button>

        <button
          type="button"
          onClick={onUseNative}
          className="w-full max-w-md mx-auto text-[10px] uppercase tracking-widest font-bold transition-colors"
        >
          Proceed with Native Download
        </button>
      </div>
    </div>
  </div>
);

export const CalibrationPanel: React.FC<{ accentTextColor: string }> = ({
  accentTextColor,
}) => (
  <div className="text-center space-y-6 animate-fade-in">
    <div className="space-y-6 animate-pulse">
      <div
        className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto"
        style={{
          borderColor: accentTextColor,
          borderTopColor: "transparent",
        }}
      />
      <div className="space-y-2">
        <h2
          className="text-xl font-bold tracking-widest uppercase"
          style={{ color: accentTextColor }}
        >
          Calibrating Pathways
        </h2>
        <p className="text-xs">Optimizing cognitive tensors...</p>
      </div>
    </div>
  </div>
);

export const CompletePanel: React.FC<{ accentTextColor: string }> = ({
  accentTextColor,
}) => (
  <div className="flex flex-col items-center justify-center space-y-6 animate-fade-in-up">
    <div
      className="border-4 rounded-full flex items-center justify-center backdrop-blur-xl"
      style={{
        borderColor: accentTextColor,
        width: "clamp(4rem, 15vmin, 7rem)",
        height: "clamp(4rem, 15vmin, 7rem)",
      }}
    >
      <Icon
        name="CheckCircle"
        variant="Linear"
        style={{ color: accentTextColor, width: "50%", height: "50%" }}
      />
    </div>
    <div className="text-center space-y-2">
      <h2
        className="text-2xl font-bold tracking-widest uppercase"
        style={{ color: accentTextColor }}
      >
        System Ready
      </h2>
      <p className="text-sm">Connection Established</p>
    </div>
  </div>
);
