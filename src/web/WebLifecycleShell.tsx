import { useEffect, useState } from "react";
import { useLucaLocalEndpointStatus } from "../hooks/useLucaLocalEndpointStatus";
import OnboardingFlow from "../components/Onboarding/OnboardingFlow";
import { generateThemeStyles, getThemeColors } from "../config/themeColors";
import { WebBridgeDiagnostics } from "./WebBridgeDiagnostics";
import { WebLucaBackground } from "./WebLucaBackground";
import { WebLucaShell } from "./WebLucaShell";
import { WebReadyState } from "./WebReadyState";
import { useWebRuntime } from "./WebRuntimeContext";
import { webOnboardingRuntime } from "./adapters/webOnboardingRuntime";
import type { WebCapability } from "./browserHostCapabilities";
import {
  completeWebOnboarding,
  writeWebPremiumPreferences,
} from "./webLifecycleStorage";
import { LucaPremiumOnboardingPreview } from "../components/Onboarding/LucaPremiumOnboardingPreview";
import { isPremiumOnboardingEnabled } from "../components/Onboarding/lucaPremiumOnboardingFlag";
import { mapLucaOnboardingFlowToWebProfile } from "../components/Onboarding/lucaOnboardingCompletionBridge";
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
  const { status: localEndpointStatus } = useLucaLocalEndpointStatus({
    enabled: isPremiumOnboardingEnabled(),
  });
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
      {lifecycleState === "onboarding" && isPremiumOnboardingEnabled() && (
        <LucaPremiumOnboardingPreview
          hostKind="desktop-web"
          supportsLocalProvisioning={false}
          localEndpointStatus={localEndpointStatus}
          style={{ minHeight: "100dvh" }}
          onComplete={(flow) => {
            const { profile, premiumPreferences } =
              mapLucaOnboardingFlowToWebProfile(flow);
            completeWebOnboarding(profile);
            writeWebPremiumPreferences(premiumPreferences);
            setLifecycleState(showWebReadyDebug ? "ready" : "main");
          }}
        />
      )}
      {lifecycleState === "onboarding" && !isPremiumOnboardingEnabled() && (
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
        <WebReadyState
          hostClass={runtime.hostClass}
          browserCapabilities={browserCapabilities}
          guardedNativeCapabilities={nativeCapabilities}
          lucaLinkStatus={runtime.lucaLinkStatus}
          onContinueToShell={() => setLifecycleState("main")}
        />
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
