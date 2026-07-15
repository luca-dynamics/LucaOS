import React from "react";
import type { LucaOpticalMaterialSettings } from "../../styles/lucaOpticalMaterialSettings";
import {
  DEFAULT_LUCA_OPTICAL_MATERIAL,
  normalizeLucaOpticalMaterialSettings,
} from "../../styles/lucaOpticalMaterialSettings";
import { SettingsCard } from "./SettingsLayout";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";
import OpticalMaterialPreview from "./OpticalMaterialPreview";

interface OpticalMaterialControlsProps {
  value?: LucaOpticalMaterialSettings;
  accentColor: string;
  onChange: (value: LucaOpticalMaterialSettings) => void;
}

interface RangeRowProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  accentColor: string;
  onChange: (value: number) => void;
}

const RangeRow: React.FC<RangeRowProps> = ({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  accentColor,
  onChange,
}) => (
  <label className="block py-1.5">
    <span className="flex justify-between text-xs" style={{ color: settingsSurfaceTokens.textSecondary }}>
      <span>{label}</span>
      <span>{Number.isInteger(step) ? Math.round(value) : value.toFixed(2)}</span>
    </span>
    <input
      aria-label={label}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-lg"
      style={{ accentColor, backgroundColor: settingsSurfaceTokens.borderSubtle }}
    />
  </label>
);

export const OpticalMaterialControls: React.FC<OpticalMaterialControlsProps> = ({
  value,
  accentColor,
  onChange,
}) => {
  const tuning = normalizeLucaOpticalMaterialSettings(value);
  const setGlass = (key: keyof LucaOpticalMaterialSettings["glass"], next: number) =>
    onChange(normalizeLucaOpticalMaterialSettings({ ...tuning, glass: { ...tuning.glass, [key]: next } }));
  const setMetal = (key: keyof Omit<LucaOpticalMaterialSettings["metal"], "gradient">, next: number) =>
    onChange(normalizeLucaOpticalMaterialSettings({ ...tuning, metal: { ...tuning.metal, [key]: next } }));
  const setGradient = (gradient: readonly string[]) =>
    onChange(normalizeLucaOpticalMaterialSettings({ ...tuning, metal: { ...tuning.metal, gradient } }));

  return (
    <SettingsCard>
      <OpticalMaterialPreview value={tuning} accentColor={accentColor} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium" style={{ color: settingsSurfaceTokens.textPrimary }}>Optical material</p>
          <p className="mt-1 text-xs" style={{ color: settingsSurfaceTokens.textSecondary }}>
            Refraction stays edge-weighted; frost remains intentionally restrained.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_LUCA_OPTICAL_MATERIAL)}
          className="luca-material-control rounded-lg px-2.5 py-1.5 text-xs"
        >
          Reset
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-x-5 md:grid-cols-2">
        <RangeRow label="Refraction" value={tuning.glass.refraction} accentColor={accentColor} onChange={(next) => setGlass("refraction", next)} />
        <RangeRow label="Frost" value={tuning.glass.frost} accentColor={accentColor} onChange={(next) => setGlass("frost", next)} />
      </div>

      <details className="mt-3 border-t pt-3" style={{ borderColor: settingsSurfaceTokens.borderSubtle }}>
        <summary className="cursor-pointer text-xs font-medium" style={{ color: settingsSurfaceTokens.textSecondary }}>
          Advanced optical tuning
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-x-5 md:grid-cols-2">
          <RangeRow label="Light" value={tuning.glass.light} accentColor={accentColor} onChange={(next) => setGlass("light", next)} />
          <RangeRow label="Glass depth" value={tuning.glass.depth} accentColor={accentColor} onChange={(next) => setGlass("depth", next)} />
          <RangeRow label="Dispersion" value={tuning.glass.dispersion} accentColor={accentColor} onChange={(next) => setGlass("dispersion", next)} />
          <RangeRow label="Edge falloff" value={tuning.glass.edgeFalloff} min={0.2} accentColor={accentColor} onChange={(next) => setGlass("edgeFalloff", next)} />
          <RangeRow label="Metal depth" value={tuning.metal.depth} accentColor={accentColor} onChange={(next) => setMetal("depth", next)} />
          <RangeRow label="Rounding" value={tuning.metal.rounding} accentColor={accentColor} onChange={(next) => setMetal("rounding", next)} />
          <RangeRow label="Roughness" value={tuning.metal.roughness} accentColor={accentColor} onChange={(next) => setMetal("roughness", next)} />
          <RangeRow label="RGB split" value={tuning.metal.rgbSplit} accentColor={accentColor} onChange={(next) => setMetal("rgbSplit", next)} />
          <RangeRow label="Scale" value={tuning.metal.scale} min={0.25} max={4} accentColor={accentColor} onChange={(next) => setMetal("scale", next)} />
          <RangeRow label="Stretch" value={tuning.metal.stretch} min={0.25} max={4} accentColor={accentColor} onChange={(next) => setMetal("stretch", next)} />
          <RangeRow label="Angle" value={tuning.metal.angle} min={-180} max={180} step={1} accentColor={accentColor} onChange={(next) => setMetal("angle", next)} />
          <RangeRow label="Repeats" value={tuning.metal.repeats} min={1} max={12} accentColor={accentColor} onChange={(next) => setMetal("repeats", next)} />
          <RangeRow label="Offset" value={tuning.metal.offset} min={-2} max={2} accentColor={accentColor} onChange={(next) => setMetal("offset", next)} />
          <RangeRow label="Phase" value={tuning.metal.phase} accentColor={accentColor} onChange={(next) => setMetal("phase", next)} />
          <RangeRow label="Evolution" value={tuning.metal.evolution} accentColor={accentColor} onChange={(next) => setMetal("evolution", next)} />
        </div>
        <div className="mt-3">
          <p className="text-xs" style={{ color: settingsSurfaceTokens.textSecondary }}>Gradient</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              ["Chrome", ["#050607", "#f9fbff", "#293038", "#ffffff", "#0b0d10", "#8fe5ed"]],
              ["Pearl", ["#1b2429", "#eefcff", "#70b9c4", "#ffffff", "#2c343a"]],
              ["Spectral", ["#050607", "#ff5f57", "#fff9ef", "#46d9ef", "#365dff", "#ffffff"]],
            ].map(([label, gradient]) => (
              <button
                key={label as string}
                type="button"
                className="luca-material-control rounded-full px-3 py-1.5 text-xs"
                onClick={() => setGradient(gradient as readonly string[])}
              >
                {label as string}
              </button>
            ))}
          </div>
        </div>
      </details>
    </SettingsCard>
  );
};

export default OpticalMaterialControls;
