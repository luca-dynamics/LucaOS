// SandboxedBrowserShell — PR #134: Gated Browser Shell Prototype.
// A visible, manual-only shell that can surface ONE user-approved safe URL.
//
// This component owns the smallest possible "open shell" listener: it listens
// for the local luca:open-sandboxed-browser-shell event (emitted only after
// approval + Run once via the governed execution flow), re-validates the URL,
// and renders a controlled boundary with the approved URL.
//
// It NEVER automates the page, reads the iframe DOM, injects scripts, submits
// forms on the user's behalf, handles credentials/cookies, downloads/uploads,
// or opens an external browser. All controls are manual/user-owned.

import React, { useEffect, useState } from "react";
import { sandboxedBrowserShellService } from "../../services/runtime/SandboxedBrowserShellService";
import { validateSandboxedBrowserUrl } from "../../services/runtime/SandboxedBrowserUrlPolicy";
import {
  SANDBOXED_BROWSER_SHELL_OPEN_EVENT,
  type SandboxedBrowserShellOpenEventDetail,
} from "../../types/sandboxedBrowserShell";

const BOUNDARY_LABELS = [
  "Luca Sandbox Browser",
  "Manual browsing only",
  "No automation",
  "No DOM read",
  "No credentials",
  "No downloads/uploads",
  "No wallet/payment",
];

interface ActiveShell {
  shellSessionId: string;
  url: string;
  auditUrl: string;
}

const SandboxedBrowserShell: React.FC = () => {
  const [active, setActive] = useState<ActiveShell | null>(null);
  // Some sites refuse to be embedded (X-Frame-Options / frame-ancestors). We
  // can only offer a best-effort notice; we never open an external browser.
  const [embedNotice, setEmbedNotice] = useState(false);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent).detail as SandboxedBrowserShellOpenEventDetail | undefined;
      if (!detail || typeof detail.url !== "string") return;
      // Re-validate at the shell boundary; never trust the event blindly.
      const validation = validateSandboxedBrowserUrl(detail.url);
      if (!validation.allowed || !validation.normalizedUrl) return;
      setEmbedNotice(false);
      setActive({
        shellSessionId: detail.shellSessionId,
        url: validation.normalizedUrl,
        auditUrl: validation.auditUrl,
      });
      if (detail.shellSessionId) {
        sandboxedBrowserShellService.markShellOpened(detail.shellSessionId);
      }
    };
    window.addEventListener(SANDBOXED_BROWSER_SHELL_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(SANDBOXED_BROWSER_SHELL_OPEN_EVENT, handleOpen);
  }, []);

  if (!active) return null;

  const close = () => {
    sandboxedBrowserShellService.closeShellSession(active.shellSessionId);
    setActive(null);
  };

  const revoke = () => {
    sandboxedBrowserShellService.revokeShellSession(active.shellSessionId, "Revoked from sandbox browser shell.");
    setActive(null);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Luca Sandbox Browser"
    >
      <div className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-amber-500/30 bg-[var(--app-bg,#0b0b10)] shadow-2xl">
        {/* Safety banner */}
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-black uppercase tracking-[0.18em] text-amber-200">Luca Sandbox Browser</div>
              <p className="mt-1 truncate text-[11px] text-[var(--app-text-muted,#9ca3af)]">
                Audit URL: <span className="font-mono">{active.auditUrl}</span>
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--app-text-main,#e5e7eb)] hover:bg-white/10"
              >
                Close
              </button>
              <button
                type="button"
                onClick={revoke}
                className="rounded-lg border border-red-500/40 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-200 hover:bg-red-500/10"
              >
                Revoke
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {BOUNDARY_LABELS.map((label) => (
              <span
                key={label}
                className="rounded-full border border-amber-500/30 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-200"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Approved URL bar (read-only; manual navigation only) */}
        <div className="flex items-center gap-2 border-b border-white/10 bg-black/30 px-4 py-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted,#9ca3af)]">Approved URL</span>
          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[var(--app-text-main,#e5e7eb)]">{active.url}</span>
        </div>

        {/* Controlled content area */}
        <div className="relative flex-1 bg-white">
          <iframe
            title="Luca Sandbox Browser content"
            src={active.url}
            // Strict sandbox: scripts + popups only. No allow-same-origin (so the
            // parent can never read the framed DOM) and no allow-forms automation.
            sandbox="allow-scripts allow-popups"
            referrerPolicy="no-referrer"
            className="h-full w-full border-0"
            onError={() => setEmbedNotice(true)}
          />
        </div>

        {/* Footer notices */}
        <div className="border-t border-white/10 bg-black/40 px-4 py-2">
          {embedNotice && (
            <p className="text-[10px] text-amber-200">
              Site cannot be embedded; opening in an external browser is not enabled.
            </p>
          )}
          <p className="text-[9px] italic leading-relaxed text-[var(--app-text-muted,#9ca3af)] opacity-80">
            Luca cannot automate this page, read its content, handle credentials/cookies, download/upload files, or touch
            wallet/payment flows. Browsing here is manual and user-owned. Close or Revoke to end the session.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SandboxedBrowserShell;
