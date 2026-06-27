import { useState } from "react";
import { LucaDashboardSurface } from "../components/dashboard/LucaDashboardSurface";
import { Icon } from "../components/ui/Icon";
import type { WebCapability } from "./browserHostCapabilities";
import { WebRealChatPanel } from "./chat/WebRealChatPanel";
import { resolveLucaDashboardSkinBoundary } from "../styles/lucaDashboardSkinBoundary";
import { readWebPremiumPreferences } from "./webLifecycleStorage";
import { webAppRuntime, type WebSurfaceAvailability } from "./runtime/webAppRuntime";
import {
  RIGHT_PANEL_LABELS,
  type RightPanelMode,
} from "../components/right-panel/rightPanelModel";

interface WebLucaShellProps {
  hostClass: string;
  lucaLinkStatus: string;
  browserCapabilities: WebCapability[];
  guardedNativeCapabilities: WebCapability[];
}

const RIGHT_PANEL_WEB_MODES: RightPanelMode[] = ["CONTROL", "ACTIVITY", "MEMORY"];

const availabilityDot: Record<WebSurfaceAvailability, string> = {
  ready: "var(--luca-success, #4fbf7a)",
  preparing: "var(--luca-info, #4f8cff)",
  "connect-required": "var(--luca-warning, #f2b23e)",
  unavailable: "var(--app-text-muted)",
};

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

  // The right panel now reads from the web app runtime (real-app Phase 3)
  // instead of hand-coded rows: Overview shows live control rows, Timeline and
  // Memory show their honest empty states until web-safe data sources land.
  const [rightMode, setRightMode] = useState<RightPanelMode>("CONTROL");
  const controlState = webAppRuntime.getControlState({ lucaLinkStatus });
  const activityState = webAppRuntime.getActivityState();
  const memoryState = webAppRuntime.getMemoryState();
  const workspaceState = webAppRuntime.getWorkspaceState();

  const emptyNote = (message: string) => (
    <p className="text-[11px] leading-5 text-[var(--app-text-muted)]">{message}</p>
  );

  const rightPanel =
    rightMode === "CONTROL" ? (
      <dl className="space-y-4 text-xs text-[var(--app-text-main)]">
        {controlState.rows.map((row) => (
          <div key={row.id}>
            <dt className="flex items-center gap-2 text-[var(--app-text-muted)]">
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: availabilityDot[row.availability] }}
              />
              {row.label}
            </dt>
            <dd className="mt-1 font-bold">{row.value}</dd>
          </div>
        ))}
      </dl>
    ) : rightMode === "ACTIVITY" ? (
      emptyNote(activityState.emptyMessage)
    ) : (
      emptyNote(memoryState.emptyMessage)
    );

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
        rightPanel={rightPanel}
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
