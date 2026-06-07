import { evaluateLucaLinkWebDisplayBridgePolicy } from "./webDisplayBridgePolicy";
import { validateLucaLinkWebDisplaySessionIntent } from "./webDisplaySession";
import {
  LUCA_LINK_WEB_DISPLAY_BLOCKED_ACTIONS,
  type LucaLinkWebDisplayPreviewPayload,
  type LucaLinkWebDisplaySessionIntent,
} from "./webDisplayBridgeTypes";

export function createLucaLinkWebDisplayPreviewPayload(
  intent: LucaLinkWebDisplaySessionIntent,
  now: string | Date = new Date(),
): LucaLinkWebDisplayPreviewPayload {
  const validation = validateLucaLinkWebDisplaySessionIntent(intent);
  if (!validation.valid) {
    throw new Error(`Invalid display session intent: ${validation.blockers.join(" ")}`);
  }
  if (intent.status !== "approved_preview") {
    throw new Error("Display session intent requires approval for preview.");
  }

  const policy = evaluateLucaLinkWebDisplayBridgePolicy(intent, { now });
  if (!policy.allowedForPreview) {
    throw new Error(`Display preview is blocked: ${policy.blockers.join(" ")}`);
  }

  return {
    previewId: `display-preview-${intent.sessionId}`,
    sessionId: intent.sessionId,
    title: intent.title,
    contentKind: intent.contentKind,
    sanitizedUrlPreview: policy.sanitizedUrlPreview,
    displayMode:
      intent.contentKind === "presentation"
        ? "presentation_only"
        : "read_only",
    allowedActions: [],
    blockedActions: [...LUCA_LINK_WEB_DISPLAY_BLOCKED_ACTIONS],
    generatedAt: new Date(now).toISOString(),
    sideEffectsPerformed: false,
  };
}
