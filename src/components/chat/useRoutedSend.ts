import { useTransition } from "react";
import { Sender } from "../../types";
import { chatIntentRouterBridge } from "../../services/runtime/ChatIntentRouterBridge";
import { chatIntentProvenanceService } from "../../services/runtime/ChatIntentProvenanceService";
import type { ChatRoutingResult } from "../../services/runtime/ChatIntentRouterBridge";
import {
  getRouteHintText,
  getRouteLabel,
  getRouteTone,
  shouldAppendRouteHint,
} from "../runtime/intentRoutingLabels";

/**
 * useRoutedSend — the ONE send path for every composer surface.
 *
 * Extracted from LucaComposer (which inherited it from ChatPanel, PR #124/#125)
 * so the workspace command bar and the embedded composer cannot drift into two
 * different sending behaviours: provenance check → router bridge → the actual
 * send → an optional route-hint message appended to the thread.
 */

export interface RoutedSendArgs {
  input: string;
  isProcessing: boolean;
  /** The actual send side effect (App-owned). Routing decorates this. */
  handleSend: () => void;
  messages: any[];
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
}

export function useRoutedSend({
  input,
  isProcessing,
  handleSend,
  messages,
  setMessages,
}: RoutedSendArgs): () => void {
  const [, startTransition] = useTransition();

  return () => {
    const trimmed = input.trim();
    if (!trimmed) {
      handleSend();
      return;
    }
    if (isProcessing) {
      handleSend();
      return;
    }
    if (
      !chatIntentProvenanceService.shouldRouteMessage({
        message: trimmed,
        senderType: "user",
        isHidden: false,
        isAwakening: false,
      })
    ) {
      handleSend();
      return;
    }

    let routeResult: ChatRoutingResult | undefined;
    try {
      const { provenanceIds } = chatIntentProvenanceService.createChatProvenance({
        message: trimmed,
      });
      routeResult = chatIntentRouterBridge.maybeRouteMessageBeforeResponse({
        message: trimmed,
        source: "chat",
        provenanceIds,
      });
    } catch (err) {
      console.warn("[useRoutedSend] Intent routing failed, sending normally:", err);
    }

    handleSend();

    if (routeResult && routeResult.routed && routeResult.routeType !== "fast_response") {
      const hintText = getRouteHintText(routeResult.routeType);
      if (hintText && shouldAppendRouteHint(messages, hintText)) {
        const tone = getRouteTone(routeResult.routeType);
        const label = getRouteLabel(routeResult.routeType);
        startTransition(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `route-hint-${Date.now()}`,
              text: hintText,
              sender: Sender.SYSTEM,
              timestamp: Date.now(),
              isStreaming: false,
              isRouteHint: true,
              routeLabel: label,
              routeTone: tone,
            },
          ]);
        });
      }
    }
  };
}
