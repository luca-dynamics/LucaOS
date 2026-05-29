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
import { agentPlanningCheckpointService } from "../../services/runtime/AgentPlanningCheckpointService";
import { runtimePlanService } from "../../services/runtime/RuntimePlanService";
import { intentRoutingService } from "../../services/runtime/IntentRoutingService";
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
      executions: governedToolExecutionService.listExecutions(),
      scheduler: schedulerRegistryService.detectDueJobsDryRun(now),
      reminders: reminderDeliveryService.listDeliveries(),
      memory: memoryGovernanceService.listGovernanceSummaries(),
      loop: runtimeContinuityLoopService.getLoopStatus(),
      memoryProposals: memoryProposalService.listProposals(),
      memoryWrites: governedMemoryWriteService.listMemoryWrites(),
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

      <RightPanelSection title="Skill requests" subtitle="Skill governance request trace. Approval is state-only; no execution happens.">
        {trace.skillRequests.length === 0 ? <EmptyState>No skill requests.</EmptyState> : trace.skillRequests.slice(0, 8).map((request) => (
          <div key={request.skillRequestId} className="mb-2 rounded-xl border border-white/10 bg-black/10 p-2 text-[10px] text-[var(--app-text-muted)]">
            <div className="font-bold text-[var(--app-text-main)]">{request.status} · {request.skillName}</div>
            <div>{request.requestType} · risk: {request.riskLevel}</div>
            {request.blockedBy && request.blockedBy.length > 0 && <div className="text-red-200">Blocked: {request.blockedBy.join(", ")}</div>}
          </div>
        ))}
      </RightPanelSection>

      <RightPanelSection title="Plan trace" subtitle="Runtime plan lifecycle trace. Plans create governed records; nothing executes.">
        {trace.plans.length === 0 ? <EmptyState>No runtime plans.</EmptyState> : trace.plans.slice(0, 8).map((plan) => (
          <div key={plan.planId} className="mb-2 rounded-xl border border-white/10 bg-black/10 p-2 text-[10px] text-[var(--app-text-muted)]">
            <div className="font-bold text-[var(--app-text-main)]">{plan.status} · {plan.title}</div>
            <div>risk: {plan.riskLevel} · {plan.steps.length} steps · {new Date(plan.updatedAt).toLocaleString()}</div>
            {plan.checkpointIds.length > 0 && <div>Checkpoints: {plan.checkpointIds.length}</div>}
            {plan.memoryProposalIds.length > 0 && <div>Memory proposals: {plan.memoryProposalIds.length}</div>}
            {plan.governedRequestIds.length > 0 && <div>Governed requests: {plan.governedRequestIds.length}</div>}
            {plan.skillRequestIds.length > 0 && <div>Skill requests: {plan.skillRequestIds.length}</div>}
            {plan.blockedBy && plan.blockedBy.length > 0 && <div className="text-red-200">Blocked: {plan.blockedBy.join(", ")}</div>}
            {plan.steps.filter((s) => s.kind === "blocked_risky_action" || s.status === "blocked").length > 0 && (
              <div className="text-red-200">Blocked risky steps: {plan.steps.filter((s) => s.kind === "blocked_risky_action" || s.status === "blocked").length}</div>
            )}
          </div>
        ))}
      </RightPanelSection>

      <RightPanelSection title="Planning checkpoints" subtitle="Planning checkpoint trace. State-only; nothing executes.">
        {trace.checkpoints.length === 0 ? <EmptyState>No planning checkpoints.</EmptyState> : trace.checkpoints.slice(0, 8).map((checkpoint) => (
          <div key={checkpoint.checkpointId} className="mb-2 rounded-xl border border-white/10 bg-black/10 p-2 text-[10px] text-[var(--app-text-muted)]">
            <div className="font-bold text-[var(--app-text-main)]">{checkpoint.status} · {checkpoint.title}</div>
            <div>risk: {checkpoint.riskLevel} · {new Date(checkpoint.updatedAt).toLocaleString()}</div>
            {checkpoint.blockedBy && checkpoint.blockedBy.length > 0 && <div className="text-red-200">Blocked: {checkpoint.blockedBy.join(", ")}</div>}
          </div>
        ))}
      </RightPanelSection>

      <RightPanelSection title="Intent routing trace" subtitle="Routing decisions and mode/risk/reason audit. Routing does not execute anything.">
        {trace.routingDecisions.length === 0 ? <EmptyState>No routing decisions.</EmptyState> : trace.routingDecisions.slice(0, 8).map((decision) => (
          <div key={decision.decisionId} className="mb-2 rounded-xl border border-white/10 bg-black/10 p-2 text-[10px] text-[var(--app-text-muted)]">
            <div className="font-bold text-[var(--app-text-main)]">
              <span className={decision.route === "blocked_risky_action" ? "text-red-300" : decision.route === "fast_response" ? "text-slate-400" : "text-amber-300"}>{decision.route}</span>
              {" "}&middot; {decision.mode} mode &middot; risk: {decision.riskLevel}
            </div>
            <div>{decision.reason}</div>
            {decision.createdPlanId && <div>Plan: {decision.createdPlanId}</div>}
            {(decision.createdMemoryProposalIds?.length ?? 0) > 0 && <div>Memory proposals: {decision.createdMemoryProposalIds?.length}</div>}
            {(decision.createdGovernedRequestIds?.length ?? 0) > 0 && <div>Governed requests: {decision.createdGovernedRequestIds?.length}</div>}
            {(decision.createdSkillRequestIds?.length ?? 0) > 0 && <div>Skill requests: {decision.createdSkillRequestIds?.length}</div>}
            <div className="text-[9px] uppercase tracking-widest">no execution performed &middot; {new Date(decision.createdAt).toLocaleString()}</div>
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
