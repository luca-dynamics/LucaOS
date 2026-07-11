/**
 * LucaLink relay boundary.
 *
 * The Socket.IO-backed client remains the runtime implementation, but this is
 * now its only import boundary for the manager. Keeping the concrete adapter
 * behind this module lets the transport implementation move later without a
 * second application-wide migration.
 */
import { lucaLink as relayImplementation } from "./relayClientAdapter";

export type LucaLinkRelayImplementation = typeof relayImplementation;

export const lucaLinkRelayBoundary: LucaLinkRelayImplementation =
  relayImplementation;

export type {
  LucaLinkDevice,
  LucaLinkMessage,
  LucaLinkState,
} from "./relayClientAdapter";

export type LucaLinkGovernanceFacade = Pick<
  LucaLinkRelayImplementation,
  | "getTrustedDevices"
  | "getDeviceTrustSummary"
  | "getDeviceTrustAudit"
  | "clearDeviceTrustAudit"
  | "renameTrustedDevice"
  | "setTrustedDeviceTrustLevel"
  | "revokeTrustedDevice"
  | "blockTrustedDevice"
  | "unblockTrustedDevice"
  | "getPendingApprovalRequests"
  | "getApprovalRequests"
  | "getApprovalQueueSummary"
  | "approveApprovalRequest"
  | "denyApprovalRequest"
  | "cancelApprovalRequest"
  | "queueApprovalForSoftEnforcementResult"
  | "getContinuationTokens"
  | "getValidContinuationTokens"
  | "createContinuationFromApprovalRequest"
  | "validateContinuationToken"
  | "consumeContinuationToken"
  | "prepareSafeContinuation"
  | "consumePreparedContinuation"
  | "evaluateContinuationBridge"
  | "enableSoftEnforcement"
  | "disableSoftEnforcement"
  | "getSoftEnforcementMode"
  | "evaluateRuntimeEventForSoftEnforcement"
>;

export type LucaLinkConsoleFacade = Pick<
  LucaLinkRelayImplementation,
  | "approveApprovalRequest"
  | "approveBridgeReviewForSandbox"
  | "approveHandoff"
  | "blockTrustedDevice"
  | "cancelAdapterDraft"
  | "cancelApprovalRequest"
  | "cancelBridgeReview"
  | "cancelContinuationToken"
  | "cancelHandoff"
  | "clearAdapterDrafts"
  | "consumeContinuationToken"
  | "createAdapterDraftFromBlueprint"
  | "createAdapterDraftFromBridgeReview"
  | "createBridgeReviewFromBlueprint"
  | "createContinuationFromApprovalRequest"
  | "createConversationHandoff"
  | "createRoom"
  | "declineHandoff"
  | "denyApprovalRequest"
  | "disconnect"
  | "generateGuestSession"
  | "getActiveTrustedDevices"
  | "getAdapterDraftSummary"
  | "getAdapterDrafts"
  | "getApprovalQueueSummary"
  | "getApprovalRequests"
  | "getApprovalSurfaceSummary"
  | "getApprovalSurfaces"
  | "getBridgeReviewSummary"
  | "getBridgeReviews"
  | "getContinuationRegistrySummary"
  | "getContinuationTokens"
  | "getDeviceTrustAudit"
  | "getDeviceTrustSummary"
  | "getEmbodiedHostCapabilityEnvelopes"
  | "getFreshHostConnectionSummary"
  | "getFreshHostConnections"
  | "getGuestSecuritySessions"
  | "getGuestSecuritySummary"
  | "getHandoffSummary"
  | "getHandoffs"
  | "getPairingUrl"
  | "getPendingApprovalRequests"
  | "getPendingHandoffs"
  | "getRuntimeShadowObservations"
  | "getRuntimeShadowSummary"
  | "getSoftEnforcementMode"
  | "getState"
  | "getTrustedDevices"
  | "getValidContinuationTokens"
  | "joinWithToken"
  | "markHandoffAccepted"
  | "onStateChange"
  | "rejectBridgeReview"
  | "renameTrustedDevice"
  | "revokeTrustedDevice"
  | "setTrustedDeviceTrustLevel"
  | "unblockTrustedDevice"
  | "validateContinuationToken"
>;

export type LucaLinkRelayFacade = Pick<
  LucaLinkRelayImplementation,
  | "createRoom"
  | "joinWithToken"
  | "autoConnect"
  | "disconnect"
  | "generateGuestSession"
  | "initGuestHandler"
  | "onGuestMessage"
  | "sendToGuest"
  | "getState"
  | "onStateChange"
  | "onMessage"
  | "send"
  | "beamPacket"
  | "syncMission"
  | "getPairingUrl"
>;

export type LucaLinkRelayGuestHandler = Parameters<
  LucaLinkRelayFacade["initGuestHandler"]
>;
export type LucaLinkRelayMessageListener = Parameters<
  LucaLinkRelayFacade["onMessage"]
>[0];
