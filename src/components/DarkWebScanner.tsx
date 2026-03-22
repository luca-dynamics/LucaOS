import React, { useState } from "react";
import * as LucideIcons from "lucide-react";
const {
  X,
  ShieldAlert,
  AlertTriangle,
  Search,
  Loader2,
  Globe,
  Lock,
  CheckCircle,
  XCircle,
} = LucideIcons as any;

interface Props {
  onClose: () => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

const DISCLAIMER = `⚠️ LEGAL DISCLAIMER ⚠️

This tool accesses the Tor network to search .onion sites.

• You are solely responsible for compliance with local laws.
• Intended for authorized security research only.
• Developers assume no liability for misuse.
`;

const DarkWebScanner: React.FC<Props> = ({ onClose, theme }) => {
  const themeHex = theme?.hex || "#ef4444";
  const themeBorder = theme?.border || "border-red-500";
  const themePrimary = theme?.primary || "text-red-500";

  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [query, setQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [torStatus, setTorStatus] = useState<
    "unknown" | "checking" | "online" | "offline"
  >("unknown");

  const checkTorStatus = async () => {
    setTorStatus("checking");
    try {
      const res = await fetch("/api/osint/darkweb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "test", accept_disclaimer: true }),
      });
      const data = await res.json();
      if (data.status === "error" && data.message?.includes("Tor proxy")) {
        setTorStatus("offline");
      } else {
        setTorStatus("online");
      }
    } catch {
      setTorStatus("offline");
    }
  };

  const handleScan = async () => {
    if (!query.trim()) return;
    setIsScanning(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/osint/darkweb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, accept_disclaimer: true }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setResults(data);
      } else {
        setError(data.message || "Scan failed");
      }
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className={`relative w-[90%] max-w-2xl bg-black/60 backdrop-blur-xl border ${themeBorder}/40 rounded-sm flex flex-col overflow-hidden shadow-2xl`}
        style={{ boxShadow: `0 0 60px -20px ${themeHex}40` }}
      >
        {/* Header */}
        <div
          className={`h-14 border-b ${themeBorder}/30 flex items-center justify-between px-5`}
          style={{ backgroundColor: `${themeHex}15` }}
        >
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} className={themePrimary} />
            <h2 className="font-display text-lg font-bold text-white tracking-widest">
              DARK WEB SCANNER
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Disclaimer Gate */}
          {!disclaimerAccepted ? (
            <div className="flex flex-col items-center text-center">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center border-2 ${themeBorder} mb-6 relative`}
                style={{ backgroundColor: `${themeHex}15` }}
              >
                <AlertTriangle size={36} className={themePrimary} />
                <div
                  className="absolute inset-0 border-2 border-t-transparent rounded-full animate-spin opacity-30"
                  style={{ borderColor: themeHex }}
                />
              </div>

              <h3
                className="text-xl font-bold tracking-widest mb-4"
                style={{ color: themeHex }}
              >
                RESTRICTED ACCESS
              </h3>

              <pre className="text-left text-xs text-slate-400 font-mono whitespace-pre-wrap bg-black/40 p-4 border border-slate-800 rounded mb-6 max-w-md flex flex-col gap-2">
                <div className="flex items-center gap-2 text-red-500 font-bold border-b border-red-900/50 pb-2 mb-2">
                  <AlertTriangle size={16} />
                  <span>LEGAL CAUTION REQUIRED</span>
                </div>
                {DISCLAIMER}
              </pre>

              <button
                onClick={() => {
                  setDisclaimerAccepted(true);
                  checkTorStatus();
                }}
                className={`px-8 py-3 rounded-sm font-bold tracking-widest text-sm border ${themeBorder} transition-all hover:bg-white/10`}
                style={{ color: themeHex }}
              >
                I ACCEPT — PROCEED
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tor Status */}
              <div
                className={`p-3 rounded flex items-center gap-3 text-xs font-mono border ${
                  torStatus === "online"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : torStatus === "offline"
                      ? "border-red-500/30 bg-red-500/10 text-red-400"
                      : "border-slate-700 bg-slate-900 text-slate-400"
                }`}
              >
                {torStatus === "checking" && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                {torStatus === "online" && <CheckCircle size={14} />}
                {torStatus === "offline" && <XCircle size={14} />}
                {torStatus === "unknown" && <Globe size={14} />}
                <span>
                  {torStatus === "checking" && "Checking Tor status..."}
                  {torStatus === "online" &&
                    "Tor Proxy: CONNECTED (127.0.0.1:9050)"}
                  {torStatus === "offline" &&
                    "Tor Proxy: OFFLINE — Start Tor service to continue"}
                  {torStatus === "unknown" && "Tor status unknown"}
                </span>
              </div>

              {/* Search Input */}
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleScan()}
                    placeholder="Enter search query (e.g., leaked credentials)"
                    className="w-full bg-slate-900/80 border border-slate-700 rounded pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50"
                    disabled={torStatus !== "online"}
                  />
                </div>
                <button
                  onClick={handleScan}
                  disabled={
                    isScanning || torStatus !== "online" || !query.trim()
                  }
                  className={`px-6 py-2.5 rounded font-bold text-xs tracking-wider flex items-center gap-2 transition-all ${
                    isScanning || torStatus !== "online"
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-red-600 text-white hover:bg-red-500"
                  }`}
                >
                  {isScanning ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      SCANNING...
                    </>
                  ) : (
                    <>
                      <Lock size={14} />
                      SCAN
                    </>
                  )}
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs font-mono">
                  <AlertTriangle size={14} className="inline mr-2" />
                  {error}
                </div>
              )}

              {/* Results */}
              {results && (
                <div className="space-y-4">
                  <div
                    className={`p-3 border ${themeBorder}/30 rounded bg-black/40`}
                  >
                    <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-2">
                      SEARCH ENGINE: {results.search_engine}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-3">
                      QUERY: {results.query}
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded p-3 max-h-60 overflow-y-auto custom-scrollbar">
                      <pre className="text-[10px] text-slate-300 font-mono whitespace-pre-wrap break-words">
                        {results.results_preview}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Disclaimer footer */}
              <div className="text-[9px] text-slate-600 font-mono text-center uppercase tracking-widest pt-4 border-t border-slate-800">
                [ Results routed via Tor • Ahmia.fi clearnet gateway ]
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DarkWebScanner;
