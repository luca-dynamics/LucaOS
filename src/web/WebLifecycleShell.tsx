import { useEffect, useState } from "react";
import OnboardingFlow from "../components/Onboarding/OnboardingFlow";
import { generateThemeStyles, getThemeColors } from "../config/themeColors";
import { WebBridgeDiagnostics } from "./WebBridgeDiagnostics";
import { WebLucaBackground } from "./WebLucaBackground";
import { WebReadyState } from "./WebReadyState";
import { useWebRuntime } from "./WebRuntimeContext";
import { webOnboardingRuntime } from "./adapters/webOnboardingRuntime";
import type { WebCapability } from "./browserHostCapabilities";
import {
  completeWebOnboarding,
  readWebOnboardingComplete,
} from "./webLifecycleStorage";

export type WebLifecycleState = "onboarding" | "ready";

export function WebLifecycleShell() {
  const runtime = useWebRuntime();
  const [lifecycleState, setLifecycleState] = useState<WebLifecycleState>(() =>
    readWebOnboardingComplete() ? "ready" : "onboarding",
  );
  const [visualSettings, setVisualSettings] = useState(() =>
    webOnboardingRuntime.getVisualSettings(),
  );
  useEffect(() => {
    return webOnboardingRuntime.subscribeVisualSettings(setVisualSettings);
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
            setLifecycleState("ready");
          }}
        />
      )}
      {lifecycleState === "ready" && (
        <WebReadyState
          hostClass={runtime.hostClass}
          browserCapabilities={browserCapabilities}
          guardedNativeCapabilities={nativeCapabilities}
          lucaLinkStatus={runtime.lucaLinkStatus}
        />
      )}
      <WebBridgeDiagnostics
        hostClass={runtime.hostClass}
        lifecycleState={lifecycleState}
        onboardingComplete={lifecycleState === "ready"}
        activeWebSurface={
          lifecycleState === "ready" ? "web-ready-state" : "lucaos-onboarding"
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
