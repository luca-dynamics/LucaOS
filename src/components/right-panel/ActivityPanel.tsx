import React, { useMemo, useState } from "react";
import { approvalRequestCenterService } from "../../services/provenance/ApprovalRequestCenterService";
import { runtimeInboxService } from "../../services/runtime/RuntimeInboxService";
import { agentSessionContinuityService } from "../../services/runtime/AgentSessionContinuityService";
import { governedActionRequestService } from "../../services/runtime/GovernedActionRequestService";
import { governedToolExecutionService } from "../../services/runtime/GovernedToolExecutionService";
import { schedulerRegistryService } from "../../services/scheduler/SchedulerRegistryService";
import { reminderDeliveryService } from "../../services/scheduler/ReminderDeliveryService";
import { runtimeContinuityLoopService } from "../../services/runtime/RuntimeContinuityLoopService";
import { Icon } from "../ui/Icon";
import RightPanelMetric from "./RightPanelMetric";
import RightPanelSection from "./RightPanelSection";

interface ActivityPanelProps {
  theme: { hex: string; primary: string; border: string };
}

const Button: React.FC<{ children: React.ReactNode; onClick: () => void; tone?: "neutral" | "danger" | "good" }> = ({ children, onClick, tone = "neutral" }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-widest transition-colors ${
      tone === "danger" ? "border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20" :
      tone === "good" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20" :
      "border-white/10 bg-white/5 text-[var(--app-text-muted)] hover:text-[var(--app-text-main)]"
    }`}
  >
    {children}
  </button>
);

const ActivityPanel: React.FC<ActivityPanelProps> = ({ theme }) => {
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision((value) => value + 1);

  const data = useMemo(() => {
    const now = new Date().toISOString();
    return {
      approvals: approvalRequestCenterService.listRequests(),
      inbox: runtimeInboxService.listEvents(),
      sessions: agentSessionContinuityService.listSessions(),
      governed: governedActionRequestService.listRequests(),
      executions: governedToolExecutionService.listExecutions(),
      dueJobs: schedulerRegistryService.detectDueJobsDryRun(now),
      reminders: reminderDeliveryService.listDeliveries(),
      loop: runtimeContinuityLoopService.getLoopStatus(),
    };
  }, [revision]);

  const pendingApprovals = data.approvals.filter((request) => request.status === "pending");
  const unreadInbox = data.inbox.filter((event) => !event.readAt && !event.archivedAt);
  const resumableSessions = data.sessions.filter((session) => session.lifecycleState === "resumable" && session.userVisible);
  const waitingRequests = data.governed.filter((request) => ["proposed", "approval_required", "approved_waiting_execution"].includes(request.status));
  const blockedItems = data.dueJobs.filter((job) => job.blockedBy.length > 0).length + data.governed.filter((request) => request.status === "blocked").length + data.sessions.filter((session) => session.lifecycleState === "quarantined").length;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2" style={{ color: theme.hex }}>
            <Icon name="BellRing" size={18} />
          </div>
          <div>
            <div className="text-sm font-black uppercase tracking-[0.18em] text-[var(--app-text-main)]">ACTIVITY</div>
            <p className="mt-1 text-xs leading-relaxed text-[var(--app-text-muted)]">Runtime activity, decisions, reminders, inbox items, resumable sessions, and governed action requests.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <RightPanelMetric label="Needs approval" value={pendingApprovals.length} tone={pendingApprovals.length > 0 ? "warn" : "good"} />
        <RightPanelMetric label="Unread inbox" value={unreadInbox.length} tone={unreadInbox.length > 0 ? "warn" : "neutral"} />
        <RightPanelMetric label="Can resume" value={resumableSessions.length} tone={resumableSessions.length > 0 ? "warn" : "neutral"} />
        <RightPanelMetric label="Blocked" value={blockedItems} tone={blockedItems > 0 ? "danger" : "good"} />
      </div>

      <RightPanelSection title="Pending approvals" subtitle="Approving here only updates approval state. It does not execute the underlying action.">
        {pendingApprovals.length === 0 ? (
          <div className="text-[10px] italic text-[var(--app-text-muted)]">No approval activity.</div>
        ) : (
          <div className="space-y-2">
            {pendingApprovals.map((request) => (
              <div key={request.approvalRequestId} className="rounded-xl border border-white/10 bg-black/10 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-[var(--app-text-main)]">Needs approval · {request.title}</div>
                    <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{request.description}</p>
                    <p className="mt-1 text-[9px] uppercase tracking-widest text-amber-200">{request.riskLevel} · state-only approval</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button tone="good" onClick={() => {
                    approvalRequestCenterService.approveOnce(request.approvalRequestId);
                    if (request.sourceType === "tool" && request.sourceId) {
                      const governed = governedActionRequestService.getRequest(request.sourceId);
                      if (governed && governed.status === "approval_required") {
                        governedActionRequestService.markApprovedWaitingExecution(request.sourceId);
                      }
                    }
                    refresh();
                  }}>approve once</Button>
                  <Button tone="danger" onClick={() => { approvalRequestCenterService.reject(request.approvalRequestId); refresh(); }}>reject</Button>
                  <Button onClick={() => { approvalRequestCenterService.revoke(request.approvalRequestId); refresh(); }}>revoke</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </RightPanelSection>

      <RightPanelSection title="Reminders" subtitle="Safe reminders delivered by the dry-run continuity loop.">
        {data.reminders.length === 0 ? (
          <div className="text-[10px] italic text-[var(--app-text-muted)]">No reminder deliveries.</div>
        ) : data.reminders.slice(0, 5).map((reminder) => (
          <div key={reminder.deliveryId} className="mb-2 rounded-xl border border-white/10 bg-black/10 p-2 text-[10px] text-[var(--app-text-muted)]">
            <div className="font-bold text-[var(--app-text-main)]">Reminder {reminder.status}: {reminder.title}</div>
            <div>{reminder.message}</div>
          </div>
        ))}
      </RightPanelSection>

      <RightPanelSection title="Inbox" subtitle="Runtime inbox items can be marked read or archived.">
        {unreadInbox.length === 0 ? (
          <div className="text-[10px] italic text-[var(--app-text-muted)]">No unread runtime inbox events.</div>
        ) : unreadInbox.slice(0, 6).map((event) => (
          <div key={event.inboxEventId} className="mb-2 rounded-xl border border-white/10 bg-black/10 p-2">
            <div className="text-[10px] font-bold text-[var(--app-text-main)]">{event.title}</div>
            <p className="mt-1 text-[10px] text-[var(--app-text-muted)]">{event.body}</p>
            <div className="mt-2 flex gap-2">
              <Button onClick={() => { runtimeInboxService.markRead(event.inboxEventId); refresh(); }}>mark read</Button>
              <Button onClick={() => { runtimeInboxService.archiveEvent(event.inboxEventId); refresh(); }}>archive</Button>
            </div>
          </div>
        ))}
      </RightPanelSection>

      <RightPanelSection title="Sessions" subtitle="Safe-to-resume state is shown; no session is auto-started here.">
        {resumableSessions.length === 0 ? (
          <div className="text-[10px] italic text-[var(--app-text-muted)]">No sessions can resume.</div>
        ) : resumableSessions.map((session) => (
          <div key={session.sessionId} className="mb-2 rounded-xl border border-white/10 bg-black/10 p-2">
            <div className="text-[10px] font-bold text-[var(--app-text-main)]">Session can resume · {session.title}</div>
            <p className="mt-1 text-[10px] text-[var(--app-text-muted)]">{session.lastUserIntentSummary}</p>
            <div className="mt-2 flex gap-2">
              <Button onClick={() => { agentSessionContinuityService.completeSession(session.sessionId); refresh(); }}>mark complete</Button>
              <Button onClick={() => { agentSessionContinuityService.archiveSession(session.sessionId); refresh(); }}>archive</Button>
            </div>
          </div>
        ))}
      </RightPanelSection>

      <RightPanelSection title="Governed execution bridge" subtitle="Safe approved actions can be executed once. Risky actions remain blocked.">
        {(() => {
          const candidates = data.governed.filter((request) => !["rejected", "expired", "blocked"].includes(request.status));
          const canExecResults = candidates.map((request) => ({
            request,
            canExec: governedToolExecutionService.canExecuteRequest(request.requestId),
            alreadyExecuted: data.executions.some((ex) => ex.requestId === request.requestId && ex.status === "succeeded"),
          }));
          const eligible = canExecResults.filter((item) => item.canExec.allowed && !item.alreadyExecuted);
          const approvedButBlocked = canExecResults.filter((item) => !item.canExec.allowed && item.request.status === "approved_waiting_execution" && !item.alreadyExecuted);
          const ineligible = canExecResults.filter((item) => !item.canExec.allowed && item.request.status !== "approved_waiting_execution" && ["proposed", "approval_required"].includes(item.request.status));
          const executed = data.executions.filter((execution) => execution.status === "succeeded").slice(0, 3);
          const alreadyDone = canExecResults.filter((item) => item.alreadyExecuted);
          return (
            <div className="space-y-2">
              {eligible.length === 0 && executed.length === 0 && alreadyDone.length === 0 && <div className="text-[10px] italic text-[var(--app-text-muted)]">No safe governed actions ready to run.</div>}
              {eligible.map(({ request, canExec }) => (
                <div key={request.requestId} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2">
                  <div className="text-[10px] font-bold text-emerald-200">Approved — ready to run · {request.title}</div>
                  <p className="mt-1 text-[10px] text-[var(--app-text-muted)]">{request.description}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-widest text-emerald-300">{canExec.capability ?? "safe"} · {request.riskLevel ?? "low"}</p>
                  <div className="mt-2 flex gap-2">
                    <Button tone="good" onClick={() => { governedToolExecutionService.executeApprovedRequest(request.requestId); refresh(); }}>Run once</Button>
                    <Button tone="danger" onClick={() => { governedActionRequestService.blockRequest(request.requestId); refresh(); }}>block</Button>
                  </div>
                </div>
              ))}
              {approvedButBlocked.map(({ request, canExec }) => (
                <div key={request.requestId} className="rounded-xl border border-red-500/20 bg-red-500/5 p-2">
                  <div className="text-[10px] font-bold text-red-200">Blocked for safety · {request.title}</div>
                  <p className="mt-1 text-[10px] text-[var(--app-text-muted)]">{canExec.reason}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-widest text-red-300">approved but cannot execute</p>
                </div>
              ))}
              {ineligible.slice(0, 4).map(({ request, canExec }) => (
                <div key={request.requestId} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2">
                  <div className="text-[10px] font-bold text-amber-200">Approval only — execution bridge unavailable · {request.title}</div>
                  <p className="mt-1 text-[10px] text-[var(--app-text-muted)]">{canExec.reason}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-widest text-amber-300">This action needs a future secure bridge</p>
                </div>
              ))}
              {alreadyDone.map(({ request }) => (
                <div key={request.requestId} className="rounded-xl border border-white/10 bg-black/10 p-2">
                  <div className="text-[10px] font-bold text-[var(--app-text-main)]">Already executed · {request.title}</div>
                  <p className="mt-1 text-[9px] uppercase tracking-widest text-[var(--app-text-muted)]">completed</p>
                </div>
              ))}
              {executed.filter((ex) => !canExecResults.some((c) => c.request.requestId === ex.requestId)).map((execution) => (
                <div key={execution.executionId} className="rounded-xl border border-white/10 bg-black/10 p-2">
                  <div className="text-[10px] font-bold text-[var(--app-text-main)]">Executed · {execution.title}</div>
                  <p className="mt-1 text-[9px] uppercase tracking-widest text-emerald-300">succeeded · {execution.capability}</p>
                </div>
              ))}
            </div>
          );
        })()}
      </RightPanelSection>

      <RightPanelSection title="Governed action requests" subtitle="Risky requests remain request-only. This action needs a future secure bridge.">
        {waitingRequests.length === 0 ? (
          <div className="text-[10px] italic text-[var(--app-text-muted)]">No governed action requests waiting.</div>
        ) : waitingRequests.map((request) => (
          <div key={request.requestId} className="mb-2 rounded-xl border border-white/10 bg-black/10 p-2">
            <div className="text-[10px] font-bold text-[var(--app-text-main)]">Action request is waiting · {request.title}</div>
            <p className="mt-1 text-[10px] text-[var(--app-text-muted)]">{request.description}</p>
            <p className="mt-1 text-[9px] uppercase tracking-widest text-amber-200">{request.kind} · {request.status} · dry-run request</p>
            <div className="mt-2 flex gap-2">
              <Button tone="danger" onClick={() => { governedActionRequestService.markRejected(request.requestId); refresh(); }}>reject</Button>
              <Button tone="danger" onClick={() => { governedActionRequestService.blockRequest(request.requestId); refresh(); }}>block</Button>
            </div>
          </div>
        ))}
      </RightPanelSection>

      <RightPanelSection title="Scheduler observations" subtitle="Due-job observations are dry-run only.">
        {data.dueJobs.length === 0 ? (
          <div className="text-[10px] italic text-[var(--app-text-muted)]">No due scheduler observations.</div>
        ) : data.dueJobs.slice(0, 6).map((job) => (
          <div key={job.jobId} className="mb-2 rounded-xl border border-white/10 bg-black/10 p-2 text-[10px] text-[var(--app-text-muted)]">
            <div className="font-bold text-[var(--app-text-main)]">{job.title}</div>
            <div>{job.userSafeReason}</div>
            {job.blockedBy.length > 0 && <div className="mt-1 text-red-200">Blocked for safety: {job.blockedBy.join(", ")}</div>}
          </div>
        ))}
      </RightPanelSection>
    </div>
  );
};

export default ActivityPanel;
