import React from "react";
import {
  DEFAULT_LUCA_ATMOSPHERE,
  buildLucaAtmosphereBackground,
  normalizeLucaAtmosphere,
  type LucaAtmosphere,
  type LucaAtmosphereShape,
} from "../../config/lucaAtmospheres";
import { SettingsCard, SettingsToggle } from "./SettingsLayout";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";

interface AtmosphereStudioProps {
  value?: LucaAtmosphere;
  accentColor: string;
  onChange: (value: LucaAtmosphere) => void;
}

const SHAPES: Array<{ id: LucaAtmosphereShape; label: string }> = [
  { id: "mesh", label: "Mesh" },
  { id: "flow", label: "Flow" },
  { id: "linear", label: "Linear" },
  { id: "radial", label: "Radial" },
  { id: "conic", label: "Conic" },
];

export const AtmosphereStudio: React.FC<AtmosphereStudioProps> = ({
  value,
  accentColor,
  onChange,
}) => {
  const atmosphere = normalizeLucaAtmosphere(value);
  const update = (patch: Partial<LucaAtmosphere>) => onChange({ ...atmosphere, ...patch });

  return (
    <SettingsCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold" style={{ color: settingsSurfaceTokens.textPrimary }}>
            Custom atmosphere
          </div>
          <p className="mt-1 text-xs leading-5" style={{ color: settingsSurfaceTokens.textSecondary }}>
            Add a personal gradient behind the current skin. Panels and accessibility colors stay protected.
          </p>
        </div>
        <SettingsToggle
          checked={atmosphere.enabled}
          onChange={() => update({ enabled: !atmosphere.enabled })}
          accentColor={accentColor}
          ariaLabel="Custom atmosphere"
        />
      </div>

      <div
        className="relative mt-4 h-44 overflow-hidden rounded-xl border transition-all duration-500"
        style={{
          background: atmosphere.enabled
            ? buildLucaAtmosphereBackground(atmosphere)
            : "var(--luca-background-elevated, #1b2025)",
          filter: atmosphere.enabled ? `saturate(${0.8 + atmosphere.intensity * 0.5})` : undefined,
          borderColor: settingsSurfaceTokens.borderSubtle,
        }}
        aria-label="Atmosphere preview"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
        <div className="absolute bottom-4 left-4 rounded-xl border border-white/15 bg-black/20 px-4 py-2 text-sm text-white backdrop-blur-md">
          Luca Atmosphere
          <span className="ml-2 text-xs text-white/65">{atmosphere.shape}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SHAPES.map((shape) => (
          <button
            key={shape.id}
            type="button"
            onClick={() => update({ shape: shape.id })}
            className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              color: atmosphere.shape === shape.id ? "#fff" : settingsSurfaceTokens.textSecondary,
              background: atmosphere.shape === shape.id ? accentColor : "transparent",
              borderColor: atmosphere.shape === shape.id ? accentColor : settingsSurfaceTokens.borderSubtle,
            }}
          >
            {shape.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {atmosphere.colors.map((color, index) => (
          <label key={index} className="text-xs" style={{ color: settingsSurfaceTokens.textSecondary }}>
            Colour {index + 1}
            <input
              type="color"
              value={color.hex}
              onChange={(event) => {
                const colors = atmosphere.colors.map((entry, colorIndex) =>
                  colorIndex === index ? { ...entry, hex: event.target.value.toUpperCase() } : entry,
                );
                update({ colors });
              }}
              className="mt-1 h-10 w-full cursor-pointer rounded-lg border bg-transparent p-1"
              style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
            />
          </label>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {[
          { key: "softnessPx", label: "Softness", min: 0, max: 64, step: 1, display: `${atmosphere.softnessPx}px` },
          { key: "noise", label: "Texture", min: 0, max: 0.12, step: 0.01, display: `${Math.round(atmosphere.noise * 100)}%` },
          { key: "intensity", label: "Intensity", min: 0.2, max: 1, step: 0.05, display: `${Math.round(atmosphere.intensity * 100)}%` },
        ].map((control) => (
          <label key={control.key} className="text-xs" style={{ color: settingsSurfaceTokens.textSecondary }}>
            <span className="flex justify-between"><span>{control.label}</span><span>{control.display}</span></span>
            <input
              type="range"
              min={control.min}
              max={control.max}
              step={control.step}
              value={atmosphere[control.key as "softnessPx" | "noise" | "intensity"]}
              onChange={(event) => update({ [control.key]: Number(event.target.value) })}
              className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-lg"
              style={{ accentColor, backgroundColor: settingsSurfaceTokens.borderSubtle }}
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs" style={{ color: settingsSurfaceTokens.textSecondary }}>
          <input
            type="checkbox"
            checked={atmosphere.motion === "calm"}
            onChange={(event) => update({ motion: event.target.checked ? "calm" : "off" })}
            style={{ accentColor }}
          />
          Gentle motion
        </label>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_LUCA_ATMOSPHERE })}
          className="rounded-lg border px-3 py-1.5 text-xs"
          style={{ color: settingsSurfaceTokens.textSecondary, borderColor: settingsSurfaceTokens.borderSubtle }}
        >
          Reset atmosphere
        </button>
      </div>
    </SettingsCard>
  );
};

export default AtmosphereStudio;
