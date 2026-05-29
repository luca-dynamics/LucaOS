import React, { useEffect, useMemo, useState } from "react";
import type { CalendarEvent, Goal, Task } from "../../types";
import type { RuntimeDiagnostics } from "../../services/runtime/RuntimeDiagnosticsService";
import { runtimeDiagnosticsService } from "../../services/runtime/RuntimeDiagnosticsService";
import { agentSessionContinuityService } from "../../services/runtime/AgentSessionContinuityService";
import { reminderDeliveryService } from "../../services/scheduler/ReminderDeliveryService";
import { approvalRequestCenterService } from "../../services/provenance/ApprovalRequestCenterService";
import { runtimeContinuityLoopService } from "../../services/runtime/RuntimeContinuityLoopService";
import { agentPlanningCheckpointService } from "../../services/runtime/AgentPlanningCheckpointService";
import { Icon } from "../ui/Icon";
import RightPanelMetric from "./RightPanelMetric";
import RightPanelSection from "./RightPanelSection";
import { formatCount, friendlyRuntimeHeadline } from "./rightPanelModel";

interface ControlPanelProps {
  theme: { hex: string; primary: string; border: string; bg?: string; isLight?: boolean; themeName?: string };
  tasks?: Task[];
  events?: CalendarEvent[];
  goals?: Goal[];
}

function compactDate(value?: number | string | null): string {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString();
}

const ControlPanel: React.FC<ControlPanelProps> = ({ theme, tasks = [], events = [], goals = [] }) => {
  const [diagnostics, setDiagnostics] = useState<RuntimeDiagnostics | null>(null);

  useEffect(() => {
    let mounted = true;
    runtimeDiagnosticsService.getDiagnostics().then((next) => {
      if (mounted) setDiagnostics(next);
    }).catch(() => {
      if (mounted) setDiagnostics(null);
    });
    const unsubscribe = runtimeContinuityLoopService.subscribe(() => {
      runtimeDiagnosticsService.getDiagnostics().then((next) => mounted && setDiagnostics(next)).catch(() => undefined);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const sessions = useMemo(() => agentSessionContinuityService.listSessions(), []);
  const activeSession = sessions.find((session) => session.lifecycleState === "active") ?? sessions[0];
  const resumableCount = agentSessionContinuityService.listResumableSessions().length;
  const approvals = approvalRequestCenterService.getDiagnosticsSummary();
  const reminders = reminderDeliveryService.getDiagnosticsSummary();
  const loopStatus = runtimeContinuityLoopService.getLoopStatus();
  const checkpoints = agentPlanningCheckpointService.listCheckpoints();
  const activeCheckpoint = checkpoints.find((checkpoint) => checkpoint.status === "proposed" || checkpoint.status === "approved");
  const pendingTasks = tasks.filter((task) => ["PENDING", "IN_PROGRESS", "BLOCKED"].includes(task.status)).slice(0, 4);
  const activeGoals = goals.filter((goal) => ["PENDING", "SCHEDULED", "IN_PROGRESS"].includes(goal.status)).slice(0, 4);
  const upcomingEvents = events.filter((event) => event.startTime >= Date.now()).slice(0, 3);
  const memoryReady = diagnostics?.memory.readiness === "ready" || diagnostics?.memory.readiness === "degraded";
  const headline = friendlyRuntimeHeadline({
    lifecycleState: diagnostics?.governance.runtimeContinuity.lifecycleState ?? loopStatus.lifecycleState,
    pendingApprovals: approvals.pendingRequests,
    memoryReady,
    quarantinedItems: diagnostics?.governance.runtimeContinuity.quarantinedItemCount ?? loopStatus.quarantinedItemCount,
  });

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2" style={{ color: theme.hex }}>
            <Icon name="Activity" size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black uppercase tracking-[0.18em] text-[var(--app-text-main)]">CONTROL</div>
            <p className="mt-1 text-xs leading-relaxed text-[var(--app-text-muted)]">{headline}</p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-[var(--app-text-muted)]">
              Active mode: {activeSession?.mode?.replace(/_/g, " ") ?? diagnostics?.summary.activeModeLabel ?? "Chat"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <RightPanelMetric label="Runtime" value={diagnostics?.governance.runtimeContinuity.lifecycleState ?? loopStatus.lifecycleState} tone={loopStatus.quarantinedItemCount > 0 ? "danger" : loopStatus.lifecycleState === "degraded" ? "warn" : "good"} />
        <RightPanelMetric label="Loop" value={loopStatus.running ? "running" : "paused"} tone={loopStatus.running ? "good" : "warn"} />
        <RightPanelMetric label="Approvals" value={approvals.pendingRequests} tone={approvals.pendingRequests > 0 ? "warn" : "good"} />
        <RightPanelMetric label="Resume" value={resumableCount} tone={resumableCount > 0 ? "warn" : "neutral"} />
      </div>

      <RightPanelSection title="Runtime routes" subtitle="Current model and memory readiness summaries.">
        <div className="space-y-2 text-[10px] leading-relaxed text-[var(--app-text-muted)]">
          <div className="rounded-xl border border-white/10 bg-black/10 p-2">
            <span className="font-bold uppercase tracking-widest" style={{ color: theme.hex }}>Model</span>
            <div>{diagnostics?.routes.chat.label ?? "Model route loading"} · {diagnostics?.routes.chat.readiness ?? "unknown"}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/10 p-2">
            <span className="font-bold uppercase tracking-widest" style={{ color: theme.hex }}>Memory</span>
            <div>{diagnostics?.memory.label ?? "Memory route loading"} · {diagnostics?.memory.readiness ?? "unknown"}</div>
          </div>
        </div>
      </RightPanelSection>

      <RightPanelSection title="Session" subtitle={activeSession ? "Current active or latest resumable session." : "No persisted agent session yet."}>
        {activeSession ? (
          <div className="space-y-2 text-[10px] text-[var(--app-text-muted)]">
            <div className="font-bold text-[var(--app-text-main)]">{activeSession.title}</div>
            <div>{activeSession.lastAgentStateSummary}</div>
            <div className="uppercase tracking-widest">{activeSession.lifecycleState} · {activeSession.safeToResume ? "safe to resume" : "review before resume"}</div>
          </div>
        ) : (
          <div className="text-[10px] italic text-[var(--app-text-muted)]">No session continuity record available.</div>
        )}
      </RightPanelSection>

      {activeCheckpoint && (
        <RightPanelSection title="Planning checkpoint" subtitle="State-only plan record. Approving a checkpoint never runs tools or skills.">
          <div className="space-y-1 text-[10px] text-[var(--app-text-muted)]">
            <div className="font-bold text-[var(--app-text-main)]">{activeCheckpoint.title}</div>
            <div>{activeCheckpoint.summary}</div>
            <div className="uppercase tracking-widest">{activeCheckpoint.status} · risk: {activeCheckpoint.riskLevel}</div>
            {activeCheckpoint.proposedNextSteps.length > 0 && <div>Next: {activeCheckpoint.proposedNextSteps.slice(0, 3).join(" · ")}</div>}
          </div>
        </RightPanelSection>
      )}

      <RightPanelSection title="Decisions" subtitle="Safe queues that need user attention.">
        <div className="grid grid-cols-2 gap-2">
          <RightPanelMetric label="Needed" value={formatCount("approval", approvals.pendingRequests)} tone={approvals.pendingRequests > 0 ? "warn" : "good"} />
          <RightPanelMetric label="Reminders" value={reminders.deliveredCount} tone="neutral" />
        </div>
      </RightPanelSection>

      {(pendingTasks.length > 0 || activeGoals.length > 0 || upcomingEvents.length > 0) && (
        <RightPanelSection title="Work" subtitle="Current tasks, schedule, and goals from existing Luca management state.">
          <div className="space-y-3 text-[10px] text-[var(--app-text-muted)]">
            {pendingTasks.length > 0 && <div><div className="mb-1 font-bold uppercase tracking-widest text-[var(--app-text-main)]">Tasks</div>{pendingTasks.map((task) => <div key={task.id}>• {task.title} · {task.status}</div>)}</div>}
            {activeGoals.length > 0 && <div><div className="mb-1 font-bold uppercase tracking-widest text-[var(--app-text-main)]">Goals</div>{activeGoals.map((goal) => <div key={goal.id}>• {goal.description} · {goal.status}</div>)}</div>}
            {upcomingEvents.length > 0 && <div><div className="mb-1 font-bold uppercase tracking-widest text-[var(--app-text-main)]">Schedule</div>{upcomingEvents.map((event) => <div key={event.id}>• {event.title} · {compactDate(event.startTime)}</div>)}</div>}
          </div>
        </RightPanelSection>
      )}
    </div>
  );
};

export default ControlPanel;
