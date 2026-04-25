import React, { useState, useEffect } from "react";
import { Icon } from "./ui/Icon";
import { CustomSkill } from "../types";
import SkillPreview from "./SkillPreview";
import { apiUrl } from "../config/api";
import { settingsService } from "../services/settingsService";
import { getThemeColors } from "../config/themeColors";

// Sub-components
import { SkillsTab } from "./directory/SkillsTab";
import { ConnectorsTab } from "./directory/ConnectorsTab";
import { PluginsTab } from "./directory/PluginsTab";
import { AIAssistantTab } from "./directory/AIAssistantTab";

// Data
import { 
  CURATED_PLUGINS, 
  CURATED_CONNECTORS, 
  MARKETPLACE_SKILLS, 
  MarketplaceServer, 
  MarketplacePlugin 
} from "../data/directoryData";

interface Props {
  onClose: () => void;
  onExecute: (name: string, args: any) => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

type TabType = "AI" | "SKILLS" | "CONNECTORS" | "PLUGINS";

const SkillsMatrix: React.FC<Props> = ({ onClose, onExecute, theme: propTheme }) => {
  // Theme Integration
  const currentPersona =
    settingsService.getSettings().general.persona || "ASSISTANT";
  const themeByPersona = getThemeColors(currentPersona);
  
  const themeHex = propTheme?.hex || themeByPersona.hex || "#3b82f6";
  
  // State
  const [skills, setSkills] = useState<CustomSkill[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("SKILLS");
  const [loading, setLoading] = useState(false);

  // AI/Forge State
  const [creationMode, setCreationMode] = useState<"AI" | "MANUAL">("AI");
  const [skillDescription, setSkillDescription] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newScript, setNewScript] = useState("");
  const [newLang, setNewLang] = useState<"python" | "node">("python");
  const [newInputs, setNewInputs] = useState("");

  // Preview State
  const [previewSkill, setPreviewSkill] = useState<CustomSkill | null>(null);

  // Theme color extraction
  const colors = {
    accent: themeHex,
    glow: `${themeHex}4d`,
    border: `${themeHex}33`,
    bgTint: `${themeHex}0d`,
    textColor: "#ffffff"
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/skills/list"));
      if (res.ok) {
        const data = await res.json();
        const extractedSkills = Array.isArray(data) ? data : (data?.skills ? (Array.isArray(data.skills) ? data.skills : Object.values(data.skills)) : []);
        setSkills(extractedSkills);
      }
    } catch (e) {
      console.error("Failed to fetch skills:", e);
    } finally {
      setLoading(false);
    }
  };

  const generateSkillFromDescription = async () => {
    if (!skillDescription.trim()) return;
    setIsGenerating(true);
    try {
      const response = await fetch(apiUrl("/api/skills/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: skillDescription, language: newLang }),
      });
      if (response.ok) {
        const { code, name, inputs, description: aiDesc } = await response.json();
        setGeneratedCode(code);
        setNewScript(code);
        setNewName(name);
        setNewDesc(aiDesc);
        setNewInputs(Array.isArray(inputs) ? inputs.join(", ") : "");
      }
    } catch (error) {
      console.error("Skill generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreate = async () => {
    if (!newName || !newScript) return;
    try {
      const res = await fetch(apiUrl("/api/skills/create"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          description: newDesc,
          script: newScript,
          language: newLang,
          inputs: newInputs.split(",").map(s => s.trim()).filter(s => s),
        }),
      });
      if (res.ok) {
        fetchSkills();
        setActiveTab("SKILLS");
        // Reset
        setNewName(""); setNewDesc(""); setNewScript(""); setNewInputs(""); setSkillDescription(""); setGeneratedCode("");
      }
    } catch (e) {
      console.error("Create failed:", e);
    }
  };

  const handleInstallConnector = async (connector: MarketplaceServer) => {
    try {
      const res = await fetch(apiUrl("/api/mcp/connect"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: connector.name,
          type: connector.type,
          command: connector.command,
          args: connector.args?.split(" ").filter((a: string) => a.trim()) || [],
          url: connector.url,
          autoConnect: true,
        }),
      });
      if (res.ok) {
        if (onClose) onClose();
        window.dispatchEvent(new CustomEvent("luca:open-settings", { detail: { tab: "mcp" } }));
      }
    } catch (e) {
      console.error("Connector install failed:", e);
    }
  };

  const handleActivatePlugin = async (plugin: MarketplacePlugin) => {
    try {
      const { settingsService } = await import("../services/settingsService");
      const service = (settingsService as any).default || settingsService;
      const current = service.getSettings();
      await service.saveSettings({ brain: { ...current.brain, activePluginId: plugin.id } });
      window.dispatchEvent(new CustomEvent("luca:toast", { 
        detail: { message: `Activated ${plugin.name} Mode`, type: "success", icon: plugin.icon, color: plugin.color } 
      }));
      if (onClose) onClose();
    } catch (e) {
      console.error("Plugin activation failed:", e);
    }
  };

  const TABS: { id: TabType; label: string; icon: string }[] = [
    { id: "SKILLS", label: "Skills", icon: "Box" },
    { id: "CONNECTORS", label: "Connectors", icon: "Plug" },
    { id: "PLUGINS", label: "Plugins", icon: "Widget6" },
    { id: "AI", label: "Assistant", icon: "MagicStick" },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 glass-blur font-sans select-none p-4 animate-in fade-in duration-300">
      <div
        className={`w-full max-w-6xl h-[90%] bg-[#050505]/60 glass-blur rounded-2xl flex flex-row overflow-hidden shadow-2xl transition-all duration-500`}
        style={{
          border: `1px solid ${colors.accent}44`,
          boxShadow: `0 0 80px -20px ${colors.accent}33`,
        }}
      >
        {/* Sidebar Navigation — matches Settings */}
        <div
          className="bg-[#0a0a0a] flex flex-col shrink-0 w-64"
          style={{ borderRight: `1px solid rgba(255,255,255,0.1)` }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2 p-5"
            style={{ borderBottom: `1px solid rgba(255,255,255,0.1)` }}
          >
            <Icon
              name="Dna"
              variant="BoldDuotone"
              className="w-4 h-4"
              style={{ color: colors.accent }}
            />
            <h2 className="text-md font-bold tracking-wider" style={{ color: colors.accent }}>
              DIRECTORY
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-500 font-normal ml-auto">
              v3.0
            </span>
          </div>

          {/* Nav Tabs */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-1">
            <div className="px-2 mb-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Capabilities
            </div>
            {TABS.slice(0, 3).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-transparent transition-all hover:bg-white/5"
                  style={{
                    color: isActive ? colors.accent : "#9ca3af",
                    backgroundColor: isActive ? "rgba(255,255,255,0.05)" : "transparent",
                    borderColor: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                  }}
                >
                  <Icon name={tab.icon} variant={isActive ? "BoldDuotone" : "Linear"} className="w-5 h-5" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}

            <div className="px-2 mt-6 mb-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Forge
            </div>
            {TABS.slice(3).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-transparent transition-all hover:bg-white/5"
                  style={{
                    color: isActive ? colors.accent : "#9ca3af",
                    backgroundColor: isActive ? "rgba(255,255,255,0.05)" : "transparent",
                    borderColor: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                  }}
                >
                  <Icon name={tab.icon} variant={isActive ? "BoldDuotone" : "Linear"} className="w-5 h-5" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Footer stats */}
          <div className="p-4 text-[10px] font-mono text-slate-600 space-y-1" style={{ borderTop: `1px solid rgba(255,255,255,0.1)` }}>
            <div className="flex justify-between">
              <span>Registry</span>
              <span style={{ color: colors.accent }}>{skills.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              <span className="text-green-500">Online</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Content Header */}
          <div
            className="p-5 flex justify-between items-center bg-white/[0.02]"
            style={{ borderBottom: `1px solid rgba(255,255,255,0.1)` }}
          >
            <h3 className="text-lg font-bold text-gray-200">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <Icon name="CloseCircle" className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 basis-0 grow overflow-y-auto p-6">
            {activeTab === "SKILLS" && (
              <SkillsTab
                skills={skills}
                colors={colors}
                loading={loading}
                onExecute={onExecute}
                onPreview={setPreviewSkill}
                marketplaceSkills={MARKETPLACE_SKILLS}
                onInstalled={fetchSkills}
              />
            )}

            {activeTab === "CONNECTORS" && (
              <ConnectorsTab
                colors={colors}
                curatedConnectors={CURATED_CONNECTORS}
                onInstall={handleInstallConnector}
              />
            )}

            {activeTab === "PLUGINS" && (
              <PluginsTab
                colors={colors}
                curatedPlugins={CURATED_PLUGINS}
                onInstall={handleActivatePlugin}
              />
            )}

            {activeTab === "AI" && (
              <AIAssistantTab
                colors={colors}
                creationMode={creationMode}
                setCreationMode={setCreationMode}
                skillDescription={skillDescription}
                setSkillDescription={setSkillDescription}
                newLang={newLang}
                setNewLang={setNewLang}
                isGenerating={isGenerating}
                generateSkillFromDescription={generateSkillFromDescription}
                generatedCode={generatedCode}
                newName={newName}
                setNewName={setNewName}
                newInputs={newInputs}
                setNewInputs={setNewInputs}
                newDesc={newDesc}
                setNewDesc={setNewDesc}
                newScript={newScript}
                setNewScript={setNewScript}
                handleCreate={handleCreate}
              />
            )}
          </div>
        </div>

        {/* Skill Preview Modal */}
        {previewSkill && (
          <SkillPreview
            skill={previewSkill}
            onClose={() => setPreviewSkill(null)}
            onExecute={async (args) => onExecute(previewSkill.name, args)}
            themeColors={colors}
          />
        )}
      </div>
    </div>
  );
};

export default SkillsMatrix;
