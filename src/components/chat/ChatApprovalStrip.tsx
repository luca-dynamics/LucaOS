import React, { useCallback, useEffect, useState } from "react";
import { approvalRequestCenterService } from "../../services/provenance/ApprovalRequestCenterService";
import { governedActionRequestService } from "../../services/runtime/GovernedActionRequestService";
import { memoryProposalService } from "../../services/memory/MemoryProposalService";
import { skillGovernanceService } from "../../services/skills/SkillGovernanceService";
import type { ApprovalRequest } from "../../types/approvalCenter";
import InlineApprovalCard from "./InlineApprovalCard";

/**
 * Pending approvals surfaced where the user is already looking — above the
 * composer, in the conversation column. Decisions use the same state-only
 * pipeline as the Activity panel (approveOnce/reject + source sync); nothing
 * executes from this strip.
 */

const REFRESH_MS = 5_000;
const MAX_CARDS = 2;

function listPending(): ApprovalRequest[] {
  try {
    return approvalRequestCenterService
      .listRequests()
      .filter((request) => request.status === "pending")
      .slice(0, MAX_CARDS);
  } catch {
    return [];
  }
}

// Mirrors ActivityPanel's approve-and-sync: strictly state-only.
function approveAndSyncSource(request: ApprovalRequest): void {
  approvalRequestCenterService.approveOnce(request.approvalRequestId);
  if (!request.sourceId) return;
  switch (request.sourceType) {
    case "tool": {
      const governed = governedActionRequestService.getRequest(request.sourceId);
      if (governed && governed.status === "approval_required") {
        governedActionRequestService.markApprovedWaitingExecution(
          request.sourceId,
        );
      }
      break;
    }
    case "memory_write":
      memoryProposalService.syncApprovedFromApprovalRequest(request.sourceId);
      break;
    case "skill":
      skillGovernanceService.syncApprovedFromApprovalRequest(request.sourceId);
      break;
    default:
      break;
  }
}

export const ChatApprovalStrip: React.FC = () => {
  const [pending, setPending] = useState<ApprovalRequest[]>(listPending);

  useEffect(() => {
    const timer = window.setInterval(() => setPending(listPending()), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  const handleApprove = useCallback((request: ApprovalRequest) => {
    approveAndSyncSource(request);
    setPending(listPending());
  }, []);

  const handleDeny = useCallback((request: ApprovalRequest) => {
    approvalRequestCenterService.reject(request.approvalRequestId);
    setPending(listPending());
  }, []);

  if (pending.length === 0) return null;

  return (
    <div className="space-y-2 pb-3">
      {pending.map((request) => (
        <InlineApprovalCard
          key={request.approvalRequestId}
          request={request}
          onApprove={handleApprove}
          onDeny={handleDeny}
        />
      ))}
    </div>
  );
};

export default ChatApprovalStrip;
