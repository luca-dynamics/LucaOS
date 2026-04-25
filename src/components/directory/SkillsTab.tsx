import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { CustomSkill } from "../../types";
import { ThemeColors } from "../../types/lucaPersonality";
import { MarketplaceSkill, MARKETPLACE_CATEGORIES } from "../../data/directoryData";
import { apiUrl } from "../../config/api";

const COMMUNITY_REGISTRY_URL = "https://raw.githubusercontent.com/majiayu000/claude-skill-registry/main/registry.json";

export const SkillsTab: React.FC<{
  skills: CustomSkill[];
  colors: ThemeColors;
  loading: boolean;
  onExecute: (name: string, args: any) => void;
  onPreview: (skill: CustomSkill) => void;
  marketplaceSkills: MarketplaceSkill[];
  onInstalled: () => void;
}> = ({ skills, colors, loading, onExecute, onPreview, marketplaceSkills, onInstalled }) => {
  const [activeView, setActiveView] = useState<"Installed" | "Marketplace">("Installed");
  
  // Marketplace state
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeRegistry, setActiveRegistry] = useState<"Official" | "Community">("Official");
  const [communitySkills, setCommunitySkills] = useState<MarketplaceSkill[]>([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [justInstalled, setJustInstalled] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (activeView === "Marketplace" && activeRegistry === "Community" && communitySkills.length === 0) {
      fetchCommunitySkills();
    }
  }, [activeView, activeRegistry]);

  const fetchCommunitySkills = async () => {
    setIsLoadingCommunity(true);
    setCommunityError(null);
    try {
      const res = await fetch(COMMUNITY_REGISTRY_URL);
      if (!res.ok) throw new Error(`Registry returned ${res.status}`);
      const data = await res.json();
      
      const mapped: MarketplaceSkill[] = (data.skills || []).map((s: { 
        name: string; 
        description: string; 
        category: string; 
        repo: string; 
        branch?: string; 
        path: string; 
        stars: number;
      }) => ({
        id: s.name,
        name: s.name.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        description: s.description,
        icon: getCategoryIcon(s.category),
        category: s.category || "General",
        language: "node",
        author: s.repo.split("/")[0],
        version: s.branch || "main",
        inputs: [],
        isVerified: s.stars > 5000,
        isPopular: s.stars > 1000,
        code: `https://raw.githubusercontent.com/${s.repo}/${s.branch || "main"}/${s.path}`
      }));

      setCommunitySkills(mapped);
    } catch (e: any) {
      console.error("[Skills Marketplace] Community fetch failed:", e);
      setCommunityError(e.message);
    } finally {
      setIsLoadingCommunity(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    const map: Record<string, string> = {
      "devops": "🚀",
      "testing": "🧪",
      "development": "💻",
      "ui": "🎨",
      "security": "🛡️",
      "data": "📊",
      "automation": "🤖"
    };
    return map[cat?.toLowerCase()] || "📦";
  };

  const getSlug = (name: string) => name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const installedSlugs = new Set(
    skills.map((s) => getSlug(s.name))
  );

  const handleInstall = async (skill: MarketplaceSkill) => {
    setInstallingId(skill.id);
    try {
      let finalCode = skill.code;
      if (skill.code.startsWith("http")) {
        const codeRes = await fetch(skill.code);
        if (codeRes.ok) {
           finalCode = await codeRes.text();
        }
      }

      const res = await fetch(apiUrl("/api/skills/create"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: skill.name,
          description: skill.description,
          code: finalCode,
          language: skill.language,
          inputs: skill.inputs,
          version: skill.version,
          format: "agent-skills",
        }),
      });

      if (res.ok) {
        setJustInstalled((prev) => new Set(prev).add(skill.id));
        onInstalled();
      } else {
        const data = await res.json();
        alert(data.error || "Installation failed");
      }
    } catch (e: any) {
      alert("Installation failed: " + e.message);
    } finally {
      setInstallingId(null);
    }
  };

  const isInstalled = (skill: MarketplaceSkill) => {
    const slug = getSlug(skill.name);
    return (
      installedSlugs.has(skill.id) ||
      installedSlugs.has(slug) ||
      justInstalled.has(skill.id)
    );
  };

  const currentRegistrySkills = activeRegistry === "Official" ? marketplaceSkills : communitySkills;

  const filteredMarketplace = currentRegistrySkills.filter((skill) => {
    const matchesSearch =
      !search.trim() ||
      skill.name.toLowerCase().includes(search.toLowerCase()) ||
      skill.description.toLowerCase().includes(search.toLowerCase()) ||
      skill.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || skill.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredInstalled = skills.filter((skill) => 
    !search.trim() || 
    skill.name.toLowerCase().includes(search.toLowerCase()) || 
    skill.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-5">
      {/* Controls Row */}
      <div className="flex items-center gap-3">
        {/* View Switcher */}
        <div className="flex p-0.5 rounded-lg bg-white/[0.03] border border-white/10">
          <button 
            onClick={() => setActiveView("Installed")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeView === "Installed" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}
            style={activeView === "Installed" ? { color: colors.accent } : {}}
          >
            Installed
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
            placeholder={activeView === "Installed" ? "Search installed skills..." : "Discover new capabilities..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none transition-all placeholder:text-slate-600"
            style={{
              borderColor: search ? `${colors.accent}40` : "rgba(255,255,255,0.08)",
            }}
          />
        </div>
        
        {activeView === "Marketplace" && (
          <div className="flex p-0.5 rounded-lg bg-white/[0.03] border border-white/10">
            <button
              onClick={() => setActiveRegistry("Official")}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider transition-all ${activeRegistry === "Official" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}
            >
              Official
            </button>
            <button
              onClick={() => setActiveRegistry("Community")}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider transition-all ${activeRegistry === "Community" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}
            >
              Community
            </button>
          </div>
        )}
      </div>

      {/* Category Filters (Marketplace only) */}
      {activeView === "Marketplace" && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {MARKETPLACE_CATEGORIES.map((cat: string) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="px-3 py-1 rounded-md text-[10px] font-bold whitespace-nowrap transition-all border"
              style={{
                backgroundColor: selectedCategory === cat ? `${colors.accent}15` : "transparent",
                borderColor: selectedCategory === cat ? `${colors.accent}40` : "rgba(255,255,255,0.05)",
                color: selectedCategory === cat ? colors.accent : "#64748b",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading && skills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Icon name="Settings" className="animate-spin text-slate-600 mb-4" size={24} />
          <p className="text-slate-500 text-xs">Loading skills...</p>
        </div>
      ) : activeView === "Installed" ? (
        filteredInstalled.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
            <Icon name="Code" size={40} className="mb-3 text-slate-600" variant="BoldDuotone" />
            <p className="text-gray-400 text-sm font-medium">No skills installed</p>
            <button 
              onClick={() => setActiveView("Marketplace")}
              className="mt-3 text-xs font-medium hover:underline"
              style={{ color: colors.accent }}
            >
               Browse Marketplace →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredInstalled.map((skill, i) => (
              <SkillCard
                key={i}
                skill={skill}
                colors={colors}
                onExecute={onExecute}
                onPreview={onPreview}
              />
            ))}
          </div>
        )
      ) : (
        <div className="space-y-2">
           {activeRegistry === "Community" && isLoadingCommunity ? (
             <div className="flex flex-col items-center justify-center py-20 text-center">
               <Icon name="Search" size={24} className="animate-spin" style={{ color: colors.accent }} />
               <p className="text-slate-500 text-xs mt-3">Syncing community registry...</p>
             </div>
           ) : communityError && activeRegistry === "Community" ? (
             <div className="flex flex-col items-center justify-center py-16 text-center border border-red-500/10 rounded-lg bg-red-500/[0.02]">
                <Icon name="CloseCircle" size={28} className="text-red-500/50 mb-3" />
                <p className="text-red-400 text-sm font-medium">Registry sync failed</p>
                <p className="text-slate-600 text-[10px] mt-1 font-mono max-w-xs">{communityError}</p>
                <button onClick={fetchCommunitySkills} className="mt-3 px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-xs font-medium hover:bg-white/10">Retry</button>
             </div>
           ) : (
             filteredMarketplace.map((skill) => (
               <MarketplaceSkillCard
                 key={skill.id}
                 skill={skill}
                 colors={colors}
                 installed={isInstalled(skill)}
                 installing={installingId === skill.id}
                 onInstall={() => handleInstall(skill)}
               />
             ))
           )}
        </div>
      )}
    </div>
  );
};

// ── Settings-style row card for installed skills ──
export const SkillCard: React.FC<{
  skill: CustomSkill;
  colors: ThemeColors;
  onExecute: (name: string, args: any) => void;
  onPreview: (skill: CustomSkill) => void;
}> = ({ skill, colors, onExecute, onPreview }) => {

  return (
    <div
      className="flex items-center gap-4 bg-[#111111] border border-white/10 rounded-lg p-4 transition-colors hover:bg-white/[0.04] cursor-pointer"
      onClick={() => onPreview(skill)}
    >
      {/* Icon */}
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-white/5"
        style={{ backgroundColor: `${colors.accent}08` }}
      >
        {skill.icon ? (
           <span className="text-lg">{skill.icon}</span>
        ) : (
          <Icon name="Code" size={18} style={{ color: colors.accent }} variant="BoldDuotone" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-bold truncate">{skill.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 font-mono shrink-0">
            v{skill.version || "1.0.0"}
          </span>
        </div>
        <p className="text-slate-500 text-xs leading-relaxed mt-0.5 line-clamp-1">
          {skill.description}
        </p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 shrink-0">
        {(skill.inputs || []).length > 0 && (
          <span className="text-[10px] text-slate-600 font-mono">
            {(skill.inputs || []).length} inputs
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExecute(skill.name, {});
          }}
          className="px-3 py-1.5 rounded-md text-xs font-bold transition-all"
          style={{ 
            backgroundColor: `${colors.accent}10`,
            color: colors.accent,
            border: `1px solid ${colors.accent}20`
          }}
        >
          Run
        </button>
      </div>
    </div>
  );
};

// ── Settings-style row card for marketplace skills ──
export const MarketplaceSkillCard: React.FC<{
  skill: MarketplaceSkill;
  colors: ThemeColors;
  installed: boolean;
  installing: boolean;
  onInstall: () => void;
}> = ({ skill, colors, installed, installing, onInstall }) => {

  return (
    <div className="flex items-center gap-4 bg-[#111111] border border-white/10 rounded-lg p-4 transition-colors hover:bg-white/[0.04]">
      {/* Icon */}
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-white/5"
        style={{ backgroundColor: `${colors.accent}08` }}
      >
        <span className="text-lg">{skill.icon}</span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-bold truncate">{skill.name}</span>
          {skill.isVerified && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold shrink-0">
              Official
            </span>
          )}
          {skill.isPopular && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold shrink-0">
              Popular
            </span>
          )}
        </div>
        <p className="text-slate-500 text-xs leading-relaxed mt-0.5 line-clamp-1">
          {skill.description}
        </p>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right hidden sm:block">
          <div className="text-[10px] text-slate-500 font-mono">v{skill.version}</div>
          <div className="text-[10px] text-slate-600">{skill.author}</div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!installed && !installing) onInstall();
          }}
          disabled={installed || installing}
          className="px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5"
          style={{ 
            backgroundColor: installed ? "rgba(34, 197, 94, 0.1)" : installing ? "rgba(255,255,255,0.05)" : `${colors.accent}10`,
            color: installed ? "#4ade80" : installing ? "#94a3b8" : colors.accent,
            border: `1px solid ${installed ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)"}`
          }}
        >
          {installed ? (
            <>
              <Icon name="Check" size={12} />
              Installed
            </>
          ) : installing ? (
            <>
              <Icon name="Settings" size={12} className="animate-spin" />
              Syncing
            </>
          ) : (
            <>
              <Icon name="Download" size={12} />
              Add
            </>
          )}
        </button>
      </div>
    </div>
  );
};
