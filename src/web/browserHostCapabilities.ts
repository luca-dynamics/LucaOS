import type { WebHostClass } from "./hostClass";

export type CapabilityStatus =
  | "available"
  | "permission-required"
  | "api-required"
  | "desktop-required"
  | "mobile-app-required"
  | "paired-host-required"
  | "connector-required"
  | "unsupported"
  | "unknown";

export type RouteUnlockOption =
  | "browser-permission"
  | "luca-link-host"
  | "install-desktop"
  | "install-mobile"
  | "install-connector"
  | "generate-approved-route"
  | "api-config";

export type BrowserCapabilityId =
  | "camera"
  | "microphone"
  | "screenShare"
  | "clipboard"
  | "filePicker"
  | "dragDrop"
  | "notifications"
  | "geolocation"
  | "webShare"
  | "webGpu"
  | "wasm"
  | "webrtc"
  | "serviceWorker"
  | "pwaInstall"
  | "localBrowserStorage"
  | "touchInput"
  | "keyboardMouseInput"
  | "largeDisplay"
  | "remoteControlNavigation";

export interface WebCapability {
  id: string;
  label: string;
  status: CapabilityStatus;
  detail: string;
  unlockOptions: RouteUnlockOption[];
}

export type BrowserCapabilityMap = Record<BrowserCapabilityId, WebCapability>;

const capability = (
  id: BrowserCapabilityId,
  label: string,
  status: CapabilityStatus,
  detail: string,
  unlockOptions: RouteUnlockOption[] = [],
): WebCapability => ({ id, label, status, detail, unlockOptions });

export const detectBrowserHostCapabilities = (
  hostClass: WebHostClass,
): BrowserCapabilityMap => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return Object.fromEntries(
      [
        "camera",
        "microphone",
        "screenShare",
        "clipboard",
        "filePicker",
        "dragDrop",
        "notifications",
        "geolocation",
        "webShare",
        "webGpu",
        "wasm",
        "webrtc",
        "serviceWorker",
        "pwaInstall",
        "localBrowserStorage",
        "touchInput",
        "keyboardMouseInput",
        "largeDisplay",
        "remoteControlNavigation",
      ].map((id) => [
        id,
        capability(id as BrowserCapabilityId, id, "unknown", "Browser runtime unavailable."),
      ]),
    ) as BrowserCapabilityMap;
  }

  const nav = navigator as Navigator & {
    gpu?: unknown;
    standalone?: boolean;
  };
  const mediaDevices = nav.mediaDevices;
  const hasUserMedia = typeof mediaDevices?.getUserMedia === "function";
  const canShareScreen = typeof mediaDevices?.getDisplayMedia === "function";
  const hasFinePointer = window.matchMedia?.("(pointer: fine)").matches ?? false;
  const hasCoarsePointer =
    window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const isLargeDisplay =
    Math.max(window.screen?.width ?? 0, window.innerWidth) >= 1280;
  const pwaStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    nav.standalone === true;

  const permission = (
    supported: boolean,
    label: string,
  ): [CapabilityStatus, string, RouteUnlockOption[]] =>
    supported
      ? [
          "permission-required",
          `${label} is supported and will only activate after a user-approved browser permission.`,
          ["browser-permission"],
        ]
      : ["unsupported", `${label} is not exposed by this browser host.`, []];

  const [cameraStatus, cameraDetail, cameraRoutes] = permission(
    hasUserMedia,
    "Camera",
  );
  const [microphoneStatus, microphoneDetail, microphoneRoutes] = permission(
    hasUserMedia,
    "Microphone",
  );
  const [screenStatus, screenDetail, screenRoutes] = permission(
    canShareScreen,
    "Screen sharing",
  );

  let localStorageAvailable = false;
  try {
    localStorageAvailable = "localStorage" in window && window.localStorage != null;
  } catch {
    localStorageAvailable = false;
  }

  return {
    camera: capability("camera", "Camera", cameraStatus, cameraDetail, cameraRoutes),
    microphone: capability(
      "microphone",
      "Microphone",
      microphoneStatus,
      microphoneDetail,
      microphoneRoutes,
    ),
    screenShare: capability(
      "screenShare",
      "Screen share",
      screenStatus,
      screenDetail,
      screenRoutes,
    ),
    clipboard: capability(
      "clipboard",
      "Clipboard",
      "clipboard" in nav ? "permission-required" : "unsupported",
      "clipboard" in nav
        ? "Clipboard access remains user-gesture and permission governed."
        : "The Clipboard API is unavailable.",
      "clipboard" in nav ? ["browser-permission"] : [],
    ),
    filePicker: capability(
      "filePicker",
      "File picker",
      "showOpenFilePicker" in window ? "available" : "available",
      "User-selected files can be opened through browser pickers; no unrestricted filesystem access is granted.",
    ),
    dragDrop: capability(
      "dragDrop",
      "Drag and drop",
      "ondrop" in window ? "available" : "unsupported",
      "Browser-scoped drag and drop is available for user-provided content.",
    ),
    notifications: capability(
      "notifications",
      "Notifications",
      "Notification" in window
        ? Notification.permission === "granted"
          ? "available"
          : "permission-required"
        : "unsupported",
      "Notification prompts are never opened during bootstrap.",
      "Notification" in window ? ["browser-permission"] : [],
    ),
    geolocation: capability(
      "geolocation",
      "Geolocation",
      "geolocation" in nav ? "permission-required" : "unsupported",
      "Location is available only after an explicit browser permission.",
      "geolocation" in nav ? ["browser-permission"] : [],
    ),
    webShare: capability(
      "webShare",
      "Web share",
      "share" in nav ? "available" : "unsupported",
      "Uses the host browser's user-invoked share sheet.",
    ),
    webGpu: capability(
      "webGpu",
      "WebGPU",
      "gpu" in nav ? "available" : "unsupported",
      "WebGPU is feature-detected without initializing an adapter.",
    ),
    wasm: capability(
      "wasm",
      "WebAssembly",
      typeof WebAssembly === "object" ? "available" : "unsupported",
      "Browser WebAssembly execution is available.",
    ),
    webrtc: capability(
      "webrtc",
      "WebRTC",
      "RTCPeerConnection" in window ? "available" : "unsupported",
      "The browser can participate in permission-governed real-time sessions.",
    ),
    serviceWorker: capability(
      "serviceWorker",
      "Service worker",
      "serviceWorker" in nav ? "available" : "unsupported",
      "Service worker support is detected; none is registered by this check.",
    ),
    pwaInstall: capability(
      "pwaInstall",
      "PWA install",
      pwaStandalone ? "available" : "unknown",
      pwaStandalone
        ? "LucaOS is running in a standalone browser display mode."
        : "Install availability is controlled by the browser and manifest eligibility.",
    ),
    localBrowserStorage: capability(
      "localBrowserStorage",
      "Browser storage",
      localStorageAvailable ? "available" : "unsupported",
      "Origin-scoped browser storage only; this is not LucaOS encrypted local vault storage.",
    ),
    touchInput: capability(
      "touchInput",
      "Touch input",
      nav.maxTouchPoints > 0 || hasCoarsePointer ? "available" : "unsupported",
      "Touch and coarse-pointer signals are feature detected.",
    ),
    keyboardMouseInput: capability(
      "keyboardMouseInput",
      "Keyboard and pointer",
      hasFinePointer || "onkeydown" in window ? "available" : "unknown",
      "Keyboard/pointer navigation is available when exposed by this host.",
    ),
    largeDisplay: capability(
      "largeDisplay",
      "Large display",
      isLargeDisplay ? "available" : "unsupported",
      "Derived from browser viewport and screen size only.",
    ),
    remoteControlNavigation: capability(
      "remoteControlNavigation",
      "Remote navigation",
      hostClass === "smart-tv-web" ? "available" : "unknown",
      "Directional keyboard events can support TV remotes when the browser exposes them.",
    ),
  };
};
