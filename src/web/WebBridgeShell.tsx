import { WebLifecycleShell } from "./WebLifecycleShell";
import { WebRuntimeProvider } from "./WebRuntimeContext";

function WebSafeModeBanner() {
  const safeMode =
    typeof window !== "undefined" ? window.__LUCA_WEB_SAFE_MODE__ : undefined;

  if (!safeMode) return null;

  return (
    <div className="fixed left-4 right-4 top-4 z-[1000] rounded-2xl border border-amber-300/40 bg-[#16120a]/95 p-4 text-sm text-amber-100 shadow-2xl shadow-black/30 md:left-auto md:max-w-xl">
      <p className="font-semibold">LucaOS started in Web Safe Mode</p>
      <p className="mt-1 text-amber-100/80">
        Secure local memory is unavailable because the master key is missing or
        invalid. You can continue previewing the interface, but protected
        runtime features are disabled.
      </p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[0.7rem] text-amber-100/70">
        <dt>reason</dt>
        <dd>{safeMode.reason}</dd>
        <dt>key</dt>
        <dd>{safeMode.keyStatus}</dd>
        <dt>expected</dt>
        <dd>{safeMode.expectedKeyFormat}</dd>
      </dl>
    </div>
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
