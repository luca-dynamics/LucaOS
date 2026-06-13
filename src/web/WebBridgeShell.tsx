import { useMemo, useState } from "react";
import {
  detectBrowserHostCapabilities,
  type WebCapability,
} from "./browserHostCapabilities";
import { WebBridgeDiagnostics } from "./WebBridgeDiagnostics";
import { WebCapabilityPanel } from "./WebCapabilityPanel";
import { detectWebHostClass, type WebHostClass } from "./hostClass";
import { buildWebCapabilityGraph } from "./webCapabilityGraph";

const HOST_EXPERIENCE: Record<
  WebHostClass,
  {
    label: string;
    runtime: string;
    route: string;
    mode: string;
    priority: string;
  }
> = {
  "desktop-web": {
    label: "Desktop Web",
    runtime: "Browser Host",
    route: "Pair a Desktop host or install LucaOS Desktop for deeper local access.",
    mode: "Command surface",
    priority: "Files, clipboard, screen share, and host pairing",
  },
  "mobile-web": {
    label: "Mobile Web",
    runtime: "Mobile Browser Host",
    route: "Use camera, microphone, share, and location here; install Mobile for the full native runtime.",
    mode: "Touch-first surface",
    priority: "Camera, microphone, share, location, and session handoff",
  },
  "tablet-web": {
    label: "Tablet Web",
    runtime: "Tablet Browser Host",
    route: "Use touch and browser media here, or continue through a paired Mobile or Desktop host.",
    mode: "Adaptive workspace",
    priority: "Touch, media, split-view capability map, and pairing",
  },
  "smart-tv-web": {
    label: "Smart TV Web",
    runtime: "Display Host",
    route: "Pair with a phone or desktop through LucaLink to control this session.",
    mode: "Large display mode",
    priority: "Remote navigation, session display, and phone/desktop control",
  },
  "embedded-web": {
    label: "Embedded Web",
    runtime: "Constrained Browser Host",
    route: "Continue a governed session or pair a capable host for requested actions.",
    mode: "Locked-down surface",
    priority: "Sign-in, session view, and remote pairing",
  },
  "kiosk-web": {
    label: "Kiosk Web",
    runtime: "Constrained Display Host",
    route: "Use this display for an approved session; control and capabilities remain on a paired host.",
    mode: "Session display",
    priority: "Remote pairing, session display, and minimal local access",
  },
  "unknown-web": {
    label: "Unknown Browser Host",
    runtime: "Browser Host",
    route: "Review detected host capabilities before choosing a governed route.",
    mode: "Compatibility surface",
    priority: "Capability discovery and safe session continuation",
  },
};

const BROWSER_GROUPS = [
  {
    title: "Input & interaction",
    capabilityIds: ["keyboardMouseInput", "touchInput", "remoteControlNavigation"],
  },
  {
    title: "Media & sensors",
    capabilityIds: ["camera", "microphone", "geolocation"],
  },
  {
    title: "Browser surface",
    capabilityIds: [
      "filePicker",
      "dragDrop",
      "clipboard",
      "notifications",
      "screenShare",
      "webShare",
    ],
  },
  {
    title: "Compute & runtime",
    capabilityIds: [
      "wasm",
      "webGpu",
      "serviceWorker",
      "pwaInstall",
      "localBrowserStorage",
      "webrtc",
    ],
  },
];

const NATIVE_GROUPS = [
  {
    title: "Native Host Runtime",
    capabilityIds: ["nativeAutomation", "electronIPC", "localProcessExecution"],
  },
  {
    title: "Memory & Storage",
    capabilityIds: [
      "encryptedLocalVault",
      "localSQLiteMemory",
      "localFilesystemMemory",
      "masterKeyStorage",
    ],
  },
  {
    title: "Models",
    capabilityIds: [
      "localModelScan",
      "ollamaRuntime",
      "cloudModelRouting",
      "byokModelRouting",
    ],
  },
  {
    title: "Surfaces",
    capabilityIds: [
      "lucaScreenNativeOverlay",
      "smartTvDisplayBridge",
      "largeDisplaySession",
    ],
  },
  {
    title: "LucaLink",
    capabilityIds: [
      "desktopLucaLinkHostRuntime",
      "sessionPorting",
      "remoteCapabilityRoute",
    ],
  },
];

type Surface = "home" | "onboarding" | "chat" | "settings" | "capabilities" | "lucalink";

const configured = (value: unknown): boolean =>
  typeof value === "string" && value.trim().length > 0;

export function WebBridgeShell() {
  const [surface, setSurface] = useState<Surface>("home");
  const hostClass = useMemo(() => detectWebHostClass(), []);
  const host = HOST_EXPERIENCE[hostClass];
  const cloudConfigured = configured(
    import.meta.env.VITE_LUCA_API_URL || import.meta.env.VITE_CLOUD_API_URL,
  );
  const linkConfigured = configured(import.meta.env.VITE_RELAY_SERVER_URL);
  const browserCapabilities = useMemo(
    () => Object.values(detectBrowserHostCapabilities(hostClass)),
    [hostClass],
  );
  const nativeCapabilities = useMemo(
    () =>
      Object.values(
        buildWebCapabilityGraph({
          cloudApiConfigured: cloudConfigured,
          webChatConfigured: configured(import.meta.env.VITE_LUCA_API_URL),
          lucaLinkConnectorConfigured: linkConfigured,
        }),
      ),
    [cloudConfigured, linkConfigured],
  );

  window.__LUCA_DETECTED_HOST_CLASS__ = hostClass;
  const availableCount = browserCapabilities.filter(
    (item) => item.status === "available",
  ).length;
  const guardedCount = nativeCapabilities.filter(
    (item) => item.status !== "available",
  ).length;
  const linkStatus = linkConfigured ? "Ready to pair" : "Connector required";
  const isDisplayHost = hostClass === "smart-tv-web" || hostClass === "kiosk-web";

  return (
    <main
      className={`h-full min-h-screen overflow-y-auto bg-[#050609] text-white ${
        isDisplayHost ? "text-[1.08rem]" : ""
      }`}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(34,211,238,0.13),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(139,92,246,0.13),transparent_25%),linear-gradient(180deg,#090b12_0%,#040509_58%,#090a10_100%)]" />
      <div className={`relative mx-auto w-full px-4 py-6 sm:px-7 lg:px-10 lg:py-10 ${isDisplayHost ? "max-w-[110rem]" : "max-w-7xl"}`}>
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-9">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-2xl border border-cyan-100/20 bg-cyan-100/[0.07] shadow-[0_0_40px_rgba(103,232,249,0.18)]">
                  <div className="h-6 w-6 rounded-full border border-cyan-50/70 bg-cyan-50/10 shadow-[0_0_20px_rgba(207,250,254,0.7)]" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-100/60">
                    Universal browser-access host surface
                  </p>
                  <h1 className={`mt-1 font-semibold tracking-[-0.045em] ${isDisplayHost ? "text-5xl sm:text-6xl" : "text-3xl sm:text-4xl"}`}>
                    LucaOS WebBridge
                  </h1>
                </div>
              </div>
              <p className="mt-6 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
                Access LucaOS from this browser host. Use browser-safe capabilities
                here, continue through LucaLink across hosts, and unlock deeper
                native access through installed hosts or approved connectors.
              </p>
              <div className="mt-5 inline-flex rounded-full border border-cyan-100/15 bg-cyan-100/[0.07] px-4 py-2 text-xs text-cyan-50/80">
                Recommended route · {host.route}
              </div>
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:w-[34rem]">
              <Metric label="Current host" value={host.label} />
              <Metric label="Runtime level" value={host.runtime} />
              <Metric label="Selected entry" value="WebBridge" />
              <Metric label="Native runtime" value="Not active · browser sandbox" />
              <Metric label="LucaLink" value={linkStatus} />
              <Metric label="Cloud intelligence" value={cloudConfigured ? "Available" : "API required"} />
            </div>
          </div>
        </header>

        <section className="mt-5 rounded-[1.6rem] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-violet-100/55">
                {host.mode}
              </p>
              <h2 className="mt-2 text-xl font-semibold">Choose a WebBridge route</h2>
              <p className="mt-2 text-sm text-white/45">{host.priority}</p>
            </div>
            <button type="button" onClick={() => setSurface("home")} className="rounded-xl border border-white/10 px-4 py-2 text-xs text-white/60 hover:bg-white/[0.06]">
              Host overview
            </button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Action title="Start Web Onboarding" detail="Prepare this browser host and session." onClick={() => setSurface("onboarding")} />
            <Action title="Open Web Chat" detail="Enter the browser-safe conversation surface." onClick={() => setSurface("chat")} />
            <Action title="View Capability Map" detail="Inspect browser and routed host capabilities." onClick={() => setSurface("capabilities")} />
            <Action title="Pair with LucaLink Host" detail="Prepare a governed cross-host pairing." onClick={() => setSurface("lucalink")} />
            <Action title="Continue on Another Host" detail="Stage a session-porting handoff." onClick={() => setSurface("lucalink")} />
            <Action title={hostClass === "mobile-web" ? "Install Mobile / Desktop" : "Install Desktop / Mobile"} detail="Unlock an installed native host runtime." onClick={() => setSurface("settings")} />
          </div>
        </section>

        {surface !== "home" && surface !== "capabilities" && (
          <SafeSurface surface={surface} hostLabel={host.label} cloudConfigured={cloudConfigured} />
        )}

        {(surface === "home" || surface === "capabilities") && (
          <>
            <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
              <WebCapabilityPanel
                eyebrow="Browser-safe capability map"
                title={`Host capabilities · ${host.label}`}
                capabilities={browserCapabilities}
                grouped={BROWSER_GROUPS}
              />
              <div className="grid content-start gap-5">
                <LucaLinkPanel setSurface={setSurface} isDisplayHost={isDisplayHost} />
                <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-violet-100/55">Governed route foundation</p>
                  <h2 className="mt-2 text-xl font-semibold">Route Unlock</h2>
                  <p className="mt-3 text-sm leading-6 text-white/50">
                    Browser permissions, installed hosts, paired hosts, connectors,
                    and API routes remain explicit and user-approved. WebBridge
                    never bypasses browser or operating-system security.
                  </p>
                </section>
                <WebBridgeDiagnostics
                  hostClass={hostClass}
                  availableBrowserCapabilityCount={availableCount}
                  guardedNativeCapabilityCount={guardedCount}
                  lucaLinkStatus={linkStatus}
                />
              </div>
            </div>
            <div className="mt-5">
              <WebCapabilityPanel
                eyebrow="Native and routed capability map"
                title="Guarded LucaOS capabilities"
                capabilities={nativeCapabilities}
                grouped={NATIVE_GROUPS}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Action({ title, detail, onClick }: { title: string; detail: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group rounded-2xl border border-white/[0.09] bg-black/20 p-4 text-left transition hover:border-cyan-100/25 hover:bg-cyan-100/[0.06] focus:outline-none focus:ring-2 focus:ring-cyan-200/40">
      <span className="flex items-center justify-between gap-3 text-sm font-medium text-white/90">
        {title}<span className="text-cyan-200/50 transition group-hover:translate-x-1">→</span>
      </span>
      <span className="mt-2 block text-xs leading-5 text-white/42">{detail}</span>
    </button>
  );
}

function SafeSurface({ surface, hostLabel, cloudConfigured }: { surface: Exclude<Surface, "home" | "capabilities">; hostLabel: string; cloudConfigured: boolean }) {
  const copy = {
    onboarding: ["Web Onboarding", "Set up your browser-host identity, review permissions, and choose where this session can continue."],
    chat: ["Web Chat", cloudConfigured ? "The browser-safe API route is available for this conversation surface." : "This conversation surface is ready. Configure a browser-safe API route to begin."],
    settings: ["Web Settings", "Manage browser-host preferences and review Desktop, Mobile, connector, and API unlock routes."],
    lucalink: ["LucaLink Pairing", "Pairing networking is intentionally not started here. Choose a host type to stage a governed pairing request."],
  }[surface];
  return (
    <section className="mt-5 rounded-[1.8rem] border border-cyan-100/15 bg-gradient-to-br from-cyan-100/[0.08] to-violet-100/[0.04] p-6 backdrop-blur-2xl sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/55">Browser-safe internal surface · {hostLabel}</p>
      <h2 className="mt-3 text-2xl font-semibold">{copy[0]}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">{copy[1]}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {["Desktop host", "Mobile host", "Smart TV / Large Display"].map((label) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/65">{label}<p className="mt-2 text-xs text-white/35">User approval required</p></div>
        ))}
      </div>
    </section>
  );
}

function LucaLinkPanel({ setSurface, isDisplayHost }: { setSurface: (surface: Surface) => void; isDisplayHost: boolean }) {
  return (
    <section className="rounded-[1.6rem] border border-cyan-100/15 bg-gradient-to-b from-cyan-100/[0.08] to-white/[0.035] p-6 backdrop-blur-2xl">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-cyan-100/55">Cross-host capability fabric</p>
      <h2 className="mt-2 text-xl font-semibold">LucaLink session porting</h2>
      <p className="mt-3 text-sm leading-6 text-white/50">
        LucaLink ports LucaOS sessions and governed capability requests across hosts.
      </p>
      {isDisplayHost && (
        <div className="mt-4 grid place-items-center rounded-2xl border border-dashed border-cyan-100/25 bg-black/20 p-6 text-center">
          <div className="grid h-24 w-24 grid-cols-3 gap-1 rounded-xl border border-white/15 p-3 opacity-70">
            {Array.from({ length: 9 }).map((_, index) => <span key={index} className={index % 2 === 0 ? "bg-cyan-100/70" : "bg-white/15"} />)}
          </div>
          <p className="mt-4 text-sm font-medium">Use phone/desktop to control this session</p>
          <p className="mt-1 text-xs text-white/40">Pairing code placeholder</p>
        </div>
      )}
      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-sm font-medium">No paired hosts</p>
        <ul className="mt-3 grid gap-2 text-xs text-white/48">
          <li>• Pair a Desktop host</li>
          <li>• Pair a Mobile host</li>
          <li>• Pair Smart TV / Large Display</li>
          <li>• Continue session on another host</li>
          <li>• Request capability through paired host</li>
        </ul>
      </div>
      <button type="button" onClick={() => setSurface("lucalink")} className="mt-4 w-full rounded-xl border border-cyan-100/20 bg-cyan-100/[0.08] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-50/80 hover:bg-cyan-100/[0.13]">
        Open pairing foundation
      </button>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/35">{label}</p>
      <p className="mt-2 text-sm font-medium text-white/85">{value}</p>
    </div>
  );
}
