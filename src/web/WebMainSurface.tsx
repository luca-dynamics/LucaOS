import { useState } from "react";
import { LucaAppShell } from "../shared/app-shell/LucaAppShell";
import { LucaSettingsHeading, LucaSettingsShell, type LucaSettingsSectionId } from "../shared/settings/LucaSettingsShell";
import { LucaAction } from "../shared/ui/LucaPrimitives";
import { WebHostCapabilitiesPanel } from "./WebHostCapabilitiesPanel";
import { WebLucaLinkSurface } from "./WebLucaLinkSurface";
import { useWebRuntime } from "./WebRuntimeContext";
import type { WebProfile } from "./webLifecycleStorage";

export function WebMainSurface({ profile }: { profile: WebProfile | null }) {
  const runtime = useWebRuntime();
  const [settings, setSettings] = useState<LucaSettingsSectionId | "closed">("closed");

  if (settings !== "closed") {
    return (
      <LucaSettingsShell activeSection={settings} onBack={() => setSettings("closed")} onSelect={setSettings}>
        {settings === "host-capabilities" ? (
          <WebHostCapabilitiesPanel onOpenLucaLink={() => setSettings("lucalink")} />
        ) : settings === "lucalink" ? (
          <WebLucaLinkSurface status={runtime.lucaLinkStatus} />
        ) : settings === "model-runtime" ? (
          <BrowserSettingsSection eyebrow="Settings · Model / Runtime" title="Model routing" detail="Cloud and BYOK routes are available here. Local model discovery and Ollama remain on LucaOS Desktop or an approved paired host." />
        ) : (
          <BrowserSettingsSection eyebrow="Settings · Memory / Data" title="Browser data" detail="This host stores only the browser-safe LucaOS profile and lifecycle state. Desktop vault, SQLite memory, and filesystem memory are not initialized." />
        )}
      </LucaSettingsShell>
    );
  }

  return (
    <LucaAppShell operatorName={profile?.name} hostStatus={runtime.hostClass.replace("-", " ")} lucaLinkStatus={runtime.lucaLinkStatus.replace(/-/g, " ")} onOpenSettings={() => setSettings("host-capabilities")} onOpenSystem={() => setSettings("host-capabilities")} onOpenLucaLink={() => setSettings("lucalink")}>
      <div className="flex h-full min-h-[34rem] flex-col p-5 sm:p-7">
        <div className="flex-1"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--luca-accent-primary)]">Luca</p><h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight">What would you like to do?</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--luca-text-secondary)]">Chat with Luca here. Capabilities that need another host remain contextual and can be routed through LucaLink when approved.</p></div>
        <div className="rounded-2xl border border-[var(--luca-border-subtle)] bg-[var(--luca-surface-glass)] p-3"><textarea aria-label="Message Luca" rows={2} placeholder="Ask Luca…" className="w-full resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-[var(--luca-text-tertiary)]" /><div className="flex justify-end"><LucaAction emphasis="primary">Send</LucaAction></div></div>
      </div>
    </LucaAppShell>
  );
}

function BrowserSettingsSection({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return <section><LucaSettingsHeading eyebrow={eyebrow} title={title} detail={detail} /><div className="rounded-xl border border-[var(--luca-border-subtle)] p-4 text-sm text-[var(--luca-text-secondary)]">Browser-safe adapter active</div></section>;
}
