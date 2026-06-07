import { summarizeLucaLinkSensorBridgeReadiness } from "./sensorReadiness";
import {
  createLucaLinkReadOnlySensorSnapshot,
  validateLucaLinkReadOnlySensorSnapshot,
} from "./sensorSnapshot";

const CAPTURED_AT = "2026-06-07T12:00:00.000Z";
const EXPIRES_AT = "2099-06-07T12:00:00.000Z";

export const LUCA_LINK_COMPANION_PHONE_SENSOR_FIXTURE =
  validateLucaLinkReadOnlySensorSnapshot(
    createLucaLinkReadOnlySensorSnapshot({
      snapshotId: "sensor-fixture-companion-phone",
      hostId: "companion-phone-host",
      deviceId: "companion-phone-sample",
      capturedAt: CAPTURED_AT,
      expiresAt: EXPIRES_AT,
      sensorKinds: [
        "battery_status",
        "network_status",
        "screen_status",
        "capability_status",
      ],
      values: {
        batteryBand: "healthy",
        networkState: "available",
        screenClass: "compact-touch",
        orientationSupport: ["portrait", "landscape"],
      },
      capabilitySummary: [
        "Read-only status summary available",
        "Companion display available",
      ],
      permissionSummary: ["No sensitive permissions requested"],
    }),
  );

export const LUCA_LINK_DESKTOP_SENSOR_FIXTURE =
  validateLucaLinkReadOnlySensorSnapshot(
    createLucaLinkReadOnlySensorSnapshot({
      snapshotId: "sensor-fixture-desktop",
      hostId: "desktop-primary-host",
      deviceId: "desktop-sample",
      capturedAt: CAPTURED_AT,
      expiresAt: EXPIRES_AT,
      sensorKinds: [
        "device_class",
        "os_metadata",
        "browser_metadata",
        "capability_status",
        "host_health",
      ],
      values: {
        deviceClass: "desktop",
        osFamily: "desktop-os",
        browserClass: "modern-browser",
        hostHealth: "ready",
      },
      capabilitySummary: [
        "Display preview supported",
        "Status model available",
      ],
      permissionSummary: ["No runtime permission prompt needed for fixture"],
    }),
  );

export const LUCA_LINK_DISPLAY_HOST_SENSOR_FIXTURE =
  validateLucaLinkReadOnlySensorSnapshot(
    createLucaLinkReadOnlySensorSnapshot({
      snapshotId: "sensor-fixture-display",
      hostId: "display-preview-host",
      deviceId: "display-sample",
      capturedAt: CAPTURED_AT,
      expiresAt: EXPIRES_AT,
      sensorKinds: ["screen_status", "permission_readiness"],
      values: {
        screenClass: "large-display",
        viewportBand: "wide",
        presentationReadiness: "approval-required",
      },
      capabilitySummary: ["Read-only presentation preview available"],
      permissionSummary: ["Host approval required for future presentation"],
    }),
  );

export const LUCA_LINK_BLOCKED_SENSOR_FIXTURE =
  validateLucaLinkReadOnlySensorSnapshot(
    createLucaLinkReadOnlySensorSnapshot({
      snapshotId: "sensor-fixture-blocked-sensitive-request",
      hostId: "blocked-sensor-host",
      capturedAt: CAPTURED_AT,
      expiresAt: EXPIRES_AT,
      sensorKinds: ["camera_frame", "microphone_audio", "precise_location"],
      values: { requestDisposition: "blocked-before-collection" },
      capabilitySummary: ["Sensitive collection unavailable"],
      permissionSummary: ["No permission prompts are permitted"],
    }),
  );

export const LUCA_LINK_EXPIRED_SENSOR_FIXTURE =
  validateLucaLinkReadOnlySensorSnapshot(
    createLucaLinkReadOnlySensorSnapshot({
      snapshotId: "sensor-fixture-expired",
      hostId: "expired-host",
      capturedAt: "2025-01-01T00:00:00.000Z",
      expiresAt: "2025-01-01T00:05:00.000Z",
      sensorKinds: ["host_health"],
      values: { hostHealth: "historical-summary" },
      capabilitySummary: ["Historical fixture only"],
      permissionSummary: ["No permissions requested"],
    }),
    { now: CAPTURED_AT },
  );

export const LUCA_LINK_SENSOR_BRIDGE_FIXTURES = Object.freeze([
  LUCA_LINK_COMPANION_PHONE_SENSOR_FIXTURE,
  LUCA_LINK_DESKTOP_SENSOR_FIXTURE,
  LUCA_LINK_DISPLAY_HOST_SENSOR_FIXTURE,
  LUCA_LINK_BLOCKED_SENSOR_FIXTURE,
  LUCA_LINK_EXPIRED_SENSOR_FIXTURE,
]);

export const LUCA_LINK_SENSOR_BRIDGE_READINESS_FIXTURE =
  summarizeLucaLinkSensorBridgeReadiness(LUCA_LINK_SENSOR_BRIDGE_FIXTURES);
