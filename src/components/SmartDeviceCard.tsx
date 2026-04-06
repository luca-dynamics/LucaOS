import React from "react";
import { SmartDevice, DeviceType } from "../types";
import { Icon } from "./ui/Icon";

interface Props {
  device: SmartDevice;
  onControlClick?: (device: SmartDevice) => void;
  theme?: any;
}

const SmartDeviceCard: React.FC<Props> = ({
  device,
  onControlClick,
}) => {
  const getIcon = () => {
    switch (device.type) {
      case DeviceType.LIGHT:
        return <Icon name="Lightbulb" size={20} variant="BoldDuotone" />;
      case DeviceType.LOCK:
        return <Icon name="Lock" size={20} variant="BoldDuotone" />;
      case DeviceType.SERVER:
        return <Icon name="Server" size={20} variant="BoldDuotone" />;
      case DeviceType.ROBOTIC_ARM:
        return <Icon name="Bot" size={20} variant="BoldDuotone" />;
      case DeviceType.CAMERA:
        return <Icon name="Video" size={20} variant="BoldDuotone" />;
      case DeviceType.MOBILE:
        return <Icon name="Smartphone" size={20} variant="BoldDuotone" />;
      case DeviceType.SMART_TV:
        return <Icon name="Tv" size={20} variant="BoldDuotone" />;
      default:
        return <Icon name="Activity" size={20} variant="BoldDuotone" />;
    }
  };

  const isError = device.status === "error";
  const isOn = device.isOn;

  return (
    <div
      className={`
        relative p-5 rounded-2xl transition-all duration-500
        flex flex-col gap-3 group tech-border glass-blur border
        animate-in zoom-in duration-700
        ${isError 
          ? "bg-red-500/10 border-red-500/30 shadow-red-500/10" 
          : isOn 
            ? "bg-[var(--app-primary)]/10 border-[var(--app-primary)]/40 shadow-lg shadow-black/20 scale-[1.02]" 
            : "bg-[var(--app-bg-tint)] border-[var(--app-border-main)] opacity-70 grayscale-[0.5] hover:grayscale-0 hover:opacity-100 hover:scale-[1.02]"}
      `}
    >
      <div className="flex justify-between items-start">
        <div
          className={`p-2.5 rounded-xl border tech-border transition-all duration-500 shadow-inner
            ${isError 
              ? "bg-red-500/20 border-red-500/40 text-red-500" 
              : isOn 
                ? "bg-[var(--app-primary)]/20 border-[var(--app-primary)]/40 text-[var(--app-primary)]" 
                : "bg-black/20 border-[var(--app-border-main)] text-[var(--app-text-muted)] group-hover:text-[var(--app-text-main)]"}
          `}
        >
          {getIcon()}
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full shadow-sm animate-pulse
              ${device.status === "online" ? "bg-green-500 shadow-green-500/50" : "bg-red-500 shadow-red-500/50"} 
            `}
          />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] font-mono text-[var(--app-text-muted)]">
            {device.status}
          </span>
        </div>
      </div>

      <div className="mt-1">
        <h3
          className={`font-black text-sm tracking-[0.1em] uppercase italic truncate text-[var(--app-text-main)] group-hover:tracking-[0.15em] transition-all`}
        >
          {device.name}
        </h3>
        <p
          className={`font-black font-mono text-[10px] tracking-widest uppercase text-[var(--app-text-muted)] opacity-50`}
        >
          {device.location}
        </p>
      </div>

      <div
        className={`mt-2 pt-3 border-t border-[var(--app-border-main)]/30 flex items-center justify-between font-black font-mono text-[9px] tracking-[0.2em] uppercase`}
      >
        <span className="text-[var(--app-text-muted)] opacity-40">Status</span>
        <span
          className={`px-2 py-0.5 rounded border tech-border transition-all
            ${isOn 
              ? "text-[var(--app-primary)] bg-[var(--app-primary)]/10 border-[var(--app-primary)]/20" 
              : "text-[var(--app-text-muted)] bg-black/10 border-[var(--app-border-main)]/30"}
          `}
        >
          {isOn ? "Active" : "Standby"}
        </span>
      </div>

      {(device.type === DeviceType.SMART_TV || device.type === DeviceType.MOBILE) && onControlClick && (
        <button
          onClick={() => onControlClick(device)}
          className={`mt-2 w-full py-2.5 rounded-xl text-[10px] font-black tracking-[0.3em] uppercase italic transition-all group/btn border tech-border glass-blur 
            bg-black/20 border-[var(--app-border-main)] text-[var(--app-text-main)]
            hover:bg-[var(--app-text-main)]/10 hover:tracking-[0.4em] active:scale-95 shadow-lg shadow-black/20
          `}
        >
          {device.type === DeviceType.SMART_TV ? "Launch Remote" : "Access Uplink"}
        </button>
      )}
    </div>
  );
};

export default SmartDeviceCard;
