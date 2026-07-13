import React, { useCallback, useEffect, useState } from "react";
import type { SandboxFleetOperatorView } from "../../types/sandboxFleet";
import SandboxFleetPanel from "./SandboxFleetPanel";
import {
  getLiveSandboxBridge,
  loadLiveFleetView,
} from "../../services/sandbox/SandboxFleetLiveBridge";

/**
 * Live container for SandboxFleetPanel: reads fleet state from the desktop
 * broker via the narrow preload bridge (window.luca.sandbox) and maps panel
 * actions back onto it. Only broker-backed actions are wired — switch and
 * artifact review have no live IPC yet, so the pure panel hides those
 * controls. Outside the desktop shell it degrades to a hint.
 */
export const SandboxFleetLivePanel: React.FC = () => {
  const [view, setView] = useState<SandboxFleetOperatorView | null>(null);
  const [busyAction, setBusyAction] = useState<string | undefined>();
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const next = await loadLiveFleetView();
      setView(next);
      setError("");
    } catch {
      setError("Sandbox fleet status could not be loaded.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = useCallback(
    async (action: string, run: () => Promise<unknown>) => {
      setBusyAction(action);
      try {
        await run();
        await refresh();
      } catch {
        setError("Sandbox action failed safely.");
      } finally {
        setBusyAction(undefined);
      }
    },
    [refresh],
  );

  const bridge = getLiveSandboxBridge();
  if (!bridge) {
    return (
      <section
        aria-label="Sandbox fleet"
        className="rounded-2xl border border-white/10 bg-black/20 p-4"
      >
        <p className="text-xs text-white/55">
          Sandbox fleet controls are available in the LucaOS desktop app.
        </p>
      </section>
    );
  }

  if (!view) {
    return (
      <section
        aria-label="Sandbox fleet"
        className="rounded-2xl border border-white/10 bg-black/20 p-4"
      >
        <p className="text-xs text-white/55">
          {error || "Loading sandbox fleet…"}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-amber-100">{error}</p>}
      <SandboxFleetPanel
        view={view}
        busyAction={busyAction}
        onSnapshotSession={(sessionId) =>
          void act("snapshot", () => bridge.snapshot(sessionId))
        }
        onEmergencyDestroy={(sessionId) =>
          void act("destroy", () => bridge.destroy(sessionId))
        }
        onCleanupExpired={() => void act("cleanup", () => bridge.cleanupExpired())}
      />
    </div>
  );
};

export default SandboxFleetLivePanel;
