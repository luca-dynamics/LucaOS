import { describe, expect, it } from "vitest";
import {
  brainAdvancedDetailsControlIds,
  generalAdvancedSettingsControlIds,
  settingsPremiumTabStructure,
  visionAdvancedDetailsControlIds,
  voiceAdvancedRoutingControlIds,
} from "./settingsPremiumStructureModel";

describe("settingsPremiumStructureModel", () => {
  it("categorizes General debug, experimental, system permissions, and destructive browser maintenance under Advanced Settings", () => {
    expect(settingsPremiumTabStructure.general).toContain("Advanced Settings");
    expect(generalAdvancedSettingsControlIds).toEqual(
      expect.arrayContaining([
        "general.debugMode",
        "general.experimentalMode",
        "systemPermissions.checkStatus",
        "systemPermissions.grantAccess",
        "browserSessions.clearImportedSession",
      ]),
    );
  });

  it("places Brain endpoint, proxy, diagnostics, telemetry, and raw model details under Advanced Details", () => {
    expect(settingsPremiumTabStructure.brain).toContain("Advanced Details");
    expect(brainAdvancedDetailsControlIds).toEqual(
      expect.arrayContaining([
        "brain.geminiBaseUrl",
        "brain.anthropicBaseUrl",
        "brain.openaiBaseUrl",
        "brain.xaiBaseUrl",
        "brain.deepseekBaseUrl",
        "brain.ollamaDiagnostics",
        "brain.loadBalancerTelemetry",
        "brain.rawModelIds",
      ]),
    );
  });

  it("places Voice routing telemetry and model routing controls under Advanced Voice Routing", () => {
    expect(settingsPremiumTabStructure.voice).toContain(
      "Advanced Voice Routing",
    );
    expect(voiceAdvancedRoutingControlIds).toEqual(
      expect.arrayContaining([
        "voice.routingPolicyTelemetry",
        "voice.sttModelSelection",
        "voice.ttsModelSelection",
        "voice.providerDiagnostics",
      ]),
    );
  });

  it("places Vision raw model and performance notes under Advanced Vision Details", () => {
    expect(settingsPremiumTabStructure.vision).toContain(
      "Advanced Vision Details",
    );
    expect(visionAdvancedDetailsControlIds).toEqual(
      expect.arrayContaining([
        "vision.rawModelIds",
        "vision.gpuRuntimeNotes",
        "vision.localRestrictions",
        "vision.performanceDiagnostics",
      ]),
    );
  });
});
