import React from "react";
import type { PersonalIntelligenceRuntimeAuthorityRecord } from "../personal-intelligence/runtimeAuthority";

const label = (value: string) => value.replace(/_/g, " ");

function List({ title, values }: { title: string; values: readonly string[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</p>
      <div className="mt-2 space-y-1 text-xs text-slate-300">
        {values.length
          ? values.map((value) => <p key={value}>• {value}</p>)
          : <p>None recorded</p>}
      </div>
    </div>
  );
}

export function SkillRuntimeAuthorityPanel({
  records,
}: {
  records: readonly PersonalIntelligenceRuntimeAuthorityRecord[];
}) {
  const primary = records.find((record) => record.capabilityKind === "skill_execution") ?? records[0];
  if (!primary) return null;
  return (
    <section className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-4" aria-label="Runtime Authority Boundary">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-amber-100">Runtime Authority Boundary</p>
          <p className="mt-1 text-xs text-slate-400">Read-only capability classification; no runtime authority is enabled.</p>
        </div>
        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] font-bold uppercase text-amber-200">
          {label(primary.authorityClass)} · authority disabled
        </span>
      </div>
      <div className="mt-3 space-y-1 text-xs text-amber-100/80">
        <p>Runtime authority is not granted.</p>
        <p>Future pilot candidate does not mean executable.</p>
        <p>Dry-run success and grant-for-review do not authorize execution.</p>
      </div>
      {primary.authorityClass === "future_pilot_candidate" && (
        <p className="mt-3 rounded-lg border border-amber-400/20 p-3 text-xs text-amber-100/80">
          Future pilot candidate status is advisory only and remains non-executable.
        </p>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <List title="Required evidence" values={primary.requiredEvidence} />
        <List title="Blocked actions" values={primary.blockedActions} />
      </div>
    </section>
  );
}
