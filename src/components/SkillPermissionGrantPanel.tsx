import React from "react";
import type { PersonalIntelligenceSkillSandboxPlan } from "../personal-intelligence/skillSandbox";
import type { PersonalIntelligenceSkillPermissionGateStatus } from "../personal-intelligence/skillPermissions";
import { useSkillPermissionGrants } from "./SkillPermissionGrantContext";

const STATUS_STYLE: Record<PersonalIntelligenceSkillPermissionGateStatus, string> = {
  pending: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  granted_for_review: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  denied: "border-red-400/30 bg-red-400/10 text-red-200",
  expired: "border-slate-400/30 bg-slate-400/10 text-slate-300",
  blocked: "border-red-500/40 bg-red-500/10 text-red-200",
  requires_primary_approval: "border-violet-400/30 bg-violet-400/10 text-violet-200",
};

const label = (value: string) => value.replace(/_/g, " ");

export function SkillPermissionGrantPanel({ plan }: { plan: PersonalIntelligenceSkillSandboxPlan }) {
  const { state, decide } = useSkillPermissionGrants();
  const gates = state.gates.filter((gate) => gate.planId === plan.planId);

  return (
    <section className="mt-4 rounded-xl border border-violet-400/20 bg-violet-400/[0.04] p-4" aria-label="Permission grant review">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-violet-100">Permission Grant Review</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">Ephemeral, scoped review decisions only. Grants expire after 15 minutes and never authorize execution.</p>
        </div>
        <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2 py-1 text-[10px] font-bold uppercase text-red-200">execution disabled</span>
      </div>

      <div className="mt-3 space-y-2">
        {gates.length === 0 && <p className="text-xs text-slate-500">No permission or approval gates were generated for this plan.</p>}
        {gates.map((gate) => {
          const immutable = gate.status === "blocked" || gate.status === "requires_primary_approval";
          return (
            <div key={gate.gateId} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-200">{gate.label}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">{gate.kind} · {label(gate.permissionKind ?? gate.approvalKind ?? "unknown")}</p>
                </div>
                <span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase ${STATUS_STYLE[gate.status]}`}>{label(gate.status)}</span>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-slate-400">{gate.reason}</p>
              {gate.expiresAt && <p className="mt-1 text-[10px] text-cyan-200/70">Review grant expires {new Date(gate.expiresAt).toLocaleString()}.</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={immutable || gate.status === "granted_for_review"} onClick={() => decide(gate.gateId, "grant_for_review")} className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[10px] font-bold text-cyan-200 disabled:cursor-not-allowed disabled:opacity-30">Grant for review</button>
                <button type="button" disabled={gate.status === "blocked" || gate.status === "denied"} onClick={() => decide(gate.gateId, "deny")} className="rounded-md border border-red-400/30 bg-red-400/10 px-2 py-1 text-[10px] font-bold text-red-200 disabled:cursor-not-allowed disabled:opacity-30">Deny</button>
                <button type="button" disabled={gate.status !== "granted_for_review"} onClick={() => decide(gate.gateId, "expire")} className="rounded-md border border-slate-400/30 bg-slate-400/10 px-2 py-1 text-[10px] font-bold text-slate-300 disabled:cursor-not-allowed disabled:opacity-30">Expire</button>
              </div>
              {gate.status === "requires_primary_approval" && <p className="mt-2 text-[10px] text-violet-200/80">This local review surface cannot grant primary-host authority.</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
