import { useEffect, useState } from "react";
import { lucaLinkManager } from "../services/lucaLink/manager";
import type { Device } from "../services/lucaLink/types";
import {
  buildLucaLinkContinuitySnapshot,
  mapContinuityHostsToBodyDevices,
} from "../services/lucaLink/lucaLinkContinuityBridge";

/**
 * Live view of LucaLink-paired devices for the shell (Body card and friends).
 *
 * Continuity path: prefer the unified mesh+trust continuity snapshot so shell
 * identity matches Settings. Falls back to the legacy deviceRegistry list when
 * the console surface is unavailable. Display-only.
 */

export interface LucaLinkBodyDevice {
  id: string;
  name: string;
  type: string;
  status: string;
}

/** Pure mapper: legacy LucaLink Device -> the Body card's display shape. */
export function mapLucaLinkDevicesToBody(
  devices: Device[],
): LucaLinkBodyDevice[] {
  return devices.map((device) => {
    const battery =
      typeof device.metadata?.battery === "number"
        ? ` · ${Math.round(device.metadata.battery)}%`
        : "";
    return {
      id: `lucalink-${device.id}`,
      name: device.name,
      type: `${device.type} · ${device.platform}${battery}`,
      status: device.status === "online" ? "active" : device.status,
    };
  });
}

function readDevicesFromContinuity(): LucaLinkBodyDevice[] | null {
  try {
    const state = lucaLinkManager.console.getState();
    const trustedDevices = lucaLinkManager.console.getTrustedDevices();
    const snapshot = buildLucaLinkContinuitySnapshot({
      state: {
        connected: state.connected,
        deviceId: state.deviceId,
        connectedDevices: state.connectedDevices,
        error: state.error,
      },
      trustedDevices,
      deviceTrustSummary: lucaLinkManager.console.getDeviceTrustSummary(),
      continuationSummary:
        lucaLinkManager.console.getContinuationRegistrySummary(),
      handoffSummary: lucaLinkManager.console.getHandoffSummary(),
      softEnforcementMode: lucaLinkManager.console.getSoftEnforcementMode(),
    });
    if (!snapshot.hasLiveIdentity) return null;
    return mapContinuityHostsToBodyDevices(snapshot.linkedHosts);
  } catch {
    return null;
  }
}

function readDevices(): LucaLinkBodyDevice[] {
  const continuity = readDevicesFromContinuity();
  if (continuity && continuity.length > 0) return continuity;
  try {
    return mapLucaLinkDevicesToBody(lucaLinkManager.getDevices());
  } catch {
    // Manager not initialized yet (no pairing session this boot) — no body
    // parts to report, and that's the honest answer.
    return [];
  }
}

export function useLucaLinkDevices(): LucaLinkBodyDevice[] {
  const [devices, setDevices] = useState<LucaLinkBodyDevice[]>(readDevices);

  useEffect(() => {
    const refresh = () => setDevices(readDevices());
    let unsubscribeState: (() => void) | undefined;
    try {
      lucaLinkManager.on("device:added", refresh);
      lucaLinkManager.on("device:removed", refresh);
      lucaLinkManager.on("device:updated", refresh);
      lucaLinkManager.on("connected", refresh);
      lucaLinkManager.on("disconnected", refresh);
      unsubscribeState = lucaLinkManager.console.onStateChange(refresh);
    } catch {
      return;
    }
    return () => {
      try {
        lucaLinkManager.off("device:added", refresh);
        lucaLinkManager.off("device:removed", refresh);
        lucaLinkManager.off("device:updated", refresh);
        lucaLinkManager.off("connected", refresh);
        lucaLinkManager.off("disconnected", refresh);
        unsubscribeState?.();
      } catch {
        /* manager torn down — nothing to detach */
      }
    };
  }, []);

  return devices;
}
