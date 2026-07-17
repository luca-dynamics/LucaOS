import React, { useMemo } from "react";
import type { BootSequence } from "../../hooks/app/useAppSystem";
import {
  getLucaBootDiagnosticCopy,
  getLucaBootSequenceCopy,
} from "../../services/runtime/lucaBootCopyModel";
import {
  LUCA_BROWSER_SAFE_BOOT_STATUS,
  buildBrowserSafeLucaBootReadinessItems,
  buildLucaBootReadinessItems,
  getLucaBootLaunchIdentityPresence,
  lucaBootProgressBySequence,
  type BiosStatus,
} from "./lucaBootVisualShellModel";
import { resolveLucaBootSkinBoundary } from "../../styles/lucaBootSkinBoundary";

type BootTheme = {
  hex: string;
  themeName: string;
  isLight?: boolean;
};

const LUCA_BRAND_DISPLAY_STYLE: React.CSSProperties = {
  fontFamily:
    '"Segoe UI Variable Display", Inter, "Segoe UI", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  fontWeight: 650,
  letterSpacing: "-0.045em",
};

interface LucaBootVisualShellProps {
  bootSequence: BootSequence;
  biosStatus: BiosStatus;
  theme: BootTheme;
  browserSafeInterface?: boolean;
}

export const LucaBootVisualShell: React.FC<LucaBootVisualShellProps> = ({
  bootSequence,
  biosStatus,
  theme,
  browserSafeInterface = false,
}) => {
  const bootCopy = getLucaBootSequenceCopy(bootSequence);
  const readinessItems = browserSafeInterface
    ? buildBrowserSafeLucaBootReadinessItems()
    : buildLucaBootReadinessItems(bootSequence, biosStatus);
  const launchIdentity = getLucaBootLaunchIdentityPresence(bootSequence);
  const progress = browserSafeInterface
    ? LUCA_BROWSER_SAFE_BOOT_STATUS.progress
    : bootSequence === "READY" || bootSequence === "ONBOARDING"
      ? 100
      : lucaBootProgressBySequence[bootSequence];
  const statusHeadline = browserSafeInterface
    ? LUCA_BROWSER_SAFE_BOOT_STATUS.headline
    : bootCopy.standardLabel;
  const statusDetail = browserSafeInterface
    ? LUCA_BROWSER_SAFE_BOOT_STATUS.detail
    : getLucaBootDiagnosticCopy("loadingLucaOs").standardLabel;
  const bootSkinBoundary = useMemo(
    () =>
      resolveLucaBootSkinBoundary({
        surface: "boot-window",
        hostKind: "desktop-web",
      }),
    [],
  );

  return (
    <div
      className="relative h-full min-h-screen w-full overflow-hidden font-sans"
      style={{
        ...bootSkinBoundary.materialVariables,
        // Fixed light "Awakening Luca" environment, matching the native splash
        // (boot.html) and the frontend loader so every boot surface is one look.
        background:
          "radial-gradient(70% 90% at 68% 46%, #ffffff 0%, rgba(255,255,255,0) 55%), radial-gradient(120% 130% at 78% 40%, #f4f8fb 0%, #eef2f6 46%, #e4eaf0 100%)",
        color: "#2b303a",
      }}
      data-boot-shell="luca-hologram-face"
    >
      {/* The Luca hologram face, large and center-right. */}
      <div
        className="pointer-events-none absolute right-[6%] top-1/2 flex -translate-y-1/2 justify-center"
        data-boot-visual="landing-hologram-face"
        aria-hidden="true"
      >
        <img
          src={launchIdentity.assetSrc}
          alt=""
          aria-hidden="true"
          className="h-[min(86vh,640px)] w-auto max-w-[52vw] animate-[luca-hologram-breathe_6.4s_ease-in-out_infinite] object-contain"
          style={{
            // High-key blend: lightened + desaturated into the pale
            // environment; the neck/shoulders dissolve through a bottom
            // gradient mask (matches boot.html + the frontend loader).
            opacity: 0.82,
            filter:
              "brightness(1.32) saturate(0.62) contrast(0.94) drop-shadow(0 24px 70px rgba(120, 160, 205, 0.22))",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 55%, rgba(0, 0, 0, 0.55) 76%, transparent 95%)",
            maskImage:
              "linear-gradient(to bottom, black 55%, rgba(0, 0, 0, 0.55) 76%, transparent 95%)",
          }}
        />
      </div>

      {/* Brand: dotted spinner + wordmark + subtitle, center-left. */}
      <section
        aria-label="LucaOS startup"
        className="absolute left-[8%] top-[46%] z-10 flex -translate-y-1/2 flex-col items-center"
      >
        {/* Spinner + wordmark on one line; subtitle centered below. */}
        <div className="flex items-center gap-4">
          <svg
            className="h-[34px] w-[34px] animate-spin [animation-duration:1.5s]"
            viewBox="0 0 40 40"
            aria-hidden="true"
            fill="#8b929d"
          >
            <circle cx="20" cy="5" r="2.6" opacity="1" />
            <circle cx="30.6" cy="9.4" r="2.4" opacity="0.85" />
            <circle cx="35" cy="20" r="2.2" opacity="0.72" />
            <circle cx="30.6" cy="30.6" r="2" opacity="0.58" />
            <circle cx="20" cy="35" r="1.9" opacity="0.44" />
            <circle cx="9.4" cy="30.6" r="1.8" opacity="0.32" />
            <circle cx="5" cy="20" r="1.7" opacity="0.22" />
            <circle cx="9.4" cy="9.4" r="1.6" opacity="0.15" />
          </svg>
          <h1
            className="text-[46px] leading-none"
            style={{ ...LUCA_BRAND_DISPLAY_STYLE, fontWeight: 600, color: "#2b303a" }}
          >
            LucaOS
          </h1>
        </div>
        <p className="mt-2 text-center text-[15px]" style={{ color: "#5b636f" }}>
          Host-native personal AI OS
        </p>
      </section>

      {/* Awaken cluster: status label + progress bar + phase, lower-left. */}
      <div className="absolute bottom-[15%] left-[8%] z-10 w-[min(38vw,340px)]">
        <p className="mb-2.5 text-[13px]" style={{ color: "#8b929d" }}>
          {statusHeadline}
        </p>
        <div
          className="h-[3px] w-full overflow-hidden rounded-full"
          style={{ background: "rgba(43, 48, 58, 0.09)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #a6c6e8 0%, #cfe0f2 100%)",
              boxShadow: "0 0 10px rgba(127, 169, 216, 0.5)",
            }}
          />
        </div>
        <p className="mt-2 text-[11px]" style={{ color: "#8b929d" }}>
          {statusDetail}
        </p>
      </div>

      {/* Honest boot detail — the readiness lines (and browser-safe wording),
          tucked subtly bottom-right so the layout stays clean. */}
      <div className="absolute bottom-[8%] right-[6%] z-10 hidden max-w-xs flex-col gap-1.5 text-right sm:flex">
        {readinessItems.map((item) => (
          <div key={item.id} className="flex items-baseline justify-between gap-4">
            <span className="text-[11px]" style={{ color: "#8b929d" }}>
              {item.detail}
            </span>
            <span
              className="shrink-0 text-[9px] font-medium uppercase tracking-[0.16em]"
              style={{ color: "#a3a9b2" }}
            >
              {item.statusLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
