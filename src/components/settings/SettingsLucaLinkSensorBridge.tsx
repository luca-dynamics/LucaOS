import React from "react";
import {
  LUCA_LINK_COMPANION_PHONE_SENSOR_FIXTURE,
  LUCA_LINK_SENSOR_BRIDGE_READINESS_FIXTURE,
  createCapabilityStatusSummary,
  createPermissionReadinessSummary,
} from "../../services/lucaLink/sensors";
import { SettingsCard, SettingsStatList } from "./SettingsLayout";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";

export interface SettingsLucaLinkSensorBridgeProps {
  accentColor: string;
}

export const SettingsLucaLinkSensorBridge: React.FC<
  SettingsLucaLinkSensorBridgeProps
> = ({ accentColor }) => {
  const readiness = LUCA_LINK_SENSOR_BRIDGE_READINESS_FIXTURE;
  const sample = LUCA_LINK_COMPANION_PHONE_SENSOR_FIXTURE;

  return (
    <SettingsCard>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Read-only Sensor Bridge MVP</p>
          <p className="mt-1 text-xs opacity-70">
            Harmless host and device readiness metadata modeled from static,
            side-effect-free fixtures.
          </p>
        </div>
        <span
          className="rounded-full border px-2 py-1 text-[11px] font-semibold"
          style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
        >
          Model-only / read-only
        </span>
      </div>

      <SettingsStatList
        className="mt-3"
        items={[
          {
            label: "Status",
            value: "Model-only / read-only",
            detail: `${readiness.readySnapshots} ready snapshot(s)`,
          },
          {
            label: "Live collection",
            value: "Disabled",
            detail: "Readiness preview only",
          },
          {
            label: "Sample host / device",
            value: sample.hostId,
            detail: sample.deviceId ?? "Host summary only",
          },
          {
            label: "Side effects",
            value: readiness.sideEffectsPerformed ? "Yes" : "None",
            detail: "Static fixtures only",
          },
        ]}
      />

      <div
        className="mt-3 rounded-lg border p-3"
        style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
      >
        <p className="text-xs font-semibold">Allowed sensor kinds</p>
        <p className="mt-1 text-xs opacity-70">
          {readiness.allowedSensorKinds.join(" · ") || "none"}
        </p>
        <p className="mt-3 text-xs font-semibold">Blocked sensor kinds</p>
        <p className="mt-1 text-xs opacity-70">
          {readiness.blockedSensorKinds.join(" · ") || "none in ready samples"}
        </p>
        <p className="mt-3 text-xs font-semibold">Sample capability summary</p>
        <p className="mt-1 text-xs opacity-70">
          {createCapabilityStatusSummary(sample)}
        </p>
        <p className="mt-3 text-xs font-semibold">
          Sample permission readiness
        </p>
        <p className="mt-1 text-xs opacity-70">
          {createPermissionReadinessSummary(sample)}
        </p>
      </div>

      <div
        className="mt-3 rounded-lg border p-3 text-xs opacity-80"
        style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
      >
        <p>
          No camera, microphone, precise location, biometrics, contacts, files,
          clipboard, credentials, or background surveillance.
        </p>
        <p className="mt-1">
          Readiness does not enable live sensor collection.
        </p>
        <p className="mt-1">
          No transport send or device control is performed.
        </p>
      </div>
    </SettingsCard>
  );
};
