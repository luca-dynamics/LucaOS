import React, { useState, useEffect, useMemo } from "react";
import { Icon } from "../ui/Icon";
import { memoryService } from "../../services/memoryService";
import { MemoryNode } from "../../types";
import { cortexUrl } from "../../config/api";
interface SettingsDataTabProps {
  theme?: any;
  memoryStats: { count: number };
  loadMemoryStats: () => void;
  isMobile?: boolean;
}

const SettingsDataTab: React.FC<SettingsDataTabProps> = ({
  memoryStats,
  loadMemoryStats,
  isMobile,
}) => {
  const [memories, setMemories] = useState<MemoryNode[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllMemories();
  }, []);

  const loadAllMemories = () => {
    setLoading(true);
    const allMems = memoryService.getAllMemories();
    // Sort by timestamp descending
    setMemories([...allMems].sort((a, b) => b.timestamp - a.timestamp));
    setLoading(false);
    loadMemoryStats();
  };

  const deleteMemory = (id: string) => {
    if (confirm("Permanently delete this memory?")) {
      const allMems = memoryService.getAllMemories();
      const updated = allMems.filter((m) => m.id !== id);
      localStorage.setItem("LUCA_LUCA_ARCHIVE_V1", JSON.stringify(updated));

      // Also notify backend if possible
      fetch(cortexUrl("/api/memory/save"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      }).catch(() => {});

      loadAllMemories();
    }
  };

  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      const matchesSearch =
        m.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.value.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === "ALL" || m.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [memories, searchQuery, categoryFilter]);

  const categories = [
    "ALL",
    "SEMANTIC",
    "USER_STATE",
    "SESSION_STATE",
    "AGENT_STATE",
  ];

  return (
    <div className={`space-y-6 flex flex-col h-full ${isMobile ? "px-0" : ""}`}>
      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className={`p-4 rounded-lg flex items-center justify-between ${isMobile ? "border-x-0 border-y rounded-none bg-white/5" : "bg-[var(--app-bg-tint)] rounded-lg"} tech-border glass-blur shadow-sm transition-all`}
        >
          <div>
            <h3 className="text-xs uppercase tracking-wider text-[var(--app-text-muted)] font-bold mb-1 opacity-60">
              Total Facts
            </h3>
            <div
              className="text-2xl font-mono leading-none text-[var(--app-text-main)]"
            >
              {memoryStats.count}
            </div>
          </div>
          <Icon name="Database" variant="BoldDuotone" className="w-8 h-8 opacity-20 text-[var(--app-text-main)]" />
        </div>

        <div
          className={`p-4 rounded-lg space-y-2 ${isMobile ? "border-x-0 border-y rounded-none bg-white/5" : "bg-[var(--app-bg-tint)] rounded-lg"} tech-border glass-blur shadow-sm transition-all`}
        >
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(memories, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `luca_memory_dump_${Date.now()}.json`;
              a.click();
            }}
            className={`w-full flex items-center gap-2 text-sm font-bold text-[var(--app-text-muted)] hover:text-[var(--app-text-main)] transition-colors`}
          >
            <Icon name="Download" className="w-3.5 h-3.5 text-[var(--app-text-main)]" /> Export JSON
          </button>
          <button
            onClick={() => {
              if (
                confirm(
                  "DANGER: Wiping memory will erase everything Luca has learned. Continue?",
                )
              ) {
                memoryService.wipeMemory();
                loadAllMemories();
              }
            }}
            className="w-full flex items-center gap-2 text-sm font-bold text-red-500/70 hover:text-red-400 transition-colors"
          >
            <Icon name="Trash2" className="w-3.5 h-3.5" /> Wipe Store
          </button>
        </div>
      </div>

      {/* Memory Explorer */}
      <div
        className={`flex-1 flex flex-col min-h-0 overflow-hidden ${isMobile ? "border-x-0 border-y rounded-none bg-white/5" : "rounded-lg bg-[var(--app-bg-tint)]"} tech-border glass-blur`}
      >
        <div
          className={`p-3 border-b flex flex-wrap gap-2 items-center justify-between border-[var(--app-border-main)] bg-white/5 opacity-90`}
        >
          <div className="relative flex-1 min-w-[200px]">
            <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--app-text-muted)] opacity-60" />
            <input
              type="text"
              placeholder="Search facts, concepts, entities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full bg-[var(--app-bg-tint)] text-[var(--app-text-main)] rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none transition-all shadow-sm tech-border`}
            />
          </div>

          <div className="flex items-center gap-2">
            <Icon name="Filter" className="w-4 h-4 text-[var(--app-text-muted)] opacity-60" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`bg-[var(--app-bg-tint)] text-[var(--app-text-main)] rounded-lg px-3 py-1.5 text-xs focus:outline-none transition-all shadow-sm font-bold tech-border`}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace("_", " ")}
                </option>
              ))}
            </select>
            <button
              onClick={loadAllMemories}
              className={`p-2 rounded-lg hover:bg-white/10 text-[var(--app-text-muted)] hover:text-[var(--app-text-main)] transition-all outline-none border border-transparent hover:border-[var(--app-border-main)]`}
            >
              <Icon
                name="Refresh"
                className={`w-4 h-4 ${loading ? "animate-spin text-[var(--app-text-main)]" : ""}`}
              />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center opacity-50 space-y-2 py-10">
              <Icon name="Refresh" className="w-8 h-8 animate-spin text-[var(--app-text-main)]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--app-text-muted)]">
                Accessing Index...
              </span>
            </div>
          ) : filteredMemories.length > 0 ? (
            filteredMemories.map((m) => (
              <div
                key={m.id}
                className={`group p-4 relative overflow-hidden transition-all ${isMobile ? "border-x-0 border-b rounded-none" : "rounded-lg bg-[var(--app-bg-tint)] shadow-sm"} tech-border glass-blur`}
              >
                {/* Delete Button */}
                <div className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => deleteMemory(m.id)}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-[var(--app-text-muted)] hover:text-red-400 transition-all border border-transparent hover:border-red-500/30 shadow-sm"
                    title="Delete memory"
                  >
                    <Icon name="Trash" className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-start gap-4">
                  <div
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.2)] ${
                      m.category === "SEMANTIC"
                        ? "bg-blue-500"
                        : m.category === "USER_STATE"
                          ? "bg-purple-500"
                          : m.category === "SESSION_STATE"
                            ? "bg-amber-500"
                            : "bg-green-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-bold text-[var(--app-text-main)] mb-1 flex flex-wrap items-center gap-2`}
                    >
                      <span className="truncate">{m.key}</span>
                      {m.metadata?.source && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-[var(--app-border-main)] text-[var(--app-text-muted)] opacity-80`}
                        >
                          {m.metadata.source}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm text-[var(--app-text-muted)] leading-relaxed break-words opacity-90`}
                    >
                      {m.value}
                    </p>
                    <div className="mt-3 flex items-center gap-4 text-[10px] text-[var(--app-text-muted)] opacity-60 font-bold uppercase tracking-tighter">
                      <span className="flex items-center gap-1.5">
                        <Icon name="Clock" className="w-3 h-3 text-[var(--app-text-muted)]" />
                        {new Date(m.timestamp).toLocaleString()}
                      </span>
                      <span className="bg-white/5 px-2 py-0.5 rounded">
                        {m.category.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-30 py-12">
              <Icon name="Database" variant="BoldDuotone" className="w-16 h-16 mb-4 text-[var(--app-text-main)] opacity-20" />
              <p className="text-lg font-bold text-[var(--app-text-main)]">No Memories Found</p>
              <p className="text-sm text-[var(--app-text-muted)] mt-1">
                Try a different search or connect more knowledge.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Session Cleanup */}
      <div
        className={`p-4 flex items-center justify-between mt-auto tech-border glass-blur shadow-sm ${isMobile ? "border-x-0 border-y rounded-none bg-red-500/5 mx-0" : "rounded-lg bg-amber-500/10 mx-auto"}`}
      >
        <div className="flex items-center gap-4">
          <Icon name="Logout" className="w-5 h-5 text-amber-500 opacity-80" />
          <div>
            <div
              className={`text-sm font-bold text-[var(--app-text-main)] uppercase tracking-widest`}
            >
              Active Session
            </div>
            <div
              className={`text-xs text-[var(--app-text-muted)] italic opacity-60`}
            >
              Clear chat history and active short-term state
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            if (
              confirm(
                "Clear active chat session? (Long-term memory will be preserved)",
              )
            ) {
              localStorage.removeItem("LUCA_CHAT_HISTORY_V1");
              window.location.reload();
            }
          }}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all bg-[var(--app-bg-tint)] text-[var(--app-text-muted)] shadow-sm tech-border glass-blur`}
        >
          Reset Session
        </button>
      </div>
    </div>
  );
};

export default SettingsDataTab;
