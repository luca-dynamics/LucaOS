import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { motion, AnimatePresence } from "framer-motion";
import { settingsService } from "../../services/settingsService";
import { cortexUrl } from "../../config/api";

interface NotionPage {
  id: string;
  title: string;
  url: string;
  last_edited: string;
}

interface GoogleFile {
  id: string;
  title: string;
  type: string;
  modified: string;
}

interface ObsidianFile {
  id: string;
  title: string;
  path: string;
}

interface KnowledgeBridgeTabProps {
  theme: {
    hex: string;
    themeName: string;
    isLight?: boolean;
  };
  isMobile?: boolean;
}

const KnowledgeBridgeTab: React.FC<KnowledgeBridgeTabProps> = ({
  theme,
  isMobile,
}) => {
  const [platform, setPlatform] = useState("openai");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "distilling" | "success" | "error"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [importedFacts, setImportedFacts] = useState<string[]>([]);

  // Notion SaaS Sync State
  const [notionConnected, setNotionConnected] = useState(false);
  const [notionPages, setNotionPages] = useState<NotionPage[]>([]);
  const [notionLoading, setNotionLoading] = useState(false);
  const [syncingPageId, setSyncingPageId] = useState<string | null>(null);
  const [syncedPages, setSyncedPages] = useState<
    Record<string, { factCount: number; timestamp: Date }>
  >({});

  // Google Drive SaaS Sync State
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleFiles, setGoogleFiles] = useState<GoogleFile[]>([]);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Obsidian Sync State
  const [obsidianConnected, setObsidianConnected] = useState(false);
  const [obsidianFiles, setObsidianFiles] = useState<ObsidianFile[]>([]);
  const [obsidianLoading, setObsidianLoading] = useState(false);
  const [vaultPath, setVaultPath] = useState("");

  // Check connection status on mount
  useEffect(() => {
    fetch(cortexUrl("/oauth/notion/status"))
      .then((res) => res.json())
      .then((data) => {
        setNotionConnected(data.connected);
        const current = settingsService.get("connectors");
        settingsService.saveSettings({ 
          connectors: { ...current, notion: data.connected } 
        });
      })
      .catch(() => setNotionConnected(false));

    fetch(cortexUrl("/oauth/google/status"))
      .then((res) => res.json())
      .then((data) => {
        setGoogleConnected(data.connected);
        const current = settingsService.get("connectors");
        settingsService.saveSettings({ 
          connectors: { ...current, google: data.connected } 
        });
      })
      .catch(() => setGoogleConnected(false));

    fetch(cortexUrl("/knowledge/obsidian/status"))
      .then((res) => res.json())
      .then((data) => {
        setObsidianConnected(data.connected);
        if (data.vault_path) setVaultPath(data.vault_path);
        const current = settingsService.get("connectors");
        settingsService.saveSettings({ 
          connectors: { ...current, obsidian: data.connected } 
        });
      })
      .catch(() => setObsidianConnected(false));
  }, []);

  const connectNotion = async () => {
    try {
      const res = await fetch(cortexUrl("/oauth/notion/start"));
      const data = await res.json();
      if (data.auth_url) {
        window.open(data.auth_url, "_blank");
      }
    } catch (err) {
      console.error("Notion OAuth start failed:", err);
    }
  };

  const connectGoogle = async () => {
    try {
      const res = await fetch(cortexUrl("/oauth/google/start"));
      const data = await res.json();
      if (data.auth_url) {
        window.open(data.auth_url, "_blank");
      }
    } catch (err) {
      console.error("Google OAuth start failed:", err);
    }
  };

  const loadNotionPages = async () => {
    setNotionLoading(true);
    try {
      const res = await fetch(cortexUrl("/knowledge/notion/pages"));
      const data = await res.json();
      setNotionPages(data.pages || []);
    } catch (err) {
      console.error("Failed to load Notion pages:", err);
    }
    setNotionLoading(false);
  };

  const loadGoogleFiles = async () => {
    setGoogleLoading(true);
    try {
      const res = await fetch(cortexUrl("/knowledge/google/files"));
      const data = await res.json();
      setGoogleFiles(data.files || []);
    } catch (err) {
      console.error("Failed to load Google Drive files:", err);
    }
    setGoogleLoading(false);
  };

  const loadObsidianFiles = async () => {
    setObsidianLoading(true);
    try {
      const res = await fetch(cortexUrl("/knowledge/obsidian/files"));
      const data = await res.json();
      setObsidianFiles(data.files || []);
    } catch (err) {
      console.error("Failed to load Obsidian files:", err);
    }
    setObsidianLoading(false);
  };

  const configureObsidianVault = async () => {
    if (!vaultPath) return;
    try {
      const res = await fetch(
        cortexUrl(
          `/knowledge/obsidian/configure?vault_path=${encodeURIComponent(
            vaultPath,
          )}`,
        ),
        { method: "POST" },
      );
      const data = await res.json();
      if (data.status === "success") {
        setObsidianConnected(true);
      }
    } catch (err) {
      console.error("Failed to configure Obsidian vault:", err);
    }
  };

  const syncNotionPage = async (pageId: string) => {
    setSyncingPageId(pageId);
    try {
      const res = await fetch(
        cortexUrl(`/knowledge/notion/sync?page_id=${pageId}`),
        {
          method: "POST",
        },
      );
      const data = await res.json();
      if (data.status === "success") {
        const factCount = (data.facts || []).length;
        setImportedFacts(data.facts || []);
        setStatus("success");
        setProgress(100);
        // Track synced page
        setSyncedPages((prev) => ({
          ...prev,
          [pageId]: { factCount, timestamp: new Date() },
        }));
      }
    } catch (err) {
      console.error("Notion sync failed:", err);
    }
    setSyncingPageId(null);
  };

  const syncGoogleFile = async (fileId: string) => {
    setSyncingPageId(fileId);
    try {
      const res = await fetch(
        cortexUrl(`/knowledge/google/sync?file_id=${fileId}`),
        {
          method: "POST",
        },
      );
      const data = await res.json();
      if (data.status === "success") {
        const factCount = (data.facts || []).length;
        setImportedFacts(data.facts || []);
        setStatus("success");
        setProgress(100);
        setSyncedPages((prev) => ({
          ...prev,
          [fileId]: { factCount, timestamp: new Date() },
        }));
      }
    } catch (err) {
      console.error("Google Drive sync failed:", err);
    }
    setSyncingPageId(null);
  };

  const syncObsidianFile = async (filePath: string) => {
    setSyncingPageId(filePath);
    try {
      const res = await fetch(
        cortexUrl(
          `/knowledge/obsidian/sync?file_path=${encodeURIComponent(filePath)}`,
        ),
        { method: "POST" },
      );
      const data = await res.json();
      if (data.status === "success") {
        const factCount = (data.facts || []).length;
        setImportedFacts(data.facts || []);
        setStatus("success");
        setProgress(100);
        setSyncedPages((prev) => ({
          ...prev,
          [filePath]: { factCount, timestamp: new Date() },
        }));
      }
    } catch (err) {
      console.error("Obsidian sync failed:", err);
    }
    setSyncingPageId(null);
  };

  const handleImport = async () => {
    if (!file) return;
    setStatus("uploading");
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        cortexUrl(`/knowledge/import?platform=${platform}`),
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) throw new Error("Upload failed");

      setStatus("distilling");
      setProgress(60);

      const data = await response.json();

      if (data.status === "success") {
        setImportedFacts(data.facts || []);
        setProgress(100);
        setStatus("success");
      } else {
        throw new Error(data.message || "Import failed");
      }
    } catch (err) {
      console.error("Import failed:", err);
      setStatus("error");
    }
  };

  const categories = [
    {
      id: "chat-json",
      name: "Chat Intelligence (JSON)",
      extension: ".json",
      description:
        "Brain dumps from leading LLM platforms. Standardized JSON format.",
      platforms: [
        {
          id: "openai",
          name: "ChatGPT",
          description: "Upload conversations.json",
          logo: "/icons/brands/openai.svg",
        },
        {
          id: "anthropic",
          name: "Anthropic Console",
          description: "Sync API & Workbench logs",
          logo: "/icons/brands/anthropic.svg",
        },
        {
          id: "claude",
          name: "Claude.ai (Web)",
          description: "Import personal chat export",
          logo: "/icons/brands/claude-color.svg",
        },
        {
          id: "grok",
          name: "X Grok",
          description: "Upload archive.json",
          logo: "/icons/brands/grok.svg",
        },
        {
          id: "gemini",
          name: "Google Gemini",
          description: "Sync My Activity data",
          logo: "/icons/brands/gemini-color.svg",
        },
      ],
    },
    {
      id: "dev-data",
      name: "IDE & Development",
      extension: "index / settings",
      description: "Deep source-code intelligence and editor preferences.",
      platforms: [
        {
          id: "cursor",
          name: "Cursor",
          description: "Import editor index",
          logo: "/icons/brands/cursor.svg",
        },
        {
          id: "claude-code",
          name: "Claude Code (CLI)",
          description: "Sync terminal agent logs",
          logo: "/icons/brands/claude-color.svg",
        },
        {
          id: "v0",
          name: "v0.app",
          description: "Import project JSON",
          logo: "/icons/brands/v0.svg",
        },
        {
          id: "windsurf",
          name: "Windsurf",
          description: "Sync editor state",
          logo: "/icons/brands/windsurf.svg",
        },
        {
          id: "antigravity",
          name: "AntiGravity IDE",
          description: "Sync workspace & logs",
          logo: "/icons/brands/antigravity.svg",
        },
        {
          id: "copilot",
          name: "GitHub Copilot",
          description: "Sync extension chat",
          logo: "/icons/brands/githubcopilot.svg",
        },
      ],
    },
    {
      id: "structured",
      name: "Standard Data",
      extension: ".json / .csv",
      description: "Plain structured knowledge exports.",
      platforms: [
        {
          id: "generic",
          name: "Generic JSON/CSV",
          description: "Standardized memory schema",
          icon: "FileText",
        },
      ],
    },
  ];

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  return (
    <div className={`space-y-6 ${isMobile ? "px-0" : ""}`}>
      <div
        className={`p-4 border space-y-4 transition-all tech-border glass-blur ${isMobile ? "border-x-0 border-y rounded-none bg-white/5" : "rounded-xl"}`}
        style={{
          backgroundColor: isMobile ? "rgba(255,255,255,0.02)" : "var(--app-bg-tint, #0a0a0a)",
          borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
        }}
      >
        <div className="flex items-center gap-3">
          <Icon name="Share2" className="w-5 h-5" style={{ color: theme.hex }} />
          <div>
            <h3
              className={`text-sm font-black uppercase tracking-widest`}
              style={{ color: "var(--app-text-main, #ffffff)" }}
            >
              Local Knowledge Base
            </h3>
            <p
              className={`text-[10px] text-[var(--app-text-muted)] opacity-70 italic`}
            >
              Import and distill your knowledge assets from other AI platforms into
              Luca&apos;s local indexing engine.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.id;

            return (
              <div
                key={cat.id}
                className={`w-full overflow-hidden rounded-xl border transition-all duration-300 tech-border glass-blur`}
                style={{
                  backgroundColor: isSelected
                    ? "var(--app-bg-tint, #0a0a0f)"
                    : "var(--app-bg-tint, rgba(0,0,0,0.2))",
                  borderColor: isSelected
                    ? theme.hex
                    : "var(--app-border-main, rgba(255,255,255,0.1))",
                  boxShadow: isSelected ? `0 0 30px ${theme.hex}11` : "none"
                }}
              >
                <button
                  onClick={() => setActiveCategory(isSelected ? null : cat.id)}
                  className="w-full flex items-center gap-3 p-4 text-left transition-all relative"
                >
                  <div
                    className={`p-2 rounded flex items-center justify-center border transition-all tech-border`}
                    style={{
                      backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.1))",
                      borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
                      color: theme.hex,
                    }}
                  >
                    <Icon name="FileJson" size={18} />
                  </div>
                  <div className="flex-1">
                    <div
                      className={`text-sm font-black uppercase tracking-widest`}
                      style={{ color: "var(--app-text-main, #ffffff)" }}
                    >
                      {cat.name}
                    </div>
                    <div
                      className={`text-[10px] font-mono text-[var(--app-text-muted)] opacity-60`}
                    >
                      Ext: {cat.extension}
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: isSelected ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Icon name="ChevronDown" className="w-4 h-4 text-[var(--app-text-muted)]" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="p-4 pt-0 border-t border-white/5 space-y-4">
                        <p
                          className={`text-sm italic text-[var(--app-text-muted)]`}
                        >
                          {cat.description}
                        </p>

                        {/* Integrated Platform Switcher (Grid) */}
                        <div className="grid grid-cols-2 gap-2">
                          {cat.platforms.map((p: any) => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setPlatform(p.id);
                                setFile(null); // Reset file when switching internal platform
                                setStatus("idle");
                              }}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-sm transition-all shadow-sm tech-border`}
                              style={{
                                backgroundColor: platform === p.id 
                                  ? "var(--app-bg-tint, rgba(0,0,0,0.1))"
                                  : "transparent",
                                borderColor: platform === p.id 
                                  ? theme.hex 
                                  : "var(--app-border-main, rgba(255,255,255,0.05))",
                              }}
                            >
                              {p.logo ? (
                                <img
                                  src={p.logo}
                                  className={`w-4 h-4 object-contain opacity-70 ${theme.isLight ? "" : "invert brightness-200"}`}
                                />
                              ) : p.icon ? (
                                <Icon name={p.icon} className="w-4 h-4 text-[var(--app-text-muted)]" />
                              ) : null}
                              <span
                                className={`font-bold`}
                                style={{
                                  color: platform === p.id
                                    ? "var(--app-text-main, #ffffff)"
                                    : "var(--app-text-muted, #94a3b8)"
                                }}
                              >
                                {p.name}
                              </span>
                            </button>
                          ))}
                        </div>

                        {/* Integrated Upload Area (only if platform inside category is selected) */}
                        {platform &&
                          cat.platforms.some((p: any) => p.id === platform) && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="space-y-4"
                            >
                              <label
                                className={`text-sm font-bold uppercase tracking-widest block text-[var(--app-text-muted)]`}
                              >
                                Source Transmission ({platform.toUpperCase()})
                              </label>

                              <div
                                className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 group transition-colors cursor-pointer tech-border`}
                                style={{
                                  backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.2))",
                                  borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
                                }}
                                onClick={() =>
                                  document
                                    .getElementById(`file-upload-${cat.id}`)
                                    ?.click()
                                }
                              >
                                <input
                                  id={`file-upload-${cat.id}`}
                                  type="file"
                                  className="hidden"
                                  onChange={(e) =>
                                    setFile(e.target.files?.[0] || null)
                                  }
                                />
                                {file ? (
                                  <>
                                    <Icon
                                      name="FileJson"
                                      className="w-8 h-8"
                                      style={{ color: theme.hex }}
                                    />
                                    <div className="text-center">
                                      <div
                                        className={`text-base font-bold truncate max-w-[200px] text-[var(--app-text-main)]`}
                                      >
                                        {file.name}
                                      </div>
                                      <div
                                        className={`text-sm uppercase tracking-wider text-[var(--app-text-muted)]`}
                                      >
                                        {(file.size / 1024 / 1024).toFixed(2)}{" "}
                                        MB
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <Icon
                                      name="Upload"
                                      className={`w-6 h-6 transition-colors text-[var(--app-text-muted)] group-hover:text-[var(--app-text-main)]`}
                                    />
                                    <div
                                      className={`text-center text-sm uppercase tracking-widest font-bold text-[var(--app-text-muted)]`}
                                    >
                                      Inject {cat.extension} Data
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* COMMENCE Button */}
                              <button
                                disabled={!file || status !== "idle"}
                                onClick={handleImport}
                                className="w-full p-3 rounded-lg text-sm font-bold tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed group/btn overflow-hidden relative shadow-lg"
                                style={{
                                  backgroundColor: `${theme.hex}20`,
                                  border: `1px solid ${theme.hex}`,
                                  color: theme.hex,
                                }}
                              >
                                <div className="absolute inset-0 bg-[var(--app-bg-tint)] opacity-0 group-hover/btn:opacity-10 transition-opacity" />
                                <Icon name="Share2" className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                                Commence Ingestion
                              </button>

                              {/* Progress Panel */}
                              {status !== "idle" && (
                                <div className="space-y-2 py-2">
                                  <div className="flex justify-between items-center text-sm uppercase tracking-widest">
                                    <span className="text-[var(--app-text-muted)] animate-pulse">
                                      {status === "uploading" &&
                                        "Syncing Bits..."}
                                      {status === "distilling" &&
                                        "Distilling Intelligence..."}
                                      {status === "success" &&
                                        "Core Synchronized"}
                                    </span>
                                    <span style={{ color: theme.hex }}>
                                      {progress}%
                                    </span>
                                  </div>
                                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${progress}%` }}
                                      className="h-full"
                                      style={{
                                        backgroundColor:
                                          status === "success"
                                            ? "#4ade80"
                                            : theme.hex,
                                        boxShadow: `0 0 10px ${theme.hex}`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}

                              {status === "success" && (
                                <motion.div
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400 space-y-2"
                                >
                                  <div className="flex items-center gap-2 font-bold uppercase tracking-widest">
                                    <Icon name="Brain" className="w-3 h-3" />
                                    <span>Insights Logged:</span>
                                  </div>
                                  {importedFacts.length > 0 && (
                                    <ul className="space-y-1 list-none opacity-80">
                                      {importedFacts.slice(0, 3).map((f, i) => (
                                        <li key={i} className="flex gap-2">
                                          <span style={{ color: theme.hex }}>
                                            {"//"}
                                          </span>
                                          <span className="truncate">{f}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </motion.div>
                              )}
                            </motion.div>
                          )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* === SAAS SYNC SECTION === */}
      <div
        className={`p-4 border space-y-4 mt-6 transition-all tech-border glass-blur ${isMobile ? "border-x-0 border-y rounded-none bg-white/5" : "rounded-xl"}`}
        style={{
          backgroundColor: isMobile ? "rgba(255,255,255,0.02)" : "var(--app-bg-tint, #0a0a0a)",
          borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
        }}
      >
        <div className="flex items-center gap-3">
          <Icon
            name="Link"
            className="w-5 h-5"
            style={{
              color: theme.hex,
            }}
          />
          <div>
            <h3
              className={`text-base font-black uppercase tracking-widest`}
              style={{ color: "var(--app-text-main, #ffffff)" }}
            >
              SaaS Sync
            </h3>
            <p
              className={`text-xs text-[var(--app-text-muted)] opacity-70`}
            >
              Connect your apps to sync knowledge automatically
            </p>
          </div>
        </div>

        {/* Notion Connector */}
        <div
          className={`p-3 rounded-lg border tech-border`}
          style={{
            backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.1))",
            borderColor: "var(--app-border-main, rgba(255,255,255,0.05))",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/icons/brands/notion.svg"
                alt="Notion"
                className={`w-8 h-8 object-contain ${theme.isLight ? "" : "invert opacity-90"}`}
              />
              <div>
                <div
                  className={`text-sm font-black uppercase tracking-wider`}
                  style={{ color: "var(--app-text-main, #ffffff)" }}
                >
                  Notion
                </div>
                <div
                  className={`text-sm font-bold text-[var(--app-text-muted)]`}
                >
                  {notionConnected ? "Connected" : "Not connected"}
                </div>
              </div>
            </div>
            {notionConnected ? (
              <button
                onClick={loadNotionPages}
                disabled={notionLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all bg-white/10 text-[var(--app-text-muted)] hover:bg-white/20`}
              >
                <Icon
                  name="RefreshCw"
                  className={`w-3 h-3 ${notionLoading ? "animate-spin" : ""}`}
                />
                {notionLoading ? "Loading..." : "Load Pages"}
              </button>
            ) : (
              <button
                onClick={connectNotion}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border transition-all hover:bg-white/5"
                style={{ borderColor: theme.hex, color: theme.hex }}
              >
                <Icon name="ArrowRight" size={12} />
                Connect
              </button>
            )}
          </div>

          {/* Page List */}
          {notionPages.length > 0 && (
            <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
              {notionPages.map((page) => (
                <div
                  key={page.id}
                  className={`flex items-center justify-between p-2 rounded transition-all border tech-border`}
                  style={{
                    backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.2))",
                    borderColor: "var(--app-border-main, rgba(255,255,255,0.05))",
                  }}
                >
                  <span
                    className={`text-sm truncate flex-1`}
                    style={{ color: "var(--app-text-main, #ffffff)" }}
                  >
                    {page.title}
                  </span>
                  {syncedPages[page.id] ? (
                    syncedPages[page.id].factCount > 0 ? (
                      <button
                        onClick={() => syncNotionPage(page.id)}
                        disabled={syncingPageId === page.id}
                        className={`flex items-center gap-1 text-sm px-2 py-1 rounded transition-all cursor-pointer bg-green-500/20 text-green-400 hover:bg-green-500/30`}
                        title="Click to re-sync"
                      >
                        {syncingPageId === page.id ? (
                          <Icon name="Restart" size={12} className="animate-spin" />
                        ) : (
                          <Icon name="CheckCircle" size={12} />
                        )}
                        {syncedPages[page.id].factCount} facts
                      </button>
                    ) : (
                      <button
                        onClick={() => syncNotionPage(page.id)}
                        disabled={syncingPageId === page.id}
                        className={`text-[9px] px-2 py-1 rounded transition-all cursor-pointer bg-amber-500/20 text-amber-400 hover:bg-amber-500/30`}
                        title="Click to re-sync"
                      >
                        {syncingPageId === page.id ? "Syncing..." : "Empty"}
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => syncNotionPage(page.id)}
                      disabled={syncingPageId === page.id}
                      className="text-[9px] px-2 py-1 rounded bg-white/10 text-[var(--app-text-muted)] hover:text-[var(--app-text-main)] transition-all"
                    >
                      {syncingPageId === page.id ? "Syncing..." : "Sync"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Sync All Button */}
          {notionConnected && notionPages.length > 0 && (
            <button
              onClick={async () => {
                setSyncingPageId("all");
                try {
                  const res = await fetch(
                    cortexUrl("/knowledge/notion/sync-all"),
                    { method: "POST" },
                  );
                  const data = await res.json();
                  if (data.status === "success") {
                    setStatus("success");
                    setProgress(100);
                  }
                } catch (err) {
                  console.error("Sync all failed:", err);
                }
                setSyncingPageId(null);
              }}
              disabled={syncingPageId === "all"}
              className={`w-full mt-2 p-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-2 border tech-border`}
              style={{
                backgroundColor: `${theme.hex}20`,
                color: theme.hex,
                borderColor: `${theme.hex}40`,
              }}
            >
              {syncingPageId === "all" ? (
                <>
                  <Icon name="Restart" size={12} className="animate-spin" />
                  Syncing all pages...
                </>
              ) : (
                <>
                  <Icon name="Restart" size={12} />
                  Sync All Pages
                </>
              )}
            </button>
          )}
        </div>

        {/* Google Drive Connector */}
        <div
          className={`p-3 rounded-lg border ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-slate-100 border-black/25" : "bg-black/20 border-white/10"}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/icons/brands/google-drive.svg"
                alt="Google Drive"
                className="w-8 h-8 object-contain"
              />
              <div>
                <div
                  className={`text-base font-bold`}
                  style={{ color: "var(--app-text-main, #ffffff)" }}
                >
                  Google Drive
                </div>
                <div
                  className={`text-sm font-bold text-[var(--app-text-muted)]`}
                >
                  {googleConnected ? "Connected" : "Not connected"}
                </div>
              </div>
            </div>
            {googleConnected ? (
              <button
                onClick={loadGoogleFiles}
                disabled={googleLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all bg-white/10 text-[var(--app-text-muted)] hover:bg-white/20`}
              >
                <Icon
                  name="Restart"
                  size={12}
                  className={googleLoading ? "animate-spin" : ""}
                />
                {googleLoading ? "Loading..." : "Load Files"}
              </button>
            ) : (
              <button
                onClick={connectGoogle}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border transition-all hover:bg-white/5"
                style={{ borderColor: theme.hex, color: theme.hex }}
              >
                <Icon name="ArrowRight" size={12} />
                Connect
              </button>
            )}
          </div>

          {/* File List */}
          {googleFiles.length > 0 && (
            <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
              {googleFiles.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center justify-between p-2 rounded transition-all bg-white/5 hover:bg-white/10 border tech-border`}
                >
                  <span
                    className={`text-sm truncate flex-1 text-[var(--app-text-muted)]`}
                  >
                    {file.title}
                  </span>
                  {syncedPages[file.id] ? (
                    syncedPages[file.id].factCount > 0 ? (
                      <button
                        onClick={() => syncGoogleFile(file.id)}
                        disabled={syncingPageId === file.id}
                        className={`flex items-center gap-1 text-sm px-2 py-1 rounded transition-all cursor-pointer bg-green-500/20 text-green-400 hover:bg-green-500/30`}
                        title="Click to re-sync"
                      >
                        {syncingPageId === file.id ? (
                          <Icon name="Restart" size={12} className="animate-spin" />
                        ) : (
                          <Icon name="CheckCircle" size={12} />
                        )}
                        {syncedPages[file.id].factCount} facts
                      </button>
                    ) : (
                      <button
                        onClick={() => syncGoogleFile(file.id)}
                        disabled={syncingPageId === file.id}
                        className={`text-[9px] px-2 py-1 rounded transition-all cursor-pointer bg-amber-500/20 text-amber-400 hover:bg-amber-500/30`}
                        title="Click to re-sync"
                      >
                        {syncingPageId === file.id ? "Syncing..." : "Empty"}
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => syncGoogleFile(file.id)}
                      disabled={syncingPageId === file.id}
                      className="text-[9px] px-2 py-1 rounded bg-white/10 text-[var(--app-text-muted)] hover:text-[var(--app-text-main)] transition-all"
                    >
                      {syncingPageId === file.id ? "Syncing..." : "Sync"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Obsidian Connector */}
        <div
          className={`p-3 rounded-lg border tech-border bg-[var(--app-bg-tint)] border-[var(--app-border-main)]`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/icons/brands/obsidian.svg"
                alt="Obsidian"
                className="w-8 h-8 object-contain"
              />
              <div>
                <div
                  className={`text-base font-bold`}
                  style={{ color: "var(--app-text-main, #ffffff)" }}
                >
                  Obsidian
                </div>
                <div
                  className={`text-sm font-bold text-[var(--app-text-muted)]`}
                >
                  {obsidianConnected ? "Connected" : "Local Vault"}
                </div>
              </div>
            </div>
            {obsidianConnected ? (
              <button
                onClick={loadObsidianFiles}
                disabled={obsidianLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all bg-white/10 text-[var(--app-text-muted)] hover:bg-white/20`}
              >
                <Icon
                  name="Restart"
                  size={12}
                  className={obsidianLoading ? "animate-spin" : ""}
                />
                {obsidianLoading ? "Loading..." : "Load Files"}
              </button>
            ) : (
              <button
                onClick={configureObsidianVault}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border transition-all hover:bg-white/5"
                style={{ borderColor: theme.hex, color: theme.hex }}
              >
                Configure
              </button>
            )}
          </div>

          {!obsidianConnected && (
            <div className="mt-3">
              <input
                type="text"
                placeholder="Paste vault path (e.g. /Users/name/Documents/Vault)"
                value={vaultPath}
                onChange={(e) => setVaultPath(e.target.value)}
                className="w-full bg-[var(--app-bg-tint)] border border-[var(--app-border-main)] rounded px-2 py-1 text-[10px] text-[var(--app-text-muted)] focus:outline-none focus:border-white/20 tech-border"
              />
            </div>
          )}

          {/* File List */}
          {obsidianFiles.length > 0 && (
            <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
              {obsidianFiles.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center justify-between p-2 rounded transition-all bg-white/5 hover:bg-white/10 border tech-border`}
                >
                  <span
                    className={`text-sm truncate flex-1 text-[var(--app-text-muted)]`}
                  >
                    {file.title}
                  </span>
                  {syncedPages[file.id] ? (
                    <button
                      onClick={() => syncObsidianFile(file.id)}
                      disabled={syncingPageId === file.id}
                      className={`flex items-center gap-1 text-sm px-2 py-1 rounded transition-all cursor-pointer bg-green-500/20 text-green-400 hover:bg-green-500/30`}
                    >
                      {syncingPageId === file.id ? (
                        <Icon name="Restart" size={12} className="animate-spin" />
                      ) : (
                        <Icon name="CheckCircle" size={12} />
                      )}
                      Synced
                    </button>
                  ) : (
                    <button
                      onClick={() => syncObsidianFile(file.id)}
                      disabled={syncingPageId === file.id}
                      className="text-[9px] px-2 py-1 rounded bg-white/10 text-[var(--app-text-muted)] hover:text-[var(--app-text-main)] transition-all"
                    >
                      {syncingPageId === file.id ? "Syncing..." : "Sync"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Future connectors placeholder */}
        <div className="opacity-50">
          {["Slack"].map((name) => (
            <div
              key={name}
              className={`p-2 rounded border border-dashed text-center bg-white/[0.02] border-[var(--app-border-main)]`}
            >
              <div
                className={`text-[9px] text-[var(--app-text-muted)]`}
              >
                {name}
              </div>
              <div className="text-[8px] text-[var(--app-text-muted)]">Coming soon</div>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`flex items-start gap-3 p-3 rounded-lg border transition-all tech-border`}
        style={{
          backgroundColor: "var(--app-bg-tint, rgba(245,158,11,0.05))",
          borderColor: "rgba(245,158,11,0.2)"
        }}
      >
        <Icon
          name="Danger"
          size={16}
          className={`shrink-0 mt-0.5 text-amber-600`}
        />
        <p
          className={`text-[9px] leading-relaxed text-[var(--app-text-muted)]`}
        >
          <strong>Privacy Note:</strong> Luca distills your logs locally. Raw
          chat history from imports is NOT stored permanently&mdash;only the
          distilled facts are saved to your local Master Index.
        </p>
      </div>
    </div>
  );
};

export default KnowledgeBridgeTab;
