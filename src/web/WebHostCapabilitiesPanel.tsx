import { LucaSettingsHeading } from "../shared/settings/LucaSettingsShell";
import { LucaAction, LucaSurface } from "../shared/ui/LucaPrimitives";
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

export function WebHostCapabilitiesPanel({ onOpenLucaLink }: { onOpenLucaLink: () => void }) {
  const runtime = useWebRuntime();
  return (
    <div data-settings-surface="host-capabilities" className="grid gap-4">
      <div>
        <LucaSettingsHeading eyebrow="Settings · System Status" title="Host & Capabilities" detail={`Current host: ${runtime.hostClass.replace("-", " ")}. Review browser capabilities and governed routes only when you need them.`} />
        <LucaAction onClick={onOpenLucaLink}>Open LucaLink</LucaAction>
      </div>
      <WebCapabilityPanel eyebrow="Browser-safe capability map" title="Current browser host" capabilities={Object.values(runtime.browserCapabilities)} grouped={BROWSER_GROUPS} />
      <WebCapabilityPanel eyebrow="Native and routed capability map" title="Guarded LucaOS capabilities" capabilities={Object.values(runtime.nativeCapabilityGuards)} grouped={NATIVE_GROUPS} />
      <LucaSurface><h3 className="font-semibold">Route Unlock</h3><p className="mt-2 text-sm leading-6 text-[var(--luca-text-secondary)]">Browser permissions, installed hosts, paired hosts, approved connectors, governed routes, and API configuration remain explicit and contextual.</p></LucaSurface>
    </div>
  );
}
