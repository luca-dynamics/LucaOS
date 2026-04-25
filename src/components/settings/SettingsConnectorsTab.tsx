import React, { useEffect, useState } from "react";
import { LucaSettings, settingsService } from "../../services/settingsService";
import { apiUrl } from "../../config/api";
import { Icon } from "../ui/Icon";

interface SettingsConnectorsTabProps {
  theme?: any;
  settings: LucaSettings;
  setStatusMsg: (msg: string) => void;
  isMobile?: boolean;
}

const SettingsConnectorsTab: React.FC<SettingsConnectorsTabProps> = ({
  theme,
  settings,
  setStatusMsg,
  isMobile,
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
    <div className={`space-y-6 ${isMobile ? "px-0" : ""}`}>
      <div
        className={`text-sm p-4 ${isMobile ? "border-x-0 border-y rounded-none bg-white/5" : "rounded-xl border bg-[var(--app-bg-tint)] shadow-sm"} border-[var(--app-border-main)] text-[var(--app-text-main)] transition-all tech-border glass-blur opacity-90`}
      >
        <span className="font-bold opacity-60 uppercase tracking-widest text-xs block mb-1">Social Intelligence Matrix</span>
        Connect your accounts to give Luca direct access. Note: This uses secure
        browser automation (Ghost Browser), not public APIs.
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 ${isMobile ? "gap-0" : "gap-5"}`}>
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
              className={`relative group overflow-hidden border ${isMobile ? "border-x-0 border-b rounded-none p-6" : "rounded-2xl p-5 hover:-translate-y-1 shadow-xl"} transition-all duration-500 bg-[var(--app-bg-tint)] border-[var(--app-border-main)] tech-border glass-blur`}
            >
              {/* Premium Glassmorphic Overlay: Multi-point Glow */}
              <div
                className="absolute inset-0 opacity-10 group-hover:opacity-25 transition-opacity duration-1000 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at top right, var(--app-text-main) 0%, transparent 60%), 
                               radial-gradient(circle at bottom left, var(--app-text-main) 0%, transparent 40%)`,
                }}
              />

              {/* Animated Top-Edge Accent */}
              <div
                className="absolute top-0 left-0 w-full h-[1px] opacity-0 group-hover:opacity-100 transition-all duration-500 scale-x-0 group-hover:scale-x-100 origin-center bg-gradient-to-r from-transparent via-[var(--app-text-main)] to-transparent"
              />

              <div className="flex items-start gap-4 mb-4 relative z-10">
                <div
                  className="flex-shrink-0 w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center transition-all duration-500 group-hover:scale-105 group-hover:rotate-1 shadow-lg relative bg-[var(--app-bg-tint)] mt-0.5 border border-black/5"
                >
                  <div className="w-full h-full flex items-center justify-center relative p-2">
                    <img
                      src={app.logo}
                      alt={app.name}
                      className="w-full h-full object-contain relative z-10"
                    />
                  </div>
                </div>

                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4
                      className={`text-lg font-bold text-[var(--app-text-main)] tracking-tight truncate`}
                    >
                      {app.name}
                    </h4>
                    <div
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 uppercase tracking-wider ${
                        isConnected
                          ? "border-green-500/30 text-green-400 bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.1)]"
                          : isChromeSynced
                            ? "border-blue-500/30 text-blue-400 bg-blue-500/10"
                            : "border-[var(--app-border-main)] text-[var(--app-text-muted)] bg-white/5 opacity-50"
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
                    className={`text-sm text-[var(--app-text-muted)] leading-tight mb-3 line-clamp-1 opacity-70`}
                  >
                    {app.desc}
                  </p>

                  <div className="flex items-center">
                    <div className="flex items-center gap-2">
                       <span className={`text-[10px] font-mono uppercase tracking-widest ${isAlwaysOn ? "text-[var(--app-text-main)]" : "text-[var(--app-text-muted)] opacity-60"}`}>
                        {isAlwaysOn ? "Always Online" : "Lazy Mode"}
                      </span>
                      <button
                        onClick={() => {
                          const newMode = (!isAlwaysOn ? "ALWAYS_ON" : "LAZY") as "ALWAYS_ON" | "LAZY";
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
                        className={`w-7 h-3.5 rounded-full transition-all relative ${isAlwaysOn ? "" : "bg-[var(--app-border-main)] opacity-40 hover:opacity-100"}`}
                        style={{
                          backgroundColor: isAlwaysOn ? theme.hex : undefined,
                        }}
                      >
                        <div
                          className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-[var(--app-bg-tint)] transition-all ${isAlwaysOn ? "translate-x-4" : "translate-x-0.5"}`}
                          style={{ 
                            backgroundColor: isAlwaysOn ? "white" : "var(--app-text-muted)" 
                          }}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {!isConnected ? (
                <div className="space-y-2">
                  {isChromeSynced && (
                    <div
                      className={`text-sm text-blue-400 bg-blue-500/5 border border-blue-500/20 px-3 py-2 rounded-xl leading-snug glass-blur`}
                    >
                      <strong
                        className={`text-blue-400 block mb-0.5 font-bold uppercase tracking-tighter text-xs`}
                      >
                        {app.id === "google"
                          ? "Chrome Sync Active"
                          : "Luca Link Available"}
                      </strong>
                      <span className="opacity-80">
                        {app.id === "google"
                          ? "Browsing features available. Link API for high-speed Gmail & Drive automation."
                          : `Session data found. Click below to establish the bridge.`}
                      </span>
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
                    className={`w-full py-2.5 rounded-xl text-xs font-black border transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 bg-[var(--app-bg-tint)] border-[var(--app-border-main)] text-[var(--app-text-muted)] hover:text-[var(--app-text-main)] hover:border-[var(--app-text-main)] tech-border glass-blur uppercase tracking-widest`}
                  >
                    {isChromeSynced ? "Establish Link" : "Link Manually"}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div
                    className="text-sm px-3 py-2 rounded-xl border border-green-500/20 bg-green-500/5 text-green-400 leading-snug glass-blur tech-border"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                      <strong className="text-[10px] font-bold uppercase tracking-widest text-green-500">
                        Luca Link Active
                      </strong>
                    </div>
                    <span className="opacity-80 text-xs">Encrypted channel established. Background agents are synchronized.</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {proTipModal && (
        <div className="absolute inset-0 z-[50] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 glass-blur" />
          <div
            className={`relative border p-8 rounded-3xl max-w-[320px] text-center shadow-2xl animate-in zoom-in duration-300 bg-[var(--app-bg-tint)] border-[var(--app-border-main)] tech-border glass-blur`}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 bg-blue-500/10 border border-blue-500/30 text-blue-400"
            >
              <Icon name="Info" className="w-8 h-8" />
            </div>
            <h5
              className="font-black mb-2 uppercase tracking-widest text-xl text-[var(--app-text-main)]"
            >
              Pro-Tip: Access
            </h5>
            <p
              className={`text-sm text-[var(--app-text-muted)] mb-8 leading-relaxed opacity-80`}
            >
              Luca detected no imported Chrome profile. Import your profile
              first to enable <strong>instant one-click login</strong> and
              deeper browsing automation.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  if (proTipModal) {
                    handleStartAuth(proTipModal.id);
                  }
                  setProTipModal(null);
                }}
                className="w-full py-3 rounded-xl bg-blue-600 text-[var(--app-text-main)] text-sm font-black transition-all shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/40 uppercase tracking-widest"
              >
                Link Anyway
              </button>
              <button
                onClick={() => setProTipModal(null)}
                className={`w-full py-3 rounded-xl bg-white/5 text-[var(--app-text-muted)] text-sm font-black hover:bg-white/10 transition-all border border-[var(--app-border-main)] uppercase tracking-widest`}
              >
                I&apos;ll Import First
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsConnectorsTab;
