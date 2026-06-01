import { describe, expect, it } from "vitest";
import {
  brainAdvancedDetailsControlIds,
  generalAdvancedSettingsControlIds,
  settingsPremiumTabStructure,
  visionAdvancedDetailsControlIds,
  voiceAdvancedRoutingControlIds,
} from "./settingsPremiumStructureModel";
import brainSource from "./SettingsBrainTab.tsx?raw";
import visionSource from "./SettingsVisionTab.tsx?raw";
import voiceSource from "./SettingsVoiceTab.tsx?raw";

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

  it("renders Brain base URL and custom endpoint controls inside an Advanced Details disclosure", () => {
    const source = brainSource;

    expect(source).toContain("<SettingsAdvancedDisclosure");
    expect(source).toContain('title="Advanced Details"');
    const advancedDetailsSource = source.slice(
      source.indexOf('title="Advanced Details"'),
    );
    expect(advancedDetailsSource).toContain("geminiBaseUrl");
    expect(advancedDetailsSource).toContain("openaiBaseUrl");
    expect(advancedDetailsSource).toContain("Custom provider endpoints");
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

  it("renders Voice routing telemetry inside the Advanced Voice Routing disclosure", () => {
    const source = voiceSource;

    expect(source).toContain("<SettingsAdvancedDisclosure");
    expect(source).toContain('title="Advanced Voice Routing"');
    expect(source.indexOf('title="Advanced Voice Routing"')).toBeLessThan(
      source.indexOf("runtimePolicy.preferredProviderKind"),
    );
    expect(source).toContain("Technical routing, fallback, network");
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

  it("renders Vision with premium sections and an Advanced Vision Details disclosure", () => {
    const source = visionSource;

    expect(source).toContain("<SettingsSection");
    expect(source).toContain('title="Vision Awareness"');
    expect(source).toContain('title="Vision Engine"');
    expect(source).toContain('title="Advanced Vision Details"');
    expect(source.indexOf('title="Advanced Vision Details"')).toBeLessThan(
      source.indexOf("GPU resources"),
    );
  });
});
