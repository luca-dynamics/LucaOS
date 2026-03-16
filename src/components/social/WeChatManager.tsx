import React, { useEffect, useState } from "react";
import {
  X,
  RefreshCw,
  LogOut,
  Wifi,
  WifiOff,
  MessageSquare,
  Clock,
  Send,
  AlertCircle,
} from "lucide-react";
import { apiUrl } from "../../config/api";
import { setHexAlpha } from "../../config/themeColors";

interface Props {
  onClose: () => void;
  theme?: { hex: string; primary: string; border: string; bg: string; isLight?: boolean; themeName?: string };
}

interface WeChatStatus {
  status: string;
  hasSession: boolean;
  hasChromeProfile?: boolean;
  usingChromeProfile?: boolean;
  lastError: string | null;
  uptime: number;
}

const WeChatManager: React.FC<Props> = ({ onClose, theme }) => {
  const isLight = theme?.isLight || theme?.themeName?.toLowerCase() === "lucagent";
  const themeHex = theme?.hex || "#07C060";

  const borderColor = isLight ? "rgba(0,0,0,0.1)" : setHexAlpha(themeHex, 0.3);
  const headerBg = isLight ? "rgba(0,0,0,0.03)" : setHexAlpha(themeHex, 0.12);
  const subCardBg = isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.03)";

  const [status, setStatus] = useState<WeChatStatus>({
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
      const res = await fetch(apiUrl("/api/wechat/status"));
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus((prev) => ({ ...prev, status: "UNAVAILABLE" }));
    }
  };

  const handleLogin = () => {
    window.dispatchEvent(
      new CustomEvent("luca:open-browser", {
        detail: {
          url: "https://web.wechat.com/",
          title: "WeChat Login",
        },
      })
    );
  };

  const handleLogout = async () => {
    if (confirm("Disconnect WeChat session?")) {
      setLoading(true);
      try {
        await fetch(apiUrl("/api/wechat/logout"), { method: "POST" });
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
    status.status === "READY" || status.status === "AUTHENTICATED";
  const isLoggingIn = status.status === "LOGGING_IN";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div
        className={`w-full max-w-md backdrop-blur-xl border rounded-xl overflow-hidden relative ${isLight ? "bg-white/80 shadow-2xl" : "bg-black/60"}`}
        style={{ 
          boxShadow: isLight ? "0 20px 40px rgba(0,0,0,0.1)" : `0 0 50px ${themeHex}1a`,
          borderColor: borderColor
        }}
      >
        <div
          className={`h-14 border-b flex items-center justify-between px-5`}
          style={{ 
            borderColor: borderColor,
            backgroundColor: headerBg
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded border flex items-center justify-center`}
              style={{
                backgroundColor: isLight ? "rgba(0,0,0,0.05)" : setHexAlpha(themeHex, 0.1),
                borderColor: setHexAlpha(themeHex, 0.3),
                color: themeHex
              }}
            >
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 className={`font-display text-base font-bold tracking-widest ${isLight ? "text-slate-900" : "text-white"}`}>
                WECHAT
              </h2>
              <div
                className={`text-[9px] font-mono opacity-60`}
                style={{ color: themeHex }}
              >
                SOCIAL AGENT LINK
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`transition-colors ${isLight ? "text-slate-400 hover:text-slate-900" : "text-slate-500 hover:text-white"}`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div
            className={`p-5 border rounded-xl flex flex-col items-center justify-center text-center`}
            style={{
              backgroundColor: subCardBg,
              borderColor: borderColor
            }}
          >
            {isConnected ? (
              <>
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 animate-pulse`}
                  style={{ backgroundColor: setHexAlpha(themeHex, 0.1) }}
                >
                  <Wifi size={32} style={{ color: themeHex }} />
                </div>
                <div className="font-bold text-sm" style={{ color: themeHex }}>
                  LINK ESTABLISHED
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Autonomous Control Active
                </div>
              </>
            ) : isLoggingIn ? (
              <>
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-3`}
                  style={{ backgroundColor: setHexAlpha(themeHex, 0.1) }}
                >
                  <RefreshCw
                    size={32}
                    className="animate-spin"
                    style={{ color: themeHex }}
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
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${isLight ? "bg-slate-100" : "bg-slate-900"}`}>
                  <WifiOff size={32} className={isLight ? "text-slate-400" : "text-slate-600"} />
                </div>
                <div className={`${isLight ? "text-slate-600" : "text-slate-400"} font-bold text-sm`}>
                  {status.status === "UNAVAILABLE" ? "AGENT UNAVAILABLE" : "NOT CONNECTED"}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 px-4">
                  {status.status === "UNAVAILABLE" 
                    ? "WeChat backend services are not responding. Ensure the bridge is running."
                    : status.hasSession ? "Session expired." : "Establish a secure bridge to your WeChat accounts."}
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div 
              className={`p-3 border rounded-lg`}
              style={{
                backgroundColor: subCardBg,
                borderColor: setHexAlpha(themeHex, 0.1)
              }}
            >
              <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-1">
                <Clock size={12} /> UPTIME
              </div>
              <div className="font-mono text-sm" style={{ color: themeHex }}>
                {formatUptime(status.uptime)}
              </div>
            </div>
            <div 
              className={`p-3 border rounded-lg`}
              style={{
                backgroundColor: subCardBg,
                borderColor: setHexAlpha(themeHex, 0.1)
              }}
            >
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
                className="flex-1 py-3 rounded-lg text-sm font-bold border transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                style={{
                  borderColor: themeHex,
                  backgroundColor: `${themeHex}20`,
                  color: themeHex,
                  boxShadow: `0 10px 20px -10px ${themeHex}44`
                }}
              >
                {loading || isLoggingIn ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
                {isLoggingIn ? "Waiting..." : "Establish Link"}
              </button>
            )}
          </div>

          <div
            className={`text-[10px] p-3 rounded-lg border backdrop-blur-sm ${isLight ? "text-slate-500" : "text-gray-500"}`}
            style={{
              backgroundColor: isLight ? "rgba(0,0,0,0.02)" : setHexAlpha(themeHex, 0.05),
              borderColor: isLight ? "rgba(0,0,0,0.1)" : setHexAlpha(themeHex, 0.2),
            }}
          >
            <strong style={{ color: themeHex }}>Secure Bridge:</strong> This connection uses decentralized relay nodes to bridge your desktop and mobile WeChat instances.
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeChatManager;
