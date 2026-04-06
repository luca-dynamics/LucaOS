import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { useTheme } from "../../hooks/useTheme";

import { settingsService } from "../../services/settingsService";
import { tradingService } from "../../services/tradingService";

export default function TradingSettings() {
  const { isLight, theme } = useTheme();
  const [activeTab, setActiveTab] = useState<"RISK" | "API" | "NOTIFICATIONS">(
    "RISK",
  );
  const [riskEnabled, setRiskEnabled] = useState(true);

  // Multi-Exchange State
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newExchange, setNewExchange] = useState({
    provider: "Binance",
    apiKey: "",
    apiSecret: "",
    apiPassphrase: "",
    label: "",
    walletAddress: "",
    privateKey: "",
    userId: "",
    signerAddress: "",
    apiKeyPrivateKey: "",
    keyIndex: 0,
  });

  const providers = [
    { id: "Binance", name: "Binance", icon: "/exchange-icons/binance.jpg" },
    { id: "Bybit", name: "Bybit", icon: "/exchange-icons/bybit.png" },
    { id: "OKX", name: "OKX", icon: "/exchange-icons/okx.svg" },
    {
      id: "Hyperliquid",
      name: "Hyperliquid",
      icon: "/exchange-icons/hyperliquid.png",
    },
    { id: "Aster", name: "Aster", icon: "/exchange-icons/aster.svg" },
    { id: "Lighter", name: "Lighter", icon: "/exchange-icons/lighter.png" },
    { id: "Bitget", name: "Bitget", icon: "/exchange-icons/bitget.svg" },
  ];

  useEffect(() => {
    loadExchanges();
  }, []);

  const loadExchanges = async () => {
    const list = await tradingService.getConnectedExchanges();
    setExchanges(list);
  };

  const handleConnect = async () => {
    const hasIdentifier =
      newExchange.apiKey ||
      newExchange.walletAddress ||
      newExchange.userId ||
      newExchange.signerAddress;

    if (!hasIdentifier) return;

    await tradingService.connectExchange({
      ...newExchange,
      name: newExchange.label || newExchange.provider,
    });
    setIsAdding(false);
    setNewExchange({
      provider: "Binance",
      apiKey: "",
      apiSecret: "",
      apiPassphrase: "",
      label: "",
      walletAddress: "",
      privateKey: "",
      userId: "",
      signerAddress: "",
      apiKeyPrivateKey: "",
      keyIndex: 0,
    });
    loadExchanges();
  };

  const handleDisconnect = async (id: string) => {
    await tradingService.disconnectExchange(id);
    loadExchanges();
  };

  // Notification settings from service
  const [notifSettings, setNotifSettings] = useState(
    settingsService.getSettings().notifications,
  );

  // Theme Constants
  const themeBg = isLight
    ? "bg-white border-slate-200"
    : "bg-[var(--app-bg-main)] border-[var(--app-border-main)]";

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 font-mono text-[var(--app-text-main)] animate-in fade-in duration-500">
      {/* LEFT SIDEBAR: CATEGORIES */}
      <div className="w-full md:w-64 flex flex-col gap-2">
        <div className="p-4 rounded-xl mb-2 border transition-all bg-[var(--app-bg-main)] border-[var(--app-border-main)]">
          <h3 className="font-black tracking-widest text-[10px] uppercase flex items-center gap-2 text-[var(--app-text-muted)]">
            <Icon
              name="Settings"
              size={14}
              variant="BoldDuotone"
              color="var(--app-primary)"
            />
            System Config
          </h3>
        </div>

        <button
          onClick={() => setActiveTab("RISK")}
          className={`p-3 rounded-lg flex items-center gap-3 text-[10px] font-black transition-all ${
            activeTab === "RISK"
              ? "bg-[rgba(var(--app-primary-rgb),0.1)] border border-[rgba(var(--app-primary-rgb),0.3)] text-[var(--app-primary)]"
              : "text-[var(--app-text-muted)] hover:text-[var(--app-text-main)] border border-transparent"
          }`}
        >
          <Icon name="Shield" size={14} variant="BoldDuotone" />
          RISK PROTOCOLS
        </button>
        <button
          onClick={() => setActiveTab("API")}
          className={`p-3 rounded-lg flex items-center gap-3 text-[10px] font-black transition-all ${
            activeTab === "API"
              ? "bg-[rgba(var(--app-primary-rgb),0.1)] border border-[rgba(var(--app-primary-rgb),0.3)] text-[var(--app-primary)]"
              : "text-[var(--app-text-muted)] hover:text-[var(--app-text-main)] border border-transparent"
          }`}
        >
          <Icon name="Key" size={14} variant="BoldDuotone" />
          API GATEWAYS
        </button>
        <button
          onClick={() => setActiveTab("NOTIFICATIONS")}
          className={`p-3 rounded-lg flex items-center gap-3 text-[10px] font-black transition-all ${
            activeTab === "NOTIFICATIONS"
              ? "bg-[rgba(var(--app-primary-rgb),0.1)] border border-[rgba(var(--app-primary-rgb),0.3)] text-[var(--app-primary)]"
              : "text-[var(--app-text-muted)] hover:text-[var(--app-text-main)] border border-transparent"
          }`}
        >
          <Icon name="Bell" size={14} variant="BoldDuotone" />
          NOTIFICATIONS
        </button>
      </div>

      {/* MAIN CONTENT: SETTINGS FORMS */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
        {/* SECTION 1: RISK MANAGEMENT */}
        {activeTab === "RISK" && (
          <div
            className={`${themeBg} rounded-2xl overflow-hidden animate-in slide-in-from-right-4 duration-300 shadow-xl`}
          >
            <div
              className={`p-4 border-b flex justify-between items-center ${isLight ? "bg-slate-50 border-slate-100" : "bg-[var(--app-bg-main)] border-[var(--app-border-main)]"}`}
            >
              <h3
                className={`font-black text-[10px] uppercase tracking-widest flex items-center gap-2 ${isLight ? "text-slate-600" : "text-[var(--app-text-main)]"}`}
              >
                <Icon
                  name="Shield"
                  size={16}
                  color="var(--app-primary)"
                  variant="BoldDuotone"
                />
                Automated Risk Guard
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase">
                  {riskEnabled ? "Active" : "Bypassed"}
                </span>
                <button
                  onClick={() => setRiskEnabled(!riskEnabled)}
                  className={`w-8 h-4 rounded-full relative transition-colors ${
                    riskEnabled ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${
                      riskEnabled ? "left-4.5" : "left-0.5"
                    }`}
                  ></div>
                </button>
              </div>
            </div>

            <div
              className={`p-4 sm:p-6 space-y-6 ${
                !riskEnabled && "opacity-50 pointer-events-none grayscale"
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Max Drawdown */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-[var(--app-text-muted)] tracking-wider">
                    Daily Loss Limit (USDT)
                  </label>
                  <div
                    className={`flex items-center rounded-xl px-3 py-2 transition-all border ${isLight ? "bg-slate-50 border-slate-200 focus-within:ring-2 focus-within:ring-slate-100" : "bg-[var(--app-bg-main)] border-[var(--app-border-main)] focus-within:border-[var(--app-primary)]"}`}
                  >
                    <span className="text-[var(--app-text-muted)] mr-2">$</span>
                    <input
                      type="number"
                      defaultValue="500"
                      className={`bg-transparent border-none outline-none w-full text-sm font-mono ${isLight ? "text-slate-900" : "text-[var(--app-text-main)]"}`}
                    />
                  </div>
                  <p
                    className={`text-[10px] ${isLight ? "text-slate-400" : "text-[var(--app-text-muted)] opacity-60"}`}
                  >
                    Trading halts for 24h if equity drops by this amount.
                  </p>
                </div>

                {/* Max Positions */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-[var(--app-text-muted)] tracking-wider">
                    Max Open Positions
                  </label>
                  <div
                    className={`flex items-center rounded-xl px-3 py-2 border ${isLight ? "bg-slate-50 border-slate-200" : "bg-[var(--app-bg-main)] border-[var(--app-border-main)]"}`}
                  >
                    <input
                      type="number"
                      defaultValue="5"
                      className={`bg-transparent border-none outline-none w-full text-sm font-mono ${isLight ? "text-slate-900" : "text-[var(--app-text-main)]"}`}
                    />
                  </div>
                  <p
                    className={`text-[10px] ${isLight ? "text-slate-400" : "text-[var(--app-text-muted)] opacity-60"}`}
                  >
                    Prevents over-exposure across multiple pairs.
                  </p>
                </div>
              </div>

              {/* Kill Switch Configuration */}
              <div className="border border-rose-500/20 bg-rose-500/5 rounded p-4 mt-4">
                <h4 className="text-xs font-bold text-rose-400 flex items-center gap-2 mb-2">
                  <Icon name="AlertTriangle" size={14} />
                  EMERGENCY PROTOCOLS
                </h4>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="panic"
                    className="accent-rose-500 w-4 h-4 cursor-pointer"
                    defaultChecked
                  />
                  <label
                    htmlFor="panic"
                    className="text-xs text-[var(--app-text-main)] opacity-80 cursor-pointer"
                  >
                    Allow &quot;Panic Sell&quot; Voice Command
                  </label>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="checkbox"
                    id="liquidate"
                    className="accent-rose-500 w-4 h-4 cursor-pointer"
                  />
                  <label
                    htmlFor="liquidate"
                    className="text-xs text-[var(--app-text-main)] opacity-80 cursor-pointer"
                  >
                    Auto-Liquidate on API Disconnect (&gt;30s)
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: API KEYS */}
        {activeTab === "API" && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className={`${themeBg} rounded-2xl overflow-hidden shadow-xl`}>
              <div
                className={`p-4 border-b flex justify-between items-center ${isLight ? "bg-slate-50 border-slate-100" : "bg-[var(--app-bg-main)] border-[var(--app-border-main)]"}`}
              >
                <h3
                  className={`font-black text-[10px] uppercase tracking-widest flex items-center gap-2 ${isLight ? "text-slate-600" : "text-[var(--app-text-main)]"}`}
                >
                  <Icon
                    name="Key"
                    size={16}
                    color="var(--app-primary)"
                    variant="BoldDuotone"
                  />
                  Exchange Gateways
                </h3>
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-3 py-1.5 bg-[rgba(var(--app-primary-rgb),0.1)] hover:bg-[rgba(var(--app-primary-rgb),0.2)] text-[var(--app-primary)] border border-[rgba(var(--app-primary-rgb),0.3)] rounded-lg text-[10px] font-black flex items-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Icon name="Plus" size={12} />
                  CONNECT NEW
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                {exchanges.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-[var(--app-border-main)] rounded-2xl">
                    <Icon
                      name="ShieldOff"
                      size={32}
                      className="mx-auto mb-3 opacity-20"
                    />
                    <p className="text-[10px] text-[var(--app-text-muted)] font-black uppercase tracking-widest">
                      No active gateways detected
                    </p>
                    <p className="text-[10px] text-[var(--app-text-muted)] opacity-50 mt-1">
                      Initialize a connection to start sovereign trading.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {exchanges.map((ex) => (
                      <div
                        key={ex.id}
                        className={`flex items-center justify-between p-4 border rounded-xl group transition-all ${isLight ? "bg-white border-slate-200 hover:bg-slate-50" : "bg-[var(--app-bg-main)] border-[var(--app-border-main)] hover:border-[var(--app-primary)]/[0.3]"}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl ${isLight ? "bg-slate-100" : "bg-white/[0.03]"} p-2 flex items-center justify-center overflow-hidden border border-[var(--app-border-main)]`}
                          >
                            <img
                              src={
                                providers.find((p) => p.id === ex.provider)
                                  ?.icon || "/exchange-icons/binance.jpg"
                              }
                              alt={ex.provider}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-[var(--app-text-main)] uppercase tracking-wider">
                                {ex.name}
                              </span>
                              <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-black border border-emerald-500/20">
                                READY
                              </span>
                            </div>
                            <p className="text-[10px] text-[var(--app-text-muted)] font-mono mt-0.5 opacity-60">
                              {ex.apiKey
                                ? `${ex.apiKey.substring(0, 6)}...${ex.apiKey.substring(ex.apiKey.length - 4)}`
                                : ex.walletAddress
                                  ? `${ex.walletAddress.substring(0, 6)}...${ex.walletAddress.substring(ex.walletAddress.length - 4)}`
                                  : "SECURE_GATED"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDisconnect(ex.id)}
                          className="p-2 text-[var(--app-text-muted)] hover:text-rose-400 hover:bg-rose-500/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Icon name="Trash2" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {isAdding && (
              <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div
                  className={`${themeBg} rounded-3xl overflow-hidden border w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200`}
                >
                  <div
                    className={`p-5 border-b flex justify-between items-center ${isLight ? "bg-slate-50 border-slate-200" : "bg-[var(--app-bg-main)] border-[var(--app-border-main)]"}`}
                  >
                    <h3 className="font-black text-[10px] tracking-[0.2em] uppercase text-[var(--app-primary)]">
                      Initialize Gateway
                    </h3>
                    <button
                      onClick={() => setIsAdding(false)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text-main)] hover:bg-white/5 transition-all"
                    >
                      <Icon name="X" size={18} />
                    </button>
                  </div>
                  <div className="p-6 space-y-6">
                    {/* Provider Selector */}
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase font-black text-[var(--app-text-muted)] tracking-widest">
                        Select Infrastructure Provider
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {providers.map((p) => (
                          <button
                            key={p.id}
                            onClick={() =>
                              setNewExchange((prev) => ({
                                ...prev,
                                provider: p.id,
                              }))
                            }
                            className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all group ${
                              newExchange.provider === p.id
                                ? "bg-[rgba(var(--app-primary-rgb),0.05)] border-[var(--app-primary)] text-[var(--app-text-main)] shadow-lg"
                                : "bg-transparent border-[var(--app-border-main)] text-[var(--app-text-muted)] hover:border-[var(--app-text-muted)]"
                            }`}
                          >
                            <div
                              className={`w-8 h-8 overflow-hidden rounded-lg transition-all ${newExchange.provider === p.id ? "scale-110 opacity-100" : "grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100"}`}
                            >
                              <img
                                src={p.icon}
                                alt={p.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="text-[8px] font-black uppercase tracking-widest">
                              {p.name}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dynamic Fields Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-1 sm:col-span-2">
                        <label className="text-[10px] uppercase font-black text-[var(--app-text-muted)] tracking-widest">
                          Gateway Descriptive Label
                        </label>
                        <input
                          className={`w-full rounded-xl px-4 py-3 text-xs outline-none transition-all border ${isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[var(--app-bg-main)] border-[var(--app-border-main)] text-[var(--app-text-main)] focus:border-[var(--app-primary)]"}`}
                          placeholder="e.g. Master Trading Account"
                          value={newExchange.label}
                          onChange={(e) =>
                            setNewExchange((prev) => ({
                              ...prev,
                              label: e.target.value,
                            }))
                          }
                        />
                      </div>

                      {(newExchange.provider === "Binance" ||
                        newExchange.provider === "Bybit" ||
                        newExchange.provider === "OKX" ||
                        newExchange.provider === "Bitget") && (
                        <>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black text-[var(--app-text-muted)] tracking-widest">
                              Public API Key
                            </label>
                            <input
                              className={`w-full rounded-xl px-4 py-3 text-xs outline-none border ${isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[var(--app-bg-main)] border-[var(--app-border-main)] text-[var(--app-text-main)] focus:border-[var(--app-primary)]"}`}
                              placeholder="Exchange specific key..."
                              value={newExchange.apiKey}
                              onChange={(e) =>
                                setNewExchange((prev) => ({
                                  ...prev,
                                  apiKey: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black text-[var(--app-text-muted)] tracking-widest">
                              Private Management Secret
                            </label>
                            <input
                              type="password"
                              className={`w-full rounded-xl px-4 py-3 text-xs outline-none border ${isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[var(--app-bg-main)] border-[var(--app-border-main)] text-[var(--app-text-main)] focus:border-[var(--app-primary)]"}`}
                              placeholder="••••••••••••••••"
                              value={newExchange.apiSecret}
                              onChange={(e) =>
                                setNewExchange((prev) => ({
                                  ...prev,
                                  apiSecret: e.target.value,
                                }))
                              }
                            />
                          </div>
                          {newExchange.provider === "OKX" && (
                            <div className="space-y-2 col-span-1 sm:col-span-2">
                              <label className="text-[10px] uppercase font-black text-[var(--app-text-muted)] tracking-widest">
                                Security Passphrase
                              </label>
                              <input
                                type="password"
                                className={`w-full rounded-xl px-4 py-3 text-xs outline-none border ${isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[var(--app-bg-main)] border-[var(--app-border-main)] text-[var(--app-text-main)] focus:border-[var(--app-primary)]"}`}
                                placeholder="Account specific passphrase..."
                                value={newExchange.apiPassphrase}
                                onChange={(e) =>
                                  setNewExchange((prev) => ({
                                    ...prev,
                                    apiPassphrase: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          )}
                        </>
                      )}

                      {newExchange.provider === "Hyperliquid" && (
                        <>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black text-[var(--app-text-muted)] tracking-widest">
                              Sovereign Wallet Address (0x...)
                            </label>
                            <input
                              className={`w-full rounded-xl px-4 py-3 text-xs outline-none border ${isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[var(--app-bg-main)] border-[var(--app-border-main)] text-[var(--app-text-main)] focus:border-[var(--app-primary)]"}`}
                              placeholder="0x..."
                              value={newExchange.walletAddress}
                              onChange={(e) =>
                                setNewExchange((prev) => ({
                                  ...prev,
                                  walletAddress: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black text-[var(--app-text-muted)] tracking-widest">
                              Signer Private Key
                            </label>
                            <input
                              type="password"
                              className={`w-full rounded-xl px-4 py-3 text-xs outline-none border ${isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[var(--app-bg-main)] border-[var(--app-border-main)] text-[var(--app-text-main)] focus:border-[var(--app-primary)]"}`}
                              placeholder="••••••••••••••••"
                              value={newExchange.privateKey}
                              onChange={(e) =>
                                setNewExchange((prev) => ({
                                  ...prev,
                                  privateKey: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </>
                      )}

                      {newExchange.provider === "Aster" && (
                        <>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black text-[var(--app-text-muted)] tracking-widest">
                              Unified User ID
                            </label>
                            <input
                              className={`w-full rounded-xl px-4 py-3 text-xs outline-none border ${isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[var(--app-bg-main)] border-[var(--app-border-main)] text-[var(--app-text-main)] focus:border-[var(--app-primary)]"}`}
                              value={newExchange.userId}
                              onChange={(e) =>
                                setNewExchange((prev) => ({
                                  ...prev,
                                  userId: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black text-[var(--app-text-muted)] tracking-widest">
                              Public Signer Address
                            </label>
                            <input
                              className={`w-full rounded-xl px-4 py-3 text-xs outline-none border ${isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[var(--app-bg-main)] border-[var(--app-border-main)] text-[var(--app-text-main)] focus:border-[var(--app-primary)]"}`}
                              placeholder="0x..."
                              value={newExchange.signerAddress}
                              onChange={(e) =>
                                setNewExchange((prev) => ({
                                  ...prev,
                                  signerAddress: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2 col-span-1 sm:col-span-2">
                            <label className="text-[10px] uppercase font-black text-[var(--app-text-muted)] tracking-widest">
                              Management Private Key
                            </label>
                            <input
                              type="password"
                              className={`w-full rounded-xl px-4 py-3 text-xs outline-none border ${isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[var(--app-bg-main)] border-[var(--app-border-main)] text-[var(--app-text-main)] focus:border-[var(--app-primary)]"}`}
                              value={newExchange.privateKey}
                              onChange={(e) =>
                                setNewExchange((prev) => ({
                                  ...prev,
                                  privateKey: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </>
                      )}

                      {newExchange.provider === "Lighter" && (
                        <>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black text-[var(--app-text-muted)] tracking-widest">
                              Active Wallet Address
                            </label>
                            <input
                              className={`w-full rounded-xl px-4 py-3 text-xs outline-none border ${isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[var(--app-bg-main)] border-[var(--app-border-main)] text-[var(--app-text-main)] focus:border-[var(--app-primary)]"}`}
                              value={newExchange.walletAddress}
                              onChange={(e) =>
                                setNewExchange((prev) => ({
                                  ...prev,
                                  walletAddress: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black text-[var(--app-text-muted)] tracking-widest">
                              Management Private Key
                            </label>
                            <input
                              type="password"
                              className={`w-full rounded-xl px-4 py-3 text-xs outline-none border ${isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[var(--app-bg-main)] border-[var(--app-border-main)] text-[var(--app-text-main)] focus:border-[var(--app-primary)]"}`}
                              value={newExchange.privateKey}
                              onChange={(e) =>
                                setNewExchange((prev) => ({
                                  ...prev,
                                  privateKey: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black text-[var(--app-text-muted)] tracking-widest">
                              Secondary Key Secret
                            </label>
                            <input
                              type="password"
                              className={`w-full rounded-xl px-4 py-3 text-xs outline-none border ${isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[var(--app-bg-main)] border-[var(--app-border-main)] text-[var(--app-text-main)] focus:border-[var(--app-primary)]"}`}
                              value={newExchange.apiKeyPrivateKey}
                              onChange={(e) =>
                                setNewExchange((prev) => ({
                                  ...prev,
                                  apiKeyPrivateKey: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black text-[var(--app-text-muted)] tracking-widest">
                              Derivation Key Index
                            </label>
                            <input
                              type="number"
                              className={`w-full rounded-xl px-4 py-3 text-xs outline-none border ${isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[var(--app-bg-main)] border-[var(--app-border-main)] text-[var(--app-text-main)] focus:border-[var(--app-primary)]"}`}
                              value={newExchange.keyIndex}
                              onChange={(e) =>
                                setNewExchange((prev) => ({
                                  ...prev,
                                  keyIndex: parseInt(e.target.value),
                                }))
                              }
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 p-6 bg-[rgba(var(--app-primary-rgb),0.02)] border-t border-[var(--app-border-main)]">
                    <button
                      onClick={() => setIsAdding(false)}
                      className="px-6 py-3 text-[10px] font-black text-[var(--app-text-muted)] hover:text-[var(--app-text-main)] transition-all uppercase tracking-widest"
                    >
                      Bypass
                    </button>
                    <button
                      onClick={handleConnect}
                      disabled={
                        !newExchange.label &&
                        !newExchange.apiKey &&
                        !newExchange.walletAddress
                      }
                      className="px-8 py-3 rounded-xl font-black text-[10px] transition-all disabled:opacity-20 bg-[var(--app-primary)] text-[#050505] shadow-lg active:scale-[0.98] uppercase tracking-[0.2em]"
                    >
                      Establish Connection
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: NOTIFICATIONS */}
        {activeTab === "NOTIFICATIONS" && (
          <div
            className={`${themeBg} rounded-lg overflow-hidden animate-in slide-in-from-right-4 duration-300`}
          >
            <div className="p-4 border-b border-white/5 bg-white/5">
              <h3 className="font-black text-[10px] tracking-widest text-white flex items-center gap-2">
                <Icon name="Bell" size={14} style={{ color: theme?.hex }} />
                NOTIFICATION PROTOCOLS
              </h3>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
                <div>
                  <h4 className="text-[10px] font-black text-white uppercase italic tracking-widest">
                    Trading Voice Alerts
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1">
                    LUCA will speak trading decisions and research hits via TTS.
                  </p>
                </div>
                <button
                  onClick={() =>
                    setNotifSettings((prev) => ({
                      ...prev,
                      tradingVoiceEnabled: !prev.tradingVoiceEnabled,
                    }))
                  }
                  className={`w-10 h-5 rounded-full relative transition-colors ${
                    notifSettings.tradingVoiceEnabled ? "" : "bg-slate-700"
                  }`}
                  style={
                    notifSettings.tradingVoiceEnabled
                      ? { backgroundColor: theme?.hex }
                      : {}
                  }
                >
                  <div
                    className={`absolute top-1 w-3 h-3 rounded-full transition-all shadow-sm ${
                      notifSettings.tradingVoiceEnabled
                        ? "left-6 bg-[#050505]"
                        : "left-1 bg-white"
                    }`}
                  ></div>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    Visual Toasts
                  </span>
                  <button
                    onClick={() =>
                      setNotifSettings((prev) => ({
                        ...prev,
                        visualEnabled: !prev.visualEnabled,
                      }))
                    }
                    className={`w-8 h-4 rounded-full relative transition-colors ${
                      notifSettings.visualEnabled ? "" : "bg-slate-700"
                    }`}
                    style={
                      notifSettings.visualEnabled
                        ? { backgroundColor: theme?.hex }
                        : {}
                    }
                  >
                    <div
                      className={`absolute top-0.5 w-3 h-3 rounded-full transition-all shadow-sm ${
                        notifSettings.visualEnabled
                          ? "left-4.5 bg-[#050505]"
                          : "left-0.5 bg-white"
                      }`}
                    ></div>
                  </button>
                </div>

                <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    Terminal Injections
                  </span>
                  <button
                    onClick={() =>
                      setNotifSettings((prev) => ({
                        ...prev,
                        chatEnabled: !prev.chatEnabled,
                      }))
                    }
                    className={`w-8 h-4 rounded-full relative transition-colors ${
                      notifSettings.chatEnabled ? "" : "bg-slate-700"
                    }`}
                    style={
                      notifSettings.chatEnabled
                        ? { backgroundColor: theme?.hex }
                        : {}
                    }
                  >
                    <div
                      className={`absolute top-0.5 w-3 h-3 rounded-full transition-all shadow-sm ${
                        notifSettings.chatEnabled
                          ? "left-4.5 bg-[#050505]"
                          : "left-0.5 bg-white"
                      }`}
                    ></div>
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-800">
                <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] flex items-center gap-2">
                  Priority Threshold
                  <span
                    className="px-1.5 py-0.5 bg-white/5 rounded text-[8px]"
                    style={{ color: theme?.hex }}
                  >
                    {notifSettings.priorityThreshold}
                  </span>
                </label>
                <div className="flex gap-2">
                  {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
                    <button
                      key={p}
                      onClick={() =>
                        setNotifSettings((prev) => ({
                          ...prev,
                          priorityThreshold: p as any,
                        }))
                      }
                      className={`flex-1 py-2 text-[9px] font-black tracking-widest rounded-lg border transition-all ${
                        notifSettings.priorityThreshold === p
                          ? isLight
                            ? "bg-slate-100"
                            : "bg-white/5 border-white/10"
                          : "border-transparent text-slate-500 hover:text-slate-300"
                      }`}
                      style={
                        notifSettings.priorityThreshold === p
                          ? {
                              color: theme?.hex,
                              borderColor: `${theme?.hex}44`,
                            }
                          : {}
                      }
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACTION BAR */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-white/10">
          <button className="w-full sm:w-auto px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all overflow-hidden flex items-center justify-center gap-2 text-slate-500 hover:bg-white/5">
            <Icon name="RefreshCw" size={14} variant="BoldDuotone" />
            RESET DEFAULTS
          </button>
          <button
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] bg-[var(--app-primary)] text-[#050505]"
            style={{
              boxShadow: "0 8px 24px rgba(var(--app-primary-rgb), 0.3)",
            }}
            onClick={() => {
              settingsService.saveSettings({ notifications: notifSettings });
              alert("Configuration synchronized.");
            }}
          >
            <Icon name="Save" size={14} variant="Bold" />
            SAVE CONFIGURATION
          </button>
        </div>
      </div>
    </div>
  );
}
