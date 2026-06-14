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
import { WebReadyState } from "./WebReadyState";

export type WebLifecycleState = "onboarding" | "ready";

export function WebLifecycleShell() {
  const runtime = useWebRuntime();
  const [lifecycle, setLifecycle] = useState<WebLifecycleState>(() =>
    readWebOnboardingComplete() ? "ready" : "onboarding",
  );
  const onboardingComplete = lifecycle === "ready";
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
      {lifecycle === "onboarding" ? (
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
            setLifecycle("ready");
          }}
        />
      ) : (
        <WebReadyState
          hostClass={runtime.hostClass}
          browserCapabilities={browserCapabilities}
          guardedNativeCapabilities={nativeCapabilities}
          lucaLinkStatus={runtime.lucaLinkStatus}
        />
      )}
      <WebBridgeDiagnostics
        hostClass={runtime.hostClass}
        lifecycleState={lifecycle}
        onboardingComplete={onboardingComplete}
        activeWebSurface={
          lifecycle === "onboarding" ? "lucaos-onboarding" : "web-ready-state"
        }
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
