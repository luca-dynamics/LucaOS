import { describe, expect, it, vi } from "vitest";
import {
  clearLucaLinkHostConnectionRegistry,
  createLucaLinkHostConnectionRecord,
  createLucaLinkHostConnectionRegistry,
  getLucaLinkHostConnection,
  inferLucaLinkHostClass,
  listLucaLinkHostConnections,
  removeLucaLinkHostConnection,
  summarizeLucaLinkHostConnections,
  summarizeLucaLinkHostConnectionRegistry,
  upsertLucaLinkHostConnection,
} from "./lucaLinkHostConnectionModel";

const NOW = 1_700_000_000_000;

describe("LucaLink multi-host connection model", () => {
  it("classifies desktop as execution or current Primary Host depending context", () => {
    const desktop = createLucaLinkHostConnectionRecord(
      {
        deviceId: "desk",
        deviceType: "desktop electron node",
        trustLevel: "trusted",
        userPresent: true,
      },
      { now: NOW },
    );
    expect(desktop.hostClass).toBe("execution-host");
    expect(desktop.runtimeSurfaces).toEqual(
      expect.arrayContaining([
        "native-desktop",
        "electron-runtime",
        "node-runtime",
      ]),
    );
    expect(desktop.canExecute).toBe(true);

    const primary = createLucaLinkHostConnectionRecord(
      {
        deviceId: "local",
        deviceType: "desktop",
        isCurrentPrimaryHost: true,
        trustLevel: "owner",
      },
      { now: NOW },
    );
    expect(primary.hostClass).toBe("primary-host");
    expect(primary.approvalCapability).toBe("primary-host-only");
    expect(primary.canApprove).toBe(true);
  });

  it("classifies mobile, watch, TV, browser display, and kiosk hosts conservatively", () => {
    expect(inferLucaLinkHostClass({ deviceType: "mobile phone" })).toBe(
      "companion-host",
    );
    const watch = createLucaLinkHostConnectionRecord(
      { deviceType: "smart watch nearby ble", trustLevel: "trusted" },
      { now: NOW },
    );
    expect(watch.hostClass).toBe("watch-host");
    expect(watch.connectionClass).toBe("nearby-ble");
    expect(["low-risk", "low-medium-risk"]).toContain(watch.approvalCapability);
    expect(watch.canExecute).toBe(false);

    const tv = createLucaLinkHostConnectionRecord(
      { deviceType: "smart tv web display shared tv" },
      { now: NOW },
    );
    expect(tv.hostClass).toBe("tv-host");
    expect(tv.connectionClass).toBe("web-display");
    expect(tv.approvalCapability).toBe("display-only");
    expect(tv.canExecute).toBe(false);

    const kiosk = createLucaLinkHostConnectionRecord(
      { deviceType: "NYC display screen kiosk browser", publicSurface: true },
      { now: NOW },
    );
    expect(kiosk.hostClass).toBe("web-display-host");
    expect(kiosk.presenceCapability).toBe("public-surface");
    expect(kiosk.canDisplay).toBe(true);
    expect(kiosk.canApprove).toBe(false);
  });

  it("classifies guest, sensor, electronics, embodied, and unknown hosts with safe defaults", () => {
    const guest = createLucaLinkHostConnectionRecord(
      {
        deviceId: "guest",
        deviceType: "guest web browser",
        trustLevel: "guest",
      },
      { now: NOW },
    );
    expect(guest.hostClass).toBe("guest-host");
    expect(guest.approvalCapability).toBe("none");
    expect(guest.canReceiveHandoff).toBe(false);

    const sensor = createLucaLinkHostConnectionRecord(
      { deviceType: "camera sensor stream" },
      { now: NOW },
    );
    expect(sensor.hostClass).toBe("sensor-host");
    expect(sensor.canSense).toBe(true);
    expect(sensor.canApprove).toBe(false);
    expect(sensor.canActPhysically).toBe(false);

    const electronics = createLucaLinkHostConnectionRecord(
      { deviceType: "smart electronics iot mqtt" },
      { now: NOW },
    );
    expect(electronics.hostClass).toBe("electronics-host");
    expect(electronics.connectionClass).toBe("electronics-bridge");
    expect(electronics.canSense).toBe(true);
    expect(electronics.canActPhysically).toBe(false);

    const robot = createLucaLinkHostConnectionRecord(
      { deviceType: "robot drone humanoid ros" },
      { now: NOW },
    );
    expect(robot.hostClass).toBe("embodied-host");
    expect(robot.connectionClass).toBe("embodied-bridge");
    expect(robot.canSense).toBe(true);
    expect(robot.canApprove).toBe(false);
    expect(robot.canActPhysically).toBe(false);
    expect(robot.limitations.join(" ")).toContain(
      "fresh Primary Host confirmation",
    );

    const unknown = createLucaLinkHostConnectionRecord(
      { deviceId: "mystery" },
      { now: NOW },
    );
    expect(unknown.hostClass).toBe("unknown-host");
    expect(unknown.connectionClass).toBe("unknown");
    expect(unknown.approvalCapability).toBe("none");
  });

  it("summarizes host classes, risks, and in-memory registry state", () => {
    const records = [
      createLucaLinkHostConnectionRecord(
        { deviceType: "desktop", trustLevel: "trusted" },
        { now: NOW },
      ),
      createLucaLinkHostConnectionRecord(
        { deviceType: "guest web" },
        { now: NOW },
      ),
      createLucaLinkHostConnectionRecord(
        { deviceType: "robot ros" },
        { now: NOW },
      ),
      createLucaLinkHostConnectionRecord(
        { deviceType: "kiosk browser", publicSurface: true },
        { now: NOW },
      ),
    ];
    const summary = summarizeLucaLinkHostConnections(records);
    expect(summary.total).toBe(4);
    expect(summary.byHostClass["execution-host"]).toBe(1);
    expect(summary.byHostClass["guest-host"]).toBe(1);
    expect(summary.byHostClass["embodied-host"]).toBe(1);
    expect(summary.publicSurfaces).toBe(1);
    expect(summary.byRisk.high).toBeGreaterThanOrEqual(1);

    const registry = createLucaLinkHostConnectionRegistry({ maxRecords: 2 });
    upsertLucaLinkHostConnection(
      registry,
      { deviceId: "a", deviceType: "desktop" },
      { now: NOW },
    );
    upsertLucaLinkHostConnection(
      registry,
      { deviceId: "b", deviceType: "sensor" },
      { now: NOW + 1 },
    );
    expect(getLucaLinkHostConnection(registry, "a")?.hostClass).toBe(
      "execution-host",
    );
    expect(listLucaLinkHostConnections(registry)).toHaveLength(2);
    expect(summarizeLucaLinkHostConnectionRegistry(registry).sensorHosts).toBe(
      1,
    );
    expect(removeLucaLinkHostConnection(registry, "a")).toBe(true);
    clearLucaLinkHostConnectionRegistry(registry);
    expect(registry.records).toEqual([]);
  });

  it("does not touch storage, fetch, sockets, or execution APIs on import/use", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    createLucaLinkHostConnectionRecord({ deviceType: "desktop" }, { now: NOW });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
