// Data contract for the calm "Today" home — the surface you land on instead of
// an empty chat box. It answers: what did Luca do, what needs me, what's next.

export type TodayActionStatus = "done" | "pending" | "info";

export interface TodayAction {
  id: string;
  title: string;
  /** Short trailing context, e.g. a count or source. */
  meta?: string;
  status: TodayActionStatus;
}

export interface TodaySuggestion {
  id: string;
  title: string;
  detail?: string;
}

export interface TodaySummary {
  greeting?: string;
  dateLabel?: string;
  /** Completed autonomously while the operator was away. */
  whileAway: TodayAction[];
  /** Pending the operator's approval/decision. */
  waitingForYou: TodayAction[];
  /** Proposed next actions. */
  suggestions: TodaySuggestion[];
}

export const EMPTY_TODAY: TodaySummary = {
  whileAway: [],
  waitingForYou: [],
  suggestions: [],
};

const STATUS_LABEL: Record<TodayActionStatus, string> = {
  done: "Done",
  pending: "Approve",
  info: "",
};

export const todayActionStatusLabel = (status: TodayActionStatus): string =>
  STATUS_LABEL[status] ?? "";

/** Time-of-day greeting from an hour (0-23). Pure for testability. */
export const greetingForHour = (hour: number): string => {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Good night";
};
