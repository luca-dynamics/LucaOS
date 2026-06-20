import React from "react";
import {
  pendingCount,
  trustStatusColor,
  trustStatusLabel,
  type TrustEvent,
  type TrustLedgerActions,
} from "./trustLedgerModel";

export interface TrustLedgerProps extends TrustLedgerActions {
  events?: TrustEvent[];
  title?: string;
}

const pill = (color: string): React.CSSProperties => ({
  fontSize: 11,
  color,
  background: "transparent",
  border: `1px solid ${color}`,
  borderRadius: 999,
  padding: "2px 10px",
  cursor: "pointer",
});

const TrustRow: React.FC<{ event: TrustEvent } & TrustLedgerActions> = ({
  event,
  onApprove,
  onDeny,
  onUndo,
}) => {
  const color = trustStatusColor(event.status);
  return (
    <li
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 0",
        borderBottom: "1px solid var(--luca-border-subtle, rgba(255,255,255,0.1))",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          marginTop: 6,
          width: 8,
          height: 8,
          borderRadius: 999,
          flex: "none",
          background: color,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            justifyContent: "space-between",
          }}
        >
          <span
            style={{ fontSize: 14, color: "var(--luca-text-primary, #fff)" }}
          >
            {event.title}
          </span>
          <span
            style={{
              fontSize: 11,
              flex: "none",
              color: "var(--luca-text-tertiary, rgba(255,255,255,0.4))",
            }}
          >
            {event.time}
          </span>
        </div>

        {event.reason ? (
          <div
            style={{
              fontSize: 12,
              marginTop: 2,
              color: "var(--luca-text-secondary, rgba(255,255,255,0.62))",
            }}
          >
            {event.reason}
          </div>
        ) : null}

        {event.touched && event.touched.length > 0 ? (
          <div
            style={{
              fontSize: 11,
              marginTop: 4,
              color: "var(--luca-text-tertiary, rgba(255,255,255,0.4))",
            }}
          >
            Touched: {event.touched.join(", ")}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
          }}
        >
          <span style={{ fontSize: 11, color }}>{trustStatusLabel(event.status)}</span>
          {event.status === "pending" ? (
            <>
              <button style={pill(trustStatusColor("completed"))} onClick={() => onApprove?.(event.id)}>
                Approve
              </button>
              <button
                style={pill("var(--luca-text-tertiary, rgba(255,255,255,0.4))")}
                onClick={() => onDeny?.(event.id)}
              >
                Deny
              </button>
            </>
          ) : null}
          {event.status === "completed" && event.reversible ? (
            <button
              style={pill("var(--luca-text-secondary, rgba(255,255,255,0.62))")}
              onClick={() => onUndo?.(event.id)}
            >
              Undo
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
};

/**
 * The trust ledger — every action Luca took or wants to take, sourced, timed,
 * and reversible. Pending items carry approve/deny; completed reversible items
 * carry undo. This is what makes an acting agent feel like a chief-of-staff,
 * not a daemon. Token-driven; honest empty state.
 */
export const TrustLedger: React.FC<TrustLedgerProps> = ({
  events = [],
  title = "Activity",
  onApprove,
  onDeny,
  onUndo,
}) => {
  const waiting = pendingCount(events);
  return (
    <div
      style={{
        maxWidth: 520,
        color: "var(--luca-text-primary, #fff)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>{title}</h2>
        {waiting > 0 ? (
          <span
            style={{
              fontSize: 12,
              color: "var(--luca-warning, #f2b23e)",
            }}
          >
            {waiting} waiting for you
          </span>
        ) : null}
      </div>

      {events.length === 0 ? (
        <p
          style={{
            fontSize: 13,
            color: "var(--luca-text-tertiary, rgba(255,255,255,0.4))",
          }}
        >
          Nothing yet. Actions Luca takes will appear here — each one sourced and
          reversible.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {events.map((e) => (
            <TrustRow
              key={e.id}
              event={e}
              onApprove={onApprove}
              onDeny={onDeny}
              onUndo={onUndo}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default TrustLedger;
