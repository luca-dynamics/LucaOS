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
  buildLucaBootReadinessItems,
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
}) => {
  const bootCopy = getLucaBootSequenceCopy(bootSequence);
  const identityCopy = getLucaBootDiagnosticCopy("biosIdentity");
  const kernelCopy = getLucaBootDiagnosticCopy("loadingLucaOs");
  const readinessItems = buildLucaBootReadinessItems(bootSequence, biosStatus);
  const progress =
    bootSequence === "READY" || bootSequence === "ONBOARDING"
      ? 100
      : lucaBootProgressBySequence[bootSequence];
  const glowColor = theme.hex;
  const glowSoft = setHexAlpha(glowColor, 0.15);
  const glowPanel = setHexAlpha(glowColor, 0.09);
  const glowRing = setHexAlpha(glowColor, 0.27);
  const glowRingSoft = setHexAlpha(glowColor, 0.2);
  const glowOrb = setHexAlpha(glowColor, 0.33);

  return (
    <div className="relative flex h-full min-h-screen w-full items-center justify-center overflow-hidden px-5 py-8 font-sans sm:px-8">
      <LiquidBackground theme={theme} className="fixed inset-0 -z-50" />

      <div
        className="pointer-events-none absolute inset-x-6 top-12 h-48 rounded-full blur-3xl sm:inset-x-24"
        style={{
          background: `radial-gradient(circle, ${glowSoft} 0%, transparent 68%)`,
        }}
      />

      <section
        aria-label="LucaOS startup"
        className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-8 rounded-[2rem] border px-5 py-8 text-center shadow-2xl backdrop-blur-2xl sm:px-10 sm:py-10"
        style={{
          background: "color-mix(in srgb, var(--app-bg-tint) 76%, transparent)",
          borderColor: "var(--app-border-main)",
          boxShadow: `0 24px 80px ${glowPanel}, inset 0 1px 0 rgba(255,255,255,0.08)`,
          color: "var(--app-text-main)",
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.32em]"
            style={{
              borderColor: "var(--app-border-main)",
              color: "var(--app-text-muted)",
            }}
          >
            <Icon name="Sparkles" size={14} color={glowColor} />
            LucaOS
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Luca is waking up
          </h1>
          <p
            className="max-w-md text-sm sm:text-base"
            style={{ color: "var(--app-text-muted)" }}
          >
            Personal Autonomous AI OS
          </p>
        </div>

        <div className="relative flex h-40 w-40 items-center justify-center sm:h-52 sm:w-52">
          <div
            className="absolute -inset-4 rounded-full blur-2xl animate-pulse"
            style={{
              animationDuration: "5.5s",
              background: `radial-gradient(circle, ${glowOrb} 0%, ${glowSoft} 42%, transparent 72%)`,
            }}
          />
          <div
            className="absolute inset-0 rounded-full border animate-pulse"
            style={{
              animationDuration: "4.8s",
              background: `radial-gradient(circle at 50% 50%, transparent 48%, ${glowSoft} 68%, transparent 78%)`,
              borderColor: glowRing,
              boxShadow: `0 0 64px ${glowSoft}, inset 0 0 36px ${glowSoft}`,
            }}
          />
          <div
            className="absolute inset-5 rounded-full border animate-pulse"
            style={{
              animationDelay: "450ms",
              animationDuration: "5.8s",
              background: `radial-gradient(circle at 35% 28%, color-mix(in srgb, ${glowColor} 28%, var(--app-text-main)), ${glowRingSoft} 38%, transparent 72%)`,
              borderColor: glowRingSoft,
              boxShadow: `0 0 60px ${glowSoft}, inset 0 0 42px ${glowSoft}`,
            }}
          />
          <div
            className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full animate-pulse sm:h-32 sm:w-32"
            style={{
              animationDuration: "4.6s",
              background: `radial-gradient(circle at 32% 26%, color-mix(in srgb, ${glowColor} 52%, var(--app-text-main)), ${glowColor} 38%, ${glowRingSoft} 64%, transparent 86%)`,
              boxShadow: `0 0 48px ${glowOrb}, inset 0 0 28px color-mix(in srgb, var(--app-text-main) 16%, transparent)`,
            }}
          >
            <div
              className="absolute left-6 top-5 h-10 w-14 rounded-full blur-md sm:left-8 sm:top-7 sm:h-12 sm:w-16"
              style={{
                background:
                  "color-mix(in srgb, var(--app-text-main) 26%, transparent)",
              }}
            />
            <Icon name="Activity" size={34} color="var(--app-text-main)" />
          </div>
        </div>

        <div className="flex w-full max-w-xl flex-col items-center gap-3">
          <div className="text-lg font-medium sm:text-2xl">
            {bootCopy.standardLabel}
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: "var(--app-bg-tint)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progress}%`,
                background: glowColor,
                boxShadow: `0 0 18px ${glowOrb}`,
              }}
            />
          </div>
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: "var(--app-text-muted)" }}
          >
            <Icon
              name="Sparkles"
              size={14}
              color={glowColor}
              className="animate-pulse"
            />
            {kernelCopy.standardLabel}
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
                  background:
                    "color-mix(in srgb, var(--app-bg-tint) 72%, transparent)",
                  borderColor: isAttention
                    ? "var(--app-text-muted)"
                    : "var(--app-border-main)",
                  color: "var(--app-text-main)",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <Icon
                    name={item.icon}
                    size={18}
                    color={isAttention ? "var(--app-text-main)" : glowColor}
                  />
                  <span
                    className={`mt-1 h-2 w-2 rounded-full ${statusDotClass[tone]}`}
                    style={{
                      background: isAttention
                        ? "var(--app-text-main)"
                        : glowColor,
                    }}
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div
                    className="mt-1 text-[0.68rem] leading-4"
                    style={{ color: "var(--app-text-muted)" }}
                  >
                    {item.detail}
                  </div>
                </div>
                <div
                  className="text-[0.68rem] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--app-text-muted)" }}
                >
                  {item.statusLabel}
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="flex flex-col items-center gap-1 text-xs"
          style={{ color: "var(--app-text-muted)" }}
        >
          <span>Startup details · {identityCopy.tacticalLabel}</span>
          <span className="max-w-xl">{bootCopy.diagnosticMeaning}</span>
        </div>
      </section>
    </div>
  );
};
