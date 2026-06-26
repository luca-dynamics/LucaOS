import { useState } from "react";

import { WebLifecycleShell } from "./WebLifecycleShell";
import { WebRuntimeProvider } from "./WebRuntimeContext";
import { readWebOnboardingComplete } from "./webLifecycleStorage";

function WebSafeModeBanner() {
  const safeMode =
    typeof window !== "undefined" ? window.__LUCA_WEB_SAFE_MODE__ : undefined;
  const isBootDebug =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("bootDebug") === "1";
  const [expanded, setExpanded] = useState(isBootDebug);

  if (!safeMode) return null;
  // Keep the premium first-run experience clean: don't blanket boot/onboarding
  // with the safe-mode card. It surfaces in the main app (once onboarding is
  // complete), where the status is actionable. bootDebug forces it everywhere.
  if (!isBootDebug && !readWebOnboardingComplete()) return null;

  return (
    <aside
      role="status"
      className="fixed bottom-4 left-4 z-[1000] max-w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-amber-300/30 bg-[#1b160c]/95 px-3 py-2 text-xs text-amber-50 shadow-lg shadow-black/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold leading-5">Web Safe Mode</p>
          <p className="text-amber-100/80">Secure local memory disabled</p>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          className="shrink-0 rounded-md border border-amber-200/25 px-2 py-1 text-[0.68rem] font-medium text-amber-50 hover:bg-amber-200/10 focus:outline-none focus:ring-2 focus:ring-amber-200/60"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Hide details" : "Details"}
        </button>
      </div>

      {expanded ? (
        <div className="mt-3 border-t border-amber-200/15 pt-3">
          <p className="mb-2 text-amber-100/80">
            Protected runtime features are disabled because the master key is
            missing or invalid. Interface preview remains available.
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[0.68rem] text-amber-100/70">
            <dt>reason</dt>
            <dd>{safeMode.reason}</dd>
            <dt>key status</dt>
            <dd>{safeMode.keyStatus}</dd>
            <dt>expected format</dt>
            <dd>{safeMode.expectedKeyFormat}</dd>
            <dt>secureRuntimeAvailable</dt>
            <dd>{String(safeMode.secureRuntimeAvailable)}</dd>
            <dt>reactMountAllowed</dt>
            <dd>{String(safeMode.canMountWebUi)}</dd>
            <dt>host</dt>
            <dd>{safeMode.host}</dd>
            <dt>path</dt>
            <dd>{safeMode.path}</dd>
          </dl>
        </div>
      ) : null}
    </aside>
  );
}

export function WebBridgeShell() {
  return (
    <WebRuntimeProvider>
      <WebSafeModeBanner />
      <WebLifecycleShell />
    </WebRuntimeProvider>
  );
}
