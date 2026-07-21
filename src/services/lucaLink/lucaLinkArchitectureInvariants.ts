/**
 * LucaLink production-hardening invariants.
 *
 * Static constants only. This module has no runtime wiring, no browser access,
 * no transport access, no persistence, and no side effects at import time.
 */

export const LUCA_LINK_RESERVED_CREATOR_TERMS = Object.freeze([
  "Origin",
  "origin",
] as const);

export const LUCA_LINK_MODEL_ONLY_MODULES = Object.freeze([
  "lucaLinkContinuationBridge.ts",
  "lucaLinkRuntimeEnforcementGate.ts",
  "lucaLinkGuestSessionPolicy.ts",
  "lucaLinkDeviceTrustRegistry.ts",
  "lucaLinkLinkedHostRegistry.ts",
  "governance/lucaLinkApprovalEvaluator.ts",
  "governance/lucaLinkPermissionEvaluator.ts",
  "governance/lucaLinkRevocationEvaluator.ts",
  "sessionOwnership/lucaLinkSessionOwnershipPolicy.ts",
  "sessionOwnership/lucaLinkSessionOwnershipEvaluator.ts",
  "sessionOwnership/lucaLinkSessionOwnershipFixtures.ts",
  "revocationPropagation/lucaLinkRevocationPropagationTypes.ts",
  "revocationPropagation/lucaLinkRevocationPropagationPolicy.ts",
  "revocationPropagation/lucaLinkRevocationPropagationEvaluator.ts",
  "revocationPropagation/lucaLinkRevocationPropagationFixtures.ts",
  "lucaLinkHandoff.ts",
  "lucaLinkHostConnectionModel.ts",
  "lucaLinkHostAdaptation.ts",
  "lucaLinkMultiHostApproval.ts",
  "lucaLinkBridgeReview.ts",
  "lucaLinkEmbodiedHostPolicy.ts",
  "lucaLinkAdapterDrafts.ts",
] as const);

export const LUCA_LINK_FORBIDDEN_MODEL_RUNTIME_PATTERNS = Object.freeze([
  "socket.emit(",
  ".emit(",
  "io(",
  "fetch(",
  "XMLHttpRequest",
  "WebSocket(",
  "localStorage",
  "sessionStorage",
  "navigator.mediaDevices",
  "navigator.geolocation",
  "child_process",
  "exec(",
  "spawn(",
  "fs.write",
  "writeFile",
  "unlink",
  "rmSync",
  "npm install",
  "pip install",
  "eval(",
  "new Function",
  'document.createElement("script")',
] as const);

export const LUCA_LINK_FORBIDDEN_DEVICE_CENTER_ACTION_LABELS = Object.freeze([
  "Generate and run",
  "Install adapter",
  "Execute adapter",
  "Run code",
  "Write file",
  "Open socket",
  "Scan network",
  "Control robot",
  "Control device",
  "Bypass credentials",
  "Exploit",
  "Take over",
  "Auto bridge",
] as const);

export const LUCA_LINK_HOST_AWARE_COPY_GUIDELINES = Object.freeze([
  "Primary Host",
  "companion host",
  "trusted host",
  "host mesh",
  "Luca-capable host",
  "display host",
  "guest host",
  "sensor host",
  "embodied host",
] as const);
