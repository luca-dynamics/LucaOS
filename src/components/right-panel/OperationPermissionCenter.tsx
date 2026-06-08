import React, { useMemo } from "react";
import {
  createOperationItemsFromSkillPermissionGates,
  evaluateOperationCenterReadiness,
  operationCenterFixtureItems,
  type OperationCenterItem,
  type OperationCenterSource,
} from "../../operation-center";
import { evaluateSkillPermissionGrantReadiness } from "../../personal-intelligence/skillPermissions";
import { useSkillPermissionGrants } from "../SkillPermissionGrantContext";
import RightPanelMetric from "./RightPanelMetric";
import RightPanelSection from "./RightPanelSection";

const label = (value: string) => value.replace(/_/g, " ");

const sourceGroups: readonly { source: OperationCenterSource; title: string }[] = [
  { source: "personal_intelligence", title: "Personal Intelligence" },
  { source: "lucalink", title: "LucaLink" },
  { source: "runtime", title: "Runtime" },
  { source: "system", title: "System" },
];

const statusTone: Record<OperationCenterItem["status"], string> = {
  ready_for_review: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
  approval_required: "border-amber-400/20 bg-amber-400/10 text-amber-100",
  pending: "border-amber-400/20 bg-amber-400/10 text-amber-100",
  granted_for_review: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
  denied: "border-red-400/20 bg-red-400/10 text-red-100",
  expired: "border-white/10 bg-white/[0.04] text-[var(--app-text-muted)]",
  blocked: "border-red-400/20 bg-red-400/10 text-red-100",
  unsupported: "border-white/10 bg-white/[0.04] text-[var(--app-text-muted)]",
  model_only: "border-violet-400/20 bg-violet-400/10 text-violet-100",
  read_only: "border-sky-400/20 bg-sky-400/10 text-sky-100",
  disabled: "border-white/10 bg-white/[0.04] text-[var(--app-text-muted)]",
};

function OperationCenterCard({ item }: { item: OperationCenterItem }) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/10 p-2.5" data-operation-center-item={item.itemId}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-[10px] font-bold leading-snug text-[var(--app-text-main)]">{item.title}</h4>
          <p className="mt-1 text-[9px] uppercase tracking-wider text-[var(--app-text-muted)]">{label(item.category)} · risk {item.riskLevel}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${statusTone[item.status]}`}>{label(item.status)}</span>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{item.summary}</p>
      {item.requiredApprovals.length > 0 && <p className="mt-2 text-[9px] leading-relaxed text-amber-100/75"><span className="font-bold uppercase tracking-wider">Required reviews:</span> {item.requiredApprovals.join(", ")}</p>}
      {item.blockedActions.length > 0 && <p className="mt-1 text-[9px] leading-relaxed text-red-100/75"><span className="font-bold uppercase tracking-wider">Blocked actions:</span> {item.blockedActions.join(", ")}</p>}
      <p className="mt-2 text-[8px] font-bold uppercase tracking-wider text-emerald-200/70">sideEffectsPerformed: false</p>
    </article>
  );
}

export default function OperationPermissionCenter() {
  const { state } = useSkillPermissionGrants();
  const readiness = useMemo(() => evaluateSkillPermissionGrantReadiness(state.gates), [state.gates]);
  const recentEvents = state.auditEvents.slice(0, 4);
  const operationItems = useMemo(() => [
    ...operationCenterFixtureItems,
    ...createOperationItemsFromSkillPermissionGates(state.gates),
  ], [state.gates]);
  const operationReadiness = useMemo(() => evaluateOperationCenterReadiness(operationItems), [operationItems]);

  return (
    <div className="space-y-3" aria-label="Personal Intelligence permission center">
      <RightPanelSection title="Permission center" subtitle="Global Personal Intelligence review gates. State is in-memory, expiring, and non-executing.">
        <div className="grid grid-cols-2 gap-2">
          <RightPanelMetric label="Pending" value={readiness.pending} tone={readiness.pending ? "warn" : "good"} />
          <RightPanelMetric label="Review grants" value={readiness.grantedForReview} tone="neutral" />
          <RightPanelMetric label="Denied / expired" value={readiness.denied + readiness.expired} tone={readiness.denied + readiness.expired ? "danger" : "good"} />
          <RightPanelMetric label="Blocked / primary" value={readiness.blocked + readiness.requiresPrimaryApproval} tone={readiness.blocked + readiness.requiresPrimaryApproval ? "danger" : "good"} />
        </div>

        <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3">
          <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-widest text-red-200"><span>Execution readiness</span><span>blocked</span></div>
          <p className="mt-2 text-[10px] leading-relaxed text-red-100/70">readyForExecution: false · executionEnabled: false · canExecute: false · sideEffectsPerformed: false</p>
        </div>

        <div className="mt-3 space-y-1.5">
          {(["pending", "granted_for_review", "denied", "expired", "blocked", "requires_primary_approval"] as const).map((status) => {
            const count = state.gates.filter((gate) => gate.status === status).length;
            return <div key={status} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/10 px-2 py-1.5 text-[10px]"><span className="uppercase tracking-wider text-[var(--app-text-muted)]">{label(status)}</span><span className="font-bold text-[var(--app-text-main)]">{count}</span></div>;
          })}
        </div>
      </RightPanelSection>

      <RightPanelSection title="Operation Center" subtitle="Unified read-only governance summary across Personal Intelligence and LucaLink.">
        <div className="grid grid-cols-2 gap-2">
          <RightPanelMetric label="Total items" value={operationReadiness.totalItems} />
          <RightPanelMetric label="PI / LucaLink" value={`${operationReadiness.personalIntelligenceCount} / ${operationReadiness.lucaLinkCount}`} />
          <RightPanelMetric label="Pending / review" value={operationReadiness.pending + operationReadiness.approvalRequired} tone={operationReadiness.pending + operationReadiness.approvalRequired ? "warn" : "good"} />
          <RightPanelMetric label="Blocked" value={operationReadiness.blocked} tone={operationReadiness.blocked ? "danger" : "good"} />
          <RightPanelMetric label="High / critical" value={`${operationReadiness.highRiskCount} / ${operationReadiness.criticalRiskCount}`} tone={operationReadiness.highRiskCount + operationReadiness.criticalRiskCount ? "danger" : "good"} />
          <RightPanelMetric label="Execution readiness" value="blocked" tone="danger" />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5 text-[9px]">
          <div className="rounded-lg border border-red-400/20 bg-red-400/[0.06] p-2 text-red-100">Live transport: <strong>disabled</strong></div>
          <div className="rounded-lg border border-red-400/20 bg-red-400/[0.06] p-2 text-red-100">Write/install: <strong>disabled</strong></div>
          <div className="col-span-2 rounded-lg border border-red-400/20 bg-red-400/[0.06] p-2 text-red-100">Live sensor collection: <strong>disabled</strong></div>
        </div>

        <div className="mt-4 space-y-4">
          {sourceGroups.map((group) => {
            const items = operationItems.filter((item) => item.source === group.source);
            if (items.length === 0) return null;
            return (
              <section key={group.source} aria-label={`${group.title} operation items`}>
                <div className="mb-2 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.18em] text-[var(--app-text-main)]"><span>{group.title}</span><span className="text-[var(--app-text-muted)]">{items.length}</span></div>
                <div className="space-y-2">{items.map((item) => <OperationCenterCard key={item.itemId} item={item} />)}</div>
              </section>
            );
          })}
        </div>

        <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] p-3 text-[9px] leading-relaxed text-cyan-50/75">
          <p className="font-bold text-cyan-100">Right-panel status is informational only.</p>
          <p className="mt-1">No execution, transport send, memory write, sensor collection, file write, install, or model/tool call is performed.</p>
          <p className="mt-1">Approved/review states here do not grant runtime authority.</p>
        </div>
      </RightPanelSection>

      <RightPanelSection title="Permission audit" subtitle="Most recent local review transitions; no persistence or runtime action.">
        {recentEvents.length === 0 ? <p className="text-[10px] italic text-[var(--app-text-muted)]">No local permission review events.</p> : (
          <div className="space-y-2">
            {recentEvents.map((event) => <div key={event.eventId} className="rounded-lg border border-white/10 bg-black/10 p-2"><p className="text-[10px] leading-relaxed text-[var(--app-text-main)]">{event.summary}</p><p className="mt-1 text-[9px] uppercase tracking-wider text-[var(--app-text-muted)]">{new Date(event.occurredAt).toLocaleString()} · in memory only</p></div>)}
          </div>
        )}
      </RightPanelSection>
    </div>
  );
}
