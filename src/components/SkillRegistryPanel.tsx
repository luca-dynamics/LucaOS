import React, { useEffect, useMemo, useState } from "react";
import {
  createSkillRegistry,
  filterSkillRegistry,
  personalIntelligenceSkillRegistryFixtures,
  summarizeSkillRegistry,
  type PersonalIntelligenceSkillRegistryEntry,
  type PersonalIntelligenceSkillRiskLevel,
  type PersonalIntelligenceSkillStatus,
} from "../personal-intelligence/skills";
import { createPersonalIntelligenceSkillSandboxPlan } from "../personal-intelligence/skillSandbox";
import { createPersonalIntelligenceRuntimeCapabilityRegistry } from "../personal-intelligence/runtimeAuthority";
import type { MissionAlignmentEvaluation } from "../personal-intelligence/missionRuntime";
import { skillRegistryService } from "../services/skills/SkillRegistryService";
import { buildSkillRegistryEntriesFromLive } from "../services/personalIntelligence/skillRegistryBridge";
import { buildSkillDryRunSimulationForEntry } from "../services/personalIntelligence/skillDryRunBridge";
import { SkillSandboxPlanPanel } from "./SkillSandboxPlanPanel";
import { SkillPermissionGrantPanel } from "./SkillPermissionGrantPanel";
import { SkillDryRunPanel } from "./SkillDryRunPanel";
import { SkillRuntimeAuthorityPanel } from "./SkillRuntimeAuthorityPanel";
import { useSkillPermissionGrants } from "./SkillPermissionGrantContext";

interface SkillRegistryPanelProps {
  accent: string;
}

const STATUS_COLORS: Record<PersonalIntelligenceSkillStatus, string> = {
  available: "text-[var(--luca-success,#4fbf7a)] border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)]",
  review_required: "text-[var(--luca-warning,#f2b23e)] border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]",
  blocked: "text-[var(--luca-danger,#f87171)] border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]",
  disabled: "text-slate-300 border-slate-400/30 bg-slate-400/10",
};

const RISK_COLORS: Record<PersonalIntelligenceSkillRiskLevel, string> = {
  low: "text-[var(--luca-info,#4f8cff)] border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)]",
  medium: "text-[var(--luca-warning,#f2b23e)] border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]",
  high: "text-[var(--luca-warning,#f2b23e)] border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]",
  critical: "text-[var(--luca-danger,#f87171)] border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]",
};

const label = (value: string) => value.replace(/_/g, " ");

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

function SkillManifestDetail({
  entry,
  isLiveRegistry,
  missionEvaluation,
}: {
  entry: PersonalIntelligenceSkillRegistryEntry;
  isLiveRegistry: boolean;
  missionEvaluation?: MissionAlignmentEvaluation;
}) {
  const memoryPolicy = entry.memoryPolicy?.access ?? "none";
  const sandboxPlan = useMemo(() => createPersonalIntelligenceSkillSandboxPlan(entry), [entry]);
  const { state } = useSkillPermissionGrants();
  // Live dry-run bridge: real entry + live permission gates + optional live mission.
  const simulation = useMemo(
    () =>
      buildSkillDryRunSimulationForEntry(entry, {
        permissionGates: state.gates,
        missionEvaluation,
        source: isLiveRegistry ? "selected_skill" : "fixture",
      }),
    [entry, state.gates, missionEvaluation, isLiveRegistry],
  );
  const authorityRecords = useMemo(() => createPersonalIntelligenceRuntimeCapabilityRegistry({
    skillRegistryEntries: [entry],
    sandboxPlans: [sandboxPlan],
    permissionGates: state.gates.filter((gate) => gate.skillId === entry.skillId),
    dryRunSimulations: [simulation],
  }), [entry, sandboxPlan, simulation, state.gates]);
  return (
    <section className="min-w-0 flex-1 overflow-y-auto border-l border-white/10 bg-black/20 p-5" aria-label="Skill manifest detail">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{entry.manifestId} · v{entry.version}</p>
          <h3 className="mt-1 text-xl font-bold text-white">{entry.name}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{entry.description}</p>
        </div>
        <div className="flex gap-2">
          <Badge
            value={isLiveRegistry ? "live registry" : "sample registry"}
            className={
              isLiveRegistry
                ? "text-[var(--luca-success,#4fbf7a)] border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)]"
                : "text-slate-300 border-slate-400/30 bg-slate-400/10"
            }
          />
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
            <strong className={entry.readiness.readyForInspection ? "text-[var(--luca-success,#4fbf7a)]" : "text-[var(--luca-danger,#f87171)]"}>
              {entry.readiness.readyForInspection ? "Ready" : "Blocked"}
            </strong>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">Execution</span>
            <strong className="text-[var(--luca-danger,#f87171)]">Disabled</strong>
          </div>
          <p className="mt-3 text-xs text-slate-500">Approval: {entry.readiness.requiresApproval ? "required" : "not requested"} · Sandbox: {entry.readiness.requiresSandbox ? "required" : "not requested"}</p>
        </div>
      </div>

      <SkillSandboxPlanPanel plan={sandboxPlan} />
      <SkillPermissionGrantPanel plan={sandboxPlan} />
      <SkillDryRunPanel
        simulation={simulation}
        isLive={isLiveRegistry}
        hasMissionContext={Boolean(missionEvaluation)}
      />
      <SkillRuntimeAuthorityPanel records={authorityRecords} />

      <div className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]/[0.06] p-4">
        <p className="text-sm font-bold text-[var(--luca-danger,#f87171)]">Execution disabled</p>
        <p className="mt-1 text-xs leading-5 text-[var(--luca-danger,#f87171)]">This manifest can only be inspected. Its entrypoint is never imported, loaded, or invoked.</p>
        <button type="button" disabled className="mt-3 cursor-not-allowed rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-500">
          Execution disabled
        </button>
      </div>
    </section>
  );
}

export const SkillRegistryPanel: React.FC<SkillRegistryPanelProps> = ({ accent }) => {
  // Reflect the REAL registered skills (the same live registry the ControlPanel
  // uses); fall back to the illustrative fixtures only when nothing is
  // registered, so the surface still explains itself. Inspection-only either
  // way — the bridge never grants execution.
  const { registry, isLiveRegistry } = useMemo(() => {
    try {
      const live = buildSkillRegistryEntriesFromLive(
        skillRegistryService.listSkills(),
      );
      if (live.length > 0) return { registry: live, isLiveRegistry: true };
    } catch {
      /* fall back to fixtures below */
    }
    return {
      registry: createSkillRegistry(personalIntelligenceSkillRegistryFixtures),
      isLiveRegistry: false,
    };
  }, []);

  // Optional live mission alignment for dry-run mission_check stage (read-only).
  const [missionEvaluation, setMissionEvaluation] = useState<
    MissionAlignmentEvaluation | undefined
  >();
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { missionControlService } = await import(
          "../services/agent/MissionControlService"
        );
        const live = await missionControlService.getActiveMission();
        if (!active || !live) return;
        const { buildLiveMissionAdvisoryBundle } = await import(
          "../services/personalIntelligence/missionAdvisoryBridge"
        );
        if (!active) return;
        setMissionEvaluation(buildLiveMissionAdvisoryBundle(live).evaluation);
      } catch {
        /* keep dry-run without mission context */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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
            <p className="mt-1 text-xs text-slate-400">
              {isLiveRegistry ? "Live registry" : "Sample registry"} — inspection
              only, dry-run only, execution disabled.
              {missionEvaluation
                ? " · Live mission alignment attached to dry-runs."
                : ""}
            </p>
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
        <div className="mt-4 rounded-lg border border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]/[0.06] px-3 py-2 text-xs leading-5 text-[var(--luca-warning,#f2b23e)]">
          These are your real registered skills, shown for inspection only. From here they cannot run, call tools, call models, write memory, access files, use network, or trigger LucaLink.
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
                <div className="mt-3 flex justify-between text-[10px] text-slate-500"><span>Inspection: {entry.readiness.readyForInspection ? "ready" : "blocked"}</span><span className="text-[var(--luca-danger,#f87171)]">Execution: disabled</span></div>
              </button>
            ))}
            {filtered.length === 0 && <p className="py-12 text-center text-xs text-slate-500">No manifests match these filters.</p>}
          </div>
        </div>
        {selected && (
          <div className="hidden min-w-0 flex-1 md:flex">
            <SkillManifestDetail
              entry={selected}
              isLiveRegistry={isLiveRegistry}
              missionEvaluation={missionEvaluation}
            />
          </div>
        )}
      </div>
    </div>
  );
};
