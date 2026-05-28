import React from "react";

type DashboardSection = {
  id: string;
  title: string;
  description: string;
  status: "Waiting" | "Observation" | "Blocked";
  records: string[];
};

const shellMeta = {
  originOnly: true,
  readOnlyShell: true,
  mockOnly: true,
  runtimeBehaviorChanged: false,
  noRuntimeMutation: true,
  noOptimizerExecution: true,
  noAutoApply: true,
} as const;

const sections: DashboardSection[] = [
  {
    id: "proposal-inbox",
    title: "Proposal Inbox",
    description:
      "Placeholder list for repo-bounded evolution proposals submitted for Origin review.",
    status: "Waiting",
    records: [
      "No live queue attached",
      "No mutation payload preview",
      "Awaiting guarded provider wiring",
    ],
  },
  {
    id: "evolution-runs",
    title: "Evolution Runs",
    description:
      "Read-only run history shell for future tracked optimizer/execution runs.",
    status: "Observation",
    records: [
      "No active runs",
      "Runtime execution disabled",
      "No scheduler integration",
    ],
  },
  {
    id: "candidate-variants",
    title: "Candidate Variants",
    description: "Candidate branch and diff summaries will appear here in Origin mode.",
    status: "Waiting",
    records: [
      "No candidate snapshots",
      "No patch confidence signal",
      "No selection workflow bound",
    ],
  },
  {
    id: "constraint-gates",
    title: "Constraint Gates",
    description: "Reserved space for constitutional and boundary gate reports.",
    status: "Blocked",
    records: [
      "No gate engine attached",
      "No policy verdict stream",
      "No auto-release behavior",
    ],
  },
  {
    id: "pr-back-reports",
    title: "PR-back Reports",
    description:
      "Future PR-back status, traceability notes, and repository feedback artifacts.",
    status: "Observation",
    records: [
      "No PR-back transport",
      "No repository write channel",
      "Manual-only workflow preserved",
    ],
  },
  {
    id: "rollback-plans",
    title: "Rollback Plans",
    description: "Planned rollback strategy summaries will render here later.",
    status: "Waiting",
    records: [
      "No rollback executor",
      "No conflict replay logic",
      "No restore action enabled",
    ],
  },
  {
    id: "external-lab-status",
    title: "External Lab Status",
    description:
      "Placeholder telemetry cards for non-production experiment lab connectivity.",
    status: "Blocked",
    records: [
      "External lab connector disabled",
      "No artifact sync",
      "No remote runtime control",
    ],
  },
];

const statusColor: Record<DashboardSection["status"], string> = {
  Waiting: "text-amber-300 border-amber-400/30 bg-amber-500/10",
  Observation: "text-cyan-300 border-cyan-400/30 bg-cyan-500/10",
  Blocked: "text-rose-300 border-rose-400/30 bg-rose-500/10",
};

const OriginEvolutionDashboardShell: React.FC = () => {
  return (
    <section className="w-full h-full rounded-2xl border border-violet-500/30 bg-black/50 text-slate-100 p-5 md:p-6 backdrop-blur-sm">
      <header className="mb-6 space-y-2">
        <p className="text-xs uppercase tracking-[0.25em] text-violet-200/90">Origin-only</p>
        <h2 className="text-2xl font-semibold">Origin Evolution Dashboard Shell</h2>
        <p className="text-sm text-slate-300 max-w-3xl">
          Read-only interface scaffold for future guarded evolution visibility. This shell
          intentionally performs no runtime mutation, no optimizer execution, and no auto-apply
          behavior.
        </p>
      </header>

      <div className="mb-6 rounded-xl border border-rose-400/25 bg-rose-500/10 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-200">
          Safety Banner
        </h3>
        <ul className="mt-2 space-y-1 text-sm text-rose-100/90">
          <li>• Origin-only visibility mode</li>
          <li>• Read-only shell (no mutation handlers)</li>
          <li>• No approval/promote/rollback execution</li>
          <li>• No network calls and no evolution service calls</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sections.map((section) => (
          <article
            key={section.id}
            className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-medium">{section.title}</h3>
              <span
                className={`text-[11px] uppercase tracking-[0.16em] rounded-full border px-2 py-1 ${statusColor[section.status]}`}
              >
                {section.status}
              </span>
            </div>
            <p className="text-sm text-slate-300">{section.description}</p>
            <ul className="space-y-1 text-xs text-slate-300/90">
              {section.records.map((record) => (
                <li key={record}>• {record}</li>
              ))}
            </ul>
            <div className="pt-2">
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="rounded-md border border-slate-600/70 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-slate-400 cursor-not-allowed"
              >
                Disabled: read-only
              </button>
            </div>
          </article>
        ))}
      </div>

      <pre className="mt-6 overflow-x-auto rounded-lg border border-slate-700/60 bg-slate-950/70 p-3 text-xs text-slate-300">
        {JSON.stringify(shellMeta, null, 2)}
      </pre>
    </section>
  );
};

export default OriginEvolutionDashboardShell;
