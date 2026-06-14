import { WebBridgeDiagnostics } from "./WebBridgeDiagnostics";
import { useWebRuntime } from "./WebRuntimeContext";
import type { WebCapability } from "./browserHostCapabilities";
import { readWebOnboardingComplete } from "./webLifecycleStorage";

export type WebLifecycleState = "direct-reuse-blocked";

export function WebLifecycleShell() {
  const runtime = useWebRuntime();
  const onboardingComplete = readWebOnboardingComplete();
  const browserCapabilities = Object.values(
    runtime.browserCapabilities,
  ) as WebCapability[];
  const nativeCapabilities = Object.values(
    runtime.nativeCapabilityGuards,
  ) as WebCapability[];

  return (
    <main>
      <p>
        Original LucaOS onboarding is blocked from WebBridge by unsafe imports.
        See WEBBRIDGE_DIRECT_REUSE_AUDIT.md.
      </p>
      <WebBridgeDiagnostics
        hostClass={runtime.hostClass}
        lifecycleState="direct-reuse-blocked"
        onboardingComplete={onboardingComplete}
        activeWebSurface="direct-reuse-blocked"
        availableBrowserCapabilityCount={
          browserCapabilities.filter((item) => item.status === "available").length
        }
        guardedNativeCapabilityCount={
          nativeCapabilities.filter((item) => item.status !== "available").length
        }
        lucaLinkStatus={runtime.lucaLinkStatus}
      />
    </main>
  );
}
