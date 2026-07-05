import React from "react";
import {
  rendersOwnWindowControls,
  sendWindowControl,
} from "../../windowControlsOverlay";

/**
 * The frameless window's OWN min/max/close cluster — the same ghost skin and
 * size as every other header control, wired over the window-* IPC. Renders
 * only where the window has no native controls (Windows Electron); macOS
 * keeps its traffic lights, Linux its frame, the web the browser chrome.
 *
 * Used by BOTH the app header and the boot/onboarding holding screen, so the
 * window is never uncontrollable while Luca wakes up.
 */
interface WindowControlsProps {
  allowElectronRouteFallback?: boolean;
}

export const WindowControls: React.FC<WindowControlsProps> = ({
  allowElectronRouteFallback = false,
}) => {
  if (!rendersOwnWindowControls({ allowElectronRouteFallback })) return null;

  const buttonClass =
    "flex h-7 w-7 appearance-none items-center justify-center border-0 bg-transparent p-0 text-[var(--luca-text-secondary,var(--app-text-muted))] outline-none transition-colors hover:bg-transparent hover:text-[var(--luca-text-primary,var(--app-text-main))] focus-visible:text-[var(--luca-text-primary,var(--app-text-main))]";
  const closeButtonClass = `${buttonClass} hover:text-[var(--luca-danger,#f87171)]`;

  return (
    <>
      <button
        type="button"
        aria-label="Minimize window"
        title="Minimize"
        onClick={() => sendWindowControl("minimize")}
        className={buttonClass}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 8.5h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Maximize or restore window"
        title="Maximize"
        onClick={() => sendWindowControl("maximize")}
        className={buttonClass}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Close window"
        title="Close"
        onClick={() => sendWindowControl("close")}
        className={closeButtonClass}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        </svg>
      </button>
    </>
  );
};

export default WindowControls;
