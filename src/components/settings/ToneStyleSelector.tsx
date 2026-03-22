import React from "react";
import * as LucideIcons from "lucide-react";
import { ToneStyleId,
  TONE_STYLES,
  ToneDimensions, } from "../../types/lucaPersonality";
const {
  MessageSquare,
  Heart,
  Briefcase,
  Zap,
  Smile,
  Settings2,
} = LucideIcons as any;

interface ToneStyleSelectorProps {
  currentStyleId: ToneStyleId;
  customDimensions?: ToneDimensions;
  onStyleChange: (styleId: ToneStyleId) => void;
  onCustomChange: (dimensions: ToneDimensions) => void;
  themeHex: string;
  isLightMode: boolean;
}

const ToneStyleSelector: React.FC<ToneStyleSelectorProps> = ({
  currentStyleId,
  customDimensions,
  onStyleChange,
  onCustomChange,
  themeHex,
  isLightMode,
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
      icon: MessageSquare,
      label: "Expressive",
      low: "Concise",
      high: "Verbose",
    },
    {
      key: "emotionalOpenness",
      icon: Heart,
      label: "Emotional",
      low: "Reserved",
      high: "Warm",
    },
    {
      key: "formality",
      icon: Briefcase,
      label: "Formal",
      low: "Professional",
      high: "Casual",
    },
    {
      key: "directness",
      icon: Zap,
      label: "Direct",
      low: "Diplomatic",
      high: "Blunt",
    },
    {
      key: "humor",
      icon: Smile,
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
              className={`py-2 rounded px-1 flex flex-col items-center gap-1 border transition-all ${
                isActive
                  ? isLightMode
                    ? "bg-black/5 border-black/20"
                    : "bg-white/10 border-white/20"
                  : isLightMode
                    ? "border-black/5 hover:bg-black/5"
                    : "border-white/5 hover:bg-white/5"
              }`}
              style={{
                borderColor: isActive ? themeHex : undefined,
                color: isActive ? (isLightMode ? "#000" : "#fff") : "#6b7280",
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
      <div className="space-y-3 p-3 rounded-lg bg-black/5 border border-white/5">
        <div className="flex items-center gap-2 mb-1">
          <Settings2 className="w-3 h-3 text-gray-500" />
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
            Delivery Dimensions {currentStyleId !== "CUSTOM" && "(Locked)"}
          </span>
        </div>

        {dimensionIcons.map((d) => (
          <div key={d.key} className="space-y-1">
            <div className="flex justify-between items-center text-[8px] font-mono">
              <div className="flex items-center gap-1.5 text-gray-400">
                <d.icon
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
                      ? "text-white"
                      : "text-gray-600"
                  }
                >
                  {d.low}
                </span>
                <span
                  className={
                    activeDimensions[d.key as keyof ToneDimensions] > 60
                      ? "text-white"
                      : "text-gray-600"
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
              } ${isLightMode ? "bg-black/10" : "bg-white/10"}`}
              style={{ accentColor: themeHex }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToneStyleSelector;
