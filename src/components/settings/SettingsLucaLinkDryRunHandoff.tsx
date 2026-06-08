import React from "react";
import {
  LUCA_LINK_DRY_RUN_DISPLAY_APPROVAL_FIXTURE,
  LUCA_LINK_DRY_RUN_FILE_BLOCKED_FIXTURE,
  LUCA_LINK_DRY_RUN_HANDOFF_FIXTURES,
  LUCA_LINK_DRY_RUN_TRANSPORT_ALLOWED_FIXTURE,
  LUCA_LINK_DRY_RUN_TRANSPORT_BLOCKED_FIXTURE,
  summarizeLucaLinkDryRunHandoffReadiness,
} from "../../services/lucaLink/dryRunHandoff";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";

const readiness = summarizeLucaLinkDryRunHandoffReadiness(LUCA_LINK_DRY_RUN_HANDOFF_FIXTURES);
const flags = [
  ["Handoff enabled", readiness.handoffEnabled],
  ["Transport send", readiness.transportSendEnabled],
  ["Adapter execution", readiness.adapterExecutionEnabled],
  ["Display open/cast", readiness.displayOpenEnabled],
  ["Sensor collection", readiness.sensorCollectionEnabled],
  ["File write", readiness.fileWriteEnabled],
  ["Install", readiness.installEnabled],
] as const;
const samples = [
  ["Display intent", LUCA_LINK_DRY_RUN_DISPLAY_APPROVAL_FIXTURE.status],
  ["Transport allowed preview", LUCA_LINK_DRY_RUN_TRANSPORT_ALLOWED_FIXTURE.status],
  ["Sensitive transport", LUCA_LINK_DRY_RUN_TRANSPORT_BLOCKED_FIXTURE.status],
  ["Adapter file/install", LUCA_LINK_DRY_RUN_FILE_BLOCKED_FIXTURE.status],
] as const;

export const SettingsLucaLinkDryRunHandoff: React.FC<{ accentColor: string }> = ({ accentColor }) => (
  <section
    className="rounded-xl border p-4"
    style={{ borderColor: settingsSurfaceTokens.borderSubtle, borderTopColor: accentColor }}
    aria-labelledby="lucalink-dry-run-handoff-title"
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 id="lucalink-dry-run-handoff-title" className="text-sm font-semibold">Dry-run Handoff Simulation</h3>
        <p className="mt-1 text-xs opacity-70">Dry-run only — no LucaLink handoff is performed.</p>
      </div>
      <span className="rounded-full border px-2 py-1 text-[11px] font-semibold" style={{ borderColor: settingsSurfaceTokens.borderSubtle }}>
        Dry-run only
      </span>
    </div>

    <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
      {flags.map(([label, enabled]) => (
        <div key={label} className="rounded-lg border p-2" style={{ borderColor: settingsSurfaceTokens.borderSubtle }}>
          <p className="text-[11px] opacity-70">{label}</p>
          <p className="mt-1 text-xs font-semibold">{enabled ? "Enabled" : label === "Handoff enabled" ? "False" : "Disabled"}</p>
        </div>
      ))}
    </div>

    <div className="mt-3 rounded-lg border p-3" style={{ borderColor: settingsSurfaceTokens.borderSubtle }}>
      <p className="text-xs font-semibold">Sample simulations</p>
      <ul className="mt-2 space-y-1 text-xs opacity-80">
        {samples.map(([label, status]) => <li key={label}>{label}: <span className="font-semibold">{status}</span></li>)}
      </ul>
    </div>

    <div className="mt-3 space-y-1 text-xs opacity-70">
      <p>No transport message is sent.</p>
      <p>No adapter, display, sensor, file, or install action is executed.</p>
    </div>
  </section>
);
