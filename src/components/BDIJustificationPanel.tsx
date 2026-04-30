import React, { useState, useEffect } from "react";
import { mentalStateService } from "../services/mentalStateService";
import { Icon } from "./ui/Icon";
import { eventBus } from "../services/eventBus";
import { forgeProposalService } from "../services/forgeProposalService";
import { settingsService } from "../services/settingsService";
import { getThemeColors } from "../config/themeColors";

const BDIJustificationPanel: React.FC = () => {
  const [intentions, setIntentions] = useState(
    Array.from(mentalStateService.intentions.values()).filter(
      (i) => i.status === "COMMIT" || i.status === "IN_PROGRESS"
    )
  );
  const desires = Array.from(mentalStateService.desires.values());
  const beliefs = Array.from(mentalStateService.beliefs.values());

  const [proposals, setProposals] = useState(forgeProposalService.getProposals());

  // Theme Integration
  const currentPersona =
    settingsService.getSettings().general.persona || "ASSISTANT";
  const theme = getThemeColors(currentPersona);
  const themeHex = theme.hex || "#3b82f6";
  const themePrimary = theme.primary || "text-white";

  const brainSettings = settingsService.getSettings().brain;
  const activeBrain = brainSettings.model 
        ? (brainSettings.model.startsWith('local/') ? brainSettings.model.split('/')[1] : brainSettings.model)
        : "UNASSIGNED";
  const activeEmbed = settingsService.getSettings().brain.embeddingModel
        ? (settingsService.getSettings().brain.embeddingModel.startsWith('local/') ? brainSettings.embeddingModel.split('/')[1] : brainSettings.embeddingModel)
        : "CLOUD_FALLBACK";

  const isTactical = localStorage.getItem("LUCA_USER_TACTICAL") === "true";

  useEffect(() => {
    const update = () => {
      setIntentions(
        Array.from(mentalStateService.intentions.values()).filter(
          (i) => i.status === "COMMIT" || i.status === "IN_PROGRESS"
        )
      );
      setProposals(forgeProposalService.getProposals());
    };
    eventBus.on("bdi:intention-committed", update);
    eventBus.on("bdi:intention-updated", update);
    eventBus.on("forge:proposal-created", update);
    eventBus.on("forge:proposal-applied", update);
    return () => {
      eventBus.off("bdi:intention-committed", update);
      eventBus.off("bdi:intention-updated", update);
      eventBus.off("forge:proposal-created", update);
      eventBus.off("forge:proposal-applied", update);
    };
  }, []);


  const evolutionDesires = desires.filter((d) =>
    d.description.startsWith("EVOLVE_REMEDIATE:"),
  );

  const lessons = mentalStateService.getActiveLessons();
  const isDev = typeof __LUCA_DEV_MODE__ !== "undefined" && __LUCA_DEV_MODE__;

  return (
    <div className="w-full h-full relative flex flex-col gap-8 p-6 overflow-y-auto animate-in slide-in-from-right duration-500 glass-blur custom-scrollbar">
      {/* HIVE MIND CONDUIT - Build Guarded */}
      {isDev && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-[2px] opacity-40 animate-shimmer-vertical pointer-events-none" 
          style={{ background: `linear-gradient(to bottom, transparent, ${themeHex}, transparent)` }}
        />
      )}
      <header className="border-b border-[var(--app-border-main)] pb-6 flex justify-between items-end">
        <div className="space-y-1">
          <h3
            className="text-xl font-black tracking-[0.2em] uppercase italic flex items-center gap-3"
            style={{ color: "var(--app-text-main)" }}
          >
            <Icon
              name="ShieldCheck"
              variant="BoldDuotone"
              size={24}
              color="var(--app-primary)"
            />
            Sovereign Auditor
          </h3>
          <p className="text-[10px] text-[var(--app-text-muted)] uppercase font-black tracking-[0.2em]">
            Cognition verified: {new Date().toLocaleTimeString()} | BDI-L6 Active
          </p>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded border border-white/10">
                <Icon name="Brain" size={10} className="text-blue-400" />
                <span className="text-[8px] font-mono font-black text-[var(--app-text-main)] uppercase">{activeBrain}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded border border-white/10">
                <Icon name="Database" size={10} className="text-emerald-400" />
                <span className="text-[8px] font-mono font-black text-[var(--app-text-main)] uppercase">{activeEmbed}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-[9px] text-[var(--app-text-muted)] font-black uppercase tracking-widest">
            Steering Reduction
          </span>
          <div
            className="w-28 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5"
          >
            <div
              className="h-full transition-all duration-1000 ease-out"
              style={{
                width: `${Math.min(
                  100,
                  (beliefs.filter((b) => b.priority >= 10).length /
                    (beliefs.length || 1)) *
                    100,
                )}%`,
                backgroundColor: themeHex,
                boxShadow: `0 0 10px ${themeHex}`,
              }}
            />
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-10">
        {/* EVOLUTION QUEUE (Phase 6) */}
        {evolutionDesires.length > 0 && (
          <section className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-2xl glass-blur">
            <div className="flex items-center gap-3 mb-4">
              <Icon name="Zap" size={16} className="text-amber-500" />
              <h4 className="text-[10px] text-amber-500 font-black uppercase tracking-[0.3em]">
                Evolution Queue (Autonomous Remediation)
              </h4>
            </div>
            <div className="space-y-4">
              {evolutionDesires.map((ed) => (
                <div
                  key={ed.id}
                  className="flex flex-col gap-1.5 border-l-2 border-amber-500/40 pl-4 py-1"
                >
                  <div className="text-sm text-amber-100 font-bold">
                    {ed.description.replace("EVOLVE_REMEDIATE: ", "")}
                  </div>
                  <div className="text-[10px] text-amber-500/60 italic font-medium">
                    Justification: System pattern detected. Use &apos;evolveCodeSafe&apos;
                    to proceed.
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION: REFLEX ENGINE (Phase 11 RECOVERED) */}
        {lessons.length > 0 && (
          <section className="space-y-4 bg-purple-500/5 border border-purple-500/20 p-5 rounded-2xl glass-blur">
             <div className="flex items-center gap-3 mb-4">
                <Icon name="Activity" size={16} className="text-purple-400" />
                <h4 className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">
                  {isTactical ? "Reflex Mutations" : "Instinctive Adjustments"}
                </h4>
             </div>
             <div className="grid grid-cols-1 gap-2">
                {lessons.map(lesson => (
                  <div key={lesson.id} className="border-l-2 border-purple-500/40 pl-3 py-1 flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                    <span className="text-xs text-purple-100 font-mono">{lesson.fact}</span>
                  </div>
                ))}
             </div>
          </section>
        )}

        {/* SECTION: SOVEREIGN FORGE (Phase 12 RECOVERED) */}
        {proposals.filter(p => p.status === 'PENDING').length > 0 && (
          <section className="space-y-4 bg-amber-500/5 border border-amber-500/20 p-5 rounded-2xl glass-blur animate-in slide-in-from-top-4 duration-700">
            <div className="flex items-center gap-3 mb-4">
              <Icon name="Wrench" size={16} className="text-amber-500" />
              <h4 className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">
                {isTactical ? "Evolution Proposals" : "Internal Integration Requests"}
              </h4>
            </div>
            <div className="space-y-3">
              {proposals.filter(p => p.status === 'PENDING').map(prop => (
                <div key={prop.id} className="bg-black/40 border border-amber-500/20 p-4 rounded-xl space-y-3">
                  <div className="text-sm font-bold text-amber-100">{prop.title}</div>
                  <p className="text-[11px] text-amber-500/70 italic leading-relaxed">{prop.problem}</p>
                  <button 
                    onClick={() => forgeProposalService.approveProposal(prop.id)}
                    className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Forge Remediation
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {intentions.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center py-20 opacity-40 gap-5">
            <div className="relative">
              <Icon
                name="Cpu"
                size={64}
                className="animate-pulse"
                color="var(--app-primary)"
              />
              <div className="absolute inset-0 blur-2xl opacity-20 bg-[var(--app-primary)] animate-pulse" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--app-text-main)" }}>
                No active mission commitments
              </p>
              <p className="text-[10px] text-[var(--app-text-muted)] uppercase tracking-wider">
                Standing by for operator directive
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {intentions.map((intention) => {
              const desire = desires.find((d) => d.id === intention.fulfills);

              return (
                <div
                  key={intention.id}
                  className="relative pl-8 border-l border-[var(--app-border-main)] py-2"
                >
                  {/* Junction point */}
                  <div
                    className="absolute -left-[5px] top-4 w-2.5 h-2.5 rounded-full shadow-lg"
                    style={{
                      backgroundColor: themeHex,
                      boxShadow: `0 0 15px ${themeHex}`,
                    }}
                  />

                  <div className="space-y-6">
                    {/* INTENTION */}
                    <div
                      className="p-5 rounded-2xl border glass-blur transition-all"
                      style={{
                        backgroundColor: "var(--app-bg-tint)",
                        borderColor: "var(--app-border-main)",
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="text-[10px] text-[var(--app-text-muted)] uppercase font-black tracking-widest italic">
                          Current Commitment
                        </div>
                        <span
                          className={`px-3 py-1 text-[9px] font-black uppercase rounded-lg border tracking-widest
                          ${
                            intention.complexity >= 8
                              ? "bg-red-500/10 text-red-500 border-red-500/30"
                              : `bg-white/5 border-white/10 ${themePrimary}`
                          }`}
                        >
                          Complexity: {intention.complexity}/10
                        </span>
                      </div>
                      <div
                        className="text-lg leading-relaxed font-black mb-3 italic"
                        style={{ color: "var(--app-text-main)" }}
                      >
                        {intention.plan}
                      </div>
                      <div className="text-[11px] text-[var(--app-text-muted)] italic border-t border-[var(--app-border-main)] pt-3 font-medium leading-relaxed">
                        Trace: {intention.justification}
                      </div>
                    </div>

                    {/* DESIRE */}
                    {desire && (
                      <div className="flex items-start gap-5 ml-4">
                        <div className="mt-8 opacity-40">
                             <Icon name="AltArrowDown" size={20} color="var(--app-text-muted)" />
                        </div>
                        <div
                          className="p-5 rounded-2xl border glass-blur flex-1"
                          style={{
                            backgroundColor: "rgba(0,0,0,0.2)",
                            borderColor: "var(--app-border-main)",
                          }}
                        >
                          <div className="flex justify-between items-center mb-4">
                            <div className="text-[10px] text-[var(--app-text-muted)] uppercase font-black tracking-widest italic">
                              Driving Goal
                            </div>
                            <span
                              className={`text-[9px] px-2.5 py-1 rounded-lg font-black tracking-widest border
                              ${
                                desire.source === "DIRECTIVE"
                                  ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                                  : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                              }`}
                            >
                              {desire.source}
                            </span>
                          </div>
                          <div
                            className="text-sm font-bold mb-4 italic leading-relaxed"
                            style={{ color: "var(--app-text-main)" }}
                          >
                            {desire.description}
                          </div>

                          <div className="text-[9px] text-[var(--app-text-muted)] uppercase font-black mb-2 tracking-widest">
                            Motivating Beliefs
                          </div>
                          <div className="flex flex-wrap gap-2.5">
                            {desire.motivatedBy.map((beliefId) => {
                              const belief = beliefs.find((b) => b.id === beliefId);
                              if (!belief) return null;
                              const isCritical = belief.priority >= 10;

                              return (
                                <div
                                  key={beliefId}
                                  className={`px-3 py-1.5 flex items-center gap-2 rounded-xl text-[10px] border font-bold
                                  ${
                                    isCritical
                                      ? "bg-red-500/10 border-red-500/30 text-red-100"
                                      : "bg-black/30 border-white/5 text-[var(--app-text-muted)]"
                                  }`}
                                >
                                  {isCritical && (
                                    <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse shadow-[0_0_5px_red]" />
                                  )}
                                  {belief.fact}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Belief Bank Snapshot */}
      <footer className="mt-auto pt-8 border-t border-[var(--app-border-main)]">
        <div className="text-[10px] text-[var(--app-text-muted)] font-black mb-4 uppercase tracking-[0.3em] flex justify-between items-center">
          <span className="flex items-center gap-2">
               <Icon name="Database" size={14} color="var(--app-text-muted)" />
               Sovereign Context Bank
          </span>
          <span className={`px-2 py-0.5 rounded-lg border bg-white/5 ${themePrimary} border-white/10`}>
            {beliefs.length} ACTIVE
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {beliefs.slice(-4).map((b) => {
            const isCritical = b.priority >= 10;
            const isFoundational = b.priority >= 8 && !isCritical;

            return (
              <div
                key={b.id}
                className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all glass-blur
                ${
                  isCritical
                    ? "border-red-500/30 bg-red-500/5 shadow-[inset_0_0_15px_rgba(239,68,68,0.1)]"
                    : "border-[var(--app-border-main)] bg-black/20 hover:bg-black/40"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span
                    className={`text-[8px] font-black px-2 py-0.5 rounded-lg tracking-widest uppercase
                    ${
                      isCritical
                        ? "text-red-400 bg-red-400/10 border border-red-400/20"
                        : isFoundational
                        ? "text-purple-400 bg-purple-400/10 border border-purple-400/20"
                        : "text-[var(--app-primary)] bg-[var(--app-primary)]/10 border border-[var(--app-primary)]/20"
                    }`}
                  >
                    {isCritical
                      ? "Correction"
                      : isFoundational
                      ? "Directive"
                      : "Inference"}
                  </span>
                  <span className="text-[8px] text-[var(--app-text-muted)] font-mono opacity-60">
                    ID: {b.id.slice(0, 4)}
                  </span>
                </div>
                <span
                  className={`text-[10px] leading-relaxed font-bold ${
                    isCritical ? "text-red-100" : "text-[var(--app-text-main)]"
                  }`}
                >
                  {b.fact}
                </span>
              </div>
            );
          })}
        </div>
      </footer>
    </div>
  );
};

export default BDIJustificationPanel;

