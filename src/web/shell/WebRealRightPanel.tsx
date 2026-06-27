import { useState } from "react";
import ControlPanel from "../../components/right-panel/ControlPanel";
import ActivityPanel from "../../components/right-panel/ActivityPanel";
import MemoryControlPanel from "../../components/right-panel/MemoryControlPanel";
import { SkillPermissionGrantProvider } from "../../components/SkillPermissionGrantContext";
import type { RightPanelMode } from "../../components/right-panel/rightPanelModel";
import type { MemoryNode } from "../../types";

/**
 * WebRealRightPanel — mounts the REAL desktop right-panel components
 * (ControlPanel / ActivityPanel / MemoryControlPanel) in the browser-safe web
 * build, replacing the bespoke web rows. Each takes a theme object; Memory also
 * takes local memory state. Their service imports degrade in-browser like the
 * rest, so the real components render without the native chain.
 */

const theme = {
  hex: "var(--luca-accent-primary)",
  primary: "var(--luca-accent-primary)",
  border: "var(--luca-border-subtle, var(--app-border-main))",
};

export function WebRealRightPanel({ mode }: { mode: RightPanelMode }) {
  const [memories, setMemories] = useState<MemoryNode[]>([]);

  // ControlPanel mounts OperationPermissionCenter, which reads the skill-grant
  // context; provide it here (the provider is pure/browser-safe). Desktop wraps
  // this at the App root.
  return (
    <SkillPermissionGrantProvider>
      {mode === "ACTIVITY" ? (
        <ActivityPanel theme={theme} />
      ) : mode === "MEMORY" ? (
        <MemoryControlPanel
          theme={theme}
          memories={memories}
          setMemories={setMemories}
          experienceMode="basic"
        />
      ) : (
        <ControlPanel theme={theme} />
      )}
    </SkillPermissionGrantProvider>
  );
}

export default WebRealRightPanel;
