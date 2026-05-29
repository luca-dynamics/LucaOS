import React from "react";
import RuntimeDiagnosticsPanel from "../runtime/RuntimeDiagnosticsPanel";
import SystemHealthCard from "./SystemHealthCard";

interface SystemRailSectionProps {
  isMobile: boolean;
  connectionTier: "LAN" | "LOCAL" | "CLOUD" | "OFFLINE";
}

/**
 * SYSTEM section body of the rail (below the SystemMonitor graph).
 *
 * Shows the compact SystemHealthCard for an at-a-glance status everywhere, and
 * keeps the detailed RuntimeDiagnosticsPanel on desktop where there is room.
 * This avoids duplicating the full right-panel control plane while preserving
 * the detailed diagnostics for operators.
 */
const SystemRailSection: React.FC<SystemRailSectionProps> = ({
  isMobile,
  connectionTier,
}) => {
  return (
    <div className="space-y-4">
      <SystemHealthCard connectionTier={connectionTier} />
      {!isMobile && (
        <RuntimeDiagnosticsPanel
          title="Runtime Status"
          collapsible
          defaultCollapsed
          onAction={(actionId) => {
            if (
              [
                "open_model_manager",
                "add_byok_key",
                "switch_to_luca_prime",
                "start_ollama",
                "install_ollama",
              ].includes(actionId)
            ) {
              window.dispatchEvent(
                new CustomEvent("luca:open-settings", {
                  detail: { tab: "model-manager" },
                }),
              );
            }
          }}
        />
      )}
    </div>
  );
};

export default SystemRailSection;
