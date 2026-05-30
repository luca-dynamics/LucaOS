import React, { useMemo, useState } from "react";
import { approvalRequestCenterService } from "../../services/provenance/ApprovalRequestCenterService";
import { runtimeInboxService } from "../../services/runtime/RuntimeInboxService";
import { agentSessionContinuityService } from "../../services/runtime/AgentSessionContinuityService";
import { governedActionRequestService } from "../../services/runtime/GovernedActionRequestService";
import { governedToolExecutionService } from "../../services/runtime/GovernedToolExecutionService";
import { memoryProposalService } from "../../services/memory/MemoryProposalService";
import { governedMemoryWriteService } from "../../services/memory/GovernedMemoryWriteService";
import { skillGovernanceService } from "../../services/skills/SkillGovernanceService";
import { browserDesktopGatewayService } from "../../services/runtime/BrowserDesktopGatewayService";
import { screenObservationService } from "../../services/runtime/ScreenObservationService";
import { sandboxedBrowserService } from "../../services/runtime/SandboxedBrowserService";
import { sandboxedBrowserShellService } from "../../services/runtime/SandboxedBrowserShellService";
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
import { isSafeLocalPanelTarget, getSafeLocalPanelLabel } from "../../services/runtime/SafeLocalPanelTargets";
import {
  getSessionContinuityLabel, getSessionContinuityTone, getSessionNextAction,
  getReminderDeliveryLabel, getReminderDeliveryTone, getReminderNextAction,
  getPlanContinuityLabel, getPlanContinuityTone, getPlanNextAction,
  getCheckpointContinuityLabel, getCheckpointContinuityTone, getCheckpointNextAction,
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
import {
  getGatewayCapabilityLabel,
  getGatewayCredentialBoundaryText,
  getGatewayFutureReadinessText,
  getGatewayNextAction,
  getGatewayNoExecutionText,
  getGatewayPermissionSummary,
  getGatewayRiskLabel,
  getGatewaySafeguardLabels,
  getGatewayStatusLabel,
  getGatewaySurfaceLabel,
} from "../runtime/gatewayPermissionLabels";
import {
  getScreenObservationCapabilityLabel,
  getScreenObservationConsentLabel,
  getScreenObservationFutureReadinessText,
  getScreenObservationNextAction,
  getScreenObservationNoCaptureText,
  getScreenObservationRiskLabel,
  getScreenObservationSafeguardLabels,
  getScreenObservationStatusLabel,
  getScreenObservationSummary,
  getScreenObservationSurfaceLabel,
} from "../runtime/screenObservationLabels";
import {
  getObservationRequestTimeline,
  getObservationSessionBoundaryCopy,
  getObservationSessionConsentCopy,
  getObservationSessionCredentialBoundaryCopy,
  getObservationSessionLifecycleLabel,
  getObservationSessionNoCaptureBadge,
  getObservationSessionRevocationCopy,
  getObservationSessionSensitiveContentCopy,
  getObservationSessionTimeline,
  getObservationSessionVisibleIndicatorCopy,
} from "../runtime/screenObservationSessionUx";
import {
  getSandboxedBrowserCapabilityLabel,
  getSandboxedBrowserCredentialBoundaryLabel,
  getSandboxedBrowserFutureReadinessText,
  getSandboxedBrowserNavigationRiskLabel,
  getSandboxedBrowserNextAction,
  getSandboxedBrowserNoLaunchText,
  getSandboxedBrowserRiskLabel,
  getSandboxedBrowserSafeguardLabels,
  getSandboxedBrowserStatusLabel,
  getSandboxedBrowserSummary,
  getSandboxedBrowserSurfaceLabel,
} from "../runtime/sandboxedBrowserLabels";

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
      gatewayRequests: browserDesktopGatewayService.listGatewayRequests(),
      observationRequests: screenObservationService.listObservationRequests(),
      observationSessions: screenObservationService.listObservationSessions(),
      browserRequests: sandboxedBrowserService.listBrowserRequests(),
      browserSessions: sandboxedBrowserService.listBrowserSessions(),
      browserShellSessions: sandboxedBrowserShellService.listShellSessions(),
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

      <RightPanelSection title="Gateway requests" subtitle="Research-only browser/desktop/device gateway records. No execution, approval, or control is enabled.">
        {(() => {
          const recent = data.gatewayRequests.filter((request) => request.status !== "archived").slice(0, 5);
          if (recent.length === 0) return <div className="text-[10px] italic text-[var(--app-text-muted)]">No gateway research requests.</div>;
          return (
            <div className="space-y-2">
              {recent.map((request) => {
                const safeguards = getGatewaySafeguardLabels(request.policyDecision);
                const statusLabel = getGatewayStatusLabel(request.status);
                const surfaceLabel = getGatewaySurfaceLabel(request.surface);
                const capabilityLabel = getGatewayCapabilityLabel(request.capability);
                const riskLabel = getGatewayRiskLabel(request.riskLevel);
                const permissionSummary = getGatewayPermissionSummary(request);
                const nextAction = getGatewayNextAction(request);
                const futureReadiness = getGatewayFutureReadinessText(request);
                const credentialBoundary = getGatewayCredentialBoundaryText(request);
                return (
                  <div key={request.gatewayRequestId} className={`rounded-xl border p-3 ${request.status === "blocked" ? "border-red-500/20 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">{request.title}</div>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{permissionSummary}</p>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{request.policyDecision.userSafeReason}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${request.status === "blocked" ? "border-red-500/30 text-red-200" : "border-amber-500/30 text-amber-200"}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1 text-[9px]">
                      <span className="rounded-lg border border-white/10 bg-black/10 px-2 py-1 text-[var(--app-text-muted)]">Surface: {surfaceLabel}</span>
                      <span className="rounded-lg border border-white/10 bg-black/10 px-2 py-1 text-[var(--app-text-muted)]">Capability: {capabilityLabel}</span>
                      <span className="rounded-lg border border-white/10 bg-black/10 px-2 py-1 text-[var(--app-text-muted)]">{riskLabel}</span>
                    </div>
                    <div className="mt-2 rounded-lg border border-white/10 bg-black/10 p-2">
                      <div className="text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">Safeguards checklist</div>
                      <div className="mt-1 flex flex-wrap gap-1 text-[8px] font-black uppercase tracking-widest">
                        {safeguards.map((safeguard) => (
                          <span
                            key={safeguard.key}
                            className={`rounded-full border px-2 py-0.5 ${safeguard.required ? "border-amber-500/30 text-amber-200" : "border-white/10 text-[var(--app-text-muted)] opacity-60"}`}
                          >
                            {safeguard.required ? "✓ " : "○ "}{safeguard.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    {request.blockedBy && request.blockedBy.length > 0 && (
                      <p className="mt-2 text-[9px] leading-relaxed text-red-200">Blocked by: {request.blockedBy.join(", ")}</p>
                    )}
                    <p className="mt-2 text-[9px] leading-relaxed text-[var(--app-text-muted)]">{futureReadiness}</p>
                    <p className="mt-1 text-[9px] leading-relaxed text-[var(--app-text-muted)]">{credentialBoundary}</p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">Next action: {nextAction}</p>
                    <p className="mt-1 text-[9px] italic leading-relaxed text-[var(--app-text-muted)] opacity-80">{getGatewayNoExecutionText()}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {request.status !== "blocked" && <Button tone="danger" onClick={() => { browserDesktopGatewayService.blockGatewayRequest(request.gatewayRequestId, "Blocked from Activity panel."); refresh(); }}>block</Button>}
                      <Button onClick={() => { browserDesktopGatewayService.archiveGatewayRequest(request.gatewayRequestId); refresh(); }}>archive</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </RightPanelSection>

      <RightPanelSection title="Screen observation" subtitle="Permission-model records only. Luca cannot capture, view, OCR, or analyze the screen.">
        {(() => {
          const recent = data.observationRequests.filter((request) => request.status !== "archived").slice(0, 5);
          if (recent.length === 0) return <div className="text-[10px] italic text-[var(--app-text-muted)]">No screen observation requests.</div>;
          return (
            <div className="space-y-2">
              {recent.map((request) => {
                const safeguards = getScreenObservationSafeguardLabels(request.policyDecision);
                const statusLabel = getScreenObservationStatusLabel(request.status);
                const surfaceLabel = getScreenObservationSurfaceLabel(request.surface);
                const capabilityLabel = getScreenObservationCapabilityLabel(request.capability);
                const riskLabel = getScreenObservationRiskLabel(request.riskLevel);
                const consentLabel = getScreenObservationConsentLabel(request.consentState);
                const summary = getScreenObservationSummary(request);
                const nextAction = getScreenObservationNextAction(request);
                const futureReadiness = getScreenObservationFutureReadinessText(request);
                return (
                  <div key={request.observationRequestId} className={`rounded-xl border p-3 ${request.status === "blocked" ? "border-red-500/20 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">{request.title}</div>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{summary}</p>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{request.policyDecision.userSafeReason}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${request.status === "blocked" ? "border-red-500/30 text-red-200" : "border-amber-500/30 text-amber-200"}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1 text-[9px]">
                      <span className="rounded-lg border border-white/10 bg-black/10 px-2 py-1 text-[var(--app-text-muted)]">Surface: {surfaceLabel}</span>
                      <span className="rounded-lg border border-white/10 bg-black/10 px-2 py-1 text-[var(--app-text-muted)]">Capability: {capabilityLabel}</span>
                      <span className="rounded-lg border border-white/10 bg-black/10 px-2 py-1 text-[var(--app-text-muted)]">{riskLabel}</span>
                    </div>
                    <p className="mt-2 text-[9px] uppercase tracking-widest text-[var(--app-text-muted)]">{consentLabel}</p>
                    <div className="mt-2 rounded-lg border border-white/10 bg-black/10 p-2">
                      <div className="text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">Safeguards checklist</div>
                      <div className="mt-1 flex flex-wrap gap-1 text-[8px] font-black uppercase tracking-widest">
                        {safeguards.map((safeguard) => (
                          <span
                            key={safeguard.key}
                            className={`rounded-full border px-2 py-0.5 ${safeguard.required ? "border-amber-500/30 text-amber-200" : "border-white/10 text-[var(--app-text-muted)] opacity-60"}`}
                          >
                            {safeguard.required ? "✓ " : "○ "}{safeguard.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    {request.blockedBy && request.blockedBy.length > 0 && (
                      <p className="mt-2 text-[9px] leading-relaxed text-red-200">Blocked by: {request.blockedBy.join(", ")}</p>
                    )}
                    <div className="mt-2 rounded-lg border border-white/10 bg-black/10 p-2">
                      <div className="text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">Lifecycle</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-[8px] font-black uppercase tracking-widest">
                        {getObservationRequestTimeline(request).map((step, index) => (
                          <React.Fragment key={step.key}>
                            {index > 0 && <span className="text-[var(--app-text-muted)] opacity-40">→</span>}
                            <span className={`rounded-full border px-2 py-0.5 ${step.state === "current" ? "border-amber-500/30 text-amber-200" : "border-white/10 text-[var(--app-text-muted)]"}`}>
                              {step.label}{step.at ? ` · ${compactTimestamp(step.at)}` : ""}
                            </span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                    <p className="mt-2 text-[9px] leading-relaxed text-[var(--app-text-muted)]">{futureReadiness}</p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">Next action: {nextAction}</p>
                    <p className="mt-1 text-[9px] italic leading-relaxed text-[var(--app-text-muted)] opacity-80">{getScreenObservationNoCaptureText()}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(request.status === "dry_run_only" || request.status === "consent_required") && (
                        <Button onClick={() => { screenObservationService.createDryRunSessionFromRequest(request.observationRequestId); refresh(); }}>Create dry-run permission session</Button>
                      )}
                      {request.status !== "blocked" && <Button tone="danger" onClick={() => { screenObservationService.blockObservationRequest(request.observationRequestId, "Blocked from Activity panel."); refresh(); }}>block</Button>}
                      {request.status !== "revoked" && <Button onClick={() => { screenObservationService.revokeObservationRequest(request.observationRequestId, "Revoked from Activity panel."); refresh(); }}>revoke</Button>}
                      <Button onClick={() => { screenObservationService.archiveObservationRequest(request.observationRequestId); refresh(); }}>archive</Button>
                    </div>
                  </div>
                );
              })}
              {data.observationSessions.filter((session) => session.status !== "archived").slice(0, 3).map((session) => (
                <div key={session.observationSessionId} className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">{getObservationSessionLifecycleLabel(session)}</div>
                      <p className="mt-1 text-[9px] leading-relaxed text-[var(--app-text-muted)]">{getScreenObservationSummary(session)}</p>
                      {session.requestId && <p className="mt-1 text-[8px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-70">Linked request: {session.requestId}</p>}
                    </div>
                    <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">{getObservationSessionNoCaptureBadge()}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1 text-[8px] font-black uppercase tracking-widest">
                    {getObservationSessionTimeline(session).map((step, index) => (
                      <React.Fragment key={step.key}>
                        {index > 0 && <span className="text-[var(--app-text-muted)] opacity-40">→</span>}
                        <span className={`rounded-full border px-2 py-0.5 ${step.state === "current" ? "border-sky-500/30 text-sky-200" : "border-white/10 text-[var(--app-text-muted)]"}`}>
                          {step.label}{step.at ? ` · ${compactTimestamp(step.at)}` : ""}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="mt-2 space-y-1 text-[9px] leading-relaxed text-[var(--app-text-muted)]">
                    <p>{getObservationSessionConsentCopy(session)}</p>
                    <p>{getObservationSessionVisibleIndicatorCopy()}</p>
                    <p>{getObservationSessionBoundaryCopy()}</p>
                    <p>{getObservationSessionSensitiveContentCopy()}</p>
                    <p>{getObservationSessionCredentialBoundaryCopy()}</p>
                    <p className="text-[var(--app-text-muted)] opacity-80">{getObservationSessionRevocationCopy(session)}</p>
                  </div>
                  {session.status !== "revoked" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button onClick={() => { screenObservationService.revokeObservationSession(session.observationSessionId, "Revoked from Activity panel."); refresh(); }}>revoke session</Button>
                      <Button onClick={() => { screenObservationService.archiveObservationSession(session.observationSessionId); refresh(); }}>archive session</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })()}
      </RightPanelSection>

      <RightPanelSection title="Sandboxed browser" subtitle="Research/design records only. Luca cannot launch, read, click, type, submit, scrape, download, upload, or automate a browser.">
        {(() => {
          const recent = data.browserRequests.filter((request) => request.status !== "archived").slice(0, 5);
          if (recent.length === 0) return <div className="text-[10px] italic text-[var(--app-text-muted)]">No sandboxed browser requests.</div>;
          return (
            <div className="space-y-2">
              {recent.map((request) => {
                const safeguards = getSandboxedBrowserSafeguardLabels(request.policyDecision);
                const statusLabel = getSandboxedBrowserStatusLabel(request.status);
                const surfaceLabel = getSandboxedBrowserSurfaceLabel(request.surface);
                const capabilityLabel = getSandboxedBrowserCapabilityLabel(request.capability);
                const riskLabel = getSandboxedBrowserRiskLabel(request.riskLevel);
                const navigationRiskLabel = getSandboxedBrowserNavigationRiskLabel(request.navigationRisk);
                const credentialBoundaryLabel = getSandboxedBrowserCredentialBoundaryLabel(request.credentialBoundary);
                const summary = getSandboxedBrowserSummary(request);
                const nextAction = getSandboxedBrowserNextAction(request);
                const futureReadiness = getSandboxedBrowserFutureReadinessText(request);
                return (
                  <div key={request.browserRequestId} className={`rounded-xl border p-3 ${request.status === "blocked" ? "border-red-500/20 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">{request.title}</div>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{summary}</p>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{request.policyDecision.userSafeReason}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${request.status === "blocked" ? "border-red-500/30 text-red-200" : "border-amber-500/30 text-amber-200"}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1 text-[9px]">
                      <span className="rounded-lg border border-white/10 bg-black/10 px-2 py-1 text-[var(--app-text-muted)]">Surface: {surfaceLabel}</span>
                      <span className="rounded-lg border border-white/10 bg-black/10 px-2 py-1 text-[var(--app-text-muted)]">Capability: {capabilityLabel}</span>
                      <span className="rounded-lg border border-white/10 bg-black/10 px-2 py-1 text-[var(--app-text-muted)]">{riskLabel}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1 text-[9px]">
                      <span className="rounded-lg border border-white/10 bg-black/10 px-2 py-1 text-[var(--app-text-muted)]">Navigation: {navigationRiskLabel}</span>
                      <span className="rounded-lg border border-white/10 bg-black/10 px-2 py-1 text-[var(--app-text-muted)]">{credentialBoundaryLabel}</span>
                    </div>
                    <div className="mt-2 rounded-lg border border-white/10 bg-black/10 p-2">
                      <div className="text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">Safeguards checklist</div>
                      <div className="mt-1 flex flex-wrap gap-1 text-[8px] font-black uppercase tracking-widest">
                        {safeguards.map((safeguard) => (
                          <span
                            key={safeguard.key}
                            className={`rounded-full border px-2 py-0.5 ${safeguard.required ? "border-amber-500/30 text-amber-200" : "border-white/10 text-[var(--app-text-muted)] opacity-60"}`}
                          >
                            {safeguard.required ? "✓ " : "○ "}{safeguard.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    {request.blockedBy && request.blockedBy.length > 0 && (
                      <p className="mt-2 text-[9px] leading-relaxed text-red-200">Blocked by: {request.blockedBy.join(", ")}</p>
                    )}
                    <p className="mt-2 text-[9px] leading-relaxed text-[var(--app-text-muted)]">{futureReadiness}</p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">Next action: {nextAction}</p>
                    <p className="mt-1 text-[9px] italic leading-relaxed text-[var(--app-text-muted)] opacity-80">{getSandboxedBrowserNoLaunchText()}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(request.status === "dry_run_only" || request.status === "waiting_user") && (
                        <Button onClick={() => { sandboxedBrowserService.createDryRunSessionFromRequest(request.browserRequestId); refresh(); }}>Create dry-run browser permission session</Button>
                      )}
                      {request.status !== "blocked" && <Button tone="danger" onClick={() => { sandboxedBrowserService.blockBrowserRequest(request.browserRequestId, "Blocked from Activity panel."); refresh(); }}>block</Button>}
                      {request.status !== "blocked" && <Button onClick={() => { sandboxedBrowserService.revokeBrowserRequest(request.browserRequestId, "Revoked from Activity panel."); refresh(); }}>revoke</Button>}
                      <Button onClick={() => { sandboxedBrowserService.archiveBrowserRequest(request.browserRequestId); refresh(); }}>archive</Button>
                    </div>
                  </div>
                );
              })}
              {data.browserSessions.filter((session) => session.status !== "archived").slice(0, 3).map((session) => (
                <div key={session.browserSessionId} className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">{getSandboxedBrowserStatusLabel(session.status)}</div>
                      <p className="mt-1 text-[9px] leading-relaxed text-[var(--app-text-muted)]">{getSandboxedBrowserSummary(session)}</p>
                      {session.requestId && <p className="mt-1 text-[8px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-70">Linked request: {session.requestId}</p>}
                    </div>
                    <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">No launch · no automation</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1 text-[9px]">
                    <span className="rounded-lg border border-white/10 bg-black/10 px-2 py-1 text-[var(--app-text-muted)]">Surface: {getSandboxedBrowserSurfaceLabel(session.surface)}</span>
                    <span className="rounded-lg border border-white/10 bg-black/10 px-2 py-1 text-[var(--app-text-muted)]">Capability: {getSandboxedBrowserCapabilityLabel(session.capability)}</span>
                    <span className="rounded-lg border border-white/10 bg-black/10 px-2 py-1 text-[var(--app-text-muted)]">Navigation: {getSandboxedBrowserNavigationRiskLabel(session.navigationRisk)}</span>
                  </div>
                  <p className="mt-2 text-[9px] leading-relaxed text-[var(--app-text-muted)]">Dry-run browser permission session only. No browser is launched, automated, read, or controlled.</p>
                  {session.status !== "revoked" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button onClick={() => { sandboxedBrowserService.revokeBrowserSession(session.browserSessionId, "Revoked from Activity panel."); refresh(); }}>revoke session</Button>
                      <Button onClick={() => { sandboxedBrowserService.archiveBrowserSession(session.browserSessionId); refresh(); }}>archive session</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })()}
      </RightPanelSection>

      <RightPanelSection title="Browser shell sessions" subtitle="Approved safe URL only, after approval + Run once. Luca cannot automate the page, read the DOM, handle credentials, or download/upload.">
        {(() => {
          const shellSessions = data.browserShellSessions.slice(0, 6);
          if (shellSessions.length === 0) return <div className="text-[10px] italic text-[var(--app-text-muted)]">No browser shell sessions.</div>;
          return (
            <div className="space-y-2">
              {shellSessions.map((session) => {
                const isOpen = session.status === "open" || session.status === "open_requested" || session.status === "proposed";
                return (
                  <div key={session.shellSessionId} className={`rounded-xl border p-3 ${session.status === "blocked" ? "border-red-500/20 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">{session.title}</div>
                        <p className="mt-1 truncate font-mono text-[10px] text-[var(--app-text-muted)]">{session.auditUrl || "(no audit URL)"}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${session.status === "blocked" ? "border-red-500/30 text-red-200" : "border-amber-500/30 text-amber-200"}`}>
                        {session.status}
                      </span>
                    </div>
                    {session.blockedBy && session.blockedBy.length > 0 && (
                      <p className="mt-2 text-[9px] leading-relaxed text-red-200">Blocked by: {session.blockedBy.join(", ")}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1 text-[8px] font-black uppercase tracking-widest">
                      {typeof session.metadata?.adapter === "string" && (
                        <span className="rounded-full border border-cyan-500/30 bg-cyan-500/5 px-2 py-0.5 text-cyan-200">
                          {session.metadata.adapter === "luca_browser_webview" ? "Luca Browser" : "Iframe fallback"}
                        </span>
                      )}
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[var(--app-text-muted)]">No automation</span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[var(--app-text-muted)]">No DOM read</span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[var(--app-text-muted)]">No credentials</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[8px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-70">
                      <span>requested {session.createdAt.slice(0, 16).replace("T", " ")}</span>
                      {session.closedAt && <span>closed {session.closedAt.slice(0, 16).replace("T", " ")}</span>}
                      {session.revokedAt && <span>revoked {session.revokedAt.slice(0, 16).replace("T", " ")}</span>}
                    </div>
                    {isOpen && session.status !== "blocked" && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button onClick={() => { sandboxedBrowserShellService.closeShellSession(session.shellSessionId); refresh(); }}>close shell</Button>
                        <Button tone="danger" onClick={() => { sandboxedBrowserShellService.revokeShellSession(session.shellSessionId, "Revoked from Activity panel."); refresh(); }}>revoke shell</Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
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

      <RightPanelSection title="Skill requests" subtitle="Skill approval is state-only. No skill installs, enables, updates, removes, or runs in this state.">
        {(() => {
          const active = data.skillRequests.filter((request) => request.status !== "expired");
          if (active.length === 0) return <div className="text-[10px] italic text-[var(--app-text-muted)]">No skill requests.</div>;
          return active.slice(0, 6).map((request) => {
            const approved = request.status === "approved_waiting_install" || request.status === "approved_waiting_execution";
            const pending = request.status === "proposed" || request.status === "approval_required";
            const statusTone = getSkillRequestTone(request.status);
            const riskTone = getSkillRiskTone(request.riskLevel);
            const hasSafetyFlags = (request.blockedBy?.length ?? 0) > 0;
            return (
              <div key={request.skillRequestId} className={`mb-2 rounded-xl border p-2 ${getSkillToneBorder(statusTone)} ${getSkillToneBg(statusTone)}`}>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className={`font-bold ${getSkillToneColor(statusTone)}`}>{getSkillRequestLabel(request.status)}</span>
                  <span className="font-bold text-[var(--app-text-main)]">· {request.skillName}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[9px] font-bold uppercase tracking-widest">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[var(--app-text-muted)]">{getSkillRequestTypeLabel(request.requestType)}</span>
                  <span className={`rounded-full border px-2 py-0.5 ${getSkillToneBorder(riskTone)} ${getSkillToneColor(riskTone)}`}>{getSkillRiskLabel(request.riskLevel)}</span>
                  <span className="rounded-full border border-sky-500/20 bg-sky-500/5 px-2 py-0.5 text-sky-200">State-only</span>
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{request.description}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {request.requestedCapabilities.length === 0 ? (
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] text-[var(--app-text-muted)]">No capabilities requested</span>
                  ) : request.requestedCapabilities.map((capability) => (
                    <span key={capability} className="rounded-full border border-white/10 bg-black/10 px-2 py-0.5 text-[9px] text-[var(--app-text-muted)]">
                      {getSkillCapabilityLabel(capability)}
                    </span>
                  ))}
                </div>
                {hasSafetyFlags && <p className="mt-1 text-[9px] uppercase tracking-widest text-red-300">Blocked reason: {request.blockedBy?.map(getSkillCapabilityLabel).join(", ")}</p>}
                <p className="mt-1 text-[9px] text-[var(--app-text-muted)]">{getSkillRequestNextAction(request.status, request.requestType)}</p>
                <p className="mt-0.5 text-[9px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-70">{getSkillRequestNoExecutionText()}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {pending && !hasSafetyFlags && <Button tone="good" onClick={() => { skillGovernanceService.approveSkillRequest(request.skillRequestId); refresh(); }}>approve request</Button>}
                  {pending && <Button tone="danger" onClick={() => { skillGovernanceService.rejectSkillRequest(request.skillRequestId); refresh(); }}>reject</Button>}
                  {pending && hasSafetyFlags && <Button onClick={() => { skillGovernanceService.blockSkillRequest(request.skillRequestId, "Request includes risky capabilities."); refresh(); }}>block</Button>}
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
          const visible = data.plans.filter((p) => p.status !== "archived" && p.status !== "rejected");
          if (visible.length === 0) {
            return <div className="text-[10px] italic text-[var(--app-text-muted)]">No runtime plans.</div>;
          }
          return (
            <div className="space-y-2">
              {visible.map((plan) => {
                const tone = getPlanContinuityTone(plan.status);
                const currentStep = plan.currentStepId ? plan.steps.find((s) => s.stepId === plan.currentStepId) : undefined;
                return (
                  <div key={plan.planId} className={`rounded-xl border p-2 ${getContinuityToneBorder(tone)} ${getContinuityToneBg(tone)}`}>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className={`font-bold ${getContinuityToneColor(tone)}`}>{getPlanContinuityLabel(plan.status)}</span>
                      <span className="font-bold text-[var(--app-text-main)]">· {plan.title}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-[var(--app-text-muted)]">{plan.summary}</p>
                    <p className="mt-1 text-[9px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-70">
                      {plan.riskLevel} · {plan.steps.length} steps · {getContinuityNoExecutionText("plan")}
                    </p>
                    <p className="mt-0.5 text-[9px] text-[var(--app-text-muted)]">{getPlanNextAction(plan.status)}</p>
                    {currentStep && <p className="text-[9px] text-[var(--app-text-muted)]">Next safe step: {currentStep.title} · {currentStep.status}</p>}
                    {plan.blockedBy && plan.blockedBy.length > 0 && <p className="mt-1 text-[9px] text-red-300">Blocked: {plan.blockedBy.join(", ")}</p>}
                    {plan.updatedAt && <div className="text-[9px] text-[var(--app-text-muted)] opacity-70">{compactTimestamp(plan.updatedAt)}</div>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(plan.status === "proposed" || plan.status === "waiting_approval" || plan.status === "waiting_user") && (
                        <>
                          <Button tone="good" onClick={() => { runtimePlanService.activatePlan(plan.planId); refresh(); }}>activate plan</Button>
                          <Button onClick={() => { runtimePlanService.createArtifactsForPlan(plan.planId); refresh(); }}>Create governed items</Button>
                          <Button tone="danger" onClick={() => { runtimePlanService.rejectPlan(plan.planId); refresh(); }}>reject</Button>
                        </>
                      )}
                      {plan.status === "active" && (
                        <>
                          <Button onClick={() => { runtimePlanService.createArtifactsForPlan(plan.planId); refresh(); }}>Create governed items</Button>
                          <Button onClick={() => { runtimePlanService.completePlan(plan.planId); refresh(); }}>complete</Button>
                        </>
                      )}
                      <Button onClick={() => { runtimePlanService.archivePlan(plan.planId); refresh(); }}>archive</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </RightPanelSection>

      <RightPanelSection title="Planning checkpoints" subtitle="Checkpoints are state-only. Approving a checkpoint never runs tools or skills.">
        {(() => {
          const active = data.checkpoints.filter((c) => c.status !== "archived" && c.status !== "completed");
          if (active.length === 0) return <div className="text-[10px] italic text-[var(--app-text-muted)]">No planning checkpoints need attention.</div>;
          return active.slice(0, 5).map((checkpoint) => {
            const tone = getCheckpointContinuityTone(checkpoint.status);
            return (
              <div key={checkpoint.checkpointId} className={`mb-2 rounded-xl border p-2 ${getContinuityToneBorder(tone)} ${getContinuityToneBg(tone)}`}>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className={`font-bold ${getContinuityToneColor(tone)}`}>{getCheckpointContinuityLabel(checkpoint.status)}</span>
                  <span className="font-bold text-[var(--app-text-main)]">· {checkpoint.title}</span>
                </div>
                <p className="mt-1 text-[10px] text-[var(--app-text-muted)]">{checkpoint.summary}</p>
                <p className="mt-1 text-[9px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-70">
                  {getCheckpointNextAction(checkpoint.status)} · {getContinuityNoExecutionText("checkpoint")}
                </p>
                {checkpoint.proposedNextSteps.length > 0 && <p className="mt-1 text-[9px] text-[var(--app-text-muted)]">Next: {checkpoint.proposedNextSteps.slice(0, 3).join(" · ")}</p>}
                {checkpoint.blockedBy && checkpoint.blockedBy.length > 0 && <p className="mt-1 text-[9px] text-red-300">Blocked: {checkpoint.blockedBy.join(", ")}</p>}
                {checkpoint.updatedAt && <div className="text-[9px] text-[var(--app-text-muted)] opacity-70">{compactTimestamp(checkpoint.updatedAt)}</div>}
                {checkpoint.status === "proposed" && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button tone="good" onClick={() => { agentPlanningCheckpointService.approveCheckpoint(checkpoint.checkpointId); refresh(); }}>approve (no execution)</Button>
                    <Button tone="danger" onClick={() => { agentPlanningCheckpointService.rejectCheckpoint(checkpoint.checkpointId); refresh(); }}>reject</Button>
                  </div>
                )}
              </div>
            );
          });
        })()}
      </RightPanelSection>

      <RightPanelSection title="Reminders" subtitle="Safe reminders delivered by the dry-run continuity loop. No execution.">
        {data.reminders.length === 0 ? (
          <div className="text-[10px] italic text-[var(--app-text-muted)]">No reminder deliveries.</div>
        ) : data.reminders.slice(0, 5).map((reminder) => {
          const tone = getReminderDeliveryTone(reminder.status);
          return (
            <div key={reminder.deliveryId} className={`mb-2 rounded-xl border p-2 text-[10px] text-[var(--app-text-muted)] ${getContinuityToneBorder(tone)} ${getContinuityToneBg(tone)}`}>
              <div className="flex items-center gap-1.5">
                <span className={`font-bold ${getContinuityToneColor(tone)}`}>{getReminderDeliveryLabel(reminder.status)}</span>
                <span className="font-bold text-[var(--app-text-main)]">· {reminder.title}</span>
              </div>
              <div className="mt-1">{reminder.message}</div>
              <div className="mt-1 text-[9px] uppercase tracking-widest opacity-70">
                {getReminderNextAction(reminder.status)} · {getContinuityNoExecutionText("reminder")}
              </div>
              {reminder.dueAt && <div className="text-[9px] opacity-70">Due: {compactTimestamp(reminder.dueAt)}</div>}
            </div>
          );
        })}
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
        {(() => {
          const visible = data.sessions.filter((s) => s.userVisible && s.lifecycleState !== "archived");
          if (visible.length === 0) return <div className="text-[10px] italic text-[var(--app-text-muted)]">No sessions need attention.</div>;
          return visible.slice(0, 6).map((session) => {
            const tone = getSessionContinuityTone(session.lifecycleState);
            return (
              <div key={session.sessionId} className={`mb-2 rounded-xl border p-2 ${getContinuityToneBorder(tone)} ${getContinuityToneBg(tone)}`}>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className={`font-bold ${getContinuityToneColor(tone)}`}>{getSessionContinuityLabel(session.lifecycleState)}</span>
                  <span className="font-bold text-[var(--app-text-main)]">· {session.title}</span>
                </div>
                <p className="mt-1 text-[10px] text-[var(--app-text-muted)]">{session.lastUserIntentSummary}</p>
                <p className="mt-1 text-[9px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-70">
                  {getSessionNextAction(session.lifecycleState, session.safeToResume)} · {getContinuityNoExecutionText("session")}
                </p>
                {session.updatedAt && <div className="text-[9px] text-[var(--app-text-muted)] opacity-70">{compactTimestamp(session.updatedAt)}</div>}
                <div className="mt-2 flex gap-2">
                  <Button onClick={() => { agentSessionContinuityService.completeSession(session.sessionId); refresh(); }}>mark complete</Button>
                  <Button onClick={() => { agentSessionContinuityService.archiveSession(session.sessionId); refresh(); }}>archive</Button>
                </div>
              </div>
            );
          });
        })()}
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
              {eligible.map(({ request, canExec }) => {
                const isPanelAction = isSafeLocalPanelTarget(request.target);
                const panelLabel = isPanelAction ? getSafeLocalPanelLabel(request.target) : null;
                return (
                  <div key={request.requestId} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2">
                    <div className="text-[10px] font-bold text-emerald-200">
                      {isPanelAction ? `Ready to open ${panelLabel}` : `Approved — ready to run · ${request.title}`}
                    </div>
                    <p className="mt-1 text-[10px] text-[var(--app-text-muted)]">
                      {isPanelAction ? "This only changes local LucaOS UI." : request.description}
                    </p>
                    <p className="mt-1 text-[9px] uppercase tracking-widest text-emerald-300">{canExec.capability ?? "safe"} · {request.riskLevel ?? "low"}</p>
                    <div className="mt-2 flex gap-2">
                      <Button tone="good" onClick={() => { governedToolExecutionService.executeApprovedRequest(request.requestId); refresh(); }}>
                        {isPanelAction ? `Run once to open ${panelLabel}` : "Run once"}
                      </Button>
                      <Button tone="danger" onClick={() => { governedActionRequestService.blockRequest(request.requestId); refresh(); }}>block</Button>
                    </div>
                  </div>
                );
              })}
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
