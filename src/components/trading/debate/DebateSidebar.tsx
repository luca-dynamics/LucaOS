import { Icon } from "../../ui/Icon";
import { DebateSession, TraderInfo } from "../../../types/trading";

import { LucaAvatar } from "../../../utils/tradingUI";

interface DebateSidebarProps {
  sessions: DebateSession[];
  traders: TraderInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onStart: (id: string) => void;
  onDelete: (id: string) => void;
  selectedTraderId?: string;
  onTraderSelect?: (id: string) => void;
  theme?: { isLight?: boolean };
}

export default function DebateSidebar({
  sessions,
  traders,
  selectedId,
  onSelect,
  onCreate,
  onStart,
  onDelete,
  selectedTraderId,
  onTraderSelect,
  theme,
}: DebateSidebarProps) {
  const isLight = theme?.isLight;
  const onlineTraders = traders.filter((t) => t.is_running);
  const offlineTraders = traders.filter((t) => !t.is_running);

  return (
    <div className={`w-64 ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0a] border-white/5"} border-r flex flex-col h-full overflow-hidden flex-shrink-0`}>
      {/* 1. New Debate Button */}
      <div className="p-3 border-b border-white/5">
        <button
          onClick={onCreate}
          className="w-full py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-yellow-500/5 active:transform active:scale-[0.98]"
        >
          <Icon name="Plus" size={14} variant="BoldDuotone" /> New debate
        </button>
      </div>

      {/* 2. Debate Sessions List */}
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${isLight ? "bg-white" : "bg-black/20"}`}>
        <div className={`px-3 py-2 text-[10px] font-bold ${isLight ? "text-slate-400" : "text-slate-500"} flex items-center justify-between border-b ${isLight ? "border-slate-200 bg-slate-50" : "border-white/5 bg-[#0a0a0a]"}`}>
          <span className="flex items-center gap-1.5 tracking-widest">
            <Icon name="Users" size={10} className={isLight ? "text-slate-300" : "text-slate-400"} variant="BoldDuotone" />
            Sessions
          </span>
          <span className="bg-slate-800 text-slate-400 px-1.5 rounded-sm tabular-nums">
            {sessions.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 custom-scrollbar">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelect(session.id)}
              className={`p-2.5 rounded border transition-all cursor-pointer group relative ${
                selectedId === session.id
                  ? "bg-yellow-500/10 border-yellow-500/40 shadow-sm"
                  : "bg-transparent border-transparent hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ring-2 ring-black/50 ${getStatusColor(
                    session.status
                  )}`}
                />
                <span
                  className={`text-xs font-bold truncate flex-1 ${
                    selectedId === session.id ? "text-white" : "text-slate-400"
                  }`}
                >
                  {session.name}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono tracking-tight pl-3.5">
                <span
                  className={
                    selectedId === session.id ? "text-yellow-500/80" : ""
                  }
                >
                  {session.symbol}
                </span>
                <span className="bg-white/5 px-1 rounded tabular-nums">
                  R{session.currentRound}/{session.maxRounds}
                </span>
              </div>

              {/* Actions for Pending State */}
              {session.status === "pending" && selectedId === session.id && (
                <div className="flex gap-1.5 mt-2 pt-2 border-t border-white/5 animate-in slide-in-from-top-1 duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStart(session.id);
                      }}
                      className="flex-1 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold rounded hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors tracking-wider"
                    >
                      Start
                    </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(session.id);
                    }}
                    className="flex-1 py-1 bg-rose-500/10 text-rose-400 text-[9px] font-bold rounded hover:bg-rose-500/20 border border-rose-500/20 transition-colors tracking-wider"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="text-center py-8 text-slate-600 text-xs italic flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center">
                <Icon name="Play" size={16} className="opacity-50" variant="BoldDuotone" />
              </div>
              No active debates
            </div>
          )}
        </div>
      </div>

      <div className={`h-[40%] min-h-[200px] border-t ${isLight ? "border-slate-200" : "border-white/5"} flex flex-col ${isLight ? "bg-white" : "bg-[#080808]"}`}>
        <div className={`px-3 py-2 text-[10px] font-bold ${isLight ? "text-slate-400" : "text-slate-500"} flex items-center gap-1.5 ${isLight ? "bg-slate-50 border-b border-slate-200" : "bg-[#0a0a0a] border-b border-white/5"} tracking-widest`}>
          <Icon name="Zap" size={10} className="text-emerald-500" variant="BoldDuotone" />
          <span>Online traders</span>
          <span className="ml-auto bg-emerald-500/10 text-emerald-500 px-1.5 rounded-sm tabular-nums">
            {onlineTraders.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 custom-scrollbar">
          {onlineTraders.map((trader) => (
            <TraderRow
              key={trader.trader_id}
              trader={trader}
              isSelected={selectedTraderId === trader.trader_id}
              onClick={() => onTraderSelect?.(trader.trader_id)}
            />
          ))}

          {offlineTraders.length > 0 && (
            <div className="pt-2 mt-2 border-t border-white/5">
            <div className={`px-2 mb-2 text-[9px] font-bold ${isLight ? "text-slate-300" : "text-slate-600"} tracking-widest`}>
              Offline
            </div>
              {offlineTraders.map((trader) => (
                <TraderRow
                  key={trader.trader_id}
                  trader={trader}
                  isSelected={selectedTraderId === trader.trader_id}
                  onClick={() => onTraderSelect?.(trader.trader_id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TraderRow({
  trader,
  isSelected,
  onClick,
}: {
  trader: TraderInfo;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-2 rounded border transition-all flex items-center gap-2.5 group ${
        isSelected
          ? "bg-emerald-500/10 border-emerald-500/30 shadow-sm shadow-emerald-500/5"
          : "bg-transparent border-transparent hover:bg-white/5"
      } ${
        !trader.is_running
          ? "opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
          : ""
      }`}
    >
      <div className="relative flex-shrink-0">
        <LucaAvatar aiModelId={trader.ai_model || ""} size={32} />
        {trader.is_running && (
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#080808] rounded-full ring-2 ring-emerald-500/20" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <div
            className={`text-[11px] font-bold truncate tracking-tight ${
              isSelected
                ? "text-emerald-400"
                : "text-slate-200 group-hover:text-white"
            }`}
          >
            {trader.trader_name}
          </div>
          <div className="text-[10px] font-mono font-bold text-emerald-400 tabular-nums">
            +{(trader as any).total_pnl_pct || trader.total_pnl || 0}%
          </div>
        </div>
        
        <div className={`flex items-center justify-between text-[9px] font-mono tracking-tighter`}>
          <span className="text-slate-500 truncate mr-2">
            {trader.ai_model || "Multi-agent"}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-slate-400 font-bold whitespace-nowrap">
              {trader.win_rate}% WR
            </span>
            <span className="text-slate-600">
              {trader.trade_count}T
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case "pending":
      return "bg-slate-500";
    case "running":
    case "in_progress":
      return "bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.5)]";
    case "voting":
      return "bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]";
    case "completed":
      return "bg-emerald-500";
    default:
      return "bg-slate-700";
  }
}
