import React from "react";
import { workspaceColor } from "./workspaceShellTokens";

/**
 * WorkspaceWindowControls — min / max / close for the frameless Windows shell.
 *
 * The workspace frame has no global header, so these seat in the top-right
 * panel (the shell passes them to the Operation Center). Same IPC pattern the
 * boot loader has used since the light shell landed: prefer the preload's
 * window.luca actions, fall back to raw window-* IPC sends. macOS keeps its
 * native traffic lights and never renders these.
 */

const act = (action: "minimize" | "maximize" | "close") => {
  const luca = (window as any).luca;
  if (typeof luca?.[action] === "function") {
    luca[action]();
    return;
  }
  (window as any).electron?.ipcRenderer?.send?.(`window-${action}`);
};

const isWindowsShell = (): boolean =>
  typeof navigator !== "undefined" &&
  navigator.userAgent.includes("Windows") &&
  Boolean((window as any).luca || (window as any).electron);

const glyphs: Array<{ action: "minimize" | "maximize" | "close"; label: string; d: string }> = [
  { action: "minimize", label: "Minimize window", d: "M3.5 8.5h9" },
  { action: "maximize", label: "Maximize or restore window", d: "M4.5 4.5h7v7h-7z" },
  { action: "close", label: "Close window", d: "M4.5 4.5l7 7M11.5 4.5l-7 7" },
];

export const WorkspaceWindowControls: React.FC = () => {
  if (!isWindowsShell()) return null;
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {glyphs.map(({ action, label, d }) => (
        <button
          key={action}
          type="button"
          aria-label={label}
          title={label}
          onClick={() => act(action)}
          className="luca-workspace-toggle"
          style={{
            width: 28,
            height: 24,
            border: 0,
            borderRadius: 6,
            background: "transparent",
            color: action === "close" ? workspaceColor.ink3 : workspaceColor.ink3,
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <path d={d} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          </svg>
        </button>
      ))}
    </span>
  );
};

export default WorkspaceWindowControls;
