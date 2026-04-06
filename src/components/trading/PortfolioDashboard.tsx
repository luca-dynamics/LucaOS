import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface PortfolioSummary {
  totalNetWorthUSD: number;
  breakdown: {
    cex: any[];
    dex: any[];
    forex: any[];
    onchain: any[];
  };
  allocation: Record<string, number>;
  timestamp: number;
}

interface PortfolioDashboardProps {
  theme?: { hex: string; primary: string; border: string; bg: string; isLight?: boolean };
}

export default function PortfolioDashboard({ theme }: PortfolioDashboardProps) {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const primaryColor = theme?.hex || "#0ea5e9";
  const isLight = theme?.isLight;


  useEffect(() => {
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/trading/portfolio/summary");
      const data = await res.json();
      if (data.success) {
        setSummary(data);
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-full bg-[#050505] text-white/40 font-mono animate-pulse">
        <Icon name="Restart" size={20} className="mr-3 animate-spin" />
        AGGREGATING ELITE INTELLIGENCE...
      </div>
    );
  }

  const chartData = [
    { name: "CEX", value: summary?.breakdown.cex.length || 0, color: primaryColor },
    { name: "DEX", value: summary?.breakdown.dex.length || 0, color: "#a855f7" },
    { name: "Broker", value: summary?.breakdown.forex.length || 0, color: "#10b981" },
    { name: "On-Chain", value: summary?.breakdown.onchain.length || 0, color: "#f59e0b" },
  ];

  return (
    <div className={`flex flex-col h-full ${isLight ? "bg-slate-50" : "bg-transparent"} text-white font-sans overflow-hidden p-6 gap-6 transition-colors`}>
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg flex items-center gap-3 text-rose-400 text-xs font-bold animate-shake">
          <Icon name="Danger" size={16} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto hover:text-white transition-colors">
            <Icon name="Close" size={14} />
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isLight ? "bg-white shadow-lg shadow-slate-200/50" : "bg-white/5"} border border-white/5 shadow-glow`} style={{ boxShadow: `0 0 20px ${primaryColor}22`, borderColor: `${primaryColor}11` }}>
            <Icon name="Widget" size={24} variant="BoldDuotone" color={primaryColor} />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tighter uppercase italic leading-none ${isLight ? "text-slate-900" : "text-white"}`}>Unified Portfolio</h1>
            <p className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/40"} font-mono tracking-widest mt-1 uppercase`}>Luca OS Executive Intelligence Dashboard</p>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Total Aggregate Net Worth</span>
          <div className="flex items-baseline gap-2">
             <span className="text-4xl font-black tracking-tighter" style={{ color: primaryColor }}>
               ${summary?.totalNetWorthUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
             </span>
             <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-widest">+4.2% (24h)</span>
          </div>
        </div>
      </div>

      {/* Elite Nudge Banner */}
      <div 
        className="relative overflow-hidden rounded-2xl border glass-blur group cursor-pointer transition-all duration-500"
        style={{ 
          background: `linear-gradient(90deg, ${primaryColor}0d, #00000000, ${primaryColor}0d)`,
          borderColor: `${primaryColor}22`
        }}
      >
        <div 
          className="absolute top-0 left-0 w-1.5 h-full" 
          style={{ 
            backgroundColor: primaryColor,
            boxShadow: `0 0 15px ${primaryColor}80`
          }} 
        />
        <div className="flex items-center justify-between pl-6 pr-4 py-4">
          <div className="flex items-center gap-4">
            <Icon name="Shield" size={28} color={primaryColor} className="animate-pulse" variant="BoldDuotone" />
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: primaryColor }}>Intelligence Advisory</h3>
              <p className="text-[11px] text-white/60 mt-0.5 font-medium tracking-tight">Your current SOL exposure (18.4%) exceeds elite risk parameters. Suggest rebalancing to USDC on Base.</p>
            </div>
          </div>
          <button 
            className="px-6 py-2 rounded-sm text-[10px] font-black uppercase tracking-[0.15em] transition-all active:scale-95 shadow-lg"
            style={{ 
              backgroundColor: primaryColor,
              color: "#050505"
            }}
          >
            Execute Rebalance
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
        {/* Allocation Sidebar */}
        <div className="col-span-4 flex flex-col gap-6">
          <div className={`flex-1 glass-card-premium border ${isLight ? "bg-white shadow-xl shadow-slate-200/50 border-slate-100" : "bg-black/40 border-white/5"} p-6 flex flex-col items-center justify-center`}>
             <h3 className={`text-[10px] font-mono uppercase tracking-[0.3em] ${isLight ? "text-slate-400" : "text-white/30"} mb-6 -mt-4`}>Asset Class Distribution</h3>
             <div className="w-full h-48">
               <ResponsiveContainer width="100%" height="100%">
                 <RechartsPieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                    />
                 </RechartsPieChart>
               </ResponsiveContainer>
             </div>
             <div className="grid grid-cols-2 gap-4 w-full mt-6">
               {chartData.map(item => (
                 <div key={item.name} className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                   <span className="text-[10px] font-mono text-white/60 uppercase">{item.name}</span>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Breakdown List */}
        <div className="col-span-8 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
          <SectionHeader icon="Earth" title="Centralized Exchanges" count={summary?.breakdown.cex.length} isLight={isLight} />
          {summary?.breakdown.cex.map(acc => (
            <AccountRow key={acc.id} id={acc.id} alias={acc.id} equity={acc.equity} type="CEX" primaryColor={primaryColor} isLight={isLight} />
          ))}

          <SectionHeader icon="Chart" title="Forex & Brokers" count={summary?.breakdown.forex.length} isLight={isLight} />
          {summary?.breakdown.forex.map(acc => (
            <AccountRow key={acc.id} id={acc.id} alias={acc.alias} equity={acc.equity} type="Broker" primaryColor={primaryColor} isLight={isLight} />
          ))}

          <SectionHeader icon="Wallet" title="On-Chain Wallets" count={summary?.breakdown.onchain.length} isLight={isLight} />
          {summary?.breakdown.onchain.map(acc => (
             <AccountRow 
               key={acc.id} 
               id={acc.address} 
               alias={acc.name} 
               equity={acc.equity} 
               type={acc.chain.toUpperCase()} 
               detail={acc.address.substring(0,6) + "..." + acc.address.substring(38)} 
               primaryColor={primaryColor}
               isLight={isLight}
             />
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, count, isLight }: { icon: string, title: string, count?: number, isLight?: boolean }) {
  return (
    <div className="flex items-center gap-2 mt-4 mb-2">
      <span className={isLight ? "text-slate-300" : "text-white/40"}><Icon name={icon} size={14} /></span>
      <h3 className={`text-[11px] font-black uppercase tracking-widest ${isLight ? "text-slate-400" : "text-white/50"}`}>{title}</h3>
      <div className={`px-1.5 py-0.5 rounded ${isLight ? "bg-slate-100 text-slate-400" : "bg-white/5 text-white/30"} text-[9px] font-mono`}>{count || 0}</div>
      <div className={`flex-1 h-px ${isLight ? "bg-slate-200" : "bg-white/5"} ml-2`} />
    </div>
  );
}

function AccountRow({ id, alias, equity, type, detail, primaryColor, isLight }: any) {
  return (
    <div className={`flex items-center justify-between p-4 ${isLight ? "bg-white shadow-sm border-slate-100" : "bg-white/[0.02] border-white/5"} border rounded-xl hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 group`}>
      <div className="flex items-center gap-4">
        <div 
          className={`w-10 h-10 rounded-lg ${isLight ? "bg-slate-50" : "bg-white/5"} flex items-center justify-center font-mono text-[10px] ${isLight ? "text-slate-400" : "text-white/20"} transition-colors`}
          style={{ transition: 'color 0.3s' }}
          onMouseEnter={(e) => {
            const target = e.currentTarget as HTMLElement;
            target.style.color = primaryColor || "";
          }}
          onMouseLeave={(e) => {
            const target = e.currentTarget as HTMLElement;
            target.style.color = "";
          }}
        >
          {type.substring(0, 3)}
        </div>
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">{alias}</h4>
          <p className="text-[10px] text-white/30 font-mono tracking-tighter uppercase">{detail || id}</p>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-black font-mono tracking-tight">${equity.toLocaleString()}</div>
        <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">Active</div>
      </div>
    </div>
  );
}
