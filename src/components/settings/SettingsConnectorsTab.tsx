import React, { useEffect, useState } from "react";
import { LucaSettings, settingsService } from "../../services/settingsService";
import { apiUrl } from "../../config/api";
import { Icon } from "../ui/Icon";
import {
  SettingsAdvancedDisclosure,
  SettingsRow,
  SettingsSection,
  SettingsStatList,
  settingsControlInlineStyle,
} from "./SettingsLayout";
import {
  settingsCardStyle,
  settingsSurfaceTokens,
} from "./settingsLayoutStyles";
import { FIRST_PARTY_CONNECTORS } from "../../config/connectorCatalog";
import { startConnectorAuth } from "../../services/connectorAuth";

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

  // The real connect flow now lives in the shared connectorAuth service so
  // onboarding can trigger the exact same OAuth / LucaLink paths.
  const handleStartAuth = (appId: string) =>
    startConnectorAuth({ id: appId }, { onError: setStatusMsg });

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

  // Connector catalog — the shared first-party source of truth (also used by
  // the onboarding connect grid). See src/config/connectorCatalog.ts.
  const SOCIAL_APPS = FIRST_PARTY_CONNECTORS;

  return (
    <div className={`space-y-6 ${isMobile ? "px-0" : ""}`}>
      <SettingsSection
        title="Connected Apps"
        description="Connect apps and services Luca can work with. Sessions are remembered only when you allow persistence."
        icon="Plug"
        accentColor={theme?.hex}
        isMobile={isMobile}
      >
        <SettingsStatList
          items={[
            {
              label: "Workspace",
              value: settings.connectors?.google
                ? "Google connected"
                : "Ready",
              detail:
                "Gmail, Calendar, and Drive connect through the existing Google auth flow.",
            },
            {
              label: "Developer",
              value: settings.connectors?.linkedin
                ? "Developer apps ready"
                : "Add when available",
              detail:
                "Developer connectors stay grouped with recommended apps.",
            },
            {
              label: "Community",
              value: "Optional",
              detail:
                "Slack, Discord, Telegram, and social connectors remain opt-in.",
            },
          ]}
        />
      </SettingsSection>

      <SettingsSection
        title="Recommended Connectors"
        description="Choose productivity, developer, finance, social/community, and smart home integrations from the existing connector cards."
        icon="Sparkles"
        accentColor={theme?.hex}
        isMobile={isMobile}
      >
        <div
          className={`grid grid-cols-1 md:grid-cols-2 ${isMobile ? "gap-0" : "gap-5"}`}
        >
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
                className={`relative border ${isMobile ? "border-x-0 border-b rounded-none p-6" : "rounded-xl p-5"} bg-[var(--app-bg-tint)] border-[var(--app-border-main)]`}
              >
                <div className="flex items-start gap-4 mb-4 relative z-10">
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center relative bg-[var(--app-bg-tint)] mt-0.5 border border-[var(--luca-border-subtle)]">
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
                        className={`text-[15px] font-semibold text-[var(--app-text-main)] tracking-tight truncate`}
                      >
                        {app.name}
                      </h4>
                      <div
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                          isConnected
                            ? "border-[var(--luca-accent-primary,var(--app-core-hex))] text-[var(--luca-accent-primary,var(--app-core-hex))] bg-[var(--luca-accent-soft,var(--app-bg-tint))]"
                            : isChromeSynced
                              ? "border-[var(--luca-border-subtle,var(--app-border-main))] text-[var(--luca-text-secondary,var(--app-text-muted))] bg-[var(--luca-surface-glass,var(--app-bg-tint))]"
                              : "border-[var(--app-border-main)] text-[var(--app-text-muted)] bg-[var(--luca-surface-glass)] opacity-50"
                        }`}
                      >
                        {isConnected
                          ? appStatus.email || "Active"
                          : isChromeSynced
                            ? "Sync ready"
                            : "Offline"}
                      </div>
                    </div>
                    <p
                      className={`text-sm text-[var(--app-text-muted)] leading-tight mb-3 line-clamp-1 opacity-70`}
                    >
                      {app.desc}
                    </p>

                    <div className="flex items-center">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-medium ${isAlwaysOn ? "text-[var(--app-text-main)]" : "text-[var(--app-text-muted)] opacity-60"}`}
                        >
                          {isAlwaysOn ? "Remember session" : "On demand"}
                        </span>
                        <button
                          onClick={() => {
                            const newMode = (
                              !isAlwaysOn ? "ALWAYS_ON" : "LAZY"
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
                            }).catch((err) =>
                              console.error("Sync error:", err),
                            );
                          }}
                          className={`w-7 h-3.5 rounded-full transition-all relative ${isAlwaysOn ? "" : "bg-[var(--app-border-main)] opacity-40 hover:opacity-100"}`}
                          style={{
                            backgroundColor: isAlwaysOn ? theme.hex : undefined,
                          }}
                        >
                          <div
                            className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-[var(--app-bg-tint)] transition-all ${isAlwaysOn ? "translate-x-4" : "translate-x-0.5"}`}
                            style={{
                              backgroundColor: isAlwaysOn
                                ? "white"
                                : "var(--app-text-muted)",
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
                        className={`text-sm border px-3 py-2 rounded-xl leading-snug glass-blur`}
                        style={{
                          background: settingsCardStyle.background,
                          borderColor: settingsSurfaceTokens.borderSubtle,
                          color: settingsSurfaceTokens.textPrimary,
                        }}
                      >
                        <strong
                          className={`block mb-0.5 font-semibold text-xs`}
                        >
                          {app.id === "google"
                            ? "Chrome sync ready"
                            : "Session available"}
                        </strong>
                        <span className="opacity-80">
                          {app.id === "google"
                            ? "Browsing session found. Connect Google only if you want Luca to use approved Workspace access."
                            : `Approved session data found. Link it to let Luca reuse this signed-in surface.`}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() =>
                        startConnectorAuth(app, { onError: setStatusMsg })
                      }
                      className={`w-full py-2.5 rounded-lg text-sm font-medium border transition-colors bg-[var(--app-bg-tint)] border-[var(--app-border-main)] text-[var(--app-text-muted)] hover:text-[var(--app-text-main)]`}
                    >
                      {isChromeSynced ? "Connect session" : "Connect account"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div
                      className="text-sm px-3 py-2 rounded-xl border leading-snug"
                      style={{
                        background: settingsCardStyle.background,
                        borderColor: settingsSurfaceTokens.borderSubtle,
                        color: settingsSurfaceTokens.textPrimary,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor:
                              settingsSurfaceTokens.accentPrimary,
                          }}
                        />
                        <strong className="text-xs font-semibold">
                          Account connected
                        </strong>
                      </div>
                      <span className="opacity-80 text-xs">
                        Secure connection established. Luca can use this
                        approved surface according to your session setting.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Connector Permissions"
        description="Read, write, send/post, file, automation access, and approval mode stay explicit."
        icon="ShieldCheck"
        accentColor={theme?.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Read access"
          description="Luca can summarize connected account context only after authorization."
        />
        <SettingsRow
          label="Write access"
          description="Write-capable integrations continue through their existing approval flows."
        />
        <SettingsRow
          label="Send and post access"
          description="Messaging and posting actions should require review."
        />
        <SettingsRow
          label="File and automation access"
          description="File and automation-capable connectors stay grouped behind permissions."
        />
      </SettingsSection>

      <SettingsSection
        title="Activity & Safety"
        description="Recent connector actions, failed actions, pending approvals, and revoke access stay visible."
        icon="Activity"
        accentColor={theme?.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Recent connector actions"
          description="Connector activity continues to come from existing services."
        />
        <SettingsRow
          label="Failed actions"
          description="Failures and pending approvals remain surfaced by each connector."
        />
        <SettingsRow
          label="Revoke access"
          description="Use each connector card to disconnect or revoke where supported."
        />
      </SettingsSection>

      <SettingsAdvancedDisclosure
        title="Advanced Details"
        description="Browser automation/session persistence, connector debugging, webhook URLs, token refresh state, and raw connector metadata."
      >
        <SettingsRow
          label="Browser sessions"
          description="Browser session persistence is kept out of the top-level connector copy."
        />
        <SettingsRow
          label="Connector debugging"
          description="Troubleshooting metadata stays under Advanced Details."
        />
        <SettingsRow
          label="Webhook URLs and token refresh state"
          description="Raw connector internals are not primary user controls."
        />
      </SettingsAdvancedDisclosure>

      {proTipModal && (
        <div className="absolute inset-0 z-[50] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 glass-blur" />
          <div
            className={`relative border p-8 rounded-3xl max-w-[320px] text-center shadow-2xl animate-in zoom-in duration-300`}
            style={{
              background: settingsCardStyle.background,
              borderColor: settingsSurfaceTokens.borderSubtle,
            }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 border"
              style={{
                backgroundColor: settingsSurfaceTokens.accentSoft,
                borderColor: settingsSurfaceTokens.borderSubtle,
              }}
            >
              <Icon
                name="Info"
                className="w-8 h-8"
                style={{ color: settingsSurfaceTokens.accentPrimary }}
              />
            </div>
            <h5 className="font-semibold mb-2 text-xl text-[var(--app-text-main)]">
              Session Tip
            </h5>
            <p
              className={`text-sm text-[var(--app-text-muted)] mb-8 leading-relaxed opacity-80`}
            >
              Luca detected no imported Chrome profile. Import an approved
              browser profile first to enable one-click login without sharing
              passwords.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  if (proTipModal) {
                    handleStartAuth(proTipModal.id);
                  }
                  setProTipModal(null);
                }}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all border"
                style={{
                  ...settingsControlInlineStyle,
                  borderColor: settingsSurfaceTokens.accentPrimary,
                  color: settingsSurfaceTokens.textPrimary,
                }}
              >
                Connect anyway
              </button>
              <button
                onClick={() => setProTipModal(null)}
                className={`w-full py-3 rounded-xl text-sm font-semibold hover:bg-[var(--luca-surface-hover)] transition-all border`}
                style={settingsControlInlineStyle}
              >
                Import profile first
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsConnectorsTab;
