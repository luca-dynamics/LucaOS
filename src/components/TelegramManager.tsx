import React, { useEffect, useState } from "react";
import * as LucideIcons from "lucide-react";
const {
  X,
  Send,
  ShieldCheck,
  Smartphone,
  Lock,
  Wifi,
} = LucideIcons as any;
import { settingsService } from "../services/settingsService";
import { apiUrl } from "../config/api";
import { setHexAlpha } from "../config/themeColors";

interface Props {
  onClose: () => void;
  theme: {
    hex: string;
    primary: string;
    border: string;
    bg: string;
    themeName?: string;
    isLight?: boolean;
  };
}

const TelegramManager: React.FC<Props> = ({ onClose, theme }) => {
  const themePrimary = theme?.primary || "text-cyan-400";
  const themeHex = theme?.hex || "#06b6d4";
  const isLight = theme?.isLight || theme?.themeName?.toLowerCase() === "lucagent";

  const [step, setStep] = useState("INIT"); // INIT, PHONE, CODE, PASSWORD, READY
  const [status, setStatus] = useState("DISCONNECTED");
  const [phoneNumber, setPhoneNumber] = useState(
    settingsService.get("telegram").phoneNumber || ""
  );
  const [apiId, setApiId] = useState(
    settingsService.get("telegram").apiId || ""
  );
  const [apiHash, setApiHash] = useState(
    settingsService.get("telegram").apiHash || ""
  );
  const [useSystemApi, setUseSystemApi] = useState(!apiId); // Use system if no custom ID exists
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [userMe, setUserMe] = useState<any>(null);

  // Chat State
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch(apiUrl("/api/telegram/status"));
      const data = await res.json();
      setStatus(data.status.status);
      if (data.status.status === "READY" && data.me) {
        setStep("READY");
        setUserMe(data.me);
      }
    } catch {
      console.error("Status check failed");
    }
  };

  const RequestCode = async () => {
    if (!phoneNumber) return alert("Please enter your phone number");
    if (!useSystemApi && (!apiId || !apiHash))
      return alert("Please fill API ID and Hash for advanced setup");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/telegram/auth/request"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, apiId, apiHash }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("CODE");
        // Save settings for JIT use
        settingsService.saveSettings({
          telegram: { apiId, apiHash, phoneNumber },
        });
      } else {
        alert("Error: " + data.error);
      }
    } catch {
      alert("Request failed");
    } finally {
      setLoading(false);
    }
  };

  const VerifyCode = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/telegram/auth/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, code, password, apiId, apiHash }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("READY");
        checkStatus();
      } else if (data.status === "WAITING_PASSWORD") {
        setStep("PASSWORD");
      } else {
        alert("Verification failed: " + data.error);
      }
    } catch {
      alert("Verify failed");
    } finally {
      setLoading(false);
    }
  };

  const SendMessage = async () => {
    if (!target || !message) return;
    try {
      await fetch(apiUrl("/api/telegram/message"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, message }),
      });
      setMessage("");
      alert("Message sent!");
    } catch {
      alert("Failed to send");
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl rounded-lg overflow-hidden flex flex-col transition-all duration-500 ${isLight ? "glass-panel-light" : "bg-black/80 backdrop-blur-xl"}`}
        style={{
          boxShadow: isLight ? `0 20px 50px ${setHexAlpha(themeHex, 0.1)}` : `0 0 50px ${themeHex}40`,
          borderColor: setHexAlpha(themeHex, isLight ? 0.2 : 0.4),
          borderWidth: "1px",
          borderStyle: "solid",
        }}
      >
        {/* Header */}
        <div
          className={`h-16 flex items-center justify-between px-6 transition-colors`}
          style={{
            borderBottom: `1px solid ${setHexAlpha(themeHex, isLight ? 0.15 : 0.3)}`,
            backgroundColor: isLight ? "rgba(255,255,255,0.8)" : setHexAlpha(themeHex, 0.05),
          }}
        >
          <div className="flex items-center gap-3">
            <Send className={themePrimary} size={24} />
            <div>
              <h2 className={`font-display text-xl font-bold tracking-widest ${isLight ? "text-slate-900" : "text-white"}`}>
                TELEGRAM LINK
              </h2>
              <div
                className={`text-[10px] font-mono ${themePrimary} flex gap-4`}
              >
                <span>STATUS: {status}</span>
                {userMe && <span>USER: @{userMe.username}</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className={`transition-colors ${isLight ? "text-slate-400 hover:text-slate-900" : "text-slate-500 hover:text-white"}`}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-8 space-y-6">
          {step === "INIT" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <p className={`font-bold mb-1 uppercase tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                Linking Mode
              </p>
              {useSystemApi ? (
                <p className={isLight ? "text-slate-600" : "text-slate-300"}>
                  Luca is using its own <strong>Integrated API Gateway</strong>.
                  Simply enter your phone number to establish the Luca Link.
                </p>
              ) : (
                <p className={isLight ? "text-slate-600" : "text-slate-300"}>
                  <strong>Advanced Setup</strong>: You are using custom API
                  credentials from{" "}
                  <a
                    href="https://my.telegram.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-white"
                  >
                    my.telegram.org
                  </a>
                  .
                </p>
              )}

              <div
                className={`flex items-center justify-between p-3 rounded transition-colors ${isLight ? "bg-black/[0.02]" : "bg-black/40"}`}
                style={{
                  border: `1px solid ${setHexAlpha(themeHex, isLight ? 0.1 : 0.2)}`,
                }}
              >
                <div className="flex flex-col">
                  <span className={`text-xs font-bold ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                    System API Defaults
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    PROFESSIONAL ZERO-CONFIG MODE
                  </span>
                </div>
                <button
                  onClick={() => setUseSystemApi(!useSystemApi)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    useSystemApi ? "bg-cyan-500" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${
                      useSystemApi ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>

              {!useSystemApi && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                      API ID
                    </label>
                    <input
                      type="text"
                      value={apiId}
                      onChange={(e) => setApiId(e.target.value)}
                      className={`w-full rounded p-2 text-sm font-mono transition-all ${isLight ? "bg-white text-slate-900 shadow-inner" : "bg-black/50 text-white"}`}
                      style={{
                        border: `1px solid ${setHexAlpha(themeHex, isLight ? 0.1 : 0.2)}`,
                      }}
                      placeholder="123456"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                      API HASH
                    </label>
                    <input
                      type="text"
                      value={apiHash}
                      onChange={(e) => setApiHash(e.target.value)}
                      className={`w-full rounded p-2 text-sm font-mono transition-all ${isLight ? "bg-white text-slate-900 shadow-inner" : "bg-black/50 text-white"}`}
                      style={{
                        border: `1px solid ${setHexAlpha(themeHex, isLight ? 0.1 : 0.2)}`,
                      }}
                      placeholder="abcdef123456..."
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                  PHONE NUMBER (International Format)
                </label>
                <div className="relative">
                  <Smartphone
                    className="absolute left-3 top-2.5 text-slate-500"
                    size={16}
                  />
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className={`w-full rounded p-2 pl-10 text-sm font-mono transition-all ${isLight ? "bg-white text-slate-900 shadow-inner" : "bg-black/50 text-white"}`}
                    style={{
                      border: `1px solid ${setHexAlpha(themeHex, isLight ? 0.1 : 0.2)}`,
                    }}
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <button
                onClick={RequestCode}
                disabled={loading}
                className={`w-full py-3 font-bold tracking-widest rounded transition-all flex items-center justify-center gap-2 ${isLight ? "hover:bg-black/5" : "hover:opacity-80"} ${themePrimary}`}
                style={{
                  border: `1px solid ${isLight ? setHexAlpha(themeHex, 0.3) : setHexAlpha(themeHex, 0.5)}`,
                  backgroundColor: isLight ? setHexAlpha(themeHex, 0.05) : setHexAlpha(themeHex, 0.1),
                }}
              >
                {loading ? "CONNECTING..." : "SEND CODE"}
              </button>
            </div>
          )}

          {step === "CODE" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 text-center">
              <div className={`${themePrimary} font-mono text-sm`}>
                Code sent to your Telegram app/SMS
              </div>
              <div className="text-left">
                <label className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                  AUTH CODE
                </label>
                <div className="relative">
                  <ShieldCheck
                    className="absolute left-3 top-2.5 text-slate-500"
                    size={16}
                  />
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className={`w-full rounded p-2 pl-10 text-sm font-mono tracking-widest transition-all ${isLight ? "bg-white text-slate-900 shadow-inner" : "bg-black/50 text-white"}`}
                    style={{
                      border: `1px solid ${setHexAlpha(themeHex, isLight ? 0.1 : 0.2)}`,
                    }}
                    placeholder="12345"
                  />
                </div>
              </div>
              <button
                onClick={VerifyCode}
                disabled={loading}
                className={`w-full py-3 font-bold tracking-widest rounded transition-all ${isLight ? "hover:bg-black/5" : "hover:bg-cyan-500/20"} ${themePrimary}`}
                style={{
                  border: `1px solid ${isLight ? setHexAlpha(themeHex, 0.3) : setHexAlpha(themeHex, 0.5)}`,
                  backgroundColor: isLight ? setHexAlpha(themeHex, 0.05) : setHexAlpha(themeHex, 0.1),
                }}
              >
                {loading ? "VERIFYING..." : "VERIFY LOGIN"}
              </button>
            </div>
          )}

          {step === "PASSWORD" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 text-center">
              <div className="text-red-400 font-mono text-sm font-bold">
                2FA Required
              </div>
              <div className="text-left">
                <label className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                  CLOUD PASSWORD
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-2.5 text-slate-500"
                    size={16}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full rounded p-2 pl-10 text-sm font-mono transition-all ${isLight ? "bg-white text-slate-900 shadow-inner" : "bg-black/50 text-white"}`}
                    style={{
                      border: `1px solid ${setHexAlpha(themeHex, isLight ? 0.1 : 0.2)}`,
                    }}
                    placeholder="********"
                  />
                </div>
              </div>
              <button
                onClick={VerifyCode}
                disabled={loading}
                className={`w-full py-3 font-bold tracking-widest rounded transition-all ${isLight ? "hover:bg-black/5" : "hover:bg-cyan-500/20"} ${themePrimary}`}
                style={{
                  border: `1px solid ${isLight ? setHexAlpha(themeHex, 0.3) : setHexAlpha(themeHex, 0.5)}`,
                  backgroundColor: isLight ? setHexAlpha(themeHex, 0.05) : setHexAlpha(themeHex, 0.1),
                }}
              >
                {loading ? "UNLOCKING..." : "UNLOCK"}
              </button>
            </div>
          )}

          {step === "READY" && (
            <div className="space-y-6 animate-in fade-in zoom-in-95">
              <div
                className={`flex flex-col items-center justify-center p-6 rounded transition-colors`}
                style={{
                  border: `1px dashed ${isLight ? setHexAlpha(themeHex, 0.15) : setHexAlpha(themeHex, 0.3)}`,
                  backgroundColor: isLight ? setHexAlpha(themeHex, 0.03) : setHexAlpha(themeHex, 0.05),
                }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-pulse transition-colors"
                  style={{
                    backgroundColor: isLight ? setHexAlpha(themeHex, 0.1) : setHexAlpha(themeHex, 0.15),
                  }}
                >
                  <Wifi size={32} className={themePrimary} />
                </div>
                <h3 className={`text-lg font-bold tracking-widest ${isLight ? "text-slate-900" : "text-white"}`}>
                  LUCA LINK ACTIVE
                </h3>
                <p className={`text-sm opacity-60 font-mono ${themePrimary}`}>
                  Connected as {userMe?.firstName} ({userMe?.username})
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                  SEND MESSAGE (TEST)
                </label>
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="@username or phone"
                  className={`w-full rounded p-2 text-xs font-mono mb-2 transition-all ${isLight ? "bg-white text-slate-900 shadow-inner" : "bg-black/50 text-white"}`}
                  style={{
                    border: `1px solid ${setHexAlpha(themeHex, isLight ? 0.1 : 0.2)}`,
                  }}
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Message..."
                    className={`flex-1 rounded p-2 text-xs font-mono transition-all ${isLight ? "bg-white text-slate-900 shadow-inner" : "bg-black/50 text-white"}`}
                    style={{
                      border: `1px solid ${setHexAlpha(themeHex, isLight ? 0.1 : 0.2)}`,
                    }}
                  />
                  <button
                    onClick={SendMessage}
                    className={`p-2 rounded transition-all ${themePrimary} ${isLight ? "hover:bg-black/5" : "hover:opacity-80"}`}
                    style={{
                      border: `1px solid ${isLight ? setHexAlpha(themeHex, 0.2) : setHexAlpha(themeHex, 0.3)}`,
                      backgroundColor: isLight ? setHexAlpha(themeHex, 0.05) : setHexAlpha(themeHex, 0.1),
                    }}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TelegramManager;
