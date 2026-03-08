import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { settingsService } from "../../services/settingsService";
import { memoryService } from "../../services/memoryService";
import { introspectionService } from "../../services/introspectionService";
import { liveService } from "../../services/liveService";
import { selfExpressionService } from "../../services/selfExpressionService";
import { taskService } from "../../services/taskService";
import { soundService } from "../../services/soundService";
import { apiUrl, waitForAuth } from "../../config/api";
import { clearCloudOnlyMode, isCloudOnly } from "../../utils/cloudMode";

import { Sender, Message } from "../../types";

interface UseAppSystemProps {
  messages: Message[];
  persona: string;
  isElectron: boolean;
  setMessages: (updater: (prev: Message[]) => Message[]) => void;
  setCurrentCwd: (cwd: string) => void;
  setMemories: (m: any) => void;
  setTasks: (t: any) => void;
  setEvents: (e: any) => void;
  setBackgroundImage: (url: string) => void;
  setGhostBrowserUrl: (url: string) => void;
  setOpsecStatus: (status: string) => void;

  hasInitializedRef: React.MutableRefObject<boolean>;
  hasAnnouncedRef: React.MutableRefObject<boolean>;

  restoreTools: () => Promise<void>;
  // Externalized state
  bootSequence: BootSequence;
  setBootSequence: React.Dispatch<React.SetStateAction<BootSequence>>;
  biosStatus: any;
  setBiosStatus: React.Dispatch<React.SetStateAction<any>>;
  setGoals: React.Dispatch<React.SetStateAction<any[]>>;
  devices: any[];
  setDevices: React.Dispatch<React.SetStateAction<any[]>>;
}

export type BootSequence = "INIT" | "BIOS" | "KERNEL" | "ONBOARDING" | "READY";

export const useAppSystem = ({
  messages,
  isElectron,
  setMessages,
  setCurrentCwd,
  setMemories,
  setTasks,
  setEvents,
  setBackgroundImage,
  setGhostBrowserUrl,

  hasInitializedRef,
  hasAnnouncedRef,
  restoreTools,
  bootSequence,
  setBootSequence,
  biosStatus,
  setBiosStatus,
  setGoals,
  devices,
  setOpsecStatus,
}: UseAppSystemProps) => {
  const [isLocalCoreConnected, setIsLocalCoreConnected] = useState(false);
  const [hostPlatform, setHostPlatform] = useState(() => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return "iOS (Safari)";
    if (/Android/.test(ua)) return "Android (Chrome)";
    if (/Win/.test(ua)) return "Windows (Browser)";
    if (/Mac/.test(ua)) return "macOS (Browser)";
    if (/Linux/.test(ua)) return "Linux (Browser)";
    return "Unknown Host";
  });
  const [isKernelLocked, setIsKernelLocked] = useState(false);
  const [localIp, setLocalIp] = useState("localhost");
  const [appMode, setAppMode] = useState("dashboard");

  // 1. QUERY PARAM MODE CHECK
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const isCapacitor = Capacitor.isNativePlatform();

    if (
      ["widget", "chat", "browser", "visual_core", "hologram"].includes(
        mode || "",
      )
    ) {
      setAppMode(mode!);
      document.body.style.backgroundColor = "transparent";
      setBootSequence("READY");
      if (mode === "browser") {
        const initialUrl = params.get("initialUrl");
        if (initialUrl) setGhostBrowserUrl(initialUrl);
      }
    } else if (isCapacitor) {
      const isSetupComplete = settingsService.get("general").setupComplete;
      setBootSequence(isSetupComplete ? "READY" : "ONBOARDING");
    }
  }, [setGhostBrowserUrl]);

  // 2. BIOS & DIAGNOSTICS
  useEffect(() => {
    // Prevent re-running if already initialized or ready
    if (
      hasInitializedRef.current ||
      Capacitor.isNativePlatform() ||
      bootSequence === "READY"
    )
      return;

    const runDiagnostics = async () => {
      hasInitializedRef.current = true; // Mark as running/ran

      const isFastReboot = sessionStorage.getItem("LUCA_HAS_BOOTED") === "true";

      if (isFastReboot) {
        console.log(
          "[BOOT] Fast reboot detected (sessionStorage). Bypassing BIOS checks.",
        );
        setBootSequence("KERNEL");
      } else {
        setBootSequence("BIOS");
        console.log("[BOOT] Starting Diagnostics (BIOS)...");
        soundService.play("BOOT");
      }

      // --- SECURITY HANDSHAKE (Always Required) ---
      if (isElectron && (window as any).luca?.getSecureToken) {
        try {
          const token = await (window as any).luca.getSecureToken();
          const { setLucaAuthToken } = await import("../../config/api");
          setLucaAuthToken(token || ""); // Unblock with empty if null
          console.log("[BOOT] Security Handshake Complete.");
        } catch (e) {
          console.error("[BOOT] Security Handshake Failed:", e);
          // Still need to unblock waiters even on failure
          const { setLucaAuthToken } = await import("../../config/api");
          setLucaAuthToken("");
        }
      }

      let criticalPassed = true;

      if (!isFastReboot) {
        await new Promise((r) => setTimeout(r, 800));

        const check = async (
          name: string,
          fn: () => Promise<boolean>,
          key: string,
        ) => {
          setBiosStatus((p: any) => ({ ...p, [key]: "PENDING" }));
          console.log(`[BIOS] Starting check for: ${name}`);
          for (let i = 0; i < 10; i++) {
            try {
              if (await fn()) {
                console.log(`[BIOS] Check PASSED for: ${name}`);
                setBiosStatus((p: any) => ({ ...p, [key]: "OK" }));
                return true;
              }
              console.log(
                `[BIOS] Check attempt ${i + 1} failed for ${name}... retrying`,
              );
            } catch (e: any) {
              console.warn(`[BIOS] Check error for ${name}:`, e.message || e);
            }
            await new Promise((r) => setTimeout(r, 1000));
          }
          console.error(`[BIOS] Check PERMANENTLY FAILED for: ${name}`);
          setBiosStatus((p: any) => ({ ...p, [key]: "FAIL" }));
          return false;
        };

        const { getAuthHeaders } = await import("../../config/api");

        const results = await Promise.all([
          check(
            "Server",
            async () => {
              try {
                console.log(
                  "[DEBUG] Fetching Server health...",
                  apiUrl("/api/health"),
                );
                const resp = await fetch(apiUrl("/api/health"), {
                  headers: getAuthHeaders(),
                });
                console.log(
                  "[DEBUG] Server health fetch complete. Status:",
                  resp.status,
                );
                const ok = resp.ok || resp.status === 401;
                console.log("[DEBUG] Server health check result:", ok);
                return ok;
              } catch (e) {
                console.error("[DEBUG] Server health fetch THREW ERROR:", e);
                return false;
              }
            },
            "server",
          ),
          check(
            "Core",
            async () => (await memoryService.getCortexStatus()).available,
            "core",
          ),
          // Vision: non-blocking hardware check (never blocks boot)
          (async () => {
            try {
              const devices = await navigator.mediaDevices.enumerateDevices();
              const cameras = devices.filter((d) => d.kind === "videoinput");
              setBiosStatus((p: any) => ({
                ...p,
                vision: cameras.length > 0 ? "OK" : "FAIL",
              }));
            } catch {
              setBiosStatus((p: any) => ({ ...p, vision: "FAIL" }));
              console.warn("[BOOT] Vision check failed (non-blocking)");
            }
            return true; // Never block boot
          })(),
          check(
            "Audio",
            async () => {
              // Basic check without stream to avoid permission loops
              return !!(
                navigator.mediaDevices && navigator.mediaDevices.getUserMedia
              );
            },
            "audio",
          ),
          // Ollama: non-blocking informational check (never blocks boot)
          (async () => {
            try {
              const resp = await fetch("http://127.0.0.1:11434/api/tags", {
                signal: AbortSignal.timeout(2000),
              });
              if (resp.ok) {
                const data = await resp.json();
                const count = data.models?.length || 0;
                setBiosStatus((p: any) => ({
                  ...p,
                  ollama: `OK (${count} model${count !== 1 ? "s" : ""})`,
                }));
              } else {
                setBiosStatus((p: any) => ({
                  ...p,
                  ollama: "NOT FOUND",
                }));
              }
            } catch {
              setBiosStatus((p: any) => ({
                ...p,
                ollama: "NOT FOUND",
              }));
            }
            return true; // Never block boot
          })(),
        ]);

        // Only Server and Core are critical — proceed even if Vision/Audio fail
        criticalPassed = results[0] && results[1]; // Server + Core
      }

      if (criticalPassed) {
        console.log("[BOOT] BIOS Critical Checks Passed. Loading Kernel...");
        setBootSequence("KERNEL");

        try {
          memoryService.startSynapse();
        } catch (e) {
          console.warn("[BOOT] Synapse start failed (non-fatal):", e);
        }

        try {
          console.log("[BOOT] Restoring Tools...");
          await restoreTools();
          console.log("[BOOT] Tools Restored. Scanning Introspection...");
          const health = await introspectionService.scan();
          console.log("[BOOT] Introspection done. Registering Sensation...");
          await liveService.registerSensation(health);
          console.log("[BOOT] Sensation Registered.");

          if (messages.length === 0 && !hasAnnouncedRef.current) {
            hasAnnouncedRef.current = true;
            // Fire-and-forget: don't let voice announcement block boot
            selfExpressionService
              .announceStatus(health)
              .catch((e) =>
                console.warn(
                  "[BOOT] Voice announcement failed (non-fatal):",
                  e,
                ),
              );
          }

          console.log("[BOOT] KERNEL tasks complete. Transitioning...");
          setTimeout(
            () => {
              const complete = settingsService.get("general").setupComplete;
              console.log("[BOOT] Setup Complete?", complete);
              if (!complete) {
                console.log("[BOOT] Entering Onboarding...");
                setBootSequence("ONBOARDING");
              } else {
                console.log("[BOOT] System READY.");
                sessionStorage.setItem("LUCA_HAS_BOOTED", "true");
                setBootSequence("READY");

                if (messages.length === 0) {
                  const hour = new Date().getHours();
                  const greeting =
                    hour < 12
                      ? "Good morning"
                      : hour < 17
                        ? "Good afternoon"
                        : "Good evening";
                  const name =
                    settingsService.getOperatorProfile()?.name || "Commander";
                  setMessages(() => [
                    {
                      id: "0",
                      text: `${greeting}, ${name}.\n\nAll systems online. How may I assist?`,
                      sender: Sender.LUCA,
                      timestamp: Date.now(),
                    },
                  ]);
                }
              }
            },
            messages.length > 0 ? 0 : 2000,
          );
        } catch (error) {
          console.error("[BOOT] CRITICAL ERROR DURING KERNEL LOAD:", error);
          // Even on KERNEL error, try to proceed to ONBOARDING/READY
          console.log("[BOOT] Attempting recovery...");
          const complete = settingsService.get("general").setupComplete;
          setBootSequence(complete ? "READY" : "ONBOARDING");
        }
      } else {
        // --- CLOUD-ONLY MODE ---
        // No local Python backend detected. Gracefully degrade to browser-only mode.
        // Chat (Gemini API) and Voice (Gemini Live) still work directly from the browser.
        // Features requiring the backend (Terminal, OSINT, IoT, Memory) will be disabled.
        console.warn(
          "[BOOT] No local infrastructure detected. Entering Cloud-Only mode.",
        );
        sessionStorage.setItem("LUCA_CLOUD_ONLY", "true");

        // Still restore tools so chat works (tools will self-disable if they need backend)
        try {
          await restoreTools();
        } catch (e) {
          console.warn(
            "[BOOT] Tool restore failed in Cloud-Only mode (non-fatal):",
            e,
          );
        }

        const complete = settingsService.get("general").setupComplete;
        if (!complete) {
          console.log("[BOOT] Cloud-Only → Entering Onboarding...");
          setBootSequence("ONBOARDING");
        } else {
          console.log("[BOOT] Cloud-Only → System READY (degraded).");
          sessionStorage.setItem("LUCA_HAS_BOOTED", "true");
          setBootSequence("READY");

          if (messages.length === 0) {
            const hour = new Date().getHours();
            const greeting =
              hour < 12
                ? "Good morning"
                : hour < 17
                  ? "Good afternoon"
                  : "Good evening";
            const name =
              settingsService.getOperatorProfile()?.name || "Operator";
            setMessages(() => [
              {
                id: "0",
                text: `${greeting}, ${name}.\n\nRunning in Cloud Mode — Chat and Voice are fully operational. Install the Desktop app for full system access.`,
                sender: Sender.LUCA,
                timestamp: Date.now(),
              },
            ]);
          }
        }
      }
    };

    runDiagnostics();
  }, []); // Run once on mount

  // 3. CONNECTIVITY & IP DISCOVERY
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(apiUrl("/api/status"), {
          signal: AbortSignal.timeout(2000),
        });
        const data = await res.json();
        setIsLocalCoreConnected(true);
        if (data.cwd) setCurrentCwd(data.cwd);
        if (data.platform) setHostPlatform(data.platform);
        if (data.isProduction !== undefined)
          setIsKernelLocked(data.isProduction);
        if (data.opsecStatus) setOpsecStatus(data.opsecStatus);

        // Dynamic Recovery: If we booted in Cloud-Only mode but the backend just came online,
        // clear the flag so features re-enable on next render cycle
        if (isCloudOnly()) {
          clearCloudOnlyMode();
          console.log(
            "[BOOT] Local infrastructure detected! Exiting Cloud-Only mode.",
          );
        }
      } catch {
        setIsLocalCoreConnected(false);
      }
    };

    const interval = setInterval(check, isCloudOnly() ? 30000 : 5000); // Slower polling in Cloud-Only (recovery detection only)
    check();

    if (isElectron) {
      (window as any).electron.ipcRenderer
        .invoke("get-local-ip")
        .then(setLocalIp)
        .catch(() => setLocalIp("localhost"));
    }

    return () => clearInterval(interval);
  }, [isElectron, setCurrentCwd]);

  // 4. INITIAL ASYNC LOAD
  useEffect(() => {
    if (!isCloudOnly()) {
      memoryService.syncWithCore().then(setMemories);
    }
    setTasks(taskService.getTasks());
    setEvents(taskService.getEvents());
    const bg = localStorage.getItem("LUCA_BACKGROUND");
    if (bg) setBackgroundImage(bg);
  }, [setMemories, setTasks, setEvents, setBackgroundImage]);

  // 5. GOAL MANAGEMENT
  const fetchGoals = async (retryCount = 0) => {
    if (isCloudOnly()) return; // Skip in Cloud-Only mode
    try {
      await waitForAuth();
      const response = await fetch(apiUrl("/api/goals/list"));
      if (response.ok) {
        const data = await response.json();
        setGoals(Array.isArray(data) ? data : []);
      }
    } catch {
      if (retryCount < 3) {
        const delay = 1000 * Math.pow(2, retryCount);
        setTimeout(() => fetchGoals(retryCount + 1), delay);
      } else {
        setGoals([]);
      }
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const response = await fetch(apiUrl("/api/goals/delete"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: goalId }),
      });
      if (response.ok) {
        await fetchGoals();
        soundService.play("KEYSTROKE");
      }
    } catch (error) {
      console.error("[App] Failed to delete goal:", error);
    }
  };

  useEffect(() => {
    fetchGoals();
    const interval = setInterval(fetchGoals, 5000);
    return () => clearInterval(interval);
  }, []);

  // 6. IOT SYNC
  useEffect(() => {
    if (!Capacitor.isNativePlatform() && !isCloudOnly()) {
      import("../../services/iot/init").then(({ initIoT }) => initIoT());
    }
    const interval = setInterval(() => {
      // Mock sync for now as manager is commented out
      if (devices.length === 0) {
        // setDevices(...)
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [devices.length]);

  return {
    bootSequence,
    setBootSequence,
    biosStatus,
    isLocalCoreConnected,
    hostPlatform,
    isKernelLocked,
    localIp,
    appMode,
    fetchGoals,
    handleDeleteGoal,
  };
};
