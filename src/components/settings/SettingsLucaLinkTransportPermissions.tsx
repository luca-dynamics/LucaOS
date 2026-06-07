import React from "react";
import {
  LUCA_LINK_TRANSPORT_PERMISSION_FIXTURE_DECISIONS,
  LUCA_LINK_TRANSPORT_PERMISSION_FIXTURES,
  summarizeLucaLinkTransportPermissionReadiness,
} from "../../services/lucaLink/transportPermissions";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";

const readiness = summarizeLucaLinkTransportPermissionReadiness(
  LUCA_LINK_TRANSPORT_PERMISSION_FIXTURES,
  LUCA_LINK_TRANSPORT_PERMISSION_FIXTURE_DECISIONS,
);
const StatusItem: React.FC<{
  label: string;
  value: string;
  detail: string;
}> = ({ label, value, detail }) => (
  <div
    className="rounded-xl border p-3"
    style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
  >
    <p className="text-xs opacity-70">{label}</p>
    <p className="mt-1 text-sm font-semibold">{value}</p>
    <p className="mt-1 text-xs opacity-70">{detail}</p>
  </div>
);

const sampleDecision = (requestId: string) =>
  LUCA_LINK_TRANSPORT_PERMISSION_FIXTURE_DECISIONS.find(
    (item) => item.requestId === requestId,
  )?.status ?? "blocked";

export const SettingsLucaLinkTransportPermissions: React.FC<{
  accentColor: string;
}> = ({ accentColor }) => (
  <div
    className="rounded-xl border p-4"
    style={{
      borderColor: settingsSurfaceTokens.borderSubtle,
      borderTopColor: accentColor,
    }}
  >
    <p className="text-sm font-semibold">
      Network / Transport Permission Model
    </p>
    <p className="mt-1 text-xs opacity-70">
      Status: policy preview only. Transport permission decisions are previews
      only.
    </p>

    <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatusItem
        label="Live transport mutation"
        value="Disabled"
        detail="No runtime transport changes"
      />
      <StatusItem
        label="Ready for live send"
        value="False"
        detail="Allowed preview does not mean sent"
      />
      <StatusItem
        label="Channels covered"
        value={String(readiness.channelsCovered.length)}
        detail={readiness.channelsCovered.join(" · ")}
      />
      <StatusItem
        label="Message classes covered"
        value={String(readiness.messageClassesCovered.length)}
        detail={readiness.messageClassesCovered.join(" · ")}
      />
    </div>

    <div
      className="mt-3 rounded-lg border p-3"
      style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
    >
      <p className="text-xs font-semibold">Sample decisions</p>
      <dl className="mt-2 grid gap-2 text-xs md:grid-cols-2">
        <div>
          <dt className="opacity-70">Local host status</dt>
          <dd className="font-semibold">
            {sampleDecision("local-host-status")}
          </dd>
        </div>
        <div>
          <dt className="opacity-70">Display intent</dt>
          <dd className="font-semibold">{sampleDecision("display-intent")}</dd>
        </div>
        <div>
          <dt className="opacity-70">Sensitive payload</dt>
          <dd className="font-semibold">
            {sampleDecision("blocked-sensitive")}
          </dd>
        </div>
        <div>
          <dt className="opacity-70">Future WebRTC / VPN</dt>
          <dd className="font-semibold">
            {sampleDecision("future-webrtc")} · not sendable
          </dd>
        </div>
      </dl>
    </div>

    <div
      className="mt-3 rounded-lg border p-3 text-xs opacity-80"
      style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
    >
      <p>
        No Socket.IO, relay, LAN, WebRTC, VPN, fetch, or network send occurs.
      </p>
      <p className="mt-1">Allowed preview does not mean sent.</p>
      <p className="mt-1">
        No connect, approve, cast, or transport mutation action is exposed.
      </p>
    </div>
  </div>
);
