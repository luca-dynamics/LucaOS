import React from "react";
import { Icon } from "../ui/Icon";

interface IdentityVerificationPanelProps {
  accentTextColor: string;
  ambientThemeColor: string;
  isLightTheme: boolean;
  mutedAccentColor: string;
  panelBorderColor: string;
  panelSurfaceColor: string;
  name: string;
  onNameChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  hexToRgba: (hex: string, alpha: number) => string;
  useDarkLightThemeContrast: boolean;
}

export const IdentityVerificationPanel: React.FC<
  IdentityVerificationPanelProps
> = ({
  accentTextColor,
  ambientThemeColor,
  isLightTheme,
  mutedAccentColor,
  panelBorderColor,
  panelSurfaceColor,
  name,
  onNameChange,
  onSubmit,
  hexToRgba,
  useDarkLightThemeContrast,
}) => (
  <form
    onSubmit={onSubmit}
    className="animate-fade-in-up w-full max-w-sm mx-auto"
    style={{ gap: "3vmin", display: "flex", flexDirection: "column" }}
  >
    <div className="text-center space-y-2">
      <Icon
        name="Terminal"
        variant="Linear"
        className="mx-auto mb-4"
        style={{
          color: accentTextColor,
          width: "3rem",
          height: "3rem",
        }}
      />
      <h1
        className="text-2xl font-mono font-bold tracking-widest uppercase whitespace-nowrap"
        style={{
          color: accentTextColor,
          textShadow: `0 0 18px ${hexToRgba(
            ambientThemeColor,
            isLightTheme ? 0.08 : 0.16,
          )}`,
        }}
      >
        Identity Verification
      </h1>
      <p
        className="text-xs text-center font-mono font-medium"
        style={{
          color: "var(--app-text-main)",
          opacity: 0.92,
        }}
      >
        Please identify yourself, Operator.
      </p>
    </div>

    <div className="space-y-2">
      <label
        className="text-xs uppercase tracking-wider block text-center font-mono font-bold"
        style={{ color: mutedAccentColor, letterSpacing: "0.16em" }}
      >
        Operator Alias
      </label>
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        className="w-full border rounded-xl p-3 outline-none transition-all text-center text-lg placeholder-[var(--app-text-muted)] backdrop-blur-md text-[var(--app-text-main)] font-mono font-bold uppercase"
        placeholder="ENTER DESIGNATION"
        style={{
          borderColor: "var(--app-border-main)",
          backgroundColor: "var(--app-bg-tint)",
          boxShadow: `0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 ${panelBorderColor}`,
          letterSpacing: "0.08em",
        }}
      />
    </div>

    <button
      type="submit"
      disabled={!name.trim()}
      className="w-full border rounded-xl py-3 uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-md font-mono font-bold"
      style={{
        borderColor: panelBorderColor,
        backgroundColor: panelSurfaceColor,
        backgroundImage: `linear-gradient(135deg, ${hexToRgba(
          ambientThemeColor,
          useDarkLightThemeContrast ? 0.14 : 0.22,
        )} 0%, ${panelSurfaceColor} 100%)`,
        boxShadow: `0 4px 20px ${hexToRgba(
          ambientThemeColor,
          useDarkLightThemeContrast ? 0.08 : 0.12,
        )}, inset 0 1px 0 ${panelBorderColor}`,
        color: name ? "var(--app-text-main)" : "var(--app-text-muted)",
      }}
    >
      Confirm Identity{" "}
      <Icon
        name="AltArrowRight"
        size={16}
        className="group-hover:translate-x-1 transition-transform"
      />
    </button>
  </form>
);

interface ByokProviderOption {
  id: "gemini" | "openai" | "anthropic" | "xai";
  name: string;
  color: string;
  logo: string;
}

interface LucaCoreSelectionPanelProps {
  isMobile: boolean;
  accentTextColor: string;
  ambientThemeColor: string;
  isLightTheme: boolean;
  panelBorderColor: string;
  panelSurfaceColor: string;
  tintedPanelGradient: string;
  showByok: boolean;
  byokProvider: "gemini" | "openai" | "anthropic" | "xai";
  byokKeys: Record<string, string>;
  isActivating: boolean;
  onActivateCloud: () => void;
  onGoLocal: () => void;
  onShowByok: () => void;
  onHideByok: () => void;
  onSelectByokProvider: (
    provider: "gemini" | "openai" | "anthropic" | "xai",
  ) => void;
  onChangeByokKey: (provider: string, value: string) => void;
  hexToRgba: (hex: string, alpha: number) => string;
  useDarkLightThemeContrast: boolean;
}

const BYOK_PROVIDER_OPTIONS: ByokProviderOption[] = [
  {
    id: "gemini",
    name: "Gemini",
    color: "#4285F4",
    logo: "/icons/brands/gemini-color.svg",
  },
  {
    id: "openai",
    name: "OpenAI",
    color: "#10a37f",
    logo: "/icons/brands/openai.svg",
  },
  {
    id: "anthropic",
    name: "Claude",
    color: "#d97757",
    logo: "/icons/brands/claude-color.svg",
  },
  {
    id: "xai",
    name: "xAI",
    color: "#fff",
    logo: "/icons/brands/grok.svg",
  },
];

export const LucaCoreSelectionPanel: React.FC<
  LucaCoreSelectionPanelProps
> = ({
  isMobile,
  accentTextColor,
  ambientThemeColor,
  isLightTheme,
  panelBorderColor,
  panelSurfaceColor,
  tintedPanelGradient,
  showByok,
  byokProvider,
  byokKeys,
  isActivating,
  onActivateCloud,
  onGoLocal,
  onShowByok,
  onHideByok,
  onSelectByokProvider,
  onChangeByokKey,
  hexToRgba,
  useDarkLightThemeContrast,
}) => (
  <div
    className="animate-fade-in-up w-full px-4 sm:px-6"
    style={{
      gap: isMobile ? "1.6vmin" : "3.2vmin",
      display: "flex",
      flexDirection: "column",
      maxWidth: isMobile ? "360px" : "880px",
    }}
  >
    <div
      className="text-center"
      style={{
        gap: "1.5vmin",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        className="mx-auto mb-2 flex items-center justify-center rounded-full border glass-blur transition-all"
        style={{
          width: isMobile ? "3rem" : "clamp(2rem, 10vmin, 4rem)",
          height: isMobile ? "3rem" : "clamp(2rem, 10vmin, 4rem)",
          borderColor: "var(--app-border-main)",
          backgroundColor: "var(--app-bg-tint)",
        }}
      >
        <Icon
          name="Key"
          variant="Linear"
          style={{
            color: accentTextColor,
            width: isMobile ? "1.4rem" : "clamp(1rem, 5vmin, 2rem)",
            height: isMobile ? "1.4rem" : "clamp(1rem, 5vmin, 2rem)",
          }}
        />
      </div>
      <h1
        className="font-bold tracking-widest uppercase"
        style={{
          color: "var(--app-text-main)",
          fontSize: isMobile ? "1.65rem" : "clamp(1.2rem, 4.5vmin, 2rem)",
        }}
      >
        Luca Core
      </h1>
      <p
        className="max-w-md mx-auto font-medium opacity-80"
        style={{
          fontSize: isMobile ? "0.72rem" : "clamp(0.58rem, 1.65vmin, 0.8rem)",
          color: "var(--app-text-muted)",
          maxWidth: isMobile ? "30ch" : undefined,
        }}
      >
        Choose how Luca processes your thoughts. Secure local compute or
        cloud-enhanced agency.
      </p>
    </div>

    {!showByok ? (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 w-full max-w-3xl mx-auto">
          <button
            type="button"
            onClick={onActivateCloud}
            disabled={isActivating}
            className="relative flex flex-col items-center text-center p-3 sm:p-5 rounded-[1.2rem] sm:rounded-[1.4rem] border backdrop-blur-xl transition-all duration-300 group hover:scale-[1.01] active:scale-[0.98] min-h-[176px] sm:min-h-[240px]"
            style={{
              borderColor: panelBorderColor,
              background: tintedPanelGradient,
              boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37)`,
            }}
          >
            {((navigator as any).deviceMemory || 8) < 8 && (
              <div
                className="absolute -top-1.5 right-2 px-2 py-0.5 rounded-full text-[7px] sm:text-[9px] font-bold tracking-[0.14em] sm:tracking-[0.18em] uppercase shadow-lg border animate-pulse bg-yellow-500/20 border-yellow-500/40"
                style={{ color: "var(--app-text-main)" }}
              >
                LUCA RECOMMEND
              </div>
            )}

            <div
              className="mb-2 p-2.5 rounded-lg sm:rounded-xl transition-colors"
              style={{
                backgroundColor: panelSurfaceColor,
                border: `1px solid ${panelBorderColor}`,
              }}
            >
              <Icon
                name="Stars"
                variant="Bold"
                size={isMobile ? 18 : 30}
                color="var(--app-text-main)"
                className="group-hover:rotate-12 transition-transform duration-500"
              />
            </div>

            <h3
              className="text-[11px] sm:text-sm font-bold tracking-[0.14em] sm:tracking-[0.18em] uppercase mb-1.5"
              style={{ color: "var(--app-text-main)" }}
            >
              Luca Prime
            </h3>
            <p
              className="text-[8px] sm:text-[11px] opacity-70 leading-snug sm:leading-relaxed max-w-[26ch] sm:max-w-[24ch]"
              style={{ color: "var(--app-text-muted)" }}
            >
              Maximum reasoning power via cloud-managed agency. Multi-modal,
              lightning fast.
            </p>

            <div className="mt-3 sm:mt-5 flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.14em] sm:tracking-[0.18em] opacity-60 group-hover:opacity-100 transition-opacity">
              {isActivating ? "Establishing Link..." : "ACTIVATE CLOUD"}
              {!isActivating && <Icon name="AltArrowRight" size={12} />}
            </div>
          </button>

          <button
            type="button"
            onClick={onGoLocal}
            className="relative flex flex-col items-center text-center p-3 sm:p-5 rounded-[1.2rem] sm:rounded-[1.4rem] border backdrop-blur-xl transition-all duration-300 group hover:scale-[1.01] active:scale-[0.98] min-h-[176px] sm:min-h-[240px]"
            style={{
              borderColor: panelBorderColor,
              background: `linear-gradient(135deg, ${panelSurfaceColor} 0%, ${hexToRgba(
                ambientThemeColor,
                useDarkLightThemeContrast ? 0.06 : 0.1,
              )} 100%)`,
              boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37)`,
            }}
          >
            {((navigator as any).deviceMemory || 8) >= 8 && (
              <div
                className="absolute -top-1.5 right-2 px-2 py-0.5 rounded-full text-[7px] sm:text-[9px] font-bold tracking-[0.14em] sm:tracking-[0.18em] uppercase shadow-lg border animate-pulse bg-green-500/20 border-green-500/40"
                style={{ color: "var(--app-text-main)" }}
              >
                LUCA RECOMMEND
              </div>
            )}

            <div
              className="mb-2 p-2.5 rounded-lg sm:rounded-xl transition-colors"
              style={{
                backgroundColor: panelSurfaceColor,
                border: `1px solid ${panelBorderColor}`,
              }}
            >
              <Icon
                name="ShieldCheck"
                variant="Bold"
                size={isMobile ? 18 : 30}
                color={accentTextColor}
                className="group-hover:scale-110 transition-transform duration-500"
              />
            </div>

            <h3
              className="text-[11px] sm:text-sm font-bold tracking-[0.14em] sm:tracking-[0.18em] uppercase mb-1.5"
              style={{ color: "var(--app-text-main)" }}
            >
              Go Local
            </h3>
            <p
              className="text-[8px] sm:text-[11px] opacity-70 leading-snug sm:leading-relaxed max-w-[26ch] sm:max-w-[24ch]"
              style={{ color: "var(--app-text-muted)" }}
            >
              100% private, sovereign compute. Your data never leaves this
              machine.
            </p>

            <div className="mt-3 sm:mt-5 flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.14em] sm:tracking-[0.18em] opacity-60 group-hover:opacity-100 transition-opacity">
              INITIALIZE OFFLINE
              <Icon name="AltArrowRight" size={12} />
            </div>
          </button>
        </div>

        <div className="flex flex-col items-center gap-2 mt-1.5 sm:mt-2">
          <button
            type="button"
            onClick={onShowByok}
            className="w-full max-w-lg mx-auto text-[8px] sm:text-[10px] py-2.5 sm:py-3 rounded-lg sm:rounded-xl border transition-all uppercase tracking-[0.14em] sm:tracking-[0.18em] font-bold flex items-center justify-center gap-1.5 sm:gap-2 glass-blur"
            style={{
              borderColor: panelBorderColor,
              backgroundColor: panelSurfaceColor,
              color: "var(--app-text-main)",
            }}
          >
            <Icon
              name="Key"
              size={isMobile ? 12 : 14}
              color={accentTextColor}
            />
            Bring Your Own Key (BYOK)
          </button>
          <p className="text-[7px] sm:text-[9px] text-center uppercase tracking-[0.14em] sm:tracking-[0.18em] font-bold opacity-40">
            Managed Professional Gateway
          </p>
        </div>
      </>
    ) : (
      <div
        className="space-y-6 animate-fade-in w-full max-w-xl mx-auto border rounded-3xl p-6 sm:p-8 backdrop-blur-xl"
        style={{
          borderColor: panelBorderColor,
          backgroundColor: panelSurfaceColor,
        }}
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onHideByok}
            className="text-[9px] uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1"
          >
            <Icon name="AltArrowLeft" size={10} /> Back
          </button>
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
            Provider Selection
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {BYOK_PROVIDER_OPTIONS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => onSelectByokProvider(provider.id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                byokProvider === provider.id
                  ? "shadow-lg scale-105"
                  : "opacity-50 hover:opacity-100"
              }`}
              style={{
                borderColor:
                  byokProvider === provider.id
                    ? `${provider.color}40`
                    : panelBorderColor,
                backgroundColor:
                  byokProvider === provider.id
                    ? hexToRgba(provider.color, 0.12)
                    : panelSurfaceColor,
              }}
            >
              <div
                className="rounded-full flex items-center justify-center p-2"
                style={{
                  width: "3rem",
                  height: "3rem",
                  backgroundColor:
                    byokProvider === provider.id
                      ? `${provider.color}20`
                      : panelSurfaceColor,
                }}
              >
                <img
                  src={provider.logo}
                  alt={provider.name}
                  className={`w-full h-full object-contain ${
                    provider.id === "xai" && !isLightTheme ? "invert" : ""
                  }`}
                />
              </div>
              <span className="text-[8px] uppercase font-bold tracking-tighter">
                {provider.name}
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-[9px] uppercase tracking-widest opacity-60 px-1 font-bold">
            {byokProvider.toUpperCase()} API KEY
          </label>
          <input
            type="password"
            value={byokKeys[byokProvider]}
            onChange={(e) => onChangeByokKey(byokProvider, e.target.value)}
            placeholder="ENTER KEY"
            className="w-full rounded-xl p-3 text-xs outline-none transition-all font-mono text-[var(--app-text-main)]"
            style={{
              backgroundColor: panelSurfaceColor,
              border: `1px solid ${panelBorderColor}`,
            }}
          />
        </div>

        <button
          type="button"
          onClick={onActivateCloud}
          disabled={!byokKeys[byokProvider] || isActivating}
          className="w-full border rounded-xl py-4 uppercase tracking-widest text-[10px] font-bold transition-all flex items-center justify-center gap-2 group disabled:opacity-30"
          style={{
            borderColor: panelBorderColor,
            backgroundColor: panelSurfaceColor,
            backgroundImage: tintedPanelGradient,
            color: "var(--app-text-main)",
          }}
        >
          {isActivating ? "Verifying..." : "Link My Cloud Brain"}
          {!isActivating && <Icon name="AltArrowRight" size={14} />}
        </button>
      </div>
    )}
  </div>
);
