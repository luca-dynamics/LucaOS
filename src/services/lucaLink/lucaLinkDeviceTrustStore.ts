/**
 * Manager-owned LucaLink device trust state.
 *
 * Device trust policy remains pure; this store owns the mutable registry so the
 * relay adapter can coordinate runtime events without reaching into registry
 * internals.
 */
import {
  blockTrustedDevice,
  clearDeviceTrustAudit,
  createLucaLinkDeviceTrustRegistry,
  getDeviceTrustAudit,
  getTrustedDevice,
  listActiveTrustedDevices,
  listTrustedDevices,
  markTrustedDeviceConnected,
  markTrustedDeviceDisconnected,
  renameTrustedDevice,
  revokeTrustedDevice,
  setTrustedDeviceTrustLevel,
  summarizeDeviceTrustRegistry,
  unblockTrustedDevice,
  upsertTrustedDevice,
  type LucaLinkDeviceTrustAuditRecord,
  type LucaLinkDeviceTrustLevel,
  type LucaLinkDeviceTrustMutationOptions,
  type LucaLinkDeviceTrustMutationResult,
  type LucaLinkDeviceTrustRegistrySummary,
  type LucaLinkDeviceTrustStatus,
  type LucaLinkTrustedDeviceInput,
  type LucaLinkTrustedDeviceRecord,
} from "./lucaLinkDeviceTrustRegistry";

export class LucaLinkDeviceTrustStore {
  private readonly state = createLucaLinkDeviceTrustRegistry();

  list(): LucaLinkTrustedDeviceRecord[] {
    return listTrustedDevices(this.state);
  }

  listActive(): LucaLinkTrustedDeviceRecord[] {
    return listActiveTrustedDevices(this.state);
  }

  get(deviceId: string): LucaLinkTrustedDeviceRecord | undefined {
    return getTrustedDevice(this.state, deviceId);
  }

  summarize(): LucaLinkDeviceTrustRegistrySummary {
    return summarizeDeviceTrustRegistry(this.state);
  }

  getAudit(): LucaLinkDeviceTrustAuditRecord[] {
    return getDeviceTrustAudit(this.state);
  }

  clearAudit(): void {
    clearDeviceTrustAudit(this.state);
  }

  rename(
    deviceId: string,
    displayName: string,
    options?: LucaLinkDeviceTrustMutationOptions,
  ): LucaLinkDeviceTrustMutationResult {
    return renameTrustedDevice(this.state, deviceId, displayName, options);
  }

  setTrustLevel(
    deviceId: string,
    trustLevel: LucaLinkDeviceTrustLevel,
    options?: LucaLinkDeviceTrustMutationOptions,
  ): LucaLinkDeviceTrustMutationResult {
    return setTrustedDeviceTrustLevel(
      this.state,
      deviceId,
      trustLevel,
      options,
    );
  }

  revoke(
    deviceId: string,
    options?: LucaLinkDeviceTrustMutationOptions,
  ): LucaLinkDeviceTrustMutationResult {
    return revokeTrustedDevice(this.state, deviceId, options);
  }

  block(
    deviceId: string,
    options?: LucaLinkDeviceTrustMutationOptions,
  ): LucaLinkDeviceTrustMutationResult {
    return blockTrustedDevice(this.state, deviceId, options);
  }

  unblock(
    deviceId: string,
    options?: LucaLinkDeviceTrustMutationOptions,
  ): LucaLinkDeviceTrustMutationResult {
    return unblockTrustedDevice(this.state, deviceId, options);
  }

  upsert(
    input: LucaLinkTrustedDeviceInput,
    options?: LucaLinkDeviceTrustMutationOptions,
  ): LucaLinkTrustedDeviceRecord {
    return upsertTrustedDevice(this.state, input, options);
  }

  markConnected(
    deviceId: string,
    options?: LucaLinkDeviceTrustMutationOptions,
  ): LucaLinkDeviceTrustMutationResult {
    return markTrustedDeviceConnected(this.state, deviceId, options);
  }

  markDisconnected(
    deviceId: string,
    options?: LucaLinkDeviceTrustMutationOptions,
  ): LucaLinkDeviceTrustMutationResult {
    return markTrustedDeviceDisconnected(this.state, deviceId, options);
  }

  upsertRuntimeDevice(
    device: {
      deviceId: string;
      name: string;
      type: string;
      lastSeen: number;
    },
    options: {
      isCurrentPrimaryHost?: boolean;
      status?: LucaLinkDeviceTrustStatus;
    } = {},
  ): void {
    const status = options.status ?? "connected";
    const record = this.upsert({
      deviceId: device.deviceId,
      displayName: device.name,
      deviceType: device.type,
      lastSeenAt: device.lastSeen,
      status,
      isCurrentPrimaryHost: options.isCurrentPrimaryHost,
    });
    if (
      status === "connected" &&
      record.status !== "revoked" &&
      record.status !== "blocked"
    ) {
      this.markConnected(device.deviceId, {
        now: device.lastSeen || Date.now(),
      });
    }
  }

  syncConnectedRuntimeDevices(
    devices: Array<{
      deviceId: string;
      name: string;
      type: string;
      lastSeen: number;
    }>,
    currentPrimaryHostDeviceId?: string | null,
  ): void {
    const connectedIds = new Set(devices.map((device) => device.deviceId));
    devices.forEach((device) => {
      this.upsertRuntimeDevice(device, {
        isCurrentPrimaryHost: device.deviceId === currentPrimaryHostDeviceId,
        status: "connected",
      });
    });
    this.list().forEach((device) => {
      if (device.status === "connected" && !connectedIds.has(device.deviceId)) {
        this.markDisconnected(device.deviceId);
      }
    });
  }
}

export const lucaLinkDeviceTrustStore = new LucaLinkDeviceTrustStore();
