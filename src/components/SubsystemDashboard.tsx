import React, { useState, useEffect, useRef } from "react";
import { Icon } from "./ui/Icon";
import { Subsystem, SubsystemLog } from "../types";
import { apiUrl } from "../config/api";

interface Props {
  onClose: () => void;
  onOpenWebview?: (url: string, title: string) => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

const SubsystemDashboard: React.FC<Props> = ({
  onClose,
  onOpenWebview,
  theme,
}) => {
  const themeHex = theme?.hex || "#06b6d4";
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [selectedSubsystem, setSelectedSubsystem] = useState<string | null>(null);
  const [logs, setLogs] = useState<SubsystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSubsystems();
    const interval = setInterval(fetchSubsystems, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedSubsystem) {
      fetchLogs(selectedSubsystem);
      const interval = setInterval(() => fetchLogs(selectedSubsystem), 2000);
      return () => clearInterval(interval);
    }
  }, [selectedSubsystem]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const fetchSubsystems = async () => {
    try {
      const res = await fetch(apiUrl("/api/subsystems/list"));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSubsystems(data);
        } else if (data?.subsystems) {
          setSubsystems(Array.isArray(data.subsystems) ? data.subsystems : Object.values(data.subsystems));
        }
      }
    } catch {
      console.error("Failed to fetch subsystems");
    }
  };

  const fetchLogs = async (id: string) => {
    try {
      const res = await fetch(apiUrl(`/api/subsystems/${id}/logs?limit=200`));
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      console.error("Failed to fetch logs");
    }
  };

  const handleAction = async (id: string, action: "stop" | "restart") => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/subsystems/${id}/${action}`), { method: "POST" });
      if (res.ok) await fetchSubsystems();
    } catch {
      alert(`Failed to ${action} subsystem`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this subsystem?")) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/subsystems/${id}`), { method: "DELETE" });
      if (res.ok) {
        await fetchSubsystems();
        if (selectedSubsystem === id) setSelectedSubsystem(null);
      }
    } catch {
      alert("Failed to remove subsystem");
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (ms: number) => {
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    if (hr > 0) return `${hr}h ${min % 60}m`;
    if (min > 0) return `${min}m ${sec % 60}s`;
    return `${sec}s`;
  };

  const selected = subsystems.find((s) => s.id === selectedSubsystem);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-6 font-sans">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full h-full sm:h-[90vh] sm:w-[95%] max-w-7xl bg-[#0b0b0b] border border-white/10 rounded-none sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="h-16 flex-shrink-0 border-b border-white/10 flex items-center justify-between px-6 bg-[#111111]/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${themeHex}15` }}>
              <Icon name="Activity" size={20} style={{ color: themeHex }} variant="BoldDuotone" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base tracking-wide">Subsystem Orchestrator</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                {subsystems.filter(s => s.status === "RUNNING").length} of {subsystems.length} processes active
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors border border-transparent hover:border-white/10"
          >
            <Icon name="X" size={18} className="text-slate-400 hover:text-white" />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Sidebar / Process List */}
          <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#111111]/30 flex flex-col">
            <div className="px-5 py-3 border-b border-white/10">
              <h3 className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Managed Processes</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar">
              {subsystems.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubsystem(sub.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all group ${
                    selectedSubsystem === sub.id
                      ? "bg-white/[0.06] border-white/20 shadow-lg"
                      : "bg-transparent border-transparent hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${
                        sub.status === "RUNNING" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" :
                        sub.status === "ERROR" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-slate-700"
                      }`} />
                      <span className="text-sm font-bold text-white transition-colors group-hover:text-white">
                        {sub.name}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1.5 text-[10px] font-mono text-slate-500">
                    <span className="flex items-center gap-1.5">PID: <span className="text-slate-300">{sub.pid || "—"}</span></span>
                    <span className="flex items-center gap-1.5 ml-auto">PORT: <span className="text-slate-300">{sub.port || "—"}</span></span>
                    <div className="col-span-2 h-1 bg-white/[0.04] rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-slate-500/30" style={{ width: `${Math.min(100, sub.cpu || 0)}%` }} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Center: Logs Viewer */}
          <div className="flex-1 bg-black flex flex-col overflow-hidden">
            {selectedSubsystem && selected ? (
              <>
                <div className="h-16 border-b border-white/10 bg-[#111111]/20 flex items-center justify-between px-6">
                  <div className="flex items-center gap-3">
                    <Icon name="Terminal" size={18} style={{ color: themeHex }} variant="BoldDuotone" />
                    <div>
                      <h3 className="text-white font-bold text-sm tracking-wide">{selected.name}</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {selected.startTime ? `Up ${formatUptime(Date.now() - selected.startTime)}` : "Not running"} · {selected.logCount || 0} events
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selected.port && (
                      <button
                        onClick={() => onOpenWebview ? onOpenWebview(`http://127.0.0.1:${selected.port}`, selected.name) : window.open(`http://127.0.0.1:${selected.port}`, "_blank")}
                        className="px-3 py-1.5 bg-white/[0.04] border border-white/10 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all"
                      >
                        OPEN WEBVIEW
                      </button>
                    )}
                    <button
                      onClick={() => handleAction(selected.id, "restart")}
                      disabled={loading || selected.status !== "RUNNING"}
                      className="px-3 py-1.5 bg-white/[0.04] border border-white/10 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-30"
                    >
                      RESTART
                    </button>
                    <button
                      onClick={() => handleAction(selected.id, "stop")}
                      disabled={loading || selected.status !== "RUNNING"}
                      className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] font-bold text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-30"
                    >
                      STOP
                    </button>
                    <button
                      onClick={() => handleRemove(selected.id)}
                      disabled={loading}
                      className="p-1.5 bg-white/[0.04] border border-white/10 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.08] transition-all"
                    >
                      <Icon name="Trash" size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5 font-mono text-[11px] leading-relaxed custom-scrollbar">
                  {logs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-700 italic">No logs available for this process</div>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className="mb-0.5 group flex gap-4">
                        <span className="text-slate-600 shrink-0 select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span className={`${log.type === "stderr" || log.type === "error" ? "text-red-400" : "text-slate-300"} break-all`}>
                          {log.data}
                        </span>
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center mb-4 text-slate-700">
                  <Icon name="Search" size={32} />
                </div>
                <p className="text-slate-500 font-medium">No process selected</p>
                <p className="text-slate-700 text-xs mt-1 max-w-[200px]">Select a subsystem from the sidebar to view metrics and live logs</p>
              </div>
            )}
          </div>

          {/* Right: Metrics Panel */}
          {selectedSubsystem && selected && (
            <div className="w-full lg:w-64 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#111111]/30 p-5 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
              <div>
                <h3 className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-4">Process Metrics</h3>
                <div className="space-y-5">
                  {/* CPU */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-slate-500">CPU Usage</span>
                      <span className="text-white font-mono">{(selected.cpu ?? 0).toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full transition-all duration-700" style={{ width: `${Math.min(100, selected.cpu ?? 0)}%`, backgroundColor: themeHex }} />
                    </div>
                  </div>
                  {/* RAM */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-slate-500">Memory</span>
                      <span className="text-white font-mono">{(selected.mem ?? 0).toFixed(1)} MB</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-slate-500" style={{ width: `${Math.min(100, (selected.mem ?? 0) / 10)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-white/10 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Status</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    selected.status === "RUNNING" ? "bg-green-500/10 text-green-500" : "bg-slate-500/10 text-slate-400"
                  }`}>
                    {selected.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Type</span>
                  <span className="text-[10px] text-slate-300 font-mono">SYSTEM_NODE</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubsystemDashboard;
