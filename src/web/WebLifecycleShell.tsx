import { useEffect, useState } from "react";
import { useLucaLocalEndpointStatus } from "../hooks/useLucaLocalEndpointStatus";
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
import { mapLucaOnboardingFlowToWebProfile } from "../components/Onboarding/lucaOnboardingCompletionBridge";
import {
  resolveWebPostBootState,
  type WebPostBootStateSnapshot,
} from "./postBoot/webPostBootState";

export type WebLifecycleState = "post_boot" | "onboarding" | "ready" | "main";

const showWebReadyDebug = import.meta.env.VITE_LUCA_SHOW_WEB_READY_DEBUG === "true";

const setStaticBootStatus = (
  message: string,
  progress: number,
  detail?: string,
) => {
  window.__LUCA_SET_BOOT_STATUS__?.(message, progress, detail);
};

const resolvePostBootTarget = (
  snapshot: WebPostBootStateSnapshot,
): WebLifecycleState => {
  if (
    snapshot.userState === "new_user" ||
    snapshot.userState === "partial_setup" ||
    snapshot.userState === "permission_attention"
  ) {
    return "onboarding";
  }

  return showWebReadyDebug ? "ready" : "main";
};

export function WebLifecycleShell() {
  const runtime = useWebRuntime();
  const [lifecycleState, setLifecycleState] =
    useState<WebLifecycleState>("post_boot");
  const { status: localEndpointStatus } = useLucaLocalEndpointStatus();
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
    const timers: number[] = [];
    const schedule = (task: () => void, delay: number) => {
      const timer = window.setTimeout(() => {
        if (active) task();
      }, delay);
      timers.push(timer);
    };

    window.__LUCA_CLEAR_BOOT_STATUS_LOOP__?.();
    setStaticBootStatus(
      "Checking your preferences",
      0.38,
      "Loading saved setup",
    );

    void resolveWebPostBootState().then((snapshot) => {
      if (!active) return;

      setPostBootState(snapshot);
      schedule(
        () =>
          setStaticBootStatus(
            "Preparing memory boundaries",
            0.56,
            "Checking local memory",
          ),
        180,
      );
      schedule(
        () =>
          setStaticBootStatus(
            "Preparing safe tool access",
            0.74,
            "Preparing tools",
          ),
        640,
      );
      schedule(() => {
        const target = resolvePostBootTarget(snapshot);
        setStaticBootStatus(
          "Opening LucaOS",
          0.96,
          `Opening ${target === "main" ? "workspace" : target}`,
        );
        setLifecycleState(target);
      }, 1080);
    });

    return () => {
      active = false;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);
  useEffect(() => {
    if (lifecycleState === "post_boot") return;

    window.__LUCA_CLEAR_BOOT_STATUS_LOOP__?.();
    setStaticBootStatus(
      "Opening LucaOS",
      0.98,
      `Showing ${lifecycleState === "main" ? "workspace" : lifecycleState}`,
    );
    const frame = window.requestAnimationFrame(() => {
      const loader = document.getElementById("root-loader");
      if (!loader) return;

      loader.style.opacity = "0";
      window.setTimeout(() => loader.remove(), 520);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [lifecycleState]);
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
        <LucaPremiumOnboardingPreview
          hostKind="desktop-web"
          supportsLocalProvisioning={false}
          localEndpointStatus={localEndpointStatus}
          // Definite, not just a minimum — the surrounding <main> is
          // `min-h-dvh` only, so a percentage inside onboarding has nothing to
          // divide into and the whole column collapses to text height. See the
          // matching note at the desktop mount in App.tsx.
          style={{ minHeight: "100dvh", height: "100dvh" }}
          onComplete={(flow) => {
            const { profile, premiumPreferences } =
              mapLucaOnboardingFlowToWebProfile(flow);
            completeWebOnboarding(profile);
            writeWebPremiumPreferences(premiumPreferences);
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
                : "web-static-boot-loader"
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
