import React, { useState } from "react";
import { Icon } from "../ui/Icon";
import { PersonaConfig, PersonaDefinition } from "../../types";
import { createIdentityProfilePreview } from "../../personal-intelligence";
import { IdentityCorePreviewCard } from "./personalIntelligencePreview";
import {
  SettingsAdvancedDisclosure,
  SettingsCard,
  SettingsRow,
  SettingsSection,
  SettingsStatusCard,
} from "./SettingsLayout";

interface PersonalityDashboardProps {
  theme?: {
    primary: string;
    hex: string;
    themeName: string;
  };
  config: PersonaConfig | null;
  onUpdate: (personaName: string, key: string, value: string) => void;
  isMobile?: boolean;
}

const PersonalityDashboard: React.FC<PersonalityDashboardProps> = ({
  theme = { primary: "text-blue-500", hex: "#3b82f6", themeName: "default" },
  config,
  onUpdate,
  isMobile,
}) => {
  const [selectedPersona, setSelectedPersona] = useState<string>("DEFAULT");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const availablePersonas = config ? Object.keys(config.personas) : [];
  const currentPersona = config ? config.personas[selectedPersona] : null;
  const identityPreview = createIdentityProfilePreview({
    userId: "settings-preview-user",
    displayName: "LucaOS operator",
    preferredName: "Operator",
    communicationStyle: "technical",
    lucaPersonality: {
      tone: currentPersona?.description || "Calm, direct, and collaborative",
      traits: [selectedPersona.toLowerCase(), "user-aligned"],
      boundaries: ["approval-before-action", "privacy-by-default"],
    },
    activeProjects: ["Personal Intelligence settings integration"],
    preferredModels: ["local-first", "user-selected fallback"],
    devicePreferences: [],
    privacyDefaults: { private: "deny", credential: "deny", project: "allow" },
  });

  // Sync local Clean Instruction state when persona changes
  // (State removal cleanup)

  if (!config) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--app-text-muted)] gap-2">
        <Icon
          name="AlertCircle"
          className="w-5 h-5 text-[var(--app-text-muted)]"
        />
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

  return (
    <div className={`space-y-4 flex flex-col ${isMobile ? "px-0 pb-16" : ""}`}>
      <SettingsSection
        title="Personal Intelligence Preview"
        description="Inspect how the current personality surface could map into Identity Core without saving or applying it."
        icon="Eye"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <IdentityCorePreviewCard identity={identityPreview} />
      </SettingsSection>

      <SettingsSection
        title="Luca Personality"
        description="Tune Luca's personality mode, tone, formality, and response style."
        icon="Sparkles"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <SettingsStatusCard
            label="Personality mode"
            value={selectedPersona || "Choose mode"}
            detail="Everyday companion, copilot, researcher, operator, and creator modes stay role-based."
            accentColor={theme.hex}
          />
          <SettingsStatusCard
            label="Tone"
            value="Editable"
            detail="Tone and warmth remain user-facing preferences."
            accentColor={theme.hex}
          />
          <SettingsStatusCard
            label="Formality"
            value="Configurable"
            detail="Response style is controlled by the selected role profile."
            accentColor={theme.hex}
          />
          <SettingsStatusCard
            label="Response style"
            value="Guided"
            detail="Raw persona logic is kept under Advanced / Origin-only."
            accentColor={theme.hex}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Behavior Preferences"
        description="Proactive/passive behavior, concise/detailed responses, risk tolerance, autonomy comfort, and warmth."
        icon="Sliders"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Proactive or passive"
          description="Choose whether Luca waits, suggests, or gets ahead of routine work."
        />
        <SettingsRow
          label="Concise or detailed"
          description="Keep response length preferences product-focused."
        />
        <SettingsRow
          label="Risk tolerance and autonomy comfort"
          description="Safety behavior remains explicit before raw prompt controls."
        />
      </SettingsSection>

      <SettingsSection
        title="Role Profiles"
        description="Everyday companion, developer copilot, researcher, business operator, and creator mode stay framed as roles."
        icon="Users"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsCard>
          <p className="text-sm font-semibold">Selected role profile</p>
          <p className="mt-1 text-xs opacity-70">
            Use the role selector below to choose Luca&apos;s behavior profile.
          </p>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="Boundaries"
        description="What Luca should avoid, sensitive topics, confirmation preferences, and safety behavior."
        icon="ShieldCheck"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Confirmation preferences"
          description="Sensitive actions should remain explicitly confirmed."
        />
        <SettingsRow
          label="Safety behavior"
          description="Boundaries are user-facing; internal persona logic is advanced-only."
        />
      </SettingsSection>

      <SettingsAdvancedDisclosure
        title="Advanced / Origin-only"
        description="Raw system blueprint, system rules, internal persona logic, and creator/admin override are not normal user controls."
      >
        {/* 1. UNIFIED CONSCIOUSNESS (The Global Mind) */}
        <div className="flex flex-col space-y-2 shrink-0">
          <div className="flex justify-between items-center px-1">
            <h3
              className="text-base font-bold flex items-center gap-2"
              style={{ color: "var(--app-text-main, #ffffff)" }}
            >
              <Icon
                name="Sparkles"
                className="w-4 h-4"
                style={{ color: theme.hex }}
              />
              Luca Behavior Rules
            </h3>
            <span
              className={`text-sm px-2 py-0.5 rounded border uppercase tracking-tighter transition-all tech-border`}
              style={{
                backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.2))",
                borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
                color: "var(--app-text-muted, #94a3b8)",
              }}
            >
              Global Behavior Guidance
            </span>
          </div>

          <div
            className={`relative group ${isMobile ? "border-x-0 border-y rounded-none" : "rounded-xl border shadow-2xl"} overflow-hidden focus-within:ring-1 transition-all tech-border`}
            style={{
              backgroundColor: isMobile
                ? "rgba(255,255,255,0.02)"
                : "var(--app-bg-tint, #0a0a0f)",
              borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
            }}
          >
            <div
              className="absolute top-0 left-0 w-1 h-full"
              style={{ backgroundColor: theme.hex }}
            />
            <textarea
              value={globalInstructions}
              onChange={(e) => syncConsciousness(e.target.value)}
              className={`w-full h-[140px] bg-transparent p-3 text-base font-mono outline-none resize-none leading-relaxed custom-scrollbar placeholder-gray-500`}
              style={{ color: "var(--app-text-main, #ffffff)" }}
              spellCheck={false}
              placeholder="Describe the behavior and communication rules Luca should consistently follow. (e.g. 'Be concise', 'Ask before taking sensitive actions')..."
            />
            <div
              className="absolute bottom-1.5 right-3 text-sm flex items-center gap-1 opacity-40"
              style={{ color: "var(--app-text-muted)" }}
            >
              <Icon name="Cpu" className="w-2.5 h-2.5" /> Behavior Core
            </div>
          </div>
        </div>

        <div className="h-px bg-white/5 mx-2" />

        {/* 2. SPECIALIST FOCUS (The Lenses) */}
        <div className="flex-1 flex flex-col min-h-0 space-y-3">
          <div
            className={`flex flex-col md:flex-row justify-between items-start md:items-center ${isMobile ? "p-4 py-6 border-x-0 border-y rounded-none" : "p-2 px-3 rounded-lg border shrink-0 tech-border"} transition-all`}
            style={{
              backgroundColor: isMobile
                ? "rgba(255,255,255,0.02)"
                : "var(--app-bg-tint, #11111a)",
              borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
            }}
          >
            <div className="mb-2 md:mb-0">
              <label className="text-sm font-bold text-[var(--app-text-muted)] uppercase flex items-center gap-1">
                <Icon name="Monitor" className="w-2.5 h-2.5" /> Luca Personas
              </label>
            </div>

            <div className="relative group w-48">
              <select
                value={selectedPersona}
                onChange={(e) => setSelectedPersona(e.target.value)}
                className={`w-full appearance-none rounded-lg px-4 py-1 text-base outline-none transition-colors pr-8 cursor-pointer border tech-border`}
                style={{
                  backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.6))",
                  borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
                  color: "var(--app-text-main, #ffffff)",
                }}
              >
                {availablePersonas.map((p) => (
                  <option
                    key={p}
                    value={p}
                    className="bg-gray-900 text-[var(--app-text-main)]"
                  >
                    {p}
                  </option>
                ))}
              </select>
              <div
                className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"
                style={{ color: "var(--app-text-muted)" }}
              >
                <Icon name="Terminal" className="w-3 h-3" />
              </div>
            </div>
          </div>

          {currentPersona ? (
            <div className="space-y-4 pb-4">
              {/* ADVANCED TOGGLE - Small and subtle at the bottom */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={`text-sm uppercase tracking-[0.2em] transition-all flex items-center gap-2 px-3 py-1 rounded-full border tech-border`}
                  style={{
                    backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.2))",
                    borderColor:
                      "var(--app-border-main, rgba(255,255,255,0.1))",
                    color: "var(--app-text-muted, #94a3b8)",
                  }}
                >
                  {showAdvanced ? (
                    <Icon name="Lock" className="w-2 h-2" />
                  ) : (
                    <Icon name="Settings" className="w-2 h-2" />
                  )}
                  {showAdvanced
                    ? "Hide Technical Details"
                    : "View Behavior Blueprint"}
                </button>
              </div>

              {showAdvanced && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* 3. ARCHETYPE BLUEPRINT (The technical readout) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-sm font-bold text-[var(--app-text-muted)] uppercase flex items-center gap-1.5">
                        <Icon name="Database" className="w-3 h-3" /> Behavior
                        Blueprint
                      </label>
                      <span className="text-sm text-[var(--app-text-muted)] italic">
                        READ-ONLY
                      </span>
                    </div>

                    <div
                      className={`relative group/blueprint ${isMobile ? "border-x-0 border-y rounded-none" : "rounded-xl border shadow-inner"} overflow-hidden transition-all tech-border`}
                      style={{
                        backgroundColor: isMobile
                          ? "rgba(255,255,255,0.02)"
                          : "var(--app-bg-tint, rgba(0,0,0,0.2))",
                        borderColor:
                          "var(--app-border-main, rgba(255,255,255,0.1))",
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-transparent pointer-events-none" />
                      <div
                        className={`w-full min-h-[140px] p-4 text-base font-mono whitespace-pre-wrap leading-relaxed`}
                        style={{ color: "var(--app-text-muted, #94a3b8)" }}
                      >
                        {resolvedBase ||
                          "Behavior identity for this persona is currently loading or encrypted..."}
                      </div>

                      {/* Overlay label to clarify purpose */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-10 group-hover/blueprint:opacity-100 transition-opacity pointer-events-none">
                        <Icon
                          name="Lock"
                          className="w-2.5 h-2.5"
                          style={{ color: "var(--app-text-muted)" }}
                        />
                        <span
                          className="text-sm font-bold uppercase"
                          style={{ color: "var(--app-text-muted)" }}
                        >
                          Persona Logic
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 px-1 py-1">
                      <div className="flex items-center gap-2 flex-1">
                        <Icon
                          name="Mic"
                          className="w-3 h-3 text-[var(--app-text-muted)]"
                        />
                        <input
                          className={`bg-transparent border-none p-0 text-base w-full focus:ring-0 placeholder-gray-800 transition-colors text-[var(--app-text-muted)] focus:text-[var(--app-text-main)]`}
                          value={currentPersona.voiceName}
                          onChange={(e) =>
                            updateArchetypeField("voiceName", e.target.value)
                          }
                          placeholder="Voice Identification..."
                        />
                      </div>
                      <div className="text-sm text-[var(--app-text-muted)] uppercase tracking-widest hidden md:block">
                        Active Voice Signature
                      </div>
                    </div>
                  </div>

                  {/* Protocol Status Footer */}
                  <div className="flex items-center gap-3 pt-4 border-t border-white/5 mt-2">
                    <div className="flex flex-wrap gap-2 items-center flex-1">
                      <span className="text-sm text-[var(--app-text-muted)] font-bold uppercase">
                        Protocols:
                      </span>
                      {hasMetacognition && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/5 border border-blue-500/10 text-sm text-blue-500/60 uppercase">
                          <Icon name="Cpu" className="w-2.5 h-2.5" />{" "}
                          Metacognition
                        </div>
                      )}
                      {hasMemory && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/5 border border-purple-500/10 text-sm text-purple-500/60 uppercase">
                          <Icon name="Database" className="w-2.5 h-2.5" />{" "}
                          Contextual Memory
                        </div>
                      )}
                      {hasPlatform && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/5 border border-green-500/10 text-sm text-green-500/60 uppercase">
                          <Icon name="Globe" className="w-2.5 h-2.5" /> Platform
                          Awareness
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-[var(--app-text-muted)] font-bold uppercase">
                      Persona Logic Encrypted
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className={`flex-1 flex items-center justify-center border border-dashed rounded-xl border-[var(--app-border-main)] bg-[var(--app-bg-tint)]`}
            >
              <span className="text-[var(--app-text-muted)] text-base uppercase tracking-widest">
                Awaiting Lens Selection...
              </span>
            </div>
          )}
        </div>
      </SettingsAdvancedDisclosure>
    </div>
  );
};

export default PersonalityDashboard;
