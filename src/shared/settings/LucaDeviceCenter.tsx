import { LucaSettingsHeading } from "./LucaSettingsShell";

export const LUCA_DEVICE_ACTIONS = [
  ["Pair Desktop", "Use local models and native capabilities through a trusted host."],
  ["Pair Mobile", "Continue LucaOS with mobile input, sensors, and notifications."],
  ["Pair Smart TV / display host", "Move an approved LucaOS surface to a larger display."],
  ["Continue session", "Prepare a user-approved handoff to another LucaOS host."],
  ["Request host capability", "Route a blocked action through an approved paired host."],
] as const;

export function LucaDeviceCenter({ status }: { status: string }) {
  return (
    <section data-luca-settings-section="lucalink">
      <LucaSettingsHeading eyebrow="Settings · LucaLink" title="Device Center" detail="Manage LucaOS hosts and session continuity. Pairing and capability requests remain explicit and user-approved." />
      <div className="mb-5 rounded-xl border border-[var(--luca-border-subtle)] p-4"><p className="text-xs text-[var(--luca-text-tertiary)]">Current host status</p><p className="mt-1 text-sm font-semibold capitalize">{status.replace(/-/g, " ")}</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {LUCA_DEVICE_ACTIONS.map(([label, detail]) => <button type="button" key={label} className="rounded-xl border border-[var(--luca-border-subtle)] p-4 text-left transition hover:bg-[var(--luca-surface-hover)]"><span className="text-sm font-semibold">{label}</span><span className="mt-1 block text-xs leading-5 text-[var(--luca-text-secondary)]">{detail}</span></button>)}
      </div>
    </section>
  );
}
