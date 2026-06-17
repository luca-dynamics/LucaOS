import type { MemoryNode, ToolExecutionLog } from "../../types";
import type { DashboardRightPanelMode } from "../../experience/dashboardDisclosure";

export type RightPanelMode = DashboardRightPanelMode;

export const RIGHT_PANEL_MODES: RightPanelMode[] = [
  "CONTROL",
  "ACTIVITY",
  "MEMORY",
  "LOGS",
];

// Friendly, calm labels shared by desktop and mobile right-panel tabs.
// Keeps the raw mode enums (CONTROL/ACTIVITY/MEMORY/LOGS) for state/logic
// while presenting human, sentence-case names in the UI.
export const RIGHT_PANEL_LABELS: Record<RightPanelMode, string> = {
  CONTROL: "Overview",
  ACTIVITY: "Timeline",
  MEMORY: "Memory",
  LOGS: "Trace",
};

export const MOBILE_RIGHT_PANEL_LABELS: Record<RightPanelMode, string> =
  RIGHT_PANEL_LABELS;

export function isRightPanelMode(value: string): value is RightPanelMode {
  return RIGHT_PANEL_MODES.includes(value as RightPanelMode);
}

export function normalizeRightPanelMode(value: string | undefined): RightPanelMode {
  return value && isRightPanelMode(value) ? value : "CONTROL";
}

export function formatCount(noun: string, count: number): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function friendlyRuntimeHeadline(input: {
  lifecycleState?: string;
  pendingApprovals?: number;
  memoryReady?: boolean;
  quarantinedItems?: number;
}): string {
  if ((input.quarantinedItems ?? 0) > 0 || input.lifecycleState === "quarantined") {
    return "Runtime degraded — review needed";
  }
  if (input.lifecycleState === "degraded") return "Runtime degraded — review needed";
  if ((input.pendingApprovals ?? 0) === 1) return "1 approval needed";
  if ((input.pendingApprovals ?? 0) > 1) return `${input.pendingApprovals} approvals needed`;
  if (input.memoryReady) return "Luca is ready · Memory ready";
  return "Luca is ready";
}

export function isRenderableMemory(mem: MemoryNode): boolean {
  const value = String(mem.value ?? "");
  const key = String(mem.key ?? "");
  return (
    !value.includes("[AMBIENT VISION") &&
    !value.includes("[SYSTEM INSTRUCTION") &&
    !key.includes("SYSTEM_INSTRUCTION") &&
    mem.category !== "SYSTEM"
  );
}

export function formatMemoryValue(value: string): {
  label: string;
  summary: string;
  isStructured: boolean;
} {
  const trimmed = String(value ?? "").trim();

  try {
    const parsed = JSON.parse(trimmed);

    if (Array.isArray(parsed) && parsed.length > 0) {
      const snapshot = parsed[parsed.length - 1] as Record<string, unknown>;
      const equity = snapshot.totalEquity ?? snapshot.equity ?? snapshot.balance ?? "?";
      const available = snapshot.availableBalance ?? snapshot.available ?? "?";
      const unrealizedPnl = snapshot.unrealizedPnl ?? snapshot.pnl ?? null;
      let summary = `EQUITY: $${Number(equity).toFixed(2)}   AVAILABLE: $${Number(available).toFixed(2)}`;
      if (unrealizedPnl !== null) {
        summary += `   UNREALIZED PNL: $${Number(unrealizedPnl).toFixed(2)}`;
      }
      return { label: "EQUITY SNAPSHOT", summary, isStructured: true };
    }

    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const symbol = String(record.symbol ?? record.asset ?? "");
      const action = String(record.action ?? record.side ?? record.type ?? "")
        .toUpperCase()
        .replace(/_/g, " ");
      const strategy = String(record.strategy ?? record.strategyName ?? "");
      const confidence = record.confidence != null
        ? `${Math.round(Number(record.confidence) * 100)}%`
        : null;
      const size = record.size ?? record.quantity ?? null;
      let summary = symbol ? `${symbol}` : "";
      if (action) summary += summary ? ` · ${action}` : action;
      if (confidence) summary += `   CONF: ${confidence}`;
      if (size) summary += `   SIZE: ${size}`;
      if (strategy) summary += `\n${strategy}`;
      return {
        label: symbol || "STRUCTURED MEMORY",
        summary: summary || JSON.stringify(parsed).slice(0, 120),
        isStructured: true,
      };
    }
  } catch {
    const jsonStart = trimmed.indexOf("{");
    if (jsonStart > 0) {
      const prefix = trimmed.slice(0, jsonStart).trim();
      const rest = trimmed.slice(jsonStart);
      try {
        const parsed = JSON.parse(rest) as Record<string, unknown>;
        const symbol = String(parsed.symbol ?? parsed.asset ?? "");
        const action = String(parsed.action ?? parsed.side ?? "")
          .toUpperCase()
          .replace(/_/g, " ");
        let summary = symbol ? `${symbol}` : "";
        if (action) summary += summary ? ` · ${action}` : action;
        return {
          label: prefix.slice(0, 50),
          summary: summary || prefix,
          isStructured: true,
        };
      } catch {
        // Plain text memory.
      }
    }
  }

  return {
    label: "",
    summary: trimmed.length > 500 ? `${trimmed.slice(0, 500)}…` : trimmed,
    isStructured: false,
  };
}

export function summarizeToolLog(log: ToolExecutionLog): string {
  const result = String(log.result ?? "");
  return result.length > 140 ? `${result.slice(0, 140)}…` : result;
}

export function hasRealGraphData(memories: MemoryNode[]): boolean {
  return memories.some((memory) => {
    const metadata = memory.metadata as Record<string, unknown> | undefined;
    return Array.isArray(metadata?.graphNodes) || Array.isArray(metadata?.graphEdges);
  });
}
