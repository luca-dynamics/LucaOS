import { useEffect, useState } from "react";
import { lucaLinkManager } from "../services/lucaLink/manager";
import type { Device } from "../services/lucaLink/types";

/**
 * Live view of LucaLink-paired devices for the shell (Body card and friends).
 *
 * This is the first real wiring of lucaLinkManager state into the dashboard:
 * previously the "devices" the shell showed were IoT-provider devices only,
 * and LucaLink's connectedDevices never reached any UI outside the pairing
 * modal. Display-only; pairing/unpairing stays in the modal.
 */

export interface LucaLinkBodyDevice {
  id: string;
  name: string;
  type: string;
  status: string;
}

/** Pure mapper: LucaLink Device -> the Body card's display shape. */
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

function readDevices(): LucaLinkBodyDevice[] {
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
    try {
      lucaLinkManager.on("device:added", refresh);
      lucaLinkManager.on("device:removed", refresh);
      lucaLinkManager.on("device:updated", refresh);
      lucaLinkManager.on("connected", refresh);
      lucaLinkManager.on("disconnected", refresh);
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
      } catch {
        /* manager torn down — nothing to detach */
      }
    };
  }, []);

  return devices;
}
