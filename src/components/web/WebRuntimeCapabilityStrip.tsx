import React, { useMemo } from "react";
import {
  WEB_RUNTIME_CAPABILITY_IDS,
  createLucaLinkWebState,
  createPersonalIntelligenceWebState,
  resolveWebRuntimeCapabilities,
  type LucaWebCapabilityStatus,
} from "../../config/webRuntimeCapabilities";
import type { WebAccessPolicy } from "../../config/webAccessPolicy";

interface WebRuntimeCapabilityStripProps {
  policy: WebAccessPolicy;
}

const statusLabels: Record<LucaWebCapabilityStatus, string> = {
  available: "Available",
  disabled_in_web: "Disabled in web",
  desktop_required: "Requires Desktop",
  api_required: "API required",
  pairing_required: "Pairing required",
  unsupported: "Unsupported",
};

const statusClasses: Record<LucaWebCapabilityStatus, string> = {
  available: "border-emerald-300/40 bg-emerald-400/10 text-emerald-100",
  disabled_in_web: "border-slate-300/25 bg-white/5 text-slate-200",
  desktop_required: "border-amber-300/40 bg-amber-400/10 text-amber-100",
  api_required: "border-sky-300/40 bg-sky-400/10 text-sky-100",
  pairing_required: "border-fuchsia-300/40 bg-fuchsia-400/10 text-fuchsia-100",
  unsupported: "border-rose-300/40 bg-rose-400/10 text-rose-100",
};

const WebRuntimeCapabilityStrip: React.FC<WebRuntimeCapabilityStripProps> = ({
  policy,
}) => {
  const capabilities = useMemo(
    () =>
      resolveWebRuntimeCapabilities({
        isWebRuntime: policy.shouldRenderBrowserSafeApp,
        hasConfiguredPublicApi: policy.hasConfiguredPublicApi,
        hasAuthenticatedSession: policy.hasAuthenticatedSession,
        hasPairedDesktopHost: false,
      }),
    [policy],
  );

  if (!policy.shouldRenderBrowserSafeApp) return null;

  const personalIntelligenceState = createPersonalIntelligenceWebState(
    capabilities.personalIntelligence,
  );
  const lucaLinkState = createLucaLinkWebState(capabilities.lucaLink);

  return (
    <aside
      className="mx-3 mb-2 rounded-2xl border border-white/10 bg-black/35 px-3 py-2 text-[10px] text-slate-100 shadow-2xl backdrop-blur-xl"
      aria-label="Browser-safe LucaOS runtime capabilities"
      data-testid="web-runtime-capability-strip"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-black uppercase tracking-[0.24em] text-white/90">
            Browser-safe LucaOS interface
          </div>
          <p className="mt-1 max-w-3xl leading-relaxed text-slate-300">
            Main interface shell is rendered for visual/product QA. Desktop,
            filesystem, shell, local model, provider secret, LucaLink host, and
            raw Personal Intelligence actions stay disabled or desktop/API
            required.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 font-bold uppercase tracking-[0.18em] text-slate-200">
          No deployment/domain attach
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        {WEB_RUNTIME_CAPABILITY_IDS.map((id) => {
          const capability = capabilities[id];
          return (
            <div
              key={id}
              className="rounded-xl border border-white/10 bg-white/[0.035] p-2"
              title={capability.webBehavior}
            >
              <div className="truncate font-bold text-white/90">
                {capability.label}
              </div>
              <div
                className={`mt-1 inline-flex rounded-full border px-2 py-0.5 font-black uppercase tracking-[0.12em] ${statusClasses[capability.status]}`}
              >
                {statusLabels[capability.status]}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <div className="rounded-xl border border-sky-300/20 bg-sky-400/10 p-2">
          <strong>{personalIntelligenceState.title}:</strong>{" "}
          {personalIntelligenceState.summary} Requires {personalIntelligenceState.requires}.
        </div>
        <div className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-400/10 p-2">
          <strong>{lucaLinkState.title}:</strong> {lucaLinkState.hostState} Requires {lucaLinkState.requires}; host execution is disabled.
        </div>
      </div>
    </aside>
  );
};

export default WebRuntimeCapabilityStrip;
