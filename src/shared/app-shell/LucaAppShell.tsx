import type { ReactNode } from "react";
import { lucaShellControlStyle, lucaShellPanelSurfaceStyle, lucaShellWorkspaceSurfaceStyle } from "../../styles/lucaShellStyles";
import { LucaAction, LucaStatus } from "../ui/LucaPrimitives";

export function LucaAppShell({ operatorName, hostStatus, lucaLinkStatus, onOpenSettings, onOpenLucaLink, onOpenSystem, children }: { operatorName?: string; hostStatus: string; lucaLinkStatus: string; onOpenSettings: () => void; onOpenLucaLink: () => void; onOpenSystem: () => void; children: ReactNode }) {
  return (
    <div data-luca-surface="main" className="mx-auto flex min-h-full max-w-[92rem] flex-col px-3 py-3 sm:px-5 sm:py-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3" style={lucaShellPanelSurfaceStyle}>
        <div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--luca-accent-primary)]">LUCAOS</p><h1 className="mt-0.5 text-lg font-semibold">{operatorName ? `Luca · ${operatorName}` : "Luca"}</h1></div>
        <div className="flex flex-wrap items-center gap-2"><LucaStatus>{hostStatus}</LucaStatus><LucaStatus onClick={onOpenLucaLink}>LucaLink · {lucaLinkStatus}</LucaStatus><LucaAction onClick={onOpenSettings}>Settings</LucaAction></div>
      </header>
      <div className="grid flex-1 gap-3 py-3 lg:grid-cols-[15rem_minmax(0,1fr)_18rem]">
        <aside className="hidden rounded-2xl border p-3 lg:flex lg:flex-col" style={lucaShellPanelSurfaceStyle}>
          <p className="px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--luca-text-tertiary)]">Workspace</p>
          {["Luca", "Conversations", "Activity"].map((label, index) => <button type="button" key={label} className={`rounded-xl px-3 py-2.5 text-left text-sm ${index === 0 ? "bg-[var(--luca-surface-hover)]" : ""}`} style={index === 0 ? undefined : lucaShellControlStyle}>{label}</button>)}
          <button type="button" onClick={onOpenLucaLink} className="mt-auto rounded-xl border px-3 py-3 text-left text-sm" style={lucaShellControlStyle}><span className="font-semibold">LucaLink</span><span className="mt-1 block text-xs text-[var(--luca-text-tertiary)]">Devices & continuity</span></button>
        </aside>
        <main className="min-h-[34rem] overflow-hidden rounded-2xl border" style={{ ...lucaShellWorkspaceSurfaceStyle, borderColor: "var(--luca-border-subtle)" }}>{children}</main>
        <aside className="rounded-2xl border p-5" style={lucaShellPanelSurfaceStyle}>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--luca-text-tertiary)]">System status</p>
          <dl className="mt-5 grid gap-4 text-sm"><StatusRow label="Host" value={hostStatus} /><StatusRow label="Runtime" value="Browser-safe" /><StatusRow label="LucaLink" value={lucaLinkStatus} /></dl>
          <LucaAction className="mt-6 w-full" onClick={onOpenSystem}>Host & Capabilities</LucaAction>
        </aside>
      </div>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return <div className="border-b border-[var(--luca-border-subtle)] pb-3"><dt className="text-xs text-[var(--luca-text-tertiary)]">{label}</dt><dd className="mt-1 capitalize text-[var(--luca-text-primary)]">{value}</dd></div>;
}
