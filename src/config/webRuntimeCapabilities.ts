export type LucaWebCapabilityStatus =
  | "available"
  | "disabled_in_web"
  | "desktop_required"
  | "api_required"
  | "pairing_required"
  | "unsupported";

export type LucaWebCapabilityId =
  | "hologram"
  | "lucaScreen"
  | "voiceHud"
  | "miniChat"
  | "personalIntelligence"
  | "lucaLink"
  | "modelManager"
  | "localModels"
  | "browserTools"
  | "operationCenter"
  | "desktopControl"
  | "fileSystemAccess"
  | "providerRouting";

export interface LucaWebRuntimeCapability {
  id: LucaWebCapabilityId;
  label: string;
  status: LucaWebCapabilityStatus;
  summary: string;
  webBehavior: string;
}

export interface LucaWebRuntimeCapabilitySignals {
  isWebRuntime?: boolean;
  hasConfiguredPublicApi?: boolean;
  hasAuthenticatedSession?: boolean;
  hasPairedDesktopHost?: boolean;
}

export const WEB_RUNTIME_CAPABILITY_IDS: readonly LucaWebCapabilityId[] = [
  "hologram",
  "lucaScreen",
  "voiceHud",
  "miniChat",
  "personalIntelligence",
  "lucaLink",
  "modelManager",
  "localModels",
  "browserTools",
  "operationCenter",
  "desktopControl",
  "fileSystemAccess",
  "providerRouting",
] as const;

const DESKTOP_REQUIRED_SUMMARY =
  "Visible for product QA, but execution requires LucaOS Desktop.";
const API_REQUIRED_SUMMARY =
  "Visible for product QA, but live data requires the future authenticated LucaOS API.";

export const resolveWebRuntimeCapabilities = ({
  isWebRuntime = false,
  hasConfiguredPublicApi = false,
  hasAuthenticatedSession = false,
  hasPairedDesktopHost = false,
}: LucaWebRuntimeCapabilitySignals = {}): Record<
  LucaWebCapabilityId,
  LucaWebRuntimeCapability
> => {
  if (!isWebRuntime) {
    return {
      hologram: {
        id: "hologram",
        label: "Hologram",
        status: "available",
        summary: "Desktop runtime can open the Hologram surface.",
        webBehavior: "Desktop mode may use Electron overlay behavior.",
      },
      lucaScreen: {
        id: "lucaScreen",
        label: "LucaScreen",
        status: "available",
        summary: "Desktop runtime can open the Smart Screen surface.",
        webBehavior: "Desktop mode may use Electron visual-core IPC.",
      },
      voiceHud: {
        id: "voiceHud",
        label: "VoiceHUD",
        status: "available",
        summary: "Desktop voice surfaces remain available.",
        webBehavior: "Desktop mode may use microphone and voice runtime services.",
      },
      miniChat: {
        id: "miniChat",
        label: "Mini Chat",
        status: "available",
        summary: "Mini Chat is available in trusted runtime modes.",
        webBehavior: "Desktop mode may route messages through local/core services.",
      },
      personalIntelligence: {
        id: "personalIntelligence",
        label: "Personal Intelligence",
        status: "available",
        summary: "Trusted runtime can load approved memory state.",
        webBehavior: "Desktop mode may access local approved memory stores.",
      },
      lucaLink: {
        id: "lucaLink",
        label: "LucaLink",
        status: "available",
        summary: "Trusted runtime can manage paired hosts and devices.",
        webBehavior: "Desktop mode may host LucaLink bridge actions.",
      },
      modelManager: {
        id: "modelManager",
        label: "Model Manager",
        status: "available",
        summary: "Trusted runtime can inspect provider and model state.",
        webBehavior: "Desktop mode may use local runtime/provider adapters.",
      },
      localModels: {
        id: "localModels",
        label: "Local Models",
        status: "available",
        summary: "Trusted runtime can discover and run local models.",
        webBehavior: "Desktop mode may connect to local model services.",
      },
      browserTools: {
        id: "browserTools",
        label: "Browser / Tools",
        status: "available",
        summary: "Trusted runtime can use browser/tool orchestration.",
        webBehavior: "Desktop mode may execute approved runtime tools.",
      },
      operationCenter: {
        id: "operationCenter",
        label: "Operation Center",
        status: "available",
        summary: "Trusted runtime can display operation records.",
        webBehavior: "Desktop mode may reflect real operation state.",
      },
      desktopControl: {
        id: "desktopControl",
        label: "Desktop Control",
        status: "available",
        summary: "Trusted runtime can request desktop control authority.",
        webBehavior: "Desktop mode may use guarded host actions.",
      },
      fileSystemAccess: {
        id: "fileSystemAccess",
        label: "File / System Access",
        status: "available",
        summary: "Trusted runtime can request file/system authority.",
        webBehavior: "Desktop mode may use guarded filesystem/shell actions.",
      },
      providerRouting: {
        id: "providerRouting",
        label: "Provider Routing",
        status: "available",
        summary: "Trusted runtime can route through configured providers.",
        webBehavior: "Desktop/server side owns provider secret access.",
      },
    };
  }

  const apiReady = hasConfiguredPublicApi && hasAuthenticatedSession;

  return {
    hologram: {
      id: "hologram",
      label: "Hologram",
      status: "desktop_required",
      summary: DESKTOP_REQUIRED_SUMMARY,
      webBehavior: "Render the Hologram visual surface only; no overlay IPC or host control.",
    },
    lucaScreen: {
      id: "lucaScreen",
      label: "LucaScreen",
      status: "desktop_required",
      summary: DESKTOP_REQUIRED_SUMMARY,
      webBehavior: "Render visual-core/LucaScreen shells only; no Electron visual-core IPC.",
    },
    voiceHud: {
      id: "voiceHud",
      label: "VoiceHUD",
      status: "disabled_in_web",
      summary: "Voice HUD chrome may be inspected, but capture/listening is disabled in web.",
      webBehavior: "No wake word, microphone loop, or local voice backend starts from web.",
    },
    miniChat: {
      id: "miniChat",
      label: "Mini Chat",
      status: apiReady ? "available" : "api_required",
      summary: apiReady ? "Mini Chat may use authenticated API routing." : API_REQUIRED_SUMMARY,
      webBehavior: "Without API/session, message sends stay disabled/no-op.",
    },
    personalIntelligence: {
      id: "personalIntelligence",
      label: "Personal Intelligence",
      status: apiReady ? "available" : "api_required",
      summary: "Show memory summary/privacy shell only; never expose raw memory in web preview.",
      webBehavior: "No raw memory reads or persistence until authenticated sync exists.",
    },
    lucaLink: {
      id: "lucaLink",
      label: "LucaLink",
      status: hasPairedDesktopHost ? "desktop_required" : "pairing_required",
      summary: "Show desktop host and pairing shell only; never execute host actions from web.",
      webBehavior: "Requires secure pairing plus a trusted desktop host bridge.",
    },
    modelManager: {
      id: "modelManager",
      label: "Model Manager",
      status: "disabled_in_web",
      summary: "Provider/local/BYOK layout is visible; model execution is disabled in web.",
      webBehavior: "No localhost, Ollama, provider, or secret-bearing calls from browser.",
    },
    localModels: {
      id: "localModels",
      label: "Local Models",
      status: "desktop_required",
      summary: DESKTOP_REQUIRED_SUMMARY,
      webBehavior: "No Ollama/local model discovery, install, delete, or execution in web.",
    },
    browserTools: {
      id: "browserTools",
      label: "Browser / Tools",
      status: "disabled_in_web",
      summary: "Tool launchers are visible for layout QA; privileged execution is disabled.",
      webBehavior: "No desktop automation, shell, or localhost browser-control calls.",
    },
    operationCenter: {
      id: "operationCenter",
      label: "Operation Center",
      status: "available",
      summary: "Read-only operation/activity shells remain inspectable in web.",
      webBehavior: "Shows safe state and fixture-like records; no command execution.",
    },
    desktopControl: {
      id: "desktopControl",
      label: "Desktop Control",
      status: "desktop_required",
      summary: DESKTOP_REQUIRED_SUMMARY,
      webBehavior: "No Electron IPC, desktop automation, or local host actions from browser.",
    },
    fileSystemAccess: {
      id: "fileSystemAccess",
      label: "File / System Access",
      status: "desktop_required",
      summary: DESKTOP_REQUIRED_SUMMARY,
      webBehavior: "No filesystem, shell, or local process access from browser.",
    },
    providerRouting: {
      id: "providerRouting",
      label: "Provider Routing",
      status: apiReady ? "api_required" : "disabled_in_web",
      summary: "Provider routing requires a server API boundary; secrets never enter web.",
      webBehavior: "No direct provider calls or provider secrets in browser bundles.",
    },
  };
};

export interface LucaWebRuntimeActionResult {
  ok: false;
  capability: LucaWebCapabilityId;
  status: LucaWebCapabilityStatus;
  reason: string;
}

export const createDisabledWebRuntimeAction = (
  capability: LucaWebRuntimeCapability,
): LucaWebRuntimeActionResult => ({
  ok: false,
  capability: capability.id,
  status: capability.status,
  reason: `${capability.label} is ${capability.status.replace(/_/g, " ")} in the browser-safe LucaOS web build. ${capability.webBehavior}`,
});

export const createPersonalIntelligenceWebState = (
  capability: LucaWebRuntimeCapability,
) => ({
  title: "Personal Intelligence",
  status: capability.status,
  summary: "Memory summary shell visible. Raw memory is withheld in web.",
  rawMemory: undefined,
  canPersist: false,
  requires: capability.status === "api_required" ? "Authenticated API/session" : "Approved runtime",
});

export const createLucaLinkWebState = (
  capability: LucaWebRuntimeCapability,
) => ({
  title: "LucaLink",
  status: capability.status,
  hostState: "No paired desktop host in browser-safe preview.",
  canExecuteHostActions: false,
  requires: capability.status === "pairing_required" ? "Secure desktop pairing" : "LucaOS Desktop host",
});
