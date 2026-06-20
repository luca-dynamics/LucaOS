import React from "react";
import { Presence } from "../presence";
import type { PresenceIntent } from "../presence";
import {
  EMPTY_TODAY,
  todayActionStatusLabel,
  type TodayAction,
  type TodaySummary,
} from "./todayModel";

export interface TodayHomeProps {
  summary?: TodaySummary;
  /** Luca's current ambient intent for the header presence. */
  intent?: PresenceIntent;
  accentColor?: string;
  onOpenApprovals?: () => void;
  onRunSuggestion?: (id: string) => void;
}

const statusColor = (status: TodayAction["status"]): string =>
  status === "pending"
    ? "var(--luca-warning, #f2b23e)"
    : status === "done"
      ? "var(--luca-success, #4fbf7a)"
      : "var(--luca-text-tertiary, rgba(255,255,255,0.4))";

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "var(--luca-text-secondary, rgba(255,255,255,0.62))",
  margin: "0 0 10px",
};

const card: React.CSSProperties = {
  background: "var(--luca-surface-glass, rgba(255,255,255,0.05))",
  border: "1px solid var(--luca-border-subtle, rgba(255,255,255,0.1))",
  borderRadius: 14,
  padding: "12px 14px",
};

const ActionRow: React.FC<{ action: TodayAction; onAct?: () => void }> = ({
  action,
  onAct,
}) => (
  <div style={{ ...card, display: "flex", alignItems: "center", gap: 12 }}>
    <span
      aria-hidden="true"
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        flex: "none",
        background: statusColor(action.status),
      }}
    />
    <span
      style={{
        flex: 1,
        fontSize: 14,
        color: "var(--luca-text-primary, #fff)",
      }}
    >
      {action.title}
    </span>
    {action.meta ? (
      <span
        style={{
          fontSize: 12,
          color: "var(--luca-text-tertiary, rgba(255,255,255,0.4))",
        }}
      >
        {action.meta}
      </span>
    ) : null}
    {action.status === "pending" ? (
      <button
        onClick={onAct}
        style={{
          fontSize: 12,
          color: "var(--luca-warning, #f2b23e)",
          background: "transparent",
          border: "1px solid var(--luca-warning, #f2b23e)",
          borderRadius: 999,
          padding: "3px 12px",
          cursor: "pointer",
        }}
      >
        {todayActionStatusLabel(action.status)}
      </button>
    ) : null}
  </div>
);

const Section: React.FC<{
  title: string;
  emptyHint: string;
  children?: React.ReactNode;
  isEmpty: boolean;
}> = ({ title, emptyHint, children, isEmpty }) => (
  <section style={{ marginBottom: 24 }}>
    <h2 style={sectionTitle}>{title}</h2>
    {isEmpty ? (
      <p
        style={{
          fontSize: 13,
          color: "var(--luca-text-tertiary, rgba(255,255,255,0.4))",
          margin: 0,
        }}
      >
        {emptyHint}
      </p>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {children}
      </div>
    )}
  </section>
);

/**
 * The calm Today home — what you land on instead of an empty chat box.
 * Continuity over a blank prompt: what Luca did, what needs you, what's next.
 * Fully token-driven; honest empty states for unfinished/unconnected data.
 */
export const TodayHome: React.FC<TodayHomeProps> = ({
  summary = EMPTY_TODAY,
  intent = "idle",
  accentColor,
  onOpenApprovals,
  onRunSuggestion,
}) => {
  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "32px 20px",
        color: "var(--luca-text-primary, #fff)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <Presence intent={intent} color={accentColor} size={56} />
        <div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>
            {summary.greeting ?? "Hello"}
          </div>
          {summary.dateLabel ? (
            <div
              style={{
                fontSize: 13,
                color: "var(--luca-text-secondary, rgba(255,255,255,0.62))",
              }}
            >
              {summary.dateLabel}
            </div>
          ) : null}
        </div>
      </header>

      <Section
        title="While you were away"
        emptyHint="Nothing to report yet — Luca will summarize what it handled here."
        isEmpty={summary.whileAway.length === 0}
      >
        {summary.whileAway.map((a) => (
          <ActionRow key={a.id} action={a} />
        ))}
      </Section>

      <Section
        title="Waiting for you"
        emptyHint="No approvals pending."
        isEmpty={summary.waitingForYou.length === 0}
      >
        {summary.waitingForYou.map((a) => (
          <ActionRow key={a.id} action={a} onAct={onOpenApprovals} />
        ))}
      </Section>

      <Section
        title="Suggested next"
        emptyHint="No suggestions right now."
        isEmpty={summary.suggestions.length === 0}
      >
        {summary.suggestions.map((s) => (
          <button
            key={s.id}
            onClick={() => onRunSuggestion?.(s.id)}
            style={{
              ...card,
              textAlign: "left",
              cursor: "pointer",
              color: "var(--luca-text-primary, #fff)",
            }}
          >
            <div style={{ fontSize: 14 }}>{s.title}</div>
            {s.detail ? (
              <div
                style={{
                  fontSize: 12,
                  marginTop: 2,
                  color: "var(--luca-text-secondary, rgba(255,255,255,0.62))",
                }}
              >
                {s.detail}
              </div>
            ) : null}
          </button>
        ))}
      </Section>
    </div>
  );
};

export default TodayHome;
