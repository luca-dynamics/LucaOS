import React from "react";
import { Icon } from "../ui/Icon";

interface ChainStats {
  name: string;
  profit: number;
  status: string;
  leads: number;
}

interface Props {
  data: {
    totalProfit: number;
    leadsFound: number;
    chainsScanned: number;
    activeChains: ChainStats[];
  };
  themeColor: string;
}

const MetricCard: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: string;
  accent: string;
}> = ({ label, value, sub, icon, accent }) => (
  <div className="bg-[#111111] border border-white/10 rounded-xl p-5 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">{label}</span>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${accent}12` }}
      >
        <Icon name={icon as any} size={16} style={{ color: accent }} variant="BoldDuotone" />
      </div>
    </div>
    <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
    {sub && <p className="text-xs text-slate-500 -mt-1">{sub}</p>}
  </div>
);

const SovereigntyDashboard: React.FC<Props> = ({ data, themeColor }) => {
  const activeCount = data.activeChains.filter(c => c.status === "ACTIVE").length;

  return (
    <div className="w-full max-w-5xl mx-auto p-6 flex flex-col gap-6 font-sans">

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${themeColor}15` }}
          >
            <Icon name="Earth" size={20} style={{ color: themeColor }} variant="BoldDuotone" />
          </div>
          <div>
            <h2 className="text-white font-bold text-base tracking-wide">Global Sovereignty</h2>
            <p className="text-slate-500 text-xs flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Mempool monitoring active
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.07] transition-all">
          <Icon name="Activity" size={13} />
          Live Feed
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total Yield"
          icon="TrendingUp"
          accent={themeColor}
          value={
            <span>
              {data.totalProfit.toFixed(2)}{" "}
              <span className="text-sm font-normal text-slate-500">ETH</span>
            </span>
          }
          sub="+12.5% vs previous block"
        />
        <MetricCard
          label="Active Leads"
          icon="Layers"
          accent={themeColor}
          value={data.leadsFound}
          sub={`Across ${data.chainsScanned} networks`}
        />
        <MetricCard
          label="RPC Health"
          icon="Server"
          accent="#22c55e"
          value="98.2%"
          sub="Latency 12ms avg"
        />
        <MetricCard
          label="Active Defenses"
          icon="Shield"
          accent="#3b82f6"
          value="ARMOR"
          sub="Private relay active"
        />
      </div>

      {/* Network Status List */}
      <div className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <h3 className="text-[11px] font-bold tracking-widest text-slate-500 uppercase flex items-center gap-2">
            <Icon name="Activity" size={14} />
            Network Status Overview
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${themeColor}15`, color: themeColor }}>
            {activeCount} ACTIVE
          </span>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-4 px-5 py-2 border-b border-white/[0.05]">
          {["Network", "Status", "Leads", "Est. Yield"].map(h => (
            <span key={h} className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">{h}</span>
          ))}
        </div>

        {/* Rows */}
        {data.activeChains.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Icon name="Activity" size={24} className="text-slate-700 mb-3" />
            <p className="text-slate-600 text-sm">No active networks</p>
            <p className="text-slate-700 text-xs mt-1">Connect a chain to begin monitoring</p>
          </div>
        ) : (
          data.activeChains.map((chain, i) => (
            <div
              key={i}
              className="grid grid-cols-4 items-center px-5 py-3.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors group"
            >
              {/* Network */}
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${chain.status === "ACTIVE" ? "bg-green-500" : "bg-slate-700"}`}
                  style={chain.status === "ACTIVE" ? { boxShadow: "0 0 6px #22c55e" } : {}}
                />
                <span className="text-white text-sm font-bold font-mono">{chain.name}</span>
              </div>

              {/* Status */}
              <span
                className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded w-fit"
                style={{
                  backgroundColor: chain.status === "ACTIVE" ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)",
                  color: chain.status === "ACTIVE" ? "#22c55e" : "#64748b",
                }}
              >
                {chain.status}
              </span>

              {/* Leads */}
              <span className="text-white text-sm font-mono">{chain.leads}</span>

              {/* Yield */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold font-mono" style={{ color: themeColor }}>
                  {chain.profit} ETH
                </span>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-white/10">
                  <Icon name="TrendingUp" size={14} className="text-slate-500" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SovereigntyDashboard;
