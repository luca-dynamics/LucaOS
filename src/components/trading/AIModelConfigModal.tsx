import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { AIModel } from "../../types/trading";

interface AIModelConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: AIModel | null;
}

export default function AIModelConfigModal({
  isOpen,
  onClose,
  onSave,
  initialData
}: AIModelConfigModalProps) {
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setProvider(initialData.provider.toLowerCase());
        setApiKey(initialData.apiKey || "");
        setCustomUrl(initialData.customApiUrl || "");
        setEnabled(initialData.enabled);
      } else {
        setProvider("openai");
        setApiKey("");
        setCustomUrl("");
        setEnabled(true);
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSave({
      id: initialData?.id, // undefined means new logic handled by parent
      provider,
      name: `${
        provider.charAt(0).toUpperCase() + provider.slice(1)
      } Integration`,
      apiKey,
      customApiUrl: customUrl,
      enabled,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 glass-blur animate-in fade-in duration-200 p-0 sm:p-4">
      <div className="bg-[#161b22] border-none sm:border border-slate-700/50 rounded-none sm:rounded-xl w-full h-full sm:h-auto sm:max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-full sm:max-h-[90vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-800 bg-[#0d1017] flex items-center justify-between flex-shrink-0 relative z-30">
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border bg-[var(--app-primary)]/10 border-[var(--app-primary)]/30"
              style={{ boxShadow: "0 0 15px rgba(var(--app-primary-rgb), 0.15)" }}
            >
              <Icon name="MagicStick" variant="BoldDuotone" size={18} style={{ color: "var(--app-primary)" }} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                AI Configuration
              </h3>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                LLM Reasoning Engines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative z-50 text-slate-500 hover:text-white transition-all bg-white/5 hover:bg-white/10 p-2 rounded-lg cursor-pointer active:scale-95 flex-shrink-0"
          >
            <Icon name="CloseCircle" variant="BoldDuotone" size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 bg-[#0b0e14]">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              AI Provider
            </label>
            <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
              {[
                "openai",
                "anthropic",
                "deepseek",
                "google",
                "xai",
                "moonshot",
                "alibaba",
              ].map((p) => {
                const isActive = provider === p;
                return (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold capitalize transition-all border ${
                    isActive
                      ? "text-[#050505] bg-[var(--app-primary)] border-[var(--app-primary)] shadow-[0_8px_20px_rgba(var(--app-primary-rgb),0.2)]"
                      : "bg-[#0d1017] text-slate-400 border-slate-800 hover:border-slate-600"
                  }`}
                >
                  {p}
                </button>
                );
              })}
            </div>
          </div>

          {/* API Credentials */}
          <div className="space-y-4 p-4 bg-[#0d1017] border border-slate-800 rounded-xl">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Provider API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className={`w-full bg-[#161b22] border rounded-xl px-3 py-3 text-white text-sm focus:outline-none font-mono transition-all ${apiKey ? "border-[var(--app-primary)]/50" : "border-slate-700"}`}
                placeholder="sk-..."
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Custom Base URL (Optional)
              </label>
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className={`w-full bg-[#161b22] border rounded-xl px-3 py-3 text-white text-sm focus:outline-none font-mono transition-all ${customUrl ? "border-[var(--app-primary)]/50" : "border-slate-700"}`}
                placeholder="e.g. https://api.openai.com/v1"
              />
              <p className="text-[10px] text-slate-600 mt-1">
                Leave empty to use default provider endpoint.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${enabled ? "bg-[var(--app-primary)]" : "bg-slate-700"}`}
              onClick={() => setEnabled(!enabled)}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                  enabled ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </div>
            <span className="text-xs text-slate-300 font-bold">
              Enable this provider for trading selection
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-800 bg-[#0d1017] flex flex-col sm:flex-row justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="order-2 sm:order-1 px-6 py-3 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!apiKey}
            className="order-1 sm:order-2 px-8 py-3 sm:py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg bg-[var(--app-primary)] text-[#050505]"
            style={{ 
              boxShadow: "0 10px 20px rgba(var(--app-primary-rgb), 0.2)"
            }}
          >
            <Icon name="MagicStick" variant="BoldDuotone" size={16} /> Save Provider
          </button>
        </div>
      </div>
    </div>
  );
}
