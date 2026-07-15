import React from "react";
import { Icon } from "../ui/Icon";
import {
  lucaMaterialCardStyle,
  lucaMaterialControlStyle,
  lucaMaterialMetricStyle,
  lucaMaterialSolidCardStyle,
} from "../../styles/lucaMaterialSystem";

interface MobileAppManagerProps {
  runningPackages: string[];
  exploitLogs: string[];
  dumpedData: any[];
  onExfiltrate: (type: "SMS" | "CALLS") => void;
  onRefreshPackages: () => void;
  onKillPackage: (pkg: string) => void;
  isAdbConnected: boolean;
}

const MobileAppManager: React.FC<MobileAppManagerProps> = ({
  runningPackages,
  exploitLogs,
  dumpedData,
  onExfiltrate,
  onRefreshPackages,
  onKillPackage,
  isAdbConnected,
}) => {
  return (
    <div className="h-full flex gap-6">
      {/* Left: Controls */}
      <div className="w-1/3 flex flex-col gap-4">
        <div
          className="rounded-xl border border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] p-4"
          style={lucaMaterialCardStyle}
        >
          <h3 className="text-xs font-bold text-[var(--luca-danger,#f87171)] tracking-widest mb-3 flex items-center gap-2">
            <Icon name="Eye" size={12} variant="BoldDuotone" /> DATA EXFILTRATION
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onExfiltrate("SMS")}
              className="p-2 bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] border border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] hover:bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] hover:text-black text-[var(--luca-danger,#f87171)] text-[10px] font-bold transition-all"
            >
              DUMP SMS
            </button>
            <button
              onClick={() => onExfiltrate("CALLS")}
              className="p-2 bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] border border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] hover:bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] hover:text-black text-[var(--luca-danger,#f87171)] text-[10px] font-bold transition-all"
            >
              DUMP CALLS
            </button>
          </div>
        </div>

        <div
          className="flex flex-1 flex-col rounded-xl border border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] p-4"
          style={lucaMaterialCardStyle}
        >
          <h3 className="text-xs font-bold text-[var(--luca-danger,#f87171)] tracking-widest mb-3 flex items-center gap-2">
            <Icon name="Activity" size={12} variant="BoldDuotone" /> PROCESS KILLER
          </h3>
          <button
            onClick={onRefreshPackages}
            className="luca-material-pressable mb-2 w-full rounded-lg border py-1 text-[10px] hover:text-[var(--luca-text-primary)]"
            style={lucaMaterialControlStyle}
          >
            REFRESH LIST
          </button>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {runningPackages.map((pkg, i) => (
              <div
                key={i}
                className="group flex items-center justify-between rounded-lg border p-1 hover:border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)]"
                style={lucaMaterialMetricStyle}
              >
                <span className="w-32 truncate font-mono text-[9px] text-[var(--luca-text-tertiary)]">
                  {pkg}
                </span>
                <button
                  onClick={() => onKillPackage(pkg)}
                  className="text-[var(--luca-danger,#f87171)] hover:text-[var(--luca-danger,#f87171)]"
                >
                  <Icon name="Trash" size={10} variant="BoldDuotone" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Terminal / Data View */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border font-mono" style={lucaMaterialSolidCardStyle}>
        <div className="flex justify-between p-2 text-[10px] text-[var(--luca-text-tertiary)]" style={lucaMaterialMetricStyle}>
          <span>ROOT@REMOTE_SHELL: ~ $</span>
          <span>{isAdbConnected ? "STATUS: ROOTED" : "STATUS: OFF"}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 text-[10px] text-[var(--luca-success,#4fbf7a)] space-y-1">
          {exploitLogs.map((log, i) => (
            <div
              key={i}
              className={
                log.includes("[ERR]")
                  ? "text-[var(--luca-danger,#f87171)]"
                  : log.includes("[WARN]")
                  ? "text-[var(--luca-warning,#f2b23e)]"
                  : "text-[var(--luca-success,#4fbf7a)]"
              }
            >
              {log}
            </div>
          ))}
          {dumpedData.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)]">
              <div className="mb-2 text-[var(--luca-text-primary)]">--- BEGIN DATA DUMP ---</div>
              {dumpedData.map((record, i) => (
                <div
                  key={i}
                  className="mb-1 rounded p-1 opacity-80 hover:bg-[var(--luca-surface-hover)] hover:opacity-100"
                >
                  {JSON.stringify(record)}
                </div>
              ))}
              <div className="mt-2 text-[var(--luca-text-primary)]">--- END DATA DUMP ---</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileAppManager;
