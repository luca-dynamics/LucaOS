import React from "react";
import {
  LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES,
  summarizeLucaLinkRuntimeAuthority,
} from "../../services/lucaLink/runtimeAuthority";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";

const readiness = summarizeLucaLinkRuntimeAuthority(LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES);
const counts = [
  ["Permanently blocked", readiness.permanentlyBlocked],
  ["Review only", readiness.reviewOnly],
  ["Dry-run only", readiness.dryRunOnly],
  ["Future bounded handoff candidates", readiness.futureBoundedHandoffCandidates],
  ["Unsupported", readiness.unsupported],
] as const;
const runtimeFlags = [
  ["Authority granted", readiness.authorityGranted],
  ["Handoff enabled", readiness.handoffEnabled],
  ["Transport send enabled", readiness.transportSendEnabled],
  ["Adapter execution enabled", readiness.adapterExecutionEnabled],
  ["Display open enabled", readiness.displayOpenEnabled],
  ["Sensor collection enabled", readiness.sensorCollectionEnabled],
  ["File write enabled", readiness.fileWriteEnabled],
  ["Install enabled", readiness.installEnabled],
] as const;

export const SettingsLucaLinkRuntimeAuthority: React.FC<{ accentColor: string }> = ({ accentColor }) => (
  <section
    className="rounded-xl border p-4"
    style={{ borderColor: settingsSurfaceTokens.borderSubtle, borderTopColor: accentColor }}
    aria-labelledby="lucalink-runtime-authority-title"
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 id="lucalink-runtime-authority-title" className="text-sm font-semibold">Runtime Authority Boundary</h3>
        <p className="mt-1 text-xs opacity-70">Runtime authority is not granted.</p>
      </div>
      <span className="rounded-full border px-2 py-1 text-[11px] font-semibold" style={{ borderColor: settingsSurfaceTokens.borderSubtle }}>
        Authority disabled
      </span>
    </div>

    <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
      {counts.map(([label, count]) => (
        <div key={label} className="rounded-lg border p-2" style={{ borderColor: settingsSurfaceTokens.borderSubtle }}>
          <p className="text-[11px] opacity-70">{label}</p>
          <p className="mt-1 text-sm font-semibold">{count}</p>
        </div>
      ))}
    </div>

    <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
      {runtimeFlags.map(([label, enabled]) => (
        <div key={label} className="rounded-lg border p-2" style={{ borderColor: settingsSurfaceTokens.borderSubtle }}>
          <p className="text-[11px] opacity-70">{label}</p>
          <p className="mt-1 text-xs font-semibold">{enabled ? "True" : "False"}</p>
        </div>
      ))}
    </div>

    <div className="mt-3 space-y-1 text-xs opacity-70">
      <p>Future bounded handoff candidate does not mean sendable.</p>
      <p>Dry-run success does not authorize handoff.</p>
      <p>No transport, adapter, display, sensor, file, install, or host mutation is performed.</p>
    </div>
  </section>
);
