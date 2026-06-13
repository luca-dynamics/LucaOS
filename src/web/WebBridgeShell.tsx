import { useMemo } from "react";
import {
  detectBrowserHostCapabilities,
  type WebCapability,
} from "./browserHostCapabilities";
import { WebBridgeDiagnostics } from "./WebBridgeDiagnostics";
import { WebCapabilityPanel } from "./WebCapabilityPanel";
import { detectWebHostClass } from "./hostClass";
import { buildWebCapabilityGraph } from "./webCapabilityGraph";

const HOST_LABELS = {
  "desktop-web": "Desktop Web",
  "mobile-web": "Mobile Web",
  "tablet-web": "Tablet Web",
  "smart-tv-web": "Smart TV Web",
  "embedded-web": "Embedded Web",
  "kiosk-web": "Kiosk Web",
  "unknown-web": "Browser Host",
} as const;

const configured = (value: unknown): boolean =>
  typeof value === "string" && value.trim().length > 0;

export function WebBridgeShell() {
  const hostClass = useMemo(() => detectWebHostClass(), []);
  const browserCapabilities = useMemo(
    () => Object.values(detectBrowserHostCapabilities(hostClass)),
    [hostClass],
  );
  const nativeCapabilities = useMemo(
    () =>
      Object.values(
        buildWebCapabilityGraph({
          cloudApiConfigured: configured(
            import.meta.env.VITE_LUCA_API_URL ||
              import.meta.env.VITE_CLOUD_API_URL,
          ),
          webChatConfigured: configured(import.meta.env.VITE_LUCA_API_URL),
          lucaLinkConnectorConfigured: configured(
            import.meta.env.VITE_RELAY_SERVER_URL,
          ),
        }),
      ),
    [],
  );

  window.__LUCA_DETECTED_HOST_CLASS__ = hostClass;

  const availableCount = browserCapabilities.filter(
    (item) => item.status === "available",
  ).length;
  const guardedCapabilities = nativeCapabilities.filter(
    (item) =>
      item.status !== "available" &&
      item.id !== "webChat" &&
      item.id !== "cloudModelRouting",
  );
  const webSurfaces = nativeCapabilities.filter((item) =>
    ["webChat", "webOnboarding", "webSettings", "cloudModelRouting"].includes(
      item.id,
    ),
  );

  return (
    <main className="h-full min-h-screen overflow-y-auto bg-[#050609] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(125,211,252,0.12),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(167,139,250,0.1),transparent_24%),linear-gradient(180deg,#090b10_0%,#050609_50%,#090a0e_100%)]" />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-7 lg:px-10 lg:py-12">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] px-6 py-7 shadow-[0_30px_100px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:px-9 sm:py-9">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <div className="relative grid h-12 w-12 place-items-center rounded-2xl border border-cyan-100/20 bg-cyan-100/[0.07] shadow-[0_0_35px_rgba(165,243,252,0.12)]">
                  <div className="h-5 w-5 rounded-full border border-cyan-50/70 bg-cyan-50/10 shadow-[0_0_18px_rgba(207,250,254,0.65)]" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-100/60">
                    Universal browser host surface
                  </p>
                  <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                    LucaOS WebBridge
                  </h1>
                </div>
              </div>
              <p className="mt-6 max-w-2xl text-sm leading-6 text-white/58 sm:text-base sm:leading-7">
                Access LucaOS from this browser host. Use browser-safe
                capabilities here, connect LucaLink hosts for deeper native
                access, or install LucaOS Desktop/Mobile for the full local
                runtime.
              </p>
            </div>
            <div className="grid min-w-[17rem] grid-cols-2 gap-3">
              <Metric label="Current host" value={HOST_LABELS[hostClass]} />
              <Metric label="Browser-ready" value={`${availableCount}`} />
            </div>
          </div>
        </header>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <WebCapabilityPanel
            eyebrow="Browser capability graph"
            title="Available on this host"
            capabilities={browserCapabilities}
          />

          <div className="grid content-start gap-5">
            <section className="rounded-[1.6rem] border border-cyan-100/15 bg-gradient-to-b from-cyan-100/[0.08] to-white/[0.035] p-6 backdrop-blur-2xl">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-cyan-100/55">
                Cross-host fabric
              </p>
              <h2 className="mt-2 text-xl font-semibold">LucaLink</h2>
              <p className="mt-3 text-sm leading-6 text-white/50">
                LucaLink ports sessions and routes governed capabilities across
                approved hosts. It never bypasses browser or operating-system
                security.
              </p>
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-medium">No paired hosts yet</p>
                <ul className="mt-3 grid gap-2 text-xs text-white/45">
                  <li>Pair Desktop / Mobile / TV host</li>
                  <li>Continue session on another host</li>
                  <li>Request native capability through paired host</li>
                </ul>
              </div>
              <button
                type="button"
                disabled
                className="mt-4 w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.055] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/45"
              >
                Pairing connector coming next
              </button>
            </section>

            <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-violet-100/55">
                Approved route foundation
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                Capability route builder
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/50">
                Future routes may request a browser permission, connect a
                LucaLink host, or install a user-approved app or connector.
                Generated routes remain explicit, permission-governed, and
                reviewable.
              </p>
            </section>

            <WebBridgeDiagnostics hostClass={hostClass} />
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <WebCapabilityPanel
            eyebrow="Safe web surfaces"
            title="WebBridge access"
            capabilities={webSurfaces}
            compact
          />
          <WebCapabilityPanel
            eyebrow="Native runtime boundary"
            title="Guarded host capabilities"
            capabilities={guardedCapabilities}
            compact
          />
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/35">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-white/85">{value}</p>
    </div>
  );
}
