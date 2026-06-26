import { LucaDashboardSurface } from "../components/dashboard/LucaDashboardSurface";
import { Icon } from "../components/ui/Icon";
import type { WebCapability } from "./browserHostCapabilities";
import { WebChatSurface } from "./chat/WebChatSurface";
import { resolveLucaDashboardSkinBoundary } from "../styles/lucaDashboardSkinBoundary";
import { readWebPremiumPreferences } from "./webLifecycleStorage";

interface WebLucaShellProps {
  hostClass: string;
  lucaLinkStatus: string;
  browserCapabilities: WebCapability[];
  guardedNativeCapabilities: WebCapability[];
}

export function WebLucaShell({ lucaLinkStatus }: WebLucaShellProps) {
  // Honor the skin chosen during onboarding (stored as the `environment`
  // selection in the web premium preferences). Resolved at this local shell
  // boundary only — never mutates document / body / html. Mirrors the desktop
  // App.tsx wiring (resolveLucaDashboardSkinBoundary from the persisted skin).
  const selectedSkinId = readWebPremiumPreferences()?.environment;
  const skinBoundary = resolveLucaDashboardSkinBoundary({
    selectedSkinId,
    hostKind: "desktop-web",
  });

  return (
    <section className="absolute inset-0 z-10 p-3 sm:p-5">
      <LucaDashboardSurface
        rootStyle={{
          width: "100%",
          height: "100%",
          ...skinBoundary.materialVariables,
        }}
        headerSurface={
          <header className="flex h-16 flex-none items-center justify-between border-b border-[var(--app-border-main)] px-5 text-[var(--app-text-main)]">
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
        }
        leftPanel={
          <div className="h-full p-4 text-[var(--app-text-main)]">
            <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.2em]">
              Workspace
            </p>
            <div className="rounded-xl border border-[var(--app-primary)] bg-[var(--luca-accent-soft)] p-3 text-xs text-[var(--app-text-main)]">
              <Icon name="ChatRound" size={16} color="currentColor" />
              <span className="mt-2 block font-bold">Chat</span>
            </div>
            <p className="mt-6 text-[10px] leading-5 text-[var(--app-text-muted)]">
              Luca is ready. Ask anything or open a workspace.
            </p>
          </div>
        }
        chatSurface={<WebChatSurface />}
        rightPanel={
          <dl className="space-y-4 text-xs text-[var(--app-text-main)]">
            <div>
              <dt className="text-[var(--app-text-muted)]">Luca Prime</dt>
              <dd className="mt-1 font-bold">Preparing</dd>
            </div>
            <div>
              <dt className="text-[var(--app-text-muted)]">Local routes</dt>
              <dd className="mt-1 font-bold">Connect in Settings</dd>
            </div>
            <div>
              <dt className="text-[var(--app-text-muted)]">LucaLink</dt>
              <dd className="mt-1 font-bold">{lucaLinkStatus}</dd>
            </div>
          </dl>
        }
        settingsSurface={null}
        voiceSurface={null}
        hologramSurface={null}
        visualCoreSurface={null}
      />
    </section>
  );
}
