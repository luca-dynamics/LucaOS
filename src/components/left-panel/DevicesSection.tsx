import React from "react";
import SmartDeviceCard from "../SmartDeviceCard";
import CollapsibleSection from "./CollapsibleSection";
import { shouldCollapseDevicesByDefault } from "./leftPanelModel";
import type { SmartDevice } from "../../types";

interface DevicesSectionProps {
  devices: SmartDevice[];
  isLight?: boolean;
  onControlClick: (device: SmartDevice) => void;
}

/**
 * DEVICES section (formerly "Facility Control"). Connected devices grid backed
 * by the existing SmartDeviceCard. Hidden when there are no devices, and
 * collapsed by default once the list grows long so it doesn't crowd the rail.
 */
const DevicesSection: React.FC<DevicesSectionProps> = ({
  devices,
  isLight,
  onControlClick,
}) => {
  if (!devices || devices.length === 0) return null;

  return (
    <div className="animate-in slide-in-from-left duration-700 delay-100">
      <CollapsibleSection
        title={`Connected Devices (${devices.length})`}
        icon="Cpu"
        isLight={isLight}
        defaultCollapsed={shouldCollapseDevicesByDefault(devices.length)}
      >
        <div className="grid grid-cols-2 gap-4">
          {devices.map((device) => (
            <SmartDeviceCard
              key={device.id}
              device={device}
              onControlClick={onControlClick}
            />
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default DevicesSection;
