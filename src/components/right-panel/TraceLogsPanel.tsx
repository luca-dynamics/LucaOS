import React, { useMemo } from "react";
import type { ToolExecutionLog } from "../../types";
import { approvalRequestCenterService } from "../../services/provenance/ApprovalRequestCenterService";
import { runtimeInboxService } from "../../services/runtime/RuntimeInboxService";
import { governedActionRequestService } from "../../services/runtime/GovernedActionRequestService";
import { governedToolExecutionService } from "../../services/runtime/GovernedToolExecutionService";
import { schedulerRegistryService } from "../../services/scheduler/SchedulerRegistryService";
import { reminderDeliveryService } from "../../services/scheduler/ReminderDeliveryService";
import { memoryGovernanceService } from "../../services/memory/MemoryGovernanceService";
import { memoryProposalService } from "../../services/memory/MemoryProposalService";
import { governedMemoryWriteService } from "../../services/memory/GovernedMemoryWriteService";
import { skillGovernanceService } from "../../services/skills/SkillGovernanceService";
import { browserDesktopGatewayService } from "../../services/runtime/BrowserDesktopGatewayService";
import { agentPlanningCheckpointService } from "../../services/runtime/AgentPlanningCheckpointService";
import { runtimePlanService } from "../../services/runtime/RuntimePlanService";
import { intentRoutingService } from "../../services/runtime/IntentRoutingService";
import { runtimeContinuityLoopService } from "../../services/runtime/RuntimeContinuityLoopService";
import { Icon } from "../ui/Icon";
import RightPanelSection from "./RightPanelSection";
import { summarizeToolLog } from "./rightPanelModel";
import type { LucaIntentRoute } from "../../types/intentRouting";
import { getRouteLabel, getRouteTone, getRouteToneColor, getRouteToneBorder, getRouteToneBg, getRouteNoExecutionText } from "../runtime/intentRoutingLabels";
import { agentSessionContinuityService } from "../../services/runtime/AgentSessionContinuityService";
import {
  getSessionContinuityLabel, getSessionContinuityTone,
  getReminderDeliveryLabel, getReminderDeliveryTone,
  getPlanContinuityLabel, getPlanContinuityTone,
  getCheckpointContinuityLabel, getCheckpointContinuityTone,
  getContinuityToneColor, getContinuityToneBorder, getContinuityToneBg,
  getContinuityNoExecutionText, compactTimestamp,
} from "../runtime/continuityLabels";
import {
  getSkillCapabilityLabel,
  getSkillRequestLabel,
  getSkillRequestNextAction,
  getSkillRequestNoExecutionText,
  getSkillRequestTone,
  getSkillRequestTypeLabel,
  getSkillRiskLabel,
  getSkillRiskTone,
  type SkillGovernanceTone,
} from "../runtime/skillGovernanceLabels";

interface TraceLogsPanelProps {
  theme: { hex: string; primary: string; border: string };
  toolLogs: ToolExecutionLog[];
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] italic text-[var(--app-text-muted)] opacity-70">{children}</div>;
}

const getSkillToneColor = (tone: SkillGovernanceTone): string => {
  switch (tone) {
    case "good": return "text-emerald-300";
    case "warn": return "text-amber-300";
    case "danger": return "text-red-300";
    case "info": return "text-sky-300";
    case "neutral": return "text-[var(--app-text-muted)]";
  }
};

const getSkillToneBorder = (tone: SkillGovernanceTone): string => {
  switch (tone) {
    case "good": return "border-emerald-500/20";
    case "warn": return "border-amber-500/20";
    case "danger": return "border-red-500/20";
    case "info": return "border-sky-500/20";
    case "neutral": return "border-white/10";
  }
};

const getSkillToneBg = (tone: SkillGovernanceTone): string => {
  switch (tone) {
    case "good": return "bg-emerald-500/5";
    case "warn": return "bg-amber-500/5";
    case "danger": return "bg-red-500/5";
    case "info": return "bg-sky-500/5";
    case "neutral": return "bg-black/10";
  }
};

const TraceLogsPanel: React.FC<TraceLogsPanelProps> = ({ theme, toolLogs }) => {
  const trace = useMemo(() => {
    const now = new Date().toISOString();
    return {
      approvals: approvalRequestCenterService.listRequests(),
      inbox: runtimeInboxService.listEvents(),
      sessions: agentSessionContinuityService.listSessions(),
      governed: governedActionRequestService.listRequests(),
      executions: governedToolExecutionService.listExecutions(),
      scheduler: schedulerRegistryService.detectDueJobsDryRun(now),
      reminders: reminderDeliveryService.listDeliveries(),
      memory: memoryGovernanceService.listGovernanceSummaries(),
      loop: runtimeContinuityLoopService.getLoopStatus(),
      memoryProposals: memoryProposalService.listProposals(),
      memoryWrites: governedMemoryWriteService.listMemoryWrites(),
      gatewayRequests: browserDesktopGatewayService.listGatewayRequests(),
      skillRequests: skillGovernanceService.listSkillRequests(),
      checkpoints: agentPlanningCheckpointService.listCheckpoints(),
      plans: runtimePlanService.listPlans(),
      routingDecisions: intentRoutingService.listRoutingDecisions(),
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

      <RightPanelSection title="Gateway trace" subtitle="Audit-like gateway research records. Execution remains disabled.">
        {trace.gatewayRequests.length === 0 ? <EmptyState>No gateway requests.</EmptyState> : [...trace.gatewayRequests]
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .slice(0, 6)
          .map((request) => (
            <div key={request.gatewayRequestId} className={`mb-2 rounded-xl border p-3 ${request.status === "blocked" ? "border-red-500/20 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">
                    {request.status.replace(/_/g, " ")} · {request.surface}/{request.capability.replace(/_/g, " ")}
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{request.policyDecision.userSafeReason}</p>
                </div>
                <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">{request.riskLevel}</span>
              </div>
              {request.blockedBy && request.blockedBy.length > 0 && (
                <p className="mt-2 text-[9px] text-red-200">Blocked by: {request.blockedBy.join(", ")}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">
                <span>created {compactTimestamp(request.createdAt)}</span>
                <span>updated {compactTimestamp(request.updatedAt)}</span>
                <span>dry-run only: {String(request.policyDecision.allowedForDryRun)}</span>
                <span>execution enabled: false</span>
              </div>
            </div>
          ))}
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

      <RightPanelSection title="Session continuity trace" subtitle="Session lifecycle audit. State-only; no autonomous resume.">
        {trace.sessions.length === 0 ? <EmptyState>No session continuity records.</EmptyState> : trace.sessions.filter((s) => s.userVisible).slice(0, 8).map((session) => {
          const tone = getSessionContinuityTone(session.lifecycleState);
          return (
            <div key={session.sessionId} className={`mb-2 rounded-xl border p-2 text-[10px] text-[var(--app-text-muted)] ${getContinuityToneBorder(tone)} ${getContinuityToneBg(tone)}`}>
              <div className="flex items-center gap-1.5">
                <span className={`font-bold ${getContinuityToneColor(tone)}`}>{getSessionContinuityLabel(session.lifecycleState)}</span>
                <span className="font-bold text-[var(--app-text-main)]">&middot; {session.title}</span>
              </div>
              <div>{session.mode} &middot; {compactTimestamp(session.updatedAt)}</div>
              <div className="text-[9px] uppercase tracking-widest opacity-70">{getContinuityNoExecutionText("session")}</div>
            </div>
          );
        })}
      </RightPanelSection>

      <RightPanelSection title="Reminder delivery trace" subtitle="Safe reminder delivery records. No execution.">
        {trace.reminders.length === 0 ? <EmptyState>No reminder deliveries.</EmptyState> : trace.reminders.slice(0, 8).map((reminder) => {
          const tone = getReminderDeliveryTone(reminder.status);
          return (
            <div key={reminder.deliveryId} className={`mb-2 rounded-xl border p-2 text-[10px] text-[var(--app-text-muted)] ${getContinuityToneBorder(tone)} ${getContinuityToneBg(tone)}`}>
              <div className="flex items-center gap-1.5">
                <span className={`font-bold ${getContinuityToneColor(tone)}`}>{getReminderDeliveryLabel(reminder.status)}</span>
                <span className="font-bold text-[var(--app-text-main)]">&middot; {reminder.title}</span>
              </div>
              <div>{reminder.reason}</div>
              {reminder.dueAt && <div className="text-[9px] opacity-70">Due: {compactTimestamp(reminder.dueAt)}</div>}
              <div className="text-[9px] uppercase tracking-widest opacity-70">{getContinuityNoExecutionText("reminder")}</div>
            </div>
          );
        })}
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

      <RightPanelSection title="Governed executions" subtitle="Safe action execution audit trail.">
        {trace.executions.length === 0 ? <EmptyState>No governed executions recorded.</EmptyState> : trace.executions.slice(0, 8).map((execution) => (
          <div key={execution.executionId} className="mb-2 rounded-xl border border-white/10 bg-black/10 p-2 text-[10px] text-[var(--app-text-muted)]">
            <div className="font-bold text-[var(--app-text-main)]">
              <span className={execution.status === "succeeded" ? "text-emerald-300" : execution.status === "blocked" ? "text-red-300" : "text-amber-300"}>{execution.status}</span>
              {" "}&middot; {execution.title}
            </div>
            <div>{execution.capability} &middot; risk: {execution.riskLevel}</div>
            {execution.completedAt && <div>{new Date(execution.completedAt).toLocaleString()}</div>}
            {execution.blockedBy && execution.blockedBy.length > 0 && <div className="text-red-200">Blocked: {execution.blockedBy.join(", ")}</div>}
          </div>
        ))}
      </RightPanelSection>

      <RightPanelSection title="Memory proposals" subtitle="Memory proposal lifecycle trace. No raw secrets are stored.">
        {trace.memoryProposals.length === 0 ? <EmptyState>No memory proposals.</EmptyState> : trace.memoryProposals.slice(0, 8).map((proposal) => (
          <div key={proposal.proposalId} className="mb-2 rounded-xl border border-white/10 bg-black/10 p-2 text-[10px] text-[var(--app-text-muted)]">
            <div className="font-bold text-[var(--app-text-main)]">{proposal.status} · {proposal.title}</div>
            <div>{proposal.kind} · risk: {proposal.riskLevel} · {new Date(proposal.updatedAt).toLocaleString()}</div>
            {proposal.blockedBy && proposal.blockedBy.length > 0 && <div className="text-red-200">Blocked: {proposal.blockedBy.join(", ")}</div>}
          </div>
        ))}
      </RightPanelSection>

      <RightPanelSection title="Memory writes" subtitle="Governed memory write audit. One-time approval is consumed at write time.">
        {trace.memoryWrites.length === 0 ? <EmptyState>No memory writes recorded.</EmptyState> : trace.memoryWrites.slice(0, 8).map((write) => (
          <div key={write.writeId} className="mb-2 rounded-xl border border-white/10 bg-black/10 p-2 text-[10px] text-[var(--app-text-muted)]">
            <div className="font-bold text-[var(--app-text-main)]">
              <span className={write.status === "succeeded" ? "text-emerald-300" : write.status === "blocked" ? "text-red-300" : "text-amber-300"}>{write.status}</span> · risk: {write.riskLevel}
            </div>
            <div>{write.summary}</div>
            {write.blockedBy && write.blockedBy.length > 0 && <div className="text-red-200">Blocked: {write.blockedBy.join(", ")}</div>}
          </div>
        ))}
      </RightPanelSection>

      <RightPanelSection title="Skill requests" subtitle="Latest skill governance records. Approval is state-only; no execution happens.">
        {trace.skillRequests.length === 0 ? <EmptyState>No skill requests.</EmptyState> : [...trace.skillRequests]
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .slice(0, 8)
          .map((request) => {
            const statusTone = getSkillRequestTone(request.status);
            const riskTone = getSkillRiskTone(request.riskLevel);
            return (
              <div key={request.skillRequestId} className={`mb-2 rounded-xl border p-2 text-[10px] text-[var(--app-text-muted)] ${getSkillToneBorder(statusTone)} ${getSkillToneBg(statusTone)}`}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`font-bold ${getSkillToneColor(statusTone)}`}>{getSkillRequestLabel(request.status)}</span>
                  <span className="font-bold text-[var(--app-text-main)]">&middot; {request.skillName}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[9px] font-bold uppercase tracking-widest">
                  <span>{getSkillRequestTypeLabel(request.requestType)}</span>
                  <span className={getSkillToneColor(riskTone)}>&middot; {getSkillRiskLabel(request.riskLevel)}</span>
                  <span>&middot; {compactTimestamp(request.updatedAt)}</span>
                </div>
                <div className="mt-1">Capabilities: {request.requestedCapabilities.length === 0 ? "none requested" : request.requestedCapabilities.map(getSkillCapabilityLabel).join(", ")}</div>
                {request.blockedBy && request.blockedBy.length > 0 && <div className="text-red-200">Blocked reason: {request.blockedBy.map(getSkillCapabilityLabel).join(", ")}</div>}
                <div>{getSkillRequestNextAction(request.status, request.requestType)}</div>
                <div className="text-[9px] uppercase tracking-widest opacity-70">{getSkillRequestNoExecutionText()}</div>
              </div>
            );
          })}
      </RightPanelSection>

      <RightPanelSection title="Plan trace" subtitle="Runtime plan lifecycle trace. Plans create governed records; nothing executes.">
        {trace.plans.length === 0 ? <EmptyState>No runtime plans.</EmptyState> : trace.plans.slice(0, 8).map((plan) => {
          const tone = getPlanContinuityTone(plan.status);
          return (
            <div key={plan.planId} className={`mb-2 rounded-xl border p-2 text-[10px] text-[var(--app-text-muted)] ${getContinuityToneBorder(tone)} ${getContinuityToneBg(tone)}`}>
              <div className="flex items-center gap-1.5">
                <span className={`font-bold ${getContinuityToneColor(tone)}`}>{getPlanContinuityLabel(plan.status)}</span>
                <span className="font-bold text-[var(--app-text-main)]">&middot; {plan.title}</span>
              </div>
              <div>risk: {plan.riskLevel} &middot; {plan.steps.length} steps &middot; {compactTimestamp(plan.updatedAt)}</div>
              {plan.checkpointIds.length > 0 && <div>Checkpoints: {plan.checkpointIds.length}</div>}
              {plan.memoryProposalIds.length > 0 && <div>Memory proposals: {plan.memoryProposalIds.length}</div>}
              {plan.governedRequestIds.length > 0 && <div>Governed requests: {plan.governedRequestIds.length}</div>}
              {plan.skillRequestIds.length > 0 && <div>Skill requests: {plan.skillRequestIds.length}</div>}
              {plan.blockedBy && plan.blockedBy.length > 0 && <div className="text-red-200">Blocked: {plan.blockedBy.join(", ")}</div>}
              {plan.steps.filter((s) => s.kind === "blocked_risky_action" || s.status === "blocked").length > 0 && (
                <div className="text-red-200">Blocked risky steps: {plan.steps.filter((s) => s.kind === "blocked_risky_action" || s.status === "blocked").length}</div>
              )}
              <div className="text-[9px] uppercase tracking-widest opacity-70">{getContinuityNoExecutionText("plan")}</div>
            </div>
          );
        })}
      </RightPanelSection>

      <RightPanelSection title="Planning checkpoints" subtitle="Planning checkpoint trace. State-only; nothing executes.">
        {trace.checkpoints.length === 0 ? <EmptyState>No planning checkpoints.</EmptyState> : trace.checkpoints.slice(0, 8).map((checkpoint) => {
          const tone = getCheckpointContinuityTone(checkpoint.status);
          return (
            <div key={checkpoint.checkpointId} className={`mb-2 rounded-xl border p-2 text-[10px] text-[var(--app-text-muted)] ${getContinuityToneBorder(tone)} ${getContinuityToneBg(tone)}`}>
              <div className="flex items-center gap-1.5">
                <span className={`font-bold ${getContinuityToneColor(tone)}`}>{getCheckpointContinuityLabel(checkpoint.status)}</span>
                <span className="font-bold text-[var(--app-text-main)]">&middot; {checkpoint.title}</span>
              </div>
              <div>risk: {checkpoint.riskLevel} &middot; {compactTimestamp(checkpoint.updatedAt)}</div>
              {checkpoint.blockedBy && checkpoint.blockedBy.length > 0 && <div className="text-red-200">Blocked: {checkpoint.blockedBy.join(", ")}</div>}
              <div className="text-[9px] uppercase tracking-widest opacity-70">{getContinuityNoExecutionText("checkpoint")}</div>
            </div>
          );
        })}
      </RightPanelSection>

      <RightPanelSection title="Intent routing trace" subtitle="Routing decisions and mode/risk/reason audit. Routing does not execute anything.">
        {trace.routingDecisions.length === 0 ? <EmptyState>No routing decisions.</EmptyState> : trace.routingDecisions.slice(0, 8).map((decision) => {
          const route = decision.route as LucaIntentRoute;
          const tone = getRouteTone(route);
          const toneColor = getRouteToneColor(tone);
          const toneBorder = getRouteToneBorder(tone);
          const toneBg = getRouteToneBg(tone);
          return (
            <div key={decision.decisionId} className={`mb-2 rounded-xl border p-2 text-[10px] text-[var(--app-text-muted)] ${toneBorder} ${toneBg}`}>
              <div className="flex items-center gap-1.5">
                <span className={`font-bold ${toneColor}`}>{getRouteLabel(route)}</span>
                <span>&middot; {decision.mode} mode &middot; risk: {decision.riskLevel}</span>
              </div>
              <div className="mt-0.5 truncate">{decision.reason.slice(0, 200)}</div>
              {decision.createdPlanId && <div className="mt-0.5">Route → Plan: {decision.createdPlanId}</div>}
              {(decision.createdMemoryProposalIds?.length ?? 0) > 0 && <div className="mt-0.5">Route → Memory proposals: {decision.createdMemoryProposalIds?.length}</div>}
              {(decision.createdGovernedRequestIds?.length ?? 0) > 0 && <div className="mt-0.5">Route → Governed requests: {decision.createdGovernedRequestIds?.length}</div>}
              {(decision.createdSkillRequestIds?.length ?? 0) > 0 && <div className="mt-0.5">Route → Skill requests: {decision.createdSkillRequestIds?.length}</div>}
              <div className="mt-0.5 text-[9px] uppercase tracking-widest opacity-70">{getRouteNoExecutionText(route)} &middot; {new Date(decision.createdAt).toLocaleString()}</div>
            </div>
          );
        })}
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
