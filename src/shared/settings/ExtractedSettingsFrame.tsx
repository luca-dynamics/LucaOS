import type { ReactNode } from "react";
import { settingsDesktopTabs } from "../../components/settings/settingsNavigationModel";
import { settingsSurfaceTokens } from "../../components/settings/settingsLayoutStyles";

export const EXTRACTED_SETTINGS_SOURCES = [
  "src/components/SettingsModal.tsx",
  "src/components/settings/SettingsLayout.tsx",
  "src/components/settings/settingsNavigationModel.ts",
  "src/components/settings/settingsExperienceMap.ts",
  "src/components/settings/settingsLayoutStyles.ts",
] as const;

export type BrowserSettingsTab = "host-capabilities" | "lucalink" | "brain" | "data";

const reusedTabs = settingsDesktopTabs.filter((tab) => ["brain", "data", "lucalink"].includes(tab.id));
export const BROWSER_SETTINGS_TABS = [
  { id: "host-capabilities", label: "Host & Capabilities" },
  ...reusedTabs.map((tab) => ({ id: tab.id as BrowserSettingsTab, label: tab.label })),
] as const;

export function ExtractedSettingsFrame({
  activeTab,
  children,
  onClose,
  onSelect,
}: {
  activeTab: BrowserSettingsTab;
  children: ReactNode;
  onClose: () => void;
  onSelect: (tab: BrowserSettingsTab) => void;
}) {
  return (
    <div data-luca-extraction="settings-modal" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-0 font-sans select-none glass-blur sm:p-4">
      <div className="flex h-full w-full flex-row overflow-hidden tech-border glass-blur sm:h-[90%] sm:max-w-[90%] sm:rounded-xl" style={{ backgroundColor: "var(--app-bg-main,#0a0a0f)", borderColor: "var(--app-border-main)" }}>
        <aside className="flex w-20 shrink-0 flex-col border-r sm:w-64" style={{ backgroundColor: "var(--app-bg-main,#0a0a0a)", borderColor: "var(--app-border-main)" }}>
          <div className="border-b p-4" style={{ borderColor: "var(--app-border-main)" }}><p className="hidden text-lg font-semibold sm:block">Settings</p><p className="text-center text-xs font-bold sm:hidden">LUCA</p></div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-2">
            {BROWSER_SETTINGS_TABS.map((tab) => <button type="button" key={tab.id} onClick={() => onSelect(tab.id)} className="w-full rounded-lg px-2 py-3 text-center text-[10px] font-medium sm:px-3 sm:text-left sm:text-sm" style={activeTab === tab.id ? { backgroundColor: settingsSurfaceTokens.hover, color: settingsSurfaceTokens.textPrimary } : { color: settingsSurfaceTokens.textSecondary }}>{tab.label}</button>)}
          </nav>
          <button type="button" onClick={onClose} className="m-3 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--app-border-main)" }}>Close</button>
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-7">{children}</main>
      </div>
    </div>
  );
}
