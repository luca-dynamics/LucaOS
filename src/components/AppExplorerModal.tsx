import React, { useState, useEffect } from "react";
import { Icon } from "./ui/Icon";

import {
  listInstalledApps,
  executeLocalTool,
} from "../tools/handlers/LocalTools";
import { OfflineModelManager } from "./llm/OfflineModelManager";

interface AppExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AppInstance {
  name: string;
  path?: string;
  id?: string;
}

const AppExplorerModal: React.FC<AppExplorerModalProps> = ({
  isOpen,
  onClose,
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className="relative w-full max-w-3xl h-[80vh] bg-[#080808] border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-[rgba(var(--app-primary-rgb),0.1)]"
            >
              <Icon name="Widget" size={18} style={{ color: "var(--app-primary)" }} variant="BoldDuotone" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base tracking-wide">App Explorer</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                {loading ? "Scanning system…" : `${apps.length} apps installed`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors border border-transparent hover:border-white/10"
          >
            <Icon name="X" className="text-slate-400 hover:text-white" size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-5 py-3 border-b border-white/10">
          <div className="relative">
            <Icon name="Search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={15} />
            <input
              type="text"
              placeholder="Search apps…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/20 transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* App List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <Icon name="Loader" className="animate-spin" size={24} style={{ color: "var(--app-primary)" }} />
              <p className="text-xs text-slate-500">Scanning system registry…</p>
            </div>
          ) : filteredApps.length > 0 ? (
            <div className="flex flex-col divide-y divide-white/[0.05]">
              {filteredApps.map((app, index) => (
                <button
                  key={index}
                  className="flex items-center gap-4 px-5 py-3.5 text-left hover:bg-white/[0.03] transition-colors group w-full"
                  onClick={() => handleLaunch(app.name, app.id)}
                >
                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-white/[0.07] bg-[rgba(var(--app-primary-rgb),0.05)]"
                  >
                    <Icon
                      name="Box"
                      size={16}
                      variant="BoldDuotone"
                      style={{ color: "var(--app-primary)" }}
                    />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{app.name}</p>
                    <p className="text-slate-600 text-xs font-mono truncate mt-0.5">
                      {app.path ? app.path : app.id || "local app"}
                    </p>
                  </div>

                  {/* Launch arrow */}
                  <Icon
                    name="ArrowRight"
                    size={14}
                    className="text-slate-700 group-hover:text-slate-400 transition-colors shrink-0"
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center py-16">
              <Icon name="Search" size={28} className="text-slate-700" />
              <p className="text-slate-500 text-sm">No apps match your search</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[11px] text-slate-500">Cross-platform engine</span>
          </div>
          <span className="text-[11px] text-slate-600">{filteredApps.length} apps</span>
        </div>
      </div>

      {showOfflineManager && (
        <OfflineModelManager
          onClose={() => setShowOfflineManager(false)}
        />
      )}
    </div>
  );
};

export default AppExplorerModal;
