import { useEffect, useState } from "react";
import OnboardingFlow from "../components/Onboarding/OnboardingFlow";
import { generateThemeStyles, getThemeColors } from "../config/themeColors";
import { WebBridgeDiagnostics } from "./WebBridgeDiagnostics";
import { useWebRuntime } from "./WebRuntimeContext";
import { webOnboardingRuntime } from "./adapters/webOnboardingRuntime";
import type { WebCapability } from "./browserHostCapabilities";
import {
  completeWebOnboarding,
  readWebOnboardingComplete,
} from "./webLifecycleStorage";
import { WebLucaBackground } from "./WebLucaBackground";

export type WebLifecycleState = "onboarding";

export function WebLifecycleShell() {
  const runtime = useWebRuntime();
  const onboardingComplete = readWebOnboardingComplete();
  const [visualSettings, setVisualSettings] = useState(() =>
    webOnboardingRuntime.getVisualSettings(),
  );
  const theme = getThemeColors(visualSettings.theme);
  const browserCapabilities = Object.values(
    runtime.browserCapabilities,
  ) as WebCapability[];
  const nativeCapabilities = Object.values(
    runtime.nativeCapabilityGuards,
  ) as WebCapability[];

  useEffect(
    () =>
      webOnboardingRuntime.subscribeVisualSettings?.(setVisualSettings) ??
      (() => {}),
    [],
  );

  return (
    <WebLucaBackground visualSettings={visualSettings}>
      <style>{generateThemeStyles()}</style>
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
        }}
      />
      <WebBridgeDiagnostics
        hostClass={runtime.hostClass}
        lifecycleState="onboarding"
        onboardingComplete={onboardingComplete}
        activeWebSurface="lucaos-onboarding"
        availableBrowserCapabilityCount={
          browserCapabilities.filter((item) => item.status === "available").length
        }
        guardedNativeCapabilityCount={
          nativeCapabilities.filter((item) => item.status !== "available").length
        }
        lucaLinkStatus={runtime.lucaLinkStatus}
      />
    </WebLucaBackground>
  );
}
