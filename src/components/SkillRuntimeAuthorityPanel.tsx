import React from "react";
import type { PersonalIntelligenceRuntimeAuthorityRecord } from "../personal-intelligence/runtimeAuthority";

const label = (value: string) => value.replace(/_/g, " ");
function List({ title, values }: { title: string; values: readonly string[] }) {
  return <div className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</p>{values.length ? values.map((value) => <p key={value} className="mt-1 text-[11px] leading-5 text-slate-300">• {value}</p>) : <p className="mt-1 text-[11px] text-slate-500">None recorded</p>}</div>;
}
export function SkillRuntimeAuthorityPanel({ records }: { records: readonly PersonalIntelligenceRuntimeAuthorityRecord[] }) {
  const primary = records.find((record) => record.capabilityKind === "skill_execution") ?? records[0];
  if (!primary) return null;
  return <section className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_12%,transparent)]/[0.04] p-4" aria-label="Runtime Authority Boundary">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wider text-[var(--luca-accent-primary,#9b7cff)]">Runtime Authority Boundary</p><p className="mt-1 text-[11px] text-slate-400">Read-only capability classification; no runtime authority is enabled.</p></div><div className="flex gap-2"><span className="rounded-full border border-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_12%,transparent)] px-2 py-1 text-[10px] font-bold uppercase text-[var(--luca-accent-primary,#9b7cff)]">{label(primary.authorityClass)}</span><span className="rounded-full border border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] px-2 py-1 text-[10px] font-bold uppercase text-[var(--luca-danger,#f87171)]">authority disabled</span></div></div>
    <div className="mt-3 rounded-lg border border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]/[0.05] p-3 text-[11px] leading-5 text-[var(--luca-warning,#f2b23e)]"><p>Runtime authority is not granted.</p><p>Future pilot candidate does not mean executable.</p><p>Dry-run success and grant-for-review do not authorize execution.</p></div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2"><List title="Capability kind" values={[label(primary.capabilityKind)]} /><List title="Required evidence" values={primary.requiredEvidence} /><List title="Required approvals" values={primary.requiredApprovals} /><List title="Blocked actions" values={primary.blockedActions} /></div>
    {primary.authorityClass === "future_pilot_candidate" && <p className="mt-3 text-[11px] text-[var(--luca-accent-primary,#9b7cff)]">Future pilot candidate status is advisory only and remains non-executable.</p>}
  </section>;
}
