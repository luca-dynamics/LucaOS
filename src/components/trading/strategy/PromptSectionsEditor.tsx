import React from "react";
import * as LucideIcons from "lucide-react";
const {
  Command,
  Sparkles,
  MessageSquare,
  ChevronRight,
  X,
  Shield,
} = LucideIcons as any;
import { TradingStrategy } from "../../../types/trading";

interface PromptSectionsEditorProps {
  customPrompt?: string;
  persona?: string;
  entryCriteria?: string;
  exitRules?: string;
  riskConstraints?: string;
  onUpdate: (updates: Partial<TradingStrategy>) => void;
}

export function PromptSectionsEditor({
  customPrompt,
  persona,
  entryCriteria,
  exitRules,
  riskConstraints,
  onUpdate,
}: PromptSectionsEditorProps) {
  const sections = [
    {
      id: "persona",
      label: "Agent Persona",
      icon: <Sparkles size={10} className="text-yellow-500" />,
      value: persona,
      placeholder: "e.g., &quot;Risk-Averse Institutional Analyst with a focus on macro trends...&quot;",
      help: "Defines the 'voice' and decision-making style."
    },
    {
      id: "entryCriteria",
      label: "Entry Criteria",
      icon: <ChevronRight size={10} className="text-emerald-500" />,
      value: entryCriteria,
      placeholder: "e.g., &quot;Only enter long if RSI < 30 and price is above 200 EMA...&quot;",
      help: "Explicit rules for opening a position."
    },
    {
      id: "exitRules",
      label: "Exit Rules",
      icon: <X size={10} className="text-rose-500" />,
      value: exitRules,
      placeholder: "e.g., &quot;Exit Long if MACD histogram turns negative on 1h timeframe...&quot;",
      help: "Explicit rules for closing a position."
    },
    {
      id: "riskConstraints",
      label: "Risk Constraints",
      icon: <Shield size={10} className="text-blue-500" />,
      value: riskConstraints,
      placeholder: "e.g., &quot;Never exceed 3 concurrent trades. Max leverage 5x...&quot;",
      help: "Safety boundaries and position sizing logic."
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-[#1e2329] p-4 rounded-xl border border-white/5">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <Command size={16} className="text-purple-400" /> System Instructions
        </h3>

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.id}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  {section.icon} {section.label}
                </label>
                <span className="text-[9px] text-slate-600 font-mono italic">
                  {section.help}
                </span>
              </div>
              <textarea
                value={section.value || ""}
                onChange={(e) => onUpdate({ [section.id]: e.target.value })}
                className="w-full h-24 bg-black/20 border border-slate-700 rounded-lg p-3 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-purple-500/50 resize-none leading-relaxed"
                placeholder={section.placeholder}
              />
            </div>
          ))}

          <div className="pt-4 border-t border-white/5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Command size={10} className="text-slate-400" /> Final Prompt Override
              </label>
              <span className="text-[9px] text-slate-600 font-mono">
                Used if everything above is empty
              </span>
            </div>
            <textarea
              value={customPrompt || ""}
              onChange={(e) => onUpdate({ customPrompt: e.target.value })}
              className="w-full h-32 bg-black/10 border border-dashed border-slate-800 rounded-lg p-3 text-[11px] font-mono text-slate-500 focus:outline-none focus:border-purple-500/30 resize-none leading-relaxed"
              placeholder="Legacy or full-text prompt override..."
            />
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
        <h4 className="text-xs font-bold text-indigo-300 mb-2 flex items-center gap-2">
          <MessageSquare size={14} /> Prompt Engineering Tips
        </h4>
        <ul className="space-y-1.5 text-[10px] text-indigo-200/70 list-disc list-inside">
          <li>
            Define a clear <strong>Persona</strong> (e.g., Risk-Averse
            Institutional Trader).
          </li>
          <li>
            Specify <strong>Input Data</strong> reliance (e.g., &quot;Prioritize RSI
            divergence over MACD&quot;).
          </li>
          <li>
            Set explicit <strong>Constraints</strong> (e.g., &quot;Never trade
            without volume confirmation&quot;).
          </li>
          <li>
            Use <strong>Chain of Thought</strong> prompting by asking it to
            &quot;Think step-by-step&quot;.
          </li>
        </ul>
      </div>
    </div>
  );
}
