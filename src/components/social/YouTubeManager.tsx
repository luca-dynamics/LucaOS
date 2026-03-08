import React, { useEffect, useState } from "react";
import {
  X,
  RefreshCw,
  LogOut,
  Wifi,
  WifiOff,
  Youtube,
  Clock,
  Send,
  AlertCircle,
} from "lucide-react";
import { apiUrl } from "../../config/api";

interface Props {
  onClose: () => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

interface YouTubeStatus {
  status: string;
  hasSession: boolean;
  hasChromeProfile?: boolean;
  usingChromeProfile?: boolean;
  lastError: string | null;
  uptime: number;
}

const YouTubeManager: React.FC<Props> = ({ onClose, theme }) => {
  const themePrimary = theme?.primary || "text-red-500";
  const themeBorder = theme?.border || "border-red-600";
  const themeBg = theme?.bg || "bg-red-950/10";
  const themeHex = theme?.hex || "#FF0000";

  const [status, setStatus] = useState<YouTubeStatus>({
    status: "OFFLINE",
    hasSession: false,
    hasChromeProfile: false,
    usingChromeProfile: false,
    lastError: null,
    uptime: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (ms: number) => {
    if (!ms || ms <= 0) return "--:--:--";
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const checkStatus = async () => {
    try {
      const res = await fetch(apiUrl("/api/youtube/status"));
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus((prev) => ({ ...prev, status: "ERROR_OFFLINE" }));
    }
  };

  const handleLogin = () => {
    window.dispatchEvent(
      new CustomEvent("luca:open-browser", {
        detail: {
          url: "https://www.youtube.com/",
          title: "YouTube Login",
        },
      })
    );
  };

  const handleLogout = async () => {
    if (confirm("Disconnect YouTube session?")) {
      setLoading(true);
      try {
        await fetch(apiUrl("/api/youtube/logout"), { method: "POST" });
        setStatus((prev) => ({
          ...prev,
          status: "OFFLINE",
          hasSession: false,
        }));
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "Unknown error";
        alert(`Logout failed: ${errorMessage}`);
      }
      setLoading(false);
    }
  };

  const isConnected =
    status.status === "READY" || status.status === "READY_ANONYMOUS";
  const isLoggingIn = status.status === "LOGGING_IN";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div
        className={`w-full max-w-md bg-black/60 backdrop-blur-xl border ${themeBorder}/30 rounded-xl overflow-hidden relative`}
        style={{ boxShadow: `0 0 50px ${themeHex}1a` }}
      >
        <div
          className={`h-14 border-b ${themeBorder}/50 ${themeBg} flex items-center justify-between px-5`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 ${themeBg} rounded border ${themeBorder}/50 ${themePrimary}`}
            >
              <Youtube size={20} />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white tracking-widest">
                YOUTUBE
              </h2>
              <div
                className={`text-[9px] font-mono ${themePrimary} opacity-60`}
              >
                VIDEO AGENT
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div
            className={`p-5 bg-black border ${themeBorder}/30 rounded-lg flex flex-col items-center justify-center text-center`}
          >
            {isConnected ? (
              <>
                <div
                  className={`w-16 h-16 rounded-full ${themeBg} flex items-center justify-center mb-3 animate-pulse`}
                >
                  <Wifi size={32} className={themePrimary} />
                </div>
                <div className={`${themePrimary} font-bold text-sm`}>
                  LINK ESTABLISHED
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {status.usingChromeProfile
                    ? "Using Chrome Profile (Auto-Login)"
                    : status.status === "READY_ANONYMOUS"
                    ? "Anonymous Mode (Search Only)"
                    : "Autonomous Control Active"}
                </div>
              </>
            ) : isLoggingIn ? (
              <>
                <div
                  className={`w-16 h-16 rounded-full ${themeBg} flex items-center justify-center mb-3`}
                >
                  <RefreshCw
                    size={32}
                    className={`${themePrimary} animate-spin`}
                  />
                </div>
                <div className="text-yellow-400 font-bold text-sm">
                  AWAITING AUTHENTICATION
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Please log in via the browser window
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-3">
                  <WifiOff size={32} className="text-slate-600" />
                </div>
                <div className="text-slate-400 font-bold text-sm">
                  NOT CONNECTED
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {status.hasSession
                    ? "Session expired."
                    : "Click Login to connect"}
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 bg-black border ${themeBorder}/20 rounded-lg`}>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-1">
                <Clock size={12} /> UPTIME
              </div>
              <div className={`font-mono text-sm ${themePrimary}`}>
                {formatUptime(status.uptime)}
              </div>
            </div>
            <div className={`p-3 bg-black border ${themeBorder}/20 rounded-lg`}>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-1">
                <Send size={12} /> STATUS
              </div>
              <div
                className={`font-mono text-sm ${
                  isConnected
                    ? "text-green-400"
                    : isLoggingIn
                    ? "text-yellow-400"
                    : "text-slate-500"
                }`}
              >
                {status.status}
              </div>
            </div>
          </div>

          {status.lastError && (
            <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle
                size={16}
                className="text-red-400 flex-shrink-0 mt-0.5"
              />
              <div className="text-xs text-red-300">{status.lastError}</div>
            </div>
          )}

          <div className="flex gap-3">
            {isConnected ? (
              <button
                onClick={handleLogout}
                disabled={loading}
                className="flex-1 py-3 rounded-lg text-sm font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleLogin}
                disabled={loading || isLoggingIn}
                className="flex-1 py-3 rounded-lg text-sm font-bold border transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{
                  borderColor: themeHex,
                  backgroundColor: `${themeHex}20`,
                  color: themeHex,
                }}
              >
                {loading || isLoggingIn ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Youtube className="w-4 h-4" />
                )}
                {isLoggingIn ? "Waiting..." : "Login with Browser"}
              </button>
            )}
          </div>

          <div
            className="text-[10px] p-3 rounded-lg border text-gray-500 backdrop-blur-sm"
            style={{
              backgroundColor: `${themeHex}0d`,
              borderColor: `${themeHex}33`,
            }}
          >
            {status.hasChromeProfile ? (
              <>
                <strong style={{ color: themeHex }}>
                  Chrome Profile Detected:
                </strong>{" "}
                Your imported Chrome data includes YouTube sessions.
              </>
            ) : (
              <>
                <strong style={{ color: themeHex }}>Tip:</strong> YouTube search
                works without login. Login for likes, comments, and
                subscriptions.
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default YouTubeManager;
