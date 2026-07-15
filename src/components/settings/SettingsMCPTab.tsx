import React, { useEffect, useState, useCallback } from "react";
import { Icon } from "../ui/Icon";
import { LucaInput } from "../ui/luca";
import { LucaSettings } from "../../services/settingsService";
import { apiUrl } from "../../config/api";
import { setHexAlpha } from "../../config/themeColors";

interface MCPServer {
  id: string;
  name: string;
  type: "stdio" | "sse";
  command?: string;
  args?: string[];
  url?: string;
  autoConnect: boolean;
  status?: "connected" | "disconnected" | "error";
  toolCount?: number;
}

interface MarketplaceServer {
  id: string;
  name: string;
  description: string;
  icon: string;       // lucide icon name (for curated)
  iconUrl?: string;   // remote image URL (for live registry)
  type: "stdio" | "sse";
  command?: string;
  args?: string;
  url?: string;
  category: "Files" | "Dev" | "Social" | "Search" | "Cloud" | "Other";
  color: string;
  isLive?: boolean;  // from registry vs. curated
}

const MCP_REGISTRY_URL = "https://registry.modelcontextprotocol.io/v0/servers";

// Maps a raw registry server object → MarketplaceServer
function mapRegistryServer(s: any): MarketplaceServer {
  const remote = s.server?.remotes?.[0];
  const type: "stdio" | "sse" = "sse";
  const url = remote?.url || "";
  const iconUrl = s.server?.icons?.[0]?.src;
  const name = s.server?.title || s.server?.name?.split("/").pop() || s.server?.name || "Unknown";
  const colors = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"];
  const hash = name.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
  return {
    id: s.server?.name || name,
    name,
    description: s.server?.description || "MCP Server",
    icon: "Plug",
    iconUrl,
    type,
    url,
    category: "Other",
    color: colors[hash % colors.length],
    isLive: true,
  };
}


const MARKETPLACE_SERVERS: MarketplaceServer[] = [
  {
    id: "filesystem",
    name: "Filesystem",
    description: "Read, write, and browse your local files and directories safely.",
    icon: "Folder",
    type: "stdio",
    command: "npx",
    args: "-y @modelcontextprotocol/server-filesystem",
    category: "Files",
    color: "#3b82f6",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Interact with repositories, issues, PRs, and user data.",
    icon: "Code",
    iconUrl: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
    type: "stdio",
    command: "npx",
    args: "-y @modelcontextprotocol/server-github",
    category: "Dev",
    color: "#1f2328",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Search, read, and manage your Google Drive documents.",
    icon: "Cloud",
    iconUrl: "https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg",
    type: "stdio",
    command: "npx",
    args: "-y @modelcontextprotocol/server-google-drive",
    category: "Cloud",
    color: "#10a37f",
  },
  {
    id: "memory",
    name: "Memoir (Memory)",
    description: "Long-term graph memory for maintaining context across chat sessions.",
    icon: "Cpu",
    type: "stdio",
    command: "npx",
    args: "-y @modelcontextprotocol/server-memory",
    category: "Cloud",
    color: "#8b5cf6",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Read channels, send messages, and search Slack history.",
    icon: "Globus",
    iconUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg",
    type: "stdio",
    command: "npx",
    args: "-y @modelcontextprotocol/server-slack",
    category: "Social",
    color: "#e01e5a",
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    description: "Query and manage your PostgreSQL databases.",
    icon: "Database",
    iconUrl: "https://upload.wikimedia.org/wikipedia/commons/2/29/Postgresql_elephants.svg",
    type: "stdio",
    command: "npx",
    args: "-y @modelcontextprotocol/server-postgres",
    category: "Dev",
    color: "#336791",
  },
  {
    id: "web-search",
    name: "Search (Tavily/Google)",
    description: "Give Claude live access to the latest information on the web.",
    icon: "Search",
    type: "stdio",
    command: "npx",
    args: "-y @modelcontextprotocol/server-tavily-search",
    category: "Search",
    color: "#f59e0b",
  }
];


interface SettingsMCPTabProps {
  settings: LucaSettings;
  theme: {
    primary: string;
    hex: string;
    themeName: string;
  };
  setStatusMsg: (msg: string) => void;
  isMobile?: boolean;
}

const SettingsMCPTab: React.FC<SettingsMCPTabProps> = ({
  theme,
  setStatusMsg,
  isMobile,
}) => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedServer, setExpandedServer] = useState<string | null>(null);
  const [serverTools, setServerTools] = useState<Record<string, any[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<"active" | "marketplace">("active");

  // Registry (live) state
  const [registryServers, setRegistryServers] = useState<MarketplaceServer[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchDebounce, setSearchDebounce] = useState("");



  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "stdio" as "stdio" | "sse",
    command: "",
    args: "",
    url: "",
    autoConnect: true,
  });

  // Environment variables state
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch servers on mount
  const fetchServers = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/mcp/list"));
      const data = await res.json();
      setServers(data.servers || []);
    } catch (e) {
      console.error("[MCP] Failed to fetch servers:", e);
    }
  }, []);

  useEffect(() => {
    fetchServers();
    const interval = setInterval(fetchServers, 10000);
    return () => clearInterval(interval);
  }, [fetchServers]);

  // Debounce search query for registry
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Fetch from live registry
  const fetchRegistry = useCallback(async (query: string, cursor?: string) => {
    setRegistryLoading(true);
    setRegistryError(null);
    try {
      const params = new URLSearchParams({ limit: "24" });
      if (query.trim()) params.set("q", query.trim());
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`${MCP_REGISTRY_URL}?${params}`);
      if (!res.ok) throw new Error(`Registry returned ${res.status}`);
      const data = await res.json();
      const mapped: MarketplaceServer[] = (data.servers || []).map(mapRegistryServer);
      setRegistryServers(prev => cursor ? [...prev, ...mapped] : mapped);
      setNextCursor(data.metadata?.nextCursor || null);
    } catch (e: any) {
      console.warn("[MCP Registry] Using offline fallback:", e.message);
      setRegistryError(e.message);
      if (!cursor) setRegistryServers([]); // show curated fallback
    } finally {
      setRegistryLoading(false);
    }
  }, []);

  // Fetch registry when switching to Discover tab or search changes
  useEffect(() => {
    if (activeView === "marketplace") {
      setNextCursor(null);
      fetchRegistry(searchDebounce);
    }
  }, [activeView, searchDebounce, fetchRegistry]);


  // Connect new server
  const handleAddServer = async () => {
    if (!formData.name) {
      setStatusMsg("Server name is required");
      return;
    }

    if (formData.type === "stdio" && !formData.command) {
      setStatusMsg("Command is required for STDIO servers");
      return;
    }

    if (formData.type === "sse" && !formData.url) {
      setStatusMsg("URL is required for SSE servers");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/mcp/connect"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          command: formData.type === "stdio" ? formData.command : undefined,
          args:
            formData.type === "stdio"
              ? formData.args.split(" ").filter((a) => a.trim())
              : undefined,
          url: formData.type === "sse" ? formData.url : undefined,
          env: envVars.reduce(
            (acc, { key, value }) => {
              if (key.trim()) acc[key.trim()] = value;
              return acc;
            },
            {} as Record<string, string>,
          ),
          autoConnect: formData.autoConnect,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setStatusMsg(`Error: ${data.error}`);
      } else {
        setStatusMsg(`Connected to ${formData.name}!`);
        setShowAddForm(false);
        setFormData({
          name: "",
          type: "stdio",
          command: "",
          args: "",
          url: "",
          autoConnect: true,
        });
        setEnvVars([]);
        setShowAdvanced(false);
        fetchServers();
      }
    } catch (e: any) {
      setStatusMsg(`Failed to connect: ${e.message}`);
    }
    setLoading(false);
  };

  // Remove server
  const handleRemoveServer = async (id: string) => {
    setLoading(true);
    try {
      await fetch(apiUrl("/api/mcp/remove"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setStatusMsg("Server removed");
      fetchServers();
    } catch (e: any) {
      setStatusMsg(`Failed to remove: ${e.message}`);
    }
    setLoading(false);
  };

  // Sync all
  const handleSync = async () => {
    setLoading(true);
    try {
      await fetch(apiUrl("/api/mcp/sync"), { method: "POST" });
      setStatusMsg("Reconnected all servers");
      fetchServers();
    } catch (e: any) {
      setStatusMsg(`Sync failed: ${e.message}`);
    }
    setLoading(false);
  };

  const installFromMarketplace = (item: MarketplaceServer) => {
    setFormData({
      name: item.name.toLowerCase().replace(/\s+/g, "-"),
      type: item.type,
      command: item.command || "",
      args: item.args || "",
      url: item.url || "",
      autoConnect: true,
    });
    setShowAddForm(true);
    setActiveView("active");
    // Scroll to form
    const container = document.querySelector(".mcp-settings-container");
    if (container) container.scrollTo({ top: 0, behavior: "smooth" });
  };


  // Load tools for expanded server
  const loadServerTools = async (serverId: string) => {
    try {
      const res = await fetch(apiUrl("/api/mcp/tools"));
      const data = await res.json();
      const tools = (data.tools || []).filter(
        (t: any) => t.sourceUrl === serverId || t.serverInfo?.url === serverId,
      );
      setServerTools((prev) => ({ ...prev, [serverId]: tools }));
    } catch (e) {
      console.error("[MCP] Failed to load tools:", e);
    }
  };

  const toggleExpand = (serverId: string) => {
    if (expandedServer === serverId) {
      setExpandedServer(null);
    } else {
      setExpandedServer(serverId);
      if (!serverTools[serverId]) {
        loadServerTools(serverId);
      }
    }
  };

  return (
    <div className={`space-y-6 ${isMobile ? "px-0" : ""}`}>
      {/* Header Info Box */}
      <div
        className={`text-xs p-3 border transition-all glass-blur opacity-80 ${isMobile ? "mx-4 border-x-0 border-y rounded-none" : "rounded-lg"}`}
        style={{
          backgroundColor: isMobile ? "var(--luca-surface-glass, var(--app-bg-tint))" : "var(--luca-surface-glass, var(--app-bg-tint))",
          borderColor: "var(--luca-border-subtle, var(--app-border-main))",
          color: "var(--app-text-muted, #94a3b8)",
        }}
      >
        <strong
          style={{
            color: theme.hex,
          }}
        >
          MCP Integration:
        </strong>{" "}
        Connect Luca to approved external tool servers and capabilities through the Model Context Protocol. Review each server carefully before enabling tool access.
      </div>

      {/* Search & Toggle Bar */}
      <div className={`flex flex-col sm:flex-row gap-4 items-center justify-between ${isMobile ? "px-4" : ""}`}>
        <div className="relative flex-1 w-full">
          <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--app-text-muted)]" />
          <LucaInput
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tool servers or capabilities..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all border rounded-lg`}
            style={{ 
              backgroundColor: "var(--luca-surface-glass, var(--app-bg-tint))",
              borderColor: "var(--luca-border-subtle, var(--app-border-main))",
              color: "var(--luca-text-primary, var(--app-text-main))"
            }}
          />
        </div>
        
        <div className={`flex p-1 rounded-xl border rounded-lg`} style={{ backgroundColor: "var(--luca-surface-glass, var(--app-bg-tint))", borderColor: "var(--luca-border-subtle, var(--app-border-main))" }}>
          <button
            onClick={() => setActiveView("active")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeView === "active" ? "text-[var(--app-text-main)] shadow-sm" : "text-[var(--app-text-muted)]"}`}
            style={activeView === "active" ? { backgroundColor: setHexAlpha(theme.hex, 0.2), color: "var(--luca-text-primary, var(--app-text-main))" } : {}}
          >
            Active
          </button>
          <button
            onClick={() => setActiveView("marketplace")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeView === "marketplace" ? "text-[var(--app-text-main)] shadow-sm" : "text-[var(--app-text-muted)]"}`}
            style={activeView === "marketplace" ? { backgroundColor: setHexAlpha(theme.hex, 0.2), color: "var(--luca-text-primary, var(--app-text-main))" } : {}}
          >
            Discover
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className={`flex flex-wrap gap-2 ${isMobile ? "px-4" : ""}`}>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all shadow-sm hover:bg-[var(--luca-surface-glass)] rounded-lg`}
          style={{
            borderColor: "var(--luca-border-strong, var(--app-border-main))",
            color: "var(--luca-text-primary, var(--app-text-main))",
            backgroundColor: "var(--luca-surface-glass, var(--app-bg-tint))"
          }}
        >
          <Icon name="Plus" className="w-4 h-4" />
          Add Advanced Server
        </button>
        <button
          onClick={handleSync}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 border rounded-lg`}
          style={{
            borderColor: "var(--luca-border-subtle, var(--app-border-main))",
            backgroundColor: "var(--luca-surface-glass, var(--app-bg-tint))",
            color: "var(--app-text-muted, #94a3b8)",
          }}
        >
          <Icon name="Refresh" className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Reconnect All
        </button>
      </div>


      {/* Add Server Form */}
      {showAddForm && (
        <div
          className={`p-4 rounded-xl space-y-4 border transition-all rounded-lg glass-blur`}
          style={{
            backgroundColor: "var(--luca-surface-glass, var(--app-bg-tint))",
            borderColor: "var(--luca-border-subtle, var(--app-border-main))",
            boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
          }}
        >
          <h4
            className={`${isMobile ? "text-sm" : "text-base"} font-bold flex items-center gap-2`}
            style={{ color: "var(--luca-text-primary, var(--app-text-main))" }}
          >
            <Icon name="Plug" variant="BoldDuotone" className="w-4 h-4" style={{ color: theme.hex }} />
            New Tool Server
          </h4>

          {/* Server Name */}
          <div>
            <label className="block text-[10px] text-[var(--app-text-muted)] mb-1">
              Server Name
            </label>
            <LucaInput
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="e.g. filesystem, github"
              className={`w-full rounded-lg px-3 py-2 text-sm placeholder-gray-600 focus:outline-none transition-all border rounded-lg`}
              style={{ 
                borderColor: "var(--luca-border-subtle, var(--app-border-main))",
                backgroundColor: "var(--luca-surface-glass, var(--app-bg-tint))",
                color: "var(--luca-text-primary, var(--app-text-main))"
              }}
            />
          </div>

          {/* Transport Type */}
          <div>
            <label className="block text-[10px] text-[var(--app-text-muted)] mb-1">
              Transport Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFormData((p) => ({ ...p, type: "stdio" }))}
                className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  formData.type === "stdio" ? "text-[var(--app-text-main)]" : "text-[var(--app-text-muted)] hover:text-[var(--app-text-main)]"
                }`}
                style={{
                  border: `1px solid ${
                    formData.type === "stdio" ? theme.hex : "var(--app-border-main)"
                  }`,
                  color: formData.type === "stdio" ? theme.hex : undefined,
                  backgroundColor: formData.type === "stdio" ? setHexAlpha(theme.hex, 0.1) : "var(--app-bg-tint)",
                }}
              >
                <Icon name="Terminal" className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">STDIO</span>
              </button>
              <button
                onClick={() => setFormData((p) => ({ ...p, type: "sse" }))}
                className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  formData.type === "sse" ? "text-[var(--app-text-main)]" : "text-[var(--app-text-muted)] hover:text-[var(--app-text-main)]"
                }`}
                style={{
                  border: `1px solid ${
                    formData.type === "sse" ? theme.hex : "var(--app-border-main)"
                  }`,
                  color: formData.type === "sse" ? theme.hex : undefined,
                  backgroundColor: formData.type === "sse" ? setHexAlpha(theme.hex, 0.1) : "var(--app-bg-tint)",
                }}
              >
                <Icon name="Globus" className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">SSE</span>
              </button>
            </div>
          </div>

          {/* STDIO Fields */}
          {formData.type === "stdio" && (
            <>
              <div>
                <label className="block text-xs text-[var(--app-text-muted)] mb-1 font-bold">
                  Command
                </label>
                <LucaInput
                  type="text"
                  value={formData.command}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, command: e.target.value }))
                  }
                  placeholder="e.g. npx, python3, node"
                  className={`w-full rounded-lg px-3 py-2 text-sm placeholder-gray-600 focus:outline-none transition-all border rounded-lg`}
                  style={{
                    backgroundColor: "var(--luca-surface-glass, var(--app-bg-tint))",
                    borderColor: "var(--luca-border-subtle, var(--app-border-main))",
                    color: "var(--luca-text-primary, var(--app-text-main))"
                  }}
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--app-text-muted)] mb-1 font-bold">
                  Arguments (space-separated)
                </label>
                <LucaInput
                  type="text"
                  value={formData.args}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, args: e.target.value }))
                  }
                  placeholder="e.g. -y @modelcontextprotocol/server-filesystem /tmp"
                  className={`w-full rounded-lg px-3 py-2 text-sm placeholder-gray-600 focus:outline-none transition-all border rounded-lg`}
                  style={{
                    backgroundColor: "var(--luca-surface-glass, var(--app-bg-tint))",
                    borderColor: "var(--luca-border-subtle, var(--app-border-main))",
                    color: "var(--luca-text-primary, var(--app-text-main))"
                  }}
                />
              </div>
            </>
          )}

          {/* SSE Fields */}
          {formData.type === "sse" && (
            <div>
              <label className="block text-[10px] text-[var(--app-text-muted)] mb-1">
                Server URL
              </label>
              <LucaInput
                type="text"
                value={formData.url}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, url: e.target.value }))
                }
                placeholder="e.g. https://mcp-server.example.com"
                className={`w-full rounded-lg px-3 py-2 text-sm placeholder-gray-600 focus:outline-none transition-all border rounded-lg`}
                style={{
                  backgroundColor: "var(--luca-surface-glass, var(--app-bg-tint))",
                  borderColor: "var(--luca-border-subtle, var(--app-border-main))",
                  color: "var(--luca-text-primary, var(--app-text-main))"
                }}
              />
            </div>
          )}

          {/* Auto Connect Toggle */}
          <div className="flex items-center justify-between">
            <span className={`text-sm text-[var(--app-text-muted)] font-bold`}>
              Auto-connect on startup
            </span>
            <button
              onClick={() =>
                setFormData((p) => ({ ...p, autoConnect: !p.autoConnect }))
              }
              className={`w-7 h-3.5 rounded-full transition-all relative ${formData.autoConnect ? "" : "bg-[var(--app-border-main)] opacity-40 hover:opacity-100"}`}
              style={{
                backgroundColor: formData.autoConnect ? theme.hex : undefined,
              }}
            >
              <div
                className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-[var(--app-bg-tint)] transition-all ${formData.autoConnect ? "translate-x-4" : "translate-x-0.5"}`}
                style={{ 
                  backgroundColor: formData.autoConnect ? "white" : "var(--app-text-muted)" 
                }}
              />
            </button>
          </div>

          {/* Advanced Section (Env Variables) */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-bold text-[var(--app-text-muted)] hover:text-[var(--app-text-muted)] transition-colors"
            >
              <Icon name="Settings" className="w-3 h-3" />
              Advanced
              {showAdvanced ? (
                <Icon name="AltArrowUp" className="w-3 h-3" />
              ) : (
                <Icon name="AltArrowDown" className="w-3 h-3" />
              )}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs text-[var(--app-text-muted)] mb-1 font-bold">
                    Environment Variables
                  </label>
                  <p className="text-xs text-[var(--app-text-muted)] mb-2 italic">
                    Pass secrets like API keys only to servers you trust (e.g.,
                    GITHUB_TOKEN)
                  </p>

                  {envVars.map((env, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <LucaInput
                        type="text"
                        value={env.key}
                        onChange={(e) => {
                          const updated = [...envVars];
                          updated[idx].key = e.target.value;
                          setEnvVars(updated);
                        }}
                        placeholder="KEY"
                        className={`flex-1 rounded-lg px-2 py-1.5 text-sm placeholder-gray-600 focus:outline-none font-mono transition-all border rounded-lg`}
                        style={{
                          backgroundColor: "var(--luca-surface-glass, var(--app-bg-tint))",
                          borderColor: "var(--luca-border-subtle, var(--app-border-main))",
                          color: "var(--luca-text-primary, var(--app-text-main))"
                        }}
                      />
                      <LucaInput
                        type="password"
                        value={env.value}
                        onChange={(e) => {
                          const updated = [...envVars];
                          updated[idx].value = e.target.value;
                          setEnvVars(updated);
                        }}
                        placeholder="value"
                        className={`flex-1 rounded-lg px-2 py-1.5 text-sm placeholder-gray-600 focus:outline-none font-mono transition-all border rounded-lg`}
                        style={{
                          backgroundColor: "var(--luca-surface-glass, var(--app-bg-tint))",
                          borderColor: "var(--luca-border-subtle, var(--app-border-main))",
                          color: "var(--luca-text-primary, var(--app-text-main))"
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEnvVars(envVars.filter((_, i) => i !== idx))
                        }
                        className="p-1.5 rounded-lg border border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] text-[var(--luca-danger,#f87171)] hover:bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]"
                      >
                        <Icon name="Trash2" className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setEnvVars([...envVars, { key: "", value: "" }])
                    }
                    className={`flex items-center gap-1 text-[12.5px] px-2 py-1 rounded transition-colors text-[var(--app-text-muted)] hover:text-[var(--app-text-main)]`}
                    style={{
                      border: `1px solid var(--app-border-main)`,
                      backgroundColor: "var(--app-bg-tint)",
                    }}
                  >
                    <Icon name="Plus" className="w-3 h-3" />
                    Add Variable
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleAddServer}
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              borderColor: setHexAlpha(theme.hex, 0.4),
              backgroundColor: setHexAlpha(theme.hex, 0.08),
              color: theme.hex,
            }}
          >
            {loading ? (
              <Icon name="Refresh" className="w-4 h-4 animate-spin" />
            ) : (
              <Icon name="Plug" variant="BoldDuotone" className="w-4 h-4" />
            )}
            Connect Tool Server
          </button>
        </div>
      )}

      {/* View Content */}
      <div className={`mcp-settings-container overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar ${isMobile ? "px-0" : ""}`}>
        {activeView === "active" ? (
          /* Server List */
          <div className="space-y-3">
            {servers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
              <div className={`text-center py-12 text-[var(--app-text-muted)] text-sm`}>
                <Icon name="Plug" className="w-8 h-8 mx-auto mb-3 opacity-30" />
                {searchQuery ? "No matching servers found." : "No connected tool servers."}
              </div>
            ) : (
              servers
                .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((server) => {
                  const isConnected = server.status === "connected";
                  const isExpanded = expandedServer === server.id;

                  return (
                    <div
                      key={server.id}
                      className={`rounded-xl overflow-hidden transition-all rounded-lg border glass-blur`}
                      style={{
                        backgroundColor: "var(--app-bg-tint, #0a0a0a)",
                        borderColor: isConnected
                          ? setHexAlpha(theme.hex, 0.4)
                          : "var(--luca-border-subtle, var(--app-border-main))",
                      }}
                    >
                      {/* Server Header */}
                      <div
                        className={`p-4 flex items-center justify-between cursor-pointer transition-colors hover:bg-[var(--luca-surface-glass)]`}
                        onClick={() => toggleExpand(server.id)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`p-2 rounded-lg ${
                              server.type === "stdio"
                                ? "bg-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_12%,transparent)]"
                                : "bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)]"
                            }`}
                          >
                            {server.type === "stdio" ? (
                              <Icon name="Terminal" className="w-4 h-4 text-[var(--luca-accent-primary,#9b7cff)]" />
                            ) : (
                              <Icon name="Globus" className="w-4 h-4 text-[var(--luca-info,#4f8cff)]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4
                              className={`text-[13.5px] font-medium truncate`}
                              style={{ color: "var(--luca-text-primary, var(--app-text-main))" }}
                            >
                              {server.name}
                            </h4>
                            <p
                              className={`text-[12.5px] truncate`}
                              style={{ color: "var(--app-text-muted, #94a3b8)" }}
                            >
                              {server.type === "stdio"
                                ? `${server.command} ${(server.args || []).join(" ")}`
                                : server.url}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Status Badge */}
                          <div
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${isMobile ? "text-xs" : "text-base"} font-bold ${
                              isConnected
                                ? "bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] text-[var(--luca-success,#4fbf7a)]"
                                : "bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] text-[var(--luca-danger,#f87171)]"
                            }`}
                          >
                            {isConnected ? (
                              <Icon name="CheckCircle" className="w-3 h-3" />
                            ) : (
                              <Icon name="XCircle" className="w-3 h-3" />
                            )}
                            {isConnected ? "ONLINE" : "OFFLINE"}
                          </div>

                          {/* Tool Count */}
                          {isConnected && server.toolCount !== undefined && (
                            <div className="text-base text-[var(--app-text-muted)] hidden sm:block">
                              {server.toolCount} tools
                            </div>
                          )}

                          {/* Expand Arrow */}
                          {isExpanded ? (
                            <Icon name="AltArrowUp" className="w-4 h-4 text-[var(--app-text-muted)]" />
                          ) : (
                            <Icon name="AltArrowDown" className="w-4 h-4 text-[var(--app-text-muted)]" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div
                          className="px-4 pb-4 pt-0 space-y-3"
                          style={{ borderTop: `1px solid var(--app-border-main)` }}
                        >
                          {/* Tools List */}
                          <div>
                            <h5 className={`text-[12.5px] text-[var(--app-text-muted)] mb-2 flex items-center gap-1`}>
                              <Icon name="Wrench" className="w-3 h-3" />
                              Available Capabilities
                            </h5>
                            {serverTools[server.id] ? (
                              serverTools[server.id].length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {serverTools[server.id].map((tool: any) => (
                                    <span
                                      key={tool.name}
                                      className={`px-2 py-0.5 rounded-md text-[11.5px] border`}
                                      style={{
                                        borderColor: "var(--luca-border-subtle, var(--app-border-main))",
                                        backgroundColor: "var(--luca-surface-glass, var(--app-bg-tint))",
                                        color: "var(--luca-text-primary, var(--app-text-main))"
                                      }}
                                    >
                                      {tool.name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-[var(--app-text-muted)]">
                                  No tools found
                                </span>
                              )
                            ) : (
                              <span className="text-xs text-[var(--app-text-muted)]">
                                Loading...
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveServer(server.id);
                              }}
                              className="flex-1 py-2 rounded-lg text-[12.5px] font-medium border border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] text-[var(--luca-danger,#f87171)] hover:bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] transition-colors flex items-center justify-center gap-2"
                            >
                              <Icon name="Trash2" className="w-3 h-3" />
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        ) : (
          /* Marketplace View — Live Registry */
          <div className="space-y-4">
            {/* Offline fallback notice */}
            {registryError && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)] border border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] text-[var(--luca-warning,#f2b23e)]`}>
                <Icon name="AlertTriangle" className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Registry offline — showing curated selection.</span>
                <button onClick={() => fetchRegistry(searchDebounce)} className="ml-auto underline text-xs opacity-70 hover:opacity-100">Retry</button>
              </div>
            )}

            {/* Live source badge */}
            {!registryError && registryServers.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] animate-pulse" />
                <span className="text-xs text-[var(--app-text-muted)]">Live · registry.modelcontextprotocol.io</span>
              </div>
            )}

            {/* Skeleton loader */}
            {registryLoading && registryServers.length === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={`p-4 rounded-2xl border animate-pulse bg-[var(--app-bg-tint)] border-[var(--app-border-main)]`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--luca-surface-glass)]" />
                      <div className="w-16 h-5 rounded-full bg-[var(--luca-surface-glass)]" />
                    </div>
                    <div className="h-4 rounded bg-[var(--luca-surface-glass)] mb-2 w-2/3" />
                    <div className="h-3 rounded bg-[var(--luca-surface-glass)] mb-1" />
                    <div className="h-3 rounded bg-[var(--luca-surface-glass)] w-4/5 mb-4" />
                    <div className="h-8 rounded-xl bg-[var(--luca-surface-glass)]" />
                  </div>
                ))}
              </div>
            )}

            {/* Results grid — live or curated fallback */}
            {(() => {
              const displayList = registryError || registryServers.length === 0
                ? MARKETPLACE_SERVERS.filter(m =>
                    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    m.category.toLowerCase().includes(searchQuery.toLowerCase()))
                : registryServers;

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayList.map((item) => {
                    const isInstalled = servers.some(s => s.name.toLowerCase() === item.name.toLowerCase());
                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border transition-all relative overflow-hidden group bg-[var(--app-bg-tint)] border-[var(--app-border-main)] rounded-lg`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2.5 rounded-2xl" style={{ backgroundColor: setHexAlpha(item.color, 0.15) }}>
                            {item.iconUrl ? (
                              <img src={item.iconUrl} alt={item.name} className="w-7 h-7 rounded-lg object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <Icon name={item.icon as any} className="w-6 h-6" style={{ color: item.color }} />
                            )}
                          </div>
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: setHexAlpha(item.color, 0.12), color: item.color }}
                          >
                            {item.isLive ? "Live" : item.category}
                          </span>
                        </div>

                        <h4 className={`text-base font-medium mb-1 truncate`} style={{ color: "var(--luca-text-primary, var(--app-text-main))" }}>
                          {item.name}
                        </h4>
                        <p className={`text-sm leading-snug mb-4 line-clamp-2`} style={{ color: "var(--app-text-muted, #94a3b8)" }}>
                          {item.description}
                        </p>

                        <button
                          onClick={() => installFromMarketplace(item)}
                          disabled={isInstalled}
                          className={`w-full py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 border ${isInstalled ? "opacity-30 cursor-default" : "bg-[var(--luca-surface-glass)] border-[var(--luca-border-subtle)] hover:bg-[var(--luca-surface-hover)]"}`}
                          style={!isInstalled ? { borderColor: setHexAlpha(item.color, 0.3), color: item.color } : {}}
                        >
                          {isInstalled ? (
                            <><Icon name="Check" className="w-3.5 h-3.5" />Added</>
                          ) : (
                            <><Icon name="Plus" className="w-3.5 h-3.5" />Add</>
                          )}
                        </button>

                        <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none" style={{ backgroundColor: item.color }} />
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Load More */}
            {!registryError && nextCursor && (
              <button
                onClick={() => fetchRegistry(searchDebounce, nextCursor)}
                disabled={registryLoading}
                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all border flex items-center justify-center gap-2 disabled:opacity-50 bg-[var(--app-bg-tint)] border-[var(--app-border-main)] text-[var(--app-text-muted)] hover:bg-[var(--luca-surface-glass)]`}
              >
                {registryLoading ? <Icon name="Refresh" className="w-3.5 h-3.5 animate-spin" /> : <Icon name="AltArrowDown" className="w-3.5 h-3.5" />}
                {registryLoading ? "Loading..." : "Load More"}
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default SettingsMCPTab;
