import { useEffect, useState } from "react";
import { approvalRequestCenterService } from "../../services/provenance/ApprovalRequestCenterService";

/**
 * usePendingApprovalCount — how many actions are waiting on the person.
 *
 * Feeds the shell's restore handle so collapsing the Operation Center can
 * never hide the fact that something needs attention. Same poll cadence as
 * the panel itself; a failed read counts as zero rather than throwing inside
 * the frame.
 */

const REFRESH_MS = 4000;

const readCount = (): number => {
  try {
    return approvalRequestCenterService
      .listRequests()
      .filter((request) => request.status === "pending").length;
  } catch {
    return 0;
  }
};

export function usePendingApprovalCount(): number {
  const [count, setCount] = useState<number>(readCount);
  useEffect(() => {
    const timer = window.setInterval(() => setCount(readCount()), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);
  return count;
}
