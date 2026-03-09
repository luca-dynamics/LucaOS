import React, { useEffect, useState } from "react";
import { LucaSettings, settingsService } from "../../services/settingsService";
import { apiUrl } from "../../config/api";

interface SettingsConnectorsTabProps {
  settings: LucaSettings;
  theme: any;
  setStatusMsg: (msg: string) => void;
}

const SettingsConnectorsTab: React.FC<SettingsConnectorsTabProps> = ({
  settings,
  theme,
  setStatusMsg,
}) => {
  const [socialStatus, setSocialStatus] = useState<any>({});
  const [proTipModal, setProTipModal] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleStartAuth = (appId: string) => {
    if (appId === "google") {
      fetch(apiUrl("/api/google/auth/url"))
        .then((res) => res.json())
        .then((data) => {
          if (data.url) {
            window.dispatchEvent(
              new CustomEvent("luca:open-browser", {
                detail: {
                  url: data.url,
                  title: "Google Workspace Auth",
                  sessionId: `google_auth_${Date.now()}`,
                },
              }),
            );
          }
        })
        .catch(() => setStatusMsg("Failed to start Google Auth"));
    }

    if (appId === "twitter") {
      fetch(apiUrl("/api/twitter/auth/url"))
        .then((res) => res.json())
        .then((data) => {
          if (data.url) {
            window.dispatchEvent(
              new CustomEvent("luca:open-browser", {
                detail: {
                  url: data.url,
                  title: "X (Twitter) Auth",
                  sessionId: `twitter_auth_${Date.now()}`,
                },
              }),
            );
          }
        })
        .catch(() => setStatusMsg("Failed to start Twitter Auth"));
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sRes = await fetch(apiUrl("/api/system/social/status"));
        const sData = await sRes.json();
        setSocialStatus(sData);
      } catch {
        // No googleStatus to set here
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const SOCIAL_APPS = [
    {
      id: "whatsapp",
      name: "WhatsApp",
      logo: "/icons/social/whatsapp.png",
      color: "#25D366",
      desc: "Instant Messaging & Calls",
      event: "WHATSAPP_LUCA_LINK",
    },
    {
      id: "telegram",
      name: "Telegram",
      logo: "/icons/social/telegram.png",
      color: "#0088CC",
      desc: "Secure Cloud Messaging",
      event: "TELEGRAM_LUCA_LINK",
    },
    {
      id: "google",
      name: "Google Workspace",
      logo: "/icons/social/google.png",
      color: "#FFFFFF",
      desc: "Gmail, Drive & Calendar",
      event: null,
    },
    {
      id: "twitter",
      name: "X (Twitter)",
      logo: "/icons/social/twitter.png",
      color: "#000000",
      desc: "Real-time Feed & Discovery",
      event: "TWITTER_LUCA_LINK",
    },
    {
      id: "instagram",
      name: "Instagram",
      logo: "/icons/social/instagram.png",
      color: "#E1306C",
      desc: "Media & Social Presence",
      event: "INSTAGRAM_LUCA_LINK",
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      logo: "/icons/social/linkedin.png",
      color: "#0A66C2",
      desc: "Professional Intelligence",
      event: "LINKEDIN_LUCA_LINK",
    },
    {
      id: "youtube",
      name: "YouTube",
      logo: "/icons/social/youtube.png",
      color: "#FF0000",
      desc: "Video Content & Streaming",
      event: "YOUTUBE_LUCA_LINK",
    },
    {
      id: "discord",
      name: "Discord",
      logo: "/icons/social/discord.png",
      color: "#5865F2",
      desc: "Groups & Voice Channels",
      event: "DISCORD_LUCA_LINK",
    },
    {
      id: "wechat",
      name: "WeChat",
      logo: "/icons/social/wechat.png",
      color: "#07C060",
      desc: "Global Social Network",
      event: "WECHAT_LUCA_LINK",
    },
  ];

  return (
    <div className="space-y-6">
      <div
        className={`text-xs p-3 rounded-lg border backdrop-blur-sm ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-600" : "text-gray-400"}`}
        style={{
          backgroundColor:
            theme.themeName?.toLowerCase() === "lucagent"
              ? "rgba(0,0,0,0.03)"
              : `${theme.hex}0d`,
          borderColor:
            theme.themeName?.toLowerCase() === "lucagent"
              ? "rgba(0,0,0,0.1)"
              : `${theme.hex}33`,
        }}
      >
        <strong style={{ color: theme.hex }}>
          Social Intelligence Matrix:
        </strong>{" "}
        Connect your accounts to give Luca direct access. Note: This uses secure
        browser automation (Ghost Browser), not public APIs.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {SOCIAL_APPS.map((app) => {
          const isManualConnected =
            settings.connectors?.[app.id as keyof typeof settings.connectors];

          const appStatus = socialStatus[app.id] || {};
          const isHealthy =
            appStatus.status === "READY" ||
            appStatus.status === "AUTHENTICATED";

          const isChromeSynced = appStatus.hasChromeProfile;

          const isConnected = isManualConnected || isHealthy;

          const isAlwaysOn =
            settings.socialPersistence?.[app.id] === "ALWAYS_ON";

          return (
            <div
              key={app.id}
              className={`relative group overflow-hidden border rounded-2xl p-4 transition-all duration-500 backdrop-blur-2xl shadow-2xl hover:-translate-y-1 ${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light" : ""}`}
              style={{
                borderColor:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(0,0,0,0.1)"
                    : `${theme.hex}22`,
                backgroundColor:
                  theme.themeName?.toLowerCase() === "lucagent" ? undefined : `${theme.hex}08`,
                boxShadow:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "0 10px 30px rgba(0,0,0,0.05)"
                    : `0 20px 40px -20px rgba(0,0,0,0.5), inset 0 0 0 1px ${theme.hex}11`,
              }}
            >
              {/* Premium Glassmorphic Overlay: Multi-point Glow */}
              <div
                className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-1000 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at top right, ${theme.hex}33 0%, transparent 60%), 
                               radial-gradient(circle at bottom left, ${theme.hex}11 0%, transparent 40%)`,
                }}
              />

              {/* Animated Top-Edge Accent */}
              <div
                className="absolute top-0 left-0 w-full h-[1px] opacity-0 group-hover:opacity-100 transition-all duration-500 scale-x-0 group-hover:scale-x-100 origin-center"
                style={{
                  background: `linear-gradient(90deg, transparent, ${theme.hex}aa, transparent)`,
                }}
              />

              <div className="flex items-start gap-4 mb-4 relative z-10">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-[22.5%] overflow-hidden flex items-center justify-center transition-all duration-500 group-hover:scale-105 group-hover:rotate-1 shadow-2xl relative bg-white mt-0.5"
                  style={{
                    boxShadow: `0 4px 12px -2px ${
                      app.color === "#000000"
                        ? "rgba(0,0,0,0.2)"
                        : app.color + "44"
                    }`,
                  }}
                >
                  <div className="w-full h-full flex items-center justify-center relative">
                    <img
                      src={app.logo}
                      alt={app.name}
                      className="w-[65%] h-[65%] object-contain relative z-10"
                      style={{ filter: "none" }}
                    />
                    <div className="absolute inset-x-0 top-0 h-[30%] bg-gradient-to-b from-black/[0.03] to-transparent pointer-events-none" />
                  </div>
                </div>

                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h4
                      className={`text-[13px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-white/90"} tracking-tight truncate`}
                    >
                      {app.name}
                    </h4>
                    <div
                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                        isConnected
                          ? "border-green-500/30 text-green-400 bg-green-500/10"
                          : isChromeSynced
                            ? "border-blue-500/30 text-blue-400 bg-blue-500/10"
                            : "border-white/10 text-white/20"
                      }`}
                    >
                      {isConnected
                        ? appStatus.email || "ACTIVE"
                        : isChromeSynced
                          ? "SYNC READY"
                          : "OFFLINE"}
                    </div>
                  </div>
                  <p
                    className={`text-[11px] ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-600" : "text-white/40"} leading-tight mb-2 line-clamp-1`}
                  >
                    {app.desc}
                  </p>

                  <div className="flex items-center">
                    <label className="relative z-20 flex items-center gap-2 cursor-pointer group/toggle">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isAlwaysOn}
                        onChange={(e) => {
                          const newMode = (
                            e.target.checked ? "ALWAYS_ON" : "LAZY"
                          ) as "ALWAYS_ON" | "LAZY";
                          const updated = {
                            socialPersistence: {
                              ...settings.socialPersistence,
                              [app.id]: newMode,
                            },
                          };
                          settingsService.saveSettings(updated);
                          fetch(apiUrl("/api/system/social-settings"), {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(updated.socialPersistence),
                          }).catch((err) => console.error("Sync error:", err));
                        }}
                      />
                      <div
                        className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter transition-all duration-300 ${
                          isAlwaysOn
                            ? "text-white"
                            : theme.themeName?.toLowerCase() === "lucagent"
                              ? "bg-black/[0.03] text-slate-400 border border-black/10"
                              : "bg-white/5 text-white/30 border border-white/10"
                        }`}
                        style={
                          isAlwaysOn
                            ? {
                                backgroundColor: theme.hex,
                                boxShadow: `0 0 15px -2px ${theme.hex}88`,
                              }
                            : {}
                        }
                      >
                        {isAlwaysOn ? "Always Online" : "Lazy Mode"}
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {!isConnected ? (
                <div className="space-y-2">
                  {isChromeSynced && (
                    <div
                      className={`text-[10px] ${theme.themeName?.toLowerCase() === "lucagent" ? "text-blue-700 bg-blue-50 border-blue-200" : "text-blue-400/80 bg-blue-500/5 border-blue-500/10"} px-3 py-2 rounded-xl border leading-snug`}
                    >
                      <strong
                        className={`${theme.themeName?.toLowerCase() === "lucagent" ? "text-blue-800" : "text-blue-400"} block mb-0.5`}
                      >
                        {app.id === "google"
                          ? "Chrome Sync Active"
                          : "Luca Link Available"}
                      </strong>
                      {app.id === "google"
                        ? "Browsing features available. Link API for high-speed Gmail & Drive automation."
                        : `Session data found. Click below to establish the bridge.`}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (app.id === "google") {
                        handleStartAuth(app.id);
                      } else if (app.event) {
                        window.dispatchEvent(new CustomEvent(app.event));
                      } else {
                        handleStartAuth(app.id);
                      }
                    }}
                    className={`w-full py-2 rounded-xl text-[11px] font-black border transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 backdrop-blur-md ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.03] hover:bg-black/[0.06]" : ""}`}
                    style={{
                      borderColor: isChromeSynced
                        ? theme.themeName?.toLowerCase() === "lucagent"
                          ? "rgba(0,0,0,0.2)"
                          : `${theme.hex}66`
                        : theme.themeName?.toLowerCase() === "lucagent"
                          ? "rgba(0,0,0,0.1)"
                          : `${theme.hex}44`,
                      color:
                        theme.themeName?.toLowerCase() === "lucagent" ? "#111827" : theme.hex,
                      backgroundColor: isChromeSynced
                        ? theme.themeName?.toLowerCase() === "lucagent"
                          ? "rgba(0,0,0,0.05)"
                          : `${theme.hex}11`
                        : "transparent",
                    }}
                  >
                    {isChromeSynced ? "ESTABLISH LINK" : "LINK MANUALLY"}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div
                    className="text-[10px] px-3 py-2 rounded-xl border leading-snug"
                    style={{
                      borderColor:
                        theme.themeName?.toLowerCase() === "lucagent"
                          ? "rgba(0,0,0,0.1)"
                          : `${theme.hex}22`,
                      color:
                        theme.themeName?.toLowerCase() === "lucagent"
                          ? "#1e293b"
                          : `${theme.hex}cc`,
                      backgroundColor:
                        theme.themeName?.toLowerCase() === "lucagent"
                          ? "rgba(0,0,0,0.02)"
                          : `${theme.hex}05`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <strong className="text-[11px] uppercase tracking-wider">
                        Luca Link Active
                      </strong>
                    </div>
                    Encrypted channel established. Background agents are
                    synchronized.
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {proTipModal && (
        <div className="absolute inset-0 z-[50] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          <div
            className={`relative border p-6 rounded-2xl max-w-[280px] text-center shadow-2xl animate-in zoom-in duration-300 ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-white" : "bg-[#0d0d0d]"}`}
            style={{
              borderColor:
                theme.themeName?.toLowerCase() === "lucagent"
                  ? "rgba(0,0,0,0.1)"
                  : `${theme.hex}44`,
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30"
              style={{ color: theme.hex }}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h5
              className="font-black mb-2 uppercase tracking-tighter text-sm"
              style={{ color: theme.hex }}
            >
              PRO-TIP: INSTANT ACCESS
            </h5>
            <p
              className={`text-[11px] ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-600" : "text-white/70"} mb-6 leading-relaxed`}
            >
              Luca detected no imported Chrome profile. Import your profile
              first to enable <strong>instant one-click login</strong> and
              deeper browsing automation.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setProTipModal(null)}
                className={`flex-1 py-2.5 rounded-xl ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.03] text-slate-500 border-black/10" : "bg-white/5 text-white/50 border-white/10"} text-[10px] font-black hover:bg-white/10 transition-all border`}
              >
                I&apos;ll Import First
              </button>
              <button
                onClick={() => {
                  if (proTipModal) {
                    handleStartAuth(proTipModal.id);
                  }
                  setProTipModal(null);
                }}
                className="flex-1 py-2.5 rounded-xl text-black text-[10px] font-black transition-all shadow-lg shadow-cyan-500/20"
                style={{ background: theme.hex }}
              >
                Link Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsConnectorsTab;
