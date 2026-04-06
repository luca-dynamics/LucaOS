import React, { useState } from "react";
import { Icon } from "../ui/Icon";
import { MarketplacePlugin } from "../../data/directoryData";
import { ThemeColors } from "../../types/lucaPersonality";

export const PluginsTab: React.FC<{
  colors: ThemeColors;
  curatedPlugins: MarketplacePlugin[];
  onInstall: (p: MarketplacePlugin) => void;
}> = ({ colors, curatedPlugins, onInstall }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<"Official" | "Marketplace">("Official");

  const filtered = curatedPlugins.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

        {/* Search */}
        <div className="relative flex-1">
          <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={15} />
          <input
            type="text"
            placeholder={activeView === "Official" ? "Search plugins..." : "Discover community plugins..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none transition-all placeholder:text-slate-600"
            style={{
              borderColor: searchQuery ? `${colors.accent}40` : "rgba(255,255,255,0.08)",
            }}
          />
        </div>
      </div>

      {/* Content */}
      {activeView === "Marketplace" ? (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
           <Icon name="Widget6" size={40} className="mb-3 text-slate-600" variant="BoldDuotone" />
           <p className="text-gray-400 text-sm font-medium">Community Marketplace Coming Soon</p>
           <p className="text-slate-600 text-xs mt-1">Extended bundles are currently in verification.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(plugin => (
            <PluginCard 
              key={plugin.id} 
              plugin={plugin} 
              onInstall={() => onInstall(plugin)} 
              accentColor={colors.accent}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Settings-style row card for plugins ──
export const PluginCard: React.FC<{
  plugin: MarketplacePlugin;
  onInstall: () => void;
  accentColor: string;
}> = ({ plugin, onInstall, accentColor }) => {

  return (
    <div className="flex items-center gap-4 bg-[#111111] border border-white/10 rounded-lg p-4 transition-colors hover:bg-white/[0.04]">
      {/* Icon */}
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-white/5"
        style={{ backgroundColor: `${plugin.color}08` }}
      >
        <Icon name={plugin.icon as any} size={18} style={{ color: plugin.color }} variant="BoldDuotone" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-bold truncate">{plugin.name}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 font-bold shrink-0">
            {plugin.category}
          </span>
        </div>
        <p className="text-slate-500 text-xs leading-relaxed mt-0.5 line-clamp-1">
          {plugin.description}
        </p>
      </div>

      {/* Meta + Action */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-3 text-[10px] text-slate-600 font-mono">
          <span>{plugin.skills.length} skills</span>
          <span className="opacity-30">•</span>
          <span>{plugin.connectors.length} connector{plugin.connectors.length !== 1 ? "s" : ""}</span>
        </div>
        
        <button
          onClick={onInstall}
          className="px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5"
          style={{ 
            backgroundColor: `${accentColor}10`,
            color: accentColor,
            border: `1px solid ${accentColor}20`
          }}
        >
          <Icon name="Widget6" size={12} />
          Activate
        </button>
      </div>
    </div>
  );
};
