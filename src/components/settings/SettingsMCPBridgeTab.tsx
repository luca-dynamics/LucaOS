import React, { useState } from "react";
import { Icon } from "../ui/Icon";
import { LucaSettings } from "../../services/settingsService";
import SettingsMCPTab from "./SettingsMCPTab";
import SettingsConnectivityTab from "./SettingsConnectivityTab";
import { createSkillManifestPreview } from "../../personal-intelligence";
import { SkillManifestPreviewCard } from "./personalIntelligencePreview";
import {
  SettingsAdvancedDisclosure,
  SettingsCard,
  SettingsSection,
  SettingsStatList,
} from "./SettingsLayout";

interface SettingsMCPBridgeTabProps {
  settings: LucaSettings;
  theme: {
    primary: string;
    hex: string;
    themeName: string;
  };
  setStatusMsg: (msg: string) => void;
  onUpdate: (section: keyof LucaSettings, key: string, value: any) => void;
  isMobile?: boolean;
}

const SettingsMCPBridgeTab: React.FC<SettingsMCPBridgeTabProps> = ({
  settings,
  theme,
  setStatusMsg,
  isMobile,
}) => {
  const [bridgeMode, setBridgeMode] = useState<"inbound" | "outbound">(
    "inbound",
  );

  const servers = settings.mcp.servers;
  const autoConnectCount = servers.filter((server) => server.autoConnect).length;
  const localCount = servers.filter((server) => server.type === "stdio").length;

  const skillManifestPreview = createSkillManifestPreview({
    id: "settings-preview-skill",
    name: "Knowledge Review",
    description: "Reviews selected project knowledge after user approval.",
    version: "0.1.0",
    category: "knowledge",
    entrypoint: "skills/knowledge-review",
    permissions: [
      {
        id: "memory.project.read",
        description: "Read approved project context",
        required: true,
      },
    ],
    memoryPolicy: { read: ["project"], write: [], retention: "session" },
    requiredModels: ["text"],
    requiredTools: [],
    workflows: [
      {
        id: "review",
        description: "Propose a review summary",
        steps: ["inspect", "summarize", "request approval"],
      },
    ],
    tests: [
      {
        id: "no-execution",
        description: "Keeps the preview inert",
        expectedOutcome: "No entrypoint is loaded",
      },
    ],
  });

  return (
    <div className={`space-y-6 ${isMobile ? "px-0" : ""}`}>
      {settings.general.experienceMode !== "basic" && (
        <SettingsSection
          title="Personal Intelligence Preview"
          description="Inspect a declarative Skill Manifest without loading tools, workflows, or entrypoints."
          icon="Eye"
          accentColor={theme.hex}
          isMobile={isMobile}
        >
          <SkillManifestPreviewCard manifest={skillManifestPreview} />
        </SettingsSection>
      )}

      <SettingsSection
        title="MCP Status"
        description="Tool servers Luca can reach right now."
        icon="Plug"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsStatList
          items={[
            {
              label: "Servers",
              value: `${servers.length}`,
              detail: "Tool servers configured on this device.",
            },
            {
              label: "Auto-connect",
              value: `${autoConnectCount}`,
              detail: "Servers that start together with Luca.",
            },
            {
              label: "Local / remote",
              value: `${localCount} / ${servers.length - localCount}`,
              detail: "Local servers run as a process on this machine.",
            },
          ]}
        />
      </SettingsSection>

      <SettingsSection
        title="Connected MCP Servers"
        description="Name, transport, and connection mode for each server."
        icon="Server"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        {servers.length > 0 ? (
          <div className="space-y-3">
            {servers.map((server) => (
              <SettingsCard key={server.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{server.name}</p>
                    <p className="text-xs opacity-70">
                      {server.type === "stdio"
                        ? "Local server"
                        : "Remote server"}{" "}
                      • {server.autoConnect ? "Auto-connect" : "Manual connect"}
                    </p>
                  </div>
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: theme.hex }}
                  />
                </div>
              </SettingsCard>
            ))}
          </div>
        ) : (
          <SettingsCard>
            <p className="text-sm font-semibold">
              No MCP servers connected yet.
            </p>
            <p className="mt-1 text-xs opacity-70">
              Add a trusted local or remote server when you want Luca to see a
              new tool surface.
            </p>
          </SettingsCard>
        )}
      </SettingsSection>

      <SettingsSection
        title="Add MCP Server"
        description="Connect a tool server, or share Luca's own capabilities."
        icon="PlusCircle"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        {/* Luca Traffic Control Switcher */}
        <div
          className={`flex p-1.5 border glass-blur shadow-lg self-start mb-2 ${isMobile ? "mx-4 border-x-0 border-y rounded-none" : "rounded-xl"}`}
          style={{
            backgroundColor: isMobile
              ? "var(--luca-surface-glass, var(--app-bg-tint))"
              : "var(--luca-surface-glass, var(--app-bg-tint))",
            borderColor: "var(--luca-border-subtle, var(--app-border-main))",
          }}
        >
          <button
            onClick={() => setBridgeMode("inbound")}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[12.5px] font-medium transition-colors ${
              bridgeMode === "inbound"
                ? "text-[var(--app-text-main)] shadow-sm"
                : "text-[var(--app-text-muted)] opacity-60 hover:opacity-100"
            }`}
            style={
              bridgeMode === "inbound"
                ? { backgroundColor: `${theme.hex}22`, color: theme.hex }
                : {}
            }
          >
            <Icon name="Import" className="w-3.5 h-3.5" />
            Connect Tool Servers
          </button>
          <button
            onClick={() => setBridgeMode("outbound")}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[12.5px] font-medium transition-colors ${
              bridgeMode === "outbound"
                ? "text-[var(--app-text-main)] shadow-sm"
                : "text-[var(--app-text-muted)] opacity-60 hover:opacity-100"
            }`}
            style={
              bridgeMode === "outbound"
                ? { backgroundColor: `${theme.hex}22`, color: theme.hex }
                : {}
            }
          >
            <Icon name="Share2" className="w-3.5 h-3.5" />
            Share Luca Capabilities
          </button>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {bridgeMode === "inbound" ? (
            <SettingsMCPTab
              settings={settings}
              theme={theme}
              setStatusMsg={setStatusMsg}
              isMobile={isMobile}
            />
          ) : (
            <SettingsConnectivityTab isMobile={isMobile} />
          )}
        </div>
      </SettingsSection>

      <SettingsAdvancedDisclosure
        title="Advanced Details"
        description="Raw server definitions as Luca stores them."
      >
        {servers.length > 0 ? (
          <SettingsCard>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs leading-relaxed opacity-80">
              {JSON.stringify(servers, null, 2)}
            </pre>
          </SettingsCard>
        ) : (
          <SettingsStatList
            items={[
              {
                label: "Raw MCP config",
                value: "Empty",
                detail: "Add a server above to see its stored definition.",
              },
            ]}
          />
        )}
      </SettingsAdvancedDisclosure>
    </div>
  );
};

export default SettingsMCPBridgeTab;
