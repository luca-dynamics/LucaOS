import { LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS } from "../adapterFileInstallPermissions";
import {
  createLucaLinkAdapterSandboxPlan,
  LUCA_LINK_SAFE_DISPLAY_ADAPTER_FIXTURE,
} from "../adapters";
import { LUCA_LINK_WEB_DISPLAY_SAMPLE_INTENT } from "../display";
import { LUCA_LINK_COMPANION_PHONE_SENSOR_FIXTURE } from "../sensors";
import { LUCA_LINK_TRANSPORT_PERMISSION_FIXTURE_DECISIONS } from "../transportPermissions";
import { createLucaLinkDryRunHandoffSimulation } from "./dryRunHandoffSimulator";

export const LUCA_LINK_DRY_RUN_FIXTURE_NOW = "2026-06-08T12:00:00.000Z";

const transportAllowed = LUCA_LINK_TRANSPORT_PERMISSION_FIXTURE_DECISIONS.find((item) => item.status === "allowed_preview");
const transportBlocked = LUCA_LINK_TRANSPORT_PERMISSION_FIXTURE_DECISIONS.find((item) => item.status === "blocked");
const fileReady = LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS.find((item) => item.status === "ready_for_review");
const fileBlocked = LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS.find((item) => item.status === "blocked");
const fileUnsupported = LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS.find((item) => item.status === "unsupported");

if (!transportAllowed || !transportBlocked || !fileReady || !fileBlocked || !fileUnsupported) {
  throw new Error("LucaLink governance fixtures are incomplete for dry-run simulation evidence.");
}

export const LUCA_LINK_DRY_RUN_DISPLAY_APPROVAL_FIXTURE = createLucaLinkDryRunHandoffSimulation({
  source: "fixture",
  displayIntent: LUCA_LINK_WEB_DISPLAY_SAMPLE_INTENT,
  now: LUCA_LINK_DRY_RUN_FIXTURE_NOW,
});
export const LUCA_LINK_DRY_RUN_SENSOR_READ_ONLY_FIXTURE = createLucaLinkDryRunHandoffSimulation({
  source: "fixture",
  sensorSnapshot: LUCA_LINK_COMPANION_PHONE_SENSOR_FIXTURE,
  now: LUCA_LINK_DRY_RUN_FIXTURE_NOW,
});
export const LUCA_LINK_DRY_RUN_TRANSPORT_ALLOWED_FIXTURE = createLucaLinkDryRunHandoffSimulation({
  source: "fixture",
  transportPermissionDecision: transportAllowed,
  now: LUCA_LINK_DRY_RUN_FIXTURE_NOW,
});
export const LUCA_LINK_DRY_RUN_TRANSPORT_BLOCKED_FIXTURE = createLucaLinkDryRunHandoffSimulation({
  source: "fixture",
  transportPermissionDecision: transportBlocked,
  now: LUCA_LINK_DRY_RUN_FIXTURE_NOW,
});
const adapterApprovalPlan = createLucaLinkAdapterSandboxPlan({
  manifest: LUCA_LINK_SAFE_DISPLAY_ADAPTER_FIXTURE,
  config: { enabled: true, dryRun: true },
  requestedByHostId: "primary-host-fixture",
  targetHostId: "display-host-fixture",
  hostTrustLevel: "trusted",
});

export const LUCA_LINK_DRY_RUN_ADAPTER_APPROVAL_FIXTURE = createLucaLinkDryRunHandoffSimulation({
  source: "fixture",
  adapterPlan: adapterApprovalPlan,
  now: LUCA_LINK_DRY_RUN_FIXTURE_NOW,
});
export const LUCA_LINK_DRY_RUN_FILE_READY_FIXTURE = createLucaLinkDryRunHandoffSimulation({
  source: "fixture",
  adapterFileInstallDecision: fileReady,
  now: LUCA_LINK_DRY_RUN_FIXTURE_NOW,
});
export const LUCA_LINK_DRY_RUN_FILE_BLOCKED_FIXTURE = createLucaLinkDryRunHandoffSimulation({
  source: "fixture",
  adapterFileInstallDecision: fileBlocked,
  now: LUCA_LINK_DRY_RUN_FIXTURE_NOW,
});
export const LUCA_LINK_DRY_RUN_FILE_UNSUPPORTED_FIXTURE = createLucaLinkDryRunHandoffSimulation({
  source: "fixture",
  adapterFileInstallDecision: fileUnsupported,
  now: LUCA_LINK_DRY_RUN_FIXTURE_NOW,
});

export const LUCA_LINK_DRY_RUN_HANDOFF_FIXTURES = Object.freeze([
  LUCA_LINK_DRY_RUN_DISPLAY_APPROVAL_FIXTURE,
  LUCA_LINK_DRY_RUN_SENSOR_READ_ONLY_FIXTURE,
  LUCA_LINK_DRY_RUN_TRANSPORT_ALLOWED_FIXTURE,
  LUCA_LINK_DRY_RUN_TRANSPORT_BLOCKED_FIXTURE,
  LUCA_LINK_DRY_RUN_ADAPTER_APPROVAL_FIXTURE,
  LUCA_LINK_DRY_RUN_FILE_READY_FIXTURE,
  LUCA_LINK_DRY_RUN_FILE_BLOCKED_FIXTURE,
  LUCA_LINK_DRY_RUN_FILE_UNSUPPORTED_FIXTURE,
]);
