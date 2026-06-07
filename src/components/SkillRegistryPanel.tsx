import React, { useMemo, useState } from "react";
import {
  createSkillRegistry,
  filterSkillRegistry,
  personalIntelligenceSkillRegistryFixtures,
  summarizeSkillRegistry,
  type PersonalIntelligenceSkillRegistryEntry,
  type PersonalIntelligenceSkillRiskLevel,
  type PersonalIntelligenceSkillStatus,
} from "../personal-intelligence/skills";

interface SkillRegistryPanelProps {
  accent: string;
}

const STATUS_COLORS: Record<PersonalIntelligenceSkillStatus, string> = {
  available: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10",
  review_required: "text-amber-300 border-amber-400/30 bg-amber-400/10",
  blocked: "text-red-300 border-red-400/30 bg-red-400/10",
  disabled: "text-slate-300 border-slate-400/30 bg-slate-400/10",
};

const RISK_COLORS: Record<PersonalIntelligenceSkillRiskLevel, string> = {
  low: "text-sky-300 border-sky-400/30 bg-sky-400/10",
  medium: "text-amber-300 border-amber-400/30 bg-amber-400/10",
  high: "text-orange-300 border-orange-400/30 bg-orange-400/10",
  critical: "text-red-300 border-red-400/30 bg-red-400/10",
};

const label = (value: string) => value.replaceAll("_", " ");

function Badge({ value, className }: { value: string; className: string }) {
  return (
    <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${className}`}>
      {label(value)}
    </span>
  );
}

function RequirementList({ title, values }: { title: string; values?: string[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</p>
      <p className="mt-1 text-xs text-slate-300">{values?.length ? values.join(", ") : "None declared"}</p>
    </div>
  );
}

function SkillManifestDetail({ entry }: { entry: PersonalIntelligenceSkillRegistryEntry }) {
  const memoryPolicy = entry.memoryPolicy?.access ?? "none";
  return (
    <section className="min-w-0 flex-1 overflow-y-auto border-l border-white/10 bg-black/20 p-5" aria-label="Skill manifest detail">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{entry.manifestId} · v{entry.version}</p>
          <h3 className="mt-1 text-xl font-bold text-white">{entry.name}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{entry.description}</p>
        </div>
        <div className="flex gap-2">
          <Badge value={entry.status} className={STATUS_COLORS[entry.status]} />
          <Badge value={`${entry.riskLevel} risk`} className={RISK_COLORS[entry.riskLevel]} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <RequirementList title="Category" values={[entry.category]} />
        <RequirementList title="Memory policy" values={[memoryPolicy]} />
        <RequirementList title="Permissions" values={entry.requiredPermissions} />
        <RequirementList title="Capabilities" values={entry.requiredCapabilities} />
        <RequirementList title="Required models" values={entry.requiredModels} />
        <RequirementList title="Required tools" values={entry.requiredTools} />
        <RequirementList title="Required connectors" values={entry.requiredConnectors} />
        <RequirementList title="Privacy zones" values={entry.privacyZones} />
      </div>

      <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.025] p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Entrypoint reference · inert text only</p>
        <code className="mt-1 block break-all text-xs text-slate-300">{entry.entrypointRef ?? "Not declared"}</code>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-white">Manifest validation</p>
          <p className="mt-2 text-xs text-slate-400">{entry.manifestValidation.valid ? "Valid for registry inspection" : "Blocked by manifest policy"}</p>
          {[...entry.warnings, ...entry.blockers].map((message) => (
            <p key={message} className="mt-2 text-xs leading-5 text-slate-400">• {message}</p>
          ))}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-white">Readiness</p>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-400">Inspection</span>
            <strong className={entry.readiness.readyForInspection ? "text-emerald-300" : "text-red-300"}>
              {entry.readiness.readyForInspection ? "Ready" : "Blocked"}
            </strong>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">Execution</span>
            <strong className="text-red-300">Disabled</strong>
          </div>
          <p className="mt-3 text-xs text-slate-500">Approval: {entry.readiness.requiresApproval ? "required" : "not requested"} · Sandbox: {entry.readiness.requiresSandbox ? "required" : "not requested"}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-4">
        <p className="text-sm font-bold text-red-200">Execution disabled</p>
        <p className="mt-1 text-xs leading-5 text-red-100/70">This manifest can only be inspected. Its entrypoint is never imported, loaded, or invoked.</p>
        <button type="button" disabled className="mt-3 cursor-not-allowed rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-500">
          Execution disabled
        </button>
      </div>
    </section>
  );
}

export const SkillRegistryPanel: React.FC<SkillRegistryPanelProps> = ({ accent }) => {
  const registry = useMemo(() => createSkillRegistry(personalIntelligenceSkillRegistryFixtures), []);
  const summary = useMemo(() => summarizeSkillRegistry(registry), [registry]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<PersonalIntelligenceSkillStatus | "all">("all");
  const [riskLevel, setRiskLevel] = useState<PersonalIntelligenceSkillRiskLevel | "all">("all");
  const categories = useMemo(() => [...new Set(registry.map((entry) => entry.category))].sort(), [registry]);
  const filtered = useMemo(
    () => filterSkillRegistry(registry, { query, category, status, riskLevel }),
    [category, query, registry, riskLevel, status],
  );
  const [selectedSkillId, setSelectedSkillId] = useState(registry[0]?.skillId ?? "");
  const selected = filtered.find((entry) => entry.skillId === selectedSkillId) ?? filtered[0] ?? registry[0];

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="personal-intelligence-skill-registry">
      <header className="border-b border-white/10 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: accent }}>Personal Intelligence</p>
            <h2 className="mt-1 text-xl font-bold text-white">Skill Registry</h2>
            <p className="mt-1 text-xs text-slate-400">Manifest loading only — execution disabled.</p>
          </div>
          <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
            {[
              ["Loaded", summary.total], ["Available", summary.available], ["Review", summary.reviewRequired],
              ["Blocked", summary.blocked], ["Disabled", summary.disabled],
            ].map(([name, value]) => (
              <div key={name} className="min-w-14 rounded-lg border border-white/10 bg-white/[0.035] px-2 py-2">
                <strong className="block text-sm text-white">{value}</strong><span className="text-slate-500">{name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-xs leading-5 text-amber-100/80">
          Skills cannot run, call tools, call models, write memory, access files, use network, or trigger LucaLink in this PR.
        </div>
      </header>

      <div className="grid grid-cols-1 gap-2 border-b border-white/10 p-3 sm:grid-cols-[1fr_140px_150px_130px]">
        <input aria-label="Search skill manifests" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search manifests…" className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-600" />
        <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-white/10 bg-[#101010] px-3 py-2 text-xs text-slate-300">
          <option value="all">All categories</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value as PersonalIntelligenceSkillStatus | "all")} className="rounded-lg border border-white/10 bg-[#101010] px-3 py-2 text-xs text-slate-300">
          <option value="all">All statuses</option><option value="available">Available</option><option value="review_required">Review required</option><option value="blocked">Blocked</option><option value="disabled">Disabled</option>
        </select>
        <select aria-label="Filter by risk" value={riskLevel} onChange={(event) => setRiskLevel(event.target.value as PersonalIntelligenceSkillRiskLevel | "all")} className="rounded-lg border border-white/10 bg-[#101010] px-3 py-2 text-xs text-slate-300">
          <option value="all">All risks</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
        </select>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="w-full overflow-y-auto p-3 md:w-[42%] md:max-w-md">
          <div className="space-y-2">
            {filtered.map((entry) => (
              <button key={entry.skillId} type="button" onClick={() => setSelectedSkillId(entry.skillId)} className="w-full rounded-xl border p-3 text-left transition-colors hover:bg-white/[0.05]" style={{ borderColor: selected?.skillId === entry.skillId ? `${accent}66` : "rgba(255,255,255,0.1)", backgroundColor: selected?.skillId === entry.skillId ? `${accent}0d` : "rgba(255,255,255,0.02)" }}>
                <div className="flex items-start justify-between gap-2"><span className="text-sm font-bold text-white">{entry.name}</span><Badge value={entry.status} className={STATUS_COLORS[entry.status]} /></div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{entry.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5"><Badge value={`${entry.riskLevel} risk`} className={RISK_COLORS[entry.riskLevel]} />{entry.requiredPermissions.slice(0, 2).map((permission) => <span key={permission} className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-400">{permission}</span>)}</div>
                <div className="mt-3 flex justify-between text-[10px] text-slate-500"><span>Inspection: {entry.readiness.readyForInspection ? "ready" : "blocked"}</span><span className="text-red-300">Execution: disabled</span></div>
              </button>
            ))}
            {filtered.length === 0 && <p className="py-12 text-center text-xs text-slate-500">No manifests match these filters.</p>}
          </div>
        </div>
        {selected && <div className="hidden min-w-0 flex-1 md:flex"><SkillManifestDetail entry={selected} /></div>}
      </div>
    </div>
  );
};
