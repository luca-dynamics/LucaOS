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
            className="absolute inset-0 rounded-full border animate-spin-slow"
            style={{ borderColor: glowRing, borderTopColor: glowColor }}
          />
          <div
            className="absolute inset-5 rounded-full border animate-pulse"
            style={{
              borderColor: glowRingSoft,
              boxShadow: `0 0 60px ${glowSoft}`,
            }}
          />
          <div
            className="relative flex h-24 w-24 items-center justify-center rounded-full sm:h-32 sm:w-32"
            style={{
              background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${glowColor} 58%, white), ${glowColor} 42%, transparent 72%)`,
              boxShadow: `0 0 48px ${glowOrb}, inset 0 0 28px rgba(255,255,255,0.16)`,
            }}
          >
            <Icon
              name="Activity"
              size={34}
              color="var(--app-text-main)"
              className="animate-pulse"
            />
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
              name="LoaderCircle"
              size={14}
              color={glowColor}
              className="animate-spin"
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
