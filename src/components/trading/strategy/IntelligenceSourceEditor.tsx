import React, { useState } from "react";
import * as LucideIcons from "lucide-react";
const {
  Plus,
  Trash2,
  FileText,
  Link,
  Search,
} = LucideIcons as any;
import { IntelligenceSource } from "../../../types/trading";

interface IntelligenceSourceEditorProps {
  sources?: IntelligenceSource[];
  onChange: (sources: IntelligenceSource[]) => void;
}

export function IntelligenceSourceEditor({ sources = [], onChange }: IntelligenceSourceEditorProps) {
  const [newPath, setNewPath] = useState("");
  const [newType, setNewType] = useState<"url" | "file">("url");

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

  const handleRemove = (index: number) => {
    onChange(sources.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#1e2329] p-4 rounded-xl border border-white/5">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <Search size={16} className="text-indigo-400" />
          Cross-OS Watchers
        </h3>

        <div className="flex gap-2 mb-4">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as "url" | "file")}
            className="bg-[#0b0e14] border border-slate-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
          >
            <option value="url">URL</option>
            <option value="file">File</option>
          </select>
          <input
            type="text"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            placeholder={newType === "url" ? "https://twitter.com/whale_alert" : "/path/to/alpha.txt"}
            className="flex-1 bg-[#0b0e14] border border-slate-700 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleAdd}
            className="p-2 bg-indigo-500 hover:bg-indigo-600 rounded text-white transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin">
          {sources.length === 0 && (
            <div className="text-center py-4 text-slate-500 text-[10px] uppercase font-bold border border-dashed border-slate-800 rounded">
              No intelligence sources added
            </div>
          )}
          {sources.map((source, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded bg-black/20 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-1.5 rounded ${source.type === 'url' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  {source.type === 'url' ? <Link size={12} /> : <FileText size={12} />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate max-w-[150px]">
                    {source.label}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                    {source.path}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRemove(idx)}
                className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
