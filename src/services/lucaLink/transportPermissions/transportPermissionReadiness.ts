import type {
  LucaLinkTransportPermissionDecision,
  LucaLinkTransportPermissionRequest,
} from "./transportPermissionTypes";

export interface LucaLinkTransportPermissionReadiness {
  totalRequests: number;
  allowedPreviewCount: number;
  approvalRequiredCount: number;
  blockedCount: number;
  expiredCount: number;
  unsupportedCount: number;
  channelsCovered: string[];
  messageClassesCovered: string[];
  liveTransportMutationEnabled: false;
  readyForPolicyPreview: boolean;
  readyForLiveSend: false;
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}

export function summarizeLucaLinkTransportPermissionReadiness(
  requests: readonly LucaLinkTransportPermissionRequest[],
  decisions: readonly LucaLinkTransportPermissionDecision[],
): LucaLinkTransportPermissionReadiness {
  const count = (status: LucaLinkTransportPermissionDecision["status"]) =>
    decisions.filter((item) => item.status === status).length;
  return {
    totalRequests: requests.length,
    allowedPreviewCount: count("allowed_preview"),
    approvalRequiredCount: count("approval_required"),
    blockedCount: count("blocked"),
    expiredCount: count("expired"),
    unsupportedCount: count("unsupported"),
    channelsCovered: Array.from(new Set(requests.map((item) => item.channel))),
    messageClassesCovered: Array.from(
      new Set(requests.map((item) => item.messageClass)),
    ),
    liveTransportMutationEnabled: false,
    readyForPolicyPreview:
      requests.length > 0 && requests.length === decisions.length,
    readyForLiveSend: false,
    warnings: ["Allowed preview does not mean sent."],
    blockers: ["Live transport mutation and send remain disabled."],
    sideEffectsPerformed: false,
  };
}
