import type { ReactNode } from "react";
import { DESKTOP_RAIL_WIDTH_PX } from "../../components/layout/desktopShellModel";
import {
  lucaShellPanelSurfaceStyle,
  lucaShellWorkspaceSurfaceStyle,
} from "../../styles/lucaShellStyles";
import {
  lucaMobileNavActiveStyle,
  lucaMobileNavInactiveStyle,
  lucaMobileNavSurfaceStyle,
} from "../../styles/lucaMobileShellStyles";

export const EXTRACTED_APP_SHELL_SOURCES = [
  "src/App.tsx",
  "src/components/layout/Header.tsx",
  "src/components/layout/ChatPanel.tsx",
  "src/components/layout/desktopShellModel.ts",
  "src/styles/lucaShellStyles.ts",
  "src/styles/lucaMobileShellStyles.ts",
] as const;

export function ExtractedLucaWorkspace({
  activity,
  children,
  header,
  navigation,
  onSelectMobile,
}: {
  activity: ReactNode;
  children: ReactNode;
  header: ReactNode;
  navigation: ReactNode;
  onSelectMobile: (tab: "SYSTEM" | "TERMINAL" | "DATA") => void;
}) {
  return (
    <div data-luca-extraction="app-shell" className="flex h-full min-h-screen w-full flex-col overflow-hidden">
      {header}
      <main className="relative z-10 flex min-h-0 flex-1 gap-0 overflow-hidden p-0">
        <aside className="hidden h-full flex-none flex-col overflow-hidden border-r lg:flex" style={{ ...lucaShellPanelSurfaceStyle, width: 280 }}>
          {navigation}
        </aside>
        <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden" style={lucaShellWorkspaceSurfaceStyle}>
          {children}
        </section>
        <aside className="hidden h-full flex-none flex-col overflow-hidden border-l xl:flex" style={{ ...lucaShellPanelSurfaceStyle, width: 320 }}>
          {activity}
        </aside>
      </main>
      <nav className="grid h-16 grid-cols-3 border-t lg:hidden" style={lucaMobileNavSurfaceStyle}>
        {(["SYSTEM", "TERMINAL", "DATA"] as const).map((tab) => (
          <button type="button" key={tab} onClick={() => onSelectMobile(tab)} className="text-[10px] font-bold tracking-widest" style={tab === "TERMINAL" ? lucaMobileNavActiveStyle : lucaMobileNavInactiveStyle}>
            {tab}
          </button>
        ))}
      </nav>
      <span className="sr-only">Desktop collapsed rail width {DESKTOP_RAIL_WIDTH_PX}</span>
    </div>
  );
}

export function ExtractedLucaHeader({
  connection,
  onOpenSettings,
}: {
  connection: string;
  onOpenSettings: () => void;
}) {
  return (
    <header id="app-header" className="glass-blur relative z-50 flex h-16 items-center justify-between border-b px-4 transition-all duration-500 sm:px-6" style={{ backgroundColor: "rgba(0,0,0,var(--app-bg-opacity,0.5))", borderColor: "var(--app-border-main)", color: "var(--app-text-main)" }}>
      <div className="flex min-w-0 items-center gap-3">
        <img src="/icon.png" alt="Luca" className="h-9 w-9 object-contain" />
        <h1 className="font-display text-lg font-semibold tracking-tight">LUCA OS</h1>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full border px-3 py-1.5 text-[11px]" style={{ borderColor: "var(--app-border-main)", backgroundColor: "var(--app-bg-tint)" }}>{connection}</span>
        <button type="button" onClick={onOpenSettings} aria-label="Open Settings" className="rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: "var(--app-border-main)", backgroundColor: "var(--app-bg-tint)" }}>Settings</button>
      </div>
    </header>
  );
}

export function ExtractedChatWorkspace({
  name,
  onOpenVoice,
}: {
  name: string;
  onOpenVoice: () => void;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning," : hour < 17 ? "Afternoon," : "Evening,";
  return (
    <div data-luca-extraction="chat-panel" className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-[var(--app-text-muted)]">{greeting}</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">{name || "Operator"}</h2>
        <p className="mt-3 max-w-xl text-sm text-[var(--app-text-muted)]">What can Luca help you accomplish?</p>
      </div>
      <div className="m-4 rounded-2xl border p-3 sm:m-6" style={{ borderColor: "var(--app-border-main)", backgroundColor: "var(--app-bg-tint)" }}>
        <textarea aria-label="Message Luca" rows={2} placeholder="Message Luca…" className="w-full resize-none bg-transparent p-2 text-sm outline-none" />
        <div className="flex items-center justify-between">
          <button type="button" onClick={onOpenVoice} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--app-border-main)" }}>Voice</button>
          <button type="button" className="rounded-lg bg-[var(--luca-accent-primary)] px-4 py-2 text-sm font-semibold text-slate-950">Send</button>
        </div>
      </div>
    </div>
  );
}
