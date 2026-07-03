import { useEffect, useState } from "react";
import { approvalRequestCenterService } from "../services/provenance/ApprovalRequestCenterService";
import type { PresenceMarkState } from "./presenceMark";

/**
 * Live nervous system for the shell's presence mark. Collapses what the main
 * shell can currently observe into a PresenceMarkState, in the mark's
 * priority order (needs-you above all).
 *
 * Voice states (listening/speaking/thinking) ride the satellite presence bus
 * today; surfaces that have them can broadcast a `luca:presence-mark` event
 * with `{ state }` and it wins over polling until the next poll re-evaluates
 * approvals. Poll cadence is slow on purpose — presence must never become
 * the thing consuming the machine.
 */

const POLL_MS = 5_000;
export const PRESENCE_MARK_EVENT = "luca:presence-mark";

function readApprovalState(): PresenceMarkState {
  try {
    return approvalRequestCenterService.getDiagnosticsSummary().pendingRequests >
      0
      ? "needs-you"
      : "idle";
  } catch {
    return "idle";
  }
}

export function usePresenceMarkLiveState(): PresenceMarkState {
  const [state, setState] = useState<PresenceMarkState>(readApprovalState);

  useEffect(() => {
    const poll = window.setInterval(() => setState(readApprovalState()), POLL_MS);

    const onBroadcast = (event: Event) => {
      const detail = (event as CustomEvent<{ state?: PresenceMarkState }>)
        .detail;
      const next = detail?.state;
      if (!next) return;
      // needs-you from approvals still outranks a broadcast idle.
      setState((prev) =>
        prev === "needs-you" && next === "idle" ? prev : next,
      );
    };
    window.addEventListener(PRESENCE_MARK_EVENT, onBroadcast);

    return () => {
      window.clearInterval(poll);
      window.removeEventListener(PRESENCE_MARK_EVENT, onBroadcast);
    };
  }, []);

  return state;
}
