import { describe, expect, it, vi } from "vitest";
import {
  blockTrustedDevice,
  clearDeviceTrustAudit,
  createLucaLinkDeviceTrustRegistry,
  createTrustedDeviceRecord,
  defaultTrustLevelForRole,
  deviceCapabilitiesForTrust,
  getDeviceTrustAudit,
  inferLucaLinkDeviceRole,
  listActiveTrustedDevices,
  markTrustedDeviceConnected,
  markTrustedDeviceDisconnected,
  refreshTrustedDeviceCapabilities,
  renameTrustedDevice,
  revokeTrustedDevice,
  setTrustedDeviceTrustLevel,
  summarizeDeviceTrustRegistry,
  summarizeTrustedDevicePermissions,
  unblockTrustedDevice,
  upsertTrustedDevice,
} from "./lucaLinkDeviceTrustRegistry";

const NOW = 1_700_000_000_000;

describe("LucaLink device trust registry model", () => {
  it("creates an empty in-memory registry", () => {
    const registry = createLucaLinkDeviceTrustRegistry({ now: NOW });
    expect(registry.devices).toEqual([]);
    expect(registry.audit).toEqual([]);
    expect(registry.maxAuditRecords).toBe(100);
  });

  it("infers roles and conservative defaults for common device types", () => {
    const cases = [
      ["desktop", "execution", "paired"],
      ["laptop", "execution", "paired"],
      ["mobile phone", "companion", "paired"],
      ["guest web browser", "guest", "guest"],
      ["camera sensor iot", "sensor", "paired"],
      ["tv display projector", "display", "paired"],
      ["robot drone humanoid", "embodied", "paired"],
    ] as const;

    for (const [deviceType, role, trustLevel] of cases) {
      expect(inferLucaLinkDeviceRole({ deviceType })).toBe(role);
      expect(defaultTrustLevelForRole(role)).toBe(trustLevel);
      const record = createTrustedDeviceRecord({ deviceId: deviceType, deviceType }, { now: NOW });
      expect(record.role).toBe(role);
      expect(record.trustLevel).toBe(trustLevel);
      expect(record.permissionSummary.physicalWorld).toBe(false);
    }
  });

  it("does not default any device to owner except explicit current Primary Host", () => {
    const desktop = createTrustedDeviceRecord({ deviceId: "desktop", deviceType: "desktop" }, { now: NOW });
    expect(desktop.trustLevel).toBe("paired");

    const primary = createTrustedDeviceRecord(
      { deviceId: "local", deviceType: "desktop", isCurrentPrimaryHost: true },
      { now: NOW },
    );
    expect(primary.role).toBe("primary-host");
    expect(primary.trustLevel).toBe("owner");
  });

  it("summarizes permissions conservatively", () => {
    const guest = createTrustedDeviceRecord({ deviceId: "guest", deviceType: "guest web" }, { now: NOW });
    expect(summarizeTrustedDevicePermissions(guest)).toMatchObject({
      conversation: true,
      notification: false,
      memory: false,
      shell: false,
      payment: false,
      physicalWorld: false,
    });

    const paired = createTrustedDeviceRecord({ deviceId: "phone", deviceType: "mobile" }, { now: NOW });
    expect(summarizeTrustedDevicePermissions(paired)).toMatchObject({
      conversation: true,
      notification: true,
      memory: false,
      files: false,
      code: false,
      browser: false,
      shell: false,
    });
  });
});

describe("LucaLink device trust mutations", () => {
  it("renames by trimming and capping, and rejects empty names", () => {
    const registry = createLucaLinkDeviceTrustRegistry({ now: NOW });
    upsertTrustedDevice(registry, { deviceId: "desktop", deviceType: "desktop" }, { now: NOW });

    const renamed = renameTrustedDevice(registry, "desktop", `  ${"A".repeat(80)}  `, { now: NOW + 1 });
    expect(renamed.valid).toBe(true);
    expect(renamed.device?.displayName).toHaveLength(64);
    expect(renamed.warnings.join(" ")).toContain("capped");

    const empty = renameTrustedDevice(registry, "desktop", "   ", { now: NOW + 2 });
    expect(empty.valid).toBe(false);
    expect(empty.errors.join(" ")).toContain("empty");
  });

  it("returns structured errors for unknown device mutations", () => {
    const registry = createLucaLinkDeviceTrustRegistry({ now: NOW });
    const result = revokeTrustedDevice(registry, "missing", { now: NOW });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Unknown LucaLink device");
    expect(result.audit?.mutation).toBe("revoke");
  });

  it("changes valid trust levels but protects guest, owner, sensor, and embodied boundaries", () => {
    const registry = createLucaLinkDeviceTrustRegistry({ now: NOW });
    upsertTrustedDevice(registry, { deviceId: "desktop", deviceType: "desktop" }, { now: NOW });
    upsertTrustedDevice(registry, { deviceId: "guest", deviceType: "guest web" }, { now: NOW });
    upsertTrustedDevice(registry, { deviceId: "sensor", deviceType: "camera sensor" }, { now: NOW });
    upsertTrustedDevice(registry, { deviceId: "robot", deviceType: "robot" }, { now: NOW });

    expect(setTrustedDeviceTrustLevel(registry, "desktop", "trusted", { now: NOW + 1 }).valid).toBe(true);
    expect(setTrustedDeviceTrustLevel(registry, "desktop", "admin", { now: NOW + 2 }).valid).toBe(true);
    expect(setTrustedDeviceTrustLevel(registry, "guest", "admin", { now: NOW + 3 }).valid).toBe(false);
    expect(setTrustedDeviceTrustLevel(registry, "guest", "owner", { now: NOW + 4 }).valid).toBe(false);
    expect(setTrustedDeviceTrustLevel(registry, "sensor", "owner", { now: NOW + 5 }).valid).toBe(false);
    expect(setTrustedDeviceTrustLevel(registry, "robot", "owner", { now: NOW + 6 }).valid).toBe(false);
    expect(setTrustedDeviceTrustLevel(registry, "desktop", "owner", { now: NOW + 7 }).valid).toBe(false);
  });

  it("keeps admin from bypassing sensitive runtime permissions", () => {
    const registry = createLucaLinkDeviceTrustRegistry({ now: NOW });
    upsertTrustedDevice(
      registry,
      { deviceId: "desktop", deviceType: "desktop", capabilities: ["shell.execute", "files.write", "code.modify", "browser.control", "payment.spend", "robotics.motion"] },
      { now: NOW },
    );
    const admin = setTrustedDeviceTrustLevel(registry, "desktop", "admin", { now: NOW + 1 });
    expect(admin.valid).toBe(true);
    expect(admin.device?.permissionSummary).toMatchObject({
      shell: true,
      files: true,
      code: true,
      browser: true,
      payment: false,
      physicalWorld: false,
    });
    expect(admin.warnings.join(" ")).toContain("does not bypass Primary Host approvals");
  });

  it("revoke and block mark local status and clear sensitive capabilities", () => {
    const registry = createLucaLinkDeviceTrustRegistry({ now: NOW });
    upsertTrustedDevice(registry, { deviceId: "desktop", deviceType: "desktop", capabilities: ["chat.send", "shell.execute", "files.write"] }, { now: NOW });
    const revoked = revokeTrustedDevice(registry, "desktop", { now: NOW + 1 });
    expect(revoked.device?.status).toBe("revoked");
    expect(revoked.device?.capabilities).toEqual(["chat.send"]);
    expect(revoked.warnings.join(" ")).toContain("Local only");

    upsertTrustedDevice(registry, { deviceId: "phone", deviceType: "mobile", capabilities: ["chat.send", "browser.control"] }, { now: NOW });
    const blocked = blockTrustedDevice(registry, "phone", { now: NOW + 2 });
    expect(blocked.device?.status).toBe("blocked");
    expect(blocked.device?.capabilities).toEqual(["chat.send"]);
  });

  it("unblock does not auto-trust", () => {
    const registry = createLucaLinkDeviceTrustRegistry({ now: NOW });
    upsertTrustedDevice(registry, { deviceId: "phone", deviceType: "mobile", lastSeenAt: NOW }, { now: NOW });
    blockTrustedDevice(registry, "phone", { now: NOW + 1 });
    const unblocked = unblockTrustedDevice(registry, "phone", { now: NOW + 2 });
    expect(unblocked.device?.status).toBe("disconnected");
    expect(unblocked.device?.trustLevel).toBe("paired");
  });

  it("marks connected and disconnected with last seen state", () => {
    const registry = createLucaLinkDeviceTrustRegistry({ now: NOW });
    upsertTrustedDevice(registry, { deviceId: "phone", deviceType: "mobile" }, { now: NOW });
    const connected = markTrustedDeviceConnected(registry, "phone", { now: NOW + 1 });
    expect(connected.device?.status).toBe("connected");
    expect(connected.device?.lastSeenAt).toBe(NOW + 1);
    const disconnected = markTrustedDeviceDisconnected(registry, "phone", { now: NOW + 2 });
    expect(disconnected.device?.status).toBe("disconnected");
  });

  it("refreshes capabilities conservatively", () => {
    const registry = createLucaLinkDeviceTrustRegistry({ now: NOW });
    upsertTrustedDevice(registry, { deviceId: "desktop", deviceType: "desktop" }, { now: NOW });
    setTrustedDeviceTrustLevel(registry, "desktop", "trusted", { now: NOW + 1 });
    const refreshed = refreshTrustedDeviceCapabilities(registry, "desktop", ["memory.read", "shell.execute"], { now: NOW + 2 });
    expect(refreshed.device?.capabilities).toEqual(["memory.read", "shell.execute"]);
    expect(refreshed.device?.permissionSummary.memory).toBe(true);
    expect(refreshed.device?.permissionSummary.shell).toBe(false);
    expect(deviceCapabilitiesForTrust(refreshed.device!)).not.toContain("shell.request");
  });

  it("creates and caps audit records", () => {
    const registry = createLucaLinkDeviceTrustRegistry({ maxAuditRecords: 100 });
    upsertTrustedDevice(registry, { deviceId: "desktop", deviceType: "desktop" }, { now: NOW });
    for (let i = 0; i < 105; i += 1) {
      renameTrustedDevice(registry, "desktop", `Desktop ${i}`, { now: NOW + i });
    }
    expect(getDeviceTrustAudit(registry)).toHaveLength(100);
    expect(summarizeDeviceTrustRegistry(registry).auditCount).toBe(100);
    clearDeviceTrustAudit(registry);
    expect(getDeviceTrustAudit(registry)).toHaveLength(0);
  });

  it("lists active devices separately from blocked and revoked devices", () => {
    const registry = createLucaLinkDeviceTrustRegistry({ now: NOW });
    upsertTrustedDevice(registry, { deviceId: "one", deviceType: "desktop" }, { now: NOW });
    upsertTrustedDevice(registry, { deviceId: "two", deviceType: "mobile" }, { now: NOW });
    revokeTrustedDevice(registry, "two", { now: NOW + 1 });
    expect(listActiveTrustedDevices(registry).map((device) => device.deviceId)).toEqual(["one"]);
  });
});

describe("LucaLink device trust safety boundaries", () => {
  it("does not emit reserved terminology in registry outputs", () => {
    const registry = createLucaLinkDeviceTrustRegistry({ now: NOW });
    upsertTrustedDevice(registry, { deviceId: "guest", deviceType: "guest web" }, { now: NOW });
    const text = JSON.stringify(registry);
    expect(text).not.toMatch(/Origin/);
    expect(JSON.stringify(createTrustedDeviceRecord({ deviceId: "local", deviceType: "desktop", isCurrentPrimaryHost: true }, { now: NOW }))).toContain("primary-host");
  });

  it("has no import-time browser/network/socket side effects", async () => {
    const localStorageSpy = vi.fn();
    const sessionStorageSpy = vi.fn();
    const fetchSpy = vi.fn();
    vi.stubGlobal("localStorage", { getItem: localStorageSpy, setItem: localStorageSpy });
    vi.stubGlobal("sessionStorage", { getItem: sessionStorageSpy, setItem: sessionStorageSpy });
    vi.stubGlobal("fetch", fetchSpy);

    await import(`./lucaLinkDeviceTrustRegistry?side-effect-check=${Date.now()}`);

    expect(localStorageSpy).not.toHaveBeenCalled();
    expect(sessionStorageSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
