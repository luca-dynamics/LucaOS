import React, { useEffect, useState } from "react";
import { Icon } from "../ui/Icon";
import {
  runtimeDiagnosticsService,
  type RuntimeDiagnostics,
  type RuntimeReadinessSeverity,
} from "../../services/runtime/RuntimeDiagnosticsService";
import { getGovernancePendingApprovalCount } from "../runtime/RuntimeDiagnosticsPanel";

interface SystemHealthCardProps {
  connectionTier: "LAN" | "LOCAL" | "CLOUD" | "OFFLINE";
}

const SEVERITY_DOT: Record<RuntimeReadinessSeverity, string> = {
  ready: "bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)]",
  warning: "bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]",
  blocked: "bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]",
  unknown: "bg-white/30",
};

function worstSeverity(
  ...values: RuntimeReadinessSeverity[]
): RuntimeReadinessSeverity {
  const order: RuntimeReadinessSeverity[] = [
    "ready",
    "unknown",
    "warning",
    "blocked",
  ];
  return values.reduce(
    (worst, value) =>
      order.indexOf(value) > order.indexOf(worst) ? value : worst,
    "ready" as RuntimeReadinessSeverity,
  );
}

const HealthRow: React.FC<{
  label: string;
  value: string;
  severity: RuntimeReadinessSeverity;
}> = ({ label, value, severity }) => (
  <div className="flex items-center justify-between gap-2">
    <span
      className="text-[10px] font-medium tracking-tight"
      style={{ color: "var(--app-text-muted)" }}
    >
      {label}
    </span>
    <span className="flex items-center gap-1.5 min-w-0">
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${SEVERITY_DOT[severity]}`} />
      <span
        className="text-[10px] font-semibold tracking-tight truncate"
        style={{ color: "var(--app-text-main)" }}
      >
        {value}
      </span>
    </span>
  </div>
);

/**
 * Compact, at-a-glance system health for the top of the left rail. It answers
 * the quick questions (online? degraded? active route? memory/voice ready?
 * continuity loop running? pending approvals?) without duplicating the full
 * right-panel control plane. Backed by RuntimeDiagnosticsService; rendering is
 * read-only and never triggers execution.
 */
const SystemHealthCard: React.FC<SystemHealthCardProps> = ({ connectionTier }) => {
  const [diagnostics, setDiagnostics] = useState<RuntimeDiagnostics | null>(null);

  useEffect(() => {
    let cancelled = false;
    runtimeDiagnosticsService
      .getDiagnostics()
      .then((next) => {
        if (!cancelled) setDiagnostics(next);
      })
      .catch((error) => {
        console.warn("[SystemHealthCard] Failed to load diagnostics", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const online = connectionTier !== "OFFLINE";
  const summary = diagnostics?.summary;
  const chat = diagnostics?.routes.chat;
  const memory = diagnostics?.memory;
  const voiceSeverity = diagnostics
    ? worstSeverity(diagnostics.routes.stt.severity, diagnostics.routes.tts.severity)
    : "unknown";
  const loopRunning = Boolean(
    diagnostics?.governance.runtimeContinuity.loopStatus?.running,
  );
  const pendingApprovals = diagnostics
    ? getGovernancePendingApprovalCount(diagnostics.governance)
    : 0;

  return (
    <div
      className="rounded-xl border p-3 space-y-2"
      style={{
        borderColor: "var(--app-border-main)",
        backgroundColor: "var(--app-bg-tint)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name="Pulse" size={14} variant="BoldDuotone" />
          <h3
            className="text-xs font-semibold tracking-tight"
            style={{ color: "var(--app-text-main)" }}
          >
            System health
          </h3>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${
            online
              ? "bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] text-[var(--luca-success,#4fbf7a)] border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)]"
              : "bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] text-[var(--luca-danger,#f87171)] border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)]"
          }`}
        >
          {online ? "Online" : "Offline"}
        </span>
      </div>

      <div className="space-y-1.5">
        <HealthRow
          label="Runtime"
          value={summary ? summary.severity : "checking"}
          severity={summary?.severity ?? "unknown"}
        />
        <HealthRow
          label="Route"
          value={chat ? `${connectionTier} · ${chat.mode}` : connectionTier}
          severity={chat?.severity ?? "unknown"}
        />
        <HealthRow
          label="Memory"
          value={memory ? memory.readiness.replace(/_/g, " ") : "checking"}
          severity={memory?.severity ?? "unknown"}
        />
        <HealthRow
          label="Voice"
          value={
            diagnostics
              ? voiceSeverity === "ready"
                ? "ready"
                : voiceSeverity
              : "checking"
          }
          severity={voiceSeverity}
        />
        <HealthRow
          label="Continuity"
          value={loopRunning ? "running" : "idle"}
          severity={loopRunning ? "ready" : "unknown"}
        />
        <HealthRow
          label="Approvals"
          value={pendingApprovals > 0 ? `${pendingApprovals} pending` : "none"}
          severity={pendingApprovals > 0 ? "warning" : "ready"}
        />
      </div>
    </div>
  );
};

export default SystemHealthCard;
