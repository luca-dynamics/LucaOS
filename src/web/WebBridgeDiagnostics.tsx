import type { WebHostClass } from "./hostClass";

interface WebBridgeDiagnosticsProps {
  hostClass: WebHostClass;
  lifecycleState: string;
  onboardingComplete: boolean;
  activeWebSurface: string;
  availableBrowserCapabilityCount: number;
  guardedNativeCapabilityCount: number;
  lucaLinkStatus: string;
}

export function WebBridgeDiagnostics({
  hostClass,
  lifecycleState,
  onboardingComplete,
  activeWebSurface,
  availableBrowserCapabilityCount,
  guardedNativeCapabilityCount,
  lucaLinkStatus,
}: WebBridgeDiagnosticsProps) {
  if (
    typeof window === "undefined" ||
    new URLSearchParams(window.location.search).get("bootDebug") !== "1"
  ) {
    return null;
  }

  const rows = [
    ["selectedEntry", window.__LUCA_SELECTED_ENTRY__ ?? "unknown"],
    ["reactEntryLoaded", String(window.__LUCA_REACT_ENTRY_LOADED__ === true)],
    [
      "webBridgeMountAttempted",
      String(window.__LUCA_WEB_BRIDGE_MOUNT_ATTEMPTED__ === true),
    ],
    ["webBridgeMounted", String(window.__LUCA_WEB_BRIDGE_MOUNTED__ === true)],
    [
      "desktopEntryImported",
      String(window.__LUCA_DESKTOP_ENTRY_IMPORTED__ === true),
    ],
    ["detectedHostClass", hostClass],
    ["webLifecycleState", lifecycleState],
    ["onboardingComplete", String(onboardingComplete)],
    ["activeWebSurface", activeWebSurface],
    ["availableBrowserCapabilityCount", String(availableBrowserCapabilityCount)],
    ["guardedNativeCapabilityCount", String(guardedNativeCapabilityCount)],
    ["lucaLinkStatus", lucaLinkStatus],
    ["bootstrapError", window.__LUCA_REACT_BOOTSTRAP_ERROR__ ?? "none"],
    [
      "capturedErrors",
      String(window.__LUCA_CAPTURED_BOOT_ERRORS__?.length ?? 0),
    ],
  ];

  return (
    <aside className="rounded-2xl border border-cyan-100/15 bg-[#071014]/90 p-4 font-mono text-[0.68rem] text-cyan-50/70">
      <p className="mb-3 font-semibold uppercase tracking-[0.18em] text-cyan-100">
        Boot diagnostics
      </p>
      <dl className="grid gap-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-5">
            <dt className="text-white/40">{label}</dt>
            <dd className="text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
