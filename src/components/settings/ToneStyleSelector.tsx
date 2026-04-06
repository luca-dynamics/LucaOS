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
              className={`py-2 rounded px-1 flex flex-col items-center gap-1 border transition-all glass-blur
                ${isActive ? "bg-[var(--app-bg-tint)]" : "bg-transparent"}
                ${isActive ? "border-[var(--app-border-main)]" : "border-transparent"}
                hover:bg-[var(--app-bg-tint)]/20
              `}
              style={{
                borderColor: isActive ? themeHex : "var(--app-border-main, rgba(255,255,255,0.05))",
                color: isActive ? "var(--app-text-main, #ffffff)" : "var(--app-text-muted, #6b7280)",
              }}
            >
              <span className="text-[9px] font-bold uppercase tracking-tighter">
                {config.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Fine-tuning Sliders */}
      <div className={`space-y-3 p-3 rounded-lg border transition-all tech-border glass-blur`}
           style={{ backgroundColor: "var(--app-bg-tint, rgba(255,255,255,0.05))", borderColor: "var(--app-border-main, rgba(255,255,255,0.1))" }}>
        <div className="flex items-center gap-2 mb-1">
          <Icon name="Settings2" className="w-3 h-3 text-[var(--app-text-muted)]" />
          <span className="text-[9px] font-bold text-[var(--app-text-muted)] uppercase tracking-widest">
            Delivery Dimensions {currentStyleId !== "CUSTOM" && "(Locked)"}
          </span>
        </div>

        {dimensionIcons.map((d) => (
          <div key={d.key} className="space-y-1">
            <div className="flex justify-between items-center text-[8px] font-mono">
              <div className="flex items-center gap-1.5 text-[var(--app-text-muted)]">
                <Icon
                  name={d.icon}
                  className="w-3 h-3"
                  style={{
                    color: currentStyleId === "CUSTOM" ? themeHex : undefined,
                  }}
                />
                <span>{d.label.toUpperCase()}</span>
              </div>
              <div className="flex gap-2 text-[7px] tracking-tighter">
                <span
                  className={
                    activeDimensions[d.key as keyof ToneDimensions] < 40
                      ? "text-[var(--app-text-main)] font-bold"
                      : "text-[var(--app-text-muted)] opacity-60"
                  }
                >
                  {d.low}
                </span>
                <span
                  className={
                    activeDimensions[d.key as keyof ToneDimensions] > 60
                      ? "text-[var(--app-text-main)] font-bold"
                      : "text-[var(--app-text-muted)] opacity-60"
                  }
                >
                  {d.high}
                </span>
                <span style={{ color: themeHex }}>
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
                backgroundColor: "var(--app-border-main, rgba(255,255,255,0.2))"
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToneStyleSelector;
