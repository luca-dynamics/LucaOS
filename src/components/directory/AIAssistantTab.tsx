import React from "react";
import { Icon } from "../ui/Icon";
import { ThemeColors } from "../../types/lucaPersonality";

interface AIAssistantTabProps {
  colors: ThemeColors;
  creationMode: "AI" | "MANUAL";
  setCreationMode: (mode: "AI" | "MANUAL") => void;
  skillDescription: string;
  setSkillDescription: (desc: string) => void;
  newLang: "python" | "node";
  setNewLang: (lang: "python" | "node") => void;
  isGenerating: boolean;
  generateSkillFromDescription: () => void;
  generatedCode: string;
  newName: string;
  setNewName: (name: string) => void;
  newInputs: string;
  setNewInputs: (inputs: string) => void;
  newDesc: string;
  setNewDesc: (desc: string) => void;
  newScript: string;
  setNewScript: (script: string) => void;
  handleCreate: () => void;
}

export const AIAssistantTab: React.FC<AIAssistantTabProps> = ({
  colors,
  creationMode,
  setCreationMode,
  skillDescription,
  setSkillDescription,
  newLang,
  setNewLang,
  isGenerating,
  generateSkillFromDescription,
  generatedCode,
  newName,
  setNewName,
  newInputs,
  setNewInputs,
  newDesc,
  setNewDesc,
  newScript,
  setNewScript,
  handleCreate,
}) => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tighter uppercase italic flex items-center justify-center gap-3">
          <Icon name="MagicStick" size={32} className="text-blue-400" variant="BoldDuotone" />
          The Skill Forge
        </h2>
        <p className="text-slate-500 font-mono text-xs sm:text-sm uppercase tracking-[0.2em] opacity-60">
          Transform ideation into executable agency.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex p-1 rounded-2xl bg-black/40 border border-white/10 w-fit mx-auto">
        <button
          onClick={() => setCreationMode("AI")}
          className={`px-6 py-2.5 rounded-xl text-xs font-black tracking-widest transition-all ${
            creationMode === "AI" ? "bg-white/10 text-white shadow-xl scale-105" : "text-slate-500 hover:text-slate-300"
          }`}
          style={creationMode === "AI" ? { color: colors.accent, border: `1px solid ${colors.accent}40` } : {}}
        >
          AI GENERATOR
        </button>
        <button
          onClick={() => setCreationMode("MANUAL")}
          className={`px-6 py-2.5 rounded-xl text-xs font-black tracking-widest transition-all ${
            creationMode === "MANUAL" ? "bg-white/10 text-white shadow-xl scale-105" : "text-slate-500 hover:text-slate-300"
          }`}
          style={creationMode === "MANUAL" ? { color: colors.accent, border: `1px solid ${colors.accent}40` } : {}}
        >
          MANUAL ARCHITECT
        </button>
      </div>

      {creationMode === "AI" ? (
        <div className="space-y-6">
          <div className="relative group">
            <div className="absolute inset-x-0 -top-8 text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-40 group-focus-within:opacity-100 transition-opacity">
              Agency Intent Definition
            </div>
            <textarea
              value={skillDescription}
              onChange={(e) => setSkillDescription(e.target.value)}
              placeholder="e.g., 'Fetch the latest SOL price and send a summary to my discord webhook'"
              className="w-full h-40 bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-sm text-white focus:outline-none transition-all placeholder:text-slate-600 font-mono leading-relaxed"
              style={{
                borderColor: skillDescription ? `${colors.accent}40` : "rgba(255,255,255,0.1)",
                boxShadow: skillDescription ? `0 0 40px ${colors.glow}20` : "none"
              }}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setNewLang("python")}
                className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all ${newLang === "python" ? "bg-white/10 text-white" : "text-slate-500"}`}
              >
                PYTHON
              </button>
              <button
                onClick={() => setNewLang("node")}
                className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all ${newLang === "node" ? "bg-white/10 text-white" : "text-slate-500"}`}
              >
                NODE.JS
              </button>
            </div>

            <button
              onClick={generateSkillFromDescription}
              disabled={isGenerating || !skillDescription.trim()}
              className="flex-1 w-full sm:w-auto py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all disabled:opacity-30 disabled:cursor-not-allowed group relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}dd)`,
                color: colors.textColor,
                boxShadow: `0 10px 30px ${colors.glow}40`
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                {isGenerating ? (
                  <>
                    <Icon name="Settings" size={18} className="animate-spin" />
                    FORGING LOGIC...
                  </>
                ) : (
                  <>
                    <Icon name="MagicStick" size={18} className="group-hover:rotate-12 transition-transform" />
                    GENERATE AGENCY
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in zoom-in-95 duration-500">
          {/* Form Side */}
          <div className="space-y-5">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Skill Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="TokenTracker"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-white/30 transition-all font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Description</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Analyzes on-chain volume spikes..."
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-white/30 transition-all font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Inputs (comma separated)</label>
              <input
                type="text"
                value={newInputs}
                onChange={(e) => setNewInputs(e.target.value)}
                placeholder="symbol, timeframe, volume_threshold"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-white/30 transition-all font-mono"
              />
            </div>
            <div className="pt-4">
              <button
                onClick={handleCreate}
                disabled={!newName || !newScript}
                className="w-full py-4 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] transition-all disabled:opacity-20"
                style={{
                  backgroundColor: `${colors.accent}20`,
                  color: colors.accent,
                  border: `1px solid ${colors.accent}40`,
                  boxShadow: `0 0 20px ${colors.glow}20`
                }}
              >
                DEPLOY TO LOCAL REGISTRY
              </button>
            </div>
          </div>

          {/* Editor Side */}
          <div className="flex flex-col h-full min-h-[400px]">
            <div className="flex items-center justify-between mb-2 px-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Script Logic</label>
              <div className="flex items-center gap-3">
                <span className={`text-[9px] font-bold ${newLang === "python" ? "text-blue-400" : "text-yellow-500"}`}>
                  {newLang === "python" ? "PYTHON 3.11" : "NODE.JS 20"}
                </span>
                <Icon name="Code" size={12} className="text-slate-600" />
              </div>
            </div>
            <textarea
              value={newScript}
              onChange={(e) => setNewScript(e.target.value)}
              placeholder="# Enter your implementation here..."
              className="flex-1 w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-[13px] text-white focus:outline-none focus:border-white/30 transition-all font-mono leading-relaxed resize-none overflow-y-auto"
            />
          </div>
        </div>
      )}

      {/* Generated Preview */}
      {generatedCode && creationMode === "AI" && (
        <div className="space-y-4 animate-in slide-in-from-top-4 duration-700">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Icon name="CheckCircle" size={14} className="text-emerald-500" />
              Logic Generated Successfully
            </h3>
            <button
              onClick={() => setCreationMode("MANUAL")}
              className="text-[9px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider"
            >
              Tweak in Architect →
            </button>
          </div>
          <div className="bg-black/60 rounded-2xl border border-white/10 p-6 overflow-hidden relative group">
            <pre className="text-[12px] text-slate-400 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[300px]">
              {generatedCode}
            </pre>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-40 pointer-events-none" />
          </div>
        </div>
      )}
    </div>
  );
};
