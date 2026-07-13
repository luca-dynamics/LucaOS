import type { ReactNode } from "react";
import { Icon } from "../ui/Icon";
import PanelResizer from "../layout/PanelResizer";
import {
  ACTIVITY_RAIL_ICONS,
  DESKTOP_RAIL_WIDTH_PX,
  leftToggleIcon,
  rightToggleIcon,
} from "../layout/desktopShellModel";
import type { RightPanelMode } from "../right-panel/rightPanelModel";
import {
  mobileNavigationLabel,
  type MobileNavigationTab,
} from "../layout/mobileNavigationModel";
import {
  lucaShellActiveIndicatorStyle,
  lucaShellClassNames,
  lucaShellMutedTextStyle,
} from "../../styles/lucaShellStyles";
import {
  lucaMaterialControlActiveStyle,
  lucaMaterialControlStyle,
  lucaMaterialDividerStyle,
  lucaMaterialMobileContentStyle,
  lucaMaterialMobileDividerStyle,
  lucaMaterialMobileNavStyle,
  lucaMaterialMobilePanelChromeStyle,
  lucaMaterialMobileTabActiveStyle,
  lucaMaterialPanelStyle,
  lucaMaterialRailStyle,
  lucaMaterialTabActiveStyle,
  lucaMaterialTabStyle,
  lucaMaterialWorkspaceStyle,
} from "../../styles/lucaMaterialSystem";
import {
  lucaMobileActiveIndicatorStyle,
  lucaMobileClassNames,
  lucaMobileInactiveTabStyle,
  lucaMobileNavActiveStyle,
  lucaMobileNavInactiveStyle,
} from "../../styles/lucaMobileShellStyles";

export interface LucaDashboardSurfaceProps {
  headerSurface?: ReactNode;
  capabilityStrip?: ReactNode;
  leftPanel?: ReactNode;
  chatSurface?: ReactNode;
  rightPanel?: ReactNode;
  settingsSurface?: ReactNode;
  overlaySurface?: ReactNode;
  browserSurface?: ReactNode;
  voiceSurface?: ReactNode;
  hologramSurface?: ReactNode;
  visualCoreSurface?: ReactNode;
  isMobile?: boolean;
  activeMobileTab?: MobileNavigationTab;
  onMobileTabChange?: (tab: MobileNavigationTab) => void;
  showVoiceHud?: boolean;
  leftPanelCollapsed?: boolean;
  rightPanelCollapsed?: boolean;
  onToggleLeftPanel?: (collapsed: boolean) => void;
  onToggleRightPanel?: (collapsed: boolean) => void;
  /**
   * Drawer overlays for narrow viewports: the panel floats OVER the center
   * workspace (with a scrim) instead of compressing it — same behaviour as
   * the desktop shell. The host owns the open state; the collapsed rails'
   * toggle buttons still fire onToggleLeft/RightPanel and the host decides
   * whether that means dock or drawer.
   */
  leftDrawerOpen?: boolean;
  rightDrawerOpen?: boolean;
  onCloseDrawers?: () => void;
  onOpenSettings?: () => void;
  onOpenVoice?: () => void;
  onOpenChat?: () => void;
  onOpenVisualCore?: () => void;
  rightPanelModes?: RightPanelMode[];
  activeRightPanelMode?: RightPanelMode;
  getRightPanelLabel?: (mode: RightPanelMode) => string;
  onRightPanelModeChange?: (mode: RightPanelMode) => void;
  panelWidths?: { sidebar?: number; right?: number };
  onResizeLeftPanel?: (delta: number) => void;
  onResizeRightPanel?: (delta: number) => void;
  themeColor?: string;
  rootStyle?: React.CSSProperties;
}

const DEFAULT_RIGHT_PANEL_MODES: RightPanelMode[] = [
  "CONTROL",
  "ACTIVITY",
  "MEMORY",
];
const DEFAULT_PANEL_WIDTHS = { sidebar: 320, right: 360 };

export function LucaDashboardSurface({
  headerSurface,
  capabilityStrip,
  leftPanel,
  chatSurface,
  rightPanel,
  settingsSurface,
  overlaySurface,
  browserSurface,
  voiceSurface,
  hologramSurface,
  visualCoreSurface,
  isMobile = false,
  activeMobileTab = "TERMINAL",
  onMobileTabChange,
  showVoiceHud = false,
  leftPanelCollapsed = false,
  rightPanelCollapsed = false,
  onToggleLeftPanel,
  onToggleRightPanel,
  leftDrawerOpen = false,
  rightDrawerOpen = false,
  onCloseDrawers,
  rightPanelModes = DEFAULT_RIGHT_PANEL_MODES,
  activeRightPanelMode = rightPanelModes[0] ?? "CONTROL",
  getRightPanelLabel = (mode) => mode,
  onRightPanelModeChange,
  panelWidths = DEFAULT_PANEL_WIDTHS,
  onResizeLeftPanel,
  onResizeRightPanel,
  themeColor = "var(--app-primary, currentColor)",
  rootStyle,
}: LucaDashboardSurfaceProps) {
  const sidebarWidth = panelWidths.sidebar ?? DEFAULT_PANEL_WIDTHS.sidebar;
  const rightWidth = panelWidths.right ?? DEFAULT_PANEL_WIDTHS.right;

  return (
    <div
      data-luca-dashboard-surface="original-app-extraction"
      className={`flex flex-col gap-0 p-0 font-mono overflow-hidden relative transition-all duration-700 ${showVoiceHud ? "opacity-0 pointer-events-none scale-95" : "opacity-100"}`}
      style={rootStyle}
    >
      {overlaySurface}
      {headerSurface}
      {capabilityStrip}
      <main className="flex-1 overflow-hidden relative z-10 flex h-full gap-0 p-0">
        {!isMobile && (leftDrawerOpen || rightDrawerOpen) && (
          <div
            className="absolute inset-0 z-30 bg-black/40"
            aria-hidden="true"
            onClick={() => onCloseDrawers?.()}
          />
        )}
        {!isMobile && leftPanelCollapsed && (
          <div
            className={`flex-none h-full overflow-hidden flex flex-col items-center gap-4 py-3 border-r ${lucaShellClassNames.rail}`}
            style={{
              ...lucaMaterialRailStyle,
              width: `${DESKTOP_RAIL_WIDTH_PX}px`,
            }}
          >
            <button
              type="button"
              aria-label={leftToggleIcon(true).label}
              title={leftToggleIcon(true).label}
              onClick={() => onToggleLeftPanel?.(false)}
              className={`p-2 rounded-lg border transition-colors ${lucaShellClassNames.control}`}
              style={lucaMaterialControlStyle}
            >
              <Icon name={leftToggleIcon(true).name} size={20} />
            </button>
            <div
              className="flex flex-col items-center gap-1"
              style={lucaShellMutedTextStyle}
              aria-hidden="true"
            >
              <Icon name="LayoutGrid" size={18} />
              <span className="text-[8px] font-bold tracking-widest [writing-mode:vertical-rl] rotate-180 opacity-70">
                APPS
              </span>
            </div>
          </div>
        )}
        {!isMobile && (!leftPanelCollapsed || leftDrawerOpen) && leftPanel && (
          <>
            <div
              className={`${leftDrawerOpen ? "absolute left-0 top-0 z-40" : "relative flex-none"} h-full overflow-hidden flex flex-col border-r ${lucaShellClassNames.panel}`}
              style={{
                ...lucaMaterialPanelStyle,
                width: `${sidebarWidth}px`,
              }}
            >
              <button
                type="button"
                aria-label={leftToggleIcon(false).label}
                title={leftToggleIcon(false).label}
                onClick={() => onToggleLeftPanel?.(true)}
                className={`absolute top-2 right-2 z-30 p-1.5 rounded-lg border backdrop-blur-sm transition-colors ${lucaShellClassNames.control}`}
                style={lucaMaterialControlStyle}
              >
                <Icon name={leftToggleIcon(false).name} size={18} />
              </button>
              {leftPanel}
            </div>
            {!leftDrawerOpen && onResizeLeftPanel && (
              <PanelResizer
                themeColor={themeColor}
                onResize={onResizeLeftPanel}
              />
            )}
          </>
        )}
        {isMobile && activeMobileTab === "SYSTEM" && (
          <div
            className={`flex w-full h-full ${lucaMobileClassNames.content}`}
            style={lucaMaterialMobileContentStyle}
          >
            {leftPanel}
          </div>
        )}
        {!isMobile && (
          <div
            className={`relative flex-1 h-full overflow-hidden flex flex-col ${lucaShellClassNames.workspace}`}
            style={lucaMaterialWorkspaceStyle}
          >
            {chatSurface}
            {voiceSurface}
            {hologramSurface}
            {visualCoreSurface}
          </div>
        )}
        {isMobile && activeMobileTab === "TERMINAL" && (
          <div
            className={`relative flex w-full h-full ${lucaMobileClassNames.content}`}
            style={lucaMaterialMobileContentStyle}
          >
            {chatSurface}
            {voiceSurface}
            {hologramSurface}
            {visualCoreSurface}
          </div>
        )}
        {!isMobile && rightPanelCollapsed && (
          <div
            className={`flex-none h-full overflow-hidden flex flex-col items-center gap-2 py-3 border-l ${lucaShellClassNames.rail}`}
            style={{
              ...lucaMaterialRailStyle,
              width: `${DESKTOP_RAIL_WIDTH_PX}px`,
            }}
          >
            <button
              type="button"
              aria-label={rightToggleIcon(true).label}
              title={rightToggleIcon(true).label}
              onClick={() => onToggleRightPanel?.(false)}
              className={`p-2 rounded-lg border transition-colors ${lucaShellClassNames.control}`}
              style={lucaMaterialControlStyle}
            >
              <Icon name={rightToggleIcon(true).name} size={20} />
            </button>
            <div className="mt-2 flex flex-col items-center gap-1 w-full">
              {ACTIVITY_RAIL_ICONS.filter((item) =>
                rightPanelModes.includes(item.mode),
              ).map((item) => (
                <button
                  key={item.mode}
                  type="button"
                  aria-label={item.label}
                  title={item.label}
                  onClick={() => onRightPanelModeChange?.(item.mode)}
                  className={`p-2 rounded-lg border transition-colors ${lucaShellClassNames.control}`}
                  style={
                    activeRightPanelMode === item.mode
                      ? lucaMaterialControlActiveStyle
                      : lucaMaterialControlStyle
                  }
                >
                  <Icon name={item.icon} size={18} />
                </button>
              ))}
            </div>
          </div>
        )}
        {!isMobile && (!rightPanelCollapsed || rightDrawerOpen) && rightPanel && (
          <>
            {!rightDrawerOpen && onResizeRightPanel && (
              <PanelResizer
                themeColor={themeColor}
                onResize={onResizeRightPanel}
              />
            )}
            <section
              className={`${rightDrawerOpen ? "absolute right-0 top-0 z-40" : "relative flex-none"} h-full border-l overflow-hidden flex flex-col ${lucaShellClassNames.panel}`}
              style={{
                ...lucaMaterialPanelStyle,
                width: `${rightWidth}px`,
              }}
            >
              <div className="flex flex-col h-full w-full overflow-hidden">
                <div
                  className="flex flex-none border-b"
                  style={lucaMaterialDividerStyle}
                >
                  {rightPanelModes.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onRightPanelModeChange?.(mode)}
                      className={`flex-1 py-3 text-[13px] font-medium transition-colors relative border-b-2 ${activeRightPanelMode === mode ? lucaShellClassNames.activeTab : lucaShellClassNames.tab}`}
                      style={
                        activeRightPanelMode === mode
                          ? lucaMaterialTabActiveStyle
                          : lucaMaterialTabStyle
                      }
                    >
                      {getRightPanelLabel(mode)}
                      {mode === "CONTROL" &&
                        activeRightPanelMode === "CONTROL" && (
                          <span
                            className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${lucaShellClassNames.activeIndicator}`}
                            style={lucaShellActiveIndicatorStyle}
                            aria-hidden="true"
                          />
                        )}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-label={rightToggleIcon(false).label}
                    title={rightToggleIcon(false).label}
                    onClick={() => onToggleRightPanel?.(true)}
                    className={`flex-none px-3 flex items-center justify-center border-l transition-colors ${lucaShellClassNames.control}`}
                    style={{
                      ...lucaMaterialControlStyle,
                      ...lucaMaterialDividerStyle,
                    }}
                  >
                    <Icon name={rightToggleIcon(false).name} size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto pl-1 pr-4 py-4 font-mono text-xs relative">
                  {rightPanel}
                </div>
              </div>
            </section>
          </>
        )}
        {isMobile && activeMobileTab === "DATA" && (
          <section
            className={`flex-1 flex-col h-full border-l relative overflow-hidden flex ${lucaMobileClassNames.panel}`}
            style={lucaMaterialMobilePanelChromeStyle}
          >
            <div className="flex flex-col h-full w-full overflow-hidden">
              <div
                className="flex flex-none border-b"
                style={lucaMaterialMobileDividerStyle}
              >
                {rightPanelModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onRightPanelModeChange?.(mode)}
                    className={`flex-1 py-3 text-[11px] font-medium transition-colors relative border-b-2 ${activeRightPanelMode === mode ? lucaMobileClassNames.tabActive : lucaMobileClassNames.tab}`}
                    style={
                      activeRightPanelMode === mode
                        ? lucaMaterialMobileTabActiveStyle
                        : lucaMobileInactiveTabStyle
                    }
                  >
                    {getRightPanelLabel(mode)}
                    {activeRightPanelMode === mode && (
                      <span
                        aria-hidden="true"
                        className={`absolute left-1/2 top-1 -translate-x-1/2 h-1 w-5 rounded-full border ${lucaMobileClassNames.indicator}`}
                        style={lucaMobileActiveIndicatorStyle}
                      />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto pl-1 pr-4 py-4 font-mono text-xs relative">
                {rightPanel}
              </div>
            </div>
          </section>
        )}
      </main>
      {isMobile && (
        <nav
          className={`flex-none h-16 border-t grid grid-cols-3 items-center z-50 ${lucaMobileClassNames.nav}`}
          style={lucaMaterialMobileNavStyle}
        >
          {(
            [
              { tab: "SYSTEM", icon: "Cpu" },
              { tab: "TERMINAL", icon: "Terminal" },
              { tab: "DATA", icon: "Database" },
            ] as Array<{ tab: MobileNavigationTab; icon: string }>
          ).map(({ tab, icon }) => {
            const active = activeMobileTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => onMobileTabChange?.(tab)}
                className={`mx-2 flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl transition-colors ${active ? lucaMobileClassNames.navItemActive : lucaMobileClassNames.navItem}`}
                style={
                  active ? lucaMobileNavActiveStyle : lucaMobileNavInactiveStyle
                }
              >
                <Icon name={icon} size={20} />
                <span className="text-[10px] font-bold tracking-widest">
                  {mobileNavigationLabel(tab)}
                </span>
              </button>
            );
          })}
        </nav>
      )}
      {settingsSurface}
      {browserSurface}
    </div>
  );
}
