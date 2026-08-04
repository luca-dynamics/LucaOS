import React, { useState, useEffect } from "react";
import { LucaOrb } from "../LucaOrb";
import { OrbState } from "../types/OrbState";
import { ORB_MATERIALS } from "../materials/OrbMaterial";
import { QUALITY_PRESETS, QualityTier } from "../engine/AdaptiveQuality";
import { ORB_PERSONALITIES } from "../engine/OrbPersonality";

export const LucaOrbInspector: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"appearance" | "motion" | "audio" | "performance" | "personality">("appearance");
  const [selectedState, setSelectedState] = useState<OrbState>(OrbState.Idle);
  const [selectedMaterial, setSelectedMaterial] = useState<string>("liquidGlass");
  const [selectedQuality, setSelectedQuality] = useState<QualityTier>("ultra");
  const [selectedPersonality, setSelectedPersonality] = useState<string>("default");
  const [intensity, setIntensity] = useState<number>(0.35);
  const [simulatedAudioLevel, setSimulatedAudioLevel] = useState<number>(0.2);
  const [fps, setFps] = useState<number>(60);
  const [frameTimeMs, setFrameTimeMs] = useState<number>(16.6);

  // FPS Tracker
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const tick = () => {
      frameCount++;
      const now = performance.now();
      const delta = now - lastTime;
      if (delta >= 1000) {
        const currentFps = Math.round((frameCount * 1000) / delta);
        setFps(currentFps);
        setFrameTimeMs(parseFloat((1000 / currentFps).toFixed(1)));
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  const materials = Object.keys(ORB_MATERIALS);
  const states = Object.values(OrbState);
  const qualityTiers: QualityTier[] = ["ultra", "high", "medium", "low"];
  const personalities = Object.keys(ORB_PERSONALITIES);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-950 text-white min-h-[680px] rounded-2xl border border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center justify-center gap-2">
          <span>🔬</span> Luca Orb Engine Laboratory (LOE v1.0)
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Unreal-Style Material & Motion Laboratory • ACES Tone Mapping • Quality Tiers • Personalities
        </p>
      </div>

      {/* GPU Performance Telemetry */}
      <div className="flex items-center justify-center gap-6 px-6 py-2.5 mb-6 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400">FPS:</span>
          <span className="font-bold text-emerald-400">{fps}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Frame Time:</span>
          <span className="font-bold text-sky-400">{frameTimeMs} ms</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Quality Preset:</span>
          <span className="font-bold text-cyan-300">{QUALITY_PRESETS[selectedQuality].name}</span>
        </div>
      </div>

      {/* Live Orb Canvas Rendering */}
      <div className="relative my-4 flex items-center justify-center p-8 rounded-full bg-slate-900/40 border border-slate-800/80 shadow-[0_0_60px_rgba(0,0,0,0.9)]">
        <LucaOrb
          size={240}
          state={selectedState}
          intensity={intensity + simulatedAudioLevel * 0.4}
          material={selectedMaterial}
        />
      </div>

      {/* Laboratory Navigation Tabs */}
      <div className="w-full max-w-xl mt-6 flex flex-col bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden">
        <div className="flex border-b border-slate-800 bg-slate-950/60">
          {(["appearance", "motion", "audio", "performance", "personality"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-all border-b-2 ${
                activeTab === tab
                  ? "border-cyan-400 text-cyan-300 bg-slate-900/80"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {activeTab === "appearance" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2">Material Presets:</label>
                <div className="flex flex-wrap gap-2">
                  {materials.map((matKey) => (
                    <button
                      key={matKey}
                      onClick={() => setSelectedMaterial(matKey)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                        selectedMaterial === matKey
                          ? "bg-cyan-500/25 border-cyan-400 text-cyan-200 font-semibold"
                          : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {ORB_MATERIALS[matKey].name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "motion" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2">State Machine Behavior:</label>
                <div className="flex flex-wrap gap-2">
                  {states.map((st) => (
                    <button
                      key={st}
                      onClick={() => setSelectedState(st)}
                      className={`px-3 py-1.5 text-xs capitalize rounded-full border transition-all ${
                        selectedState === st
                          ? "bg-indigo-500/25 border-indigo-400 text-indigo-200 font-semibold"
                          : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "audio" && (
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                  <span>Simulated Audio Level (RMS):</span>
                  <span className="font-mono text-cyan-300">{Math.round(simulatedAudioLevel * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={simulatedAudioLevel}
                  onChange={(e) => setSimulatedAudioLevel(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeTab === "performance" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2">Quality Tier Presets:</label>
                <div className="flex flex-wrap gap-2">
                  {qualityTiers.map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setSelectedQuality(tier)}
                      className={`px-3.5 py-1.5 text-xs capitalize rounded-full border transition-all ${
                        selectedQuality === tier
                          ? "bg-emerald-500/25 border-emerald-400 text-emerald-200 font-semibold"
                          : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {QUALITY_PRESETS[tier].name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "personality" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2">Orb Personality Profiles:</label>
                <div className="flex flex-wrap gap-2">
                  {personalities.map((pKey) => (
                    <button
                      key={pKey}
                      onClick={() => {
                        setSelectedPersonality(pKey);
                        const p = ORB_PERSONALITIES[pKey];
                        if (p) {
                          setSelectedMaterial(p.material.name.toLowerCase().replace(" ", ""));
                        }
                      }}
                      className={`px-3.5 py-1.5 text-xs rounded-full border transition-all ${
                        selectedPersonality === pKey
                          ? "bg-purple-500/25 border-purple-400 text-purple-200 font-semibold"
                          : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {ORB_PERSONALITIES[pKey].name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
