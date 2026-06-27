import { useState } from "react";
import { LucaDashboardSurface } from "../components/dashboard/LucaDashboardSurface";
import { Icon } from "../components/ui/Icon";
import type { WebCapability } from "./browserHostCapabilities";
import { WebRealChatPanel } from "./chat/WebRealChatPanel";
import { resolveLucaDashboardSkinBoundary } from "../styles/lucaDashboardSkinBoundary";
import { readWebPremiumPreferences } from "./webLifecycleStorage";
import { webAppRuntime } from "./runtime/webAppRuntime";
import {
  RIGHT_PANEL_LABELS,
  type RightPanelMode,
} from "../components/right-panel/rightPanelModel";
import { WebRealRightPanel } from "./shell/WebRealRightPanel";

interface WebLucaShellProps {
  hostClass: string;
  lucaLinkStatus: string;
  browserCapabilities: WebCapability[];
  guardedNativeCapabilities: WebCapability[];
}

const RIGHT_PANEL_WEB_MODES: RightPanelMode[] = ["CONTROL", "ACTIVITY", "MEMORY"];

export function WebLucaShell({ lucaLinkStatus: _lucaLinkStatus }: WebLucaShellProps) {
  // Honor the skin chosen during onboarding (stored as the `environment`
  // selection in the web premium preferences). Resolved at this local shell
  // boundary only — never mutates document / body / html. Mirrors the desktop
  // App.tsx wiring (resolveLucaDashboardSkinBoundary from the persisted skin).
  const selectedSkinId = readWebPremiumPreferences()?.environment;
  const skinBoundary = resolveLucaDashboardSkinBoundary({
    selectedSkinId,
    hostKind: "desktop-web",
  });

  // Right panel now mounts the REAL desktop components (ControlPanel /
  // ActivityPanel / MemoryControlPanel) via WebRealRightPanel, switched by the
  // dashboard's tabs. The left workspace still reads the runtime's session list.
  const [rightMode, setRightMode] = useState<RightPanelMode>("CONTROL");
  const workspaceState = webAppRuntime.getWorkspaceState();

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
            <div className="space-y-2">
              {workspaceState.sessions.map((session) => (
                <div
                  key={session.id}
                  data-luca-web-workspace-session={session.id}
                  className={`rounded-xl border p-3 text-xs text-[var(--app-text-main)] ${
                    session.active
                      ? "border-[var(--app-primary)] bg-[var(--luca-accent-soft)]"
                      : "border-[var(--app-border-main)]"
                  }`}
                >
                  <Icon name="ChatRound" size={16} color="currentColor" />
                  <span className="mt-2 block font-bold">{session.title}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-[10px] leading-5 text-[var(--app-text-muted)]">
              {workspaceState.emptyMessage}
            </p>
          </div>
        }
        chatSurface={<WebRealChatPanel />}
        rightPanel={<WebRealRightPanel mode={rightMode} />}
        rightPanelModes={RIGHT_PANEL_WEB_MODES}
        activeRightPanelMode={rightMode}
        onRightPanelModeChange={setRightMode}
        getRightPanelLabel={(mode) => RIGHT_PANEL_LABELS[mode]}
        settingsSurface={null}
        voiceSurface={null}
        hologramSurface={null}
        visualCoreSurface={null}
      />
    </section>
  );
}
