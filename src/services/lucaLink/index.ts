/**
 * LucaLink barrel — consolidation slice 1 (see the consolidation plan in the
 * lucalink/consolidation branch history).
 *
 * One import surface for the pure LucaLink modules so consumers stop
 * reaching into the deprecated 2,730-line lucaLinkService for registry and
 * policy logic. Namespace exports by design: the pure modules share common
 * create, list, and summarize names, and `export *` would collide.
 *
 * Transport lives in ./manager (live client) — re-exported last. Nothing
 * here executes; every namespace is pure model/policy code.
 */

export * as lucaLinkApprovalQueue from "./lucaLinkApprovalQueue";
export * as lucaLinkContinuation from "./lucaLinkContinuation";
export * as lucaLinkContinuationBridge from "./lucaLinkContinuationBridge";
export * as lucaLinkDeviceTrust from "./lucaLinkDeviceTrustRegistry";
export * as lucaLinkHandoff from "./lucaLinkHandoff";
export * as lucaLinkHostAdaptation from "./lucaLinkHostAdaptation";
export * as lucaLinkHostConnectionModel from "./lucaLinkHostConnectionModel";
export * as lucaLinkBridgeReview from "./lucaLinkBridgeReview";
export * as lucaLinkAdapterDrafts from "./lucaLinkAdapterDrafts";
export * as lucaLinkGuestSessionPolicy from "./lucaLinkGuestSessionPolicy";
export * as lucaLinkMultiHostApproval from "./lucaLinkMultiHostApproval";
export * as lucaLinkSoftEnforcement from "./lucaLinkSoftEnforcement";
export * as lucaLinkRuntimeEnforcementGate from "./lucaLinkRuntimeEnforcementGate";
export * as lucaLinkRuntimeShadow from "./lucaLinkRuntimeShadow";
export * as lucaLinkTrustPolicy from "./lucaLinkTrustPolicy";
export * as lucaLinkSyncProtocol from "./lucaLinkSyncProtocol";

/** The live desktop client (transport). */
export { lucaLinkManager } from "./manager";
export type { Device, DeviceMetadata } from "./types";
