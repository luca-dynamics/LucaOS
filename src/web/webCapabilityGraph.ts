import type {
  CapabilityStatus,
  RouteUnlockOption,
  WebCapability,
} from "./browserHostCapabilities";

export type NativeCapabilityId =
  | "localFilesystemMemory"
  | "encryptedLocalVault"
  | "masterKeyStorage"
  | "localSQLiteMemory"
  | "localModelScan"
  | "ollamaRuntime"
  | "nativeAutomation"
  | "electronIPC"
  | "localProcessExecution"
  | "desktopLucaLinkHostRuntime"
  | "mobileNativeRuntime"
  | "smartTvDisplayBridge"
  | "lucaScreenNativeOverlay"
  | "largeDisplaySession"
  | "cloudModelRouting"
  | "byokModelRouting"
  | "cloudPersonalIntelligence"
  | "webChat"
  | "webOnboarding"
  | "webSettings"
  | "lucaLinkPairing"
  | "sessionPorting"
  | "remoteCapabilityRoute";

export type WebCapabilityGraph = Record<NativeCapabilityId, WebCapability>;

export interface WebCapabilityConfiguration {
  cloudApiConfigured?: boolean;
  byokConfigured?: boolean;
  webChatConfigured?: boolean;
  lucaLinkConnectorConfigured?: boolean;
}

const node = (
  id: NativeCapabilityId,
  label: string,
  status: CapabilityStatus,
  detail: string,
  unlockOptions: RouteUnlockOption[],
): WebCapability => ({ id, label, status, detail, unlockOptions });

export const buildWebCapabilityGraph = (
  config: WebCapabilityConfiguration = {},
): WebCapabilityGraph => ({
  localFilesystemMemory: node(
    "localFilesystemMemory",
    "Filesystem memory",
    "desktop-required",
    "Unrestricted local filesystem memory remains in LucaOS Desktop.",
    ["install-desktop"],
  ),
  encryptedLocalVault: node(
    "encryptedLocalVault",
    "Encrypted local vault",
    "desktop-required",
    "The native encrypted vault and its strict key validation are not initialized in WebBridge.",
    ["install-desktop"],
  ),
  masterKeyStorage: node(
    "masterKeyStorage",
    "Master key storage",
    "desktop-required",
    "Master keys are never requested from or exposed to the browser build.",
    ["install-desktop"],
  ),
  localSQLiteMemory: node(
    "localSQLiteMemory",
    "SQLite memory",
    "desktop-required",
    "Native SQLite memory stays in the local desktop runtime.",
    ["install-desktop"],
  ),
  localModelScan: node(
    "localModelScan",
    "Local model scan",
    "desktop-required",
    "Local model discovery requires the native desktop host.",
    ["install-desktop", "luca-link-host"],
  ),
  ollamaRuntime: node(
    "ollamaRuntime",
    "Ollama runtime",
    "desktop-required",
    "Local Ollama lifecycle control is not imported into WebBridge.",
    ["install-desktop", "luca-link-host"],
  ),
  nativeAutomation: node(
    "nativeAutomation",
    "Native automation",
    "paired-host-required",
    "A governed LucaLink desktop host must approve and execute native automation.",
    ["luca-link-host", "install-desktop"],
  ),
  electronIPC: node(
    "electronIPC",
    "Electron IPC",
    "desktop-required",
    "Electron bridges exist only inside LucaOS Desktop.",
    ["install-desktop"],
  ),
  localProcessExecution: node(
    "localProcessExecution",
    "Local shell / process execution",
    "desktop-required",
    "Browser sandboxing prevents direct local process execution.",
    ["luca-link-host", "install-desktop", "generate-approved-route"],
  ),
  desktopLucaLinkHostRuntime: node(
    "desktopLucaLinkHostRuntime",
    "Desktop LucaLink host",
    "desktop-required",
    "The browser is a LucaLink client surface, not the native host controller.",
    ["install-desktop"],
  ),
  mobileNativeRuntime: node(
    "mobileNativeRuntime",
    "Mobile native runtime",
    "mobile-app-required",
    "Device-native mobile capabilities require LucaOS Mobile.",
    ["install-mobile"],
  ),
  smartTvDisplayBridge: node(
    "smartTvDisplayBridge",
    "Smart TV display bridge",
    "paired-host-required",
    "TV display sessions will be routed through a user-approved LucaLink pairing.",
    ["luca-link-host"],
  ),
  lucaScreenNativeOverlay: node(
    "lucaScreenNativeOverlay",
    "LucaScreen native overlay",
    "paired-host-required",
    "Native overlays must be rendered and approved by a paired capable host.",
    ["luca-link-host", "install-desktop", "install-mobile"],
  ),
  largeDisplaySession: node(
    "largeDisplaySession",
    "Large display session",
    "paired-host-required",
    "Display sessions can continue through an approved LucaLink host pairing.",
    ["luca-link-host"],
  ),
  cloudModelRouting: node(
    "cloudModelRouting",
    "Cloud model routing",
    config.cloudApiConfigured ? "available" : "api-required",
    config.cloudApiConfigured
      ? "A public browser-safe API route is configured."
      : "A browser-safe authenticated API route must be configured.",
    config.cloudApiConfigured ? [] : ["api-config"],
  ),
  byokModelRouting: node(
    "byokModelRouting",
    "BYOK model routing",
    config.byokConfigured ? "available" : "connector-required",
    config.byokConfigured
      ? "A user-configured governed route is available."
      : "BYOK requires an approved connector; provider secrets are not bundled into WebBridge.",
    config.byokConfigured ? [] : ["install-connector", "generate-approved-route"],
  ),
  cloudPersonalIntelligence: node(
    "cloudPersonalIntelligence",
    "Cloud personal intelligence",
    "api-required",
    "Requires an authenticated, browser-safe API and user session.",
    ["api-config", "install-connector"],
  ),
  webChat: node(
    "webChat",
    "Web conversation",
    config.webChatConfigured ? "available" : "api-required",
    config.webChatConfigured
      ? "Browser-safe conversation routing is configured."
      : "Conversation UI is ready for a browser-safe API route.",
    config.webChatConfigured ? [] : ["api-config"],
  ),
  webOnboarding: node(
    "webOnboarding",
    "Web onboarding",
    "available",
    "The browser-safe onboarding surface can be attached without native imports.",
    [],
  ),
  webSettings: node(
    "webSettings",
    "Web settings",
    "available",
    "Browser-host settings can be managed within WebBridge.",
    [],
  ),
  lucaLinkPairing: node(
    "lucaLinkPairing",
    "LucaLink pairing",
    config.lucaLinkConnectorConfigured ? "available" : "connector-required",
    config.lucaLinkConnectorConfigured
      ? "A browser-safe LucaLink connector is configured."
      : "Pairing UI is ready; networking and native host control are intentionally not loaded yet.",
    config.lucaLinkConnectorConfigured
      ? ["luca-link-host"]
      : ["luca-link-host", "install-connector"],
  ),
  sessionPorting: node(
    "sessionPorting",
    "Session porting",
    config.lucaLinkConnectorConfigured ? "available" : "connector-required",
    config.lucaLinkConnectorConfigured
      ? "This browser is ready to negotiate a governed session handoff."
      : "Session handoff needs a browser-safe LucaLink connector and a paired host.",
    ["luca-link-host", "install-connector"],
  ),
  remoteCapabilityRoute: node(
    "remoteCapabilityRoute",
    "Remote capability route",
    "paired-host-required",
    "A paired host must approve every capability request before execution.",
    ["luca-link-host", "generate-approved-route"],
  ),
});
