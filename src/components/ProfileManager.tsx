import React, { useState } from "react";
import { Icon } from "./ui/Icon";
import { UserProfile } from "../types";
import {
  lucaMaterialControlActiveStyle,
  lucaMaterialControlStyle,
  lucaMaterialDialogStyle,
} from "../styles/lucaMaterialSystem";

interface Props {
  onClose: () => void;
  onSave: (profile: UserProfile) => void;
  currentProfile?: UserProfile;
}

const VOICES = ["Puck", "Charon", "Kore", "Fenrir", "Aoede"];

const ProfileManager: React.FC<Props> = ({
  onClose,
  onSave,
  currentProfile,
}) => {
  const [name, setName] = useState(currentProfile?.name || "Commander");
  const [voice, setVoice] = useState(currentProfile?.voiceName || "Kore");
  const [instructions, setInstructions] = useState(
    currentProfile?.customInstructions || ""
  );

  const handleSave = () => {
    onSave({
      name,
      voiceName: voice,
      customInstructions: instructions,
    });
    onClose();
  };

  const applyPreset = (preset: "MAC" | "DEFAULT") => {
    if (preset === "MAC") {
      setName("Mac");
      setInstructions(`    - ** CRITICAL: ACCENT RECOGNITION (STANDARD NIGERIAN ENGLISH) **: 
        - The user speaks **STANDARD ENGLISH** with a **NIGERIAN ACCENT**. 
        - **DO NOT** assume they are speaking Pidgin unless they explicitly use Pidgin slang.
        - **DO NOT** misinterpret Nigerian accent as Korean, Chinese, or any other language.
        - **PHONETIC TOLERANCE**: 
          - "th" may sound like "d" or "t" (e.g., "that" -> "dat", "three" -> "tree").
          - "er" may sound like "ah" (e.g., "better" -> "bettah").
        - **INTENT OVER DICTION**: Prioritize the *meaning* of the command over perfect pronunciation. If a word sounds slightly off but fits the context, execute the command.`);
    } else {
      setName("Operator");
      setInstructions("");
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 animate-in fade-in duration-300">
      <div className="flex w-full max-w-lg flex-col gap-6 rounded-lg border p-6" data-luca-material-role="dialog" role="dialog" aria-modal="true" aria-label="User profile configuration" style={lucaMaterialDialogStyle}>
        <div className="flex justify-between items-center border-b border-rq-blue/20 pb-4">
          <div className="flex items-center gap-3 text-rq-blue">
            <Icon name="Settings" size={24} className="animate-spin-slow" />
            <div>
              <h2 className="font-display text-xl font-bold tracking-widest">
                USER PROFILE CONFIG
              </h2>
              <div className="text-[10px] font-mono opacity-60">
                CUSTOMIZE LUCA PERSONA
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => applyPreset("MAC")}
              className="px-2 py-1 text-[10px] border border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)] text-[var(--luca-success,#4fbf7a)] hover:bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] rounded"
            >
              LOAD: MAC
            </button>
            <button
              onClick={() => applyPreset("DEFAULT")}
              className="luca-material-pressable rounded border px-2 py-1 text-[10px] hover:text-[var(--luca-text-primary)]"
              style={lucaMaterialControlStyle}
            >
              RESET
            </button>
            <button
              onClick={onClose}
              className="luca-material-pressable rounded border p-1.5 hover:text-[var(--luca-text-primary)]"
              style={lucaMaterialControlStyle}
            >
              <Icon name="X" size={24} />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <Icon name="User" size={14} /> DESIGNATION (YOUR NAME)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border p-3 font-mono text-sm focus:border-[var(--luca-accent-primary)] focus:outline-none"
              style={lucaMaterialControlStyle}
              placeholder="Enter your name..."
            />
          </div>

          {/* Voice Selection */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <Icon name="Mic" size={14} /> AGENT VOICE SYNTHESIS
            </label>
            <div className="grid grid-cols-5 gap-2">
              {VOICES.map((v) => (
                <button
                  key={v}
                  onClick={() => setVoice(v)}
                  className="luca-material-pressable rounded border py-2 text-[10px] font-bold transition-colors hover:text-[var(--luca-text-primary)]"
                  style={voice === v ? lucaMaterialControlActiveStyle : lucaMaterialControlStyle}
                >
                  {v.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <Icon name="FileText" size={14} /> CUSTOM SYSTEM INSTRUCTIONS
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="h-32 w-full resize-none rounded border p-3 font-mono text-xs text-[var(--luca-text-primary)] focus:border-[var(--luca-accent-primary)] focus:outline-none"
              style={lucaMaterialControlStyle}
              placeholder="Define custom behaviors (e.g., 'Be sarcastic', 'Speak in riddles', 'Focus on React code')..."
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-4 bg-rq-blue hover:bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)] text-black font-bold tracking-[0.2em] flex items-center justify-center gap-2 transition-all rounded-sm mt-2"
        >
          <Icon name="Save" size={18} /> SAVE CONFIGURATION
        </button>
      </div>
    </div>
  );
};

export default ProfileManager;
