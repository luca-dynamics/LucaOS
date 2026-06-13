import { useState, type ReactNode } from "react";
import { LucaButton, LucaPanel, LucaStatusChip } from "../shared/ui/LucaWebPrimitives";
import { WebHostCapabilitiesPanel } from "./WebHostCapabilitiesPanel";
import { WebLucaLinkSurface } from "./WebLucaLinkSurface";
import { useWebRuntime } from "./WebRuntimeContext";
import type { WebProfile } from "./webLifecycleStorage";

type SettingsSurface = "closed" | "menu" | "capabilities" | "lucalink";

export function WebMainSurface({ profile }: { profile: WebProfile | null }) {
  const runtime = useWebRuntime();
  const [settings, setSettings] = useState<SettingsSurface>("closed");
  if (settings === "capabilities") return <SettingsFrame><WebHostCapabilitiesPanel onBack={() => setSettings("menu")} onOpenLucaLink={() => setSettings("lucalink")} /></SettingsFrame>;
  if (settings === "lucalink") return <SettingsFrame><WebLucaLinkSurface onBack={() => setSettings("menu")} /></SettingsFrame>;
  if (settings === "menu") return (
    <SettingsFrame>
      <LucaPanel><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/55">LucaOS Web</p><h2 className="mt-2 text-2xl font-semibold">Settings</h2><div className="mt-6 grid gap-3 sm:grid-cols-2"><SettingsRoute title="Host & Capabilities" detail="System status, capability map, and route unlock options." onClick={() => setSettings("capabilities")} /><SettingsRoute title="LucaLink" detail="Pair hosts and continue sessions across devices." onClick={() => setSettings("lucalink")} /></div><LucaButton className="mt-5" variant="quiet" onClick={() => setSettings("closed")}>Back to LucaOS</LucaButton></LucaPanel>
    </SettingsFrame>
  );

  return (
    <div data-web-surface="main" className="mx-auto flex min-h-full max-w-7xl flex-col px-4 py-5 sm:px-7">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/55">LucaOS Web</p><h1 className="mt-1 text-2xl font-semibold">Welcome back{profile?.name ? `, ${profile.name}` : ""}.</h1></div>
        <div className="flex flex-wrap items-center gap-2"><LucaStatusChip>{runtime.hostClass.replace("-", " ")} · Browser host</LucaStatusChip><LucaStatusChip onClick={() => setSettings("lucalink")}>LucaLink · {runtime.lucaLinkStatus.replace(/-/g, " ")}</LucaStatusChip><LucaButton onClick={() => setSettings("menu")}>Settings</LucaButton></div>
      </header>
      <div className="grid flex-1 gap-4 py-5 lg:grid-cols-[1fr_18rem]">
        <LucaPanel className="flex min-h-[32rem] flex-col">
          <div className="flex-1"><p className="text-xs uppercase tracking-[0.18em] text-white/35">Luca</p><h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight">What would you like to do?</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">Use LucaOS from this browser. Luca will adapt to this host and route deeper native actions through Desktop, Mobile, LucaLink, or approved connectors when needed.</p></div>
          <div className="rounded-2xl border border-white/10 bg-black/25 p-3"><textarea aria-label="Message Luca" rows={2} placeholder="Ask Luca…" className="w-full resize-none bg-transparent px-2 py-1 text-sm text-white outline-none placeholder:text-white/30" /><div className="flex justify-end"><LucaButton variant="primary">Send</LucaButton></div></div>
        </LucaPanel>
        <LucaPanel><p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">System status</p><div className="mt-5 grid gap-4 text-sm"><Status label="Host" value={runtime.hostClass.replace("-", " ")} /><Status label="Native runtime" value="Browser sandbox" /><Status label="LucaLink" value={runtime.lucaLinkStatus.replace(/-/g, " ")} /></div><LucaButton className="mt-6 w-full" onClick={() => setSettings("capabilities")}>Host & Capabilities</LucaButton></LucaPanel>
      </div>
    </div>
  );
}

function SettingsFrame({ children }: { children: ReactNode }) { return <div className="mx-auto min-h-full max-w-6xl px-4 py-6 sm:px-7">{children}</div>; }
function SettingsRoute({ title, detail, onClick }: { title: string; detail: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="rounded-2xl border border-white/10 bg-black/20 p-5 text-left hover:bg-white/[0.05]"><span className="font-semibold">{title}</span><span className="mt-2 block text-sm leading-6 text-white/45">{detail}</span></button>; }
function Status({ label, value }: { label: string; value: string }) { return <div className="border-b border-white/[0.07] pb-3"><p className="text-xs text-white/35">{label}</p><p className="mt-1 capitalize text-white/75">{value}</p></div>; }
