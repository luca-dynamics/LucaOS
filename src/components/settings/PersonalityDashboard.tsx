import React, { useState } from "react";
import * as LucideIcons from "lucide-react";
const {
  AlertCircle,
  Terminal,
  Sparkles,
  Cpu,
  Database,
  Monitor,
  Lock,
  Mic,
  Settings,
  Globe,
} = LucideIcons as any;
import { PersonaConfig, PersonaDefinition } from "../../types";

interface PersonalityDashboardProps {
  theme?: {
    primary: string;
    hex: string;
    themeName: string;
  };
  config: PersonaConfig | null;
  onUpdate: (
    personaName: string,
    key: string, // Changed to string to support root level keys like 'globalInstructions'
    value: string,
  ) => void;
}

const PersonalityDashboard: React.FC<PersonalityDashboardProps> = ({
  theme = { primary: "text-blue-500", hex: "#3b82f6", themeName: "lucagent" },
  config,
  onUpdate,
}) => {
  const [selectedPersona, setSelectedPersona] = useState<string>("DEFAULT");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const availablePersonas = config ? Object.keys(config.personas) : [];
  const currentPersona = config ? config.personas[selectedPersona] : null;

  // Sync local Clean Instruction state when persona changes
  // (State removal cleanup)

  if (!config) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 gap-2">
        <AlertCircle className="w-5 h-5 text-gray-500" />
        <span className="text-sm">Loading Personality...</span>
      </div>
    );
  }

  // --- HELPER LOGIC ---

  // 1. Identify which tags are present
  // (We use the combined instruction to detect tags so the chips remain accurate)
  const hasMetacognition = (currentPersona?.instruction || "").includes(
    "{{METACOGNITION_PROTOCOL}}",
  );
  const hasMemory = (
    config.personas[selectedPersona]?.instruction || ""
  ).includes("{{MEMORY}}");
  const hasPlatform = (
    config.personas[selectedPersona]?.instruction || ""
  ).includes("{{PLATFORM}}");

  // 2. Resolve Data (One Mind Logic)
  const globalInstructions = config.globalInstructions || "";

  // Robust Key Matching (Case Insensitive)
  const personaKey =
    availablePersonas.find(
      (k) => k.toUpperCase() === selectedPersona.toUpperCase(),
    ) || selectedPersona;
  const targetPersona = config.personas[personaKey];

  // Resolve the "Blueprint" for the current lens
  const resolvedBase =
    targetPersona?.baseInstruction !== undefined
      ? targetPersona.baseInstruction
      : targetPersona?.instruction
        ? stripTags(targetPersona.instruction)
        : "";

  // 3. Strip tags for cleaner display (Resilient pattern)
  function stripTags(text: string) {
    if (typeof text !== "string") return "";

    const cleaned = text
      .replace(/{{CORE_IDENTITY}}/g, "")
      .replace(/You are LUCA \(Logic\/Utility\/Core\/Agent\)\./g, "")
      .replace(/{{METACOGNITION_PROTOCOL}}/g, "")
      .replace(/{{MEMORY}}/g, "")
      .replace(/{{PLATFORM}}/g, "")
      .replace(/MEMORY:/g, "")
      .replace(/=== GLOBAL BEHAVIORAL TUNING ===[\s\S]*$/, "")
      .replace(/=== USER CUSTOM INSTRUCTIONS ===[\s\S]*$/, "")
      .trim();

    // If we stripped everything, return a snippet of the original instead of empty
    if (!cleaned && text.length > 0) {
      return text.slice(0, 100) + "...";
    }

    return cleaned
      .split("\n")
      .filter((l) => l.trim())
      .join("\n");
  }

  // 4. Unified Sync Logic (Optimized for One Mind)
  const syncConsciousness = (newGlobal: string) => {
    // 1. Update the Global Context at ROOT
    onUpdate("ROOT", "globalInstructions", newGlobal);

    // 2. We skip mass-updating every persona object to avoid state thrashing.
    // Instead, we ensure the ACTIVE persona is updated so the LLM gets the new prompt immediately.
    if (selectedPersona && currentPersona) {
      updatePersonaFullPrompt(selectedPersona, newGlobal);
    }
  };

  const updatePersonaFullPrompt = (pName: string, globalText: string) => {
    const p = config.personas[pName];
    if (!p) return;

    const pBase = p.baseInstruction || stripTags(p.instruction);
    const preamble = "You are LUCA (Logic/Utility/Core/Agent).";

    let finalPrompt = `${preamble}\n\n${pBase}`;
    if (globalText.trim()) {
      finalPrompt += `\n\n=== GLOBAL BEHAVIORAL TUNING ===\n${globalText}`;
    }

    // Preserve protocols
    if (p.instruction.includes("{{METACOGNITION_PROTOCOL}}"))
      finalPrompt += `\n\n{{METACOGNITION_PROTOCOL}}`;
    if (p.instruction.includes("{{MEMORY}}"))
      finalPrompt += `\n\nMEMORY: {{MEMORY}}`;
    if (p.instruction.includes("{{PLATFORM}}"))
      finalPrompt += `\n\n{{PLATFORM}}`;

    // Only update if changed to prevent unnecessary cycles
    if (finalPrompt !== p.instruction) {
      onUpdate(pName, "instruction", finalPrompt);
      onUpdate(pName, "baseInstruction", pBase);
      onUpdate(pName, "userInstruction", globalText);
    }
  };

  const updateArchetypeField = (
    key: keyof PersonaDefinition,
    value: string,
  ) => {
    onUpdate(selectedPersona, key, value);
    // If we update baseInstruction, we trigger a re-sync of the full instruction
    if (key === "baseInstruction") {
      setTimeout(
        () => updatePersonaFullPrompt(selectedPersona, globalInstructions),
        0,
      );
    }
  };

  // Glassmorphism helper styles
  const glassCardStyle = {
    backgroundColor: `${theme.hex}0d`, // 5% opacity
    borderColor: `${theme.hex}33`, // 20% opacity
  };

  return (
    <div className="space-y-4 flex flex-col">
      {/* 1. UNIFIED CONSCIOUSNESS (The Global Mind) */}
      <div className="flex flex-col space-y-2 shrink-0">
        <div className="flex justify-between items-center px-1">
          <h3
            className="text-sm font-bold flex items-center gap-2"
            style={{
              color:
                theme.themeName?.toLowerCase() === "lucagent"
                  ? "#1e1b4b"
                  : theme.hex === "#111827"
                    ? "#ffffff"
                    : theme.hex,
            }}
          >
            <Sparkles className="w-4 h-4" />
            CORE SYSTEM RULES
          </h3>
          <span
            className={`text-[9px] px-2 py-0.5 rounded border uppercase tracking-tighter ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.03] text-slate-500 border-black/10" : "bg-white/5 border-white/10 text-gray-500"}`}
          >
            Primary Directives
          </span>
        </div>

        <div
          className={`relative group rounded-xl border overflow-hidden focus-within:ring-1 transition-all shadow-2xl ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-white border-black/10 focus-within:ring-black/5" : "bg-black/40 border-white/10 focus-within:ring-white/20"}`}
        >
          <div
            className="absolute top-0 left-0 w-1 h-full"
            style={{
              backgroundColor:
                theme.themeName?.toLowerCase() === "lucagent"
                  ? "#4f46e5"
                  : theme.hex === "#111827"
                    ? "#ffffff"
                    : theme.hex,
            }}
          />
          <textarea
            value={globalInstructions}
            onChange={(e) => syncConsciousness(e.target.value)}
            className={`w-full h-[100px] bg-transparent p-3 text-xs font-mono outline-none resize-none leading-relaxed custom-scrollbar placeholder-gray-500 ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-800" : "text-gray-200"}`}
            spellCheck={false}
            placeholder="Enter the core system rules and behavioral logic that Luca must ALWAYS follow. (e.g. 'Always be concise', 'Never mention the word technical')..."
          />
          <div className="absolute bottom-1.5 right-3 text-[10px] text-gray-400 flex items-center gap-1 opacity-40">
            <Cpu className="w-2.5 h-2.5" /> Logical Core
          </div>
        </div>
      </div>

      <div className="h-px bg-white/5 mx-2" />

      {/* 2. SPECIALIST FOCUS (The Lenses) */}
      <div className="flex-1 flex flex-col min-h-0 space-y-3">
        <div
          className={`flex flex-col md:flex-row justify-between items-start md:items-center p-2 px-3 rounded-lg border shrink-0 ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.03] border-black/5" : "border-white/5 bg-white/5"}`}
          style={theme.themeName?.toLowerCase() === "lucagent" ? undefined : glassCardStyle}
        >
          <div className="mb-2 md:mb-0">
            <label className="text-[9px] font-bold text-gray-500 uppercase flex items-center gap-1">
              <Monitor className="w-2.5 h-2.5" /> System Personas
            </label>
          </div>

          <div className="relative group w-48">
            <select
              value={selectedPersona}
              onChange={(e) => setSelectedPersona(e.target.value)}
              className={`w-full appearance-none rounded-lg px-4 py-1 text-xs outline-none transition-colors pr-8 cursor-pointer ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-white border-black/10 text-slate-900 hover:bg-black/[0.02]" : "bg-black/60 border-white/10 text-white hover:bg-white/5"}`}
              style={{
                borderColor:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(0,0,0,0.15)"
                    : theme.hex === "#111827"
                      ? "rgba(255,255,255,0.4)"
                      : theme.hex,
              }}
            >
              {availablePersonas.map((p) => (
                <option key={p} value={p} className="bg-gray-900 text-white">
                  {p}
                </option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
              <Terminal className="w-3 h-3" />
            </div>
          </div>
        </div>

        {currentPersona ? (
          <div className="space-y-4 pb-4">
            {/* ADVANCED TOGGLE - Small and subtle at the bottom */}
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`text-[8px] uppercase tracking-[0.2em] transition-colors flex items-center gap-2 px-3 py-1 rounded-full border ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5 border-black/5 text-slate-500 hover:text-slate-900" : "text-gray-700 hover:text-gray-400 border-white/5 bg-white/5"}`}
              >
                {showAdvanced ? (
                  <Lock className="w-2 h-2" />
                ) : (
                  <Settings className="w-2 h-2" />
                )}
                {showAdvanced
                  ? "Hide System Logic"
                  : "View Technical Blueprint"}
              </button>
            </div>

            {showAdvanced && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {/* 3. ARCHETYPE BLUEPRINT (The technical readout) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                      <Database className="w-3 h-3" /> System Blueprint
                    </label>
                    <span className="text-[8px] text-gray-600 italic">
                      READ-ONLY
                    </span>
                  </div>

                  <div
                    className={`relative group/blueprint rounded-xl border overflow-hidden ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.03] border-black/10" : "bg-black/60 border-white/5"}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-transparent pointer-events-none" />
                    <div
                      className={`w-full min-h-[100px] p-4 text-[10px] font-mono whitespace-pre-wrap leading-relaxed ${resolvedBase ? (theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-700" : "text-gray-400") : "text-gray-700 italic"}`}
                    >
                      {resolvedBase ||
                        "System identity for this lens is currently loading or encrypted..."}
                    </div>

                    {/* Overlay label to clarify purpose */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-10 group-hover/blueprint:opacity-100 transition-opacity pointer-events-none">
                      <Lock className="w-2.5 h-2.5 text-gray-700" />
                      <span className="text-[8px] text-gray-700 font-bold uppercase">
                        System Logic
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 px-1 py-1">
                    <div className="flex items-center gap-2 flex-1">
                      <Mic className="w-3 h-3 text-gray-600" />
                      <input
                        className={`bg-transparent border-none p-0 text-[10px] w-full focus:ring-0 placeholder-gray-800 transition-colors ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-600 focus:text-slate-900" : "text-gray-400 focus:text-white"}`}
                        value={currentPersona.voiceName}
                        onChange={(e) =>
                          updateArchetypeField("voiceName", e.target.value)
                        }
                        placeholder="Voice Identification..."
                      />
                    </div>
                    <div className="text-[8px] text-gray-600 uppercase tracking-widest hidden md:block">
                      Active Voice Signature
                    </div>
                  </div>
                </div>

                {/* Protocol Status Footer */}
                <div className="flex items-center gap-3 pt-4 border-t border-white/5 mt-2">
                  <div className="flex flex-wrap gap-2 items-center flex-1">
                    <span className="text-[9px] text-gray-600 font-bold uppercase">
                      Protocols:
                    </span>
                    {hasMetacognition && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/5 border border-blue-500/10 text-[8px] text-blue-500/60 uppercase">
                        <Cpu className="w-2.5 h-2.5" /> Metacognition
                      </div>
                    )}
                    {hasMemory && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/5 border border-purple-500/10 text-[8px] text-purple-500/60 uppercase">
                        <Database className="w-2.5 h-2.5" /> Contextual Memory
                      </div>
                    )}
                    {hasPlatform && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/5 border border-green-500/10 text-[8px] text-green-500/60 uppercase">
                        <Globe className="w-2.5 h-2.5" /> Platform Awareness
                      </div>
                    )}
                  </div>
                  <div className="text-[8px] text-gray-800 font-bold uppercase">
                    System Logic Encrypted
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center border border-dashed border-white/5 rounded-xl bg-black/5">
            <span className="text-gray-600 text-[10px] uppercase tracking-widest">
              Awaiting Lens Selection...
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalityDashboard;
