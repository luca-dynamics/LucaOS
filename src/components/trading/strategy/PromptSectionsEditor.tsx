import React from "react";
import { Icon } from "../../ui/Icon";
import { TradingStrategy } from "../../../types/trading";

interface PromptSectionsEditorProps {
  customPrompt?: string;
  persona?: string;
  entryCriteria?: string;
  exitRules?: string;
  riskConstraints?: string;
  onUpdate: (updates: Partial<TradingStrategy>) => void;
  theme?: { hex: string; primary: string; border: string; bg: string; isLight?: boolean };
}

export function PromptSectionsEditor({
  customPrompt,
  persona,
  entryCriteria,
  exitRules,
  riskConstraints,
  onUpdate,
  theme,
}: PromptSectionsEditorProps) {
  const isLight = theme?.isLight;
  const sections = [
    {
      id: "persona",
      label: "Agent Persona",
      icon: <Icon name="Sparkles" size={12} />,
      value: persona,
      placeholder: "e.g., \"Risk-Averse Institutional Analyst focus on macro trends...\"",
      help: "Agent Cognitive Identity"
    },
    {
      id: "entryCriteria",
      label: "Entry Criteria",
      icon: <Icon name="ChevronRight" size={12} />,
      value: entryCriteria,
      placeholder: "e.g., \"Enter long if RSI < 30 and price is above 200 EMA...\"",
      help: "Protocol Activation Rules"
    },
    {
      id: "exitRules",
      label: "Exit Rules",
      icon: <Icon name="X" size={12} />,
      value: exitRules,
      placeholder: "e.g., \"Exit if MACD histogram turns negative on 1h...\"",
      help: "Liquidation Protocol"
    },
    {
      id: "riskConstraints",
      label: "Risk Constraints",
      icon: <Icon name="Shield" size={12} />,
      value: riskConstraints,
      placeholder: "e.g., \"Never exceed 3 concurrent trades. Max leverage 5x...\"",
      help: "Operational Boundaries"
    },
  ];

  return (
    <div className="space-y-4">
      <div className={`p-4 border rounded-xl ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#050505] border-white/5 shadow-inner"}`}>
        <h3 className={`text-[10px] font-black ${isLight ? "text-slate-400" : "text-slate-500"} mb-6 tracking-[0.2em] flex items-center gap-2`}>
          <Icon name="Command" size={14} style={{ color: theme?.hex || "#0ea5e9" }} />
          System Instructions
        </h3>

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.id} className="group">
              <div className="flex items-center justify-between mb-2">
                <label 
                  className={`text-[9px] font-bold ${isLight ? "text-slate-500" : "text-slate-600"} flex items-center gap-2 tracking-widest transition-colors`}
                  style={{ color: theme?.hex ? undefined : undefined }} // Placeholder to trigger focus-within elsewhere if needed
                >
                  {section.icon} {section.label}
                </label>
                <span className={`text-[8px] ${isLight ? "text-slate-400" : "text-slate-700"} font-mono tracking-tighter`}>
                  {section.help}
                </span>
              </div>
              <textarea
                value={section.value || ""}
                onChange={(e) => onUpdate({ [section.id]: e.target.value })}
                className={`w-full h-24 ${isLight ? "bg-slate-50 border-black/10 text-slate-900" : "bg-[#080808] border-white/5 text-slate-300"} rounded-sm p-3 text-[10px] font-mono focus:outline-none focus:border-opacity-30 resize-none leading-relaxed transition-all placeholder:text-slate-300 shadow-inner`}
                style={{ focusBorderColor: theme?.hex || "#0ea5e9" } as any}
                placeholder={section.placeholder}
              />
            </div>
          ))}

          <div className="pt-6 border-t border-white/5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[9px] font-bold text-slate-600 flex items-center gap-2 tracking-widest">
                <Icon name="Command" size={12} /> Global Override
              </label>
              <span className="text-[8px] text-rose-500 font-mono tracking-tighter">
                Priority 0 Bypass
              </span>
            </div>
            <textarea
              value={customPrompt || ""}
              onChange={(e) => onUpdate({ customPrompt: e.target.value })}
              className={`w-full h-32 ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#050505] border-white/5"} border border-dashed rounded-lg p-3 text-[11px] font-mono ${isLight ? "text-slate-600" : "text-slate-500"} focus:outline-none focus:border-opacity-20 resize-none leading-relaxed transition-all placeholder:text-slate-700`}
              style={{ focusBorderColor: theme?.hex || "#0ea5e9" } as any}
              placeholder="Legacy or full-text prompt override..."
            />
          </div>
        </div>
      </div>

      <div 
        className="p-4 border rounded-sm"
        style={{ 
          backgroundColor: `${theme?.hex || "#0ea5e9"}08`, 
          borderColor: `${theme?.hex || "#0ea5e9"}1a` 
        }}
      >
        <h4 
          className="text-[10px] font-black mb-3 flex items-center gap-2 tracking-widest"
          style={{ color: `${theme?.hex || "#0ea5e9"}cc` }}
        >
          <Icon name="MessageSquare" size={12} /> Prompt Engineering Protocol
        </h4>
        <div className="space-y-2">
          {[
            { tag: "Identity", msg: "Define a high-conviction persona (e.g. Institutional Quantitative Analyst)." },
            { tag: "Data", msg: "Prioritize specific signals (e.g. 'RSI trend over MACD crossover')." },
            { tag: "Bounds", msg: "Set hard logic limits (e.g. 'Wait for 3 candle confirmation')." },
            { tag: "Logic", msg: "Enforce 'Think Step-by-Step' to activate hidden reasoning tiers." }
          ].map((item, idx) => (
            <div key={idx} className="flex gap-3 items-start">
              <span 
                className="text-[8px] font-bold underline underline-offset-2 shrink-0"
                style={{ 
                  color: theme?.hex || "#0ea5e9",
                  textDecorationColor: `${theme?.hex || "#0ea5e9"}4d`
                }}
              >
                {item.tag}
              </span>
              <span className="text-[9px] text-slate-500 font-mono leading-tight">{item.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
