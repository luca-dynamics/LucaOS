import React from "react";
import { SkillRegistryPanel } from "./SkillRegistryPanel";

interface Props {
  onClose: () => void;
  onExecute: (name: string, args: unknown) => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

const SkillsMatrix: React.FC<Props> = ({ onClose, theme }) => {
  const accent = theme?.hex ?? "#3b82f6";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 font-sans animate-in fade-in duration-300">
      <div className="flex h-[90%] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-[#050505]/95 shadow-2xl" style={{ border: `1px solid ${accent}44`, boxShadow: `0 0 80px -20px ${accent}33` }} role="dialog" aria-modal="true" aria-label="Skill Registry">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#0a0a0a] px-5 py-3">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-base" style={{ color: accent }}>◈</span>
            <span className="text-sm font-bold tracking-wider" style={{ color: accent }}>SKILL REGISTRY</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">inspection only</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close Skill Registry" className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
            <span aria-hidden="true" className="text-base leading-none">×</span>
          </button>
        </div>
        <div className="min-h-0 flex-1"><SkillRegistryPanel accent={accent} /></div>
      </div>
    </div>
  );
};

export default SkillsMatrix;
