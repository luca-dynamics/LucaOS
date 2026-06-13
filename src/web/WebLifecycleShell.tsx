import { useState } from "react";
import { WebBridgeDiagnostics } from "./WebBridgeDiagnostics";
import { WebMainSurface } from "./WebMainSurface";
import { WebOnboardingSurface } from "./WebOnboardingSurface";
import { useWebRuntime } from "./WebRuntimeContext";
import { completeWebOnboarding, readWebOnboardingComplete, readWebProfile, type WebProfile } from "./webLifecycleStorage";

export type WebLifecycleState = "checking" | "needs-onboarding" | "ready" | "session-restore-failed";

export function WebLifecycleShell() {
  const runtime = useWebRuntime();
  const [profile, setProfile] = useState<WebProfile | null>(() => readWebProfile());
  const [lifecycle, setLifecycle] = useState<WebLifecycleState>(() => readWebOnboardingComplete() ? "ready" : "needs-onboarding");
  const activeSurface = lifecycle === "ready" ? "main" : "onboarding";
  const browserCapabilities = Object.values(runtime.browserCapabilities);
  const nativeCapabilities = Object.values(runtime.nativeCapabilityGuards);

  const finishOnboarding = (nextProfile: WebProfile) => {
    try {
      completeWebOnboarding(nextProfile);
      setProfile(nextProfile);
      setLifecycle("ready");
    } catch {
      setLifecycle("session-restore-failed");
    }
  };

  return (
    <main className="relative h-full min-h-screen overflow-y-auto bg-[var(--luca-background-base,#050609)] text-[var(--luca-text-primary,#fff)]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_4%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(139,92,246,0.10),transparent_26%),linear-gradient(180deg,#090b12_0%,#040509_62%,#090a10_100%)]" />
      <div className="glass-noise fixed inset-0" />
      <div className="relative min-h-full">
        {lifecycle === "ready" ? <WebMainSurface profile={profile} /> : <WebOnboardingSurface onComplete={finishOnboarding} />}
        <div className="mx-auto max-w-7xl px-4 pb-6 sm:px-7">
          <WebBridgeDiagnostics
            hostClass={runtime.hostClass}
            lifecycleState={lifecycle}
            onboardingComplete={lifecycle === "ready"}
            activeWebSurface={activeSurface}
            availableBrowserCapabilityCount={browserCapabilities.filter((item) => item.status === "available").length}
            guardedNativeCapabilityCount={nativeCapabilities.filter((item) => item.status !== "available").length}
            lucaLinkStatus={runtime.lucaLinkStatus}
          />
        </div>
      </div>
    </main>
  );
}
