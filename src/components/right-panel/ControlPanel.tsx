import React, { useEffect, useMemo, useState } from "react";
import type { CalendarEvent, Goal, Task } from "../../types";
import type { RuntimeDiagnostics } from "../../services/runtime/RuntimeDiagnosticsService";
import { runtimeDiagnosticsService } from "../../services/runtime/RuntimeDiagnosticsService";
import { agentSessionContinuityService } from "../../services/runtime/AgentSessionContinuityService";
import { reminderDeliveryService } from "../../services/scheduler/ReminderDeliveryService";
import { approvalRequestCenterService } from "../../services/provenance/ApprovalRequestCenterService";
import { runtimeContinuityLoopService } from "../../services/runtime/RuntimeContinuityLoopService";
import { agentPlanningCheckpointService } from "../../services/runtime/AgentPlanningCheckpointService";
import { runtimePlanService } from "../../services/runtime/RuntimePlanService";
import { intentRoutingService } from "../../services/runtime/IntentRoutingService";
import { intentRoutingModeService } from "../../services/runtime/IntentRoutingModeService";
import { skillRegistryService } from "../../services/skills/SkillRegistryService";
import { skillGovernanceService } from "../../services/skills/SkillGovernanceService";
import { browserDesktopGatewayService } from "../../services/runtime/BrowserDesktopGatewayService";
import { screenObservationService } from "../../services/runtime/ScreenObservationService";
import { sandboxedBrowserService } from "../../services/runtime/SandboxedBrowserService";
import { sandboxedBrowserShellService } from "../../services/runtime/SandboxedBrowserShellService";
import { lucaBrowserActionQueueService } from "../../services/runtime/LucaBrowserActionQueueService";
import { lucaBrowserActionExecutionService } from "../../services/runtime/LucaBrowserActionExecutionService";
import { visualCoreDisplaySessionService } from "../../services/runtime/VisualCoreDisplaySessionService";
import { overlayManagerSessionService } from "../../services/runtime/OverlayManagerSessionService";
import { overlayApprovalResolutionService } from "../../services/runtime/OverlayApprovalResolutionService";
import { overlayCaptureActivationGateService } from "../../services/runtime/OverlayCaptureActivationGateService";
import { visualCoreRemoteCommandService } from "../../services/runtime/VisualCoreRemoteCommandService";
import { visualCoreModeTransitionService } from "../../services/runtime/VisualCoreModeTransitionService";
import { ROUTING_MODE_SHORT_LABELS } from "../../types/intentRouting";
import type { LucaIntentRoute } from "../../types/intentRouting";
import { getRouteLabel, getRouteTone, getRouteToneColor, getRouteNextAction, getRouteNoExecutionText } from "../runtime/intentRoutingLabels";
import {
  getSessionContinuityLabel, getSessionContinuityTone, getSessionNextAction,
  getPlanContinuityLabel, getPlanContinuityTone, getPlanNextAction,
  getCheckpointContinuityLabel, getCheckpointContinuityTone, getCheckpointNextAction,
  getContinuityToneColor, getContinuitySummaryLine, compactTimestamp,
} from "../runtime/continuityLabels";
import { getSkillSummaryLine } from "../runtime/skillGovernanceLabels";
import { getGatewayNoExecutionText } from "../runtime/gatewayPermissionLabels";
import { getScreenObservationNoCaptureText } from "../runtime/screenObservationLabels";
import { getSandboxedBrowserNoLaunchText } from "../runtime/sandboxedBrowserLabels";
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
  const skillRegistry = skillRegistryService.getDiagnosticsSummary();
  const skillGovernance = skillGovernanceService.getDiagnosticsSummary();
  const gateway = browserDesktopGatewayService.getDiagnosticsSummary();
  const screenObservation = screenObservationService.getDiagnosticsSummary();
  const sandboxedBrowser = sandboxedBrowserService.getDiagnosticsSummary();
  const browserShell = sandboxedBrowserShellService.getDiagnosticsSummary();
  const browserActions = lucaBrowserActionQueueService.getDiagnosticsSummary();
  const browserActionExecution = lucaBrowserActionExecutionService.getDiagnosticsSummary();
  const visualDisplaySessions = visualCoreDisplaySessionService.getDiagnosticsSummary();
  const overlaySessions = overlayManagerSessionService.getDiagnosticsSummary();
  const overlayApprovalResolutions = overlayApprovalResolutionService.getDiagnosticsSummary();
  const overlayCaptureGate = overlayCaptureActivationGateService.getDiagnosticsSummary();
  const visualRemoteCommands = visualCoreRemoteCommandService.getDiagnosticsSummary();
  const visualModeTransitions = visualCoreModeTransitionService.getDiagnosticsSummary();
  const loopStatus = runtimeContinuityLoopService.getLoopStatus();
  const checkpoints = agentPlanningCheckpointService.listCheckpoints();
  const activeCheckpoint = checkpoints.find((checkpoint) => checkpoint.status === "proposed" || checkpoint.status === "approved");
  const activePlan = runtimePlanService.getActivePlan() ?? runtimePlanService.listPlans().find((p) => p.status === "proposed" || p.status === "waiting_approval");
  const planDiag = runtimePlanService.getDiagnosticsSummary();
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

      <RightPanelSection title="Overlay capture gate" subtitle="Capture-surface policy/stub diagnostics only. No capture starts/stops, permission requests, or OverlayManager behavior changes.">
        <div className="grid grid-cols-2 gap-2">
          <RightPanelMetric label="Mapped" value={formatCount("surface", overlayCaptureGate.surfaces.length)} tone="warn" />
          <RightPanelMetric label="Attempts" value={formatCount("attempt", overlayCaptureGate.totalRecords)} tone={overlayCaptureGate.totalRecords > 0 ? "danger" : "neutral"} />
          <RightPanelMetric label="Stub only" value="true" tone="good" />
          <RightPanelMetric label="Capture started" value="false" tone="neutral" />
          <RightPanelMetric label="Permission" value="false" tone="neutral" />
          <RightPanelMetric label="Tool execution" value="false" tone="neutral" />
        </div>
      </RightPanelSection>

      <RightPanelSection title="Gateway research" subtitle="Browser/Desktop/Device policy only. No control is enabled.">
        <div className="grid grid-cols-2 gap-2">
          <RightPanelMetric label="Gateway requests" value={formatCount("request", gateway.totalRequests)} />
          <RightPanelMetric label="Dry-run only" value={formatCount("request", gateway.dryRunRequests)} tone={gateway.dryRunRequests > 0 ? "warn" : "neutral"} />
          <RightPanelMetric label="Blocked" value={formatCount("request", gateway.blockedRequests)} tone={gateway.blockedRequests > 0 ? "danger" : "neutral"} />
          <RightPanelMetric label="High risk" value={formatCount("request", gateway.highRiskRequests)} tone={gateway.highRiskRequests > 0 ? "warn" : "neutral"} />
          <RightPanelMetric label="Critical risk" value={formatCount("request", gateway.criticalRiskRequests)} tone={gateway.criticalRiskRequests > 0 ? "danger" : "neutral"} />
          <RightPanelMetric label="Execution enabled" value="false" tone="neutral" />
        </div>
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-red-200">Gateway research mode</span>
            <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">Control disabled</span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">
            Gateway control is disabled. Luca can only record blocked/dry-run requests while the permission model is being designed.
          </p>
          <p className="mt-1 text-[9px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-80">
            Future permissions not yet enabled
          </p>
          <div className="mt-2 flex flex-wrap gap-1 text-[8px] font-black uppercase tracking-widest">
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[var(--app-text-muted)]">Approval</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[var(--app-text-muted)]">Sandbox</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[var(--app-text-muted)]">Human confirmation</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[var(--app-text-muted)]">Credential boundary</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[var(--app-text-muted)]">Audit log</span>
          </div>
          <p className="mt-2 text-[9px] italic leading-relaxed text-[var(--app-text-muted)] opacity-80">{getGatewayNoExecutionText()}</p>
        </div>
      </RightPanelSection>

      <RightPanelSection title="VisualCore display governance" subtitle="Records low-risk display sessions only. Sensitive modes remain blocked.">
        <div className="grid grid-cols-2 gap-2">
          <RightPanelMetric label="Display sessions" value={formatCount("session", visualDisplaySessions.totalSessions)} />
          <RightPanelMetric label="Open" value={formatCount("session", visualDisplaySessions.openSessions)} tone={visualDisplaySessions.openSessions > 0 ? "good" : "neutral"} />
          <RightPanelMetric label="Paused" value={formatCount("session", visualDisplaySessions.pausedSessions)} tone={visualDisplaySessions.pausedSessions > 0 ? "warn" : "neutral"} />
          <RightPanelMetric label="Closed" value={formatCount("session", visualDisplaySessions.closedSessions)} tone="neutral" />
          <RightPanelMetric label="Revoked" value={formatCount("session", visualDisplaySessions.revokedSessions)} tone="neutral" />
          <RightPanelMetric label="Blocked" value={formatCount("session", visualDisplaySessions.blockedSessions)} tone={visualDisplaySessions.blockedSessions > 0 ? "danger" : "neutral"} />
          <RightPanelMetric label="Ready display modes" value={visualDisplaySessions.readyDisplayModeCount} tone="neutral" />
          <RightPanelMetric label="Sensitive modes" value={visualDisplaySessions.sensitiveModeCount} tone={visualDisplaySessions.sensitiveModeCount > 0 ? "warn" : "neutral"} />
          <RightPanelMetric label="Governance applied" value="true" tone="good" />
          <RightPanelMetric label="Capture enabled" value="false" tone="neutral" />
          <RightPanelMetric label="Automation enabled" value="false" tone="neutral" />
          <RightPanelMetric label="External action" value="false" tone="neutral" />
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-[var(--app-text-muted)]">
          VisualCore governance currently records low-risk display sessions only. Sensitive modes remain blocked until dedicated policy.
        </p>
      </RightPanelSection>

      <RightPanelSection title="OverlayManager session records" subtitle="Records low-risk display-only overlays only. Sensitive overlays remain blocked. No behavior changed.">
        <div className="grid grid-cols-2 gap-2">
          <RightPanelMetric label="Overlay sessions" value={formatCount("session", overlaySessions.totalSessions)} />
          <RightPanelMetric label="Open" value={formatCount("session", overlaySessions.openSessions)} tone={overlaySessions.openSessions > 0 ? "good" : "neutral"} />
          <RightPanelMetric label="Closed" value={formatCount("session", overlaySessions.closedSessions)} tone="neutral" />
          <RightPanelMetric label="Blocked/ignored" value={formatCount("session", overlaySessions.blockedSessions)} tone={overlaySessions.blockedSessions > 0 ? "danger" : "neutral"} />
          <RightPanelMetric label="Eligible surfaces" value={overlaySessions.eligibleSurfaceCount} tone="neutral" />
          <RightPanelMetric label="Sensitive surfaces" value={overlaySessions.sensitiveSurfaceCount} tone={overlaySessions.sensitiveSurfaceCount > 0 ? "warn" : "neutral"} />
          <RightPanelMetric label="Governance applied" value="true" tone="good" />
          <RightPanelMetric label="Record only" value="true" tone="good" />
          <RightPanelMetric label="Execution changed" value="false" tone="neutral" />
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-[var(--app-text-muted)]">
          Record-only overlay session governance for low-risk display-only surfaces. Sensitive overlays are recorded as blocked and remain ungoverned until dedicated policy.
        </p>
      </RightPanelSection>

      <RightPanelSection title="VisualCore remote commands" subtitle="Remote commands are audited first. Browser navigation uses governed LucaBrowser adapter. Sensitive commands require dedicated governance.">
        <div className="grid grid-cols-2 gap-2">
          <RightPanelMetric label="Total commands" value={formatCount("command", visualRemoteCommands.totalCommands)} />
          <RightPanelMetric label="Allowed record-only" value={formatCount("command", visualRemoteCommands.allowedRecordOnlyCommands)} tone={visualRemoteCommands.allowedRecordOnlyCommands > 0 ? "good" : "neutral"} />
          <RightPanelMetric label="Blocked" value={formatCount("command", visualRemoteCommands.blockedCommands)} tone={visualRemoteCommands.blockedCommands > 0 ? "danger" : "neutral"} />
          <RightPanelMetric label="Needs approval" value={formatCount("command", visualRemoteCommands.needsApprovalCommands)} tone={visualRemoteCommands.needsApprovalCommands > 0 ? "warn" : "neutral"} />
          <RightPanelMetric label="Ignored" value={formatCount("command", visualRemoteCommands.ignoredCommands)} tone="neutral" />
          <RightPanelMetric label="Browser navigate" value={formatCount("request", visualRemoteCommands.browserNavigateCommands)} tone={visualRemoteCommands.browserNavigateCommands > 0 ? "good" : "neutral"} />
          <RightPanelMetric label="Governance applied" value="true" tone="good" />
          <RightPanelMetric label="Execution changed" value="false" tone="neutral" />
          <RightPanelMetric label="Browser governance available" value="true" tone="good" />
          <RightPanelMetric label="Browser governed commands" value={formatCount("request", visualRemoteCommands.browserGovernedCommandCount)} tone={visualRemoteCommands.browserGovernedCommandSeen ? "good" : "neutral"} />
          <RightPanelMetric label="Capture enabled" value="false" tone="neutral" />
          <RightPanelMetric label="Automation enabled" value="false" tone="neutral" />
          <RightPanelMetric label="External action" value="false" tone="neutral" />
          <RightPanelMetric label="File access" value="false" tone="neutral" />
          <RightPanelMetric label="Messaging" value="false" tone="neutral" />
          <RightPanelMetric label="Wireless" value="false" tone="neutral" />
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-[var(--app-text-muted)]">
          VisualCore remote commands are audited first. Browser navigation is governed via the LucaBrowser adapter (PR #143). Sensitive commands still require dedicated governance before execution.
        </p>
      </RightPanelSection>

      <RightPanelSection title="VisualCore mode transitions" subtitle="Mode switching is centralized and audited via the governed transition guard (PR #145).">
        <div className="grid grid-cols-2 gap-2">
          <RightPanelMetric label="Total transitions" value={formatCount("transition", visualModeTransitions.totalTransitions)} />
          <RightPanelMetric label="Allowed" value={formatCount("transition", visualModeTransitions.allowedTransitions)} tone={visualModeTransitions.allowedTransitions > 0 ? "good" : "neutral"} />
          <RightPanelMetric label="Governed browser" value={formatCount("transition", visualModeTransitions.allowedGovernedBrowserTransitions)} tone={visualModeTransitions.allowedGovernedBrowserTransitions > 0 ? "good" : "neutral"} />
          <RightPanelMetric label="Blocked sensitive" value={formatCount("transition", visualModeTransitions.blockedSensitiveTransitions)} tone={visualModeTransitions.blockedSensitiveTransitions > 0 ? "danger" : "neutral"} />
          <RightPanelMetric label="Blocked unknown" value={formatCount("transition", visualModeTransitions.blockedUnknownTransitions)} tone={visualModeTransitions.blockedUnknownTransitions > 0 ? "danger" : "neutral"} />
          <RightPanelMetric label="Governance applied" value="true" tone="good" />
          <RightPanelMetric label="Transition only" value="true" tone="good" />
          <RightPanelMetric label="Execution changed" value="false" tone="neutral" />
        </div>
      </RightPanelSection>

      <RightPanelSection title="Screen observation" subtitle="Permission-mode only. Luca cannot capture, view, OCR, or analyze the screen.">
        <div className="grid grid-cols-2 gap-2">
          <RightPanelMetric label="Observation requests" value={formatCount("request", screenObservation.totalRequests)} />
          <RightPanelMetric label="Consent required" value={formatCount("request", screenObservation.consentRequiredRequests)} tone={screenObservation.consentRequiredRequests > 0 ? "warn" : "neutral"} />
          <RightPanelMetric label="Dry-run requests" value={formatCount("request", screenObservation.dryRunRequests)} tone={screenObservation.dryRunRequests > 0 ? "warn" : "neutral"} />
          <RightPanelMetric label="Blocked" value={formatCount("request", screenObservation.blockedRequests)} tone={screenObservation.blockedRequests > 0 ? "danger" : "neutral"} />
          <RightPanelMetric label="Dry-run sessions" value={formatCount("session", screenObservation.dryRunSessions)} tone={screenObservation.dryRunSessions > 0 ? "warn" : "neutral"} />
          <RightPanelMetric label="Revoked sessions" value={formatCount("session", screenObservation.revokedSessions)} tone="neutral" />
          <RightPanelMetric label="Capture enabled" value="false" tone="neutral" />
          <RightPanelMetric label="Vision model enabled" value="false" tone="neutral" />
        </div>
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-red-200">Screen observation permission mode</span>
            <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">Capture disabled</span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">
            Screen observation is permission-mode only. Luca cannot capture, view, OCR, store, or analyze your screen.
          </p>
          <div className="mt-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)] opacity-70">Future-readiness checklist — required before any observation</div>
          <div className="mt-1 flex flex-wrap gap-1 text-[8px] font-black uppercase tracking-widest">
            {["Explicit consent required", "Visible indicator required", "Region boundary required", "Sensitive-content filter required", "Credential boundary required", "Human confirmation required", "Audit log required", "Revocable"].map((item) => (
              <span key={item} className="rounded-full border border-amber-500/30 px-2 py-0.5 text-amber-200">✓ {item}</span>
            ))}
          </div>
          <p className="mt-2 text-[9px] italic leading-relaxed text-[var(--app-text-muted)] opacity-80">{getScreenObservationNoCaptureText()}</p>
        </div>
      </RightPanelSection>

      <RightPanelSection title="Sandboxed browser" subtitle="Research-mode only. Luca cannot launch, read, click, type, submit, scrape, download, upload, or automate a browser.">
        <div className="grid grid-cols-2 gap-2">
          <RightPanelMetric label="Browser requests" value={formatCount("request", sandboxedBrowser.totalRequests)} />
          <RightPanelMetric label="Dry-run requests" value={formatCount("request", sandboxedBrowser.dryRunRequests)} tone={sandboxedBrowser.dryRunRequests > 0 ? "warn" : "neutral"} />
          <RightPanelMetric label="Blocked" value={formatCount("request", sandboxedBrowser.blockedRequests)} tone={sandboxedBrowser.blockedRequests > 0 ? "danger" : "neutral"} />
          <RightPanelMetric label="Waiting user" value={formatCount("request", sandboxedBrowser.waitingUserRequests)} tone={sandboxedBrowser.waitingUserRequests > 0 ? "warn" : "neutral"} />
          <RightPanelMetric label="Dry-run sessions" value={formatCount("session", sandboxedBrowser.dryRunSessions)} tone={sandboxedBrowser.dryRunSessions > 0 ? "warn" : "neutral"} />
          <RightPanelMetric label="Revoked sessions" value={formatCount("session", sandboxedBrowser.revokedSessions)} tone="neutral" />
          <RightPanelMetric label="Launch enabled" value="false" tone="neutral" />
          <RightPanelMetric label="Automation enabled" value="false" tone="neutral" />
          <RightPanelMetric label="DOM read enabled" value="false" tone="neutral" />
          <RightPanelMetric label="Network request enabled" value="false" tone="neutral" />
        </div>
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-red-200">Sandboxed browser research mode</span>
            <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">Launch disabled</span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">
            Sandboxed browser is research-mode only. Luca cannot launch, read, click, type, submit, scrape, download, upload, or automate a browser.
          </p>
          <div className="mt-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)] opacity-70">Future-readiness checklist — required before any browser control</div>
          <div className="mt-1 flex flex-wrap gap-1 text-[8px] font-black uppercase tracking-widest">
            {["Explicit approval", "Visible browser boundary", "Sandbox", "Human confirmation", "Credential boundary", "Audit log", "Downloads/uploads blocked", "Wallet/payment blocked", "Revocable"].map((item) => (
              <span key={item} className="rounded-full border border-amber-500/30 px-2 py-0.5 text-amber-200">✓ {item}</span>
            ))}
          </div>
          <p className="mt-2 text-[9px] italic leading-relaxed text-[var(--app-text-muted)] opacity-80">{getSandboxedBrowserNoLaunchText()}</p>
        </div>
      </RightPanelSection>

      <RightPanelSection title="Browser shell" subtitle="Approved safe URL only. Luca audits governed navigation and observes session metadata only — it cannot automate the page, read the DOM/page content, screenshot, OCR, handle credentials, or download/upload.">
        <div className="grid grid-cols-2 gap-2">
          <RightPanelMetric label="Shell sessions" value={formatCount("session", browserShell.totalSessions)} />
          <RightPanelMetric label="Open sessions" value={formatCount("session", browserShell.openSessions + browserShell.openRequestedSessions + browserShell.navigatingSessions)} tone={browserShell.openSessions + browserShell.openRequestedSessions + browserShell.navigatingSessions > 0 ? "warn" : "neutral"} />
          <RightPanelMetric label="Paused sessions" value={formatCount("session", browserShell.pausedSessions)} tone={browserShell.pausedSessions > 0 ? "warn" : "neutral"} />
          <RightPanelMetric label="Closed/revoked" value={formatCount("session", browserShell.closedSessions + browserShell.revokedSessions)} tone="neutral" />
          <RightPanelMetric label="Navigation events" value={formatCount("event", browserShell.navigationEvents)} tone="neutral" />
          <RightPanelMetric label="Blocked navigations" value={formatCount("attempt", browserShell.blockedNavigations + browserShell.blockedSessions)} tone={browserShell.blockedNavigations + browserShell.blockedSessions > 0 ? "danger" : "neutral"} />
          <RightPanelMetric label="Observation snapshots" value={formatCount("snapshot", browserShell.observationSnapshots)} tone="neutral" />
          <RightPanelMetric label="Active observations" value={formatCount("snapshot", browserShell.activeObservationSnapshots)} tone={browserShell.activeObservationSnapshots > 0 ? "warn" : "neutral"} />
          <RightPanelMetric label="Stale observations" value={formatCount("snapshot", browserShell.staleObservationSnapshots)} tone="neutral" />
          <RightPanelMetric label="Launch mode" value="approved safe URL only" tone="neutral" />
          <RightPanelMetric label="Navigation governance" value="enabled" tone="neutral" />
          <RightPanelMetric label="Observation metadata" value="enabled" tone="neutral" />
          <RightPanelMetric label="Automation enabled" value="false" tone="neutral" />
          <RightPanelMetric label="DOM read enabled" value="false" tone="neutral" />
          <RightPanelMetric label="Page content read enabled" value="false" tone="neutral" />
          <RightPanelMetric label="Screenshot enabled" value="false" tone="neutral" />
          <RightPanelMetric label="OCR enabled" value="false" tone="neutral" />
          <RightPanelMetric label="Vision enabled" value="false" tone="neutral" />
          <RightPanelMetric label="Credentials enabled" value="false" tone="neutral" />
          <RightPanelMetric label="Download/upload enabled" value="false" tone="neutral" />
          <RightPanelMetric label="Wallet/payment enabled" value="false" tone="neutral" />
        </div>
        <p className="mt-2 text-[9px] italic leading-relaxed text-[var(--app-text-muted)] opacity-80">
          LucaBrowser can observe governed session metadata only. Luca cannot read page content, DOM, screenshots, OCR, credentials, or automate the page.
        </p>
      </RightPanelSection>

      <RightPanelSection title="Browser action queue" subtitle="Proposed governed browser actions, queued for human review only. Execution is still disabled.">
        <div className="grid grid-cols-2 gap-2">
          <RightPanelMetric label="Action requests" value={formatCount("request", browserActions.totalActionRequests)} />
          <RightPanelMetric label="Waiting confirmation" value={formatCount("request", browserActions.waitingConfirmationRequests)} tone={browserActions.waitingConfirmationRequests > 0 ? "warn" : "neutral"} />
          <RightPanelMetric label="Confirmed for future" value={formatCount("request", browserActions.confirmedForFutureExecutionRequests)} tone={browserActions.confirmedForFutureExecutionRequests > 0 ? "warn" : "neutral"} />
          <RightPanelMetric label="Blocked" value={formatCount("request", browserActions.blockedRequests)} tone={browserActions.blockedRequests > 0 ? "danger" : "neutral"} />
          <RightPanelMetric label="Revoked" value={formatCount("request", browserActions.revokedRequests)} tone="neutral" />
          <RightPanelMetric label="Archived" value={formatCount("request", browserActions.archivedRequests)} tone="neutral" />
          <RightPanelMetric label="Safe lifecycle executed" value={formatCount("action", browserActionExecution.executedResults)} tone={browserActionExecution.executedResults > 0 ? "warn" : "neutral"} />
          <RightPanelMetric label="Safe lifecycle execution enabled" value="true" tone="neutral" />
          <RightPanelMetric label="Click/type/scroll execution enabled" value="false" tone="neutral" />
          <RightPanelMetric label="Human confirmation required" value="true" tone="neutral" />
          <RightPanelMetric label="Automation enabled" value="false" tone="neutral" />
          <RightPanelMetric label="DOM read enabled" value="false" tone="neutral" />
          <RightPanelMetric label="Page content read enabled" value="false" tone="neutral" />
          <RightPanelMetric label="Screenshot/OCR enabled" value="false" tone="neutral" />
          <RightPanelMetric label="Credentials enabled" value="false" tone="neutral" />
          <RightPanelMetric label="Download/wallet enabled" value="false" tone="neutral" />
        </div>
        <p className="mt-2 text-[9px] italic leading-relaxed text-[var(--app-text-muted)] opacity-80">
          Only confirmed safe lifecycle/control actions (back/forward/refresh/pause/resume/close/revoke) can execute. Click, type, scroll, and all page-level automation stay disabled.
        </p>
      </RightPanelSection>

      <RightPanelSection title="Continuity" subtitle="Sessions, plans, checkpoints, and reminders that need attention. No execution from this panel.">
        {(() => {
          const pendingCheckpoints = checkpoints.filter((c) => c.status === "proposed").length;
          const pendingReminders = reminders.pendingCount ?? 0;
          const blockedPlans = planDiag.blockedPlans ?? 0;
          const summaryLine = getContinuitySummaryLine({
            resumableSessions: resumableCount,
            activePlans: planDiag.activePlans,
            pendingCheckpoints,
            pendingReminders,
            pendingApprovals: approvals.pendingRequests,
            blockedItems: blockedPlans,
          });
          return (
            <div className="space-y-2 text-[10px] text-[var(--app-text-muted)]">
              <div className="font-bold text-[var(--app-text-main)]">{summaryLine}</div>
              <div className="grid grid-cols-2 gap-1">
                <RightPanelMetric label="Can resume" value={resumableCount} tone={resumableCount > 0 ? "warn" : "neutral"} />
                <RightPanelMetric label="Active plans" value={planDiag.activePlans} tone={planDiag.activePlans > 0 ? "good" : "neutral"} />
                <RightPanelMetric label="Checkpoints" value={pendingCheckpoints} tone={pendingCheckpoints > 0 ? "warn" : "neutral"} />
                <RightPanelMetric label="Reminders" value={reminders.deliveredCount} tone={reminders.deliveredCount > 0 ? "good" : "neutral"} />
              </div>
              <div className="text-[9px] uppercase tracking-widest opacity-70">No execution happens from this panel</div>
            </div>
          );
        })()}
      </RightPanelSection>

      <RightPanelSection title="Overlay approvals" subtitle="VoiceHud and SecurityGate approval-resolution audit only. No tool execution or overlay behavior changes.">
        <div className="grid grid-cols-2 gap-2">
          <RightPanelMetric label="Records" value={formatCount("record", overlayApprovalResolutions.totalRecords)} tone="neutral" />
          <RightPanelMetric label="Resolved" value={formatCount("attempt", overlayApprovalResolutions.resolvedAttempts)} tone={overlayApprovalResolutions.resolvedAttempts > 0 ? "good" : "neutral"} />
          <RightPanelMetric label="VoiceHud" value={formatCount("attempt", overlayApprovalResolutions.voiceHudAttempts)} tone={overlayApprovalResolutions.voiceHudAttempts > 0 ? "warn" : "neutral"} />
          <RightPanelMetric label="Blocked" value={formatCount("attempt", overlayApprovalResolutions.blockedNoPendingRequestAttempts + overlayApprovalResolutions.blockedUnrecognizedDecisionAttempts)} tone={overlayApprovalResolutions.blockedNoPendingRequestAttempts + overlayApprovalResolutions.blockedUnrecognizedDecisionAttempts > 0 ? "danger" : "neutral"} />
          <RightPanelMetric label="Resolution only" value="true" tone="good" />
          <RightPanelMetric label="Tool execution" value="false" tone="neutral" />
        </div>
      </RightPanelSection>

      <RightPanelSection title="Skill governance" subtitle="Registry and request state only. No skill installs or runs from this panel.">
        {(() => {
          const pendingSkillRequests = skillGovernance.proposedRequests + skillGovernance.approvalRequiredRequests;
          const rejectedRevokedSkillRequests = skillGovernance.rejectedRequests + skillGovernance.revokedRequests;
          const summaryLine = getSkillSummaryLine({
            registeredSkills: skillRegistry.totalSkills,
            pendingRequests: pendingSkillRequests,
            approvedWaitingRequests: skillGovernance.approvedWaitingRequests,
            blockedRequests: skillGovernance.blockedRequests,
            rejectedRevokedRequests: rejectedRevokedSkillRequests,
          });
          return (
            <div className="space-y-2 text-[10px] text-[var(--app-text-muted)]">
              <div className="font-bold text-[var(--app-text-main)]">{summaryLine}</div>
              <div className="grid grid-cols-2 gap-1">
                <RightPanelMetric label="Registered" value={skillRegistry.totalSkills} tone={skillRegistry.totalSkills > 0 ? "good" : "neutral"} />
                <RightPanelMetric label="Pending" value={pendingSkillRequests} tone={pendingSkillRequests > 0 ? "warn" : "good"} />
                <RightPanelMetric label="Waiting" value={skillGovernance.approvedWaitingRequests} tone={skillGovernance.approvedWaitingRequests > 0 ? "warn" : "neutral"} />
                <RightPanelMetric label="Blocked" value={skillGovernance.blockedRequests} tone={skillGovernance.blockedRequests > 0 ? "danger" : "good"} />
              </div>
              <div className="text-[9px] uppercase tracking-widest opacity-70">Skill approvals are state-only · No skill installs or runs from this panel</div>
            </div>
          );
        })()}
      </RightPanelSection>

      <RightPanelSection title="Session" subtitle={activeSession ? "Current active or latest resumable session." : "No persisted agent session yet."}>
        {activeSession ? (
          <div className="space-y-2 text-[10px] text-[var(--app-text-muted)]">
            <div className="font-bold text-[var(--app-text-main)]">{activeSession.title}</div>
            <div>{activeSession.lastAgentStateSummary}</div>
            <div className="flex items-center gap-1.5">
              <span className={`font-bold ${getContinuityToneColor(getSessionContinuityTone(activeSession.lifecycleState))}`}>
                {getSessionContinuityLabel(activeSession.lifecycleState)}
              </span>
              <span>·</span>
              <span>{getSessionNextAction(activeSession.lifecycleState, activeSession.safeToResume)}</span>
            </div>
            {activeSession.updatedAt && <div className="text-[9px] opacity-70">{compactTimestamp(activeSession.updatedAt)}</div>}
          </div>
        ) : (
          <div className="text-[10px] italic text-[var(--app-text-muted)]">No session continuity record available.</div>
        )}
      </RightPanelSection>

      {activePlan && (
        <RightPanelSection title="Current plan" subtitle="Runtime plan record. Approving or activating a plan does not execute anything.">
          <div className="space-y-1 text-[10px] text-[var(--app-text-muted)]">
            <div className="font-bold text-[var(--app-text-main)]">{activePlan.title}</div>
            <div>{activePlan.summary}</div>
            <div className="flex items-center gap-1.5">
              <span className={`font-bold ${getContinuityToneColor(getPlanContinuityTone(activePlan.status))}`}>
                {getPlanContinuityLabel(activePlan.status)}
              </span>
              <span>· risk: {activePlan.riskLevel}</span>
            </div>
            <div className="text-[9px] uppercase tracking-widest opacity-70">{getPlanNextAction(activePlan.status)}</div>
            {activePlan.currentStepId && (() => {
              const currentStep = activePlan.steps.find((s) => s.stepId === activePlan.currentStepId);
              return currentStep ? <div>Next safe step: {currentStep.title} · {currentStep.status}</div> : null;
            })()}
            <div className="grid grid-cols-2 gap-1 pt-1">
              <RightPanelMetric label="Waiting approval" value={planDiag.pendingPlanApprovals} tone={planDiag.pendingPlanApprovals > 0 ? "warn" : "good"} />
              <RightPanelMetric label="Blocked for safety" value={planDiag.blockedRiskySteps} tone={planDiag.blockedRiskySteps > 0 ? "danger" : "good"} />
              <RightPanelMetric label="Governed items ready" value={planDiag.planArtifactsCreated} tone="neutral" />
              <RightPanelMetric label="Plan steps" value={activePlan.steps.length} tone="neutral" />
            </div>
          </div>
        </RightPanelSection>
      )}

      {activeCheckpoint && (
        <RightPanelSection title="Planning checkpoint" subtitle="State-only plan record. Approving a checkpoint never runs tools or skills.">
          <div className="space-y-1 text-[10px] text-[var(--app-text-muted)]">
            <div className="font-bold text-[var(--app-text-main)]">{activeCheckpoint.title}</div>
            <div>{activeCheckpoint.summary}</div>
            <div className="flex items-center gap-1.5">
              <span className={`font-bold ${getContinuityToneColor(getCheckpointContinuityTone(activeCheckpoint.status))}`}>
                {getCheckpointContinuityLabel(activeCheckpoint.status)}
              </span>
              <span>· risk: {activeCheckpoint.riskLevel}</span>
            </div>
            <div className="text-[9px] uppercase tracking-widest opacity-70">{getCheckpointNextAction(activeCheckpoint.status)}</div>
            {activeCheckpoint.proposedNextSteps.length > 0 && <div>Next: {activeCheckpoint.proposedNextSteps.slice(0, 3).join(" · ")}</div>}
          </div>
        </RightPanelSection>
      )}

      <RightPanelSection title="Intent routing" subtitle="Current routing mode and last route decision. Routing does not execute anything.">
        {(() => {
          const routingMode = intentRoutingModeService.getMode();
          const lastDecision = intentRoutingService.getLastDecision();
          const routingDiag = intentRoutingService.getDiagnosticsSummary();
          const lastRoute = lastDecision?.route as LucaIntentRoute | undefined;
          const lastTone = lastRoute ? getRouteTone(lastRoute) : undefined;
          const lastToneColor = lastTone ? getRouteToneColor(lastTone) : "";
          return (
            <div className="space-y-1 text-[10px] text-[var(--app-text-muted)]">
              <div className="font-bold text-[var(--app-text-main)]">
                Mode: {ROUTING_MODE_SHORT_LABELS[routingMode]} · No execution
              </div>
              {lastDecision && lastRoute ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-bold ${lastToneColor}`}>{getRouteLabel(lastRoute)}</span>
                    <span>· risk: {lastDecision.riskLevel}</span>
                  </div>
                  <div className="truncate">{lastDecision.reason.slice(0, 200)}</div>
                  {lastRoute !== "fast_response" && (
                    <div className="text-[9px] uppercase tracking-widest opacity-70">
                      {getRouteNoExecutionText(lastRoute)} · {getRouteNextAction(lastRoute)}
                    </div>
                  )}
                  {lastDecision.createdPlanId && <div>Plan: {lastDecision.createdPlanId}</div>}
                  {(lastDecision.createdMemoryProposalIds?.length ?? 0) > 0 && <div>Memory proposals: {lastDecision.createdMemoryProposalIds?.length}</div>}
                  {(lastDecision.createdGovernedRequestIds?.length ?? 0) > 0 && <div>Governed requests: {lastDecision.createdGovernedRequestIds?.length}</div>}
                  {(lastDecision.createdSkillRequestIds?.length ?? 0) > 0 && <div>Skill requests: {lastDecision.createdSkillRequestIds?.length}</div>}
                </>
              ) : (
                <div className="italic">No routing decisions yet.</div>
              )}
              <div className="grid grid-cols-2 gap-1 pt-1">
                <RightPanelMetric label="Total routes" value={routingDiag.totalRoutingDecisions} tone="neutral" />
                <RightPanelMetric label="Fast" value={routingDiag.fastResponses} tone="neutral" />
                <RightPanelMetric label="Plans" value={routingDiag.plannedRoutes} tone={routingDiag.plannedRoutes > 0 ? "warn" : "neutral"} />
                <RightPanelMetric label="Blocked" value={routingDiag.blockedRoutes} tone={routingDiag.blockedRoutes > 0 ? "danger" : "good"} />
              </div>
            </div>
          );
        })()}
      </RightPanelSection>

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
