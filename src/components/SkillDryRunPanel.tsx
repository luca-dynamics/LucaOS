import React from "react";
import type { PersonalIntelligenceSkillDryRunSimulation } from "../personal-intelligence/skillDryRun";

const label = (value: string) => value.replace(/_/g, " ");

function List({ title, values, empty = "None" }: { title: string; values: readonly string[]; empty?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</p>
      {values.length ? values.map((value) => <p key={value} className="mt-1 text-[11px] leading-5 text-slate-300">• {value}</p>) : <p className="mt-1 text-[11px] text-slate-500">{empty}</p>}
    </div>
  );
}

export function SkillDryRunPanel({ simulation }: { simulation: PersonalIntelligenceSkillDryRunSimulation }) {
  const act = simulation.runtimeTracePreview.stages.find((stage) => stage.stage === "act");
  return (
    <section className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-4" aria-label="Controlled Dry-run Simulation">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-100">Controlled Dry-run Simulation</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">Dry-run simulation only — no skill execution occurs.</p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[10px] font-bold uppercase text-cyan-200">{label(simulation.status)}</span>
          <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2 py-1 text-[10px] font-bold uppercase text-red-200">execution disabled</span>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/[0.05] p-3 text-[11px] leading-5 text-amber-100/80">
        <p>The Act stage is skipped.</p>
        <p>Grant-for-review does not authorize execution.</p>
      </div>

      <div className="mt-3 space-y-2">
        {simulation.simulatedSteps.map((step) => (
          <div key={step.stepId} className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 text-[10px] text-slate-400">{step.order}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold text-slate-200">{step.label}</p><span className="text-[9px] font-bold uppercase text-cyan-200">{label(step.status)}</span></div>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <List title="Required approvals" values={simulation.requiredApprovals} />
        <List title="Missing approvals" values={simulation.missingApprovals} />
        <List title="Denied gates" values={simulation.deniedGates} />
        <List title="Expired gates" values={simulation.expiredGates} />
        <List title="Blocked actions" values={simulation.blockedActions} />
        <List title="Rollback expectations" values={simulation.rollbackExpectations} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Runtime trace preview</p>
          <p className="mt-1 text-[11px] text-slate-300">Act: {act?.status ?? "skipped"} · Learn: candidate only, not persisted</p>
          <p className="mt-1 text-[11px] text-slate-500">{simulation.runtimeTracePreview.stages.length} evidence stages · side effects: none</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Mission alignment summary</p>
          <p className="mt-1 text-[11px] text-slate-300">{simulation.missionAlignmentSummary.summary}</p>
          <p className="mt-1 text-[11px] text-slate-500">Status: {label(simulation.missionAlignmentSummary.status)}</p>
        </div>
      </div>
    </section>
  );
}
