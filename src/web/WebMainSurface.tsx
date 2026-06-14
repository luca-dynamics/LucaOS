import { useState } from "react";
import {
  ExtractedChatWorkspace,
  ExtractedLucaHeader,
  ExtractedLucaWorkspace,
} from "../shared/app-shell/ExtractedLucaWorkspace";
import {
  ExtractedSettingsFrame,
  type BrowserSettingsTab,
} from "../shared/settings/ExtractedSettingsFrame";
import {
  ExtractedSettingsCard,
  ExtractedSettingsSection,
} from "../shared/ui/ExtractedSurfacePrimitives";
import { WebHostCapabilitiesPanel } from "./WebHostCapabilitiesPanel";
import { WebLucaLinkSurface } from "./WebLucaLinkSurface";
import { useWebRuntime } from "./WebRuntimeContext";
import type { WebProfile } from "./webLifecycleStorage";

export function WebMainSurface({ profile }: { profile: WebProfile | null }) {
  const runtime = useWebRuntime();
  const [settings, setSettings] = useState<BrowserSettingsTab | null>(null);

  if (settings) {
    return (
      <ExtractedSettingsFrame activeTab={settings} onClose={() => setSettings(null)} onSelect={setSettings}>
        {settings === "host-capabilities" ? (
          <WebHostCapabilitiesPanel onOpenLucaLink={() => setSettings("lucalink")} />
        ) : settings === "lucalink" ? (
          <WebLucaLinkSurface status={runtime.lucaLinkStatus} />
        ) : settings === "brain" ? (
          <ExtractedSettingsSection title="Brain" description="Choose the model route Luca uses on this host.">
            <ExtractedSettingsCard>Current route: {profile?.modelRoute === "desktop-later" ? "Paired Desktop required" : profile?.modelRoute ?? "Luca Prime"}</ExtractedSettingsCard>
          </ExtractedSettingsSection>
        ) : (
          <ExtractedSettingsSection title="Data" description="Review storage available to this LucaOS host.">
            <ExtractedSettingsCard>Browser-safe profile storage only. Desktop vault and local memory are not initialized.</ExtractedSettingsCard>
          </ExtractedSettingsSection>
        )}
      </ExtractedSettingsFrame>
    );
  }

  return (
    <ExtractedLucaWorkspace
      header={<ExtractedLucaHeader connection={runtime.hostClass.replace("-", " ")} onOpenSettings={() => setSettings("host-capabilities")} />}
      navigation={<WebNavigation onOpenLucaLink={() => setSettings("lucalink")} />}
      activity={<WebActivity host={runtime.hostClass} lucaLink={runtime.lucaLinkStatus} onOpenSystem={() => setSettings("host-capabilities")} />}
      onSelectMobile={(tab) => tab === "SYSTEM" ? setSettings("host-capabilities") : undefined}
    >
      <ExtractedChatWorkspace name={profile?.name ?? ""} onOpenVoice={() => undefined} />
    </ExtractedLucaWorkspace>
  );
}

function WebNavigation({ onOpenLucaLink }: { onOpenLucaLink: () => void }) {
  return <div className="flex h-full flex-col p-3"><p className="px-2 py-3 text-[10px] font-bold tracking-widest text-[var(--app-text-muted)]">APPS</p><button type="button" className="rounded-lg bg-[var(--luca-surface-hover)] px-3 py-2 text-left text-sm">Luca</button><button type="button" className="rounded-lg px-3 py-2 text-left text-sm">Conversations</button><button type="button" onClick={onOpenLucaLink} className="mt-auto rounded-lg border px-3 py-3 text-left text-sm" style={{ borderColor: "var(--app-border-main)" }}>LucaLink</button></div>;
}

function WebActivity({ host, lucaLink, onOpenSystem }: { host: string; lucaLink: string; onOpenSystem: () => void }) {
  return <div className="p-5"><p className="text-xs font-bold uppercase tracking-widest text-[var(--app-text-muted)]">Activity</p><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-xs text-[var(--app-text-muted)]">Host</dt><dd className="mt-1 capitalize">{host.replace("-", " ")}</dd></div><div><dt className="text-xs text-[var(--app-text-muted)]">LucaLink</dt><dd className="mt-1 capitalize">{lucaLink.replace(/-/g, " ")}</dd></div></dl><button type="button" onClick={onOpenSystem} className="mt-6 w-full rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--app-border-main)" }}>Host & Capabilities</button></div>;
}
