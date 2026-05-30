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
import { screenObservationService } from "../../services/runtime/ScreenObservationService";
import { sandboxedBrowserService } from "../../services/runtime/SandboxedBrowserService";
import { sandboxedBrowserShellService } from "../../services/runtime/SandboxedBrowserShellService";
import { lucaBrowserActionQueueService } from "../../services/runtime/LucaBrowserActionQueueService";
import { lucaBrowserActionExecutionService } from "../../services/runtime/LucaBrowserActionExecutionService";
import { visualCoreDisplaySessionService } from "../../services/runtime/VisualCoreDisplaySessionService";
import { visualCoreRemoteCommandService } from "../../services/runtime/VisualCoreRemoteCommandService";
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
import {
  getGatewayCapabilityLabel,
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
  getScreenObservationNoCaptureText,
  getScreenObservationRiskLabel,
  getScreenObservationStatusLabel,
  getScreenObservationSurfaceLabel,
} from "../runtime/screenObservationLabels";
import {
  getObservationRequestTimeline,
  getObservationSessionLifecycleLabel,
  getObservationSessionTimeline,
} from "../runtime/screenObservationSessionUx";
import {
  getSandboxedBrowserCapabilityLabel,
  getSandboxedBrowserCredentialBoundaryLabel,
  getSandboxedBrowserNavigationRiskLabel,
  getSandboxedBrowserNoLaunchText,
  getSandboxedBrowserRiskLabel,
  getSandboxedBrowserStatusLabel,
  getSandboxedBrowserSurfaceLabel,
} from "../runtime/sandboxedBrowserLabels";

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
      observationRequests: screenObservationService.listObservationRequests(),
      observationSessions: screenObservationService.listObservationSessions(),
      browserRequests: sandboxedBrowserService.listBrowserRequests(),
      browserSessions: sandboxedBrowserService.listBrowserSessions(),
      browserShellSessions: sandboxedBrowserShellService.listShellSessions(),
      browserShellNavigations: sandboxedBrowserShellService.listNavigationRecords(),
      browserShellObservations: sandboxedBrowserShellService.listObservationSnapshots(),
      browserShellActions: lucaBrowserActionQueueService.listActionRequests(),
      browserShellActionExecutions: lucaBrowserActionExecutionService.listExecutionResults(),
      visualDisplaySessions: visualCoreDisplaySessionService.listDisplaySessions(),
      visualRemoteCommands: visualCoreRemoteCommandService.listRemoteCommandRecords(),
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
          .map((request) => {
            const safeguards = getGatewaySafeguardLabels(request.policyDecision).filter((entry) => entry.required);
            return (
              <div key={request.gatewayRequestId} className={`mb-2 rounded-xl border p-3 ${request.status === "blocked" ? "border-red-500/20 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">
                      {getGatewayStatusLabel(request.status)} · {getGatewaySurfaceLabel(request.surface)} / {getGatewayCapabilityLabel(request.capability)}
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{getGatewayPermissionSummary(request)}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{request.policyDecision.userSafeReason}</p>
                  </div>
                  <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">{getGatewayRiskLabel(request.riskLevel)}</span>
                </div>
                {request.blockedBy && request.blockedBy.length > 0 && (
                  <p className="mt-2 text-[9px] text-red-200">Blocked by: {request.blockedBy.join(", ")}</p>
                )}
                {safeguards.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 text-[8px] font-black uppercase tracking-widest">
                    {safeguards.map((entry) => (
                      <span key={entry.key} className="rounded-full border border-white/10 px-2 py-0.5 text-[var(--app-text-muted)]">{entry.label}</span>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">
                  <span>created {compactTimestamp(request.createdAt)}</span>
                  <span>updated {compactTimestamp(request.updatedAt)}</span>
                  <span>dry-run only: {String(request.policyDecision.allowedForDryRun)}</span>
                  <span>execution enabled: false</span>
                </div>
                <p className="mt-2 text-[9px] italic leading-relaxed text-[var(--app-text-muted)] opacity-80">{getGatewayNoExecutionText()}</p>
              </div>
            );
          })}
      </RightPanelSection>

      <RightPanelSection title="Screen observation trace" subtitle="Audit-like screen observation permission records. Capture and vision analysis remain disabled.">
        {trace.observationRequests.length === 0 && trace.observationSessions.length === 0 ? <EmptyState>No screen observation records.</EmptyState> : (
          <div className="space-y-2">
            {[...trace.observationRequests]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 6)
              .map((request) => (
                <div key={request.observationRequestId} className={`rounded-xl border p-3 ${request.status === "blocked" ? "border-red-500/20 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">
                        {getScreenObservationStatusLabel(request.status)} · {getScreenObservationSurfaceLabel(request.surface)} / {getScreenObservationCapabilityLabel(request.capability)}
                      </div>
                      <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{request.policyDecision.userSafeReason}</p>
                    </div>
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">{getScreenObservationRiskLabel(request.riskLevel)}</span>
                  </div>
                  {request.blockedBy && request.blockedBy.length > 0 && (
                    <p className="mt-2 text-[9px] text-red-200">Blocked by: {request.blockedBy.join(", ")}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">
                    <span>{getScreenObservationConsentLabel(request.consentState)}</span>
                    <span>created {compactTimestamp(request.createdAt)}</span>
                    <span>updated {compactTimestamp(request.updatedAt)}</span>
                    <span>capture enabled: false</span>
                    <span>vision model enabled: false</span>
                  </div>
                  <p className="mt-2 text-[8px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-70">Lifecycle: {getObservationRequestTimeline(request).map((step) => step.label).join(" → ")}</p>
                  <p className="mt-2 text-[9px] italic leading-relaxed text-[var(--app-text-muted)] opacity-80">{getScreenObservationNoCaptureText()}</p>
                </div>
              ))}
            {[...trace.observationSessions]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 4)
              .map((session) => (
                <div key={session.observationSessionId} className="rounded-xl border border-white/10 bg-black/10 p-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">
                    Session · {getScreenObservationStatusLabel(session.status)} · {getScreenObservationSurfaceLabel(session.surface)} / {getScreenObservationCapabilityLabel(session.capability)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">
                    <span>{getScreenObservationConsentLabel(session.consentState)}</span>
                    <span>{getScreenObservationRiskLabel(session.riskLevel)}</span>
                    <span>created {compactTimestamp(session.createdAt)}</span>
                    {session.revokedAt && <span>revoked {compactTimestamp(session.revokedAt)}</span>}
                    <span>capture enabled: false</span>
                    <span>vision model enabled: false</span>
                  </div>
                  <p className="mt-2 text-[8px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-70">{getObservationSessionLifecycleLabel(session)} · {getObservationSessionTimeline(session).map((step) => step.label).join(" → ")}</p>
                  <p className="mt-2 text-[9px] italic leading-relaxed text-[var(--app-text-muted)] opacity-80">Dry-run permission session only. {getScreenObservationNoCaptureText()}</p>
                </div>
              ))}
          </div>
        )}
      </RightPanelSection>

      <RightPanelSection title="Sandboxed browser trace" subtitle="Audit-like sandboxed browser permission records. Launch, automation, DOM read, and network requests remain disabled.">
        {trace.browserRequests.length === 0 && trace.browserSessions.length === 0 ? <EmptyState>No sandboxed browser records.</EmptyState> : (
          <div className="space-y-2">
            {[...trace.browserRequests]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 6)
              .map((request) => (
                <div key={request.browserRequestId} className={`rounded-xl border p-3 ${request.status === "blocked" ? "border-red-500/20 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">
                        {getSandboxedBrowserStatusLabel(request.status)} · {getSandboxedBrowserSurfaceLabel(request.surface)} / {getSandboxedBrowserCapabilityLabel(request.capability)}
                      </div>
                      <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{request.policyDecision.userSafeReason}</p>
                    </div>
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">{getSandboxedBrowserRiskLabel(request.riskLevel)}</span>
                  </div>
                  {request.blockedBy && request.blockedBy.length > 0 && (
                    <p className="mt-2 text-[9px] text-red-200">Blocked by: {request.blockedBy.join(", ")}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">
                    <span>nav: {getSandboxedBrowserNavigationRiskLabel(request.navigationRisk)}</span>
                    <span>{getSandboxedBrowserCredentialBoundaryLabel(request.credentialBoundary)}</span>
                    <span>created {compactTimestamp(request.createdAt)}</span>
                    <span>updated {compactTimestamp(request.updatedAt)}</span>
                    <span>launch enabled: false</span>
                    <span>automation enabled: false</span>
                    <span>DOM read enabled: false</span>
                    <span>network request enabled: false</span>
                  </div>
                  <p className="mt-2 text-[9px] italic leading-relaxed text-[var(--app-text-muted)] opacity-80">{getSandboxedBrowserNoLaunchText()}</p>
                </div>
              ))}
            {[...trace.browserSessions]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 4)
              .map((session) => (
                <div key={session.browserSessionId} className="rounded-xl border border-white/10 bg-black/10 p-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">
                    Session · {getSandboxedBrowserStatusLabel(session.status)} · {getSandboxedBrowserSurfaceLabel(session.surface)} / {getSandboxedBrowserCapabilityLabel(session.capability)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">
                    <span>nav: {getSandboxedBrowserNavigationRiskLabel(session.navigationRisk)}</span>
                    <span>{getSandboxedBrowserRiskLabel(session.riskLevel)}</span>
                    <span>created {compactTimestamp(session.createdAt)}</span>
                    {session.revokedAt && <span>revoked {compactTimestamp(session.revokedAt)}</span>}
                    <span>launch enabled: false</span>
                    <span>automation enabled: false</span>
                    <span>DOM read enabled: false</span>
                    <span>network request enabled: false</span>
                  </div>
                  <p className="mt-2 text-[9px] italic leading-relaxed text-[var(--app-text-muted)] opacity-80">Dry-run browser permission session only. {getSandboxedBrowserNoLaunchText()}</p>
                </div>
              ))}
          </div>
        )}
      </RightPanelSection>

      <RightPanelSection title="Browser shell trace" subtitle="Approved safe URL open requests, opens/closes/revokes, and blocked URL attempts. Audit URL only — no raw secrets.">
        {trace.browserShellSessions.length === 0 ? <EmptyState>No browser shell records.</EmptyState> : (
          <div className="space-y-2">
            {[...trace.browserShellSessions]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 8)
              .map((session) => (
                <div key={session.shellSessionId} className={`rounded-xl border p-3 ${session.status === "blocked" ? "border-red-500/20 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">Shell · {session.status}</div>
                      <p className="mt-1 truncate font-mono text-[10px] text-[var(--app-text-muted)]">{session.auditUrl || "(no audit URL)"}</p>
                    </div>
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">{session.riskLevel}</span>
                  </div>
                  {session.blockedBy && session.blockedBy.length > 0 && (
                    <p className="mt-2 text-[9px] text-red-200">Blocked by: {session.blockedBy.join(", ")}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">
                    <span>requested {compactTimestamp(session.createdAt)}</span>
                    {session.closedAt && <span>closed {compactTimestamp(session.closedAt)}</span>}
                    {session.revokedAt && <span>revoked {compactTimestamp(session.revokedAt)}</span>}
                    <span>automation: false</span>
                    <span>DOM read: false</span>
                    <span>credentials: false</span>
                  </div>
                  <p className="mt-2 text-[9px] italic leading-relaxed text-[var(--app-text-muted)] opacity-80">Approved safe URL only. Luca cannot automate the page, read the DOM, or handle credentials.</p>
                </div>
              ))}
          </div>
        )}
      </RightPanelSection>

      <RightPanelSection title="Browser navigation trace" subtitle="Governed navigation events with redacted audit URLs only. Allowed/blocked per attempt — no DOM, no automation, no raw secrets.">
        {trace.browserShellNavigations.length === 0 ? <EmptyState>No browser navigation records.</EmptyState> : (
          <div className="space-y-2">
            {[...trace.browserShellNavigations]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 10)
              .map((nav) => (
                <div key={nav.navigationId} className={`rounded-xl border p-3 ${nav.status === "blocked" ? "border-red-500/20 bg-red-500/5" : "border-emerald-500/20 bg-emerald-500/5"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">Nav · {nav.status}</div>
                      {nav.fromAuditUrl && <p className="mt-1 truncate font-mono text-[9px] text-[var(--app-text-muted)] opacity-70">from {nav.fromAuditUrl}</p>}
                      <p className="mt-1 truncate font-mono text-[10px] text-[var(--app-text-muted)]">to {nav.toAuditUrl || "(no audit URL)"}</p>
                    </div>
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">{nav.riskLevel}</span>
                  </div>
                  {nav.blockedBy && nav.blockedBy.length > 0 && (
                    <p className="mt-2 text-[9px] text-red-200">Blocked by: {nav.blockedBy.join(", ")}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">
                    <span>{nav.source}</span>
                    <span>{compactTimestamp(nav.createdAt)}</span>
                    <span>automation: false</span>
                    <span>DOM read: false</span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </RightPanelSection>

      <RightPanelSection title="Browser observation trace" subtitle="Read-only governed session metadata with redacted audit URLs only. Status, adapter, nav counts, loading + back/forward — no DOM, no page content, no screenshots, no OCR, no vision.">
        {trace.browserShellObservations.length === 0 ? <EmptyState>No browser observation snapshots.</EmptyState> : (
          <div className="space-y-2">
            {[...trace.browserShellObservations]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 10)
              .map((obs) => (
                <div key={obs.observationId} className={`rounded-xl border p-3 ${obs.status === "blocked" || obs.status === "revoked" ? "border-red-500/20 bg-red-500/5" : "border-cyan-500/20 bg-cyan-500/5"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">Obs · {obs.status} · {obs.shellSessionId.slice(-6)}</div>
                      <p className="mt-1 truncate font-mono text-[10px] text-[var(--app-text-muted)]">{obs.currentAuditUrl || "(no audit URL)"}</p>
                    </div>
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">{obs.adapter ?? "unknown"}</span>
                  </div>
                  {obs.lastBlockedReason && (
                    <p className="mt-2 text-[9px] text-red-200">Last blocked: {obs.lastBlockedReason}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">
                    <span>nav {obs.navigationCount}</span>
                    <span>blocked {obs.blockedNavigationCount}</span>
                    <span>{obs.isLoading ? "loading" : "idle"}</span>
                    <span>back {obs.canGoBack ? "yes" : "no"}</span>
                    <span>fwd {obs.canGoForward ? "yes" : "no"}</span>
                    <span>{compactTimestamp(obs.updatedAt)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[8px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-60">
                    <span>automation: false</span>
                    <span>DOM: false</span>
                    <span>page content: false</span>
                    <span>screenshot: false</span>
                    <span>OCR: false</span>
                    <span>vision: false</span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </RightPanelSection>

      <RightPanelSection title="Browser action queue trace" subtitle="Proposed governed browser actions queued for human review only. Execution is disabled — no click/type/scroll, no DOM read, no page content, no screenshot/OCR, no credentials.">
        {trace.browserShellActions.length === 0 ? <EmptyState>No browser action requests.</EmptyState> : (
          <div className="space-y-2">
            {[...trace.browserShellActions]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 10)
              .map((action) => (
                <div key={action.actionRequestId} className={`rounded-xl border p-3 ${action.status === "blocked" || action.status === "revoked" ? "border-red-500/20 bg-red-500/5" : action.status === "confirmed_for_future_execution" ? "border-emerald-500/20 bg-emerald-500/5" : "border-indigo-500/20 bg-indigo-500/5"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">{action.kind} · {action.status} · {action.shellSessionId.slice(-6)}</div>
                      <p className="mt-1 truncate text-[10px] text-[var(--app-text-muted)]">{action.summary}</p>
                    </div>
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">{action.riskLevel}</span>
                  </div>
                  {action.blockedBy && action.blockedBy.length > 0 && (
                    <p className="mt-2 text-[9px] text-red-200">Blocked by: {action.blockedBy.join(", ")}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">
                    {action.targetDescriptor && <span>target: {action.targetDescriptor}</span>}
                    {action.typedTextPreview && <span>text: “{action.typedTextPreview}”</span>}
                    <span>{compactTimestamp(action.updatedAt)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[8px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-60">
                    <span>execution: false</span>
                    <span>automation: false</span>
                    <span>DOM: false</span>
                    <span>page content: false</span>
                    <span>screenshot/OCR: false</span>
                    <span>credentials: false</span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </RightPanelSection>

      <RightPanelSection title="VisualCore display session trace" subtitle="Governed display-only session records for low-risk VisualCore modes. Created/opened/paused/resumed/closed/revoked/blocked. No capture, automation, external action, file, messaging, or wireless.">
        {trace.visualDisplaySessions.length === 0 ? <EmptyState>No VisualCore display sessions.</EmptyState> : (
          <div className="space-y-2">
            {[...trace.visualDisplaySessions]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 10)
              .map((session) => (
                <div key={session.visualSessionId} className={`rounded-xl border p-3 ${session.status === "blocked" || session.status === "revoked" ? "border-red-500/20 bg-red-500/5" : session.status === "open" ? "border-emerald-500/20 bg-emerald-500/5" : "border-indigo-500/20 bg-indigo-500/5"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">{session.mode} · {session.status} · {session.visualSessionId.slice(-6)}</div>
                      <p className="mt-1 truncate text-[10px] text-[var(--app-text-muted)]">{session.userSafeReason}</p>
                    </div>
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">{session.riskLevel}</span>
                  </div>
                  {session.blockedBy && session.blockedBy.length > 0 && (
                    <p className="mt-2 text-[9px] text-red-200">Blocked by: {session.blockedBy.join(", ")}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">
                    <span>source: {session.source}</span>
                    <span>readiness: {session.readiness}</span>
                    <span>{compactTimestamp(session.updatedAt)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[8px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-60">
                    <span>capture: false</span>
                    <span>automation: false</span>
                    <span>external action: false</span>
                    <span>file: false</span>
                    <span>messaging: false</span>
                    <span>wireless: false</span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </RightPanelSection>

      <RightPanelSection title="VisualCore remote command trace" subtitle="Remote commands audited before driving VisualCore: received / allowed_record_only / needs_approval / blocked. Browser navigation governed via LucaBrowser adapter. Sensitive commands need dedicated governance. No capture, automation, external action, file, messaging, or wireless.">
        {trace.visualRemoteCommands.length === 0 ? <EmptyState>No VisualCore remote commands.</EmptyState> : (
          <div className="space-y-2">
            {[...trace.visualRemoteCommands]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 10)
              .map((command) => (
                <div key={command.commandRecordId} className={`rounded-xl border p-3 ${command.status === "blocked" ? "border-red-500/20 bg-red-500/5" : command.status === "needs_approval" ? "border-amber-500/20 bg-amber-500/5" : command.status === "allowed_record_only" ? "border-emerald-500/20 bg-emerald-500/5" : "border-indigo-500/20 bg-indigo-500/5"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">{command.kind} · {command.status} · {command.commandRecordId.slice(-6)}</div>
                      <p className="mt-1 truncate text-[10px] text-[var(--app-text-muted)]">{command.userSafeReason}</p>
                    </div>
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">{command.riskLevel}</span>
                  </div>
                  {command.targetAuditUrl && (
                    <p className="mt-2 truncate text-[9px] text-[var(--app-text-muted)]">audit url: {command.targetAuditUrl}</p>
                  )}
                  {command.blockedBy && command.blockedBy.length > 0 && (
                    <p className="mt-2 text-[9px] text-red-200">Blocked by: {command.blockedBy.join(", ")}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">
                    <span>source: {command.source}</span>
                    {command.targetMode && <span>target: {command.targetMode}</span>}
                    <span>{compactTimestamp(command.updatedAt)}</span>
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
              ))}
          </div>
        )}
      </RightPanelSection>

      <RightPanelSection title="Browser action execution trace" subtitle="Results of confirmed safe lifecycle/control executions (back/forward/refresh/pause/resume/close/revoke). Click/type/scroll and all page-level automation stay disabled — no DOM read, no page content, no screenshot/OCR, no credentials.">
        {trace.browserShellActionExecutions.length === 0 ? <EmptyState>No browser action executions.</EmptyState> : (
          <div className="space-y-2">
            {[...trace.browserShellActionExecutions]
              .sort((a, b) => b.executedAt.localeCompare(a.executedAt))
              .slice(0, 10)
              .map((result) => (
                <div key={result.executionResultId} className={`rounded-xl border p-3 ${result.status === "blocked" || result.status === "failed" ? "border-red-500/20 bg-red-500/5" : result.status === "executed" ? "border-emerald-500/20 bg-emerald-500/5" : "border-indigo-500/20 bg-indigo-500/5"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main)]">{result.kind} · {result.status} · {result.shellSessionId.slice(-6)}</div>
                      <p className="mt-1 truncate text-[10px] text-[var(--app-text-muted)]">{result.message}</p>
                    </div>
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">{compactTimestamp(result.executedAt)}</span>
                  </div>
                  {result.blockedBy && result.blockedBy.length > 0 && (
                    <p className="mt-2 text-[9px] text-red-200">Blocked by: {result.blockedBy.join(", ")}</p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-2 text-[8px] uppercase tracking-widest text-[var(--app-text-muted)] opacity-60">
                    <span>safe lifecycle exec: true</span>
                    <span>click/type/scroll exec: false</span>
                    <span>automation: false</span>
                    <span>DOM: false</span>
                    <span>screenshot/OCR: false</span>
                    <span>credentials: false</span>
                  </div>
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
