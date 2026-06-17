import { useEffect, useState } from "react";
import OnboardingFlow from "../components/Onboarding/OnboardingFlow";
import { generateThemeStyles, getThemeColors } from "../config/themeColors";
import { WebBridgeDiagnostics } from "./WebBridgeDiagnostics";
import { WebLucaBackground } from "./WebLucaBackground";
import { WebLucaShell } from "./WebLucaShell";
import { useWebRuntime } from "./WebRuntimeContext";
import { webOnboardingRuntime } from "./adapters/webOnboardingRuntime";
import type { WebCapability } from "./browserHostCapabilities";
import { completeWebOnboarding } from "./webLifecycleStorage";
import { WebPostBootTransition } from "./postBoot/WebPostBootTransition";
import { WebPostBootLoading } from "./postBoot/WebPostBootLoading";
import {
  resolveWebPostBootState,
  type WebPostBootStateSnapshot,
} from "./postBoot/webPostBootState";

export type WebLifecycleState = "post_boot" | "onboarding" | "ready" | "main";

const showWebReadyDebug = import.meta.env.VITE_LUCA_SHOW_WEB_READY_DEBUG === "true";

export function WebLifecycleShell() {
  const runtime = useWebRuntime();
  const [lifecycleState, setLifecycleState] =
    useState<WebLifecycleState>("post_boot");
  const [postBootState, setPostBootState] =
    useState<WebPostBootStateSnapshot | null>(null);
  const [visualSettings, setVisualSettings] = useState(() =>
    webOnboardingRuntime.getVisualSettings(),
  );
  useEffect(() => {
    return webOnboardingRuntime.subscribeVisualSettings(setVisualSettings);
  }, []);
  useEffect(() => {
    let active = true;
    void resolveWebPostBootState().then((snapshot) => {
      if (active) setPostBootState(snapshot);
    });
    return () => {
      active = false;
    };
  }, []);
  const theme = getThemeColors(visualSettings.theme);
  const browserCapabilities = Object.values(
    runtime.browserCapabilities,
  ) as WebCapability[];
  const nativeCapabilities = Object.values(
    runtime.nativeCapabilityGuards,
  ) as WebCapability[];

  return (
    <main className="relative min-h-dvh w-full overflow-hidden">
      <style>{generateThemeStyles()}</style>
      <WebLucaBackground
        visualSettings={visualSettings}
        theme={{ hex: theme.hex, themeName: visualSettings.theme }}
      />
      {lifecycleState === "post_boot" && !postBootState && (
        <WebPostBootLoading />
      )}
      {lifecycleState === "post_boot" && postBootState && (
        <WebPostBootTransition
          snapshot={postBootState}
          onContinue={() =>
            setLifecycleState(
              postBootState.userState === "new_user"
                ? "onboarding"
                : showWebReadyDebug
                  ? "ready"
                  : "main",
            )
          }
          onRestartOnboarding={() => setLifecycleState("onboarding")}
          onReviewVoiceAccess={() => setLifecycleState("onboarding")}
          onChooseModelRoute={() => setLifecycleState("onboarding")}
        />
      )}
      {lifecycleState === "onboarding" && (
        <OnboardingFlow
          theme={{ primary: visualSettings.theme, hex: theme.hex }}
          runtime={webOnboardingRuntime}
          onComplete={(profile, mode) => {
            const currentVisualSettings =
              webOnboardingRuntime.getVisualSettings();
            completeWebOnboarding({
              name: profile?.identity?.name || "",
              interaction: mode === "voice" ? "voice" : "chat",
              theme: currentVisualSettings.theme as
                | "PROFESSIONAL"
                | "MASTER_SYSTEM"
                | "FROST"
                | "LIGHTCREAM",
              modelRoute: "cloud",
              personality: "proactive",
              backgroundOpacity: currentVisualSettings.backgroundOpacity,
              backgroundBlur: currentVisualSettings.backgroundBlur,
            });
            setLifecycleState(showWebReadyDebug ? "ready" : "main");
          }}
        />
      )}
      {lifecycleState === "ready" && showWebReadyDebug && (
        <section className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center">
          <div className="rounded-2xl border border-white/10 bg-black/70 p-6 text-white">
            <p>Preparing your LucaOS workspace...</p>
            <button type="button" className="mt-4 rounded-xl border border-white/20 px-4 py-2" onClick={() => setLifecycleState("main")}>Open LucaOS</button>
          </div>
        </section>
      )}
      {lifecycleState === "main" && (
        <WebLucaShell
          hostClass={runtime.hostClass}
          lucaLinkStatus={runtime.lucaLinkStatus}
          browserCapabilities={browserCapabilities}
          guardedNativeCapabilities={nativeCapabilities}
        />
      )}
      <WebBridgeDiagnostics
        hostClass={runtime.hostClass}
        lifecycleState={lifecycleState}
        onboardingComplete={postBootState?.hasCompletedOnboarding ?? false}
        activeWebSurface={
          lifecycleState === "main"
            ? "web-luca-shell"
            : lifecycleState === "ready"
              ? "web-ready-debug"
              : lifecycleState === "onboarding"
                ? "lucaos-onboarding"
                : "web-post-boot"
        }
        availableBrowserCapabilityCount={
          browserCapabilities.filter((item) => item.status === "available")
            .length
        }
        guardedNativeCapabilityCount={
          nativeCapabilities.filter((item) => item.status !== "available")
            .length
        }
        lucaLinkStatus={runtime.lucaLinkStatus}
      />
    </main>
  );
}
