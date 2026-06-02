import { describe, expect, it, vi } from "vitest";
import {
  classifyLucaLinkHostProbeObservations,
  createLucaLinkHostBridgeBlueprint,
  createLucaLinkHostConnectionDiagnosis,
  evaluateLucaLinkHostAdaptationSafety,
  planLucaLinkHostBridgeStrategies,
  summarizeLucaLinkHostAdaptation,
} from "./lucaLinkHostAdaptation";

describe("LucaLink Host Adaptation Intelligence", () => {
  it("plans web display and kiosk blueprints as display-only model records", () => {
    const diagnosis = createLucaLinkHostConnectionDiagnosis({
      hostClass: "web-display-host",
      runtimeSurfaces: ["browser", "smart-tv", "kiosk-browser"],
      connectionClass: "web-display",
    });
    const plans = planLucaLinkHostBridgeStrategies(diagnosis);
    expect(plans.map((plan) => plan.kind)).toEqual(
      expect.arrayContaining(["web-display-bridge", "kiosk-display-bridge"]),
    );
    const blueprint = createLucaLinkHostBridgeBlueprint(plans[0]);
    expect(blueprint.allowedCapabilities).toContain("display-only");
    expect(blueprint.deniedCapabilities).toContain("approval-authority");
    expect(blueprint.requiresPrimaryHostApproval).toBe(true);
    expect(blueprint.generatedProgramAllowed).toBe(false);
  });

  it("plans Python, Node, and Electron code-capable adapters with sandbox required and no generated execution", () => {
    const diagnosis = createLucaLinkHostConnectionDiagnosis({
      hostClass: "execution-host",
      runtimeSurfaces: [
        "python-runtime",
        "embedded-linux",
        "node-runtime",
        "electron-runtime",
        "native-desktop",
      ],
      connectionClass: "local-lan",
    });
    const blueprints = planLucaLinkHostBridgeStrategies(diagnosis).map((plan) =>
      createLucaLinkHostBridgeBlueprint(plan),
    );
    expect(blueprints.map((blueprint) => blueprint.strategyKind)).toEqual(
      expect.arrayContaining([
        "python-host-agent",
        "node-host-adapter",
        "electron-host-adapter",
      ]),
    );
    for (const blueprint of blueprints.filter((item) =>
      [
        "python-host-agent",
        "node-host-adapter",
        "electron-host-adapter",
      ].includes(item.strategyKind),
    )) {
      expect(blueprint.requiresSandbox).toBe(true);
      expect(blueprint.requiresPrimaryHostApproval).toBe(true);
      expect(blueprint.generatedProgramAllowed).toBe(false);
    }
  });

  it("keeps IoT, MQTT, and Matter-like bridge blueprints read-only by default", () => {
    const diagnosis = createLucaLinkHostConnectionDiagnosis({
      hostClass: "electronics-host",
      runtimeSurfaces: ["iot-api", "mqtt", "matter-like"],
      connectionClass: "electronics-bridge",
    });
    const blueprints = planLucaLinkHostBridgeStrategies(diagnosis).map((plan) =>
      createLucaLinkHostBridgeBlueprint(plan),
    );
    expect(blueprints.map((blueprint) => blueprint.strategyKind)).toEqual(
      expect.arrayContaining([
        "iot-api-bridge",
        "mqtt-bridge",
        "matter-like-bridge",
      ]),
    );
    expect(
      blueprints.every(
        (blueprint) =>
          blueprint.deniedCapabilities.includes("device-control") ||
          blueprint.strategyKind === "matter-like-bridge",
      ),
    ).toBe(true);
    expect(
      blueprints.every(
        (blueprint) => blueprint.generatedProgramAllowed === false,
      ),
    ).toBe(true);
  });

  it("models ROS and serial sensor bridges without motion or self-approval", () => {
    const diagnosis = createLucaLinkHostConnectionDiagnosis({
      hostClass: "embodied-host",
      runtimeSurfaces: ["ros-like", "serial", "sensor-stream"],
      connectionClass: "embodied-bridge",
    });
    const blueprints = planLucaLinkHostBridgeStrategies(diagnosis).map((plan) =>
      createLucaLinkHostBridgeBlueprint(plan),
    );
    const ros = blueprints.find(
      (blueprint) => blueprint.strategyKind === "ros-sensor-bridge",
    );
    expect(ros).toBeDefined();
    expect(ros?.allowedCapabilities).toContain("sensor-read-blueprint");
    expect(ros?.deniedCapabilities).toEqual(
      expect.arrayContaining(["motion", "actuation", "self-approval"]),
    );
    expect(ros?.risk).toBe("high");
  });

  it("limits companion watch bridge authority", () => {
    const diagnosis = createLucaLinkHostConnectionDiagnosis({
      hostClass: "watch-host",
      runtimeSurfaces: ["smart-watch"],
      connectionClass: "companion-bridge",
    });
    const blueprint = createLucaLinkHostBridgeBlueprint(
      planLucaLinkHostBridgeStrategies(diagnosis)[0],
    );
    expect(blueprint.strategyKind).toBe("companion-watch-bridge");
    expect(blueprint.allowedCapabilities).toContain("low-risk-approval-signal");
    expect(blueprint.deniedCapabilities).toContain("high-risk-approval");
  });

  it("blocks unsafe, credential bypass, exploit-like, and physical actuation requests", () => {
    const diagnosis = createLucaLinkHostConnectionDiagnosis({
      hostClass: "unknown-host",
      runtimeSurfaces: ["python-runtime"],
      requestedCapabilities: [
        "credential bypass",
        "physical actuation",
        "exploit",
      ],
    });
    expect(diagnosis.risk).toBe("critical");
    const plan = planLucaLinkHostBridgeStrategies(diagnosis)[0];
    expect(plan.kind).toBe("unsupported");
    const blueprint = createLucaLinkHostBridgeBlueprint(plan);
    expect(blueprint.stage).toBe("blocked");
    expect(blueprint.generatedProgramAllowed).toBe(false);
    expect(blueprint.errors.join(" ")).toContain("blocked");
  });

  it("classifies probe observations and summarizes adaptation without reserved authority language", () => {
    const diagnosis = classifyLucaLinkHostProbeObservations([
      {
        id: "obs",
        label: "Browser",
        evidence: "User-authorized browser display",
        confidence: 0.9,
        runtimeSurface: "browser",
        connectionSurface: "web-display",
        safeToUse: true,
        warnings: [],
      },
    ]);
    const blueprint = createLucaLinkHostBridgeBlueprint("manual-setup-guide", {
      targetHostClass: "unknown-host",
    });
    const summary = summarizeLucaLinkHostAdaptation([diagnosis, blueprint]);
    expect(summary.total).toBe(2);
    expect(summary.approvalRequired).toBe(1);
    expect(JSON.stringify([diagnosis, blueprint, summary])).not.toContain(
      "Origin",
    );
  });

  it("does not call fetch or execution-like APIs", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    evaluateLucaLinkHostAdaptationSafety(
      createLucaLinkHostBridgeBlueprint("python-host-agent"),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
