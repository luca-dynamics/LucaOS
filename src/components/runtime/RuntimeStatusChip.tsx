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
  ready: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
  warning: "text-amber-300 border-amber-500/20 bg-amber-500/10",
  blocked: "text-red-300 border-red-500/20 bg-red-500/10",
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

  const severity = diagnostics?.summary.severity || "unknown";
  const label =
    loading && !diagnostics
      ? "Runtime check"
      : diagnostics?.summary.headline || "Runtime unknown";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono font-black uppercase tracking-widest ${compact ? "text-[8px]" : "text-[9px]"} ${SEVERITY_CLASS[severity]} ${className}`}
      title={diagnostics?.summary.description || "Checking Luca runtime status"}
    >
      <Icon
        name={iconForSeverity(severity)}
        size={compact ? 10 : 12}
        variant="Linear"
        className={loading ? "animate-pulse" : ""}
      />
      <span className="truncate max-w-[180px]">{label}</span>
    </div>
  );
};

export default RuntimeStatusChip;
