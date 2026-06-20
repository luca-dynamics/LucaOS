import React from "react";
import { Icon } from "../ui/Icon";
import { ConnectionState } from "../../services/lucaLink/types";

interface ConnectionStatusProps {
  state: ConnectionState;
  latency?: number;
  onDetailsClick?: () => void;
  themePrimary?: string;
  themeBorder?: string;
  themeBg?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  state,
  latency,
  onDetailsClick,
  themePrimary = "text-[var(--luca-info,#4f8cff)]",
  themeBorder = "border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)]",
  themeBg = "bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)]",
}) => {
  const getStatusConfig = () => {
    switch (state) {
      case ConnectionState.CONNECTED:
        return {
          icon: "Wifi",
          label: "CONNECTED",
          color: "text-[var(--luca-success,#4fbf7a)]",
          bgColor: "bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)]",
          borderColor: "border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)]",
          dotColor: "bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)]",
          animation: "animate-pulse",
        };
      case ConnectionState.CONNECTING:
      case ConnectionState.HANDSHAKING:
      case ConnectionState.AUTHENTICATING:
        return {
          icon: "Loader",
          label: "CONNECTING",
          color: themePrimary,
          bgColor: themeBg,
          borderColor: themeBorder.includes("#")
            ? `${themeBorder}80`
            : `${themeBorder}/50`,
          dotColor: themePrimary.replace("text-", "bg-"),
          animation: "animate-spin",
        };
      case ConnectionState.RECONNECTING:
        return {
          icon: "Activity",
          label: "RECONNECTING",
          color: "text-[var(--luca-warning,#f2b23e)]",
          bgColor: "bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]",
          borderColor: "border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)]",
          dotColor: "bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]",
          animation: "animate-pulse",
        };
      case ConnectionState.DISCONNECTED:
      case ConnectionState.ERROR:
        return {
          icon: "WifiOff",
          label: "DISCONNECTED",
          color: "text-[var(--luca-danger,#f87171)]",
          bgColor: "bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]",
          borderColor: "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)]",
          dotColor: "bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]",
          animation: "",
        };
      case ConnectionState.DEGRADED:
        return {
          icon: "AlertCircle",
          label: "DEGRADED",
          color: "text-[var(--luca-warning,#f2b23e)]",
          bgColor: "bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]",
          borderColor: "border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)]",
          dotColor: "bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]",
          animation: "animate-pulse",
        };
      default:
        return {
          icon: "WifiOff",
          label: "UNKNOWN",
          color: "text-gray-400",
          bgColor: "bg-gray-500/10",
          borderColor: "border-gray-500/50",
          dotColor: "bg-gray-400",
          animation: "",
        };
    }
  };

  const config = getStatusConfig();
  const IconComp = config.icon;

  return (
    <div
      className={`
        flex items-center gap-1.5 sm:gap-2 
        px-2 sm:px-3 py-1 sm:py-1.5 
        rounded-full 
        text-[9px] sm:text-[10px] 
        font-mono font-medium 
        border 
        ${config.bgColor} 
        ${config.borderColor} 
        ${config.color}
        transition-all duration-300
        ${onDetailsClick ? "cursor-pointer hover:brightness-110" : ""}
      `}
      onClick={onDetailsClick}
    >
      {/* Animated Dot */}
      <div className="relative flex items-center justify-center w-2 h-2 sm:w-2.5 sm:h-2.5">
        <div
          className={`absolute w-full h-full ${config.dotColor} rounded-full ${config.animation}`}
        />
        <div
          className={`absolute w-full h-full ${config.dotColor} rounded-full opacity-50 blur-[2px]`}
        />
      </div>

      {/* Icon */}
      <Icon name={IconComp} size={10} className={`sm:w-3 sm:h-3 ${config.animation}`} />

      {/* Status Text - Hidden on very small screens */}
      <span className="hidden xs:inline uppercase tracking-wider">
        {config.label}
      </span>

      {/* Latency - Desktop only */}
      {latency !== undefined && state === ConnectionState.CONNECTED && (
        <span className="hidden sm:inline text-[9px] opacity-70">
          · {latency}ms
        </span>
      )}

      {/* Encrypted Badge - Desktop only */}
      {state === ConnectionState.CONNECTED && (
        <span className="hidden md:inline text-[9px] opacity-70">
          · ENCRYPTED
        </span>
      )}
    </div>
  );
};
