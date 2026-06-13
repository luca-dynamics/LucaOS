import { LucaButton, LucaPanel } from "../shared/ui/LucaWebPrimitives";
import { WebCapabilityPanel } from "./WebCapabilityPanel";
import { useWebRuntime } from "./WebRuntimeContext";

const BROWSER_GROUPS = [
  { title: "Input & interaction", capabilityIds: ["keyboardMouseInput", "touchInput", "remoteControlNavigation"] },
  { title: "Media & sensors", capabilityIds: ["camera", "microphone", "geolocation"] },
  { title: "Browser surface", capabilityIds: ["filePicker", "dragDrop", "clipboard", "notifications", "screenShare", "webShare"] },
  { title: "Compute & runtime", capabilityIds: ["wasm", "webGpu", "serviceWorker", "pwaInstall", "localBrowserStorage", "webrtc"] },
];
const NATIVE_GROUPS = [
  { title: "Native Host Runtime", capabilityIds: ["nativeAutomation", "electronIPC", "localProcessExecution"] },
  { title: "Memory & Storage", capabilityIds: ["encryptedLocalVault", "localSQLiteMemory", "localFilesystemMemory", "masterKeyStorage"] },
  { title: "Models", capabilityIds: ["localModelScan", "ollamaRuntime", "cloudModelRouting", "byokModelRouting"] },
  { title: "Surfaces", capabilityIds: ["lucaScreenNativeOverlay", "smartTvDisplayBridge", "largeDisplaySession"] },
  { title: "LucaLink", capabilityIds: ["desktopLucaLinkHostRuntime", "sessionPorting", "remoteCapabilityRoute"] },
];

export function WebHostCapabilitiesPanel({ onBack, onOpenLucaLink }: { onBack: () => void; onOpenLucaLink: () => void }) {
  const runtime = useWebRuntime();
  return (
    <div data-settings-surface="host-capabilities" className="grid gap-4">
      <LucaPanel>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/55">Settings · System Status</p>
        <h2 className="mt-2 text-2xl font-semibold">Host & Capabilities</h2>
        <p className="mt-3 text-sm leading-6 text-white/55">Current host: {runtime.hostClass.replace("-", " ")}. Review browser capabilities and governed routes only when you need them.</p>
        <div className="mt-5 flex flex-wrap gap-3"><LucaButton onClick={onOpenLucaLink}>Open LucaLink</LucaButton><LucaButton variant="quiet" onClick={onBack}>Back to LucaOS</LucaButton></div>
      </LucaPanel>
      <WebCapabilityPanel eyebrow="Browser-safe capability map" title="Current browser host" capabilities={Object.values(runtime.browserCapabilities)} grouped={BROWSER_GROUPS} />
      <WebCapabilityPanel eyebrow="Native and routed capability map" title="Guarded LucaOS capabilities" capabilities={Object.values(runtime.nativeCapabilityGuards)} grouped={NATIVE_GROUPS} />
      <LucaPanel><h3 className="font-semibold">Route Unlock</h3><p className="mt-2 text-sm leading-6 text-white/50">Browser permissions, installed hosts, paired hosts, approved connectors, governed routes, and API configuration remain explicit and contextual.</p></LucaPanel>
    </div>
  );
}
