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
  SettingsRow,
  SettingsSection,
  SettingsStatusCard,
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
      <SettingsSection
        title="Personal Intelligence Preview"
        description="Inspect a declarative Skill Manifest without loading tools, workflows, or entrypoints."
        icon="Eye"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SkillManifestPreviewCard manifest={skillManifestPreview} />
      </SettingsSection>

      <SettingsSection
        title="MCP Status"
        description="Connect tools Luca can use while keeping permissions and diagnostics easy to review."
        icon="Plug"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <SettingsStatusCard
            label="Bridge"
            value={settings.mcp.servers.length > 0 ? "Configured" : "Ready"}
            detail="MCP Bridge remains available on desktop and mobile Advanced Settings."
            accentColor={theme.hex}
          />
          <SettingsStatusCard
            label="Connected servers"
            value={`${settings.mcp.servers.length}`}
            detail="Server health and exposed tools stay managed by the existing bridge UI."
            accentColor={theme.hex}
          />
          <SettingsStatusCard
            label="Approval policy"
            value="User reviewed"
            detail="Tool approvals, blocked tools, and history are grouped below."
            accentColor={theme.hex}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Connected MCP Servers"
        description="Review server name, permission scope, exposed tools, health, and management actions."
        icon="Server"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        {settings.mcp.servers.length > 0 ? (
          <div className="space-y-3">
            {settings.mcp.servers.map((server) => (
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
        description="Use trusted templates, local servers, remote servers, or imported configs from the existing bridge controls."
        icon="PlusCircle"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        {/* Luca Traffic Control Switcher */}
        <div
          className={`flex p-1.5 border glass-blur shadow-lg self-start mb-2 ${isMobile ? "mx-4 border-x-0 border-y rounded-none" : "rounded-xl"}`}
          style={{
            backgroundColor: isMobile
              ? "rgba(255,255,255,0.02)"
              : "var(--app-bg-tint, rgba(0,0,0,0.4))",
            borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
          }}
        >
          <button
            onClick={() => setBridgeMode("inbound")}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 ${
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
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 ${
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

      <SettingsSection
        title="Permissions"
        description="Filesystem, browser, shell, database, messaging, and confirmation requirements remain explicit."
        icon="ShieldCheck"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Filesystem access"
          description="Review per-server scope before Luca can use file-aware tools."
        />
        <SettingsRow
          label="Browser access"
          description="Browser tools remain permissioned and user-reviewed."
        />
        <SettingsRow
          label="Shell and database access"
          description="High-impact capabilities require explicit approval in the bridge policy."
        />
        <SettingsRow
          label="Messaging access"
          description="Messaging-capable tools stay grouped with confirmation requirements."
        />
      </SettingsSection>

      <SettingsSection
        title="Tool Approval Policy"
        description="Choose whether Luca asks every time, trusts approved tools, blocks dangerous tools, or shows history."
        icon="CheckCircle"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Ask every time"
          description="Recommended for new or sensitive servers."
        />
        <SettingsRow
          label="Allow trusted tools"
          description="Use only for tools you have reviewed."
        />
        <SettingsRow
          label="Block dangerous tools"
          description="Keep command, file, and messaging actions behind review."
        />
        <SettingsRow
          label="Review tool history"
          description="Inspect recent approvals and failures in the existing bridge diagnostics."
        />
      </SettingsSection>

      <SettingsAdvancedDisclosure
        title="Advanced Details"
        description="Raw MCP JSON/config, server logs, restart bridge, export/import config, and protocol diagnostics."
      >
        <SettingsRow
          label="Raw MCP JSON/config"
          description="Use the bridge controls above to edit or import server definitions."
        />
        <SettingsRow
          label="Server logs"
          description="Server startup and sync diagnostics stay out of the main user controls."
        />
        <SettingsRow
          label="Restart bridge"
          description="Restart and export/import actions remain part of existing bridge management."
        />
        <SettingsRow
          label="Protocol diagnostics"
          description="Low-level protocol details stay grouped here."
        />
      </SettingsAdvancedDisclosure>
    </div>
  );
};

export default SettingsMCPBridgeTab;
