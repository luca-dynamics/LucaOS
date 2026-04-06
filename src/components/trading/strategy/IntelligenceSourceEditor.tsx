import React, { useState } from "react";
import { Icon } from "../../ui/Icon";
import { IntelligenceSource } from "../../../types/trading";

interface IntelligenceSourceEditorProps {
  sources?: IntelligenceSource[];
  onChange: (sources: IntelligenceSource[]) => void;
  theme?: { hex: string; primary: string; border: string; bg: string; isLight?: boolean };
}

export function IntelligenceSourceEditor({ sources = [], onChange, theme }: IntelligenceSourceEditorProps) {
  const isLight = theme?.isLight;
  const [newPath, setNewPath] = useState("");
  const [newType, setNewType] = useState<"url" | "file">("url");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleAdd = () => {
    if (!newPath) return;
    const source: IntelligenceSource = {
      type: newType,
      path: newPath,
      label: newPath.split("/").pop() || newPath,
    };
    onChange([...sources, source]);
    setNewPath("");
  };

  const handleSelectFile = async () => {
    const filePath = await (window as any).electron?.ipcRenderer.invoke('select-file', {
      title: 'Select Alpha Signal File',
      filters: [
        { name: 'Signals & Logs', extensions: ['log', 'txt', 'csv'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    if (filePath) {
      setNewPath(filePath);
    }
  };

  const handleRemove = (index: number) => {
    onChange(sources.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className={`p-4 border rounded-xl ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#050505] border-white/10"}`}>
        <h3 className={`text-[10px] font-black tracking-[0.2em] uppercase ${isLight ? "text-slate-500" : "text-slate-500"} mb-6 flex items-center gap-2`}>
          <Icon name="Activity" size={14} style={{ color: theme?.hex || "#0ea5e9" }} />
          Intelligence Watchers
        </h3>

        <div className="flex items-center gap-2 mb-6">
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${
                isLight ? "bg-white border-slate-200 text-slate-700" : "bg-[#0c0c0c] border-white/5 text-slate-300"
              }`}
            >
              {newType}
              <Icon name="ChevronDown" size={10} className={`transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isDropdownOpen && (
              <div className={`absolute top-full left-0 mt-1 w-32 border rounded-xl shadow-2xl z-[100] py-1 ${
                isLight ? "bg-white border-slate-200 shadow-slate-200/50" : "bg-[#111] border-white/10 shadow-black/50"
              }`}>
                {(['url', 'file'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setNewType(type);
                      setIsDropdownOpen(false);
                      setNewPath("");
                    }}
                    className={`w-full text-left px-3 py-1.5 text-[9px] font-black uppercase tracking-widest flex items-center justify-between group ${
                      newType === type 
                        ? (isLight ? "text-slate-900 bg-slate-50" : "text-white bg-white/5") 
                        : (isLight ? "text-slate-500" : "text-slate-500")
                    } hover:text-white transition-colors`}
                    style={newType === type ? { color: theme?.hex } : {}}
                  >
                    {type}
                    {newType === type && <Icon name="Check" size={10} style={{ color: theme?.hex }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder={newType === "url" ? "Enter Data Stream URL..." : "No File Selected"}
              readOnly={newType === "file"}
              onClick={newType === "file" ? handleSelectFile : undefined}
              className={`w-full ${isLight ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-[#080808] border-white/5 text-white"} rounded-lg px-3 py-1.5 text-[10px] font-mono outline-none border transition-all placeholder:text-slate-700 cursor-${newType === 'file' ? 'pointer' : 'text'}`}
              style={{ borderColor: `${theme?.hex || "#0ea5e9"}33` }}
            />
            {newType === "file" && (
              <button 
                onClick={handleSelectFile}
                className="absolute right-2 p-1 hover:bg-white/5 rounded-sm transition-colors text-slate-500"
              >
                <Icon name="FolderOpen" size={12} />
              </button>
            )}
          </div>

          <button
            onClick={handleAdd}
            disabled={!newPath}
            className={`p-2 rounded-lg border border-transparent transition-all shadow-lg ${
              !newPath ? "opacity-20 cursor-not-allowed bg-white/5 text-slate-500" : "hover:brightness-125 active:scale-95"
            }`}
            style={{ 
              backgroundColor: newPath ? `${theme?.hex || "#0ea5e9"}1a` : "transparent",
              borderColor: newPath ? `${theme?.hex || "#0ea5e9"}33` : "rgba(255,255,255,0.05)",
              color: newPath ? (theme?.hex || "#0ea5e9") : "rgba(255,255,255,0.2)"
            }}
          >
            <Icon name="Plus" size={14} />
          </button>
        </div>

        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
          {sources.length === 0 && (
            <div className={`text-center py-6 ${isLight ? "text-slate-400 bg-slate-50/50" : "text-slate-700 bg-black/20"} text-[9px] font-black border border-dashed ${isLight ? "border-slate-200" : "border-white/5"} rounded-sm tracking-[0.2em]`}>
              No Active Watchers Deployed
            </div>
          )}
          {sources.map((source, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-2.5 rounded-lg border transition-all group ${
                isLight ? "bg-slate-50 border-slate-200 hover:border-slate-300" : "bg-[#080808] border-white/5 hover:border-white/10"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-1.5 rounded-lg shadow-inner ${source.type === 'url' ? 'bg-cyan-500/5 text-cyan-500/50' : 'bg-amber-500/5 text-amber-500/50'}`}>
                  {source.type === 'url' ? <Icon name="Globe" size={12} /> : <Icon name="FileCode" size={12} />}
                </div>
                <div className="min-w-0">
                  <div className={`text-[10px] font-black uppercase tracking-widest truncate transition-colors`} style={{ color: theme?.hex }}>
                    {source.label}
                  </div>
                  <div className={`text-[9px] ${isLight ? "text-slate-400" : "text-slate-600"} font-mono truncate opacity-60`}>
                    {source.path}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRemove(idx)}
                className="p-1.5 text-slate-700 hover:text-rose-500 transition-colors"
                title="Deactivate Watcher"
              >
                <Icon name="Trash" size={10} />
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
}
