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
import { EdgePresence } from "../presence";
import type { PresenceIntent } from "../presence";
import {
  lucaShellPrimaryTextStyle,
  lucaShellSecondaryTextStyle,
  lucaShellTertiaryTextStyle,
} from "../../styles/lucaShellStyles";
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
      className="relative flex h-full min-h-screen w-full items-center justify-center overflow-hidden px-5 py-7 font-sans sm:px-8 sm:py-10"
      style={{
        ...bootSkinBoundary.materialVariables,
        background: "var(--luca-background-base, #101215)",
        color: "var(--luca-text-primary, #f4f6f8)",
      }}
      data-boot-shell="luca-hologram-face"
    >
      {/* Presence edge glow removed for a cleaner frameless look. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 34%, color-mix(in srgb, var(--luca-surface-hover, var(--app-bg-tint)) 42%, transparent), transparent 30%), var(--luca-background-liquid, linear-gradient(180deg, var(--luca-background-elevated, var(--app-bg-tint)) 0%, var(--luca-background-base, var(--app-bg-main)) 100%))",
        }}
      />
      <div className="pointer-events-none absolute left-1/2 top-[31%] h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color-mix(in_srgb,var(--luca-accent-soft,#4f8cff)_12%,transparent)] blur-3xl sm:h-[32rem] sm:w-[32rem]" />

      <section
        aria-label="LucaOS startup"
        className="relative z-10 flex w-full max-w-4xl flex-col items-center text-center"
      >
        <div
          className="relative flex w-full justify-center"
          data-boot-visual="landing-hologram-face"
          aria-hidden="true"
        >
          <div className="absolute left-1/2 top-[57%] h-24 w-[72%] max-w-[34rem] -translate-x-1/2 rounded-[100%] bg-[color-mix(in_srgb,var(--luca-accent-soft,#4f8cff)_12%,transparent)]/[0.07] blur-2xl" />
          <img
            src={launchIdentity.assetSrc}
            alt=""
            aria-hidden="true"
            className="relative h-auto w-[min(78vw,24rem)] max-w-none animate-[luca-hologram-breathe_6.4s_ease-in-out_infinite] object-contain sm:w-[min(46vw,27rem)]"
            style={{
              opacity: launchIdentity.markOpacity,
              filter: "drop-shadow(var(--luca-shadow-glow))",
            }}
          />
        </div>

        <div className="relative -mt-8 flex flex-col items-center gap-2 sm:-mt-10">
          <h1
            className="text-5xl sm:text-7xl"
            style={{
              ...lucaShellPrimaryTextStyle,
              ...LUCA_BRAND_DISPLAY_STYLE,
            }}
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
