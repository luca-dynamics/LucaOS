import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { MarketplaceServer } from "../../data/directoryData";
import { ThemeColors } from "../../types/lucaPersonality";
import { apiUrl } from "../../config/api";

const MCP_REGISTRY_URL = "/api/mcp/registry";

export const ConnectorsTab: React.FC<{
  colors: ThemeColors;
  curatedConnectors: MarketplaceServer[];
  onInstall: (c: MarketplaceServer) => void;
}> = ({ colors, curatedConnectors, onInstall }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<"Official" | "Marketplace">("Official");
  const [platformFilter, setPlatformFilter] = useState<"All" | "Desktop" | "Web">("All");
  const [registryServers, setRegistryServers] = useState<MarketplaceServer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapRegistryServer = (s: any): MarketplaceServer => {
    const remote = s.server?.remotes?.[0];
    const type: "stdio" | "sse" = "sse";
    const url = remote?.url || "";
    const iconUrl = s.server?.icons?.[0]?.src;
    const name = s.server?.title || s.server?.name?.split("/").pop() || s.server?.name || "Unknown";
    const connectorColors = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"];
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
      color: connectorColors[hash % connectorColors.length],
      isLive: true,
    };
  };

  const fetchRegistry = async (query: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "40" });
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(apiUrl(`${MCP_REGISTRY_URL}?${params}`));
      if (!res.ok) throw new Error(`Registry returned ${res.status}`);
      const data = await res.json();
      const mapped: MarketplaceServer[] = (data.servers || []).map(mapRegistryServer);
      setRegistryServers(mapped);
    } catch (e: any) {
      console.warn("[MCP Registry] Registry fetch failed:", e.message);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === "Marketplace") {
      fetchRegistry(searchQuery);
    }
  }, [activeView]);

  // Platform mapping: stdio = Desktop only, sse = Web (works everywhere)
  const getPlatform = (c: MarketplaceServer): "Desktop" | "Web" => c.type === "stdio" ? "Desktop" : "Web";

  const displayed = (activeView === "Official" 
    ? curatedConnectors.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.description.toLowerCase().includes(searchQuery.toLowerCase()))
    : registryServers
  ).filter(c => platformFilter === "All" || getPlatform(c) === platformFilter);

  return (
    <div className="flex flex-col h-full space-y-5">
      {/* Controls Row */}
      <div className="flex items-center gap-3">
        {/* View Switcher */}
        <div className="flex p-0.5 rounded-lg bg-white/[0.03] border border-white/10">
          <button 
            onClick={() => setActiveView("Official")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeView === "Official" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}
            style={activeView === "Official" ? { color: colors.accent } : {}}
          >
            Official
          </button>
          <button 
            onClick={() => setActiveView("Marketplace")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeView === "Marketplace" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}
            style={activeView === "Marketplace" ? { color: colors.accent } : {}}
          >
            Marketplace
          </button>
        </div>

        {/* Platform Filter */}
        <div className="flex p-0.5 rounded-lg bg-white/[0.03] border border-white/10">
          {(["All", "Desktop", "Web"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${platformFilter === p ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}
              style={platformFilter === p ? { color: colors.accent } : {}}
            >
              {p === "Desktop" && <Icon name="Monitor" size={12} />}
              {p === "Web" && <Icon name="Globus" size={12} />}
              {p}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={15} />
          <input
            type="text"
            placeholder={`Search ${activeView === "Official" ? "official" : "ecosystem"} connectors...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && activeView === "Marketplace" && fetchRegistry(searchQuery)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none transition-all placeholder:text-slate-600"
            style={{
              borderColor: searchQuery ? `${colors.accent}40` : "rgba(255,255,255,0.08)",
            }}
          />
          {activeView === "Marketplace" && (
            <button 
              onClick={() => fetchRegistry(searchQuery)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded text-slate-500 transition-colors"
            >
              <Icon name="Search" size={12} className={isLoading ? "animate-spin" : ""} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Icon name="Plug" size={24} className="animate-spin" style={{ color: colors.accent }} variant="BoldDuotone" />
          <p className="text-slate-500 text-xs mt-3">Syncing registry...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-red-500/10 rounded-lg bg-red-500/[0.02]">
          <Icon name="CloseCircle" size={28} className="text-red-500/50 mb-3" />
          <p className="text-red-400 text-sm font-medium">Connection failed</p>
          <p className="text-slate-500 text-[10px] mt-1 font-mono">{error}</p>
          <button onClick={() => fetchRegistry(searchQuery)} className="mt-3 px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-xs font-medium hover:bg-white/10">Retry</button>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(connector => (
            <ConnectorCard 
              key={connector.id} 
              connector={connector} 
              onInstall={() => onInstall(connector)} 
              accentColor={colors.accent}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Settings-style row card for connectors ──
export const ConnectorCard: React.FC<{
  connector: MarketplaceServer;
  onInstall: () => void;
  accentColor: string;
}> = ({ connector, onInstall, accentColor }) => {
  const platform = connector.type === "stdio" ? "Desktop" : "Web";

  return (
    <div className="flex items-center gap-4 bg-[#111111] border border-white/10 rounded-lg p-4 transition-colors hover:bg-white/[0.04]">
      {/* Icon */}
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-white/5"
        style={{ backgroundColor: `${connector.color}08` }}
      >
        {connector.iconUrl ? (
          <img src={connector.iconUrl} alt="" className="w-7 h-7 object-contain" />
        ) : (
          <Icon name={connector.icon as any} size={18} style={{ color: connector.color }} variant="BoldDuotone" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-bold truncate">{connector.name}</span>
          {connector.category && connector.category !== "Other" && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 font-bold shrink-0">
              {connector.category}
            </span>
          )}
        </div>
        <p className="text-slate-500 text-xs leading-relaxed mt-0.5 line-clamp-1">
          {connector.description}
        </p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Platform Badge */}
        <div 
          className="flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-medium"
          style={{
            backgroundColor: platform === "Desktop" ? "rgba(245, 158, 11, 0.06)" : "rgba(34, 197, 94, 0.06)",
            borderColor: platform === "Desktop" ? "rgba(245, 158, 11, 0.15)" : "rgba(34, 197, 94, 0.15)",
            color: platform === "Desktop" ? "#f59e0b" : "#22c55e",
          }}
        >
          <Icon name={platform === "Desktop" ? "Monitor" : "Globus"} size={11} />
          {platform}
        </div>

        {/* Protocol tag */}
        <span className="text-[10px] font-mono text-slate-600">
          {connector.type.toUpperCase()}
        </span>
        
        <button
          onClick={onInstall}
          className="px-3 py-1.5 rounded-md text-xs font-bold transition-all"
          style={{ 
            backgroundColor: `${accentColor}10`,
            color: accentColor,
            border: `1px solid ${accentColor}20`
          }}
        >
          Bridge
        </button>
      </div>
    </div>
  );
};
