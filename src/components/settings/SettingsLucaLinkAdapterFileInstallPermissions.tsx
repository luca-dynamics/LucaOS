import React from "react";
import { LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS, summarizeAdapterFileInstallPermissionReadiness, LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURES } from "../../services/lucaLink/adapterFileInstallPermissions";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";

const readiness = summarizeAdapterFileInstallPermissionReadiness(LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURES, LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS);
const decision = (requestId: string) => LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS.find((item) => item.requestId === requestId)?.status ?? "blocked";
const StatusItem: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="rounded-lg border p-3" style={{ borderColor: settingsSurfaceTokens.borderSubtle }}><dt className="text-xs opacity-70">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>;

export const SettingsLucaLinkAdapterFileInstallPermissions: React.FC<{ accentColor: string }> = ({ accentColor }) => (
  <div className="rounded-xl border p-4" style={{ borderColor: settingsSurfaceTokens.borderSubtle, borderTopColor: accentColor }}>
    <p className="text-sm font-semibold">Adapter File Write + Install Permissions</p>
    <p className="mt-1 text-xs opacity-70">Status: policy preview only</p>
    <dl className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatusItem label="File write" value="Disabled" />
      <StatusItem label="Install execution" value="Disabled" />
      <StatusItem label="Package manager" value="Disabled" />
      <StatusItem label="Shell" value="Blocked" />
      <StatusItem label="Admin / root" value="Blocked" />
      <StatusItem label="Rollback" value="Required" />
      <StatusItem label="Provenance" value="Required" />
      <StatusItem label="Hash / signature" value="Required" />
      <StatusItem label="Ready for execution" value={String(readiness.readyForExecution)} />
    </dl>
    <div className="mt-3 rounded-lg border p-3" style={{ borderColor: settingsSurfaceTokens.borderSubtle }}>
      <p className="text-xs font-semibold">Sample decisions</p>
      <dl className="mt-2 grid gap-2 text-xs md:grid-cols-2">
        <div><dt className="opacity-70">Adapter config write</dt><dd className="font-semibold">{decision("adapter-config-write")}</dd></div>
        <div><dt className="opacity-70">Sandbox temp write</dt><dd className="font-semibold">{decision("sandbox-temp-write")}</dd></div>
        <div><dt className="opacity-70">System path write</dt><dd className="font-semibold">{decision("system-path-write")}</dd></div>
        <div><dt className="opacity-70">Signed adapter manifest install</dt><dd className="font-semibold">{decision("signed-adapter-manifest")}</dd></div>
        <div><dt className="opacity-70">Remote URL install</dt><dd className="font-semibold">{decision("remote-url-install")}</dd></div>
        <div><dt className="opacity-70">Shell / admin install</dt><dd className="font-semibold">{decision("shell-required-install")} / {decision("admin-system-install")}</dd></div>
      </dl>
    </div>
    <div className="mt-3 rounded-lg border p-3 text-xs opacity-80" style={{ borderColor: settingsSurfaceTokens.borderSubtle }}>
      <p>No files are written.</p>
      <p className="mt-1">No packages are installed.</p>
      <p className="mt-1">No shell or package-manager command is executed.</p>
      <p className="mt-1">Approval does not grant execution in this PR.</p>
    </div>
  </div>
);
