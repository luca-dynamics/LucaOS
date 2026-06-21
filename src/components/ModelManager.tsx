/**
 * Model Manager Component
 * Unified UI for managing all local AI models on Desktop.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Icon } from "./ui/Icon";
import {
  modelManagerService,
  LocalModel,
} from "../services/ModelManagerService";
import { settingsService } from "../services/settingsService";
import { modelReadinessResolver } from "../services/models/ModelReadinessResolver";
import type { ModelRouteDecision } from "../types/modelRouting";
import type { LucaModelCapability, LucaModelTaskType } from "../model-router/modelRouterContract";
import { createProviderHubPanelViewModel, type ProviderHubPanelCardViewModel, type ProviderHubPanelViewModel } from "../model-router/providerHubPanelViewModel";
import { createProviderHubRouteDecision, type LucaProviderHubRouteDecision, type LucaProviderHubRoutePreference } from "../model-router/providerHubRoutePlanner";
import { createProviderHubRouteRequestFromPolicy, getProviderHubTaskRoutePolicy, resolveProviderHubTaskRoutePolicy, type LucaProviderHubTaskRoutePolicyResolution } from "../model-router/providerHubTaskRoutePolicies";
import { getProviderHubEntries, type LucaProviderHubId } from "../model-router/providerHubRegistry";
import { createProviderHubSettingsSnapshots } from "../model-router/providerHubSettingsSnapshot";
import { createProviderHubConfigureIntentFromCard, type LucaProviderHubConfigureIntent } from "../model-router/providerHubConfigureIntent";
import { createProviderHubSettingsPatch, getProviderHubSafeKeyStatus, providerHubApiKeyField, providerHubBaseUrlField } from "../model-router/providerHubConfiguration";
import { canTestProviderHubConnection, testProviderHubConnection, type LucaProviderHubConnectionTestResult } from "../model-router/providerHubConnectionTest";
import { createProviderHubRuntimeDryRunComparison, type LucaProviderHubRuntimeDryRunComparison } from "../model-router/providerHubRuntimeDryRunComparison";
import { createProviderHubShadowRouteTrace, type LucaProviderHubShadowRouteTrace } from "../model-router/providerHubShadowRouteTrace";
import { selectProviderHubRuntimeRoute, type LucaProviderHubRuntimeRouteSelectionResult } from "../model-router/providerHubRuntimeRouteSelection";
import { createProviderHubTaskRouteDiagnosticsMatrix, type LucaProviderHubTaskRouteDiagnosticsMatrix } from "../model-router/providerHubTaskRouteDiagnosticsMatrix";

interface ModelManagerProps {
  onClose?: () => void;
  theme?: {
    hex: string;
    primary?: string;
    themeName?: string;
    isLight?: boolean;
  };
  isMobile?: boolean;
}

const getCategoryIcon = (category: LocalModel["category"]) => {
  const iconSize = 16;
  switch (category) {
    case "brain": return <Icon name="Cpu" size={iconSize} variant="BoldDuotone" />;
    case "vision": return <Icon name="Eye" size={iconSize} variant="BoldDuotone" />;
    case "tts": return <Icon name="Volume2" size={iconSize} variant="BoldDuotone" />;
    case "stt": return <Icon name="Ear" size={iconSize} variant="BoldDuotone" />;
    case "agent": return <Icon name="System" size={iconSize} variant="BoldDuotone" />;
    case "embedding": return <Icon name="Brain" size={iconSize} variant="BoldDuotone" />;
    default: return <Icon name="Widget" size={iconSize} variant="BoldDuotone" />;
  }
};

const getCatalogBadgeClass = (status?: LocalModel["catalogStatus"]) => {
  if (status === "verified" || status === "installable") return "bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] text-[var(--luca-success,#4fbf7a)] border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)]";
  if (status === "experimental") return "bg-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_12%,transparent)] text-[var(--luca-accent-primary,#9b7cff)] border-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_32%,transparent)]";
  if (status === "planned") return "bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)] text-[var(--luca-warning,#f2b23e)] border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)]";
  return "bg-white/5 text-[var(--app-text-muted)] border-white/10";
};

const isCatalogInstallable = (model: LocalModel) =>
  !model.catalogStatus ||
  model.catalogStatus === "verified" ||
  model.catalogStatus === "installable";

const getProviderHubStateClass = (state: string) => {
  if (state === "ready") return "bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] text-[var(--luca-success,#4fbf7a)] border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)]";
  if (state === "missing_user_key" || state === "missing_base_url" || state === "local_runtime_unavailable") return "bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)] text-[var(--luca-warning,#f2b23e)] border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)]";
  return "bg-white/5 text-[var(--app-text-muted)] border-white/10";
};

const ProviderHubCard: React.FC<{ card: ProviderHubPanelCardViewModel; theme: any; isMobile?: boolean; onConfigure: (card: ProviderHubPanelCardViewModel) => void }> = ({ card, theme, isMobile, onConfigure }) => {
  const copyDiagnostics = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(card.diagnosticsText);
    }
  }, [card.diagnosticsText]);

  return (
    <div className="border rounded-lg overflow-hidden relative shadow-sm" style={{ backgroundColor: "var(--app-bg-main)", borderColor: "var(--app-border-main)" }}>
      <div className="p-3 flex flex-col h-full justify-between gap-3">
        <div>
          <div className="flex justify-between items-start gap-3 mb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--app-bg-tint)", color: card.readiness.ready ? theme.hex : "var(--app-text-muted)" }}>
                  {card.iconSrc ? (
                    <img
                      src={card.iconSrc}
                      alt={card.iconAlt}
                      className="w-3.5 h-3.5 object-contain"
                      style={card.entry.providerId === "openai" || card.entry.providerId === "anthropic" ? { filter: "var(--app-icon-filter, brightness(0) invert(1))" } : undefined}
                    />
                  ) : (
                    <Icon name={card.entry.category === "local_runtime" ? "Cpu" : card.entry.category === "router" ? "Route" : "Brain"} size={12} variant="BoldDuotone" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate" style={{ color: "var(--app-text-main)" }}>{card.entry.label}</div>
                  <div className="text-[9px] font-mono truncate" style={{ color: "var(--app-text-muted)" }}>{card.entry.providerType} • {card.entry.defaultCostTier} cost</div>
                </div>
              </div>
            </div>
            <span className={`text-[8px] px-1.5 py-0.5 rounded border uppercase tracking-[0.12em] flex-shrink-0 ${getProviderHubStateClass(card.readiness.state)}`}>
              {card.readinessLabel}
            </span>
          </div>
          <p className="text-[9px] leading-relaxed mb-2" style={{ color: "var(--app-text-muted)" }}>{card.entry.description}</p>
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <span className="text-[7px] px-1.5 py-0.5 rounded border uppercase tracking-[0.12em] bg-white/5 text-[var(--app-text-muted)] border-white/10">{card.categoryLabel}</span>
            <span className="text-[7px] px-1.5 py-0.5 rounded border uppercase tracking-[0.12em] bg-white/5 text-[var(--app-text-muted)] border-white/10">Latency {card.entry.defaultLatencyFit}</span>
            <span className="text-[7px] px-1.5 py-0.5 rounded border uppercase tracking-[0.12em] bg-white/5 text-[var(--app-text-muted)] border-white/10">Privacy {card.entry.privacyFit}</span>
          </div>
          <div className="text-[9px] font-medium mb-2" style={{ color: card.readiness.ready ? theme.hex : "var(--app-text-muted)" }}>{card.requiredActionLabel}</div>
          {card.configuredModelId && <div className="text-[8px] font-mono mb-2 truncate" style={{ color: "var(--app-text-muted)" }}>Model: {card.configuredModelId}</div>}
          <div className="flex flex-wrap gap-1 mb-2">
            {card.entry.supportedTaskTypes.slice(0, isMobile ? 4 : 6).map((task) => <span key={task} className="text-[8px] px-1.5 py-0.5 rounded bg-white/5" style={{ color: "var(--app-text-muted)" }}>{task}</span>)}
          </div>
          <div className="flex flex-wrap gap-1">
            {card.entry.capabilities.slice(0, isMobile ? 4 : 6).map((capability) => <span key={capability} className="text-[8px] px-1.5 py-0.5 rounded bg-white/5" style={{ color: "var(--app-text-muted)" }}>{capability}</span>)}
          </div>
          {card.entry.notes.length > 0 && <p className="text-[8px] leading-relaxed mt-2" style={{ color: "var(--app-text-muted)" }}>{card.entry.notes[0]}</p>}
        </div>
        <div className="flex items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: "var(--app-border-main)" }}>
          <button type="button" onClick={() => onConfigure(card)} className="flex-1 text-[9px] font-medium py-1 rounded hover:opacity-90 transition-opacity" style={{ color: "var(--app-text-main)", backgroundColor: "var(--app-bg-tint)" }}>Configure</button>
          <button type="button" onClick={copyDiagnostics} className="px-2 py-1 rounded hover:bg-white/5 transition-colors" style={{ color: "var(--app-text-muted)" }} title="Copy safe diagnostics"><Icon name="Copy" size={10} variant="BoldDuotone" /></button>
        </div>
      </div>
    </div>
  );
};


const ROUTE_PREVIEW_TASK_TYPES = ["chat", "vision", "memory", "embedding", "code", "tool_planning", "long_context", "fast_reply", "private_local", "voice_stt", "voice_tts"] as const satisfies readonly LucaModelTaskType[];
const ROUTE_PREVIEW_PREFERENCES = ["balanced", "managed_first", "local_first", "privacy_first", "lowest_latency", "lowest_cost", "cloud_first"] as const satisfies readonly LucaProviderHubRoutePreference[];


interface RoutePreviewState {
  readonly taskType: LucaModelTaskType;
  readonly preference: LucaProviderHubRoutePreference;
  readonly preferredProviderId: LucaProviderHubId | "";
  readonly allowFallbacks: boolean;
  readonly allowPaidProviders: boolean;
  readonly allowLocalProviders: boolean;
  readonly allowCloudProviders: boolean;
}

const RoutePreviewPanel: React.FC<{
  decision: LucaProviderHubRouteDecision;
  dryRunComparison: LucaProviderHubRuntimeDryRunComparison;
  shadowTrace: LucaProviderHubShadowRouteTrace;
  runtimeSelection: LucaProviderHubRuntimeRouteSelectionResult;
  runtimeRouteSelectionEnabled: boolean;
  runtimeRouteKillSwitchEnabled: boolean;
  taskRouteMatrix: LucaProviderHubTaskRouteDiagnosticsMatrix;
  onRuntimeRouteSelectionEnabledChange: (enabled: boolean) => void;
  onRuntimeRouteKillSwitchEnabledChange: (enabled: boolean) => void;
  preview: RoutePreviewState;
  policyResolution: LucaProviderHubTaskRoutePolicyResolution;
  onPreviewChange: React.Dispatch<React.SetStateAction<RoutePreviewState>>;
  theme: any;
}> = ({ decision, dryRunComparison, shadowTrace, runtimeSelection, runtimeRouteSelectionEnabled, runtimeRouteKillSwitchEnabled, taskRouteMatrix, onRuntimeRouteSelectionEnabledChange, onRuntimeRouteKillSwitchEnabledChange, preview, policyResolution, onPreviewChange, theme }) => {
  const copyRouteDiagnostics = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(decision.safeDiagnosticsText);
    }
  }, [decision.safeDiagnosticsText]);
  const providers = getProviderHubEntries().filter((entry) => entry.providerId !== "unknown" && entry.providerId !== "disabled");
  const update = <K extends keyof RoutePreviewState>(key: K, value: RoutePreviewState[K]) => onPreviewChange((current) => ({ ...current, [key]: value }));
  const updateTaskType = (taskType: LucaModelTaskType) => {
    const policy = getProviderHubTaskRoutePolicy(taskType);
    onPreviewChange((current) => ({
      ...current,
      taskType,
      preference: policy.defaultPreference,
      allowFallbacks: policy.allowFallbacks,
      allowPaidProviders: policy.allowPaidProviders,
      allowLocalProviders: policy.allowLocalProviders,
      allowCloudProviders: policy.allowCloudProviders,
    }));
  };

  return (
    <div className="mt-3 rounded-lg border p-3" style={{ borderColor: "var(--app-border-main)", backgroundColor: "var(--app-bg-main)" }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--app-text-main)" }}>Route Preview</div>
          <p className="text-[9px] mt-1" style={{ color: "var(--app-text-muted)" }}>Pure Model Mesh plan only. No prompts, provider APIs, settings writes, or runtime routing changes.</p>
        </div>
        <button type="button" onClick={copyRouteDiagnostics} className="px-2 py-1 rounded text-[9px] font-bold" style={{ color: "#050505", backgroundColor: theme.hex }}>Copy route diagnostics</button>
      </div>

      <label className="mb-2 flex items-start gap-2 rounded border p-2 text-[9px]" style={{ borderColor: "var(--app-border-main)", color: "var(--app-text-muted)", backgroundColor: "var(--app-bg-tint)" }}>
        <input type="checkbox" checked={runtimeRouteSelectionEnabled} onChange={(e) => onRuntimeRouteSelectionEnabledChange(e.target.checked)} />
        <span><b style={{ color: "var(--app-text-main)" }}>Use Provider Hub route selection</b><br />Preview/runtime guard. Existing runtime remains default unless enabled.<br /><span className="font-mono">Flag: {runtimeSelection.enabled ? "enabled" : "disabled"}; runtime outcome: {runtimeRouteKillSwitchEnabled ? "kill switch forces current runtime" : runtimeSelection.shouldUseProviderHubRoute ? "Provider Hub route would be returned" : "current runtime remains active"}.</span><br /><span className="font-mono">Execution guard: {runtimeRouteKillSwitchEnabled ? "Provider Hub runtime kill switch active; using current ProviderFactory route." : !runtimeSelection.enabled ? "Current ProviderFactory route is active" : runtimeSelection.shouldUseProviderHubRoute ? "Provider Hub handoff route will be used through ProviderFactory" : "Provider Hub handoff not eligible; current route remains active"}</span><br /><span className="font-mono">Fallback reason: {runtimeRouteKillSwitchEnabled ? "kill_switch_enabled" : !runtimeSelection.enabled ? "flag_disabled" : runtimeSelection.shouldUseProviderHubRoute ? "none — Provider Hub handoff active" : runtimeSelection.decisionStatus === "configuration_required" ? "missing_configuration" : runtimeSelection.decisionStatus === "blocked" ? "blocked_decision" : "provider_hub_not_selected"}</span></span>
      </label>
      <label className="mb-3 flex items-start gap-2 rounded border p-2 text-[9px]" style={{ borderColor: runtimeRouteKillSwitchEnabled ? "#ef4444" : "#7f1d1d", color: "var(--app-text-muted)", backgroundColor: runtimeRouteKillSwitchEnabled ? "rgba(239, 68, 68, 0.14)" : "rgba(127, 29, 29, 0.08)" }}>
        <input type="checkbox" checked={runtimeRouteKillSwitchEnabled} onChange={(e) => onRuntimeRouteKillSwitchEnabledChange(e.target.checked)} />
        <span><b style={{ color: runtimeRouteKillSwitchEnabled ? "#fecaca" : "var(--app-text-main)" }}>Emergency Provider Hub runtime kill switch</b><br />Forces Luca to ignore Provider Hub runtime handoff and use the current ProviderFactory route.<br /><span className="font-mono">State: {runtimeRouteKillSwitchEnabled ? "enabled — overrides runtime route selection" : "disabled"}; current route forced: {runtimeRouteKillSwitchEnabled ? "true" : "false"}; Provider Hub handoff ignored: {runtimeRouteKillSwitchEnabled ? "true" : "false"}.</span></span>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <label className="text-[9px] font-bold" style={{ color: "var(--app-text-main)" }}>Task type<select value={preview.taskType} onChange={(e) => updateTaskType(e.target.value as LucaModelTaskType)} className="mt-1 w-full rounded border px-2 py-1 bg-transparent">{ROUTE_PREVIEW_TASK_TYPES.map((task) => <option key={task} value={task}>{task}</option>)}</select></label>
        <label className="text-[9px] font-bold" style={{ color: "var(--app-text-main)" }}>Preference<select value={preview.preference} onChange={(e) => update("preference", e.target.value as LucaProviderHubRoutePreference)} className="mt-1 w-full rounded border px-2 py-1 bg-transparent">{ROUTE_PREVIEW_PREFERENCES.map((preference) => <option key={preference} value={preference}>{preference}</option>)}</select></label>
        <label className="text-[9px] font-bold" style={{ color: "var(--app-text-main)" }}>Preferred provider<select value={preview.preferredProviderId} onChange={(e) => update("preferredProviderId", e.target.value as LucaProviderHubId | "")} className="mt-1 w-full rounded border px-2 py-1 bg-transparent"><option value="">Auto</option>{providers.map((provider) => <option key={provider.providerId} value={provider.providerId}>{provider.label}</option>)}</select></label>
      </div>
      <div className="flex flex-wrap gap-3 mb-3">
        {(["allowFallbacks", "allowPaidProviders", "allowLocalProviders", "allowCloudProviders"] as const).map((key) => <label key={key} className="flex items-center gap-1.5 text-[9px]" style={{ color: "var(--app-text-muted)" }}><input type="checkbox" checked={preview[key]} onChange={(e) => update(key, e.target.checked)} /> {key.replace(/([A-Z])/g, " $1")}</label>)}
      </div>

      <div className="rounded border p-2 text-[9px] mb-3" style={{ borderColor: "var(--app-border-main)", color: "var(--app-text-muted)", backgroundColor: "var(--app-bg-tint)" }}>
        <b style={{ color: "var(--app-text-main)" }}>Policy:</b> required <span className="font-mono">{policyResolution.requiredCapabilities.join(", ")}</span>; default <span className="font-mono">{policyResolution.policy.defaultPreference}</span>; local/cloud <span className="font-mono">{policyResolution.allowLocalProviders ? "local" : "no-local"}/{policyResolution.allowCloudProviders ? "cloud" : "no-cloud"}</span>; safety: {policyResolution.safetyNotes[0]}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[9px] mb-3" style={{ color: "var(--app-text-muted)" }}>
        <div>Status: <b style={{ color: theme.hex }}>{decision.status}</b></div><div>Selected: <b>{decision.selectedProviderLabel ?? "none"}</b></div><div>Model: <b>{decision.selectedModelId ?? "none"}</b></div><div>Fallbacks: <b>{decision.fallbackCandidates.length}</b> / Blocked: <b>{decision.blockedCandidates.length}</b></div>
      </div>
      <p className="text-[9px] mb-2" style={{ color: "var(--app-text-muted)" }}>{decision.reason} Task: {decision.taskType}; preference: {decision.preference}.</p>

      <div className="rounded border p-2 text-[9px] mb-3" style={{ borderColor: "var(--app-border-main)", color: "var(--app-text-muted)", backgroundColor: "var(--app-bg-tint)" }}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <b style={{ color: "var(--app-text-main)" }}>Task route diagnostics matrix</b>
          <span className="font-mono">{taskRouteMatrix.readyTaskCount} ready / {taskRouteMatrix.configurationRequiredTaskCount} config / {taskRouteMatrix.blockedTaskCount} blocked</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1.5">
          {taskRouteMatrix.rows.map((row) => (
            <div key={row.taskType} className="rounded border px-2 py-1" style={{ borderColor: "var(--app-border-main)" }}>
              <div className="flex justify-between gap-2"><b style={{ color: "var(--app-text-main)" }}>{row.taskType}</b><span className="font-mono">{row.decisionStatus}</span></div>
              <div>Provider: <b>{row.selectedProviderLabel ?? "none"}</b>{row.selectedModelId ? ` / ${row.selectedModelId}` : ""}</div>
              <div>Policy: <span className="font-mono">{row.policyId}</span>; caps: <span className="font-mono">{row.requiredCapabilities.join(", ")}</span></div>
              <div>Fallbacks: <b>{row.fallbackCandidateCount}</b>; blocked: <b>{row.blockedCandidateCount}</b></div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded border p-2 text-[9px] mb-3" style={{ borderColor: "var(--app-border-main)", color: "var(--app-text-muted)", backgroundColor: "var(--app-bg-tint)" }}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <b style={{ color: "var(--app-text-main)" }}>Runtime comparison</b>
          <span className={`px-2 py-0.5 rounded-full font-mono ${dryRunComparison.matchesCurrentRoute ? "bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] text-[var(--luca-success,#4fbf7a)]" : "bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)] text-[var(--luca-warning,#f2b23e)]"}`}>{dryRunComparison.matchesCurrentRoute ? "match" : "mismatch"}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>Current runtime: <b>{dryRunComparison.currentProviderId ?? "Current runtime route unavailable"}</b>{dryRunComparison.currentModelId ? ` / ${dryRunComparison.currentModelId}` : ""}</div>
          <div>Provider Hub planned: <b>{dryRunComparison.providerHubSelectedProviderId ?? "none"}</b>{dryRunComparison.providerHubSelectedModelId ? ` / ${dryRunComparison.providerHubSelectedModelId}` : ""}</div>
        </div>
        <p className="mt-1">{dryRunComparison.mismatchReason ?? dryRunComparison.providerHubReason}</p>
        <button type="button" onClick={() => { if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) void navigator.clipboard.writeText(dryRunComparison.safeDiagnosticsText); }} className="mt-2 px-2 py-1 rounded text-[9px] font-bold border" style={{ borderColor: "var(--app-border-main)", color: "var(--app-text-main)" }}>Copy safe dry-run diagnostics</button>
      </div>

      <div className="rounded border p-2 text-[9px] mb-3" style={{ borderColor: "var(--app-border-main)", color: "var(--app-text-muted)", backgroundColor: "var(--app-bg-tint)" }}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <b style={{ color: "var(--app-text-main)" }}>Shadow trace</b>
          <span className={`px-2 py-0.5 rounded-full font-mono ${shadowTrace.matchesCurrentRoute ? "bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] text-[var(--luca-success,#4fbf7a)]" : "bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)] text-[var(--luca-warning,#f2b23e)]"}`}>{shadowTrace.matchesCurrentRoute ? "match" : "mismatch"}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>Trigger: <b>{shadowTrace.trigger}</b></div>
          <div>Current: <b>{shadowTrace.currentProviderId ?? "unavailable"}</b>{shadowTrace.currentModelId ? ` / ${shadowTrace.currentModelId}` : ""}</div>
          <div>Planned: <b>{shadowTrace.providerHubSelectedProviderId ?? "none"}</b>{shadowTrace.providerHubSelectedModelId ? ` / ${shadowTrace.providerHubSelectedModelId}` : ""}</div>
        </div>
        <div className="mt-1">Candidates: <b>{shadowTrace.candidateCount}</b>; fallbacks: <b>{shadowTrace.fallbackCandidateCount}</b>; blocked: <b>{shadowTrace.blockedCandidateCount}</b>. {shadowTrace.mismatchReason ?? shadowTrace.providerHubReason}</div>
        <button type="button" onClick={() => { if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) void navigator.clipboard.writeText(shadowTrace.safeDiagnosticsText); }} className="mt-2 px-2 py-1 rounded text-[9px] font-bold border" style={{ borderColor: "var(--app-border-main)", color: "var(--app-text-main)" }}>Copy shadow trace diagnostics</button>
      </div>
      <div className="space-y-1.5">{decision.candidates.slice(0, 3).map((candidate) => <div key={candidate.providerId} className="rounded border p-2 text-[9px]" style={{ borderColor: "var(--app-border-main)", color: "var(--app-text-muted)" }}><div className="flex justify-between gap-2"><b style={{ color: "var(--app-text-main)" }}>{candidate.providerLabel}</b><span>{candidate.score} • {candidate.readinessState}{candidate.configuredModelId ? ` • ${candidate.configuredModelId}` : ""}</span></div><div className="mt-1">{candidate.reasons.slice(0, 2).join(" ")}</div></div>)}</div>
    </div>
  );
};

const ProviderHubPanel: React.FC<{ viewModel: ProviderHubPanelViewModel; routeDecision: LucaProviderHubRouteDecision; dryRunComparison: LucaProviderHubRuntimeDryRunComparison; shadowTrace: LucaProviderHubShadowRouteTrace; runtimeSelection: LucaProviderHubRuntimeRouteSelectionResult; taskRouteMatrix: LucaProviderHubTaskRouteDiagnosticsMatrix; runtimeRouteSelectionEnabled: boolean; runtimeRouteKillSwitchEnabled: boolean; onRuntimeRouteSelectionEnabledChange: (enabled: boolean) => void; onRuntimeRouteKillSwitchEnabledChange: (enabled: boolean) => void; routePreview: RoutePreviewState; onRoutePreviewChange: React.Dispatch<React.SetStateAction<RoutePreviewState>>; theme: any; isMobile?: boolean; onConfigure: (card: ProviderHubPanelCardViewModel) => void }> = ({ viewModel, routeDecision, dryRunComparison, shadowTrace, runtimeSelection, taskRouteMatrix, runtimeRouteSelectionEnabled, runtimeRouteKillSwitchEnabled, onRuntimeRouteSelectionEnabledChange, onRuntimeRouteKillSwitchEnabledChange, routePreview, onRoutePreviewChange, theme, isMobile, onConfigure }) => (
  <div className="mb-4 rounded-xl border overflow-hidden shadow-sm" style={{ backgroundColor: "var(--app-bg-tint)", borderColor: "var(--app-border-main)" }}>
    <div className="p-4 border-b" style={{ borderColor: "var(--app-border-main)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--app-text-main)" }}><Icon name="Widget" size={16} style={{ color: theme.hex }} variant="BoldDuotone" />{viewModel.title}</h3>
          <p className="text-[10px] mt-1 leading-relaxed" style={{ color: "var(--app-text-muted)" }}>{viewModel.subtitle}</p>
          <p className="text-[9px] mt-1 font-mono" style={{ color: "var(--app-text-muted)" }}>{viewModel.note}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {viewModel.summary.map((item) => <span key={item.id} className={`text-[9px] px-2 py-1 rounded-full border ${item.id === "ready" ? "bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] text-[var(--luca-success,#4fbf7a)] border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)]" : "bg-white/5 text-[var(--app-text-muted)] border-white/10"}`}>{item.label}: {item.count}</span>)}
      </div>
    </div>
    <div className="p-3">
      <RoutePreviewPanel decision={routeDecision} dryRunComparison={dryRunComparison} shadowTrace={shadowTrace} runtimeSelection={runtimeSelection} taskRouteMatrix={taskRouteMatrix} runtimeRouteSelectionEnabled={runtimeRouteSelectionEnabled} runtimeRouteKillSwitchEnabled={runtimeRouteKillSwitchEnabled} onRuntimeRouteSelectionEnabledChange={onRuntimeRouteSelectionEnabledChange} onRuntimeRouteKillSwitchEnabledChange={onRuntimeRouteKillSwitchEnabledChange} preview={routePreview} policyResolution={resolveProviderHubTaskRoutePolicy({ taskType: routePreview.taskType, preferenceOverride: routePreview.preference, allowFallbacksOverride: routePreview.allowFallbacks, allowPaidProvidersOverride: routePreview.allowPaidProviders, allowLocalProvidersOverride: routePreview.allowLocalProviders, allowCloudProvidersOverride: routePreview.allowCloudProviders })} onPreviewChange={onRoutePreviewChange} theme={theme} />
      <div className="mt-3" />
      {viewModel.sections.map((section) => (
        <div key={section.id} className="mb-3 last:mb-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2 px-1" style={{ color: "var(--app-text-main)" }}>{section.title}</div>
          <div className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"}`}>
            {section.cards.map((card) => <ProviderHubCard key={card.entry.providerId} card={card} theme={theme} isMobile={isMobile} onConfigure={onConfigure} />)}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ProviderHubConfigurationPanel: React.FC<{
  card: ProviderHubPanelCardViewModel;
  intent: LucaProviderHubConfigureIntent;
  theme: any;
  onClose: () => void;
  onSaved: () => void;
}> = ({ card, intent, theme, onClose, onSaved }) => {
  const settings = settingsService.getSettings();
  const hasApiKeyField = Boolean(providerHubApiKeyField[card.entry.providerId]);
  const hasBaseUrlField = Boolean(providerHubBaseUrlField[card.entry.providerId]);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(String((settings.brain as any)[providerHubBaseUrlField[card.entry.providerId] ?? ""] ?? card.entry.defaultBaseUrl ?? ""));
  const [modelId, setModelId] = useState(card.configuredModelId ?? (card.entry.providerId === "custom_openai_compatible" ? settings.brain.customOpenAiCompatibleModel : settings.brain.model) ?? "");
  const [enabled, setEnabled] = useState(card.readiness.state !== "disabled");
  const [connectionTestResult, setConnectionTestResult] = useState<LucaProviderHubConnectionTestResult | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const isManaged = intent.intentKind === "connect_managed";
  const isLocal = card.entry.category === "local_runtime";
  const savedApiKeyField = providerHubApiKeyField[card.entry.providerId];
  const savedApiKey = savedApiKeyField ? String((settings.brain as any)[savedApiKeyField] ?? "") : "";
  const testAvailability = canTestProviderHubConnection({ providerId: card.entry.providerId, apiKey, savedApiKey, baseUrl });

  const runConnectionTest = async () => {
    setIsTestingConnection(true);
    const result = await testProviderHubConnection({ providerId: card.entry.providerId, apiKey, savedApiKey, baseUrl });
    setConnectionTestResult(result);
    setIsTestingConnection(false);
  };

  const save = async () => {
    await settingsService.saveSettings(createProviderHubSettingsPatch(settingsService.getSettings(), {
      providerId: card.entry.providerId,
      apiKey,
      baseUrl,
      modelId,
      enabled,
    }));
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden" style={{ backgroundColor: "var(--app-bg-main)", borderColor: "var(--app-border-main)" }}>
        <div className="p-4 border-b flex items-start justify-between gap-3" style={{ borderColor: "var(--app-border-main)" }}>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--app-text-main)" }}>{intent.title}: {card.entry.label}</h3>
            <p className="text-[10px] mt-1 leading-relaxed" style={{ color: "var(--app-text-muted)" }}>{intent.description}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-white/5" style={{ color: "var(--app-text-muted)" }}><Icon name="CloseCircle" size={16} variant="BoldDuotone" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="rounded-lg border p-3 text-[10px]" style={{ borderColor: "var(--app-border-main)", backgroundColor: "var(--app-bg-tint)", color: "var(--app-text-muted)" }}>
            <div className="font-bold mb-1" style={{ color: theme.hex }}>{getProviderHubSafeKeyStatus(settings, card.entry.providerId)}</div>
            <div>{card.readiness.reason}</div>
            {isLocal && <div className="mt-2">Run {card.entry.label} manually, then return here to review setup. LucaOS will not start local runtimes from this panel.</div>}
            {isManaged && <div className="mt-2">Managed by LucaOS. No user API key is requested or stored for Luca Prime.</div>}
          </div>
          {!isManaged && hasApiKeyField && (
            <label className="block text-[10px] font-bold" style={{ color: "var(--app-text-main)" }}>API key
              <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={getProviderHubSafeKeyStatus(settings, card.entry.providerId)} className="mt-1 w-full rounded border px-3 py-2 text-xs outline-none" style={{ backgroundColor: "var(--app-bg-tint)", borderColor: "var(--app-border-main)", color: "var(--app-text-main)" }} />
            </label>
          )}
          {!isManaged && hasBaseUrlField && (
            <label className="block text-[10px] font-bold" style={{ color: "var(--app-text-main)" }}>Base URL / endpoint
              <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-xs outline-none" style={{ backgroundColor: "var(--app-bg-tint)", borderColor: "var(--app-border-main)", color: "var(--app-text-main)" }} />
            </label>
          )}
          {!isLocal && !isManaged && (
            <label className="block text-[10px] font-bold" style={{ color: "var(--app-text-main)" }}>Selected model ID
              <input value={modelId} onChange={(event) => setModelId(event.target.value)} placeholder="provider/model-id" className="mt-1 w-full rounded border px-3 py-2 text-xs outline-none" style={{ backgroundColor: "var(--app-bg-tint)", borderColor: "var(--app-border-main)", color: "var(--app-text-main)" }} />
            </label>
          )}
          {!isManaged && (
            <label className="flex items-center gap-2 text-[10px] font-bold" style={{ color: "var(--app-text-main)" }}>
              <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /> Enabled
            </label>
          )}
          <div className="rounded-lg border p-3 text-[10px]" style={{ borderColor: "var(--app-border-main)", backgroundColor: "var(--app-bg-tint)", color: "var(--app-text-muted)" }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-bold" style={{ color: "var(--app-text-main)" }}>Manual connection test</div>
                <div className="mt-1">{isManaged ? "Luca Prime is managed by LucaOS; no user API-key test is available." : isLocal ? "Manual runtime check coming later. LucaOS will not start local runtimes from this panel." : testAvailability.reason ?? "Runs only when you click. Uses a minimal provider endpoint and never changes runtime routing."}</div>
              </div>
              {!isManaged && !isLocal && (
                <button type="button" onClick={runConnectionTest} disabled={!testAvailability.canTest || isTestingConnection} className="px-3 py-2 rounded text-[10px] font-bold disabled:opacity-50 disabled:cursor-not-allowed" style={{ color: testAvailability.canTest ? "#050505" : "var(--app-text-muted)", backgroundColor: testAvailability.canTest ? theme.hex : "var(--app-bg-main)" }}>
                  {isTestingConnection ? "Testing…" : "Test connection"}
                </button>
              )}
            </div>
            {connectionTestResult && (
              <div className="mt-3 rounded border p-2 font-mono" style={{ borderColor: "var(--app-border-main)", color: connectionTestResult.status === "success" ? theme.hex : "var(--app-text-muted)" }}>
                <div>Status: {connectionTestResult.status}</div>
                <div className="mt-1 whitespace-pre-wrap">{connectionTestResult.message}</div>
                <div className="mt-1">Checked: {new Date(connectionTestResult.checkedAt).toLocaleString()}</div>
                {connectionTestResult.latencyMs !== undefined && <div>Latency: {connectionTestResult.latencyMs}ms</div>}
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-2" style={{ borderColor: "var(--app-border-main)" }}>
          <button type="button" onClick={onClose} className="px-3 py-2 rounded text-xs" style={{ color: "var(--app-text-muted)", backgroundColor: "var(--app-bg-tint)" }}>Cancel</button>
          <button type="button" onClick={isManaged ? onClose : save} className="px-3 py-2 rounded text-xs font-bold" style={{ color: "#050505", backgroundColor: theme.hex }}>{isLocal ? "Review setup" : isManaged ? "Done" : "Save settings"}</button>
        </div>
      </div>
    </div>
  );
};


interface RenderGridProps {
  title: string;
  items: LocalModel[];
  compact?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
  onCanary: (id: string) => void;
  activeBrainId: string | null;
  activeEmbedId: string | null;
  downloadingId: string | null;
  canaryTestingId: string | null;
  ollamaSetupStatus: any;
  theme: any;
  isMobile?: boolean;
}

const RenderGrid: React.FC<RenderGridProps> = ({ 
  title, 
  items, 
  compact = false, 
  isExpanded, 
  onToggle,
  onDownload,
  onDelete,
  onSetActive,
  onCanary,
  activeBrainId,
  activeEmbedId,
  downloadingId,
  canaryTestingId,
  ollamaSetupStatus,
  theme,
  isMobile
}) => {
  if (items.length === 0) return null;

  return (
    <div className={`mb-3 overflow-hidden ${isMobile ? "border-x-0 border-y rounded-none" : "rounded-xl border"} shadow-sm`}
         style={{ backgroundColor: "var(--app-bg-tint)", borderColor: "var(--app-border-main)" }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="w-full flex items-center justify-between p-4 transition-all group hover:opacity-90"
      >
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--app-bg-tint)", color: isExpanded ? theme.hex : "var(--app-text-muted)" }}>
            {getCategoryIcon(items[0].category)}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span 
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{ color: isExpanded ? "var(--app-text-main)" : "var(--app-text-muted)" }}
              >
                {title}
              </span>
            </div>
            <div 
              className="text-[9px] font-mono mt-0.5"
              style={{ color: "var(--app-text-muted)" }}
            >
              {items.length} Modules Available
            </div>
          </div>
        </div>
        <Icon name="Close" size={16} className={`transition-all duration-300 ${isExpanded ? "rotate-180" : "rotate-45"}`} style={{ color: "var(--app-text-muted)" }} variant="BoldDuotone" />
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1 animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
          <div className={`grid gap-2 ${compact ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
            {items.map((model) => (
              <div key={model.id} className={`border rounded-lg overflow-hidden relative ${model.status === "ready" ? "border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)]" : "shadow-sm"}`}
                   style={{ backgroundColor: "var(--app-bg-main)", borderColor: model.status === "ready" ? undefined : "var(--app-border-main)" }}>
                {model.status === "downloading" && (
                  <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full z-0">
                    <div className="h-full bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)] transition-all duration-300" style={{ width: `${model.downloadProgress || 0}%`, backgroundColor: theme.hex }} />
                  </div>
                )}

                <div className="p-3 relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: "var(--app-bg-tint)", color: model.status === "ready" ? theme.hex : "var(--app-text-muted)" }}>
                          {getCategoryIcon(model.category)}
                        </div>
                        <div>
                          <div 
                            className="text-xs font-bold flex items-center gap-1.5"
                            style={{ color: "var(--app-text-main)" }}
                          >
                            {model.name}
                            {model.runtime === "ollama" && (
                              <span title="Ollama Guided" className="opacity-50 flex items-center" style={{ color: "var(--app-text-main)" }}>
                                <Icon name="Zap" size={10} variant="BoldDuotone" />
                              </span>
                            )}
                          </div>
                          <div 
                            className="text-[9px] font-mono"
                            style={{ color: "var(--app-text-muted)" }}
                          >
                            {model.sizeFormatted} • {model.runtime === "ollama" ? "Ollama Guided" : "Internal"}
                          </div>
                        </div>
                      </div>
                      {model.status === "ready" ? (
                        <div className="text-[var(--luca-success,#4fbf7a)] bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] p-1 rounded-full"><Icon name="CheckCircle" size={10} variant="BoldDuotone" /></div>
                      ) : model.status === "downloading" ? (
                        <div className="animate-spin" style={{ color: theme.hex }}><Icon name="Restart" size={10} variant="BoldDuotone" /></div>
                      ) : model.status === "unsupported" ? (
                        <div className="text-[var(--luca-warning,#f2b23e)] bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)] p-1 rounded-full" title={model.unsupportedReason}><Icon name="Danger" size={10} variant="BoldDuotone" /></div>
                      ) : null}
                    </div>

                    <p 
                      className="text-[9px] line-clamp-2 leading-relaxed mb-1"
                      style={{ color: "var(--app-text-muted)" }}
                    >
                      {model.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className={`text-[7px] px-1.5 py-0.5 rounded border uppercase tracking-[0.12em] ${getCatalogBadgeClass(model.catalogStatus)}`}>
                        {model.catalogStatus || "verified"}
                      </span>
                      {model.catalogWarning && (
                        <span className="text-[8px] text-[var(--luca-warning,#f2b23e)] truncate max-w-[220px]" title={model.catalogWarning}>
                          {model.catalogWarning}
                        </span>
                      )}
                    </div>

                    {model.status === "ready" && model.canary && (
                      <div className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[8px] font-mono mt-1 ${model.canary.passed ? "bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] text-[var(--luca-success,#4fbf7a)]" : "bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)] text-[var(--luca-warning,#f2b23e)]"}`}>
                        {model.canary.passed ? <Icon name="Zap" size={8} variant="BoldDuotone" /> : <Icon name="Danger" size={8} variant="BoldDuotone" />}
                        <span className="truncate max-w-[140px]">&ldquo;{model.canary.response}&rdquo;</span>
                        <span className="opacity-60 flex-shrink-0">({model.canary.latency_ms}ms)</span>
                      </div>
                    )}

                    {ollamaSetupStatus.modelId === model.id && (
                      <div className="flex flex-col gap-1.5 px-1.5 py-2 rounded-md text-[8px] font-mono mt-1 bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)] border border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] text-[var(--luca-info,#4f8cff)]">
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5 capitalize animate-pulse"><Icon name="Zap" size={8} variant="BoldDuotone" />{ollamaSetupStatus.step}</span>
                          {ollamaSetupStatus.progress !== undefined && ollamaSetupStatus.progress > 0 && <span style={{ color: "var(--app-text-main)" }}>{Math.round(ollamaSetupStatus.progress)}%</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t" style={{ borderColor: "var(--app-border-main)" }}>
                    {model.status === "unsupported" ? (
                      <div className="flex-1 text-center text-[9px] text-[var(--luca-warning,#f2b23e)] italic">⚠️ {model.unsupportedReason || "Hardware mismatch"}</div>
                    ) : model.status === "not_downloaded" && !isCatalogInstallable(model) ? (
                      <div className="flex-1 text-center text-[9px] text-[var(--luca-warning,#f2b23e)] italic">Planned / not verified</div>
                    ) : model.status === "not_downloaded" ? (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(model.id);
                        }} 
                        disabled={downloadingId !== null} 
                        className="flex-1 active:scale-95 transition-all text-[9px] font-medium py-1 rounded flex items-center justify-center gap-1.5"
                        style={{ color: "var(--app-text-main)", backgroundColor: "var(--app-bg-tint)" }}
                      >
                        <Icon name="Import" size={10} variant="BoldDuotone" /> Get
                      </button>
                    ) : model.status === "ready" ? (
                      <>
                        {(model.category === "brain" || model.category === "embedding") && (
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSetActive(model.id);
                            }} 
                            className={`flex-1 transition-all text-[9px] font-medium py-1 rounded flex items-center justify-center gap-1.5 border ${
                                (model.category === "brain" ? activeBrainId === model.id : activeEmbedId === model.id) 
                                ? (theme.isLight ? "bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] text-[var(--luca-danger,#f87171)]" : "bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] text-[var(--luca-danger,#f87171)]") 
                                : "bg-transparent border-transparent"}`}
                            style={{ color: (model.category === "brain" ? activeBrainId === model.id : activeEmbedId === model.id) ? undefined : "var(--app-text-muted)" }}
                          >
                            {(model.category === "brain" ? activeBrainId === model.id : activeEmbedId === model.id) ? "Deactivate" : "Activate"}
                          </button>
                        )}
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(model.id);
                          }} 
                          className="px-2 py-1 rounded hover:text-[var(--luca-danger,#f87171)] hover:bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] transition-colors" 
                          style={{ color: "var(--app-text-muted)" }}
                          title="Delete"
                        >
                          <Icon name="Trash" size={10} variant="BoldDuotone" />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCanary(model.id);
                          }} 
                          disabled={canaryTestingId !== null} 
                          className={`px-2 py-1 rounded transition-all ${canaryTestingId === model.id ? "text-[var(--luca-info,#4f8cff)] bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)] animate-pulse" : "hover:text-[var(--luca-info,#4f8cff)] hover:bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)]"}`} 
                          style={{ color: canaryTestingId === model.id ? "var(--app-blue)" : "var(--app-text-muted)" }}
                          title="Test"
                        >
                          <Icon name={canaryTestingId === model.id ? "Restart" : "MagicStick"} size={10} className={canaryTestingId === model.id ? "animate-spin" : ""} variant="BoldDuotone" />
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const ModelManager: React.FC<ModelManagerProps> = ({
  theme = { hex: "#f5d679ff" },
  isMobile,
}) => {
  const [models, setModels] = useState<LocalModel[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [canaryTestingId, setCanaryTestingId] = useState<string | null>(null);
  const [activeBrainId, setActiveBrainId] = useState<string | null>(null);
  const [activeEmbedId, setActiveEmbedId] = useState<string | null>(null);
  const [isOllamaRunning, setIsOllamaRunning] = useState(false);
  const [platform, setPlatform] = useState<"desktop" | "mobile">("desktop");
  const [routeStatus, setRouteStatus] = useState<ModelRouteDecision | null>(null);
  const [settingsRevision, setSettingsRevision] = useState(0);
  const [providerHubConfigureCard, setProviderHubConfigureCard] = useState<ProviderHubPanelCardViewModel | null>(null);
  const [routePreview, setRoutePreview] = useState<RoutePreviewState>({ taskType: "chat", preference: "balanced", preferredProviderId: "", allowFallbacks: true, allowPaidProviders: true, allowLocalProviders: true, allowCloudProviders: true });
  
  useEffect(() => {
    const updatePlatform = () => {
      const isElectron = typeof window !== "undefined" && (window as any).electron;
      const isCapacitor = typeof window !== "undefined" && (window as any).Capacitor;
      
      if (isElectron) {
        setPlatform("desktop");
      } else {
        const isSmallScreen = window.innerWidth < 1024;
        setPlatform(isCapacitor || isSmallScreen ? "mobile" : "desktop");
      }
    };

    updatePlatform();
    window.addEventListener("resize", updatePlatform);
    return () => window.removeEventListener("resize", updatePlatform);
  }, []);

  const [ollamaSetupStatus, setOllamaSetupStatus] = useState<{
    modelId: string | null;
    step: string;
    progress?: number;
  }>({ modelId: null, step: "" });
  const [systemSpecs, setSystemSpecs] = useState<any>(null);

  useEffect(() => {
    const loadModels = async () => {
      const all = await modelManagerService.getModels();
      setModels(all.filter((m: LocalModel) => m.platforms.includes(platform)));
      
      try {
        const specs = await modelManagerService.getSystemSpecs();
        setSystemSpecs(specs);

        const ollama = await modelManagerService.getOllamaModels();
        setIsOllamaRunning(ollama.available);
        const route = await modelReadinessResolver.resolveRoute({ capability: "chat" });
        setRouteStatus(route);
      } catch (e) {
        console.warn("Failed to fetch system specs in UI:", e);
      }
    };

    loadModels();

    const pollId = setInterval(async () => {
      const status = await modelManagerService.getOllamaModels();
      setIsOllamaRunning(status.available);
    }, 10000);

    const settings = settingsService.getSettings();
    if (settings.general) {
        if (settings.general.activeBrainId) {
            setActiveBrainId(settings.general.activeBrainId);
        }
        if (settings.general.activeEmbedId) {
            setActiveEmbedId(settings.general.activeEmbedId);
        } else if (settings.brain.embeddingModel) {
            const id = settings.brain.embeddingModel.includes('/') ? settings.brain.embeddingModel.split('/')[1] : settings.brain.embeddingModel;
            setActiveEmbedId(id);
        }
    }

    const handleSettingsChanged = () => setSettingsRevision((revision) => revision + 1);
    settingsService.on("settings-changed", handleSettingsChanged);

    const unsubscribe = modelManagerService.subscribe((allModels: LocalModel[]) => {
      setModels(allModels.filter((m: LocalModel) => m.platforms.includes(platform)));
    });
    return () => { 
      unsubscribe(); 
      settingsService.off("settings-changed", handleSettingsChanged);
      clearInterval(pollId);
    };
  }, [platform]);

  const handleDownload = useCallback(async (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return;

    setDownloadingId(modelId);
    try {
      if (model.runtime === "ollama") {
        setOllamaSetupStatus({ modelId, step: "Initializing..." });
        await modelManagerService.downloadModel(modelId, (step: string, p: number) => {
          setOllamaSetupStatus(s => ({ ...s, step, progress: p }));
        });
      } else {
        await modelManagerService.downloadModel(modelId);
      }
    } catch (e) {
      console.error("[UI] Download failed:", e);
    } finally {
      setDownloadingId(null);
      setOllamaSetupStatus({ modelId: null, step: "" });
    }
  }, [models]);

  const handleDelete = useCallback(async (modelId: string) => {
    const model = models.find((m) => m.id === modelId);
    if (!model) return;
    const confirmed = window.confirm(`Irreversibly purge ${model.name} from local storage?`);
    if (!confirmed) return;
    await modelManagerService.deleteModel(modelId);
  }, [models]);

  const handleSetActive = useCallback(async (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return;

    if (model.category === "brain") {
        const nextId = activeBrainId === modelId ? null : modelId;
        setActiveBrainId(nextId);
        await modelManagerService.activateModel(nextId, "brain");
    } else if (model.category === "embedding") {
        const nextId = activeEmbedId === modelId ? null : modelId;
        setActiveEmbedId(nextId);
        await modelManagerService.activateModel(nextId, "embedding");
    }
  }, [activeBrainId, activeEmbedId, models]);

  const handleCanary = useCallback(async (modelId: string) => {
    setCanaryTestingId(modelId);
    await modelManagerService.runCanary(modelId);
    setCanaryTestingId(null);
  }, []);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "Chat Brain (via Ollama)": true,
    "Memory Gateway (RAG)": true,
  });

  const toggleSection = useCallback((title: string) => {
    setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }));
  }, []);

  const brainModels = useMemo(() => models.filter(m => m.category === "brain"), [models]);
  const visionModels = useMemo(() => models.filter(m => m.category === "vision"), [models]);
  const sttModels = useMemo(() => models.filter(m => m.category === "stt"), [models]);
  const ttsModels = useMemo(() => models.filter(m => m.category === "tts"), [models]);
  const embedModels = useMemo(() => models.filter(m => m.category === "embedding"), [models]);

  const currentSettings = settingsService.getSettings();
  const providerHubRuntimeRouteSelectionEnabled = Boolean(currentSettings.providerHub?.runtimeRouteSelectionEnabled);
  const providerHubRuntimeRouteKillSwitchEnabled = Boolean(currentSettings.providerHub?.runtimeRouteKillSwitchEnabled);
  const providerHubSnapshots = useMemo(() => createProviderHubSettingsSnapshots({ settings: settingsService.getSettings(), ollamaAvailable: isOllamaRunning }), [activeBrainId, isOllamaRunning, settingsRevision]);

  const providerHubViewModel = useMemo(() => createProviderHubPanelViewModel(providerHubSnapshots), [providerHubSnapshots]);

  const routePreviewPolicy = useMemo(() => resolveProviderHubTaskRoutePolicy({ taskType: routePreview.taskType, preferenceOverride: routePreview.preference, allowFallbacksOverride: routePreview.allowFallbacks, allowPaidProvidersOverride: routePreview.allowPaidProviders, allowLocalProvidersOverride: routePreview.allowLocalProviders, allowCloudProvidersOverride: routePreview.allowCloudProviders }), [routePreview]);

  const routePreviewDecision = useMemo(() => createProviderHubRouteDecision(createProviderHubRouteRequestFromPolicy(routePreviewPolicy, {
    connectionSnapshots: providerHubSnapshots,
    preferredProviderId: routePreview.preferredProviderId || undefined,
  })), [providerHubSnapshots, routePreview.preferredProviderId, routePreviewPolicy]);

  const runtimeDryRunComparison = useMemo(() => createProviderHubRuntimeDryRunComparison({
    currentProviderId: routeStatus?.provider,
    currentRouteMode: routeStatus?.mode,
    currentModelId: routeStatus?.model,
    taskType: routePreviewPolicy.taskType,
    requiredCapabilities: routePreviewPolicy.requiredCapabilities,
    routePreference: routePreviewPolicy.preference,
    connectionSnapshots: providerHubSnapshots,
    preferredProviderId: routePreview.preferredProviderId || undefined,
    allowFallbacks: routePreviewPolicy.allowFallbacks,
    allowPaidProviders: routePreviewPolicy.allowPaidProviders,
    allowLocalProviders: routePreviewPolicy.allowLocalProviders,
    allowCloudProviders: routePreviewPolicy.allowCloudProviders,
  }), [providerHubSnapshots, routePreview, routeStatus]);

  const shadowRouteTrace = useMemo(() => createProviderHubShadowRouteTrace({
    currentProviderId: routeStatus?.provider,
    currentRouteMode: routeStatus?.mode,
    currentModelId: routeStatus?.model,
    taskType: routePreviewPolicy.taskType,
    requiredCapabilities: routePreviewPolicy.requiredCapabilities,
    routePreference: routePreviewPolicy.preference,
    connectionSnapshots: providerHubSnapshots,
    preferredProviderId: routePreview.preferredProviderId || undefined,
    allowFallbacks: routePreviewPolicy.allowFallbacks,
    allowPaidProviders: routePreviewPolicy.allowPaidProviders,
    allowLocalProviders: routePreviewPolicy.allowLocalProviders,
    allowCloudProviders: routePreviewPolicy.allowCloudProviders,
    trigger: routeStatus ? "runtime_route_status" : "model_manager_preview",
    observedAt: new Date().toISOString(),
  }), [providerHubSnapshots, routePreview, routeStatus]);

  const taskRouteDiagnosticsMatrix = useMemo(() => createProviderHubTaskRouteDiagnosticsMatrix({
    connectionSnapshots: providerHubSnapshots,
    preferredProviderId: routePreview.preferredProviderId || undefined,
    runtimeRouteSelectionEnabled: providerHubRuntimeRouteSelectionEnabled,
    observedAt: new Date().toISOString(),
  }), [providerHubRuntimeRouteSelectionEnabled, providerHubSnapshots, routePreview.preferredProviderId]);

  const runtimeRouteSelection = useMemo(() => selectProviderHubRuntimeRoute({
    runtimeRouteSelectionEnabled: providerHubRuntimeRouteSelectionEnabled,
    currentProviderId: routeStatus?.provider,
    currentModelId: routeStatus?.model,
    taskType: routePreviewPolicy.taskType,
    requiredCapabilities: routePreviewPolicy.requiredCapabilities,
    routePreference: routePreviewPolicy.preference,
    connectionSnapshots: providerHubSnapshots,
    preferredProviderId: routePreview.preferredProviderId || undefined,
    allowFallbacks: routePreviewPolicy.allowFallbacks,
    allowPaidProviders: routePreviewPolicy.allowPaidProviders,
    allowLocalProviders: routePreviewPolicy.allowLocalProviders,
    allowCloudProviders: routePreviewPolicy.allowCloudProviders,
  }), [providerHubRuntimeRouteSelectionEnabled, providerHubSnapshots, routePreview, routeStatus]);

  const handleRuntimeRouteSelectionToggle = useCallback(async (enabled: boolean) => {
    const existing = settingsService.getSettings().providerHub ?? {};
    await settingsService.saveSettings({ providerHub: { ...existing, runtimeRouteSelectionEnabled: enabled } });
    setSettingsRevision((revision) => revision + 1);
  }, []);

  const handleRuntimeRouteKillSwitchToggle = useCallback(async (enabled: boolean) => {
    const existing = settingsService.getSettings().providerHub ?? {};
    await settingsService.saveSettings({ providerHub: { ...existing, runtimeRouteKillSwitchEnabled: enabled } });
    setSettingsRevision((revision) => revision + 1);
  }, []);

  const handleProviderHubConfigure = useCallback((card: ProviderHubPanelCardViewModel) => {
    setProviderHubConfigureCard(card);
  }, []);

  const activeProviderHubIntent = providerHubConfigureCard ? createProviderHubConfigureIntentFromCard(providerHubConfigureCard) : null;

  return (
    <div className="flex flex-col min-h-[500px] rounded-xl overflow-hidden" style={{ backgroundColor: "var(--app-bg-main, #09090b)" }}>
      {/* HEADER WITH HARDWARE HEALTH */}
      <div className={`${isMobile ? "p-4 py-8 flex-col gap-4" : "p-6 justify-between items-center"} border-b flex`}
           style={{ borderColor: "var(--app-border-main)", backgroundColor: "var(--app-bg-tint)" }}>
        <div className="min-w-0">
          <h2 
            className={`${isMobile ? "text-lg" : "text-xl"} font-bold flex items-center gap-2 truncate`}
            style={{ color: "var(--app-text-main)" }}
          >
            <Icon name="Cpu" size={isMobile ? 18 : 20} className="text-[var(--luca-info,#4f8cff)] flex-shrink-0" variant="BoldDuotone" />
            Sovereign Intelligence
          </h2>
          <p 
            className={`${isMobile ? "text-[10px]" : "text-xs"} mt-1 truncate opacity-70`}
            style={{ color: "var(--app-text-muted)" }}
          >
            Manage and optimize local models for your hardware.
          </p>
        </div>
        
        <div className={`flex flex-col ${isMobile ? "items-start" : "items-end"} gap-1.5`}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)] animate-pulse" />
            <span 
                className="text-[9px] uppercase tracking-[0.3em] font-black"
                style={{ color: "var(--app-text-muted)" }}
            >
                Hardware Telemetry
            </span>
          </div>
          {systemSpecs ? (
            <div className={`flex flex-col ${isMobile ? "items-start" : "items-end"} gap-1`}>
              <div className="flex items-center gap-3">
                 <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                       style={{ backgroundColor: "var(--app-bg-tint)", borderColor: "var(--app-border-main)", color: (systemSpecs.memory?.total < 8_000_000_000) ? '#f87171' : 'var(--app-text-main)' }}>
                    {Math.round(systemSpecs.memory?.total / 1e9)}GB RAM
                 </span>
                 <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                       style={{ backgroundColor: "var(--app-bg-tint)", borderColor: "var(--app-border-main)", color: "var(--app-text-main)" }}>
                    {systemSpecs.gpu?.split('(')[0].trim() || 'Core_Compute'}
                 </span>
              </div>
              {systemSpecs.isIntelMac && (
                <div className="flex items-center gap-1 text-[8px] text-[var(--luca-warning,#f2b23e)] font-black uppercase bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)] px-1.5 py-0.5 rounded border border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] mt-1">
                  <Icon name="Danger" size={8} variant="BoldDuotone" />
                  Legacy Intel Architecture Detection
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
                <div className="w-12 h-3 bg-white/5 animate-pulse rounded" />
                <div className="w-20 h-3 bg-white/5 animate-pulse rounded" />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <ProviderHubPanel viewModel={providerHubViewModel} routeDecision={routePreviewDecision} dryRunComparison={runtimeDryRunComparison} shadowTrace={shadowRouteTrace} runtimeSelection={runtimeRouteSelection} taskRouteMatrix={taskRouteDiagnosticsMatrix} runtimeRouteSelectionEnabled={providerHubRuntimeRouteSelectionEnabled} runtimeRouteKillSwitchEnabled={providerHubRuntimeRouteKillSwitchEnabled} onRuntimeRouteSelectionEnabledChange={handleRuntimeRouteSelectionToggle} onRuntimeRouteKillSwitchEnabledChange={handleRuntimeRouteKillSwitchToggle} routePreview={routePreview} onRoutePreviewChange={setRoutePreview} theme={theme} isMobile={isMobile} onConfigure={handleProviderHubConfigure} />
        {providerHubConfigureCard && activeProviderHubIntent && (
          <ProviderHubConfigurationPanel
            card={providerHubConfigureCard}
            intent={activeProviderHubIntent}
            theme={theme}
            onClose={() => setProviderHubConfigureCard(null)}
            onSaved={() => setSettingsRevision((revision) => revision + 1)}
          />
        )}

        {routeStatus && (
          <div className="mb-4 rounded-xl border p-3" style={{ borderColor: "var(--app-border-main)", backgroundColor: "var(--app-bg-tint)" }}>
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--app-text-main)" }}>Active chat route</span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono ${routeStatus.readiness === "ready" ? "bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] text-[var(--luca-success,#4fbf7a)]" : "bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)] text-[var(--luca-warning,#f2b23e)]"}`}>
                {routeStatus.mode} / {routeStatus.readiness}
              </span>
            </div>
            <p className="text-[10px] leading-relaxed" style={{ color: "var(--app-text-muted)" }}>{routeStatus.reason}</p>
          </div>
        )}
        <RenderGrid 
          title="Chat Brain (via Ollama)" 
          items={brainModels} 
          isExpanded={!!expandedSections["Chat Brain (via Ollama)"]}
          onToggle={() => toggleSection("Chat Brain (via Ollama)")}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onSetActive={handleSetActive}
          onCanary={handleCanary}
          activeBrainId={activeBrainId}
          activeEmbedId={activeEmbedId}
          downloadingId={downloadingId}
          canaryTestingId={canaryTestingId}
          ollamaSetupStatus={ollamaSetupStatus}
          theme={theme}
          isMobile={isMobile}
        />
        <RenderGrid 
          title="Vision & Astra Scan" 
          items={visionModels} 
          isExpanded={!!expandedSections["Vision & Astra Scan"]}
          onToggle={() => toggleSection("Vision & Astra Scan")}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onSetActive={handleSetActive}
          onCanary={handleCanary}
          activeBrainId={activeBrainId}
          activeEmbedId={activeEmbedId}
          downloadingId={downloadingId}
          canaryTestingId={canaryTestingId}
          ollamaSetupStatus={ollamaSetupStatus}
          theme={theme}
          isMobile={isMobile}
        />
        <RenderGrid 
          title="Listening (STT)" 
          items={sttModels} 
          isExpanded={!!expandedSections["Listening (STT)"]}
          onToggle={() => toggleSection("Listening (STT)")}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onSetActive={handleSetActive}
          onCanary={handleCanary}
          activeBrainId={activeBrainId}
          activeEmbedId={activeEmbedId}
          downloadingId={downloadingId}
          canaryTestingId={canaryTestingId}
          ollamaSetupStatus={ollamaSetupStatus}
          theme={theme}
          isMobile={isMobile}
        />
        <RenderGrid 
          title="Voice (TTS)" 
          items={ttsModels} 
          isExpanded={!!expandedSections["Voice (TTS)"]}
          onToggle={() => toggleSection("Voice (TTS)")}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onSetActive={handleSetActive}
          onCanary={handleCanary}
          activeBrainId={activeBrainId}
          activeEmbedId={activeEmbedId}
          downloadingId={downloadingId}
          canaryTestingId={canaryTestingId}
          ollamaSetupStatus={ollamaSetupStatus}
          theme={theme}
          isMobile={isMobile}
        />
        <RenderGrid 
          title="Memory Gateway (RAG)" 
          items={embedModels} 
          compact 
          isExpanded={!!expandedSections["Memory Gateway (RAG)"]}
          onToggle={() => toggleSection("Memory Gateway (RAG)")}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onSetActive={handleSetActive}
          onCanary={handleCanary}
          activeBrainId={activeBrainId}
          activeEmbedId={activeEmbedId}
          downloadingId={downloadingId}
          canaryTestingId={canaryTestingId}
          ollamaSetupStatus={ollamaSetupStatus}
          theme={theme}
          isMobile={isMobile}
        />
        
        {/* OLLAMA RUNTIME STATUS */}
        <div className="mt-4 rounded-xl border p-4" style={{ borderColor: "var(--app-border-main)", backgroundColor: "var(--app-bg-tint)" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon name="Zap" size={16} className="text-[var(--luca-info,#4f8cff)]" variant="BoldDuotone" />
              <span 
                className="text-xs font-bold"
                style={{ color: "var(--app-text-main)" }}
              >
                Ollama Runtime
              </span>
            </div>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${isOllamaRunning ? 'bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] text-[var(--luca-success,#4fbf7a)]' : 'bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] text-[var(--luca-danger,#f87171)]'}`}>
              {isOllamaRunning ? 'Daemon Online' : 'Daemon Offline'}
            </span>
          </div>
          <p 
            className="text-[10px] leading-relaxed"
            style={{ color: "var(--app-text-muted)" }}
          >
            Sovereign Brain operations require the Ollama daemon to be active. 
            Ensure your local server is running for autonomous reasoning.
          </p>
        </div>
      </div>
    </div>
  );
};
