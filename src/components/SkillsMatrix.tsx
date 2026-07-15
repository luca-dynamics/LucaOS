import React from "react";
import { SkillRegistryPanel } from "./SkillRegistryPanel";
import {
  lucaMaterialControlStyle,
  lucaMaterialDialogStyle,
  lucaMaterialSolidCardStyle,
} from "../styles/lucaMaterialSystem";

interface Props {
  onClose: () => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

const SkillsMatrix: React.FC<Props> = ({ onClose, theme }) => {
  const accent = theme?.hex ?? "#3b82f6";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 font-sans animate-in fade-in duration-300">
      <div className="flex h-[90%] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border shadow-2xl" style={{ ...lucaMaterialDialogStyle, borderColor: `${accent}44`, boxShadow: `0 0 80px -20px ${accent}33` }} data-luca-material-role="dialog" role="dialog" aria-modal="true" aria-label="Skill Registry">
        <div className="flex items-center justify-between border-b px-5 py-3" style={lucaMaterialSolidCardStyle}>
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-base" style={{ color: accent }}>◈</span>
            <span className="text-sm font-bold tracking-wider" style={{ color: accent }}>SKILL REGISTRY</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">inspection only</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close Skill Registry" className="luca-material-pressable rounded-lg border p-2 transition-colors hover:text-[var(--luca-text-primary)]" style={lucaMaterialControlStyle}>
            <span aria-hidden="true" className="text-base leading-none">×</span>
          </button>
        </div>
        <div className="min-h-0 flex-1"><SkillRegistryPanel accent={accent} /></div>
      </div>
    </div>
  );
};

export default SkillsMatrix;
