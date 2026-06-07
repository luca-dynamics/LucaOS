import React from "react";
import type { PersonalIntelligenceSkillSandboxPlan } from "../personal-intelligence/skillSandbox";

const statusColor: Record<PersonalIntelligenceSkillSandboxPlan["status"], string> = {
  draft: "text-slate-300 border-slate-400/30 bg-slate-400/10",
  ready_for_review: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10",
  approval_required: "text-amber-300 border-amber-400/30 bg-amber-400/10",
  blocked: "text-red-300 border-red-400/30 bg-red-400/10",
  disabled: "text-slate-300 border-slate-400/30 bg-slate-400/10",
};

const label = (value: string) => value.replace(/_/g, " ");

function PlanList({ title, values, empty = "None" }: { title: string; values: readonly string[]; empty?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</p>
      {values.length ? values.map((value) => <p key={value} className="mt-1 text-xs leading-5 text-slate-300">• {value}</p>) : <p className="mt-1 text-xs text-slate-500">{empty}</p>}
    </div>
  );
}

export function SkillSandboxPlanPanel({ plan }: { plan: PersonalIntelligenceSkillSandboxPlan }) {
  return (
    <section className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-4" aria-label="Sandbox Plan">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-100">Sandbox Plan</p>
          <p className="mt-1 text-[11px] text-slate-500">{plan.planId}</p>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${statusColor[plan.status]}`}>{label(plan.status)}</span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <PlanList title="Status" values={[label(plan.status)]} />
        <PlanList title="Execution" values={["disabled"]} />
        <PlanList title="Sandbox mode" values={[label(plan.sandboxMode)]} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <PlanList title="Required permissions" values={plan.requiredPermissions.map((item) => `${item.kind}: ${item.label}${item.blocked ? " (blocked)" : ""}`)} empty="No runtime permissions declared" />
        <PlanList title="Required approvals" values={plan.requiredApprovals.map((item) => `${item.label}: unsatisfied`)} empty="No approval gate identified for inspection" />
        <PlanList title="Runtime trace requirements" values={plan.requiredRuntimeTraces.map((item) => `${label(item.stage)} — ${item.expectation}`)} />
        <PlanList title="Rollback expectations" values={[plan.requiredRollbackPlan.reason, ...plan.requiredRollbackPlan.expectedRecoverySteps]} />
        <PlanList title="Allowed surfaces" values={plan.allowedSurfaces} />
        <PlanList title="Blocked surfaces" values={plan.blockedSurfaces} />
      </div>

      <div className="mt-4 rounded-lg border border-red-400/20 bg-red-400/[0.06] p-3 text-xs leading-5 text-red-100/80">
        <p className="font-bold text-red-200">Sandbox planning only — skill execution remains disabled.</p>
        <p>No tools, models, MCP, memory writes, files, network, browser, LucaLink, shell, or generated code are executed.</p>
        <p>Approval planning does not satisfy approval.</p>
      </div>
    </section>
  );
}
