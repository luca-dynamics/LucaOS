import { useEffect, useState } from "react";
import { LucaDashboardSurface } from "../components/dashboard/LucaDashboardSurface";
import type { WebCapability } from "./browserHostCapabilities";
import { WebRealChatPanel } from "./chat/WebRealChatPanel";
import { resolveLucaDashboardSkinBoundary } from "../styles/lucaDashboardSkinBoundary";
import { readWebPremiumPreferences } from "./webLifecycleStorage";
import {
  LEFT_PANEL_COLLAPSED_KEY,
  RIGHT_PANEL_COLLAPSED_KEY,
  readCollapsedPreference,
  resolveAutoPanelCollapse,
  writeCollapsedPreference,
} from "../components/layout/desktopShellModel";
import {
  RIGHT_PANEL_LABELS,
  type RightPanelMode,
} from "../components/right-panel/rightPanelModel";
import { WebRealRightPanel } from "./shell/WebRealRightPanel";
import {
  readInitialWebSettingsOpen,
  WebRealHeader,
} from "./shell/WebRealHeader";
import { WebRealOperationsSidebar } from "./shell/WebRealOperationsSidebar";
import { WebRealHologramSurface } from "./shell/WebRealHologramSurface";
import { WebRealSettingsSurface } from "./shell/WebRealSettingsSurface";
import { WebRealVoiceSurface } from "./shell/WebRealVoiceSurface";

interface WebLucaShellProps {
  hostClass: string;
  lucaLinkStatus: string;
  browserCapabilities: WebCapability[];
  guardedNativeCapabilities: WebCapability[];
}

const RIGHT_PANEL_WEB_MODES: RightPanelMode[] = [
  "CONTROL",
  "ACTIVITY",
  "MEMORY",
];

export function WebLucaShell({
  lucaLinkStatus: _lucaLinkStatus,
}: WebLucaShellProps) {
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(
    readInitialWebSettingsOpen,
  );
  const [showVoiceHud, setShowVoiceHud] = useState(false);

  // Responsive panel shell — same model as desktop App.tsx: as the browser
  // window narrows, the side panels auto-hide (right first, then left) instead
  // of squeezing the center workspace; the header toggles then open them as
  // drawer overlays on top of the workspace. User collapse preferences share
  // the desktop's storage keys via desktopShellModel.
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setViewportWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const [leftCollapsed, setLeftCollapsed] = useState(() =>
    readCollapsedPreference(LEFT_PANEL_COLLAPSED_KEY),
  );
  const [rightCollapsed, setRightCollapsed] = useState(() =>
    readCollapsedPreference(RIGHT_PANEL_COLLAPSED_KEY),
  );

  // Narrowness thresholds are independent of the user's own collapse state.
  const narrow = resolveAutoPanelCollapse({
    viewportWidth,
    leftCollapsed: false,
    rightCollapsed: false,
  });
  const leftDocked = !leftCollapsed && !narrow.left;
  const rightDocked = !rightCollapsed && !narrow.right;

  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  useEffect(() => {
    if (!narrow.left) setLeftDrawerOpen(false);
  }, [narrow.left]);
  useEffect(() => {
    if (!narrow.right) setRightDrawerOpen(false);
  }, [narrow.right]);

  const handleToggleLeftPanel = (collapsed: boolean) => {
    if (narrow.left) {
      setLeftDrawerOpen(!collapsed);
      return;
    }
    setLeftCollapsed(collapsed);
    writeCollapsedPreference(LEFT_PANEL_COLLAPSED_KEY, collapsed);
  };
  const handleToggleRightPanel = (collapsed: boolean) => {
    if (narrow.right) {
      setRightDrawerOpen(!collapsed);
      return;
    }
    setRightCollapsed(collapsed);
    writeCollapsedPreference(RIGHT_PANEL_COLLAPSED_KEY, collapsed);
  };

  // Keep drawers usable on small windows: never wider than the viewport
  // minus a strip of workspace peeking through the scrim.
  const panelWidths = {
    sidebar: Math.min(320, Math.max(240, viewportWidth - 72)),
    right: Math.min(360, Math.max(260, viewportWidth - 72)),
  };

  return (
    <section className="absolute inset-0 z-10 p-3 sm:p-5">
      <LucaDashboardSurface
        rootStyle={{
          width: "100%",
          height: "100%",
          ...skinBoundary.materialVariables,
        }}
        headerSurface={
          <WebRealHeader
            isSettingsOpen={isSettingsOpen}
            onOpenSettings={() => setIsSettingsOpen(true)}
            showVoiceHud={showVoiceHud}
            setShowVoiceHud={setShowVoiceHud}
          />
        }
        leftPanel={<WebRealOperationsSidebar />}
        chatSurface={<WebRealChatPanel />}
        rightPanel={<WebRealRightPanel mode={rightMode} />}
        rightPanelModes={RIGHT_PANEL_WEB_MODES}
        activeRightPanelMode={rightMode}
        onRightPanelModeChange={setRightMode}
        getRightPanelLabel={(mode) => RIGHT_PANEL_LABELS[mode]}
        leftPanelCollapsed={!leftDocked}
        rightPanelCollapsed={!rightDocked}
        onToggleLeftPanel={handleToggleLeftPanel}
        onToggleRightPanel={handleToggleRightPanel}
        leftDrawerOpen={leftDrawerOpen}
        rightDrawerOpen={rightDrawerOpen}
        onCloseDrawers={() => {
          setLeftDrawerOpen(false);
          setRightDrawerOpen(false);
        }}
        panelWidths={panelWidths}
        settingsSurface={
          isSettingsOpen ? (
            <WebRealSettingsSurface onClose={() => setIsSettingsOpen(false)} />
          ) : null
        }
        voiceSurface={
          showVoiceHud ? (
            <WebRealVoiceSurface onClose={() => setShowVoiceHud(false)} />
          ) : null
        }
        hologramSurface={<WebRealHologramSurface />}
        visualCoreSurface={null}
      />
    </section>
  );
}
