import React, { useEffect, useMemo, useState } from "react";
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
import { EdgePresence } from "../presence";
import type { PresenceIntent } from "../presence";
import {
  lucaShellPrimaryTextStyle,
  lucaShellSecondaryTextStyle,
  lucaShellTertiaryTextStyle,
} from "../../styles/lucaShellStyles";
import { lucaBrandFaceStyle } from "../../styles/lucaBrandFace";
import { settingsService } from "../../services/settingsService";
import type { LucaSettings } from "../../services/settingsService";
import { resolveLucaBootSkinBoundary } from "../../styles/lucaBootSkinBoundary";

type BootTheme = {
  hex: string;
  themeName: string;
  isLight?: boolean;
};

// Boot reads as Luca incarnating into this host: reasoning about the machine,
// then acting, then settling — ready to meet you.
const BOOT_INTENT: Partial<Record<BootSequence, PresenceIntent>> = {
  INIT: "thinking",
  BIOS: "thinking",
  KERNEL: "working",
  ONBOARDING: "listening",
  READY: "idle",
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
  const identityCopy = getLucaBootDiagnosticCopy("biosIdentity");
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
  const bootIntent: PresenceIntent = browserSafeInterface
    ? "idle"
    : BOOT_INTENT[bootSequence] ?? "thinking";
  const [selectedSkinId, setSelectedSkinId] = useState<unknown>(
    () => settingsService.getSettings().general.selectedSkinId,
  );

  useEffect(() => {
    const handleSettingsChange = (settings: LucaSettings) => {
      setSelectedSkinId(settings.general.selectedSkinId);
    };

    settingsService.on("settings-changed", handleSettingsChange);
    return () => {
      settingsService.off("settings-changed", handleSettingsChange);
    };
  }, []);

  const bootSkinBoundary = useMemo(
    () =>
      resolveLucaBootSkinBoundary({
        surface: "boot-window",
        selectedSkinId,
        hostKind: "desktop-web",
      }),
    [selectedSkinId],
  );

  return (
    <div
      className="relative flex h-full min-h-screen w-full items-center justify-center overflow-hidden px-5 py-7 font-sans sm:px-8 sm:py-10"
      style={{
        ...bootSkinBoundary.materialVariables,
        background: "var(--luca-background-base, #101215)",
        color: "var(--luca-text-primary, #f4f6f8)",
      }}
      data-boot-shell="luca-hologram-face"
    >
      <EdgePresence intent={bootIntent} color={theme?.hex} radius={0} />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 34%, color-mix(in srgb, var(--luca-surface-hover, var(--app-bg-tint)) 42%, transparent), transparent 30%), var(--luca-background-liquid, linear-gradient(180deg, var(--luca-background-elevated, var(--app-bg-tint)) 0%, var(--luca-background-base, var(--app-bg-main)) 100%))",
        }}
      />
      {/* Neutral key light from above — calm, no cyber tint or glow ring */}
      <div
        className="pointer-events-none absolute left-1/2 top-[30%] h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl sm:h-[34rem] sm:w-[34rem]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--luca-text-primary, #f4f6f8) 9%, transparent), transparent 70%)",
        }}
      />
      {/* Filmic vignette — the face emerges from darkness */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 40%, transparent 50%, rgba(0,0,0,0.5) 100%)",
        }}
      />
      {/* Faint film grain for premium depth */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.045] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "160px 160px",
        }}
      />

      <section
        aria-label="LucaOS startup"
        className="relative z-10 flex w-full max-w-4xl flex-col items-center text-center"
      >
        <div
          className="relative flex w-full justify-center"
          data-boot-visual="landing-hologram-face"
          aria-hidden="true"
        >
          <img
            src={launchIdentity.assetSrc}
            alt=""
            aria-hidden="true"
            className="relative h-auto w-[min(78vw,24rem)] max-w-none object-contain sm:w-[min(46vw,27rem)]"
            style={lucaBrandFaceStyle(launchIdentity.markOpacity)}
          />
        </div>

        <div className="relative -mt-8 flex flex-col items-center gap-2 sm:-mt-10">
          <h1
            className="text-5xl font-semibold tracking-[-0.075em] sm:text-7xl"
            style={lucaShellPrimaryTextStyle}
          >
            LucaOS
          </h1>
          <p
            className="text-sm font-medium sm:text-base"
            style={lucaShellSecondaryTextStyle}
          >
            {launchIdentity.subtitle}
          </p>
          <p className="mt-3 text-sm sm:text-base" style={lucaShellSecondaryTextStyle}>
            {statusHeadline}
          </p>
          <p className="text-xs sm:text-sm" style={lucaShellTertiaryTextStyle}>{statusDetail}</p>
        </div>

        <div className="mt-6 h-px w-full max-w-xl overflow-hidden"
          style={{ background: "var(--luca-border-subtle, var(--app-border-main))" }}>
          <div
            className="h-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background:
                "linear-gradient(90deg, color-mix(in srgb, var(--luca-text-primary, var(--app-text-main)) 48%, transparent), var(--luca-accent-soft), color-mix(in srgb, var(--luca-text-primary, var(--app-text-main)) 30%, transparent))",
              boxShadow: "var(--luca-shadow-glow)",
            }}
          />
        </div>

        <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2 text-left sm:grid-cols-2">
          {readinessItems.map((item) => (
            <div
              key={item.id}
              className="flex items-baseline justify-between gap-5 border-b py-2.5"
              style={{ borderColor: "var(--luca-border-subtle, var(--app-border-main))" }}
            >
              <span className="text-sm" style={lucaShellSecondaryTextStyle}>{item.detail}</span>
              <span className="shrink-0 text-[0.68rem] font-medium uppercase tracking-[0.18em]" style={lucaShellSecondaryTextStyle}>
                {item.statusLabel}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 max-w-xl text-xs leading-5" style={lucaShellTertiaryTextStyle}>
          {browserSafeInterface
            ? "Desktop and local-runtime capabilities stay guarded after the browser app shell loads."
            : `${identityCopy.tacticalLabel} · ${bootCopy.diagnosticMeaning}`}
        </div>
      </section>
    </div>
  );
};
