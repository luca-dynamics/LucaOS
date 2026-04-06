import React, { useEffect, useState } from "react";
import { Icon } from "./ui/Icon";
import { CryptoWallet } from "../types";
import { useAppContext } from "../context/AppContext";
import { apiUrl } from "../config/api";

interface Props {
  onClose: () => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

const CryptoTerminal: React.FC<Props> = ({ onClose, theme }) => {
  const themePrimary = theme?.primary || "text-yellow-500";
  const themeBorder = theme?.border || "border-yellow-500";
  const themeHex = theme?.hex || "#eab308";
  const { trading } = useAppContext();
  const { cryptoWallet: wallet, tradeHistory: trades } = trading;
  const [priceTicker, setPriceTicker] = useState<
    { sym: string; price: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [isRealData, setIsRealData] = useState(false);

  // 1. Fetch Price Ticker
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch(apiUrl("/api/crypto/prices"));
        if (res.ok) {
          const data = await res.json();
          const newTicker = [
            { sym: "BTC", price: data.bitcoin?.usd || 0 },
            { sym: "ETH", price: data.ethereum?.usd || 0 },
            { sym: "SOL", price: data.solana?.usd || 0 },
            { sym: "ADA", price: data.cardano?.usd || 0 },
            { sym: "XRP", price: data.ripple?.usd || 0 },
          ];
          setPriceTicker(newTicker);
          setIsRealData(true);
        } else {
          throw new Error("Core Offline");
        }
      } catch {
        // Fallback simulation
        setIsRealData(false);
        setPriceTicker((prev) => {
          if (prev.length === 0) {
            return [
              { sym: "BTC", price: 64200 },
              { sym: "ETH", price: 3400 },
              { sym: "SOL", price: 145 },
              { sym: "AI16Z", price: 0.42 },
            ];
          }
          return prev.map((t) => ({
            ...t,
            price: t.price * (1 + (Math.random() - 0.5) * 0.005),
          }));
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  // 2. Lazy Load Real Wallet Data once on mount
  useEffect(() => {
    const loadRealWallet = async () => {
      try {
        const res = await fetch(apiUrl("/api/crypto/wallets"));
        if (res.ok) {
          const data = await res.json();
          const wallets = Array.isArray(data) ? data : data.wallets || [];
          if (wallets.length > 0) {
            // Find an ETH wallet or just take the first one
            const primary =
              wallets.find((w: any) => w.chain === "ETH") || wallets[0];

            // Normalize to CryptoWallet type
            const normalized: CryptoWallet = {
              address: primary.address,
              chain: (primary.chain as any) || "ETH",
              privateKey: primary.privateKey || "REDACTED",
              assets: primary.assets || [],
              totalValueUsd: primary.totalValueUsd || 0,
            };
            trading.setCryptoWallet(normalized);
          }
        }
      } catch (error) {
        console.warn(
          "[CryptoTerminal] Failed to lazy load real wallet:",
          error
        );
      }
    };

    if (!wallet) {
      loadRealWallet();
    }
  }, [wallet, trading]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 glass-blur animate-in zoom-in-95 duration-300">
      <div
        className={`relative w-[90%] max-w-5xl h-[80vh] bg-black/40 glass-blur border ${themeBorder}/30 rounded-lg flex flex-col overflow-hidden`}
        style={{
          boxShadow: `0 0 80px -20px ${themeHex}40`,
        }}
      >
        {/* Liquid background effect 1 (Center) */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none transition-all duration-700 -z-10"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${themeHex}25, transparent 60%)`,
            filter: "blur(40px)",
          }}
        />
        {/* Liquid background effect 2 (Top Right Offset) */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none transition-all duration-700 -z-10"
          style={{
            background: `radial-gradient(circle at 80% 20%, ${themeHex}15, transparent 50%)`,
            filter: "blur(40px)",
          }}
        />
        {/* Header */}
        <div
          className={`h-14 border-b ${themeBorder}/20 flex items-center justify-between px-6 relative z-10`}
          style={{ backgroundColor: `${themeHex}1F` }}
        >
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: `${themeHex}1F` }}
            >
              <Icon name="Wallet" size={18} variant="BoldDuotone" color={themeHex} />
            </div>
            <div>
              <h2 className="font-display font-bold text-white tracking-widest text-lg">
                DEFI COMMAND CENTER
              </h2>
              <div
                className={`text-[10px] font-mono ${themePrimary} flex gap-3 opacity-60`}
              >
                <span>
                  NETWORK: {wallet ? wallet.chain : "UNKNOWN"}_MAINNET
                </span>
                <span>
                  RPC: {isRealData ? "COINGECKO_V3 (LIVE)" : "SIMULATION_NODE"}
                </span>
                <span
                  className={`text-white opacity-50 border border-white/20 px-1 rounded ${
                    isRealData
                      ? "bg-green-900/50 text-green-400 border-green-500/30"
                      : ""
                  }`}
                >
                  {isRealData ? "LIVE_FEED" : "SIMULATION_FEED"}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <Icon name="CloseCircle" size={24} />
          </button>
        </div>

        {/* Unprovisioned State */}
        {!wallet && (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center max-w-2xl">
              <div
                className={`inline-flex p-6 rounded-full border ${themeBorder}/30 mb-6`}
                style={{ backgroundColor: `${themeHex}1F` }}
              >
                <Icon name="Wallet" size={64} color={themeHex} variant="BoldDuotone" />
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-3">
                WALLET UNPROVISIONED
              </h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                LUCA does not yet have a dedicated crypto wallet for autonomous
                transaction execution.
                <br />
                Ask LUCA to{" "}
                <span className={`font-bold ${themePrimary}`}>
                  &quot;provision a new wallet&quot;
                </span>{" "}
                to enable cross-chain DeFi operations.
              </p>
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded border ${themeBorder}/30 text-xs font-mono ${themePrimary}`}
                style={{ backgroundColor: `${themeHex}1F` }}
              >
                <Icon name="Shield" size={14} color={themeHex} />
                <span>SECURE_VAULT_READY • EVM_COMPATIBLE • MULTI_CHAIN</span>
              </div>
            </div>
          </div>
        )}

        {/* Provisioned State */}
        {wallet && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Wallet Details */}
            <div
              className="w-1/3 border-r border-yellow-500/20 p-6 flex flex-col gap-6 transition-colors duration-500"
              style={{ backgroundColor: `${themeHex}0D` }}
            >
              <div className="bg-yellow-900/5 border border-yellow-500/20 p-4 rounded-lg relative overflow-hidden">
                <div className="absolute top-2 right-2 text-yellow-500/20">
                  <Icon name="Euro" size={48} variant="BoldDuotone" />
                </div>
                <div className="text-slate-400 text-xs font-mono mb-1">
                  TOTAL PORTFOLIO VALUE
                </div>
                <div className="text-3xl font-display font-bold text-white">
                  $
                  {wallet.totalValueUsd.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-green-400 mt-2">
                  <Icon name="Chart" size={12} color="#4ade80" /> +2.4% (24h)
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-500 tracking-widest mb-3">
                  WALLET ADDRESS
                </div>
                <div className="flex items-center gap-2 font-mono text-xs bg-black border border-slate-800 p-3 rounded text-yellow-500 break-all">
                  <Icon name="Shield" size={14} className="flex-shrink-0" />
                  {wallet.address}
                </div>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-600 font-mono">
                  <Icon name="Lock" size={10} /> PRIVATE KEY: ENCRYPTED_HSM_STORED
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-500 tracking-widest mb-3">
                  ASSET ALLOCATION
                </div>
                <div className="space-y-2">
                  {wallet.assets.map((asset) => (
                    <div
                      key={asset.symbol}
                      className="flex justify-between items-center p-3 border border-slate-800 bg-slate-900/50 rounded hover:border-yellow-500/30 transition-colors"
                    >
                      <div>
                        <div className="font-bold text-white">
                          {asset.symbol}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {asset.amount} tokens
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-yellow-500">
                          $
                          {(asset.amount * asset.currentPrice).toLocaleString()}
                        </div>
                        <div
                          className={`text-[10px] ${
                            asset.pnl >= 0 ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {asset.pnl > 0 ? "+" : ""}
                          {asset.pnl}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Terminal & Feed */}
            <div className="w-2/3 flex flex-col bg-transparent">
              {/* Live Ticker */}
              <div
                className="h-8 border-b border-yellow-500/10 flex items-center overflow-hidden whitespace-nowrap"
                style={{ backgroundColor: `${themeHex}1A` }}
              >
                {loading ? (
                  <div className="px-4 text-xs font-mono text-yellow-500 flex items-center gap-2">
                    <Icon name="Restart" size={10} className="animate-spin" />{" "}
                    INITIALIZING FEED...
                  </div>
                ) : (
                  <div className="animate-marquee flex gap-8 px-4 font-mono text-xs text-yellow-500/70">
                    {priceTicker.map((t) => (
                      <span key={t.sym} className="flex gap-2">
                        <b>{t.sym.toUpperCase()}</b> ${t.price.toLocaleString()}
                      </span>
                    ))}
                    {priceTicker.map((t) => (
                      <span key={t.sym + "_duplicate"} className="flex gap-2">
                        <b>{t.sym.toUpperCase()}</b> ${t.price.toLocaleString()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Trade History */}
              <div className="flex-1 p-6 overflow-y-auto font-mono">
                <div className="flex items-center gap-2 text-slate-500 mb-4 text-xs font-bold tracking-widest">
                  <Icon name="History" size={14} /> EXECUTION LOG
                </div>
                <div className="space-y-1">
                  {trades.length === 0 ? (
                    <div className="text-slate-700 italic text-xs">
                      No transactions executed in current session.
                    </div>
                  ) : (
                    trades.map((trade) => (
                      <div
                        key={trade.id}
                        className="flex gap-4 text-xs border-b border-slate-900 pb-2 mb-2"
                      >
                        <span className="text-slate-500">
                          {new Date(trade.timestamp).toLocaleTimeString()}
                        </span>
                        <span
                          className={
                            trade.type === "BUY"
                              ? "text-green-400 font-bold"
                              : "text-red-400 font-bold"
                          }
                        >
                          {trade.type}
                        </span>
                        <span className="text-white">
                          {trade.amount} {trade.token}
                        </span>
                        <span className="text-slate-500">@ ${trade.price}</span>
                        <span className="ml-auto text-yellow-500/50 underline cursor-pointer">
                          {trade.hash}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action Status */}
              <div
                className="h-24 border-t border-yellow-500/20 p-4 flex items-center gap-4"
                style={{ backgroundColor: `${themeHex}1F` }}
              >
                <div
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    isRealData ? "bg-green-500" : "bg-yellow-500"
                  }`}
                ></div>
                <div className="font-mono text-xs text-yellow-500">
                  AGENT STATUS:{" "}
                  {isRealData
                    ? "CONNECTED TO LIVE MAINNET"
                    : "SIMULATION MODE ACTIVE"}
                  <br />
                  <span className="text-slate-500">
                    AI PREDICTION MODEL: BULLISH ON $SOL ECOSYSTEM
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CryptoTerminal;
