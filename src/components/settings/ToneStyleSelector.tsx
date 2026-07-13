import React from "react";
import { Icon } from "../ui/Icon";
import { ToneStyleId, TONE_STYLES, ToneDimensions } from "../../types/lucaPersonality";

interface ToneStyleSelectorProps {
  currentStyleId: ToneStyleId;
  customDimensions?: ToneDimensions;
  onStyleChange: (styleId: ToneStyleId) => void;
  onCustomChange: (dimensions: ToneDimensions) => void;
  themeHex: string;
}

const ToneStyleSelector: React.FC<ToneStyleSelectorProps> = ({
  currentStyleId,
  customDimensions,
  onStyleChange,
  onCustomChange,
  themeHex,
}) => {
  const activeDimensions =
    currentStyleId === "CUSTOM" && customDimensions
      ? customDimensions
      : TONE_STYLES[currentStyleId].dimensions;

  const handleSliderChange = (key: keyof ToneDimensions, value: number) => {
    if (currentStyleId !== "CUSTOM") return;
    onCustomChange({
      ...activeDimensions,
      [key]: value,
    });
  };

  const dimensionIcons = [
    {
      key: "expressiveness",
      icon: "MessageSquare",
      label: "Expressiveness",
      low: "Concise",
      high: "Verbose",
    },
    {
      key: "emotionalOpenness",
      icon: "Heart",
      label: "Emotionality",
      low: "Reserved",
      high: "Warm",
    },
    {
      key: "formality",
      icon: "Briefcase",
      label: "Formality",
      low: "Professional",
      high: "Casual",
    },
    {
      key: "directness",
      icon: "Zap",
      label: "Directness",
      low: "Diplomatic",
      high: "Blunt",
    },
    {
      key: "humor",
      icon: "Smile",
      label: "Humor",
      low: "Dry",
      high: "Sarcastic",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Style Presets */}
      <div className="grid grid-cols-4 gap-2">
        {(Object.keys(TONE_STYLES) as ToneStyleId[]).map((id) => {
          const isActive = currentStyleId === id;
          const config = TONE_STYLES[id];
          return (
            <button
              key={id}
              onClick={() => onStyleChange(id)}
              className="rounded-lg border px-2 py-2 text-center transition-colors"
              style={{
                borderColor: isActive
                  ? themeHex
                  : "var(--luca-border-subtle, var(--app-border-main))",
                backgroundColor: isActive ? `${themeHex}14` : "transparent",
                color: isActive
                  ? "var(--luca-text-primary, var(--app-text-main))"
                  : "var(--luca-text-secondary, var(--app-text-muted))",
              }}
            >
              <span className="text-[12.5px] font-medium">
                {config.name.charAt(0) + config.name.slice(1).toLowerCase()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Fine-tuning Sliders */}
      <div className="space-y-3 pt-1">
        <p className="text-[12.5px] text-[var(--app-text-muted)]">
          {currentStyleId === "CUSTOM"
            ? "Fine-tune how Luca delivers responses."
            : "Delivery dimensions follow the selected style. Pick Custom to fine-tune."}
        </p>

        {dimensionIcons.map((d) => (
          <div key={d.key} className="space-y-1">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-[12.5px] text-[var(--app-text-muted)]">
                <Icon
                  name={d.icon}
                  className="w-3.5 h-3.5"
                  style={{
                    color: currentStyleId === "CUSTOM" ? themeHex : undefined,
                  }}
                />
                <span>{d.label}</span>
              </div>
              <div className="flex items-center gap-2 text-[11.5px]">
                <span
                  className={
                    activeDimensions[d.key as keyof ToneDimensions] < 40
                      ? "text-[var(--app-text-main)] font-medium"
                      : "text-[var(--app-text-muted)] opacity-60"
                  }
                >
                  {d.low}
                </span>
                <span
                  className={
                    activeDimensions[d.key as keyof ToneDimensions] > 60
                      ? "text-[var(--app-text-main)] font-medium"
                      : "text-[var(--app-text-muted)] opacity-60"
                  }
                >
                  {d.high}
                </span>
                <span className="font-mono text-[11.5px]" style={{ color: themeHex }}>
                  {activeDimensions[d.key as keyof ToneDimensions]}%
                </span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              disabled={currentStyleId !== "CUSTOM"}
              value={activeDimensions[d.key as keyof ToneDimensions]}
              onChange={(e) =>
                handleSliderChange(
                  d.key as keyof ToneDimensions,
                  parseInt(e.target.value),
                )
              }
              className={`w-full h-1 rounded-lg appearance-none cursor-pointer transition-opacity ${
                currentStyleId === "CUSTOM" ? "opacity-100" : "opacity-30"
              }`}
              style={{ 
                accentColor: themeHex,
                backgroundColor: "var(--luca-border-strong, var(--app-border-main))"
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToneStyleSelector;
