import React from "react";
import { Icon } from "../ui/Icon";
import SmartDeviceCard from "../SmartDeviceCard";
import type { SmartDevice } from "../../types";

interface DevicesSectionProps {
  devices: SmartDevice[];
  isLight?: boolean;
  onControlClick: (device: SmartDevice) => void;
}

/**
 * DEVICES section (formerly "Facility Control"). Connected devices grid backed
 * by the existing SmartDeviceCard. Hidden when there are no devices.
 */
const DevicesSection: React.FC<DevicesSectionProps> = ({
  devices,
  isLight,
  onControlClick,
}) => {
  if (!devices || devices.length === 0) return null;

  return (
    <div className="space-y-4 animate-in slide-in-from-left duration-700 delay-100">
      <div
        className={`flex items-center gap-3 mb-2 text-[var(--app-text-main)] ${
          isLight ? "opacity-90" : "opacity-70"
        }`}
      >
        <Icon name="Cpu" size={18} variant="BoldDuotone" />
        <h2 className="font-black tracking-widest text-xs uppercase">
          Connected Devices
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {devices.map((device) => (
          <SmartDeviceCard
            key={device.id}
            device={device}
            onControlClick={onControlClick}
          />
        ))}
      </div>
    </div>
  );
};

export default DevicesSection;
