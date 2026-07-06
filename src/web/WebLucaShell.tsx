import { useState } from "react";
import { LucaDashboardSurface } from "../components/dashboard/LucaDashboardSurface";
import type { WebCapability } from "./browserHostCapabilities";
import { WebRealChatPanel } from "./chat/WebRealChatPanel";
import { resolveLucaDashboardSkinBoundary } from "../styles/lucaDashboardSkinBoundary";
import { readWebPremiumPreferences } from "./webLifecycleStorage";
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
import { WebRealSettingsSurface } from "./shell/WebRealSettingsSurface";

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
          />
        }
        leftPanel={<WebRealOperationsSidebar />}
        chatSurface={<WebRealChatPanel />}
        rightPanel={<WebRealRightPanel mode={rightMode} />}
        rightPanelModes={RIGHT_PANEL_WEB_MODES}
        activeRightPanelMode={rightMode}
        onRightPanelModeChange={setRightMode}
        getRightPanelLabel={(mode) => RIGHT_PANEL_LABELS[mode]}
        settingsSurface={
          isSettingsOpen ? (
            <WebRealSettingsSurface onClose={() => setIsSettingsOpen(false)} />
          ) : null
        }
        voiceSurface={null}
        hologramSurface={null}
        visualCoreSurface={null}
      />
    </section>
  );
}
