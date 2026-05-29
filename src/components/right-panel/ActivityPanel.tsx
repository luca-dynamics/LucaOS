import React, { useMemo, useState } from "react";
import { approvalRequestCenterService } from "../../services/provenance/ApprovalRequestCenterService";
import { runtimeInboxService } from "../../services/runtime/RuntimeInboxService";
import { agentSessionContinuityService } from "../../services/runtime/AgentSessionContinuityService";
import { governedActionRequestService } from "../../services/runtime/GovernedActionRequestService";
import { governedToolExecutionService } from "../../services/runtime/GovernedToolExecutionService";
import { memoryProposalService } from "../../services/memory/MemoryProposalService";
import { governedMemoryWriteService } from "../../services/memory/GovernedMemoryWriteService";
import { skillGovernanceService } from "../../services/skills/SkillGovernanceService";
import { agentPlanningCheckpointService } from "../../services/runtime/AgentPlanningCheckpointService";
import { runtimePlanService } from "../../services/runtime/RuntimePlanService";
import { intentRoutingService } from "../../services/runtime/IntentRoutingService";
import { schedulerRegistryService } from "../../services/scheduler/SchedulerRegistryService";
import { reminderDeliveryService } from "../../services/scheduler/ReminderDeliveryService";
import { runtimeContinuityLoopService } from "../../services/runtime/RuntimeContinuityLoopService";
import { Icon } from "../ui/Icon";
import RightPanelMetric from "./RightPanelMetric";
import RightPanelSection from "./RightPanelSection";
import type { LucaIntentRoute } from "../../types/intentRouting";
import { getRouteLabel, getRouteTone, getRouteToneColor, getRouteToneBorder, getRouteToneBg, getRouteNextAction, getRouteNoExecutionText } from "../runtime/intentRoutingLabels";

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

  // Approve an ApprovalRequest from the generic queue and sync its source record
  // to the matching approved-waiting state. This is strictly state-only: it never
  // writes memory, runs/installs skills, or executes tools.
  const approveRequestAndSyncSource = (request: { approvalRequestId: string; sourceType: string; sourceId?: string }) => {
    approvalRequestCenterService.approveOnce(request.approvalRequestId);
    if (request.sourceId) {
      switch (request.sourceType) {
        case "tool": {
          const governed = governedActionRequestService.getRequest(request.sourceId);
          if (governed && governed.status === "approval_required") {
            governedActionRequestService.markApprovedWaitingExecution(request.sourceId);
          }
          break;
        }
        case "memory_write":
          memoryProposalService.syncApprovedFromApprovalRequest(request.sourceId);
          break;
        case "skill":
          skillGovernanceService.syncApprovedFromApprovalRequest(request.sourceId);
          break;
        default:
          break;
      }
    }
    refresh();
  };

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
      memoryProposals: memoryProposalService.listProposals(),
      skillRequests: skillGovernanceService.listSkillRequests(),
      checkpoints: agentPlanningCheckpointService.listCheckpoints(),
      plans: runtimePlanService.listPlans(),
      routingDecisions: intentRoutingService.listRoutingDecisions(),
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
                  <Button tone="good" onClick={() => approveRequestAndSyncSource(request)}>approve once</Button>
                  <Button tone="danger" onClick={() => { approvalRequestCenterService.reject(request.approvalRequestId); refresh(); }}>reject</Button>
                  <Button onClick={() => { approvalRequestCenterService.revoke(request.approvalRequestId); refresh(); }}>revoke</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </RightPanelSection>

      <RightPanelSection title="Memory proposals" subtitle="Approving a memory does not write it. Saving requires a second explicit click and a one-time approval.">
        {(() => {
          const pending = data.memoryProposals.filter((proposal) => proposal.status === "proposed" || proposal.status === "approval_required");
          const waiting = data.memoryProposals.filter((proposal) => proposal.status === "approved_waiting_write");
          const written = data.memoryProposals.filter((proposal) => proposal.status === "written").slice(0, 3);
          const rejectedOrBlocked = data.memoryProposals.filter((proposal) => proposal.status === "rejected" || proposal.status === "blocked" || proposal.status === "revoked").slice(0, 3);
          if (pending.length === 0 && waiting.length === 0 && written.length === 0 && rejectedOrBlocked.length === 0) {
            return <div className="text-[10px] italic text-[var(--app-text-muted)]">No memory proposals.</div>;
          }
          return (
            <div className="space-y-2">
              {pending.map((proposal) => (
                <div key={proposal.proposalId} className="rounded-xl border border-white/10 bg-black/10 p-2">
                  <div className="text-[10px] font-bold text-[var(--app-text-main)]">Memory proposed · {proposal.title}</div>
                  <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{proposal.summary}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-widest text-amber-200">{proposal.kind} · {proposal.riskLevel} · approving does not write</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button tone="good" onClick={() => { memoryProposalService.approveProposal(proposal.proposalId); refresh(); }}>Approve memory</Button>
                    <Button tone="danger" onClick={() => { memoryProposalService.rejectProposal(proposal.proposalId); refresh(); }}>reject</Button>
                    <Button onClick={() => { memoryProposalService.revokeProposal(proposal.proposalId); refresh(); }}>revoke</Button>
                  </div>
                </div>
              ))}
              {waiting.map((proposal) => {
                const canWrite = governedMemoryWriteService.canWriteProposal(proposal.proposalId);
                return (
                  <div key={proposal.proposalId} className={`rounded-xl border p-2 ${canWrite.allowed ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                    <div className={`text-[10px] font-bold ${canWrite.allowed ? "text-emerald-200" : "text-red-200"}`}>{canWrite.allowed ? "Approved — ready to save" : "Blocked for safety"} · {proposal.title}</div>
                    <p className="mt-1 text-[10px] text-[var(--app-text-muted)]">{canWrite.allowed ? proposal.summary : canWrite.reason}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {canWrite.allowed ? (
                        <Button tone="good" onClick={() => { void governedMemoryWriteService.writeApprovedProposal(proposal.proposalId).then(refresh); }}>Save memory once</Button>
                      ) : (
                        <span className="text-[9px] uppercase tracking-widest text-red-300">{canWrite.blockedBy.join(", ") || "cannot write"}</span>
                      )}
                      <Button tone="danger" onClick={() => { memoryProposalService.revokeProposal(proposal.proposalId); refresh(); }}>revoke</Button>
                    </div>
                  </div>
                );
              })}
              {written.map((proposal) => (
                <div key={proposal.proposalId} className="rounded-xl border border-white/10 bg-black/10 p-2">
                  <div className="text-[10px] font-bold text-[var(--app-text-main)]">Memory saved · {proposal.title}</div>
                  <p className="mt-1 text-[9px] uppercase tracking-widest text-emerald-300">written with provenance</p>
                </div>
              ))}
              {rejectedOrBlocked.map((proposal) => (
                <div key={proposal.proposalId} className="rounded-xl border border-white/10 bg-black/10 p-2">
                  <div className="text-[10px] font-bold text-[var(--app-text-main)]">{proposal.status === "blocked" ? "Blocked for safety" : "Rejected"} · {proposal.title}</div>
                  {proposal.blockedBy && proposal.blockedBy.length > 0 && <p className="mt-1 text-[9px] uppercase tracking-widest text-red-300">{proposal.blockedBy.join(", ")}</p>}
                </div>
              ))}
            </div>
          );
        })()}
      </RightPanelSection>

      <RightPanelSection title="Skill requests" subtitle="Skill approval is state-only. No skill installs, enables, updates, or runs in this state.">
        {(() => {
          const active = data.skillRequests.filter((request) => request.status !== "expired");
          if (active.length === 0) return <div className="text-[10px] italic text-[var(--app-text-muted)]">No skill requests.</div>;
          return active.slice(0, 6).map((request) => {
            const approved = request.status === "approved_waiting_install" || request.status === "approved_waiting_execution";
            const pending = request.status === "proposed" || request.status === "approval_required";
            return (
              <div key={request.skillRequestId} className="mb-2 rounded-xl border border-white/10 bg-black/10 p-2">
                <div className="text-[10px] font-bold text-[var(--app-text-main)]">{approved ? "Approved — waiting future secure bridge" : request.status === "blocked" ? "Blocked for safety" : "Skill request"} · {request.skillName}</div>
                <p className="mt-1 text-[10px] text-[var(--app-text-muted)]">{request.description}</p>
                <p className="mt-1 text-[9px] uppercase tracking-widest text-amber-200">{request.requestType} · {request.riskLevel} · {request.status} · no execution</p>
                {request.blockedBy && request.blockedBy.length > 0 && <p className="mt-1 text-[9px] uppercase tracking-widest text-red-300">{request.blockedBy.join(", ")}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {pending && <Button tone="good" onClick={() => { skillGovernanceService.approveSkillRequest(request.skillRequestId); refresh(); }}>approve (state-only)</Button>}
                  {pending && <Button tone="danger" onClick={() => { skillGovernanceService.rejectSkillRequest(request.skillRequestId); refresh(); }}>reject</Button>}
                  {approved && <Button onClick={() => { skillGovernanceService.revokeSkillRequest(request.skillRequestId); refresh(); }}>revoke</Button>}
                </div>
              </div>
            );
          });
        })()}
      </RightPanelSection>

      <RightPanelSection title="Intent routing" subtitle="Recent non-fast routing decisions. Routing does not execute anything.">
        {(() => {
          const nonFast = data.routingDecisions.filter((d) => d.route !== "fast_response").slice(0, 5);
          if (nonFast.length === 0) return <div className="text-[10px] italic text-[var(--app-text-muted)]">No routing decisions besides fast responses.</div>;
          return (
            <div className="space-y-2">
              {nonFast.map((d) => {
                const route = d.route as LucaIntentRoute;
                const tone = getRouteTone(route);
                const toneColor = getRouteToneColor(tone);
                const toneBorder = getRouteToneBorder(tone);
                const toneBg = getRouteToneBg(tone);
                return (
                  <div key={d.decisionId} className={`rounded-xl border p-2 ${toneBorder} ${toneBg}`}>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className={`font-bold ${toneColor}`}>{getRouteLabel(route)}</span>
                      <span className="text-[var(--app-text-muted)]">· {d.mode} mode</span>
                    </div>
                    <p className="mt-1 text-[10px] text-[var(--app-text-muted)] truncate">{d.reason.slice(0, 200)}</p>
                    <p className="mt-1 text-[9px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-70">
                      {getRouteNoExecutionText(route)} · risk: {d.riskLevel}
                    </p>
                    <p className="mt-0.5 text-[9px] text-[var(--app-text-muted)]">{getRouteNextAction(route)}</p>
                    {d.createdPlanId && <p className="text-[9px] text-[var(--app-text-muted)]">Plan: {d.createdPlanId}</p>}
                    {(d.createdMemoryProposalIds?.length ?? 0) > 0 && <p className="text-[9px] text-[var(--app-text-muted)]">Memory proposals: {d.createdMemoryProposalIds?.length}</p>}
                    {(d.createdGovernedRequestIds?.length ?? 0) > 0 && <p className="text-[9px] text-[var(--app-text-muted)]">Governed requests: {d.createdGovernedRequestIds?.length}</p>}
                    {(d.createdSkillRequestIds?.length ?? 0) > 0 && <p className="text-[9px] text-[var(--app-text-muted)]">Skill requests: {d.createdSkillRequestIds?.length}</p>}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </RightPanelSection>

      <RightPanelSection title="Runtime plans" subtitle="Plans are state-only records. Activating or creating governed items does not execute anything.">
        {(() => {
          const proposed = data.plans.filter((p) => p.status === "proposed" || p.status === "waiting_approval" || p.status === "waiting_user");
          const active = data.plans.filter((p) => p.status === "active");
          const blocked = data.plans.filter((p) => p.status === "blocked");
          if (proposed.length === 0 && active.length === 0 && blocked.length === 0) {
            return <div className="text-[10px] italic text-[var(--app-text-muted)]">No runtime plans.</div>;
          }
          return (
            <div className="space-y-2">
              {proposed.map((plan) => (
                <div key={plan.planId} className="rounded-xl border border-white/10 bg-black/10 p-2">
                  <div className="text-[10px] font-bold text-[var(--app-text-main)]">Plan proposed · {plan.title}</div>
                  <p className="mt-1 text-[10px] text-[var(--app-text-muted)]">{plan.summary}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-widest text-amber-200">{plan.riskLevel} · {plan.steps.length} steps · no execution</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button tone="good" onClick={() => { runtimePlanService.activatePlan(plan.planId); refresh(); }}>activate plan</Button>
                    <Button onClick={() => { runtimePlanService.createArtifactsForPlan(plan.planId); refresh(); }}>Create governed items</Button>
                    <Button tone="danger" onClick={() => { runtimePlanService.rejectPlan(plan.planId); refresh(); }}>reject</Button>
                    <Button onClick={() => { runtimePlanService.archivePlan(plan.planId); refresh(); }}>archive</Button>
                  </div>
                </div>
              ))}
              {active.map((plan) => (
                <div key={plan.planId} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2">
                  <div className="text-[10px] font-bold text-emerald-200">Active plan · {plan.title}</div>
                  <p className="mt-1 text-[10px] text-[var(--app-text-muted)]">{plan.summary}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-widest text-emerald-300">{plan.riskLevel} · {plan.steps.length} steps</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button onClick={() => { runtimePlanService.createArtifactsForPlan(plan.planId); refresh(); }}>Create governed items</Button>
                    <Button onClick={() => { runtimePlanService.completePlan(plan.planId); refresh(); }}>complete</Button>
                    <Button onClick={() => { runtimePlanService.archivePlan(plan.planId); refresh(); }}>archive</Button>
                  </div>
                </div>
              ))}
              {blocked.map((plan) => (
                <div key={plan.planId} className="rounded-xl border border-red-500/20 bg-red-500/5 p-2">
                  <div className="text-[10px] font-bold text-red-200">Blocked for safety · {plan.title}</div>
                  <p className="mt-1 text-[10px] text-[var(--app-text-muted)]">{plan.summary}</p>
                  {plan.blockedBy && plan.blockedBy.length > 0 && <p className="mt-1 text-[9px] uppercase tracking-widest text-red-300">{plan.blockedBy.join(", ")}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button onClick={() => { runtimePlanService.archivePlan(plan.planId); refresh(); }}>archive</Button>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </RightPanelSection>

      <RightPanelSection title="Planning checkpoints" subtitle="Checkpoints are state-only. Approving a plan never runs tools or skills.">
        {(() => {
          const pending = data.checkpoints.filter((checkpoint) => checkpoint.status === "proposed");
          if (pending.length === 0) return <div className="text-[10px] italic text-[var(--app-text-muted)]">No pending planning checkpoints.</div>;
          return pending.slice(0, 5).map((checkpoint) => (
            <div key={checkpoint.checkpointId} className="mb-2 rounded-xl border border-white/10 bg-black/10 p-2">
              <div className="text-[10px] font-bold text-[var(--app-text-main)]">Plan proposed · {checkpoint.title}</div>
              <p className="mt-1 text-[10px] text-[var(--app-text-muted)]">{checkpoint.summary}</p>
              {checkpoint.proposedNextSteps.length > 0 && <p className="mt-1 text-[9px] text-[var(--app-text-muted)]">Next: {checkpoint.proposedNextSteps.slice(0, 3).join(" · ")}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button tone="good" onClick={() => { agentPlanningCheckpointService.approveCheckpoint(checkpoint.checkpointId); refresh(); }}>approve plan (no execution)</Button>
                <Button tone="danger" onClick={() => { agentPlanningCheckpointService.rejectCheckpoint(checkpoint.checkpointId); refresh(); }}>reject</Button>
              </div>
            </div>
          ));
        })()}
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
