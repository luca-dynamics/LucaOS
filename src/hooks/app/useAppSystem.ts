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
import {
  LUCA_BOOT_TIMEOUTS,
  bootPhaseNeedsDegradedRecovery,
  resolveBootDestination,
  runBootPhase,
  runNonBlockingBootPhase,
  withBootTimeout,
  type LucaBootPhaseRecord,
} from "../../services/runtime/lucaBootRuntimeGuard";

import { Message } from "../../types";
import { eventBus } from "../../services/eventBus";

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
  browserSafeInterface?: boolean;
}

export type BootSequence = "INIT" | "BIOS" | "KERNEL" | "ONBOARDING" | "READY";

export const useAppSystem = ({
  messages,
  isElectron,
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
  browserSafeInterface = false,
}: UseAppSystemProps) => {
  const [isLocalCoreConnected, setIsLocalCoreConnected] = useState(false);
  const [localCoreReadinessLevel, setLocalCoreReadinessLevel] = useState<
    "ready" | "limited" | "offline"
  >("offline");
  const [localCoreReadinessReason, setLocalCoreReadinessReason] = useState(
    "Local core is offline.",
  );
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
    if (browserSafeInterface) {
      setAppMode("dashboard");
      setBootSequence("READY");
      document.body.style.backgroundColor = "";
      return;
    }

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
    if (browserSafeInterface) {
      hasInitializedRef.current = true;
      setBiosStatus({
        server: "API REQUIRED",
        core: "DESKTOP REQUIRED",
        vision: "DISABLED IN WEB",
        audio: "DISABLED IN WEB",
        ollama: "DESKTOP REQUIRED",
      });
      setBootSequence("READY");
      return;
    }

    // Prevent re-running if already initialized or ready
    if (
      hasInitializedRef.current ||
      Capacitor.isNativePlatform() ||
      bootSequence === "READY"
    )
      return;

    const runDiagnostics = async () => {
      hasInitializedRef.current = true; // Mark as running/ran
      const bootTrace: LucaBootPhaseRecord[] = [];

      const recordPhase = <TValue>(record: LucaBootPhaseRecord<TValue>) => {
        bootTrace.push(record as LucaBootPhaseRecord);
        if (bootPhaseNeedsDegradedRecovery(record as LucaBootPhaseRecord)) {
          console.warn("[BOOT] Phase degraded:", record);
        }
        return record;
      };

      const resolveDestination = () =>
        resolveBootDestination({
          setupComplete: settingsService.get("general").setupComplete,
          degraded: bootTrace.some(bootPhaseNeedsDegradedRecovery),
        });

      const recoverToDestination = (reason: string) => {
        const destination = resolveDestination();
        console.warn(`[BOOT] Recovery routing to ${destination}: ${reason}`);
        if (destination === "READY") {
          sessionStorage.setItem("LUCA_HAS_BOOTED", "true");
        }
        setBootSequence(destination);
      };

      const bootResult = await withBootTimeout(
        async () => {
          const isFastReboot =
            sessionStorage.getItem("LUCA_HAS_BOOTED") === "true";

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
            const securityRecord = await runBootPhase({
              phaseId: "electron-security-handshake",
              label: "Electron security handshake",
              timeoutMs: LUCA_BOOT_TIMEOUTS.safetyInitMs,
              run: async () => {
                const token = await (window as any).luca.getSecureToken();
                const { setLucaAuthToken } = await import("../../config/api");
                setLucaAuthToken(token || ""); // Unblock with empty if null
                console.log("[BOOT] Security Handshake Complete.");

                // Initialize services that require authentication
                const { lucaService } =
                  await import("../../services/lucaService");
                lucaService.initializeAuthenticatedServices();
                return true;
              },
              degradeOnFailure: true,
              degradedReason:
                "Electron security handshake failed or timed out; auth waiters were unblocked.",
            });
            recordPhase(securityRecord);

            if (securityRecord.status !== "passed") {
              const { setLucaAuthToken } = await import("../../config/api");
              setLucaAuthToken("");
            }
          }

          let criticalPassed = true;

          if (!isFastReboot) {
            const check = async (
              name: string,
              fn: () => Promise<boolean>,
              key: string,
              timeoutMs: number,
              blocking = true,
            ) => {
              setBiosStatus((p: any) => ({ ...p, [key]: "PENDING" }));
              console.log(`[BIOS] Starting check for: ${name}`);

              // Determine retries based on environment. Public hosted contexts get one quick try.
              const isPublicHosted =
                typeof window !== "undefined" &&
                !window.location.hostname.includes("localhost") &&
                !window.location.hostname.includes("127.0.0.1") &&
                !isElectron;

              const maxRetries = isPublicHosted ? 1 : 3;

              const record = await runBootPhase({
                phaseId: `bios-${key}`,
                label: `${name} readiness`,
                timeoutMs,
                blocking,
                run: async () => {
                  for (let i = 0; i < maxRetries; i++) {
                    try {
                      if (await fn()) {
                        console.log(`[BIOS] Check PASSED for: ${name}`);
                        return true;
                      }
                      if (maxRetries > 1 && i < maxRetries - 1) {
                        console.log(
                          `[BIOS] Check attempt ${i + 1} failed for ${name}... retrying`,
                        );
                        await new Promise((r) => setTimeout(r, 750));
                      }
                    } catch (e: any) {
                      console.warn(
                        `[BIOS] Check error for ${name}:`,
                        e.message || e,
                      );
                    }
                  }
                  return false;
                },
                degradeOnFailure: !blocking,
                degradedReason: `${name} readiness did not complete cleanly.`,
              });

              recordPhase(record);
              const ok = record.status === "passed" && record.value === true;
              setBiosStatus((p: any) => ({ ...p, [key]: ok ? "OK" : "FAIL" }));
              if (!ok) {
                console.warn(`[BIOS] Check FAILED or TIMED OUT for: ${name}`);
              }
              return ok;
            };

            const { getAuthHeaders } = await import("../../config/api");

            const results = await Promise.all([
              runNonBlockingBootPhase({
                phaseId: "bios-memory-banks",
                label: "Memory bank preparation",
                timeoutMs: LUCA_BOOT_TIMEOUTS.memoryBanksMs,
                run: async () => {
                  await waitForAuth();
                  return true;
                },
                degradedReason:
                  "Memory bank preparation did not finish before BIOS continued.",
              }).then((record) => {
                recordPhase(record);
                return true;
              }),
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
                      signal: AbortSignal.timeout(8_000),
                    });
                    console.log(
                      "[DEBUG] Server health fetch complete. Status:",
                      resp.status,
                    );
                    const ok = resp.ok || resp.status === 401;
                    console.log("[DEBUG] Server health check result:", ok);
                    return ok;
                  } catch (e) {
                    console.error(
                      "[DEBUG] Server health fetch THREW ERROR:",
                      e,
                    );
                    return false;
                  }
                },
                "server",
                LUCA_BOOT_TIMEOUTS.serverHealthMs,
              ),
              check(
                "Core",
                async () => (await memoryService.getCortexStatus()).available,
                "core",
                LUCA_BOOT_TIMEOUTS.localBrainMs,
              ),
              runNonBlockingBootPhase({
                phaseId: "bios-vision",
                label: "Vision readiness",
                timeoutMs: LUCA_BOOT_TIMEOUTS.visionReadinessMs,
                run: async () => {
                  const devices =
                    await navigator.mediaDevices.enumerateDevices();
                  const cameras = devices.filter(
                    (d) => d.kind === "videoinput",
                  );
                  setBiosStatus((p: any) => ({
                    ...p,
                    vision: cameras.length > 0 ? "OK" : "FAIL",
                  }));
                  return cameras.length > 0;
                },
                degradedReason: "Vision readiness is unavailable or timed out.",
              }).then((record) => {
                recordPhase(record);
                if (record.status !== "passed") {
                  setBiosStatus((p: any) => ({ ...p, vision: "FAIL" }));
                  console.warn("[BOOT] Vision check failed (non-blocking)");
                }
                return true;
              }),
              check(
                "Audio",
                async () => {
                  // Basic check without stream to avoid permission loops
                  return !!(
                    navigator.mediaDevices &&
                    navigator.mediaDevices.getUserMedia
                  );
                },
                "audio",
                LUCA_BOOT_TIMEOUTS.voiceReadinessMs,
                false,
              ).then(() => true),
              runNonBlockingBootPhase({
                phaseId: "bios-ollama-local-models",
                label: "Ollama local model discovery",
                timeoutMs: LUCA_BOOT_TIMEOUTS.ollamaModelMs,
                run: async () => {
                  const resp = await fetch("http://127.0.0.1:11434/api/tags", {
                    signal: AbortSignal.timeout(
                      LUCA_BOOT_TIMEOUTS.ollamaModelMs,
                    ),
                  });
                  if (!resp.ok) return 0;
                  const data = await resp.json();
                  const count = data.models?.length || 0;
                  setBiosStatus((p: any) => ({
                    ...p,
                    ollama: `OK (${count} model${count !== 1 ? "s" : ""})`,
                  }));
                  return count;
                },
                degradedReason:
                  "Ollama local model discovery is unavailable or timed out.",
              }).then((record) => {
                recordPhase(record);
                if (record.status !== "passed") {
                  setBiosStatus((p: any) => ({ ...p, ollama: "NOT FOUND" }));
                }
                return true;
              }),
            ]);

            // Only Server and Core are critical — proceed even if Memory/Vision/Audio/Ollama degrade
            criticalPassed = results[1] && results[2];
          }

          if (criticalPassed) {
            console.log(
              "[BOOT] BIOS Critical Checks Passed. Loading Kernel...",
            );
            setBootSequence("KERNEL");

            const kernelResult = await withBootTimeout(
              async () => {
                const safetyRecord = await runBootPhase({
                  phaseId: "kernel-safety-service",
                  label: "Safety service initialization",
                  timeoutMs: LUCA_BOOT_TIMEOUTS.safetyInitMs,
                  run: () => import("../../services/safetyService"),
                  degradeOnFailure: true,
                  degradedReason:
                    "Safety service import failed or timed out during boot.",
                });
                recordPhase(safetyRecord);

                const synapseRecord = await runNonBlockingBootPhase({
                  phaseId: "kernel-synapse-start",
                  label: "Synapse start",
                  timeoutMs: LUCA_BOOT_TIMEOUTS.synapseStartMs,
                  run: () => memoryService.startSynapse(),
                  degradedReason: "Synapse start failed or timed out.",
                });
                recordPhase(synapseRecord);
                console.log("[BOOT] Safety Sentinel Enforced.");

                console.log("[BOOT] Restoring Tools...");
                const restoreRecord = await runNonBlockingBootPhase({
                  phaseId: "kernel-restore-tools",
                  label: "Restore tools",
                  timeoutMs: LUCA_BOOT_TIMEOUTS.restoreToolsMs,
                  run: restoreTools,
                  degradedReason:
                    "Tool restore failed or timed out during boot.",
                });
                recordPhase(restoreRecord);

                console.log(
                  "[BOOT] Tools restored or degraded. Scanning Introspection...",
                );
                const scanRecord = await runNonBlockingBootPhase({
                  phaseId: "kernel-introspection-scan",
                  label: "Introspection scan",
                  timeoutMs: LUCA_BOOT_TIMEOUTS.introspectionScanMs,
                  run: () => introspectionService.scan(),
                  degradedReason:
                    "Introspection scan failed or timed out during boot.",
                });
                recordPhase(scanRecord);

                const scannedHealth =
                  scanRecord.status === "passed" ? scanRecord.value : undefined;

                if (scannedHealth) {
                  console.log(
                    "[BOOT] Introspection done. Registering Sensation...",
                  );
                  const sensationRecord = await runNonBlockingBootPhase({
                    phaseId: "kernel-live-sensation",
                    label: "Live sensation registration",
                    timeoutMs: LUCA_BOOT_TIMEOUTS.liveSensationMs,
                    run: () => liveService.registerSensation(scannedHealth),
                    degradedReason:
                      "Live sensation registration failed or timed out during boot.",
                  });
                  recordPhase(sensationRecord);
                  console.log(
                    "[BOOT] Sensation registration complete or degraded.",
                  );
                }

                const isColdBoot =
                  sessionStorage.getItem("LUCA_HAS_BOOTED") !== "true";
                const profile = settingsService.get("general") as any;
                const currentUserName =
                  profile?.userName || profile?.name || "Commander";

                if (isColdBoot && !hasAnnouncedRef.current && scannedHealth) {
                  hasAnnouncedRef.current = true;
                  runNonBlockingBootPhase({
                    phaseId: "kernel-self-expression-announcement",
                    label: "Self-expression announcement",
                    timeoutMs: LUCA_BOOT_TIMEOUTS.selfExpressionMs,
                    run: () =>
                      selfExpressionService.announceStatus(
                        scannedHealth,
                        currentUserName,
                        messages.length > 0,
                      ),
                    degradedReason:
                      "Self-expression announcement failed or timed out.",
                  }).then(recordPhase);
                }

                console.log("[BOOT] KERNEL tasks complete. Transitioning...");
                const destination = resolveDestination();
                console.log("[BOOT] Setup destination:", destination);
                if (destination === "READY") {
                  console.log("[BOOT] System READY.");
                  sessionStorage.setItem("LUCA_HAS_BOOTED", "true");

                  // GENESIS HANDSHAKE: Signal Hologram and Phoenix Supervisor
                  if (isElectron) {
                    console.log("[BOOT] 🌌 Initiating Genesis Handshake...");

                    runNonBlockingBootPhase({
                      phaseId: "kernel-environment-awareness",
                      label: "Environment awareness refresh",
                      timeoutMs: LUCA_BOOT_TIMEOUTS.environmentAwarenessMs,
                      run: async () => {
                        const { environmentSentinel } =
                          await import("../../services/environmentSentinel");
                        await environmentSentinel.refreshAwareness();
                        console.log(
                          "[BOOT] 🏛️ Physical Body Synthesized. Kernel awareness active.",
                        );
                      },
                      degradedReason:
                        "Environment awareness refresh failed or timed out.",
                    }).then(recordPhase);

                    eventBus.emit("genesis-start");

                    runNonBlockingBootPhase({
                      phaseId: "kernel-phoenix-ready",
                      label: "Phoenix ready signal",
                      timeoutMs: LUCA_BOOT_TIMEOUTS.phoenixReadyMs,
                      run: () =>
                        fetch("http://localhost:3444/phoenix/ready", {
                          method: "POST",
                          signal: AbortSignal.timeout(
                            LUCA_BOOT_TIMEOUTS.phoenixReadyMs,
                          ),
                        }),
                      degradedReason:
                        "Phoenix receiver was not found or timed out; Genesis proceeded local-only.",
                    }).then((record) => {
                      recordPhase(record);
                      if (record.status !== "passed") {
                        console.warn(
                          "[BOOT] Phoenix Receiver not found or timed out. Genesis proceeding in local-only mode.",
                        );
                      }
                    });
                  }
                } else {
                  console.log("[BOOT] Entering Onboarding...");
                }

                setBootSequence(destination);
                return destination;
              },
              LUCA_BOOT_TIMEOUTS.kernelWatchdogMs,
              "Kernel boot watchdog",
            );

            if (kernelResult.status !== "passed") {
              recoverToDestination(
                kernelResult.errorSummary || "Kernel watchdog recovered boot.",
              );
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
            const restoreRecord = await runNonBlockingBootPhase({
              phaseId: "cloud-only-restore-tools",
              label: "Cloud-only restore tools",
              timeoutMs: LUCA_BOOT_TIMEOUTS.restoreToolsMs,
              run: restoreTools,
              degradedReason:
                "Tool restore failed or timed out in cloud-only mode.",
            });
            recordPhase(restoreRecord);

            const destination = resolveDestination();
            if (destination === "ONBOARDING") {
              console.log("[BOOT] Cloud-Only → Entering Onboarding...");
            } else {
              console.log("[BOOT] Cloud-Only → System READY (degraded).");
              sessionStorage.setItem("LUCA_HAS_BOOTED", "true");

              if (messages.length === 0) {
                // Cloud-mode greeting now handled by ChatPanel Omni-Center UI
              }
            }
            setBootSequence(destination);
          }
        },
        LUCA_BOOT_TIMEOUTS.totalBootWatchdogMs,
        "Total boot watchdog",
      );

      if (bootResult.status !== "passed") {
        recoverToDestination(
          bootResult.errorSummary || "Total boot watchdog recovered startup.",
        );
      }
    };

    runDiagnostics();
  }, [browserSafeInterface]); // Run once on mount, or resolve browser-safe web shell

  // 3. CONNECTIVITY & IP DISCOVERY
  useEffect(() => {
    if (browserSafeInterface) {
      setIsLocalCoreConnected(false);
      setLocalCoreReadinessLevel("offline");
      setLocalCoreReadinessReason(
        "Browser-safe web interface: runtime actions require LucaOS Desktop or a future authenticated API.",
      );
      setHostPlatform((current) => `${current} · Browser-safe web`);
      setLocalIp("desktop-required");
      return;
    }

    const check = async () => {
      try {
        const res = await fetch(apiUrl("/api/status"), {
          signal: AbortSignal.timeout(2000),
        });
        if (!res.ok) {
          setIsLocalCoreConnected(false);
          setLocalCoreReadinessLevel("offline");
          setLocalCoreReadinessReason("Local API gateway is unavailable.");
          return;
        }
        const data = await res.json();
        if (data.cwd) setCurrentCwd(data.cwd);
        if (data.platform) setHostPlatform(data.platform);
        if (data.isProduction !== undefined)
          setIsKernelLocked(data.isProduction);
        if (data.opsecStatus) setOpsecStatus(data.opsecStatus);

        const health = await introspectionService.scan();
        const readiness = introspectionService.getLocalCoreReadiness(health);
        setIsLocalCoreConnected(readiness.ready);
        setLocalCoreReadinessLevel(readiness.level);
        setLocalCoreReadinessReason(readiness.reason);

        if (!readiness.ready) {
          console.warn("[BOOT] Local core not ready:", readiness.reason);
          return;
        }

        // Dynamic Recovery: If we booted in Cloud-Only mode but the backend just came online,
        // clear the flag so features re-enable on next render cycle
        if (isCloudOnly()) {
          clearCloudOnlyMode();
          console.log(
            "[BOOT] Local infrastructure detected! Exiting Cloud-Only mode.",
          );
        }
      } catch (error) {
        console.warn("[BOOT] Local core readiness check failed:", error);
        setIsLocalCoreConnected(false);
        setLocalCoreReadinessLevel("offline");
        setLocalCoreReadinessReason("Local core readiness probe failed.");
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
  }, [browserSafeInterface, isElectron, setCurrentCwd]);

  // 4. INITIAL ASYNC LOAD
  useEffect(() => {
    setTasks(taskService.getTasks());
    setEvents(taskService.getEvents());
    const bg = localStorage.getItem("LUCA_BACKGROUND");
    if (bg) setBackgroundImage(bg);
  }, [setTasks, setEvents, setBackgroundImage]);

  // 4b. MEMORY EVENT LISTENER
  useEffect(() => {
    const handleMemorySync = (newMemories: any) => {
      setMemories(newMemories);
    };
    eventBus.on("memory:synced", handleMemorySync);
    return () => {
      eventBus.off("memory:synced", handleMemorySync);
    };
  }, [setMemories]);

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
    if (browserSafeInterface) {
      setGoals([]);
      return;
    }

    fetchGoals();
    const interval = setInterval(fetchGoals, 5000);
    return () => clearInterval(interval);
  }, [browserSafeInterface]);

  // 6. IOT SYNC
  useEffect(() => {
    if (browserSafeInterface) {
      return;
    }

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
    localCoreReadinessLevel,
    localCoreReadinessReason,
    hostPlatform,
    isKernelLocked,
    localIp,
    appMode,
    fetchGoals,
    handleDeleteGoal,
  };
};
