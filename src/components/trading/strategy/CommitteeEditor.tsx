import React, { useState, useEffect } from "react";
import { Icon } from "../../ui/Icon";
import { DebatePersonality, PERSONALITY_COLORS, PERSONALITY_EMOJIS } from "../../../types/trading";
import { tradingService } from "../../../services/tradingService";

interface CommitteeParticipant {
  personality: DebatePersonality;
  aiModelId: string;
}

interface CommitteeEditorProps {
  committee?: CommitteeParticipant[];
  onChange: (committee: CommitteeParticipant[]) => void;
  theme?: { hex: string; primary: string; isLight?: boolean };
}

export function CommitteeEditor({ committee = [], onChange, theme }: CommitteeEditorProps) {
  const isLight = theme?.isLight;
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadModels() {
      try {
        const models = await tradingService.getAIModels();
        setAvailableModels(models);
      } catch (e) {
        console.error("Failed to load models for committee:", e);
      } finally {
        setLoading(false);
      }
    }
    loadModels();
  }, []);

  const defaultRoles: DebatePersonality[] = [
    DebatePersonality.BULL,
    DebatePersonality.BEAR,
    DebatePersonality.RISK_MANAGER
  ];

  // Initialize committee if empty
  useEffect(() => {
    if (committee.length === 0 && availableModels.length > 0) {
      const initial = defaultRoles.map((role) => ({
        personality: role,
        aiModelId: availableModels[0]?.id || "gemini-3-flash-preview"
      }));
      onChange(initial);
    }
  }, [availableModels]);

  const updateParticipant = (personality: DebatePersonality, aiModelId: string) => {
    const updated = committee.map(p => 
      p.personality === personality ? { ...p, aiModelId } : p
    );
    // If personality doesn't exist, add it
    if (!updated.some(p => p.personality === personality)) {
      updated.push({ personality, aiModelId });
    }
    onChange(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 animate-pulse">
        <Icon name="Loader" size={12} className="animate-spin" />
        <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Syncing Neural Registry...</span>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5"}`}>
      <div className={`text-[9px] font-black tracking-widest mb-4 flex items-center justify-between ${isLight ? "text-slate-400" : "text-slate-600"}`}>
        <span className="uppercase italic">Neural Committee Selection</span>
        <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[7px]">Registry Active</span>
        </div>
      </div>
      
      <div className="space-y-3">
        {defaultRoles.map((role) => {
          const participant = committee.find(p => p.personality === role);
          const currentColor = PERSONALITY_COLORS[role] || "#666";
          const emoji = PERSONALITY_EMOJIS[role] || "🤖";
          
          return (
            <div key={role} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] leading-none">{emoji}</span>
                  <span className={`text-[8px] font-black uppercase tracking-[0.1em] ${isLight ? "text-slate-700" : "text-white/70"}`}>
                    {role.replace('_', ' ')}
                  </span>
                </div>
              </div>
              
              <div className="relative group">
                <select
                  value={participant?.aiModelId || ""}
                  onChange={(e) => updateParticipant(role, e.target.value)}
                  className={`w-full h-9 rounded bg-[#0b0b0b] border border-white/5 px-3 pr-8 text-[10px] font-mono appearance-none transition-all focus:border-[var(--app-primary)] focus:ring-1 focus:ring-[var(--app-primary)]/20 ${isLight ? "bg-white border-slate-200 text-slate-800" : "text-white"}`}
                  style={{ 
                    borderLeft: `2px solid ${currentColor}`,
                    borderColor: participant?.aiModelId ? undefined : "#ef4444"
                  }}
                >
                  <option value="" disabled>Select Model...</option>
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.provider})
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">
                  <Icon name="ChevronDown" size={10} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <p className={`mt-4 text-[7px] italic font-medium leading-relaxed ${isLight ? "text-slate-400" : "text-slate-500"}`}>
        * Select distinct intelligences to prevent cross-reasoning biases during the consensus phase.
      </p>
    </div>
  );
}
