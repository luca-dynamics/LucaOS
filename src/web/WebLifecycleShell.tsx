import OnboardingFlow from "../components/Onboarding/OnboardingFlow";
import { LiquidBackground } from "../components/visual/LiquidBackground";
import { generateThemeStyles, getThemeColors } from "../config/themeColors";
import { WebBridgeDiagnostics } from "./WebBridgeDiagnostics";
import { useWebRuntime } from "./WebRuntimeContext";
import { webOnboardingRuntime } from "./adapters/webOnboardingRuntime";
import type { WebCapability } from "./browserHostCapabilities";
import {
  completeWebOnboarding,
  readWebOnboardingComplete,
} from "./webLifecycleStorage";

export type WebLifecycleState = "onboarding";

export function WebLifecycleShell() {
  const runtime = useWebRuntime();
  const onboardingComplete = readWebOnboardingComplete();
  const visualSettings = webOnboardingRuntime.getVisualSettings();
  const theme = getThemeColors(visualSettings.theme);
  const browserCapabilities = Object.values(
    runtime.browserCapabilities,
  ) as WebCapability[];
  const nativeCapabilities = Object.values(
    runtime.nativeCapabilityGuards,
  ) as WebCapability[];

  return (
    <main className="relative h-screen w-full overflow-hidden">
      <style>{generateThemeStyles()}</style>
      <LiquidBackground
        theme={{ hex: theme.hex, themeName: visualSettings.theme }}
        className="fixed inset-0 -z-50"
      />
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
    </main>
  );
}
