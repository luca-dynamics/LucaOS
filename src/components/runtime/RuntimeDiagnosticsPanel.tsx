import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "../ui/Icon";
import {
  getVisibleMemoryDiagnosticsForAudience,
  getVisibleRuntimeRoutesForAudience,
  runtimeDiagnosticsService,
  type RuntimeDiagnostics,
  type RuntimeDiagnosticsAudience,
  type RuntimeMemoryDiagnostics,
  type RuntimeReadinessSeverity,
  type RuntimeRouteDiagnostics,
} from "../../services/runtime/RuntimeDiagnosticsService";

interface RuntimeDiagnosticsPanelProps {
  audience?: RuntimeDiagnosticsAudience;
  diagnostics?: RuntimeDiagnostics | null;
  title?: string;
  onAction?: (actionId: string) => void;
  className?: string;
}

const BADGE_CLASS: Record<RuntimeReadinessSeverity, string> = {
  ready: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  blocked: "bg-red-500/10 text-red-300 border-red-500/20",
  unknown: "bg-white/5 text-[var(--app-text-muted)] border-white/10",
};

function formatValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (value === undefined || value === null || value === "") return "none";
  return String(value).replace(/_/g, " ");
}

const RouteCard: React.FC<{
  route: RuntimeRouteDiagnostics;
  audience: RuntimeDiagnosticsAudience;
}> = ({ route, audience }) => {
  const showAdvanced = audience === "origin";
  const showTactical = audience === "tactical" || audience === "origin";

  return (
    <div
      className="rounded-xl border p-3"
      style={{
        borderColor: "var(--app-border-main)",
        backgroundColor: "var(--app-bg-tint)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--app-text-main)" }}>
            {route.label}
          </div>
          <div className="mt-1 text-[10px] leading-relaxed" style={{ color: "var(--app-text-muted)" }}>
            {showTactical ? `${route.mode} · ${route.provider} · ${route.model}` : route.reason}
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-mono uppercase ${BADGE_CLASS[route.severity]}`}>
          {route.readiness.replace(/_/g, " ")}
        </span>
      </div>

      {showTactical && (
        <p className="mt-2 text-[10px] leading-relaxed" style={{ color: "var(--app-text-muted)" }}>
          {route.reason}
        </p>
      )}

      {route.warnings.length > 0 && (
        <ul className="mt-2 space-y-1 text-[10px]" style={{ color: "var(--app-text-muted)" }}>
          {route.warnings.map((warning, index) => (
            <li key={`${route.capability}-warning-${index}`} className="flex gap-2">
              <span className="text-amber-300">•</span>
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      )}

      {showAdvanced && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-[9px] uppercase tracking-widest" style={{ borderColor: "var(--app-border-main)", color: "var(--app-text-muted)" }}>
          <div>Privacy: {formatValue(route.privacy)}</div>
          <div>Network: {formatValue(route.networkAllowed)}</div>
          <div>Fallback: {formatValue(route.fallbackPolicy)}</div>
          <div>Key: {formatValue(route.keySource)}</div>
          <div>Runtime: {formatValue(route.runtime)}</div>
          <div>Capability: {formatValue(route.capability)}</div>
        </div>
      )}
    </div>
  );
};

const MemoryCard: React.FC<{
  memory: RuntimeMemoryDiagnostics;
  audience: RuntimeDiagnosticsAudience;
}> = ({ memory, audience }) => {
  const showAdvanced = audience === "origin";
  const showTactical = audience === "tactical" || audience === "origin";

  return (
    <div
      className="rounded-xl border p-3"
      style={{
        borderColor: "var(--app-border-main)",
        backgroundColor: "var(--app-bg-tint)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--app-text-main)" }}>
            {memory.label}
          </div>
          <div className="mt-1 text-[10px] leading-relaxed" style={{ color: "var(--app-text-muted)" }}>
            {showTactical
              ? `${memory.mode} · ${memory.provider} · ${memory.embeddingModel}`
              : memory.reason}
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-mono uppercase ${BADGE_CLASS[memory.severity]}`}>
          {memory.readiness.replace(/_/g, " ")}
        </span>
      </div>

      {showTactical && (
        <p className="mt-2 text-[10px] leading-relaxed" style={{ color: "var(--app-text-muted)" }}>
          {memory.reason}
        </p>
      )}

      {memory.warnings.length > 0 && (
        <ul className="mt-2 space-y-1 text-[10px]" style={{ color: "var(--app-text-muted)" }}>
          {memory.warnings.map((warning, index) => (
            <li key={`memory-warning-${index}`} className="flex gap-2">
              <span className="text-amber-300">•</span>
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      )}

      {showAdvanced && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-[9px] uppercase tracking-widest" style={{ borderColor: "var(--app-border-main)", color: "var(--app-text-muted)" }}>
          <div>Privacy: {formatValue(memory.privacy)}</div>
          <div>Network: {formatValue(memory.networkAllowed)}</div>
          <div>Fallback: {formatValue(memory.fallbackPolicy)}</div>
          <div>Vector: {formatValue(memory.vectorStore)}</div>
          <div>Local model: {formatValue(memory.localEmbeddingModelInstalled)}</div>
          <div>Runtime: {formatValue(memory.localRuntimeAvailable)}</div>
        </div>
      )}
    </div>
  );
};

export const RuntimeDiagnosticsPanel: React.FC<RuntimeDiagnosticsPanelProps> = ({
  audience: forcedAudience,
  diagnostics: externalDiagnostics,
  title = "Runtime Status",
  onAction,
  className = "",
}) => {
  const [diagnostics, setDiagnostics] = useState<RuntimeDiagnostics | null>(
    externalDiagnostics || null,
  );
  const [loading, setLoading] = useState(!externalDiagnostics);

  const refresh = async () => {
    try {
      setLoading(true);
      const next = await runtimeDiagnosticsService.getDiagnostics();
      setDiagnostics(next);
    } catch (error) {
      console.warn("[RuntimeDiagnosticsPanel] Failed to refresh diagnostics", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (externalDiagnostics) {
      setDiagnostics(externalDiagnostics);
      return;
    }
    refresh();
  }, [externalDiagnostics]);

  const audience = forcedAudience || diagnostics?.audience || "normal";
  const routes = useMemo(() => (diagnostics ? Object.values(diagnostics.routes) : []), [diagnostics]);
  const visibleRoutes = getVisibleRuntimeRoutesForAudience(routes, audience);
  const visibleMemory = diagnostics
    ? getVisibleMemoryDiagnosticsForAudience(diagnostics.memory, audience)
    : null;

  if (audience === "normal" && diagnostics?.summary.severity === "ready" && diagnostics.onboardingWarnings.length === 0) {
    return null;
  }

  return (
    <section className={`space-y-3 ${className}`}>
      <div
        className="rounded-xl border p-3"
        style={{
          borderColor: "var(--app-border-main)",
          backgroundColor: "var(--app-bg-tint)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon name="Activity" size={14} variant="BoldDuotone" />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--app-text-main)" }}>
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-widest transition hover:bg-white/5"
            style={{ borderColor: "var(--app-border-main)", color: "var(--app-text-muted)" }}
          >
            {loading ? "Checking" : "Retry"}
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[12px] font-black uppercase tracking-widest" style={{ color: "var(--app-text-main)" }}>
              {diagnostics?.summary.headline || "Runtime status unavailable"}
            </div>
            <p className="mt-1 text-[10px] leading-relaxed" style={{ color: "var(--app-text-muted)" }}>
              {diagnostics?.summary.description || "Luca could not load route diagnostics yet."}
            </p>
          </div>
          {diagnostics && (
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-mono uppercase ${BADGE_CLASS[diagnostics.summary.severity]}`}>
              {diagnostics.summary.severity}
            </span>
          )}
        </div>
      </div>

      {visibleRoutes.length > 0 || visibleMemory ? (
        <div className="space-y-2">
          {visibleMemory && <MemoryCard memory={visibleMemory} audience={audience} />}
          {visibleRoutes.map((route) => (
            <RouteCard key={route.capability} route={route} audience={audience} />
          ))}
        </div>
      ) : (
        audience === "normal" && diagnostics && (
          <div className="rounded-xl border p-3 text-[10px]" style={{ borderColor: "var(--app-border-main)", backgroundColor: "var(--app-bg-tint)", color: "var(--app-text-muted)" }}>
            Luca's runtime routes look ready. No setup action is needed.
          </div>
        )
      )}

      {diagnostics && audience !== "normal" && (
        <div className="rounded-xl border p-3 text-[10px]" style={{ borderColor: "var(--app-border-main)", backgroundColor: "var(--app-bg-tint)", color: "var(--app-text-muted)" }}>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--app-text-main)" }}>
            Local runtime
          </div>
          <div className="grid grid-cols-2 gap-2 uppercase tracking-widest">
            <div>Ollama: {diagnostics.localRuntime.ollama.available ? "online" : "offline"}</div>
            <div>Ollama models: {diagnostics.localRuntime.ollama.installedModelCount}</div>
            <div>Installed: {formatValue(diagnostics.localRuntime.ollama.installed)}</div>
            <div>Cortex: {formatValue(diagnostics.localRuntime.cortex.available)}</div>
          </div>
          {audience === "origin" && (
            <div className="mt-3 border-t pt-3 uppercase tracking-widest" style={{ borderColor: "var(--app-border-main)" }}>
              Key sources: {diagnostics.keyReadiness.sources.join(", ")}
              {diagnostics.keyReadiness.missingProviders.length > 0
                ? ` · Missing: ${diagnostics.keyReadiness.missingProviders.join(", ")}`
                : " · Ready"}
            </div>
          )}
        </div>
      )}

      {diagnostics && diagnostics.onboardingWarnings.length > 0 && (
        <div className="rounded-xl border p-3" style={{ borderColor: "var(--app-border-main)", backgroundColor: "var(--app-bg-tint)" }}>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--app-text-main)" }}>
            Onboarding warnings
          </div>
          <ul className="mt-2 space-y-1 text-[10px]" style={{ color: "var(--app-text-muted)" }}>
            {diagnostics.onboardingWarnings.map((warning, index) => (
              <li key={`onboarding-warning-${index}`}>• {warning.capability}: {warning.reason}</li>
            ))}
          </ul>
        </div>
      )}

      {diagnostics && diagnostics.recommendedActions.length > 0 && diagnostics.recommendedActions[0].id !== "none" && (
        <div className="rounded-xl border p-3" style={{ borderColor: "var(--app-border-main)", backgroundColor: "var(--app-bg-tint)" }}>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--app-text-main)" }}>
            Recommended actions
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {diagnostics.recommendedActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => onAction?.(action.id)}
                title={action.description}
                className="rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest transition hover:bg-white/5"
                style={{ borderColor: "var(--app-border-main)", color: "var(--app-text-main)" }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default RuntimeDiagnosticsPanel;
