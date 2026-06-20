import React from "react";
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
import { Presence, EdgePresence } from "../presence";
import type { PresenceIntent } from "../presence";

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

  return (
    <div
      className="relative flex h-full min-h-screen w-full items-center justify-center overflow-hidden bg-[#050507] px-5 py-7 font-sans text-white sm:px-8 sm:py-10"
      data-boot-shell="luca-hologram-face"
    >
      <EdgePresence intent={bootIntent} color={theme?.hex} radius={0} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(255,255,255,0.075),transparent_30%),linear-gradient(180deg,#0a0a0d_0%,#040405_52%,#0b0b0e_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-[31%] h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-100/5 blur-3xl sm:h-[32rem] sm:w-[32rem]" />

      <section
        aria-label="LucaOS startup"
        className="relative z-10 flex w-full max-w-4xl flex-col items-center text-center"
      >
        <div
          className="relative flex w-full justify-center"
          data-boot-visual="landing-hologram-face"
          aria-hidden="true"
        >
          <div className="absolute left-1/2 top-[57%] h-24 w-[72%] max-w-[34rem] -translate-x-1/2 rounded-[100%] bg-cyan-100/[0.07] blur-2xl" />
          <div
            className="relative flex items-center justify-center"
            style={{ height: "min(56vw, 20rem)" }}
          >
            <Presence
              intent={bootIntent}
              color={theme?.hex}
              size={232}
              reactToAudio={false}
            />
          </div>
        </div>

        <div className="relative -mt-8 flex flex-col items-center gap-2 sm:-mt-10">
          <h1 className="text-5xl font-semibold tracking-[-0.075em] text-white sm:text-7xl">
            LucaOS
          </h1>
          <p className="text-sm font-medium text-white/[0.68] sm:text-base">
            {launchIdentity.subtitle}
          </p>
          <p className="mt-3 text-sm text-white/[0.82] sm:text-base">
            {statusHeadline}
          </p>
          <p className="text-xs text-white/[0.46] sm:text-sm">{statusDetail}</p>
        </div>

        <div className="mt-6 h-px w-full max-w-xl overflow-hidden bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-white/55 via-cyan-50/80 to-white/35 shadow-[0_0_22px_rgba(205,245,255,0.32)] transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2 text-left sm:grid-cols-2">
          {readinessItems.map((item) => (
            <div
              key={item.id}
              className="flex items-baseline justify-between gap-5 border-b border-white/10 py-2.5"
            >
              <span className="text-sm text-white/[0.78]">{item.detail}</span>
              <span className="shrink-0 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-white/[0.38]">
                {item.statusLabel}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 max-w-xl text-xs leading-5 text-white/[0.40]">
          {browserSafeInterface
            ? "Desktop and local-runtime capabilities stay guarded after the browser app shell loads."
            : `${identityCopy.tacticalLabel} · ${bootCopy.diagnosticMeaning}`}
        </div>
      </section>
    </div>
  );
};
