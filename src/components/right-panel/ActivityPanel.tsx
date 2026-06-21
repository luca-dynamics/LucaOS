import React, { useMemo, useState } from "react";
import { lucaMaterialCardStyle, lucaMaterialMetricStyle } from "../../styles/lucaMaterialSystem";
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
import { lucaBrowserActionQueueService } from "../../services/runtime/LucaBrowserActionQueueService";
import { lucaBrowserActionExecutionService } from "../../services/runtime/LucaBrowserActionExecutionService";
import { isLucaBrowserSafeLifecycleExecutionKind } from "../../services/runtime/LucaBrowserActionPolicy";
import { visualCoreDisplaySessionService } from "../../services/runtime/VisualCoreDisplaySessionService";
import { getVisualCoreDisplayGovernanceBoundaryLabels } from "../../services/runtime/VisualCoreDisplayGovernance";
import { visualCoreRemoteCommandService } from "../../services/runtime/VisualCoreRemoteCommandService";
import { getVisualCoreRemoteCommandBoundaryLabels } from "../../services/runtime/VisualCoreRemoteCommandPolicy";
import { visualCoreModeTransitionService } from "../../services/runtime/VisualCoreModeTransitionService";
import { overlayManagerSessionService } from "../../services/runtime/OverlayManagerSessionService";
import { overlayApprovalResolutionService } from "../../services/runtime/OverlayApprovalResolutionService";
import { overlayCaptureActivationGateService } from "../../services/runtime/OverlayCaptureActivationGateService";
import { androidNativeOverlayForwardingGateService } from "../../services/runtime/AndroidNativeOverlayForwardingGateService";
import { originOverlayCriticalControlGateService } from "../../services/runtime/OriginOverlayCriticalControlGateService";
import { formatVisualCoreTraceLabel } from "../../services/runtime/visualCoreTraceCorrelation";
import {
  getOverlaySessionBoundaryLabels,
  getOverlaySessionPostureSummary,
  getOverlaySessionSafetyFlagSummary,
  getOverlaySessionSourceLabel,
  getOverlaySessionStatusLabel,
  isOverlaySessionBlocked,
} from "../runtime/overlayManagerSessionLabels";
import {
  getOverlayApprovalResolutionBoundaryLabels,
  getOverlayApprovalResolutionDecisionLabel,
  getOverlayApprovalResolutionSafetyFlagSummary,
  getOverlayApprovalResolutionSourceLabel,
  getOverlayApprovalResolutionStatusLabel,
  isOverlayApprovalResolutionBlocked,
} from "../runtime/overlayApprovalResolutionLabels";
import {
  getOverlayCaptureGateBoundaryLabels,
  getOverlayCaptureGateSafetyFlagSummary,
  getOverlayCaptureGateStatusLabel,
  getOverlayCaptureKindSummary,
  getOverlayCaptureSurfaceLabel,
  isOverlayCaptureGateBlocked,
} from "../runtime/overlayCaptureGateLabels";
import {
  getAndroidNativeOverlayForwardingBoundaryLabels,
  getAndroidNativeOverlayForwardingKindLabel,
  getAndroidNativeOverlayForwardingSafetyFlagSummary,
  getAndroidNativeOverlayForwardingSourceLabel,
  getAndroidNativeOverlayForwardingStatusLabel,
  isAndroidNativeOverlayForwardingBlocked,
} from "../runtime/androidNativeOverlayForwardingLabels";
import {
  getOriginOverlayCriticalControlApprovalTypeLabel,
  getOriginOverlayCriticalControlBoundaryLabels,
  getOriginOverlayCriticalControlCapabilitySummary,
  getOriginOverlayCriticalControlIdLabel,
  getOriginOverlayCriticalControlKindLabel,
  getOriginOverlayCriticalControlRiskLabel,
  getOriginOverlayCriticalControlSafetyFlagSummary,
  getOriginOverlayCriticalControlSourceComponent,
  getOriginOverlayCriticalControlStatusLabel,
  isOriginOverlayCriticalControlBlocked,
} from "../runtime/originOverlayCriticalControlLabels";
import {
  getVisualCoreModeTransitionBoundaryLabels,
  getVisualCoreModeTransitionSafetyFlagSummary,
  getVisualCoreModeTransitionSourceLabel,
  getVisualCoreModeTransitionStatusLabel,
  isVisualCoreModeTransitionBlocked,
} from "../runtime/visualCoreModeTransitionLabels";
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
  getLucaBrowserActionKindLabel,
  getLucaBrowserActionStatusLabel,
  getLucaBrowserActionRiskLabel,
  getLucaBrowserActionNextAction,
  getLucaBrowserActionNoExecutionText,
} from "../runtime/lucaBrowserActionLabels";
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
      tone === "danger" ? "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] text-[var(--luca-danger,#f87171)] hover:bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]" :
      tone === "good" ? "border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] text-[var(--luca-success,#4fbf7a)] hover:bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)]" :
      "border-white/10 bg-white/5 text-[var(--app-text-muted)] hover:text-[var(--app-text-main)]"
    }`}
  >
    {children}
  </button>
);

const getSkillToneColor = (tone: SkillGovernanceTone): string => {
  switch (tone) {
    case "good": return "text-[var(--luca-success,#4fbf7a)]";
    case "warn": return "text-[var(--luca-warning,#f2b23e)]";
    case "danger": return "text-[var(--luca-danger,#f87171)]";
    case "info": return "text-[var(--luca-info,#4f8cff)]";
    case "neutral": return "text-[var(--app-text-muted)]";
  }
};

const getSkillToneBorder = (tone: SkillGovernanceTone): string => {
  switch (tone) {
    case "good": return "border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)]";
    case "warn": return "border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)]";
    case "danger": return "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)]";
    case "info": return "border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)]";
    case "neutral": return "border-white/10";
  }
};

const getSkillToneBg = (tone: SkillGovernanceTone): string => {
  switch (tone) {
    case "good": return "bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)]";
    case "warn": return "bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]";
    case "danger": return "bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]";
    case "info": return "bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)]";
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
      browserShellNavigations: sandboxedBrowserShellService.listNavigationRecords(),
      browserShellObservations: sandboxedBrowserShellService.listObservationSnapshots(),
      browserShellActions: lucaBrowserActionQueueService.listActionRequests(),
      visualDisplaySessions: visualCoreDisplaySessionService.listDisplaySessions(),
      visualRemoteCommands: visualCoreRemoteCommandService.listRemoteCommandRecords(),
      visualModeTransitions: visualCoreModeTransitionService.listTransitionRecords(),
      overlaySessions: overlayManagerSessionService.listOverlaySessions(),
      overlayApprovalResolutions: overlayApprovalResolutionService.listRecords(),
      overlayCaptureGateRecords: overlayCaptureActivationGateService.listRecords(),
      androidNativeOverlayForwardingRecords: androidNativeOverlayForwardingGateService.listRecords(),
      originOverlayCriticalControlRecords: originOverlayCriticalControlGateService.listRecords(),
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
      <div className="rounded-2xl border p-4" style={lucaMaterialCardStyle}>
        <div className="flex items-start gap-3">
          <div className="rounded-xl border p-2" style={{ ...lucaMaterialMetricStyle, color: theme.hex }}>
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
                    <p className="mt-1 text-[9px] uppercase tracking-widest text-[var(--luca-warning,#f2b23e)]">{request.riskLevel} · state-only approval</p>
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

      <RightPanelSection title="Android native overlay forwarding" subtitle="Read-only native forwarding-gate records from PR #155. Visibility only — no approve/forward/start-voice/stop-voice/request-permission controls and no native overlay behavior changes.">
        {data.androidNativeOverlayForwardingRecords.length === 0 ? (
          <div className="text-[10px] italic text-[var(--app-text-muted)]">No Android native overlay forwarding records.</div>
        ) : (
          <div className="space-y-2">
            {[...data.androidNativeOverlayForwardingRecords]
              .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
              .slice(0, 8)
              .map((record) => {
                const blocked = isAndroidNativeOverlayForwardingBlocked(record.status);
                return (
                  <div key={record.nativeOverlayForwardingId} className={`rounded-xl border p-2 ${blocked ? "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]" : "border-white/10 bg-black/10"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-[var(--app-text-main)]">{getAndroidNativeOverlayForwardingSourceLabel(record.source)} · {getAndroidNativeOverlayForwardingStatusLabel(record.status)}</div>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{record.userSafeReason}</p>
                        <p className="mt-1 text-[9px] text-[var(--app-text-muted)] opacity-80">{record.recommendedFutureApprovalCopy}</p>
                      </div>
                      <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-[var(--luca-danger,#f87171)]">blocked</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)] opacity-80">
                      <span>id: {record.nativeOverlayForwardingId}</span>
                      <span>surface: {record.surfaceId}</span>
                      <span>source: {record.source}</span>
                      <span>kind: {getAndroidNativeOverlayForwardingKindLabel(record.kind)}</span>
                      <span>status: {record.status}</span>
                      <span>allowed: {String(record.allowed)}</span>
                      <span>time: {compactTimestamp(record.timestamp)}</span>
                    </div>
                    <p className="mt-1 text-[9px] text-[var(--luca-danger,#f87171)]">Blocked by: {record.blockedBy.join(", ")}</p>
                    <div className="mt-2 flex flex-wrap gap-1 text-[8px] font-black uppercase tracking-widest">
                      {getAndroidNativeOverlayForwardingBoundaryLabels().map((label) => (
                        <span key={label} className="rounded-full border border-white/10 px-2 py-0.5 text-[var(--app-text-muted)]">{label}</span>
                      ))}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[8px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-60">
                      {getAndroidNativeOverlayForwardingSafetyFlagSummary(record).map((flag) => (
                        <span key={flag}>{flag}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </RightPanelSection>

      <RightPanelSection title="Origin critical controls" subtitle="Read-only Origin critical-control gate records from PR #157. Visibility only — no approve/execute/grant-root/override-lockdown/control-device/run-skill controls and no OriginOverlayPanels behavior changes.">
        {data.originOverlayCriticalControlRecords.length === 0 ? (
          <div className="text-[10px] italic text-[var(--app-text-muted)]">No Origin critical-control records.</div>
        ) : (
          <div className="space-y-2">
            {[...data.originOverlayCriticalControlRecords]
              .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
              .slice(0, 8)
              .map((record) => {
                const blocked = isOriginOverlayCriticalControlBlocked(record.status);
                return (
                  <div key={record.originOverlayControlGateRecordId} className={`rounded-xl border p-2 ${blocked ? "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]" : "border-white/10 bg-black/10"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-[var(--app-text-main)]">{getOriginOverlayCriticalControlIdLabel(record.controlId)} · {getOriginOverlayCriticalControlStatusLabel(record.status)}</div>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{record.userSafeReason}</p>
                        <p className="mt-1 text-[9px] text-[var(--app-text-muted)] opacity-80">{record.recommendedFutureApprovalCopy}</p>
                      </div>
                      <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-[var(--luca-danger,#f87171)]">blocked</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)] opacity-80">
                      <span>id: {record.originOverlayControlGateRecordId}</span>
                      <span>control: {record.controlId}</span>
                      <span>kind: {getOriginOverlayCriticalControlKindLabel(record.controlKind)}</span>
                      <span>risk: {getOriginOverlayCriticalControlRiskLabel(record.riskLevel)}</span>
                      <span>status: {record.status}</span>
                      <span>allowed: {String(record.allowed)}</span>
                      <span>source: {getOriginOverlayCriticalControlSourceComponent(record.controlId)}</span>
                      <span>approval: {getOriginOverlayCriticalControlApprovalTypeLabel(record.requiredFutureApprovalType)}</span>
                      <span>time: {compactTimestamp(record.timestamp)}</span>
                    </div>
                    <p className="mt-1 text-[9px] text-[var(--luca-danger,#f87171)]">Blocked by: {record.blockedBy.join(", ")}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-[8px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-70">
                      {getOriginOverlayCriticalControlCapabilitySummary(record.controlId).map((chip) => (
                        <span key={chip}>{chip}</span>
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1 text-[8px] font-black uppercase tracking-widest">
                      {getOriginOverlayCriticalControlBoundaryLabels().map((label) => (
                        <span key={label} className="rounded-full border border-white/10 px-2 py-0.5 text-[var(--app-text-muted)]">{label}</span>
                      ))}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[8px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-60">
                      {getOriginOverlayCriticalControlSafetyFlagSummary(record).map((flag) => (
                        <span key={flag}>{flag}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </RightPanelSection>

      <RightPanelSection title="Overlay capture gate" subtitle="Read-only capture activation-gate records from PR #153. Visibility only — no approve/start/stop/capture/request-permission controls and no capture behavior changes.">
        {data.overlayCaptureGateRecords.length === 0 ? (
          <div className="text-[10px] italic text-[var(--app-text-muted)]">No overlay capture gate records.</div>
        ) : (
          <div className="space-y-2">
            {[...data.overlayCaptureGateRecords]
              .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
              .slice(0, 8)
              .map((record) => {
                const blocked = isOverlayCaptureGateBlocked(record.status);
                return (
                  <div key={record.captureGateRecordId} className={`rounded-xl border p-2 ${blocked ? "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]" : "border-white/10 bg-black/10"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-[var(--app-text-main)]">{getOverlayCaptureSurfaceLabel(record.surfaceId)} · {getOverlayCaptureGateStatusLabel(record.status)}</div>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{record.userSafeReason}</p>
                        <p className="mt-1 text-[9px] text-[var(--app-text-muted)] opacity-80">{record.recommendedFutureApprovalCopy}</p>
                      </div>
                      <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-[var(--luca-danger,#f87171)]">{record.riskLevel}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)] opacity-80">
                      <span>id: {record.captureGateRecordId}</span>
                      <span>surface: {record.surfaceId}</span>
                      <span>component: {record.sourceComponent}</span>
                      <span>captures: {getOverlayCaptureKindSummary(record.captures)}</span>
                      <span>status: {record.status}</span>
                      <span>allowed: {String(record.allowed)}</span>
                      <span>visualcore bypass: {String(record.canBypassVisualCoreGovernance)}</span>
                      <span>tools: {String(record.canInvokeTools)}</span>
                      <span>explicit gate: {String(record.needsExplicitActivationGate)}</span>
                      <span>time: {compactTimestamp(record.timestamp)}</span>
                    </div>
                    <p className="mt-1 text-[9px] text-[var(--luca-danger,#f87171)]">Blocked by: {record.blockedBy.join(", ")}</p>
                    <div className="mt-2 flex flex-wrap gap-1 text-[8px] font-black uppercase tracking-widest">
                      {getOverlayCaptureGateBoundaryLabels().map((label) => (
                        <span key={label} className="rounded-full border border-white/10 px-2 py-0.5 text-[var(--app-text-muted)]">{label}</span>
                      ))}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[8px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-60">
                      {getOverlayCaptureGateSafetyFlagSummary(record).map((flag) => (
                        <span key={flag}>{flag}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </RightPanelSection>

      <RightPanelSection title="Overlay approval resolutions" subtitle="Read-only audit records for governed VoiceHud/SecurityGate approval resolution (PR #151). Visibility only — no approve/deny/run/execute controls and no behavior changes.">
        {data.overlayApprovalResolutions.length === 0 ? (
          <div className="text-[10px] italic text-[var(--app-text-muted)]">No overlay approval resolutions.</div>
        ) : (
          <div className="space-y-2">
            {[...data.overlayApprovalResolutions]
              .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
              .slice(0, 8)
              .map((record) => {
                const blocked = isOverlayApprovalResolutionBlocked(record.status);
                return (
                  <div key={record.approvalResolutionId} className={`rounded-xl border p-2 ${blocked ? "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]" : record.status === "resolved" ? "border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)]" : "border-white/10 bg-black/10"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-[var(--app-text-main)]">{getOverlayApprovalResolutionStatusLabel(record.status)}</div>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{record.userSafeReason}</p>
                      </div>
                      <span className={`shrink-0 text-[9px] font-black uppercase tracking-widest ${blocked ? "text-[var(--luca-danger,#f87171)]" : "text-[var(--app-text-muted)]"}`}>{getOverlayApprovalResolutionSourceLabel(record.source)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)] opacity-80">
                      <span>id: {record.approvalResolutionId}</span>
                      <span>source: {getOverlayApprovalResolutionSourceLabel(record.source)}</span>
                      <span>decision: {getOverlayApprovalResolutionDecisionLabel(record.decision)}</span>
                      <span>status: {record.status}</span>
                      <span>time: {compactTimestamp(record.timestamp)}</span>
                    </div>
                    {record.blockedBy && record.blockedBy.length > 0 && (
                      <p className="mt-1 text-[9px] text-[var(--luca-danger,#f87171)]">Blocked by: {record.blockedBy.join(", ")}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1 text-[8px] font-black uppercase tracking-widest">
                      {getOverlayApprovalResolutionBoundaryLabels().map((label) => (
                        <span key={label} className="rounded-full border border-white/10 px-2 py-0.5 text-[var(--app-text-muted)]">{label}</span>
                      ))}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[8px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-60">
                      {getOverlayApprovalResolutionSafetyFlagSummary(record).map((flag) => (
                        <span key={flag}>{flag}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
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
                  <div key={request.gatewayRequestId} className={`rounded-xl border p-3 ${request.status === "blocked" ? "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]" : "border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">{request.title}</div>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{permissionSummary}</p>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{request.policyDecision.userSafeReason}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${request.status === "blocked" ? "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] text-[var(--luca-danger,#f87171)]" : "border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] text-[var(--luca-warning,#f2b23e)]"}`}>
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
                            className={`rounded-full border px-2 py-0.5 ${safeguard.required ? "border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] text-[var(--luca-warning,#f2b23e)]" : "border-white/10 text-[var(--app-text-muted)] opacity-60"}`}
                          >
                            {safeguard.required ? "✓ " : "○ "}{safeguard.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    {request.blockedBy && request.blockedBy.length > 0 && (
                      <p className="mt-2 text-[9px] leading-relaxed text-[var(--luca-danger,#f87171)]">Blocked by: {request.blockedBy.join(", ")}</p>
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
                  <div key={request.observationRequestId} className={`rounded-xl border p-3 ${request.status === "blocked" ? "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]" : "border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">{request.title}</div>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{summary}</p>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{request.policyDecision.userSafeReason}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${request.status === "blocked" ? "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] text-[var(--luca-danger,#f87171)]" : "border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] text-[var(--luca-warning,#f2b23e)]"}`}>
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
                            className={`rounded-full border px-2 py-0.5 ${safeguard.required ? "border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] text-[var(--luca-warning,#f2b23e)]" : "border-white/10 text-[var(--app-text-muted)] opacity-60"}`}
                          >
                            {safeguard.required ? "✓ " : "○ "}{safeguard.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    {request.blockedBy && request.blockedBy.length > 0 && (
                      <p className="mt-2 text-[9px] leading-relaxed text-[var(--luca-danger,#f87171)]">Blocked by: {request.blockedBy.join(", ")}</p>
                    )}
                    <div className="mt-2 rounded-lg border border-white/10 bg-black/10 p-2">
                      <div className="text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">Lifecycle</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-[8px] font-black uppercase tracking-widest">
                        {getObservationRequestTimeline(request).map((step, index) => (
                          <React.Fragment key={step.key}>
                            {index > 0 && <span className="text-[var(--app-text-muted)] opacity-40">→</span>}
                            <span className={`rounded-full border px-2 py-0.5 ${step.state === "current" ? "border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] text-[var(--luca-warning,#f2b23e)]" : "border-white/10 text-[var(--app-text-muted)]"}`}>
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
                <div key={session.observationSessionId} className="rounded-xl border border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)] p-3">
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
                        <span className={`rounded-full border px-2 py-0.5 ${step.state === "current" ? "border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] text-[var(--luca-info,#4f8cff)]" : "border-white/10 text-[var(--app-text-muted)]"}`}>
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
                  <div key={request.browserRequestId} className={`rounded-xl border p-3 ${request.status === "blocked" ? "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]" : "border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">{request.title}</div>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{summary}</p>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{request.policyDecision.userSafeReason}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${request.status === "blocked" ? "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] text-[var(--luca-danger,#f87171)]" : "border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] text-[var(--luca-warning,#f2b23e)]"}`}>
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
                            className={`rounded-full border px-2 py-0.5 ${safeguard.required ? "border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] text-[var(--luca-warning,#f2b23e)]" : "border-white/10 text-[var(--app-text-muted)] opacity-60"}`}
                          >
                            {safeguard.required ? "✓ " : "○ "}{safeguard.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    {request.blockedBy && request.blockedBy.length > 0 && (
                      <p className="mt-2 text-[9px] leading-relaxed text-[var(--luca-danger,#f87171)]">Blocked by: {request.blockedBy.join(", ")}</p>
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
                <div key={session.browserSessionId} className="rounded-xl border border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)] p-3">
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

      <RightPanelSection title="Browser shell sessions" subtitle="Approved safe URL only, after approval + Run once. Luca audits governed navigation and observes session metadata only — it cannot automate the page, read the DOM/page content, take screenshots, run OCR/vision, handle credentials, or download/upload.">
        {(() => {
          const shellSessions = data.browserShellSessions.slice(0, 6);
          if (shellSessions.length === 0) return <div className="text-[10px] italic text-[var(--app-text-muted)]">No browser shell sessions.</div>;
          const isActiveStatus = (s: string) => s === "open" || s === "open_requested" || s === "proposed" || s === "navigating" || s === "navigation_blocked";
          return (
            <div className="space-y-2">
              {shellSessions.map((session) => {
                const navs = data.browserShellNavigations.filter((nav) => nav.shellSessionId === session.shellSessionId);
                const blockedNavs = navs.filter((nav) => nav.status === "blocked");
                const lastNav = navs[0];
                const observation = data.browserShellObservations.find((obs) => obs.shellSessionId === session.shellSessionId);
                const isActive = isActiveStatus(session.status);
                const isPaused = session.status === "paused";
                return (
                  <div key={session.shellSessionId} className={`rounded-xl border p-3 ${session.status === "blocked" || session.status === "navigation_blocked" ? "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]" : "border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">{session.title}</div>
                        <p className="mt-1 truncate font-mono text-[10px] text-[var(--app-text-muted)]">{session.auditUrl || "(no audit URL)"}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${session.status === "blocked" || session.status === "navigation_blocked" ? "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] text-[var(--luca-danger,#f87171)]" : "border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] text-[var(--luca-warning,#f2b23e)]"}`}>
                        {session.status}
                      </span>
                    </div>
                    {session.blockedBy && session.blockedBy.length > 0 && (
                      <p className="mt-2 text-[9px] leading-relaxed text-[var(--luca-danger,#f87171)]">Blocked by: {session.blockedBy.join(", ")}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1 text-[8px] font-black uppercase tracking-widest">
                      {typeof session.metadata?.adapter === "string" && (
                        <span className="rounded-full border border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)] px-2 py-0.5 text-[var(--luca-info,#4f8cff)]">
                          {session.metadata.adapter === "luca_browser_webview" ? "Luca Browser" : "Iframe fallback"}
                        </span>
                      )}
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[var(--app-text-muted)]">Nav events {navs.length}</span>
                      {blockedNavs.length > 0 && (
                        <span className="rounded-full border border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] px-2 py-0.5 text-[var(--luca-danger,#f87171)]">Blocked nav {blockedNavs.length}</span>
                      )}
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[var(--app-text-muted)]">No automation</span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[var(--app-text-muted)]">No DOM read</span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[var(--app-text-muted)]">No credentials</span>
                    </div>
                    {lastNav && (
                      <p className="mt-2 truncate font-mono text-[9px] text-[var(--app-text-muted)] opacity-80">last nav: {lastNav.toAuditUrl}</p>
                    )}
                    {observation && (
                      <div className="mt-2 rounded-lg border border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)] p-2">
                        <div className="flex flex-wrap items-center gap-1 text-[8px] font-black uppercase tracking-widest">
                          <span className="rounded-full border border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] px-2 py-0.5 text-[var(--luca-info,#4f8cff)]">obs: {observation.status}</span>
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[var(--app-text-muted)]">{observation.isLoading ? "loading" : "idle"}</span>
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[var(--app-text-muted)]">back {observation.canGoBack ? "yes" : "no"}</span>
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[var(--app-text-muted)]">fwd {observation.canGoForward ? "yes" : "no"}</span>
                        </div>
                        {observation.currentAuditUrl && (
                          <p className="mt-1 truncate font-mono text-[9px] text-[var(--app-text-muted)] opacity-80">current: {observation.currentAuditUrl}</p>
                        )}
                        {observation.lastBlockedAuditUrl && (
                          <p className="mt-1 truncate font-mono text-[9px] text-[var(--luca-danger,#f87171)]">last blocked: {observation.lastBlockedAuditUrl}{observation.lastBlockedReason ? ` — ${observation.lastBlockedReason}` : ""}</p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-1 text-[8px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-70">
                          <span>no page content</span>
                          <span>no screenshot</span>
                          <span>no OCR</span>
                          <span>no vision</span>
                        </div>
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2 text-[8px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-70">
                      <span>requested {session.createdAt.slice(0, 16).replace("T", " ")}</span>
                      {session.closedAt && <span>closed {session.closedAt.slice(0, 16).replace("T", " ")}</span>}
                      {session.revokedAt && <span>revoked {session.revokedAt.slice(0, 16).replace("T", " ")}</span>}
                    </div>
                    {isActive && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {isPaused ? (
                          <Button onClick={() => { sandboxedBrowserShellService.resumeShellSession(session.shellSessionId); refresh(); }}>resume</Button>
                        ) : (
                          <Button onClick={() => { sandboxedBrowserShellService.pauseShellSession(session.shellSessionId, "Paused from Activity panel."); refresh(); }}>pause</Button>
                        )}
                        <Button onClick={() => { sandboxedBrowserShellService.closeShellSession(session.shellSessionId); refresh(); }}>close shell</Button>
                        <Button tone="danger" onClick={() => { sandboxedBrowserShellService.revokeShellSession(session.shellSessionId, "Revoked from Activity panel."); refresh(); }}>revoke shell</Button>
                      </div>
                    )}
                    {isPaused && !isActive && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button onClick={() => { sandboxedBrowserShellService.resumeShellSession(session.shellSessionId); refresh(); }}>resume</Button>
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

      <RightPanelSection title="LucaBrowser action queue" subtitle="Proposed governed browser actions, queued for human review only. Execution is disabled — Luca cannot click, type, scroll, submit, read the DOM, screenshot, OCR, or automate the page. Confirming only records intent for a future, separately-gated execution PR.">
        {(() => {
          const actions = data.browserShellActions.slice(0, 8);
          if (actions.length === 0) return <div className="text-[10px] italic text-[var(--app-text-muted)]">No LucaBrowser action requests.</div>;
          return (
            <div className="space-y-2">
              {actions.map((action) => {
                const isBlocked = action.status === "blocked";
                const isWaiting = action.status === "waiting_user_confirmation";
                const isConfirmed = action.status === "confirmed_for_future_execution";
                return (
                  <div key={action.actionRequestId} className={`rounded-xl border p-3 ${isBlocked ? "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]" : isConfirmed ? "border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)]" : "border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)]"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">{getLucaBrowserActionKindLabel(action.kind)}</div>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{action.summary}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1 text-[8px] font-black uppercase tracking-widest">
                        <span className={isBlocked ? "text-[var(--luca-danger,#f87171)]" : isConfirmed ? "text-[var(--luca-success,#4fbf7a)]" : "text-[var(--luca-warning,#f2b23e)]"}>{getLucaBrowserActionStatusLabel(action.status)}</span>
                        <span className="text-[var(--app-text-muted)]">{getLucaBrowserActionRiskLabel(action.riskLevel)}</span>
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[8px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-70">
                      <span>session {action.shellSessionId.slice(-6)}</span>
                      {action.targetDescriptor && <span>target: {action.targetDescriptor}</span>}
                      {action.typedTextPreview && <span>text: “{action.typedTextPreview}”</span>}
                    </div>
                    {action.blockedBy && action.blockedBy.length > 0 && (
                      <p className="mt-1 text-[9px] text-[var(--luca-danger,#f87171)]">Blocked by: {action.blockedBy.join(", ")}</p>
                    )}
                    <p className="mt-1 text-[9px] italic text-[var(--app-text-muted)] opacity-80">{getLucaBrowserActionNextAction(action)}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)] opacity-70">
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5">No execution</span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5">No DOM read</span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5">No screenshot/OCR</span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5">No credentials</span>
                    </div>
                    <p className="mt-1 text-[9px] italic text-[var(--app-text-muted)] opacity-70">{getLucaBrowserActionNoExecutionText()}</p>
                    {(isWaiting || isConfirmed) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {isWaiting && action.policyDecision.allowedForFutureHumanConfirmedExecution && (
                          <Button tone="good" onClick={() => { lucaBrowserActionQueueService.confirmActionRequestForFutureExecution(action.actionRequestId); refresh(); }}>confirm for future execution</Button>
                        )}
                        {isConfirmed && isLucaBrowserSafeLifecycleExecutionKind(action.kind) && (
                          <Button tone="good" onClick={() => { lucaBrowserActionExecutionService.executeConfirmedSafeLifecycleAction(action.actionRequestId); refresh(); }}>execute safe control</Button>
                        )}
                        <Button tone="danger" onClick={() => { lucaBrowserActionQueueService.revokeActionRequest(action.actionRequestId, "Revoked from Activity panel."); refresh(); }}>revoke</Button>
                        <Button onClick={() => { lucaBrowserActionQueueService.archiveActionRequest(action.actionRequestId); refresh(); }}>archive</Button>
                      </div>
                    )}
                    {isBlocked && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button onClick={() => { lucaBrowserActionQueueService.archiveActionRequest(action.actionRequestId); refresh(); }}>archive</Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </RightPanelSection>

      <RightPanelSection title="VisualCore display sessions" subtitle="Governed display-only records for low-risk VisualCore modes. Actions update records only — they do not open/close VisualCore. Sensitive modes stay blocked.">
        {data.visualDisplaySessions.length === 0 ? (
          <div className="text-[10px] italic text-[var(--app-text-muted)]">No VisualCore display sessions.</div>
        ) : (
          <div className="space-y-2">
            {[...data.visualDisplaySessions]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 8)
              .map((session) => {
                const blocked = session.status === "blocked";
                const active = session.status === "open" || session.status === "open_requested";
                const closedOrGone = session.status === "closed" || session.status === "revoked";
                return (
                  <div key={session.visualSessionId} className={`rounded-xl border p-2 ${blocked || session.status === "revoked" ? "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]" : session.status === "open" ? "border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)]" : "border-white/10 bg-black/10"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-[var(--app-text-main)]">{session.mode} · {session.status}</div>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{session.userSafeReason}</p>
                      </div>
                      <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">{session.riskLevel}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)] opacity-80">
                      <span>readiness: {session.readiness}</span>
                      <span>source: {session.source}</span>
                      <span>opened: {compactTimestamp(session.openedAt)}</span>
                      <span>updated: {compactTimestamp(session.updatedAt)}</span>
                      {session.correlationId && <span>{formatVisualCoreTraceLabel(session.correlationId)}</span>}
                    </div>
                    {session.blockedBy && session.blockedBy.length > 0 && (
                      <p className="mt-1 text-[9px] text-[var(--luca-danger,#f87171)]">Blocked by: {session.blockedBy.join(", ")}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1 text-[8px] font-black uppercase tracking-widest">
                      {getVisualCoreDisplayGovernanceBoundaryLabels().map((label) => (
                        <span key={label} className="rounded-full border border-white/10 px-2 py-0.5 text-[var(--app-text-muted)]">{label}</span>
                      ))}
                    </div>
                    {!blocked && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {active && <Button onClick={() => { visualCoreDisplaySessionService.pauseDisplaySession(session.visualSessionId, "Paused from Activity panel."); refresh(); }}>pause</Button>}
                        {session.status === "paused" && <Button tone="good" onClick={() => { visualCoreDisplaySessionService.resumeDisplaySession(session.visualSessionId); refresh(); }}>resume</Button>}
                        {!closedOrGone && <Button onClick={() => { visualCoreDisplaySessionService.closeDisplaySession(session.visualSessionId); refresh(); }}>close</Button>}
                        {session.status !== "revoked" && <Button tone="danger" onClick={() => { visualCoreDisplaySessionService.revokeDisplaySession(session.visualSessionId, "Revoked from Activity panel."); refresh(); }}>revoke</Button>}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </RightPanelSection>

      <RightPanelSection title="OverlayManager sessions" subtitle="Record-only session records for low-risk display-only overlays (PR #149). Visibility only — no open/close/approve/run controls. Sensitive/ineligible overlays render as blocked. Does not change OverlayManager behavior.">
        {data.overlaySessions.length === 0 ? (
          <div className="text-[10px] italic text-[var(--app-text-muted)]">No OverlayManager sessions.</div>
        ) : (
          <div className="space-y-2">
            {[...data.overlaySessions]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 8)
              .map((session) => {
                const blocked = isOverlaySessionBlocked(session.status);
                return (
                  <div key={session.overlaySessionId} className={`rounded-xl border p-2 ${blocked ? "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]" : session.status === "open" ? "border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)]" : "border-white/10 bg-black/10"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-[var(--app-text-main)]">{session.label} · {getOverlaySessionStatusLabel(session.status)}</div>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{session.userSafeReason}</p>
                      </div>
                      <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">{session.riskLevel}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)] opacity-80">
                      <span>surface: {session.overlaySurfaceId}</span>
                      <span>source: {getOverlaySessionSourceLabel(session.source)}</span>
                      <span>postures: {getOverlaySessionPostureSummary(session)}</span>
                      <span>opened: {compactTimestamp(session.openedAt)}</span>
                      <span>updated: {compactTimestamp(session.updatedAt)}</span>
                      {session.closedAt && <span>closed: {compactTimestamp(session.closedAt)}</span>}
                    </div>
                    {session.blockedBy && session.blockedBy.length > 0 && (
                      <p className="mt-1 text-[9px] text-[var(--luca-danger,#f87171)]">Blocked by: {session.blockedBy.join(", ")}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1 text-[8px] font-black uppercase tracking-widest">
                      {getOverlaySessionBoundaryLabels().map((label) => (
                        <span key={label} className="rounded-full border border-white/10 px-2 py-0.5 text-[var(--app-text-muted)]">{label}</span>
                      ))}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[8px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-60">
                      {getOverlaySessionSafetyFlagSummary(session).map((flag) => (
                        <span key={flag}>{flag}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </RightPanelSection>

      <RightPanelSection title="VisualCore remote commands" subtitle="Remote commands are audited before they can drive VisualCore. Browser navigation and sensitive commands require dedicated governance. No execute/run — records only.">
        {data.visualRemoteCommands.length === 0 ? (
          <div className="text-[10px] italic text-[var(--app-text-muted)]">No VisualCore remote commands.</div>
        ) : (
          <div className="space-y-2">
            {[...data.visualRemoteCommands]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 8)
              .map((command) => {
                const blocked = command.status === "blocked";
                const needsApproval = command.status === "needs_approval";
                return (
                  <div key={command.commandRecordId} className={`rounded-xl border p-2 ${blocked ? "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]" : needsApproval ? "border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]" : command.status === "allowed_record_only" ? "border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)]" : "border-white/10 bg-black/10"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-[var(--app-text-main)]">{command.kind} · {command.status}</div>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{command.userSafeReason}</p>
                      </div>
                      <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">{command.riskLevel}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)] opacity-80">
                      <span>source: {command.source}</span>
                      {command.targetMode && <span>target: {command.targetMode}</span>}
                      <span>updated: {compactTimestamp(command.updatedAt)}</span>
                      {command.correlationId && <span>{formatVisualCoreTraceLabel(command.correlationId)}</span>}
                    </div>
                    {command.targetAuditUrl && (
                      <p className="mt-1 truncate text-[9px] text-[var(--app-text-muted)]">audit url: {command.targetAuditUrl}</p>
                    )}
                    {command.blockedBy && command.blockedBy.length > 0 && (
                      <p className="mt-1 text-[9px] text-[var(--luca-danger,#f87171)]">Blocked by: {command.blockedBy.join(", ")}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1 text-[8px] font-black uppercase tracking-widest">
                      {getVisualCoreRemoteCommandBoundaryLabels().map((label) => (
                        <span key={label} className="rounded-full border border-white/10 px-2 py-0.5 text-[var(--app-text-muted)]">{label}</span>
                      ))}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[8px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-60">
                      <span>execution changed: false</span>
                      <span>browser governed: {command.browserGoverned ? "true" : "false"}</span>
                      <span>capture: false</span>
                      <span>automation: false</span>
                      <span>external action: false</span>
                      <span>file: false</span>
                      <span>messaging: false</span>
                      <span>wireless: false</span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </RightPanelSection>

      <RightPanelSection title="VisualCore mode transitions" subtitle="Audit records for VisualCore mode switches. Blocked transitions stay blocked — records only, no approve/run/execute. This is visibility only and does not change transition policy or VisualCore behavior.">
        {data.visualModeTransitions.length === 0 ? (
          <div className="text-[10px] italic text-[var(--app-text-muted)]">No VisualCore mode transitions.</div>
        ) : (
          <div className="space-y-2">
            {[...data.visualModeTransitions]
              .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
              .slice(0, 8)
              .map((transition) => {
                const blocked = isVisualCoreModeTransitionBlocked(transition.status);
                const browserGoverned = transition.status === "allowed_governed_browser";
                const warn = transition.status === "blocked_browser_no_session";
                return (
                  <div key={transition.transitionId} className={`rounded-xl border p-2 ${warn ? "border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]" : blocked ? "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]" : browserGoverned ? "border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)]" : "border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)]"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-[var(--app-text-main)]">{transition.fromMode} → {transition.toMode}</div>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{transition.userSafeReason}</p>
                      </div>
                      <span className={`shrink-0 text-[9px] font-black uppercase tracking-widest ${blocked ? "text-[var(--luca-danger,#f87171)]" : "text-[var(--app-text-muted)]"}`}>{getVisualCoreModeTransitionStatusLabel(transition.status)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)] opacity-80">
                      <span>source: {getVisualCoreModeTransitionSourceLabel(transition.source)}</span>
                      <span>updated: {compactTimestamp(transition.timestamp)}</span>
                      {transition.correlationId && <span>{formatVisualCoreTraceLabel(transition.correlationId)}</span>}
                      {transition.browserShellSessionId && <span>shell: {transition.browserShellSessionId.slice(-6)}</span>}
                    </div>
                    {transition.blockedBy && transition.blockedBy.length > 0 && (
                      <p className="mt-1 text-[9px] text-[var(--luca-danger,#f87171)]">Blocked by: {transition.blockedBy.join(", ")}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1 text-[8px] font-black uppercase tracking-widest">
                      {getVisualCoreModeTransitionBoundaryLabels().map((label) => (
                        <span key={label} className="rounded-full border border-white/10 px-2 py-0.5 text-[var(--app-text-muted)]">{label}</span>
                      ))}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[8px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-60">
                      {getVisualCoreModeTransitionSafetyFlagSummary(transition).map((flag) => (
                        <span key={flag}>{flag}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
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
                  <p className="mt-1 text-[9px] uppercase tracking-widest text-[var(--luca-warning,#f2b23e)]">{proposal.kind} · {proposal.riskLevel} · approving does not write</p>
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
                  <div key={proposal.proposalId} className={`rounded-xl border p-2 ${canWrite.allowed ? "border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)]" : "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]"}`}>
                    <div className={`text-[10px] font-bold ${canWrite.allowed ? "text-[var(--luca-success,#4fbf7a)]" : "text-[var(--luca-danger,#f87171)]"}`}>{canWrite.allowed ? "Approved — ready to save" : "Blocked for safety"} · {proposal.title}</div>
                    <p className="mt-1 text-[10px] text-[var(--app-text-muted)]">{canWrite.allowed ? proposal.summary : canWrite.reason}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {canWrite.allowed ? (
                        <Button tone="good" onClick={() => { void governedMemoryWriteService.writeApprovedProposal(proposal.proposalId).then(refresh); }}>Save memory once</Button>
                      ) : (
                        <span className="text-[9px] uppercase tracking-widest text-[var(--luca-danger,#f87171)]">{canWrite.blockedBy.join(", ") || "cannot write"}</span>
                      )}
                      <Button tone="danger" onClick={() => { memoryProposalService.revokeProposal(proposal.proposalId); refresh(); }}>revoke</Button>
                    </div>
                  </div>
                );
              })}
              {written.map((proposal) => (
                <div key={proposal.proposalId} className="rounded-xl border border-white/10 bg-black/10 p-2">
                  <div className="text-[10px] font-bold text-[var(--app-text-main)]">Memory saved · {proposal.title}</div>
                  <p className="mt-1 text-[9px] uppercase tracking-widest text-[var(--luca-success,#4fbf7a)]">written with provenance</p>
                </div>
              ))}
              {rejectedOrBlocked.map((proposal) => (
                <div key={proposal.proposalId} className="rounded-xl border border-white/10 bg-black/10 p-2">
                  <div className="text-[10px] font-bold text-[var(--app-text-main)]">{proposal.status === "blocked" ? "Blocked for safety" : "Rejected"} · {proposal.title}</div>
                  {proposal.blockedBy && proposal.blockedBy.length > 0 && <p className="mt-1 text-[9px] uppercase tracking-widest text-[var(--luca-danger,#f87171)]">{proposal.blockedBy.join(", ")}</p>}
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
                  <span className="rounded-full border border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)] px-2 py-0.5 text-[var(--luca-info,#4f8cff)]">State-only</span>
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
                {hasSafetyFlags && <p className="mt-1 text-[9px] uppercase tracking-widest text-[var(--luca-danger,#f87171)]">Blocked reason: {request.blockedBy?.map(getSkillCapabilityLabel).join(", ")}</p>}
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
                    {plan.blockedBy && plan.blockedBy.length > 0 && <p className="mt-1 text-[9px] text-[var(--luca-danger,#f87171)]">Blocked: {plan.blockedBy.join(", ")}</p>}
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
                {checkpoint.blockedBy && checkpoint.blockedBy.length > 0 && <p className="mt-1 text-[9px] text-[var(--luca-danger,#f87171)]">Blocked: {checkpoint.blockedBy.join(", ")}</p>}
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
                  <div key={request.requestId} className="rounded-xl border border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] p-2">
                    <div className="text-[10px] font-bold text-[var(--luca-success,#4fbf7a)]">
                      {isPanelAction ? `Ready to open ${panelLabel}` : `Approved — ready to run · ${request.title}`}
                    </div>
                    <p className="mt-1 text-[10px] text-[var(--app-text-muted)]">
                      {isPanelAction ? "This only changes local LucaOS UI." : request.description}
                    </p>
                    <p className="mt-1 text-[9px] uppercase tracking-widest text-[var(--luca-success,#4fbf7a)]">{canExec.capability ?? "safe"} · {request.riskLevel ?? "low"}</p>
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
                <div key={request.requestId} className="rounded-xl border border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] p-2">
                  <div className="text-[10px] font-bold text-[var(--luca-danger,#f87171)]">Blocked for safety · {request.title}</div>
                  <p className="mt-1 text-[10px] text-[var(--app-text-muted)]">{canExec.reason}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-widest text-[var(--luca-danger,#f87171)]">approved but cannot execute</p>
                </div>
              ))}
              {ineligible.slice(0, 4).map(({ request, canExec }) => (
                <div key={request.requestId} className="rounded-xl border border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)] p-2">
                  <div className="text-[10px] font-bold text-[var(--luca-warning,#f2b23e)]">Approval only — execution bridge unavailable · {request.title}</div>
                  <p className="mt-1 text-[10px] text-[var(--app-text-muted)]">{canExec.reason}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-widest text-[var(--luca-warning,#f2b23e)]">This action needs a future secure bridge</p>
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
                  <p className="mt-1 text-[9px] uppercase tracking-widest text-[var(--luca-success,#4fbf7a)]">succeeded · {execution.capability}</p>
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
            <p className="mt-1 text-[9px] uppercase tracking-widest text-[var(--luca-warning,#f2b23e)]">{request.kind} · {request.status} · dry-run request</p>
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
            {job.blockedBy.length > 0 && <div className="mt-1 text-[var(--luca-danger,#f87171)]">Blocked for safety: {job.blockedBy.join(", ")}</div>}
          </div>
        ))}
      </RightPanelSection>
    </div>
  );
};

export default ActivityPanel;
