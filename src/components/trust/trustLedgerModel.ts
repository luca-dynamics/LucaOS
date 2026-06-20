// Data contract for the trust ledger — the agent's honest, reversible record of
// what it did, is doing, and wants to do. This is the legibility layer that lets
// a normal human trust an autonomous operator (see interface-principles P3/P6).

export type TrustEventStatus = "completed" | "pending" | "blocked";

export interface TrustEvent {
  id: string;
  /** What happened, in plain language. */
  title: string;
  /** Why Luca did/wants it. */
  reason?: string;
  /** Concrete things touched (files, recipients, endpoints). */
  touched?: string[];
  /** Human time label, e.g. "2m ago" or "09:14". */
  time: string;
  status: TrustEventStatus;
  /** Completed actions that can still be undone. */
  reversible?: boolean;
}

export interface TrustLedgerActions {
  onApprove?: (id: string) => void;
  onDeny?: (id: string) => void;
  onUndo?: (id: string) => void;
}

const STATUS_TONE: Record<
  TrustEventStatus,
  { label: string; varName: string; fallback: string }
> = {
  completed: { label: "Done", varName: "--luca-success", fallback: "#4fbf7a" },
  pending: { label: "Waiting for you", varName: "--luca-warning", fallback: "#f2b23e" },
  blocked: { label: "Blocked", varName: "--luca-danger", fallback: "#f87171" },
};

export const trustStatusColor = (status: TrustEventStatus): string => {
  const t = STATUS_TONE[status];
  return `var(${t.varName}, ${t.fallback})`;
};

export const trustStatusLabel = (status: TrustEventStatus): string =>
  STATUS_TONE[status].label;

/** Count of events still needing the operator. Pure for testability. */
export const pendingCount = (events: TrustEvent[]): number =>
  events.filter((e) => e.status === "pending").length;
