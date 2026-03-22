import React, { useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";
const {
  X,
  Search,
  Box,
  ExternalLink,
  Loader2,
} = LucideIcons as any;
import { setHexAlpha } from "../config/themeColors";
import {
  listInstalledApps,
  executeLocalTool,
} from "../tools/handlers/LocalTools";
import { OfflineModelManager } from "./llm/OfflineModelManager";

interface AppExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: { hex: string; primary: string; border: string; bg: string };
}

interface AppInstance {
  name: string;
  path?: string;
  id?: string;
}

const AppExplorerModal: React.FC<AppExplorerModalProps> = ({
  isOpen,
  onClose,
  theme,
}) => {
  const [apps, setApps] = useState<AppInstance[]>([]);
  const [filteredApps, setFilteredApps] = useState<AppInstance[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showOfflineManager, setShowOfflineManager] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadApps();
    }
  }, [isOpen]);

  const loadApps = async () => {
    setLoading(true);
    try {
      const result = await listInstalledApps();
      const systemApps: AppInstance[] = [
        {
          name: "Offline Intelligence",
          id: "luca-offline-brain",
          path: "internal:offline-brain",
        },
        ...(result.apps || []),
      ];
      setApps(systemApps);
      setFilteredApps(systemApps);
    } catch (error) {
      console.error("[APP_EXPLORER] Failed to load apps:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = apps.filter((app) =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    setFilteredApps(filtered);
  }, [searchQuery, apps]);

  const handleLaunch = async (appName: string, appId?: string) => {
    // Internal Tools
    if (appId === "luca-offline-brain") {
      setShowOfflineManager(true);
      return;
    }

    try {
      await executeLocalTool("openApp", { appName });
      // Optionally close modal on launch
      // onClose();
    } catch (error) {
      console.error("[APP_EXPLORER] Launch failed:", error);
      alert(`Failed to launch ${appName}. Please check permissions.`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 font-mono">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className="relative w-full max-w-4xl h-[80vh] bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        style={{
          boxShadow: `0 0 80px -20px ${setHexAlpha(theme.hex, 0.25)}`,
          borderColor: setHexAlpha(theme.hex, 0.2),
        }}
      >
        {/* Liquid background effect 1 (Center) */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none transition-all duration-700 -z-10"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${setHexAlpha(theme.hex, 0.15)}, transparent 60%)`,
          }}
        />
        {/* Liquid background effect 2 (Top Right Offset) */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none transition-all duration-700 -z-10"
          style={{
            background: `radial-gradient(circle at 80% 20%, ${setHexAlpha(theme.hex, 0.08)}, transparent 50%)`,
          }}
        />

        {/* Header */}
        <div
          className="flex items-center justify-between p-4 sm:p-5 border-b border-white/5 backdrop-blur-xl relative z-10"
          style={{ backgroundColor: setHexAlpha(theme.hex, 0.12) }}
        >
          <div className="flex items-center gap-4">
            <div
              className={`p-2 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-inner ${theme.primary}`}
            >
              <Box size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-widest text-white flex items-center gap-2">
                APP EXPLORER
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 font-normal tracking-normal uppercase">
                  System V1
                </span>
              </h2>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 font-mono">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                      theme.bg.replace("bg-", "bg-") || "bg-green-500"
                    }`}
                    style={{ backgroundColor: theme.hex }}
                  ></span>
                  APPS: {apps.length}
                </span>
                <span className="opacity-50">|</span>
                <span>STATUS: {loading ? "SCANNING..." : "IDLE"}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-white/10 rounded-full transition-all group border border-transparent hover:border-white/10"
          >
            <X
              className="text-slate-400 group-hover:text-white transition-colors"
              size={20}
            />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-white/[0.02] border-b border-white/5 relative z-10">
          <div className="relative max-w-lg mx-auto">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              size={16}
            />
            <input
              type="text"
              placeholder="SEARCH APPS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm font-mono text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all placeholder:text-slate-600"
              autoFocus
            />
          </div>
        </div>

        {/* App Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar relative z-10">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <Loader2
                className={`animate-spin ${theme.primary}`}
                size={32}
                style={{ color: theme.hex }}
              />
              <p className="text-xs font-mono text-slate-500 animate-pulse tracking-widest">
                SCANNING SYSTEM REGISTRY...
              </p>
            </div>
          ) : filteredApps.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredApps.map((app, index) => (
                <div
                  key={index}
                  className="group relative bg-white/[0.02] backdrop-blur-md border border-white/5 p-4 rounded-2xl hover:-translate-y-1 transition-all duration-300 hover:bg-white/[0.04] cursor-pointer"
                  style={{
                    boxShadow: "0 4px 20px -10px rgba(0,0,0,0.5)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = setHexAlpha(
                      theme.hex,
                      0.4,
                    );
                    e.currentTarget.style.boxShadow = `0 10px 40px -10px ${setHexAlpha(theme.hex, 0.13)}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.05)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 20px -10px rgba(0,0,0,0.5)";
                  }}
                  onClick={() => handleLaunch(app.name)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                      <Box
                        size={18}
                        className="text-slate-500 group-hover:text-white transition-colors"
                        style={{ color: theme.hex }}
                      />
                    </div>
                    <button
                      className="p-2 text-slate-600 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                      title="Launch"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-slate-200 group-hover:text-white truncate mb-1">
                    {app.name}
                  </h3>
                  <p className="text-[10px] text-slate-600 truncate font-mono uppercase tracking-wider">
                    {app.path ? "SYSTEM_BINARY" : app.id || "GENERIC_NODE"}
                  </p>

                  {/* Hover Gradient */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <Search size={48} className="mb-4 text-slate-700" />
              <p className="text-sm font-mono tracking-widest text-slate-500">
                NO MATCHES FOUND
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-3 px-6 border-t border-white/5 flex justify-between items-center backdrop-blur-md relative z-10"
          style={{ backgroundColor: setHexAlpha(theme.hex, 0.12) }}
        >
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[9px] font-mono text-slate-500 tracking-wider">
                CROSS PLATFORM ENGINE
              </span>
            </div>
          </div>
          <p className="text-[9px] font-mono text-slate-600">
            TOTAL APPS: {filteredApps.length}
          </p>
        </div>
      </div>

      {showOfflineManager && (
        <OfflineModelManager
          theme={theme}
          onClose={() => setShowOfflineManager(false)}
        />
      )}
    </div>
  );
};

export default AppExplorerModal;
