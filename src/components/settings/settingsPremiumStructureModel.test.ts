import { describe, expect, it } from "vitest";
import {
  brainAdvancedDetailsControlIds,
  generalAdvancedSettingsControlIds,
  remainingAdvancedDetailsControlIds,
  remainingDangerZoneControlIds,
  remainingSettingsPremiumTabStructure,
  settingsPremiumTabStructure,
  visionAdvancedDetailsControlIds,
  voiceAdvancedRoutingControlIds,
} from "./settingsPremiumStructureModel";
import brainSource from "./SettingsBrainTab.tsx?raw";
import modelManagerSource from "./SettingsModelManagerTab.tsx?raw";
import mcpBridgeSource from "./SettingsMCPBridgeTab.tsx?raw";
import connectorsSource from "./SettingsConnectorsTab.tsx?raw";
import dataSource from "./SettingsDataTab.tsx?raw";
import knowledgeSource from "./KnowledgeBridgeTab.tsx?raw";
import lucaLinkSource from "./SettingsLucaLinkTab.tsx?raw";
import autonomySource from "./SettingsAutonomyTab.tsx?raw";
import iotSource from "./SettingsIoTTab.tsx?raw";
import aboutSource from "./SettingsAboutTab.tsx?raw";
import profileSource from "./OperatorProfilePanel.tsx?raw";
import personalitySource from "./PersonalityDashboard.tsx?raw";
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

describe("remaining Settings premium migration", () => {
  const migratedSources = {
    "model-manager": modelManagerSource,
    "mcp-bridge": mcpBridgeSource,
    connectors: connectorsSource,
    data: dataSource,
    "knowledge-bridge": knowledgeSource,
    lucalink: lucaLinkSource,
    autonomy: autonomySource,
    iot: iotSource,
    profile: profileSource,
    personality: personalitySource,
    about: aboutSource,
  } as const;

  it("documents the premium section hierarchy for every remaining Settings tab", () => {
    expect(Object.keys(remainingSettingsPremiumTabStructure)).toEqual([
      "model-manager",
      "mcp-bridge",
      "connectors",
      "data",
      "knowledge-bridge",
      "lucalink",
      "autonomy",
      "iot",
      "profile",
      "personality",
      "about",
    ]);

    expect(remainingSettingsPremiumTabStructure["mcp-bridge"]).toEqual(
      expect.arrayContaining([
        "MCP Status",
        "Connected MCP Servers",
        "Add MCP Server",
        "Permissions",
        "Tool Approval Policy",
        "Advanced Details",
      ]),
    );
    expect(remainingSettingsPremiumTabStructure.connectors).not.toContain(
      "Danger Zone",
    );
    expect(remainingSettingsPremiumTabStructure.data).toContain("Privacy");
    expect(remainingSettingsPremiumTabStructure.personality).toContain(
      "Advanced / Origin-only",
    );
  });

  it("renders migrated tabs with the PR #180 SettingsLayout primitives", () => {
    for (const source of Object.values(migratedSources)) {
      expect(source).toContain("SettingsSection");
    }

    expect(modelManagerSource).toContain("SettingsCard");
    expect(modelManagerSource).toContain("SettingsAdvancedDisclosure");
    expect(mcpBridgeSource).toContain("SettingsAdvancedDisclosure");
    expect(connectorsSource).not.toContain("SettingsDangerZone");
    expect(dataSource).toContain("SettingsDangerZone");
    expect(iotSource).not.toContain("SettingsDangerZone");
  });

  it("places advanced technical controls under Advanced Details", () => {
    expect(remainingAdvancedDetailsControlIds).toEqual(
      expect.arrayContaining([
        "model-manager.rawModelIds",
        "mcp-bridge.rawMcpJson",
        "connectors.tokenRefreshState",
        "knowledge-bridge.embeddingModel",
        "lucalink.pairingTokenDiagnostics",
        "autonomy.planningTraces",
        "iot.homeAssistantEndpoint",
        "personality.rawSystemBlueprint",
      ]),
    );

    for (const source of [
      modelManagerSource,
      mcpBridgeSource,
      connectorsSource,
      knowledgeSource,
      lucaLinkSource,
      autonomySource,
      iotSource,
      profileSource,
      aboutSource,
    ]) {
      expect(source).toContain('title="Advanced Details"');
    }
  });

  it("places destructive maintenance under Danger Zone where destructive actions exist", () => {
    expect(remainingDangerZoneControlIds).toEqual(
      expect.arrayContaining(["data.deleteMemory", "data.clearSessions"]),
    );

    expect(modelManagerSource).not.toContain("SettingsDangerZone");
    expect(connectorsSource).not.toContain("SettingsDangerZone");
    expect(dataSource).toContain("SettingsDangerZone");
    expect(iotSource).not.toContain("SettingsDangerZone");
  });

  it("keeps raw profile and personality/system controls out of primary user controls", () => {
    expect(remainingSettingsPremiumTabStructure.profile).toContain(
      "Advanced Details",
    );
    expect(remainingSettingsPremiumTabStructure.personality).toContain(
      "Advanced / Origin-only",
    );
    expect(profileSource).not.toContain('title="Raw profile JSON"');
    expect(personalitySource).not.toContain('title="Raw system blueprint"');
  });
});
