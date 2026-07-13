import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import {
  runtimeDiagnosticsService,
  type RuntimeDiagnostics,
  type RuntimeReadinessSeverity,
} from "../../services/runtime/RuntimeDiagnosticsService";

interface RuntimeStatusChipProps {
  diagnostics?: RuntimeDiagnostics | null;
  onDiagnosticsChange?: (diagnostics: RuntimeDiagnostics) => void;
  refreshMs?: number;
  className?: string;
  compact?: boolean;
}

const SEVERITY_CLASS: Record<RuntimeReadinessSeverity, string> = {
  ready: "text-[var(--luca-success,#4fbf7a)] border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)]",
  warning: "text-[var(--luca-warning,#f2b23e)] border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]",
  blocked: "text-[var(--luca-danger,#f87171)] border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]",
  unknown: "text-slate-300 border-white/10 bg-white/5",
};

function iconForSeverity(severity: RuntimeReadinessSeverity) {
  if (severity === "ready") return "CheckCircle";
  if (severity === "blocked") return "Danger";
  if (severity === "warning") return "Danger";
  return "Activity";
}

export const RuntimeStatusChip: React.FC<RuntimeStatusChipProps> = ({
  diagnostics: externalDiagnostics,
  onDiagnosticsChange,
  refreshMs = 30000,
  className = "",
  compact = false,
}) => {
  const [diagnostics, setDiagnostics] = useState<RuntimeDiagnostics | null>(
    externalDiagnostics || null,
  );
  const [loading, setLoading] = useState(!externalDiagnostics);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (externalDiagnostics) setDiagnostics(externalDiagnostics);
  }, [externalDiagnostics]);

  useEffect(() => {
    if (externalDiagnostics) return;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const refresh = async () => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      try {
        setLoading(true);
        const next = await runtimeDiagnosticsService.getDiagnostics();
        if (cancelled) return;
        setDiagnostics(next);
        onDiagnosticsChange?.(next);
      } catch (error) {
        console.warn("[RuntimeStatusChip] Failed to refresh diagnostics", error);
      } finally {
        refreshingRef.current = false;
        if (!cancelled) setLoading(false);
      }
    };

    refresh();
    if (refreshMs > 0) intervalId = setInterval(refresh, refreshMs);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [externalDiagnostics, onDiagnosticsChange, refreshMs]);

  const continuityState = diagnostics?.governance.runtimeContinuity.lifecycleState;
  const governanceQuarantine = (diagnostics?.governance.runtimeContinuity.quarantinedItemCount ?? 0) > 0;
  const governancePending = (diagnostics?.governance.runtimeContinuity.pendingApprovalCount ?? 0) > 0;
  const severity: RuntimeReadinessSeverity = governanceQuarantine || continuityState === "quarantined"
    ? "blocked"
    : governancePending || continuityState === "degraded"
      ? "warning"
      : diagnostics?.summary.severity || "unknown";
  const label =
    loading && !diagnostics
      ? "Runtime check"
      : governanceQuarantine || continuityState === "quarantined"
        ? "Runtime review"
        : governancePending || continuityState === "degraded"
          ? "Runtime approval"
          : diagnostics?.summary.headline || "Runtime unknown";

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${compact ? "text-[11px]" : "text-[12px]"} ${SEVERITY_CLASS[severity]} ${className}`}
      title={diagnostics?.summary.description || "Checking Luca runtime status"}
    >
      <Icon
        name={iconForSeverity(severity)}
        size={compact ? 12 : 13}
        variant="Linear"
        className={loading ? "animate-pulse" : ""}
      />
      <span className="truncate max-w-[180px]">{label}</span>
    </div>
  );
};

export default RuntimeStatusChip;
