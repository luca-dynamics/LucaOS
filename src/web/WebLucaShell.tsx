import { Icon } from "../components/ui/Icon";
import {
  lucaShellDividerStyle,
  lucaShellPanelSurfaceStyle,
  lucaShellRailSurfaceStyle,
  lucaShellWorkspaceSurfaceStyle,
} from "../styles/lucaShellStyles";
import type { WebCapability } from "./browserHostCapabilities";
import { WebChatSurface } from "./chat/WebChatSurface";

interface WebLucaShellProps {
  hostClass: string;
  lucaLinkStatus: string;
  browserCapabilities: WebCapability[];
  guardedNativeCapabilities: WebCapability[];
}

export function WebLucaShell({
  hostClass,
  lucaLinkStatus,
  browserCapabilities,
  guardedNativeCapabilities,
}: WebLucaShellProps) {
  const available = browserCapabilities.filter(
    (capability) => capability.status === "available",
  ).length;

  return (
    <section className="absolute inset-0 z-10 flex flex-col p-3 font-mono sm:p-5">
      <header
        className="flex h-16 items-center justify-between rounded-t-2xl border px-5"
        style={lucaShellPanelSurfaceStyle}
      >
        <div className="flex items-center gap-3">
          <img src="/icon.png" alt="" className="h-8 w-8 object-contain" />
          <div>
            <h1 className="font-display text-base font-semibold tracking-[0.16em]">
              L.U.C.A OS
            </h1>
            <p className="text-[9px] uppercase tracking-[0.18em] text-[var(--app-text-muted)]">
              Luca dashboard
            </p>
          </div>
        </div>
        <span className="rounded-full border border-[var(--app-border-main)] px-3 py-1 text-[10px] uppercase tracking-widest text-[var(--app-text-muted)]">
          Ready
        </span>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-b-2xl border-x border-b border-[var(--app-border-main)] md:grid-cols-[180px_minmax(0,1fr)] xl:grid-cols-[180px_minmax(0,1fr)_240px]">
        <aside
          aria-label="LucaOS workspace rail"
          className="hidden border-r p-4 md:block"
          style={{ ...lucaShellRailSurfaceStyle, ...lucaShellDividerStyle }}
        >
          <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.2em]">
            Workspace
          </p>
          <div className="rounded-xl border border-[var(--app-primary)] bg-[var(--luca-accent-soft)] p-3 text-xs text-[var(--app-text-main)]">
            <Icon name="ChatRound" size={16} color="currentColor" />
            <span className="mt-2 block font-bold">Chat</span>
          </div>
          <p className="mt-6 text-[10px] leading-5">
            Luca is ready. Ask anything or open a workspace.
          </p>
        </aside>

        <main className="min-h-0" style={lucaShellWorkspaceSurfaceStyle}>
          <WebChatSurface />
        </main>

        <aside
          aria-label="LucaOS status"
          className="hidden border-l p-4 xl:block"
          style={{ ...lucaShellRailSurfaceStyle, ...lucaShellDividerStyle }}
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.2em]">
            Workspace status
          </p>
          <dl className="mt-4 space-y-4 text-xs">
            <div>
              <dt className="text-[var(--app-text-muted)]">Luca Prime</dt>
              <dd className="mt-1 font-bold text-[var(--app-text-main)]">
                Preparing
              </dd>
            </div>
            <div>
              <dt className="text-[var(--app-text-muted)]">Local routes</dt>
              <dd className="mt-1 font-bold text-[var(--app-text-main)]">
                Connect in Settings
              </dd>
            </div>
            <div>
              <dt className="text-[var(--app-text-muted)]">LucaLink</dt>
              <dd className="mt-1 font-bold text-[var(--app-text-main)]">
                {lucaLinkStatus}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}
