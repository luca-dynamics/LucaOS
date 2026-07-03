import React from "react";
import type { ApprovalRequest } from "../../types/approvalCenter";

/**
 * The trust boundary, rendered where the conversation lives (design target
 * dashboard-being.html): a calm bordered card stating what Luca wants to do,
 * why it's safe to decide, and two honest buttons. Approve is the single
 * accent; Deny is quiet. Risk is stated in words — no resting-state red.
 */

export interface InlineApprovalCardProps {
  request: ApprovalRequest;
  onApprove: (request: ApprovalRequest) => void;
  onDeny: (request: ApprovalRequest) => void;
}

const cardStyle: React.CSSProperties = {
  background: "var(--luca-surface-glass, rgba(255,255,255,0.025))",
  borderColor: "var(--luca-border-subtle, rgba(255,255,255,0.08))",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
};

export const InlineApprovalCard: React.FC<InlineApprovalCardProps> = ({
  request,
  onApprove,
  onDeny,
}) => {
  const riskTone =
    request.riskLevel === "high" || request.riskLevel === "critical"
      ? "var(--luca-warning, #e0b15a)"
      : "var(--luca-text-tertiary, var(--app-text-muted))";

  return (
    <div
      className="rounded-2xl border p-4"
      style={cardStyle}
      data-approval-card={request.approvalRequestId}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full"
          style={{ background: "var(--luca-warning, #e0b15a)" }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-[var(--app-text-main)]">
            {request.title}
          </div>
          {(request.userSafeReason || request.description) && (
            <p className="mt-1 text-xs leading-relaxed text-[var(--app-text-muted)]">
              {request.userSafeReason || request.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-[var(--app-text-muted)]">
        <span>{request.sourceType.replace(/_/g, " ")}</span>
        <span aria-hidden="true">·</span>
        <span style={{ color: riskTone }}>{request.riskLevel} risk</span>
        <span aria-hidden="true">·</span>
        <span>requested by {request.requestedBy}</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onApprove(request)}
          className="h-8 rounded-lg px-4 text-xs font-semibold transition-opacity hover:opacity-90"
          style={{
            background: "var(--luca-accent-primary, #7aa2ff)",
            color: "var(--luca-accent-ink, #0c0e12)",
          }}
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => onDeny(request)}
          className="h-8 rounded-lg px-3.5 text-xs font-medium text-[var(--app-text-muted)] transition-colors hover:bg-[var(--luca-surface-hover,rgba(255,255,255,0.06))]"
        >
          Deny
        </button>
        <span className="ml-auto text-[10.5px] text-[var(--app-text-muted)] opacity-80">
          Nothing runs until you decide.
        </span>
      </div>
    </div>
  );
};

export default InlineApprovalCard;
