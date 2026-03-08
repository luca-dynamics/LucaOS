import React, { useState, useEffect, useMemo } from "react";
import {
  Download,
  Trash2,
  LogOut,
  Search,
  Database,
  Clock,
  RefreshCw,
  Filter,
  Trash,
} from "lucide-react";
import { memoryService } from "../../services/memoryService";
import { MemoryNode } from "../../types";
import { cortexUrl } from "../../config/api";

interface SettingsDataTabProps {
  memoryStats: { count: number };
  loadMemoryStats: () => void;
  theme: {
    primary: string;
    hex: string;
    themeName: string;
  };
}

const SettingsDataTab: React.FC<SettingsDataTabProps> = ({
  memoryStats,
  loadMemoryStats,
  theme,
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
    <div className="space-y-6 flex flex-col h-full">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className={`${theme.themeName === "lucagent" ? "glass-panel-light border-black/10 shadow-sm" : "bg-white/5 border-white/10 backdrop-blur-sm"} p-4 rounded-xl flex items-center justify-between border`}
        >
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">
              Total Facts
            </h3>
            <div
              className="text-2xl font-mono leading-none"
              style={{ color: theme.hex }}
            >
              {memoryStats.count}
            </div>
          </div>
          <Database className="w-8 h-8 opacity-20" />
        </div>

        <div
          className={`${theme.themeName === "lucagent" ? "glass-panel-light border-black/10" : "bg-white/5 border-white/10"} p-4 rounded-xl space-y-2 border`}
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
            className={`w-full flex items-center gap-2 text-[10px] font-bold ${theme.themeName === "lucagent" ? "text-gray-500 hover:text-gray-800" : "text-gray-400 hover:text-white"} transition-colors`}
          >
            <Download className="w-3 h-3" /> Export JSON
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
            className="w-full flex items-center gap-2 text-[10px] font-bold text-red-500/70 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Wipe Store
          </button>
        </div>
      </div>

      {/* Memory Explorer */}
      <div
        className={`flex-1 flex flex-col min-h-0 ${theme.themeName === "lucagent" ? "bg-white border-black/10" : "bg-black/20 border-white/10"} border rounded-xl overflow-hidden`}
      >
        <div
          className={`p-3 border-b ${theme.themeName === "lucagent" ? "border-black/5 bg-black/[0.02]" : "border-white/10 bg-white/5"} flex flex-wrap gap-2 items-center justify-between`}
        >
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search facts, concepts, entities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${theme.themeName === "lucagent" ? "bg-black/[0.03] border-black/10 text-slate-900" : "bg-black/40 border-white/10 text-gray-300"} border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none transition-all shadow-inner`}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`${theme.themeName === "lucagent" ? "bg-black/[0.03] border-black/10 text-slate-700" : "bg-black/40 border-white/10 text-gray-400"} border rounded-lg px-2 py-1.5 text-[10px] focus:outline-none transition-all`}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace("_", " ")}
                </option>
              ))}
            </select>
            <button
              onClick={loadAllMemories}
              className={`p-1.5 rounded-lg ${theme.themeName === "lucagent" ? "hover:bg-black/5 text-gray-400" : "hover:bg-white/10 text-gray-500"} hover:text-white transition-all outline-none`}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center opacity-50 space-y-2 py-10">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Accessing Index...
              </span>
            </div>
          ) : filteredMemories.length > 0 ? (
            filteredMemories.map((m) => (
              <div
                key={m.id}
                className={`group p-3 rounded-lg ${theme.themeName === "lucagent" ? "bg-black/[0.02] border-black/5 hover:border-black/10 hover:bg-black/[0.04]" : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.08]"} transition-all border relative overflow-hidden`}
              >
                {/* Delete Button */}
                <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => deleteMemory(m.id)}
                    className="p-1.5 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
                    title="Delete memory"
                  >
                    <Trash className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
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
                      className={`text-[10px] font-bold ${theme.themeName === "lucagent" ? "text-gray-700" : "text-gray-200"} mb-1 flex flex-wrap items-center gap-2`}
                    >
                      <span className="truncate">{m.key}</span>
                      {m.metadata?.source && (
                        <span
                          className={`px-1.5 py-0.5 rounded ${theme.themeName === "lucagent" ? "bg-black/5 text-gray-500" : "bg-white/10 text-gray-500"} text-[8px] font-normal uppercase tracking-tighter`}
                        >
                          {m.metadata.source}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-[11px] ${theme.themeName === "lucagent" ? "text-slate-800" : "text-gray-400"} leading-relaxed break-words`}
                    >
                      {m.value}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-[9px] text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(m.timestamp).toLocaleString()}
                      </span>
                      <span className="uppercase tracking-tighter">
                        {m.category.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-30 py-10">
              <Database className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">No Memories Found</p>
              <p className="text-[10px] text-gray-500 mt-1">
                Try a different search or connect more knowledge.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Session Cleanup */}
      <div
        className={`p-3 rounded-xl ${theme.themeName === "lucagent" ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-500/5 border-amber-500/10"} border flex items-center justify-between mt-auto`}
      >
        <div className="flex items-center gap-3">
          <LogOut className="w-4 h-4 text-amber-500/70" />
          <div>
            <div
              className={`text-[10px] font-bold ${theme.themeName === "lucagent" ? "text-slate-900" : "text-gray-300"} uppercase tracking-wider`}
            >
              Active Session
            </div>
            <div
              className={`text-[9px] ${theme.themeName === "lucagent" ? "text-slate-500" : "text-gray-500"} italic`}
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
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${theme.themeName === "lucagent" ? "bg-black/5 hover:bg-black/10 text-gray-500 hover:text-gray-800 border-black/10" : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-white/5"} transition-all border`}
        >
          Reset Session
        </button>
      </div>
    </div>
  );
};

export default SettingsDataTab;
