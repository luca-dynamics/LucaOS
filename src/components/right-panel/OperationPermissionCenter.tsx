import React, { useMemo } from "react";
import { evaluateSkillPermissionGrantReadiness } from "../../personal-intelligence/skillPermissions";
import { useSkillPermissionGrants } from "../SkillPermissionGrantContext";
import RightPanelMetric from "./RightPanelMetric";
import RightPanelSection from "./RightPanelSection";

const label = (value: string) => value.replace(/_/g, " ");

export default function OperationPermissionCenter() {
  const { state } = useSkillPermissionGrants();
  const readiness = useMemo(() => evaluateSkillPermissionGrantReadiness(state.gates), [state.gates]);
  const recentEvents = state.auditEvents.slice(0, 4);

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
