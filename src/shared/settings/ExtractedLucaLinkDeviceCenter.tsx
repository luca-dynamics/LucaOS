import { ExtractedSettingsCard, ExtractedSettingsRow, ExtractedSettingsSection } from "../ui/ExtractedSurfacePrimitives";

export const EXTRACTED_LUCALINK_SOURCES = [
  "src/components/settings/SettingsLucaLinkTab.tsx",
  "src/components/settings/SettingsLayout.tsx",
] as const;

export function ExtractedLucaLinkDeviceCenter({ status }: { status: string }) {
  return (
    <div data-luca-extraction="lucalink-device-center" className="space-y-5">
      <ExtractedSettingsSection title="LucaLink Device Center" eyebrow="Connected hosts" description="Manage linked LucaOS surfaces and approval-first session continuity.">
        <ExtractedSettingsCard><p className="text-xs text-[var(--luca-text-tertiary)]">Current browser host</p><p className="mt-1 text-lg font-semibold capitalize">{status.replace(/-/g, " ")}</p></ExtractedSettingsCard>
      </ExtractedSettingsSection>
      <ExtractedSettingsSection title="Link a host" description="Pairing remains user-approved. This browser does not become the desktop host controller.">
        <ExtractedSettingsRow label="Desktop" description="Local models, vault, automation, and native capabilities." control={<button type="button" className="rounded-lg border px-3 py-2 text-xs">Pair</button>} />
        <ExtractedSettingsRow label="Mobile" description="Continue LucaOS with mobile input and sensors." control={<button type="button" className="rounded-lg border px-3 py-2 text-xs">Pair</button>} />
        <ExtractedSettingsRow label="Smart TV / display" description="Move an approved session to a display host." control={<button type="button" className="rounded-lg border px-3 py-2 text-xs">Pair</button>} />
      </ExtractedSettingsSection>
      <ExtractedSettingsSection title="Session continuity" description="Handoffs do not execute tools or mutate remote devices without approval.">
        <ExtractedSettingsRow label="Continue session" description="Prepare an intent-only handoff to a trusted host." />
        <ExtractedSettingsRow label="Request host capability" description="Ask a paired Primary Host to review a blocked capability." />
      </ExtractedSettingsSection>
    </div>
  );
}
