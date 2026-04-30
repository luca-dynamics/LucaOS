import React, { useState, useEffect } from "react";
import { Icon } from "./ui/Icon";
import { apiUrl } from "../config/api";
import { THEME_PALETTE, PERSONA_UI_CONFIG, getDynamicContrast } from "../config/themeColors";
import { settingsService } from "../services/settingsService";

interface Props {
  onClose: () => void;
  toolLogs: { tool: string; output: string; timestamp: number }[];
  themeId?: string;
  opacity?: number;
  initialTab?: string;
  onOpenBrowser?: (url: string, sessionId?: string) => void;
}

interface C2Session {
  id: string;
  ip: string;
  lastSeen: number;
  pendingCommands: number;
  outputs: { timestamp: number; output: string }[];
}

const HackingTerminal: React.FC<Props> = ({
  onClose,
  toolLogs,
  themeId: propThemeId,
  opacity = 0.9,
  initialTab,
  onOpenBrowser,
}) => {
  // --- THEME-AGNOSTIC SKIN SYSTEM ---
  const activeThemeId = propThemeId || settingsService.getSettings().general.theme || "MASTER_SYSTEM";
  const themeConfig = PERSONA_UI_CONFIG[activeThemeId] || PERSONA_UI_CONFIG.MASTER_SYSTEM;
  const contrast = getDynamicContrast(activeThemeId, opacity);

  const themeHex = themeConfig.hex;
  const themePrimary = themeConfig.primary;
  const themeBorder = themeConfig.border;

  // Resolve initial tab from props, then theme, then default
  const resolvedInitialTab = initialTab || "NMAP";

  const [activeTab, setActiveTab] = useState<
    | "NMAP"
    | "METASPLOIT"
    | "PAYLOAD"
    | "BURP"
    | "WIRESHARK"
    | "JOHN"
    | "COBALT"
    | "HTTP_C2"
    | "SOURCE"
  >(resolvedInitialTab as any);

  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);

  // Mobile sidebar states
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);

  // C2 State
  const [sessions, setSessions] = useState<C2Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [c2Command, setC2Command] = useState("");
  const [isRefreshingC2, setIsRefreshingC2] = useState(false);

  // Phase 3: Pentest Sessions State
  const [pentestSessions, setPentestSessions] = useState<any[]>([]);
  const [activePentestId, setActivePentestId] = useState<string | null>(null);

  // Sync global tool logs to this specific terminal if they match the active tab
  useEffect(() => {
    // Filter logs based on active tool context
    const relevantLogs = toolLogs.filter((l: any) => {
      if (activeTab === "NMAP" && l.tool === "runNmapScan") return true;
      if (activeTab === "METASPLOIT" && l.tool === "runMetasploitExploit")
        return true;
      if (activeTab === "PAYLOAD" && l.tool === "generatePayload") return true;
      if (activeTab === "BURP" && l.tool === "runBurpSuite") return true;
      if (activeTab === "WIRESHARK" && l.tool === "runWiresharkCapture")
        return true;
      if (activeTab === "JOHN" && l.tool === "runJohnRipper") return true;
      if (activeTab === "COBALT" && l.tool === "runCobaltStrike") return true;
      if (
        activeTab === "HTTP_C2" &&
        (l.tool === "generateHttpPayload" ||
          l.tool === "listC2Sessions" ||
          l.tool === "sendC2Command")
      )
        return true;
      return false;
    });

    if (relevantLogs.length > 0) {
      const lastLog = relevantLogs[relevantLogs.length - 1];
      // If C2 list command, don't just overwrite terminal, let the C2 UI handle it
      if (activeTab !== "HTTP_C2") {
        setTerminalOutput(lastLog.output.split("\n"));
      }
    } else if (activeTab !== "HTTP_C2") {
      setTerminalOutput([
        "> READY FOR INPUT...",
        "> AWAITING TARGET DESIGNATION.",
      ]);
    }
  }, [toolLogs, activeTab]);

  // C2 Polling
  useEffect(() => {
    if (activeTab === "HTTP_C2") {
      const fetchSessions = async () => {
        setIsRefreshingC2(true);
        try {
          const res = await fetch(apiUrl("/api/c2/sessions"));
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              setSessions(data);
              if (!selectedSessionId && data.length > 0) {
                setSelectedSessionId(data[0].id);
              }
            } else if (data?.sessions) {
              const sessionList = Array.isArray(data.sessions)
                ? data.sessions
                : Object.values(data.sessions);
              setSessions(sessionList as any[]);
              if (!selectedSessionId && sessionList.length > 0) {
                setSelectedSessionId((sessionList[0] as any).id);
              }
            }
          }
        } catch {
          console.error("C2 Poll Failed");
        } finally {
          setIsRefreshingC2(false);
        }
      };
      fetchSessions();
      const interval = setInterval(fetchSessions, 2000);
      return () => clearInterval(interval);
    }
  }, [activeTab, selectedSessionId]);

  // Pentest Session Polling (Phase 3)
  useEffect(() => {
    const fetchPentestSessions = async () => {
      try {
        const res = await fetch(apiUrl("/api/security/sessions"));
        if (res.ok) {
          const data = await res.json();
          setPentestSessions(data);
          if (!activePentestId && data.length > 0) {
            setActivePentestId(data[0].id);
          }
        }
      } catch (e) {
        console.error("Failed to fetch pentest sessions", e);
      }
    };

    fetchPentestSessions();
    const interval = setInterval(fetchPentestSessions, 2000); // Faster polling for HUD sync
    return () => clearInterval(interval);
  }, [activePentestId]);

  // Phase-to-Color Mapping (Luca Persona Theme)
  const getPhaseColor = (phase: string) => {
    switch (phase?.toUpperCase()) {
      case "RECON":
      case "DISCOVERY":
        return THEME_PALETTE.AGENTIC_SLATE.primary;
      case "ANALYSIS":
      case "STRATEGY":
        return THEME_PALETTE.BUILDER.primary;
      case "EXPLOITATION":
      case "ATTACK":
      case "EXECUTION":
        return THEME_PALETTE.TERMINAL.primary;
      case "SUCCESS":
      case "COMPLETE":
        return THEME_PALETTE.RUTHLESS.primary;
      default:
        return themeHex; // Fallback to current theme
    }
  };

  const activeSession = pentestSessions.find((s: any) => s.id === activePentestId);
  const currentPhaseColor = getPhaseColor(activeSession?.currentPhase);

  const handleSendC2 = async () => {
    if (!selectedSessionId || !c2Command.trim()) return;
    try {
      await fetch(apiUrl("/api/c2/command"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          command: c2Command,
        }),
      });
      setC2Command("");
    } catch (e) {
      console.error("Send Command Failed", e);
    }
  };

  const selectedSession = sessions.find((s: any) => s.id === selectedSessionId);

  // Tool Status State
  const [toolStatus, setToolStatus] = useState<Record<string, boolean>>({});
  const [installingTool, setInstallingTool] = useState<string | null>(null);

  // Map Tab ID to Backend Tool Name
  const TOOL_MAPPING: Record<string, string> = {
    NMAP: "nmap",
    METASPLOIT: "msfconsole",
    PAYLOAD: "msfconsole", // Uses msfvenom, part of metasploit
    BURP: "java", // Simplified check for now
    WIRESHARK: "tshark",
    JOHN: "john",
    COBALT: "cobalt", // Not auto-installable usually
  };

  // === MANUAL CONTROL STATE ===
  const [nmapTarget, setNmapTarget] = useState("");
  const [nmapScanType, setNmapScanType] = useState("quick");
  const [payloadOS, setPayloadOS] = useState("windows");
  const [payloadFormat, setPayloadFormat] = useState("exe");
  const [payloadLHOST, setPayloadLHOST] = useState("127.0.0.1");
  const [payloadLPORT, setPayloadLPORT] = useState("4444");
  const [manualCommand, setManualCommand] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [attackPlan, setAttackPlan] = useState<any[]>([]); // NEW: Store structured plan for UI rendering

  // === SOURCE INTEL STATE ===
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourcePath, setSourcePath] = useState(""); // Optional local override

  const handleSelectDirectory = async () => {
    if ((window as any).electron?.ipcRenderer) {
      try {
        const path = await (window as any).electron.ipcRenderer.invoke(
          "select-directory",
          {
            title: "Select Tactical Source Repo",
          },
        );
        if (path) {
          setSourcePath(path);
        }
      } catch (e) {
        console.error("Failed to open directory picker", e);
      }
    } else {
      console.warn("Electron IPC not available for directory picking.");
    }
  };

  useEffect(() => {
    checkToolStatus();
  }, []);

  const checkToolStatus = async () => {
    try {
      const res = await fetch(apiUrl("/api/hacking/status"));
      if (res.ok) {
        const data = await res.json();
        const statusMap: Record<string, boolean> = {};
        if (data.tools) {
          data.tools.forEach((t: any) => {
            statusMap[t.name] = t.installed;
          });
        }
        setToolStatus(statusMap);
      }
    } catch (e) {
      console.error("Failed to check tool status", e);
    }
  };

  const handleInstall = async (toolId: string) => {
    const backendName = TOOL_MAPPING[toolId];
    if (!backendName) return;

    setInstallingTool(toolId);
    try {
      const res = await fetch(apiUrl("/api/hacking/install"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool_name: backendName }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setTerminalOutput((prev) => [
          ...prev,
          `> SYSTEM: Successfully installed ${backendName.toUpperCase()}.`,
        ]);
        await checkToolStatus(); // Refresh status
      } else {
        setTerminalOutput((prev) => [
          ...prev,
          `> SYSTEM ERROR: Installation failed - ${data.output}`,
        ]);
      }
    } catch (e) {
      console.error("Install failed", e);
      setTerminalOutput((prev) => [
        ...prev,
        `> SYSTEM ERROR: Connection failed during installation.`,
      ]);
    } finally {
      setInstallingTool(null);
    }
  };

  // === MANUAL EXECUTION HANDLERS ===
  const handleNmapScan = async () => {
    if (!nmapTarget.trim()) return;
    setIsExecuting(true);
    setTerminalOutput((prev) => [
      ...prev,
      `[MANUAL] Executing Nmap scan on ${nmapTarget}...`,
    ]);

    try {
      const res = await fetch(apiUrl("/api/hacking/nmap"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: nmapTarget, scanType: nmapScanType }),
      });
      const data = await res.json();
      setTerminalOutput((prev) => [...prev, data.output || "Scan complete."]);
    } catch (e: any) {
      setTerminalOutput((prev) => [...prev, `Error: ${e.message}`]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handlePayloadGenerate = async () => {
    setIsExecuting(true);
    setTerminalOutput((prev) => [
      ...prev,
      `[MANUAL] Generating ${payloadOS} payload...`,
    ]);

    try {
      const res = await fetch(apiUrl("/api/c2/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          os: payloadOS,
          format: payloadFormat,
          lhost: payloadLHOST,
          lport: payloadLPORT,
        }),
      });
      const data = await res.json();
      setTerminalOutput((prev) => [
        ...prev,
        data.message || `Payload saved to: ${data.path}`,
      ]);
    } catch (e: any) {
      setTerminalOutput((prev) => [...prev, `Error: ${e.message}`]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleManualCommand = async () => {
    if (!manualCommand.trim()) return;
    setTerminalOutput((prev) => [...prev, `> ${manualCommand}`]);
    setManualCommand("");
    // For generic commands, echo locally (AI handles real execution)
    setTerminalOutput((prev) => [...prev, "Command queued for AI execution."]);
  };

  const clearHistory = () => {
    setTerminalOutput([]);
  };

  const handleAutoExploit = async () => {
    if (!sourceUrl.trim() && !sourcePath.trim()) return;
    setIsExecuting(true);
    setTerminalOutput((prev) => [
      ...prev,
      `[SOURCE] Initiating AI Pentest Sequence...`,
      sourcePath
        ? `[SOURCE] Local Path: ${sourcePath}`
        : `[SOURCE] Autonomous Discovery Mode`,
      sourceUrl
        ? `[SOURCE] Target: ${sourceUrl}`
        : `[SOURCE] Result Mode: Strategy Generation`,
    ]);

    try {
      const res = await fetch(apiUrl("/api/hacking/analyze-source/execute"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: sourcePath || undefined,
          target_url: sourceUrl || undefined,
        }),
      });
      const data = await res.json();

      if (data.status === "success" && data.plan) {
        setAttackPlan(data.plan);
        setTerminalOutput((prev) => [
          ...prev,
          `[+] ANALYSIS COMPLETE. Mode: ${data.mode?.toUpperCase() || "UNKNOWN"}`,
          `[+] Repo Path: ${data.repo_path || "N/A"}`,
          `[+] Generated ${data.plan?.length || 0} Attack Operations.`,
        ]);

        // Auto-route to Smart Screen if verified findings are found
        const verified = data.plan.find((op: any) => op.status === "verified");
        if (verified) {
          window.dispatchEvent(
            new CustomEvent("luca:open-browser", {
              detail: { url: sourceUrl, sessionId: data.repo_path },
            }),
          );
        }
      } else {
        const errorMsg = data.message || data.detail || "Unknown Source Error";
        setTerminalOutput((prev) => [...prev, `[-] FAILED: ${errorMsg}`]);
      }
    } catch (e: any) {
      setTerminalOutput((prev) => [...prev, `[!] ERROR: ${e.message}`]);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-transparent animate-in zoom-in-95 duration-300 font-mono p-0 sm:p-4">
      {/* CINEMATIC SPECIALIST OVERLAY (Smart Screen Optimized) */}
      {activeSession && (
        <>
          {/* Phase-Colored Perimeter Pulse */}
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-1000 z-[200]"
            style={{
              boxShadow: `inset 0 0 100px ${currentPhaseColor}33, inset 0 0 20px ${currentPhaseColor}66`,
              border: `4px solid ${currentPhaseColor}44`,
            }}
          >
            <div
              className="absolute inset-0 animate-pulse opacity-20"
              style={{ backgroundColor: currentPhaseColor }}
            />
          </div>

          {/* Cinematic Status Banner */}
          <div
            className="absolute top-0 left-0 right-0 h-16 sm:h-20 bg-black/80 glass-blur border-b z-[210] flex items-center justify-center px-10 transition-all duration-500"
            style={{ borderBottomColor: `${currentPhaseColor}66` }}
          >
            <div className="flex items-center gap-6">
              <Icon
                name="Danger"
                size={32}
                className="animate-pulse"
                style={{ color: currentPhaseColor }}
              />
              <div className="flex flex-col">
                <span
                  className="text-[10px] tracking-[0.5em] opacity-50 uppercase"
                  style={{ color: currentPhaseColor }}
                >
                  Autonomous Security Specialist Engaged
                </span>
                <h1
                  className="text-xl sm:text-2xl font-black tracking-[0.2em] uppercase"
                  style={{ color: currentPhaseColor }}
                >
                  {activeSession.projectName || "Unknown Target"} {" // "}
                  {activeSession.currentPhase || "Initializing"}
                </h1>
              </div>
              <div className="h-10 w-px bg-white/10 mx-4 hidden sm:block" />
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] opacity-40">
                  SESSION_ID: {activePentestId?.slice(-8)}
                </span>
                <span
                  className="text-[10px] font-bold"
                  style={{ color: currentPhaseColor }}
                >
                  STRATEGY: {activeSession.strategy || "ADAPTIVE"}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Container */}
      <div
        className={`relative w-full h-full sm:w-[95%] sm:h-[90%] border rounded-none sm:rounded-lg flex flex-col overflow-hidden bg-black/20 backdrop-blur-[40px] transition-all duration-700`}
        style={{
          boxShadow: `0 0 100px -20px ${themeHex}33`,
          borderColor: contrast.border,
        }}
      >
        {/* ... (existing effects & header) ... */}
        {/* Liquid background effect 1 (Center) */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none transition-all duration-700 -z-10"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${themeHex}25, transparent 60%)`,
            filter: "blur(40px)",
          }}
        />
        {/* Liquid background effect 2 (Top Right Offset) */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none transition-all duration-700 -z-10"
          style={{
            background: `radial-gradient(circle at 80% 20%, ${themeHex}15, transparent 50%)`,
            filter: "blur(40px)",
          }}
        />
        {/* Scanlines */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_2px,3px_100%] z-50 opacity-20"></div>

        {/* Header */}
        <div
          className={`h-14 sm:h-16 border-b flex items-center justify-between px-3 sm:px-6 relative z-30 flex-shrink-0 transition-colors duration-500`}
          style={{ 
            backgroundColor: `${themeHex}1A`,
            borderBottomColor: contrast.border
          }}
        >
          <div className="flex items-center gap-3">
            <Icon name="Document" size={18} style={{ color: themeHex }} />
            <h2 className="font-mono text-xs font-bold tracking-[0.4em] uppercase" style={{ color: contrast.text }}>
              Tactical_Command_Matrix_v4.0
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-3 py-1 bg-black/40 border border-emerald-500/20 rounded">
              <Icon name="Activity" size={14} className="text-emerald-500 opacity-50" />
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 h-3 rounded-full bg-emerald-500/20"
                    style={{
                      height: `${Math.random() * 10 + 4}px`,
                      backgroundColor: i < 3 ? "#10b981" : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-emerald-500/40 hover:text-emerald-500 transition-colors p-1"
            >
              <Icon name="CloseCircle" size={20} />
            </button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Sidebar ... */}
          <div
            className={`
                ${
                  showLeftSidebar
                    ? "fixed inset-y-0 left-0 z-40 bg-black/90"
                    : "hidden"
                }
                lg:relative lg:block
                w-64 border-r ${themeBorder} flex flex-col overflow-y-auto transition-colors duration-500
                ${
                  showLeftSidebar
                    ? "animate-in slide-in-from-left duration-200"
                    : ""
                }
            `}
            style={{ backgroundColor: `${themeHex}0D` }}
          >
            {[
              { id: "NMAP", label: "NMAP SCAN", icon: "Network" },
              { id: "METASPLOIT", label: "METASPLOIT", icon: "ShieldAlert" },
              { id: "PAYLOAD", label: "MSFVENOM", icon: "Cpu" },
              {
                id: "HTTP_C2",
                label: "PUPPET MASTER",
                icon: "Users",
                highlight: true,
              },
              { id: "BURP", label: "BURP SUITE", icon: "Globe" },
              { id: "WIRESHARK", label: "WIRESHARK", icon: "Activity" },
              { id: "JOHN", label: "JOHN CRACKER", icon: "Lock" },
              { id: "COBALT", label: "COBALT STRIKE", icon: "Zap" },
              {
                id: "SOURCE",
                label: "AI PENTESTER",
                icon: "Code2",
                highlight: true,
              },
            ].map((tab: any) => {
              // Determine if installed
              const backendName = TOOL_MAPPING[tab.id];
              // Default to true if not mapped or for C2 (which is virtual/internal)
              const isInstalled =
                tab.id === "HTTP_C2" ||
                tab.id === "COBALT" || // Assume cobalt manual install
                !backendName ||
                toolStatus[backendName] !== false;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setShowLeftSidebar(false);
                  }}
                  className={`p-3 sm:p-4 text-xs font-bold tracking-widest flex items-center gap-3 transition-all border-l-2 text-left 
                            ${
                              activeTab === tab.id
                                ? tab.highlight
                                  ? "bg-red-900/20 text-red-500 border-red-500"
                                  : `${themePrimary} ${themeBorder}`
                                : tab.highlight
                                  ? "text-red-800 border-transparent hover:text-red-600 hover:bg-red-900/10"
                                  : `${themePrimary} opacity-70 border-transparent hover:opacity-100`
                            }`}
                  style={
                    activeTab === tab.id && !tab.highlight
                      ? { backgroundColor: `${themeHex}1F` }
                      : !tab.highlight
                        ? {} // Hover handled via opacity for now, or use JS hover
                        : {}
                  }
                >
                  <div className="relative">
                    <Icon name={tab.icon as any} size={16} />
                    {!isInstalled && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    )}
                  </div>
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}

            <div
              className={`mt-auto p-3 sm:p-4 border-t ${themeBorder} text-[9px] sm:text-[10px] ${themePrimary} text-center opacity-70`}
            >
              AUTHORIZED USE ONLY
              <br />
              ETHICAL BOUNDARIES
            </div>
          </div>

          {/* Mobile Sidebar Backdrop */}
          {showLeftSidebar && (
            <div
              className="lg:hidden fixed inset-0 bg-black/80 z-30"
              onClick={() => setShowLeftSidebar(false)}
            />
          )}

          {/* Main Terminal View */}
          <div className="flex-1 flex flex-col relative">
            {activeTab === "HTTP_C2" ? (
              // ... (C2 UI - UNCHANGED) ...
              <div className="flex-1 flex flex-col bg-transparent">
                <div className="h-12 bg-red-950/20 border-b border-red-900/50 flex items-center justify-between px-4 text-red-500">
                  <div className="flex items-center gap-4">
                    <span className="font-bold flex items-center gap-2">
                      <Icon name="Users" size={16} /> C2 SESSIONS (ZOMBIES)
                    </span>
                    <span className="text-xs opacity-60">
                      {sessions.length} ONLINE
                    </span>
                  </div>
                  {isRefreshingC2 && (
                    <Icon name="RefreshCw" size={14} className="animate-spin" />
                  )}
                </div>

                <div className="flex-1 flex overflow-hidden">
                  {/* Session List */}
                  <div className="w-1/3 border-r border-red-900/30 overflow-y-auto">
                    {sessions.length === 0 && (
                      <div className="p-4 text-xs text-red-900 italic text-center">
                        No active sessions.
                        <br />
                        Deploy payload to connect.
                      </div>
                    )}
                    {sessions.map((s: any) => (
                      <div
                        key={s.id}
                        onClick={() => setSelectedSessionId(s.id)}
                        className={`p-3 border-b border-red-900/20 cursor-pointer hover:bg-red-900/10 transition-colors ${
                          selectedSessionId === s.id
                            ? "bg-red-900/20 border-l-2 border-l-red-500"
                            : ""
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div
                            className="text-xs font-bold text-red-400 truncate max-w-[150px]"
                            title={s.id}
                          >
                            {s.id}
                          </div>
                          <div className="text-[9px] text-red-800">
                            {new Date(s.lastSeen).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-red-600/60 font-mono">
                          <span>{s.ip}</span>
                          <span>Q: {s.pendingCommands}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Console */}
                  <div className="flex-1 flex flex-col bg-transparent relative">
                    {selectedSession ? (
                      <>
                        <div className="flex-1 overflow-y-auto font-mono text-[11px] p-4 flex flex-col gap-1 custom-scrollbar scroll-smooth bg-black/10">
                          <div className="flex items-center gap-2 mb-4 border-b pb-2 opacity-50" style={{ borderColor: contrast.border, color: contrast.text }}>
                            <Icon name="Lock" size={12} />
                            <span className="tracking-[0.2em] text-[9px]">SECURE_ENCLAVE_ACTIVE</span>
                            <span className="ml-auto flex items-center gap-2">
                              <Icon name="Flash" size={12} /> OMNI_NEURAL_ROUTE
                            </span>
                          </div>
                          {selectedSession.outputs.map((o: any, i: number) => (
                            <div key={i} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                              <div className="text-[9px] opacity-40 mb-1" style={{ color: contrast.text }}>
                                [{new Date(o.timestamp).toLocaleTimeString()}]
                              </div>
                              <div className="whitespace-pre-wrap break-all p-3 border rounded-sm bg-white/5" 
                                   style={{ 
                                     color: contrast.text,
                                     borderColor: `${themeHex}33`
                                   }}>
                                {o.output}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="p-2 bg-slate-900 border-t border-red-900/30 flex gap-2">
                          <input
                            className="flex-1 bg-black border border-red-900/50 text-red-500 font-mono text-xs px-3 py-2 focus:outline-none focus:border-red-500"
                            placeholder="Enter shell command..."
                            value={c2Command}
                            onChange={(e) => setC2Command(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleSendC2()
                            }
                          />
                          <button
                            onClick={handleSendC2}
                            className="bg-red-900/20 text-red-500 border border-red-900/50 px-4 hover:bg-red-500 hover:text-black transition-colors"
                          >
                            <Icon name="Send" size={14} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-red-900 text-xs font-mono">
                        SELECT A ZOMBIE SESSION TO INTERACT
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : // INSTALLATION BANNER CHECK
            TOOL_MAPPING[activeTab] &&
              toolStatus[TOOL_MAPPING[activeTab]] === false ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in relative overflow-hidden">
                {/* Background Glitch Effect */}
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    background: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${themeHex} 2px, ${themeHex} 4px)`,
                  }}
                ></div>

                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center border-2 mb-8 relative overflow-hidden group transition-all duration-500`}
                  style={{
                    borderColor: `${themeHex}`,
                    backgroundColor: `${themeHex}10`,
                    boxShadow: `0 0 30px ${themeHex}20`,
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-20 animate-pulse"
                    style={{ backgroundColor: themeHex }}
                  ></div>
                  <Icon
                    name="Cpu"
                    size={40}
                    className={`relative z-10 transition-transform duration-500 group-hover:scale-110`}
                    style={{ color: themeHex }}
                  />

                  {/* Rotating Ring */}
                  <div
                    className="absolute inset-0 border-2 border-t-transparent border-l-transparent rounded-full animate-spin-slow opacity-60"
                    style={{ borderColor: themeHex }}
                  ></div>
                </div>

                <h3
                  className="text-2xl font-bold mb-3 tracking-[0.2em] uppercase"
                  style={{
                    color: themeHex,
                    textShadow: `0 0 10px ${themeHex}60`,
                  }}
                >
                  Resource Missing
                </h3>

                <p
                  className={`text-sm max-w-md mb-10 font-mono opacity-70 leading-relaxed`}
                  style={{ color: themePrimary }}
                >
                  The system requires module{" "}
                  <span
                    className="font-bold border-b border-dashed"
                    style={{ borderColor: themeHex }}
                  >
                    {TOOL_MAPPING[activeTab].toUpperCase()}
                  </span>{" "}
                  to operate.
                  <br />
                  Detection failed in local environment PATH.
                </p>

                <button
                  onClick={() => handleInstall(activeTab)}
                  disabled={installingTool === activeTab}
                  className={`
                    px-8 py-4 rounded-sm text-sm font-bold tracking-widest border transition-all duration-300
                    flex items-center gap-4 group relative overflow-hidden
                    ${
                      installingTool === activeTab
                        ? "cursor-not-allowed opacity-50"
                        : "hover:bg-white/5 active:scale-95"
                    }
                  `}
                  style={{
                    borderColor: themeBorder,
                    color: themeHex,
                    boxShadow:
                      installingTool === activeTab
                        ? "none"
                        : `0 0 20px -5px ${themeHex}40`,
                  }}
                >
                  {/* Button Glitch Hover Bg */}
                  <div
                    className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 opacity-20"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${themeHex}, transparent)`,
                    }}
                  />

                  {installingTool === activeTab ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>INITIALIZING SETUP...</span>
                    </>
                  ) : (
                    <>
                      <Icon
                        name="Download"
                        size={18}
                        className="group-hover:animate-bounce"
                      />
                      <span>INSTALL VIA SYSTEM</span>
                    </>
                  )}
                </button>

                <div
                  className="mt-8 text-[10px] font-mono opacity-40 uppercase tracking-widest"
                  style={{ color: themePrimary }}
                >
                  [ System Dependency: Auto-Detection Active ]
                </div>
              </div>
            ) : (
              <>
                {/* Tab Header Info (Phase 4: Multi-Persona Aware) */}
                <div className="h-10 bg-green-900/10 border-b border-green-900 flex items-center px-4 text-xs text-green-600">
                  <span className="mr-4 font-bold">TOOL: {activeTab}</span>
                  <span className="mr-4">|</span>
                  <span className="mr-4">
                    STATUS: {terminalOutput.length > 2 ? "ACTIVE" : "IDLE"}
                  </span>

                  {activePentestId && activeSession && (
                    <>
                      <span className="mr-4">|</span>
                      <span
                        className="flex items-center gap-2 animate-pulse"
                        style={{ color: currentPhaseColor }}
                      >
                        <Icon name="Danger" size={14} />
                        SPECIALIST ENGAGED:{" "}
                        {activeSession.currentPhase?.toUpperCase() || "RECON"}
                      </span>
                    </>
                  )}
                  <button
                    onClick={clearHistory}
                    className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-black/40 hover:bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] text-emerald-500/60 hover:text-emerald-500 transition-all uppercase tracking-widest font-bold"
                  >
                    <Icon name="Refresh" size={12} />
                    Reset Buffer
                  </button>
                </div>

                {/* Terminal Output */}
                <div className="flex-1 bg-transparent p-6 overflow-y-auto font-mono text-xs text-green-500 shadow-inner">
                  {terminalOutput.map((line, i) => (
                    <div
                      key={i}
                      className="mb-1 whitespace-pre-wrap break-all hover:bg-white/5"
                    >
                      <span className="opacity-50 mr-2 select-none">$</span>
                      {line}
                    </div>
                  ))}
                  {/* Blinking Cursor */}
                  <div className="mt-2 w-2 h-4 bg-green-500 animate-pulse"></div>

                  {/* ATTACK PLAN OVERLAY (For SOURCE Tab) */}
                  {activeTab === "SOURCE" && attackPlan.length > 0 && (
                    <div className="mt-6 border-l-2 border-green-500/30 pl-4 space-y-4 animate-in fade-in duration-500">
                      <div className="text-[10px] text-green-700 font-bold tracking-widest uppercase flex items-center gap-2">
                        <Icon name="Activity" size={12} className="animate-pulse" />
                        Active Attack Strategy
                      </div>
                      {attackPlan.map((op, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded border ${op.status === "verified" ? "bg-green-900/20 border-green-500/50" : "bg-black/50 border-green-900/30"}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <Icon name="Danger"
                                size={14}
                                className={
                                  op.status === "verified"
                                    ? "text-green-400"
                                    : "text-green-700"
                                }
                              />
                              <span
                                className={`text-[11px] font-bold ${op.status === "verified" ? "text-green-400" : "text-green-700"}`}
                              >
                                {op.tool.toUpperCase()} FINDING
                              </span>
                            </div>
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full border ${op.status === "verified" ? "bg-green-500 text-black border-green-400" : "bg-green-950 text-green-700 border-green-900"}`}
                            >
                              {op.status?.toUpperCase() || "QUEUED"}
                            </span>
                          </div>
                          <div className="text-[10px] text-green-400/80 italic mb-2">
                            &quot;{op.reasoning || op.command}&quot;
                          </div>

                          {op.status === "verified" && onOpenBrowser && (
                            <button
                              onClick={() =>
                                onOpenBrowser(
                                  sourceUrl,
                                  sourcePath || undefined,
                                )
                              }
                              className="w-full py-1.5 bg-green-500 hover:bg-green-400 text-black text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 rounded-sm"
                            >
                              <Icon name="Globe" size={12} />
                              Open Verification Browser
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Manual Control Forms (Tab-Specific) */}
                <div className="border-t border-green-900 bg-transparent p-3 space-y-2">
                  {/* NMAP SCAN FORM */}
                  {activeTab === "NMAP" && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={nmapTarget}
                        onChange={(e) => setNmapTarget(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleNmapScan()}
                        placeholder="Target IP (e.g., 192.168.1.1)"
                        className="flex-1 bg-green-950/40 border border-green-800 rounded px-3 py-2 text-xs text-green-300 placeholder-green-800 focus:outline-none focus:border-green-600"
                      />
                      <select
                        value={nmapScanType}
                        onChange={(e) => setNmapScanType(e.target.value)}
                        className="bg-green-950/40 border border-green-800 rounded px-2 py-2 text-xs text-green-300 focus:outline-none"
                      >
                        <option value="quick">Quick</option>
                        <option value="full">Full</option>
                        <option value="stealth">Stealth</option>
                      </select>
                      <button
                        onClick={handleNmapScan}
                        disabled={isExecuting}
                        className="px-4 py-2 bg-green-900/50 border border-green-700 rounded text-xs font-bold text-green-300 hover:bg-green-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isExecuting ? "SCANNING..." : "RUN SCAN"}
                      </button>
                    </div>
                  )}

                  {/* PAYLOAD GENERATOR FORM */}
                  {activeTab === "PAYLOAD" && (
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={payloadOS}
                        onChange={(e) => setPayloadOS(e.target.value)}
                        className="bg-green-950/40 border border-green-800 rounded px-2 py-1.5 text-xs text-green-300"
                      >
                        <option value="windows">Windows</option>
                        <option value="linux">Linux</option>
                        <option value="android">Android</option>
                      </select>
                      <select
                        value={payloadFormat}
                        onChange={(e) => setPayloadFormat(e.target.value)}
                        className="bg-green-950/40 border border-green-800 rounded px-2 py-1.5 text-xs text-green-300"
                      >
                        <option value="exe">EXE</option>
                        <option value="elf">ELF</option>
                        <option value="apk">APK</option>
                      </select>
                      <input
                        type="text"
                        value={payloadLHOST}
                        onChange={(e) => setPayloadLHOST(e.target.value)}
                        placeholder="LHOST (your IP)"
                        className="bg-green-950/40 border border-green-800 rounded px-2 py-1.5 text-xs text-green-300 placeholder-green-800"
                      />
                      <input
                        type="text"
                        value={payloadLPORT}
                        onChange={(e) => setPayloadLPORT(e.target.value)}
                        placeholder="LPORT (4444)"
                        className="bg-green-950/40 border border-green-800 rounded px-2 py-1.5 text-xs text-green-300 placeholder-green-800"
                      />
                      <button
                        onClick={handlePayloadGenerate}
                        disabled={isExecuting}
                        className="col-span-2 px-4 py-2 bg-green-900/50 border border-green-700 rounded text-xs font-bold text-green-300 hover:bg-green-800/50 disabled:opacity-50"
                      >
                        {isExecuting ? "GENERATING..." : "GENERATE PAYLOAD"}
                      </button>
                    </div>
                  )}

                  {/* SOURCE INTEL FORM (Phase 3: Session Aware) */}
                  {activeTab === "SOURCE" && (
                    <div className="flex flex-col gap-2">
                      {/* Active Sessions Mini-Dashboard */}
                      {pentestSessions.length > 0 && (
                        <div className="bg-green-950/20 border border-green-900/50 rounded p-2 mb-2">
                          <div className="text-[9px] text-green-700 font-bold mb-2 flex justify-between">
                            <span>ACTIVE PENTEST SESSIONS</span>
                            <span>{pentestSessions.length} RUNNING</span>
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {pentestSessions.map((s) => (
                              <div
                                key={s.id}
                                onClick={() => setActivePentestId(s.id)}
                                className={`flex-shrink-0 px-3 py-1 rounded border text-[10px] cursor-pointer transition-all ${activePentestId === s.id ? "bg-green-500 text-black border-green-400" : "bg-green-950/40 text-green-600 border-green-900"}`}
                              >
                                {s.projectName} ({s.currentPhase})
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <div className="text-[9px] text-green-600 font-mono mb-1">
                              TARGET URL (For Source Discovery / Blind Mode)
                            </div>
                            <input
                              type="text"
                              value={sourceUrl}
                              onChange={(e) => setSourceUrl(e.target.value)}
                              placeholder="https://target-app.com"
                              className="w-full bg-green-950/40 border border-green-800 rounded px-3 py-2 text-xs text-green-300 placeholder-green-800 focus:outline-none focus:border-green-600"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="text-[9px] text-green-600 font-mono mb-1">
                              LOCAL REPO PATH (Optional Override)
                            </div>
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={sourcePath}
                                onChange={(e) => setSourcePath(e.target.value)}
                                placeholder="/path/to/source/code"
                                className="w-full bg-green-950/40 border border-green-800 rounded px-3 py-2 text-xs text-green-300 placeholder-green-800 focus:outline-none focus:border-green-600"
                              />
                              <button
                                onClick={handleSelectDirectory}
                                className="p-2 bg-green-900/30 border border-green-800 rounded hover:bg-green-800/50 text-green-400"
                                title="Select Directory"
                              >
                                <Icon name="FolderOpen" size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={handleAutoExploit}
                              disabled={
                                isExecuting || (!sourceUrl && !sourcePath)
                              }
                              className="h-[34px] px-6 bg-green-900/50 border border-green-700 rounded text-xs font-bold text-green-300 hover:bg-green-800/50 disabled:opacity-50 disabled:cursor-not-allowed animate-pulse"
                            >
                              {isExecuting ? "WEAPONIZING..." : "AUTO-ATTACK"}
                            </button>
                          </div>
                        </div>

                        <div className="text-[10px] text-green-800 font-mono mt-1">
                          * If source is found or provided, Tactical Reader will
                          generate a precision attack plan.
                          <br />* If not, system falls back to Blind Mode
                          (Nmap/Crawling).
                        </div>
                      </div>
                    </div>
                  )}

                  {/* GENERIC MANUAL COMMAND (OTHER TABS) */}
                  {!["NMAP", "PAYLOAD", "HTTP_C2", "SOURCE"].includes(
                    activeTab,
                  ) && (
                    <div className="flex gap-2">
                      <span className="text-green-700 font-bold pt-2">
                        &gt;
                      </span>
                      <input
                        type="text"
                        value={manualCommand}
                        onChange={(e) => setManualCommand(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleManualCommand()
                        }
                        placeholder="MANUAL MODE ENABLED // Enter command or use voice/chat..."
                        className="flex-1 bg-transparent border-none outline-none text-green-300 text-xs font-mono placeholder-green-800 focus:text-green-100"
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Panel ... (UNCHANGED) */}
          <div
            className={`
                ${
                  showRightPanel
                    ? "fixed inset-y-0 right-0 z-40 bg-black/90"
                    : "hidden"
                }
                lg:relative lg:block
                w-80 border-l border-green-900 flex flex-col p-3 sm:p-4 transition-colors duration-500
                ${
                  showRightPanel
                    ? "animate-in slide-in-from-right duration-200"
                    : ""
                }
            `}
            style={{ backgroundColor: `${themeHex}0D` }}
          >
            {/* ... right panel content ... */}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-xs font-bold text-green-600 border-b border-green-900 pb-2 flex-1">
                VISUAL FEED
              </h3>
              <button
                onClick={() => setShowRightPanel(false)}
                className="lg:hidden text-green-600 hover:text-green-400 p-1"
              >
                <Icon name="X" size={16} />
              </button>
            </div>

            <div className="flex-1 relative border border-green-900/30 bg-green-900/5 rounded overflow-hidden">
              {/* NMAP GRAPH */}
              {activeTab === "NMAP" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 border-2 border-green-500/20 rounded-full flex items-center justify-center relative animate-spin-slow">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="absolute top-0 w-px h-12 sm:h-16 bg-green-500/50"></div>
                  </div>
                  <div className="absolute top-10 left-10 text-[8px] text-green-700">
                    PORT 80
                  </div>
                  <div className="absolute bottom-10 right-10 text-[8px] text-green-700">
                    PORT 443
                  </div>
                </div>
              )}

              {/* HTTP C2 MAP */}
              {activeTab === "HTTP_C2" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500">
                  <Icon name="Network" size={48} className="sm:size-16 opacity-50" />
                  <div className="text-[9px] mt-4 text-red-700 animate-pulse text-center">
                    C2 ACTIVE
                    <br />
                    PORT 3001
                  </div>
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,rgba(220,38,38,0.1)_1px,transparent_1px)] bg-[size:10px_10px]"></div>
                </div>
              )}

              {/* WIRESHARK PACKET STREAM */}
              {activeTab === "WIRESHARK" && (
                <div className="absolute inset-0 p-2 space-y-1 overflow-hidden">
                  {Array.from({ length: 15 }).map((_, _i) => (
                    <div
                      key={_i}
                      className="h-1 bg-green-900/40 w-full overflow-hidden"
                    >
                      <div
                        className="h-full bg-green-500 animate-scan"
                        style={{
                          width: Math.random() * 100 + "%",
                          animationDuration: Math.random() + "s",
                        }}
                      ></div>
                    </div>
                  ))}
                </div>
              )}

              {/* METASPLOIT TARGET */}
              {activeTab === "METASPLOIT" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icon
                    name="ShieldAlert"
                    size={48}
                    className="sm:size-16 text-green-900 opacity-50"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 border border-green-500 rounded-full animate-ping opacity-20"></div>
                  </div>
                </div>
              )}

              {/* PAYLOAD GEN */}
              {activeTab === "PAYLOAD" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Icon
                    name="Cpu"
                    size={40}
                    className="sm:size-12 text-green-500 animate-pulse"
                  />
                  <div className="w-24 h-2 sm:w-32 bg-green-900 rounded overflow-hidden">
                    <div className="h-full bg-green-500 animate-[marquee_1s_linear_infinite]"></div>
                  </div>
                  <div className="text-[9px] text-green-700">COMPILING...</div>
                </div>
              )}

              {/* DEFAULT GENERIC */}
              {(activeTab === "BURP" ||
                activeTab === "JOHN" ||
                activeTab === "COBALT") && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-green-900">
                  <Icon name="Activity" size={40} className="sm:size-12 animate-pulse" />
                  <div className="mt-2 text-[9px]">ACTIVE</div>
                </div>
              )}
            </div>

            <div className="h-1/3 mt-3 sm:mt-4 border-t border-green-900 pt-2">
              <div className="text-[9px] text-green-800 font-mono space-y-1">
                <div>CPU: {Math.floor(Math.random() * 30 + 10)}%</div>
                <div>MEM: {Math.floor(Math.random() * 40 + 20)}%</div>
                <div>NET: {Math.floor(Math.random() * 500)} KB/s</div>
                <div className="truncate">PROXY: 127.0.0.1:9050</div>
              </div>
            </div>
          </div>

          {/* Mobile Right Panel Backdrop (UNCHANGED) */}
          {showRightPanel && (
            <div
              className="lg:hidden fixed inset-0 bg-black/80 z-30"
              onClick={() => setShowRightPanel(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default HackingTerminal;
