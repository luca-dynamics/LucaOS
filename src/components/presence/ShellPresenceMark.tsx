import React from "react";
import PresenceMark from "./PresenceMark";
import { usePresenceMarkLiveState } from "../../presence/usePresenceMarkLiveState";

/**
 * The shell's presence anchor: PresenceMark driven by the live nervous
 * system instead of a hardcoded state. Lives in the left rail brand bar.
 */
export const ShellPresenceMark: React.FC<{ size?: number }> = ({
  size = 24,
}) => {
  const state = usePresenceMarkLiveState();
  return (
    <PresenceMark
      state={state}
      size={size}
      title={state === "needs-you" ? "Luca needs you" : "Luca is present"}
    />
  );
};

export default ShellPresenceMark;
