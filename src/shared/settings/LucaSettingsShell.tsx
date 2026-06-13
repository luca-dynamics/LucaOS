import type { ReactNode } from "react";
import { settingsCardStyle, settingsSurfaceTokens } from "../../components/settings/settingsLayoutStyles";
import { LucaAction } from "../ui/LucaPrimitives";

export type LucaSettingsSectionId = "host-capabilities" | "lucalink" | "model-runtime" | "memory-data";
export const LUCA_SETTINGS_SECTIONS = [
  { id: "host-capabilities", label: "Host & Capabilities", detail: "System status and governed capability routes." },
  { id: "lucalink", label: "LucaLink", detail: "Devices, pairing, and session continuity." },
  { id: "model-runtime", label: "Model / Runtime", detail: "Browser-safe model routing and local-host options." },
  { id: "memory-data", label: "Memory / Data", detail: "Browser storage scope and data controls." },
] as const;

export function LucaSettingsShell({ activeSection, children, onBack, onSelect }: { activeSection: LucaSettingsSectionId; children: ReactNode; onBack: () => void; onSelect: (section: LucaSettingsSectionId) => void }) {
  return (
    <div data-luca-surface="settings" className="mx-auto min-h-full max-w-7xl px-4 py-5 sm:px-7">
      <div className="overflow-hidden rounded-2xl border lg:grid lg:grid-cols-[17rem_1fr]" style={settingsCardStyle}>
        <aside className="border-b border-[var(--luca-border-subtle)] p-4 lg:min-h-[38rem] lg:border-b-0 lg:border-r">
          <div className="px-2 py-2"><p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: settingsSurfaceTokens.accentPrimary }}>LucaOS</p><h1 className="mt-2 text-xl font-semibold">Settings</h1></div>
          <nav className="mt-4 grid gap-1">
            {LUCA_SETTINGS_SECTIONS.map((section) => (
              <button type="button" key={section.id} onClick={() => onSelect(section.id)} className={`rounded-xl px-3 py-3 text-left transition hover:bg-[var(--luca-surface-hover)] ${activeSection === section.id ? "bg-[var(--luca-surface-hover)]" : ""}`}>
                <span className="block text-sm font-semibold">{section.label}</span>
                <span className="mt-1 block text-[11px] leading-4 text-[var(--luca-text-tertiary)]">{section.detail}</span>
              </button>
            ))}
          </nav>
          <LucaAction className="mt-5 w-full" emphasis="quiet" onClick={onBack}>Back to LucaOS</LucaAction>
        </aside>
        <div className="min-w-0 p-5 sm:p-7">{children}</div>
      </div>
    </div>
  );
}

export function LucaSettingsHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return <header className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--luca-accent-primary)]">{eyebrow}</p><h2 className="mt-2 text-2xl font-semibold">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--luca-text-secondary)]">{detail}</p></header>;
}
