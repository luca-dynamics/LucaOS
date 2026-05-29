import React, { useMemo } from "react";
import type { ToolExecutionLog } from "../../types";
import { approvalRequestCenterService } from "../../services/provenance/ApprovalRequestCenterService";
import { runtimeInboxService } from "../../services/runtime/RuntimeInboxService";
import { governedActionRequestService } from "../../services/runtime/GovernedActionRequestService";
import { schedulerRegistryService } from "../../services/scheduler/SchedulerRegistryService";
import { reminderDeliveryService } from "../../services/scheduler/ReminderDeliveryService";
import { memoryGovernanceService } from "../../services/memory/MemoryGovernanceService";
import { runtimeContinuityLoopService } from "../../services/runtime/RuntimeContinuityLoopService";
import { Icon } from "../ui/Icon";
import RightPanelSection from "./RightPanelSection";
import { summarizeToolLog } from "./rightPanelModel";

interface TraceLogsPanelProps {
  theme: { hex: string; primary: string; border: string };
  toolLogs: ToolExecutionLog[];
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] italic text-[var(--app-text-muted)] opacity-70">{children}</div>;
}

const TraceLogsPanel: React.FC<TraceLogsPanelProps> = ({ theme, toolLogs }) => {
  const trace = useMemo(() => {
    const now = new Date().toISOString();
    return {
      approvals: approvalRequestCenterService.listRequests(),
      inbox: runtimeInboxService.listEvents(),
      governed: governedActionRequestService.listRequests(),
      scheduler: schedulerRegistryService.detectDueJobsDryRun(now),
      reminders: reminderDeliveryService.listDeliveries(),
      memory: memoryGovernanceService.listGovernanceSummaries(),
      loop: runtimeContinuityLoopService.getLoopStatus(),
    };
  }, [toolLogs.length]);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2" style={{ color: theme.hex }}>
            <Icon name="ScrollText" size={18} />
          </div>
          <div>
            <div className="text-sm font-black uppercase tracking-[0.18em] text-[var(--app-text-main)]">LOGS</div>
            <p className="mt-1 text-xs leading-relaxed text-[var(--app-text-muted)]">Trace and audit view for what Luca did, observed, blocked, asked approval for, and delivered safely.</p>
          </div>
        </div>
      </div>

      <RightPanelSection title="Tool logs" subtitle="Existing tool execution log stream.">
        {toolLogs.length === 0 ? <EmptyState>No tool logs.</EmptyState> : (
          <div className="space-y-1">
            {toolLogs.map((log, index) => (
              <div key={`${log.toolName}-${log.timestamp}-${index}`} className="border-l border-white/10 py-1 pl-2 font-mono text-[10px] transition-colors hover:bg-white/5">
                <div className="mb-0.5 flex justify-between gap-2 text-[var(--app-text-muted)] opacity-70">
                  <span className={`font-bold ${log.toolName === "SENTINEL_LOOP" ? "text-slate-500" : theme.primary}`}>{log.toolName}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className={`font-bold ${log.result.startsWith("ERROR") || log.result.startsWith("ACTION ABORTED") ? "text-red-500" : log.result.includes("SENTINEL") ? "text-slate-500" : "text-[var(--app-text-main)]"}`}>{summarizeToolLog(log)}</div>
              </div>
            ))}
          </div>
        )}
      </RightPanelSection>

      <RightPanelSection title="Runtime events" subtitle="Current continuity-loop trace state. Stored event history can be connected later without inventing events.">
        {trace.loop.lastTickAt || trace.loop.lastHeartbeatAt ? (
          <div className="space-y-1 text-[10px] text-[var(--app-text-muted)]">
            {trace.loop.lastHeartbeatAt && <div>Heartbeat observed · {new Date(trace.loop.lastHeartbeatAt).toLocaleString()}</div>}
            {trace.loop.lastTickAt && <div>Dry-run tick observed · {new Date(trace.loop.lastTickAt).toLocaleString()}</div>}
            <div>Loop {trace.loop.running ? "running" : "paused"} · {trace.loop.lifecycleState}</div>
          </div>
        ) : <EmptyState>No runtime events recorded yet.</EmptyState>}
      </RightPanelSection>

      <RightPanelSection title="Approval audit" subtitle="Approval requests and state changes.">
        {trace.approvals.length === 0 ? <EmptyState>No approval activity.</EmptyState> : trace.approvals.slice(0, 8).map((approval) => (
          <div key={approval.approvalRequestId} className="mb-2 rounded-xl border border-white/10 bg-black/10 p-2 text-[10px] text-[var(--app-text-muted)]">
            <div className="font-bold text-[var(--app-text-main)]">{approval.status} · {approval.title}</div>
            <div>{approval.sourceType} · {new Date(approval.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </RightPanelSection>

      <RightPanelSection title="Reminder delivery trace" subtitle="Safe reminder delivery records.">
        {trace.reminders.length === 0 ? <EmptyState>No reminder deliveries.</EmptyState> : trace.reminders.slice(0, 8).map((reminder) => (
          <div key={reminder.deliveryId} className="mb-2 rounded-xl border border-white/10 bg-black/10 p-2 text-[10px] text-[var(--app-text-muted)]">
            <div className="font-bold text-[var(--app-text-main)]">{reminder.status} · {reminder.title}</div>
            <div>{reminder.reason}</div>
          </div>
        ))}
      </RightPanelSection>

      <RightPanelSection title="Scheduler observations" subtitle="Dry-run due-job and blocked-job observations.">
        {trace.scheduler.length === 0 ? <EmptyState>No scheduler observations.</EmptyState> : trace.scheduler.slice(0, 8).map((job) => (
          <div key={job.jobId} className="mb-2 rounded-xl border border-white/10 bg-black/10 p-2 text-[10px] text-[var(--app-text-muted)]">
            <div className="font-bold text-[var(--app-text-main)]">{job.due ? "due" : "observed"} · {job.title}</div>
            <div>{job.userSafeReason}</div>
          </div>
        ))}
      </RightPanelSection>

      <RightPanelSection title="Inbox trace" subtitle="Runtime inbox event audit.">
        {trace.inbox.length === 0 ? <EmptyState>No inbox events.</EmptyState> : trace.inbox.slice(0, 8).map((event) => (
          <div key={event.inboxEventId} className="mb-2 rounded-xl border border-white/10 bg-black/10 p-2 text-[10px] text-[var(--app-text-muted)]">
            <div className="font-bold text-[var(--app-text-main)]">{event.eventType} · {event.title}</div>
            <div>{new Date(event.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </RightPanelSection>

      <RightPanelSection title="Governed requests / memory governance" subtitle="Requests Luca blocked, asked approval for, or held for review.">
        {trace.governed.length === 0 && trace.memory.length === 0 ? <EmptyState>No governed request or memory governance events.</EmptyState> : (
          <div className="space-y-2">
            {trace.governed.slice(0, 5).map((request) => <div key={request.requestId} className="rounded-xl border border-white/10 bg-black/10 p-2 text-[10px] text-[var(--app-text-muted)]"><span className="font-bold text-[var(--app-text-main)]">{request.status}</span> · {request.title}</div>)}
            {trace.memory.slice(0, 5).map((record) => <div key={record.memoryId} className="rounded-xl border border-white/10 bg-black/10 p-2 text-[10px] text-[var(--app-text-muted)]"><span className="font-bold text-[var(--app-text-main)]">{record.reviewState}</span> · {record.category} · {record.retrievalPolicy}</div>)}
          </div>
        )}
      </RightPanelSection>
    </div>
  );
};

export default TraceLogsPanel;
