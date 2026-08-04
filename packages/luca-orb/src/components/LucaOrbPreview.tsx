import React, { useState } from "react";
import { LucaOrb } from "../LucaOrb";
import { OrbState } from "../types/OrbState";
import { ORB_MATERIALS } from "../materials/OrbMaterial";

export const LucaOrbPreview: React.FC = () => {
  const [selectedState, setSelectedState] = useState<OrbState>(OrbState.Idle);
  const [selectedMaterial, setSelectedMaterial] = useState<string>("liquidGlass");
  const [intensity, setIntensity] = useState<number>(0.35);

  const materials = Object.keys(ORB_MATERIALS);
  const states = Object.values(OrbState);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-950 text-white min-h-[500px] rounded-2xl border border-slate-800 shadow-2xl">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-100">
          Luca Orb Engine (LOE) — Graphics Architect Inspection
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Part 4 GPU Render Graph • 3-Point Lighting • Double Glass Rim • Chromatic Aberration
        </p>
      </div>

      {/* Live Orb Canvas Rendering */}
      <div className="relative my-4 flex items-center justify-center p-6 rounded-full bg-slate-900/50 border border-slate-800/80 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        <LucaOrb
          size={240}
          state={selectedState}
          intensity={intensity}
          material={selectedMaterial}
        />
      </div>

      {/* Interactive Inspector Controls */}
      <div className="w-full max-w-md mt-6 flex flex-col gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        {/* Material Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">
            Material Engine Preset:
          </label>
          <div className="flex flex-wrap gap-2">
            {materials.map((matKey) => (
              <button
                key={matKey}
                onClick={() => setSelectedMaterial(matKey)}
                className={`px-3 py-1 text-xs rounded-full border transition-all ${
                  selectedMaterial === matKey
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                    : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                {ORB_MATERIALS[matKey].name}
              </button>
            ))}
          </div>
        </div>

        {/* State Machine Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">
            Orb State Machine:
          </label>
          <div className="flex flex-wrap gap-2">
            {states.map((st) => (
              <button
                key={st}
                onClick={() => setSelectedState(st)}
                className={`px-3 py-1 text-xs capitalize rounded-full border transition-all ${
                  selectedState === st
                    ? "bg-indigo-500/20 border-indigo-400 text-indigo-200"
                    : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Deform Intensity Slider */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Deformation Intensity:</span>
            <span>{Math.round(intensity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={intensity}
            onChange={(e) => setIntensity(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
