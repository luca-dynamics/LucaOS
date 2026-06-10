import React from "react";
import type { BootSequence } from "../../hooks/app/useAppSystem";
import { setHexAlpha } from "../../config/themeColors";
import {
  getLucaBootDiagnosticCopy,
  getLucaBootSequenceCopy,
} from "../../services/runtime/lucaBootCopyModel";
import { Icon } from "../ui/Icon";
import { LiquidBackground } from "../visual/LiquidBackground";
import {
  LUCA_BROWSER_SAFE_BOOT_STATUS,
  buildBrowserSafeLucaBootReadinessItems,
  buildLucaBootReadinessItems,
  getLucaBootLaunchIdentityPresence,
  lucaBootProgressBySequence,
  resolveLucaBootReadinessTone,
  type BiosStatus,
  type ReadinessTone,
} from "./lucaBootVisualShellModel";

type BootTheme = {
  hex: string;
  themeName: string;
  isLight?: boolean;
};

interface LucaBootVisualShellProps {
  bootSequence: BootSequence;
  biosStatus: BiosStatus;
  theme: BootTheme;
  browserSafeInterface?: boolean;
}

const statusDotClass: Record<ReadinessTone, string> = {
  ready: "opacity-100",
  pending: "opacity-50 animate-pulse",
  attention: "opacity-100 animate-pulse",
};

export const LucaBootVisualShell: React.FC<LucaBootVisualShellProps> = ({
  bootSequence,
  biosStatus,
  theme,
  browserSafeInterface = false,
}) => {
  const bootCopy = getLucaBootSequenceCopy(bootSequence);
  const identityCopy = getLucaBootDiagnosticCopy("biosIdentity");
  const kernelCopy = getLucaBootDiagnosticCopy("loadingLucaOs");
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
    : kernelCopy.standardLabel;
  const glowColor = `var(--luca-accent-primary, ${theme.hex})`;
  const glowSoft = `var(--luca-accent-soft, ${setHexAlpha(theme.hex, 0.15)})`;
  const glowPanel = `color-mix(in srgb, var(--luca-accent-soft, ${setHexAlpha(theme.hex, 0.09)}) 44%, transparent)`;
  const glowRing = `color-mix(in srgb, var(--luca-accent-primary, ${theme.hex}) 24%, transparent)`;
  const glowRingSoft = `color-mix(in srgb, var(--luca-accent-soft, ${setHexAlpha(theme.hex, 0.2)}) 68%, transparent)`;
  const glowPresence = `color-mix(in srgb, var(--luca-accent-primary, ${theme.hex}) 18%, transparent)`;
  const surfaceGlass = "var(--luca-surface-glass, color-mix(in srgb, var(--app-bg-tint) 76%, transparent))";
  const surfaceHover = "var(--luca-surface-hover, color-mix(in srgb, var(--app-bg-tint) 68%, transparent))";
  const borderSubtle = "var(--luca-border-subtle, var(--app-border-main))";
  const textPrimary = "var(--luca-text-primary, var(--app-text-main))";
  const textSecondary = "var(--luca-text-secondary, var(--app-text-muted))";
  const backgroundLiquid = "var(--luca-background-liquid, transparent)";
  const shadowGlow = "var(--luca-shadow-glow, 0 0 36px rgba(255, 255, 255, 0.12))";

  return (
    <div className="relative flex h-full min-h-screen w-full items-center justify-center overflow-hidden px-5 py-8 font-sans sm:px-8">
      <LiquidBackground theme={theme} className="fixed inset-0 -z-50" />

      <div
        className="pointer-events-none absolute inset-x-6 top-12 h-48 rounded-full blur-3xl sm:inset-x-24"
        style={{
          background: `${backgroundLiquid}, radial-gradient(circle, ${glowSoft} 0%, transparent 68%)`,
        }}
      />

      <section
        aria-label="LucaOS startup"
        className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-8 rounded-[2rem] border px-5 py-8 text-center shadow-2xl backdrop-blur-2xl sm:px-10 sm:py-10"
        style={{
          background: surfaceGlass,
          borderColor: borderSubtle,
          boxShadow: `var(--luca-shadow-soft, 0 24px 80px ${glowPanel}), ${shadowGlow}, inset 0 1px 0 rgba(255,255,255,0.08)`,
          color: textPrimary,
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="relative flex h-14 w-14 items-center justify-center rounded-2xl border p-2 backdrop-blur-xl transition-all duration-700 sm:h-16 sm:w-16"
            style={{
              background: surfaceHover,
              borderColor: borderSubtle,
              boxShadow: `0 0 36px ${glowSoft}, inset 0 1px 0 color-mix(in srgb, var(--luca-text-primary, var(--app-text-main)) 12%, transparent)`,
              opacity: launchIdentity.markOpacity,
              transform:
                launchIdentity.emphasis === "launch"
                  ? "scale(1)"
                  : "scale(0.88)",
            }}
            aria-hidden="true"
          >
            <div
              className="absolute inset-0 rounded-2xl blur-xl animate-pulse"
              style={{
                animationDuration: "5.6s",
                background: `radial-gradient(circle, ${glowSoft} 0%, transparent 70%)`,
              }}
            />
            <img
              src={launchIdentity.assetSrc}
              alt=""
              className="relative h-full w-full object-contain animate-pulse"
              style={{
                animationDuration: "6s",
                filter: `drop-shadow(0 0 18px ${glowSoft})`,
              }}
            />
          </div>
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.32em]"
            style={{
              borderColor: borderSubtle,
              color: textSecondary,
            }}
          >
            <Icon name="Sparkles" size={14} color={glowColor} />
            {launchIdentity.label}
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.06em] sm:text-6xl">
            LucaOS
          </h1>
          <p
            className="max-w-md text-sm sm:text-base"
            style={{ color: textSecondary }}
          >
            {launchIdentity.subtitle}
          </p>
        </div>

        <div
          className="relative flex h-56 w-full max-w-[23rem] items-center justify-center sm:h-64"
          data-boot-visual="premium-luca-hologram-presence"
          aria-hidden="true"
        >
          <div
            className="absolute inset-x-0 bottom-3 h-14 rounded-[100%] blur-xl"
            style={{
              background: `radial-gradient(ellipse, ${glowPresence} 0%, transparent 70%)`,
            }}
          />
          <div
            className="absolute h-48 w-48 rounded-full border sm:h-56 sm:w-56"
            style={{
              borderColor: glowRing,
              background: `radial-gradient(circle at 50% 42%, transparent 40%, ${glowSoft} 72%, transparent 82%)`,
              boxShadow: `0 0 74px ${glowSoft}, inset 0 0 42px ${glowSoft}`,
            }}
          />
          <div
            className="absolute h-[15.5rem] w-[15.5rem] rounded-[2.5rem] border opacity-60 sm:h-[18rem] sm:w-[18rem]"
            style={{
              borderColor: glowRingSoft,
              background:
                "linear-gradient(rgba(148, 163, 184, 0.11) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.11) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              maskImage: "radial-gradient(circle, black 0%, transparent 70%)",
              transform: "perspective(520px) rotateX(62deg)",
              boxShadow: `0 0 48px ${glowSoft}`,
            }}
          />
          <div
            className="absolute h-48 w-36 rounded-[48%_48%_44%_44%/42%_42%_58%_58%] border sm:h-56 sm:w-40"
            style={{
              borderColor: glowRing,
              background: `linear-gradient(180deg, color-mix(in srgb, ${glowColor} 16%, transparent), transparent 42%), radial-gradient(circle at 50% 24%, color-mix(in srgb, ${textPrimary} 18%, transparent), transparent 28%), radial-gradient(circle at 50% 60%, ${surfaceGlass}, transparent 68%)`,
              boxShadow: `0 0 78px ${glowSoft}, inset 0 0 46px ${glowSoft}`,
              clipPath: "polygon(50% 0%, 79% 10%, 94% 34%, 88% 67%, 70% 91%, 50% 100%, 30% 91%, 12% 67%, 6% 34%, 21% 10%)",
            }}
          >
            <img
              src={launchIdentity.assetSrc}
              alt=""
              className="absolute inset-[18%] h-[64%] w-[64%] object-contain animate-pulse"
              style={{
                animationDuration: "6.2s",
                filter: `brightness(1.35) contrast(1.25) drop-shadow(0 0 26px ${glowSoft})`,
                opacity: Math.max(launchIdentity.orbPresenceOpacity, 0.28),
              }}
            />
            <div
              className="absolute left-[20%] right-[20%] top-[36%] h-3 rounded-full"
              style={{
                background: `linear-gradient(90deg, transparent, ${textPrimary}, transparent)`,
                boxShadow: `0 0 20px ${glowColor}`,
                opacity: 0.62,
              }}
            />
            <div
              className="absolute left-[28%] top-[34%] h-2 w-5 rounded-full"
              style={{ background: glowColor, boxShadow: `0 0 18px ${glowColor}` }}
            />
            <div
              className="absolute right-[28%] top-[34%] h-2 w-5 rounded-full"
              style={{ background: glowColor, boxShadow: `0 0 18px ${glowColor}` }}
            />
            <div
              className="absolute left-[32%] right-[32%] top-[62%] h-px"
              style={{ background: textPrimary, boxShadow: `0 0 14px ${glowColor}`, opacity: 0.48 }}
            />
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background:
                  "repeating-linear-gradient(180deg, transparent 0 9px, rgba(232, 251, 255, 0.28) 10px, transparent 12px)",
                maskImage: "linear-gradient(180deg, transparent, black 18%, black 82%, transparent)",
              }}
            />
          </div>
          <div
            className="absolute top-4 h-12 w-px animate-pulse sm:top-2"
            style={{
              animationDuration: "3.8s",
              background: `linear-gradient(180deg, transparent, ${textPrimary}, transparent)`,
              boxShadow: `0 0 24px ${glowColor}`,
            }}
          />
        </div>

        <div className="flex w-full max-w-xl flex-col items-center gap-3">
          <div className="text-lg font-medium sm:text-2xl">
            {statusHeadline}
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: surfaceHover }}
          >
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progress}%`,
                background: glowColor,
                boxShadow: `0 0 18px ${glowPresence}`,
              }}
            />
          </div>
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: textSecondary }}
          >
            <Icon
              name="Sparkles"
              size={14}
              color={glowColor}
              className="animate-pulse"
            />
            {statusDetail}
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {readinessItems.map((item) => {
            const tone = resolveLucaBootReadinessTone(item.status);
            const isAttention = tone === "attention";
            return (
              <div
                key={item.id}
                className="flex min-h-[7.5rem] flex-col justify-between rounded-2xl border p-3 text-left backdrop-blur-xl"
                style={{
                  background: surfaceGlass,
                  borderColor: isAttention
                    ? textSecondary
                    : borderSubtle,
                  color: textPrimary,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <Icon
                    name={item.icon}
                    size={18}
                    color={isAttention ? textPrimary : glowColor}
                  />
                  <span
                    className={`mt-1 h-2 w-2 rounded-full ${statusDotClass[tone]}`}
                    style={{
                      background: isAttention
                        ? textPrimary
                        : glowColor,
                    }}
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div
                    className="mt-1 text-[0.68rem] leading-4"
                    style={{ color: textSecondary }}
                  >
                    {item.detail}
                  </div>
                </div>
                <div
                  className="text-[0.68rem] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: textSecondary }}
                >
                  {item.statusLabel}
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="flex flex-col items-center gap-1 text-xs"
          style={{ color: textSecondary }}
        >
          <span>
            Startup details · {browserSafeInterface
              ? "Web-safe capability resolution"
              : identityCopy.tacticalLabel}
          </span>
          <span className="max-w-xl">
            {browserSafeInterface
              ? "Desktop and local-runtime capabilities stay visible as guarded, unavailable states while the browser app shell loads."
              : bootCopy.diagnosticMeaning}
          </span>
        </div>
      </section>
    </div>
  );
};
