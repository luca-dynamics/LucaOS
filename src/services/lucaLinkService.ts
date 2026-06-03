/**
 * Luca Link Service
 *
 * Manages Socket.IO connections to the relay server for multi-host LucaLink mesh communication.
 * Coordinates Primary Host, companion, display, guest, sensor, electronics, and embodied host messaging
 * using the Socket.IO protocol expected by the relay server.
 */

import { io, Socket } from "socket.io-client";
import { settingsService } from "./settingsService";
import { cortexUrl, RELAY_SERVER_URL } from "../config/api";
import { sessionManager } from "./lucaLink/sessionManager";
import { CryptoService } from "./lucaLink/crypto";
import type { EncryptedMessage } from "./lucaLink/types";
import { legacyDevicesToManifests } from "./lucaLink/lucaLinkLegacyAdapter";
import {
  evaluateSoftEnforcementForLegacyEvent,
  type LucaLinkSoftEnforcementMode,
  type LucaLinkSoftEnforcementOptions,
  type LucaLinkSoftEnforcementResult,
} from "./lucaLink/lucaLinkSoftEnforcement";
import {
  approveLucaLinkApprovalRequest,
  cancelLucaLinkApprovalRequest,
  clearLucaLinkApprovalQueue,
  createLucaLinkApprovalQueue,
  denyLucaLinkApprovalRequest,
  enqueueApprovalForSoftEnforcementResult,
  enqueueLucaLinkApprovalRequest,
  getLucaLinkApprovalRequest,
  getPendingLucaLinkApprovalRequests,
  listLucaLinkApprovalRequests,
  summarizeLucaLinkApprovalQueue,
  type LucaLinkApprovalDecisionInput,
  type LucaLinkApprovalMutationResult,
  type LucaLinkApprovalQueueState,
  type LucaLinkApprovalQueueSummary,
  type LucaLinkApprovalRequest,
} from "./lucaLink/lucaLinkApprovalQueue";
import {
  consumePreparedLucaLinkContinuation,
  evaluateLucaLinkContinuationBridge,
  prepareLucaLinkSafeContinuation,
  type LucaLinkContinuationBridgeInput,
  type LucaLinkContinuationBridgeResult,
} from "./lucaLink/lucaLinkContinuationBridge";
import {
  cancelLucaLinkContinuationToken,
  clearLucaLinkContinuationRegistry,
  consumeLucaLinkContinuationToken,
  createLucaLinkContinuationRegistry,
  expireLucaLinkContinuationTokens,
  getValidLucaLinkContinuationTokens,
  listLucaLinkContinuationTokens,
  registerContinuationFromApprovalRequest,
  summarizeLucaLinkContinuationRegistry,
  validateLucaLinkContinuationToken,
  type LucaLinkContinuationMutationResult,
  type LucaLinkContinuationRegistryState,
  type LucaLinkContinuationRegistrySummary,
  type LucaLinkContinuationToken,
  type LucaLinkContinuationValidationContext,
  type LucaLinkContinuationValidationResult,
} from "./lucaLink/lucaLinkContinuation";
import {
  clearLucaLinkShadowObservations,
  createLucaLinkRuntimeShadow,
  getLucaLinkShadowObservations,
  recordLucaLinkShadowObservation,
  summarizeLucaLinkShadowObservations,
  type LucaLinkRuntimeShadowEventInput,
  type LucaLinkRuntimeShadowOptions,
  type LucaLinkRuntimeShadowState,
} from "./lucaLink/lucaLinkRuntimeShadow";
import type { LucaHostManifest } from "./lucaLink/lucaHostManifest";
import type {
  LucaLinkRuntimeObservation,
  LucaLinkRuntimeObservationSummary,
} from "./lucaLink/lucaLinkRuntimeObserver";
import {
  createLucaLinkGuestSession,
  evaluateLucaLinkGuestInbound,
  isGuestAuthPayload,
  markGuestSessionActive,
  markGuestSessionAuthChallenge,
  markGuestSessionAuthenticated,
  markGuestSessionDisconnected,
  summarizeLucaLinkGuestSessions,
  type LucaLinkGuestInboundInput,
  type LucaLinkGuestInboundResult,
  type LucaLinkGuestSessionRecord,
  type LucaLinkGuestSessionSummary,
} from "./lucaLink/lucaLinkGuestSessionPolicy";

import {
  blockTrustedDevice,
  clearDeviceTrustAudit,
  createLucaLinkDeviceTrustRegistry,
  getDeviceTrustAudit,
  listActiveTrustedDevices,
  listTrustedDevices,
  markTrustedDeviceConnected,
  markTrustedDeviceDisconnected,
  renameTrustedDevice,
  revokeTrustedDevice,
  setTrustedDeviceTrustLevel,
  summarizeDeviceTrustRegistry,
  unblockTrustedDevice,
  upsertTrustedDevice,
  type LucaLinkDeviceTrustLevel,
  type LucaLinkDeviceTrustMutationOptions,
  type LucaLinkDeviceTrustMutationResult,
  type LucaLinkDeviceTrustRegistryState,
} from "./lucaLink/lucaLinkDeviceTrustRegistry";

import {
  approveLucaLinkHandoff,
  cancelLucaLinkHandoff,
  clearLucaLinkHandoffRegistry,
  createArtifactHandoffPayload,
  createConversationHandoffPayload,
  createLucaLinkHandoffPayloadPreview,
  createLucaLinkHandoffRegistry,
  createLucaLinkHandoffRequest,
  createMemoryIntentHandoffPayload,
  createMissionHandoffPayload,
  createModelContextHandoffPayload,
  createSettingsContextHandoffPayload,
  declineLucaLinkHandoff,
  evaluateLucaLinkHandoffPolicy,
  getLucaLinkHandoff,
  listLucaLinkHandoffs,
  listPendingLucaLinkHandoffs,
  markLucaLinkHandoffAccepted,
  registerLucaLinkHandoff,
  summarizeLucaLinkHandoffRegistry,
  type LucaLinkHandoffKind,
  type LucaLinkHandoffMutationResult,
  type LucaLinkHandoffRegistryState,
  type LucaLinkHandoffRegistrySummary,
  type LucaLinkHandoffRequest,
  type LucaLinkHandoffRequestInput,
} from "./lucaLink/lucaLinkHandoff";

import {
  clearLucaLinkHostConnectionRegistry,
  createLucaLinkHostConnectionRecord,
  createLucaLinkHostConnectionRegistry,
  listLucaLinkHostConnections,
  summarizeLucaLinkHostConnectionRegistry,
  upsertLucaLinkHostConnection,
  type LucaLinkHostConnectionInput,
  type LucaLinkHostConnectionRecord,
  type LucaLinkHostConnectionRegistryState,
  type LucaLinkHostConnectionRegistrySummary,
} from "./lucaLink/lucaLinkHostConnectionModel";
import {
  createLucaLinkHostBridgeBlueprint,
  createLucaLinkHostConnectionDiagnosis,
  planLucaLinkHostBridgeStrategies,
  type LucaLinkHostBridgeBlueprint,
  type LucaLinkHostBridgeStrategyKind,
  type LucaLinkHostBridgeStrategyPlan,
  type LucaLinkHostConnectionDiagnosis,
  type LucaLinkHostDiagnosisInput,
} from "./lucaLink/lucaLinkHostAdaptation";

import {
  deriveLucaLinkApprovalSurface,
  evaluateLucaLinkApprovalSurfaceForRequest,
  rankEligibleApprovalSurfaces,
  summarizeLucaLinkApprovalSurfaces,
  type LucaLinkApprovalSurfaceEvaluation,
  type LucaLinkApprovalSurfaceRecord,
  type LucaLinkApprovalSurfaceSummary,
} from "./lucaLink/lucaLinkMultiHostApproval";
import {
  approveBridgeReviewForSandbox as approveLucaLinkBridgeReviewForSandboxModel,
  cancelBridgeReview as cancelLucaLinkBridgeReviewModel,
  createLucaLinkBridgeReviewRecord,
  createLucaLinkBridgeReviewRegistry,
  getBridgeReview,
  listBridgeReviews,
  registerBridgeReview,
  rejectBridgeReview as rejectLucaLinkBridgeReviewModel,
  summarizeBridgeReviews,
  updateBridgeReview,
  type LucaLinkBridgeReviewRecord,
  type LucaLinkBridgeReviewRegistry,
  type LucaLinkBridgeReviewSummary,
} from "./lucaLink/lucaLinkBridgeReview";
import {
  createAdapterDraftFromBlueprint as createLucaLinkAdapterDraftFromBlueprintModel,
  createAdapterDraftFromBridgeReview as createLucaLinkAdapterDraftFromBridgeReviewModel,
  createLucaLinkAdapterDraftRegistry,
  listAdapterDrafts,
  registerAdapterDraft,
  summarizeAdapterDrafts,
  updateAdapterDraft,
  type LucaLinkAdapterDraft,
  type LucaLinkAdapterDraftRegistry,
  type LucaLinkAdapterDraftSummary,
} from "./lucaLink/lucaLinkAdapterDrafts";
import {
  deriveEmbodiedHostCapabilityEnvelope,
  type LucaLinkEmbodiedCapabilityEnvelope,
} from "./lucaLink/lucaLinkEmbodiedHostPolicy";

import {
  createLucaLinkRuntimeEnforcementAuditRecord,
  evaluateLucaLinkRuntimeEnforcement,
  summarizeLucaLinkRuntimeEnforcementAudit,
  type LucaLinkRuntimeEnforcementAuditRecord,
  type LucaLinkRuntimeEnforcementAuditSummary,
  type LucaLinkRuntimeEnforcementInput,
  type LucaLinkRuntimeEnforcementMode,
  type LucaLinkRuntimeEnforcementResult,
} from "./lucaLink/lucaLinkRuntimeEnforcementGate";

// Types
export interface LucaLinkMessage {
  id: string;
  type: string;
  source: string;
  target: string;
  timestamp: number;
  payload?: unknown;
  secure?: boolean; // Indicates if the payload is an EncryptedMessage
  sync?: {
    type: string;
    data: unknown;
  };
}

export interface LucaLinkDevice {
  deviceId: string;
  type: string;
  name: string;
  lastSeen: number;
}

export interface LucaLinkState {
  connected: boolean;
  deviceId: string | null;
  pairingToken: string | null;
  connectedDevices: LucaLinkDevice[];
  error: string | null;
}

type StateListener = (state: LucaLinkState) => void;
type MessageListener = (message: LucaLinkMessage) => void;

// Default relay server
const DEFAULT_RELAY_URL = RELAY_SERVER_URL || "https://lucaos.onrender.com";

class LucaLinkService {
  private socket: Socket | null = null;
  private state: LucaLinkState = {
    connected: false,
    deviceId: null,
    pairingToken: null,
    connectedDevices: [],
    error: null,
  };
  private stateListeners: Set<StateListener> = new Set();
  private messageListeners: Set<MessageListener> = new Set();
  private runtimeShadow: LucaLinkRuntimeShadowState =
    createLucaLinkRuntimeShadow({ enabled: false });
  private approvalQueue: LucaLinkApprovalQueueState =
    createLucaLinkApprovalQueue();
  private continuationRegistry: LucaLinkContinuationRegistryState =
    createLucaLinkContinuationRegistry();
  private deviceTrustRegistry: LucaLinkDeviceTrustRegistryState =
    createLucaLinkDeviceTrustRegistry();
  private handoffRegistry: LucaLinkHandoffRegistryState =
    createLucaLinkHandoffRegistry();
  private hostConnectionRegistry: LucaLinkHostConnectionRegistryState =
    createLucaLinkHostConnectionRegistry();
  private bridgeReviewRegistry: LucaLinkBridgeReviewRegistry =
    createLucaLinkBridgeReviewRegistry();
  private adapterDraftRegistry: LucaLinkAdapterDraftRegistry =
    createLucaLinkAdapterDraftRegistry();
  private softEnforcementOptions: LucaLinkSoftEnforcementOptions = {
    mode: "disabled",
  };
  private runtimeEnforcementMode: LucaLinkRuntimeEnforcementMode = "disabled";
  private runtimeEnforcementAudit: LucaLinkRuntimeEnforcementAuditRecord[] = [];
  private readonly runtimeEnforcementAuditLimit = 100;

  // Persistent storage keys
  private readonly DEVICE_ID_KEY = "luca_link_device_id";
  private readonly PAIRING_DATA_KEY = "luca_link_pairing_data";

  /**
   * Get or generate a persistent device ID
   * Stored in localStorage to survive reconnections
   */
  getOrCreateDeviceId(): string {
    // Check localStorage first
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = localStorage.getItem(this.DEVICE_ID_KEY);
      if (stored) {
        return stored;
      }
    }

    // Generate new ID
    const newId = this.generateDeviceId();

    // Persist it
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(this.DEVICE_ID_KEY, newId);
    }

    return newId;
  }

  /**
   * Generate a unique device ID (internal helper)
   */
  private generateDeviceId(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "luca-";
    for (let i = 0; i < 12; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  /**
   * Get the relay server URL from settings or default
   */
  private getRelayUrl(): string {
    const settings = settingsService.getSettings();
    const customUrl = settings.lucaLink?.relayServerUrl;
    if (customUrl && customUrl.trim()) {
      return customUrl.trim();
    }
    return DEFAULT_RELAY_URL;
  }

  /**
   * Generate a pairing token from the relay server
   */
  async generatePairingToken(): Promise<string> {
    const relayUrl = this.getRelayUrl();
    try {
      const response = await fetch(`${relayUrl}/api/pairing/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to generate token: ${response.statusText}`);
      }

      const data = await response.json();
      this.updateState({ pairingToken: data.token });
      return data.token;
    } catch (e) {
      console.error("[LucaLink] Failed to generate pairing token:", e);
      throw e;
    }
  }

  /**
   * Get local network IP from Cortex
   */
  private async getLocalIp(): Promise<string | null> {
    try {
      // Need to ask Cortex for its IP since we are just a JS client
      // Assuming Cortex is reachable at localhost:8000 from the Primary Host app
      // If we are strictly in React dev mode, this might hit the proxy
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
      const response = await fetch(cortexUrl("/api/remote-access/info"), {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        return data.ip || null;
      }
    } catch (e) {
      console.warn("[LucaLink] Failed to get local IP from Cortex:", e);
    }
    return null;
  }

  /**
   * Connect to the relay server (Primary Host room mode).
   */
  async createRoom(): Promise<string> {
    // Use PERSISTENT device ID to prevent session orphaning
    const deviceId = this.getOrCreateDeviceId();
    const token = await this.generatePairingToken();

    await this.connect(deviceId, "desktop", token);
    return token; // Return token for QR code
  }

  /**
   * Join with a pairing token (companion host mode)
   * Supports Hybrid Mode: Tries Local LAN first, then Relay
   */
  async joinWithToken(token: string, localUrl?: string): Promise<void> {
    // Use PERSISTENT device ID
    const deviceId = this.getOrCreateDeviceId();
    await this.connect(deviceId, "mobile", token, localUrl);

    // If connection was successful (no error thrown), PERSIST pairing data for auto-reconnect
    this.savePairingData(token, localUrl);
  }

  /**
   * Automatically attempt to reconnect to the last known Primary Host peer
   * Implementation: A "Race" strategy.
   * 1. Attempt connection to LAST KNOWN IP (if stored).
   * 2. Simultaneously start mDNS (ZeroConf) scanning for a fresh IP.
   */
  async autoConnect(): Promise<boolean> {
    if (this.state.connected) return true;

    const data = this.loadPairingData();
    if (!data || !data.token) {
      console.log("[LucaLink] No stored pairing data found for autoConnect.");
      return false;
    }

    console.log("[LucaLink] Auto-reconnecting via Race Strategy...");

    // Start background mDNS discovery (don't await)
    this.startZeroConfDiscovery(data.token);

    // Attempt connection to last known URL immediately
    try {
      await this.joinWithToken(data.token, data.localUrl);
      return true;
    } catch {
      console.warn(
        "[LucaLink] Sequential AutoConnect failed, waiting for mDNS...",
      );
      // We don't return false here yet; ZeroConf might still find it
      return false;
    }
  }

  /**
   * mDNS (ZeroConf) Discovery Logic
   * Continuously scans for _luca._tcp services and updates connectivity
   */
  private async startZeroConfDiscovery(token: string): Promise<void> {
    // Check if running on native platform
    if (
      typeof window === "undefined" ||
      !(window as any).Capacitor?.isNativePlatform?.()
    ) {
      return;
    }

    try {
      // @ts-expect-error - Module types might not be available in all IDE environments
      const { Zeroconf } = await import("capacitor-zeroconf");

      console.log("[LucaLink] Starting ZeroConf mDNS scanning...");

      // Stop any existing watch
      try {
        await Zeroconf.stopWatch({ type: "_luca._tcp", domain: "local." });
      } catch {
        // Ignore "not watching" errors
      }

      // Add listener for service discovery
      Zeroconf.addListener("discover", (service: any) => {
        console.log("[LucaLink] mDNS Service Discovered:", service.name);

        // Security check: Match the token stored in TXT records (if available)
        const discoveredToken = service.txt?.token;
        if (discoveredToken && discoveredToken !== token) {
          console.warn(
            "[LucaLink] Discovered service token mismatch. Ignoring.",
          );
          return;
        }

        // Get the best IP (IPv4 preferred)
        const ip = service.ipv4Addresses?.[0] || service.host;
        if (ip) {
          const freshLocalUrl = `http://${ip}:3003`;
          console.log(
            `[LucaLink] mDNS found Primary Host at ${freshLocalUrl}. Re-syncing...`,
          );

          // If not connected or IP changed, trigger a fresh connect
          if (
            !this.state.connected ||
            this.loadPairingData()?.localUrl !== freshLocalUrl
          ) {
            this.joinWithToken(token, freshLocalUrl).catch(() => {
              console.warn(
                "[LucaLink] Failed to connect to mDNS-discovered host",
              );
            });
          }
        }
      });

      // Start watching
      await Zeroconf.watch({ type: "_luca._tcp", domain: "local." });
    } catch {
      console.error("[LucaLink] ZeroConf discovery failed to start:");
    }
  }

  /**
   * Persistence Helpers
   */
  private savePairingData(token: string, localUrl?: string): void {
    if (typeof window === "undefined" || !window.localStorage) return;

    localStorage.setItem(
      this.PAIRING_DATA_KEY,
      JSON.stringify({
        token,
        localUrl,
        timestamp: Date.now(),
      }),
    );
  }

  private loadPairingData(): { token: string; localUrl?: string } | null {
    if (typeof window === "undefined" || !window.localStorage) return null;

    const stored = localStorage.getItem(this.PAIRING_DATA_KEY);
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  /**
   * Connect to the relay server using Socket.IO
   * Hybrid Mode: If localUrl is provided, tries to connect there first.
   */
  private async connect(
    deviceId: string,
    deviceType: "desktop" | "mobile",
    token: string,
    localUrl?: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Async IIFE to handle the hybrid check logic within the promise
      (async () => {
        this.disconnect(); // Clean up any existing connection

        const relayUrl = this.getRelayUrl();
        let targetUrl = relayUrl;
        let usingLocal = false;

        // --- HYBRID CONNECTION LOGIC ---
        if (localUrl && deviceType === "mobile") {
          console.log(
            `[LucaLink] Hybrid Mode: Attempting Local LAN connection to ${localUrl}...`,
          );
          try {
            // Quick check if local is reachable (timeout 2s)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            // We try to fetch the socket.io path just to see if it responds
            // Note: socket.io servers usually respond to /socket.io/ request
            const res = await fetch(
              `${localUrl}/mobile/socket.io/?EIO=4&transport=polling`,
              {
                signal: controller.signal,
              },
            );
            clearTimeout(timeoutId);

            if (!res.ok) {
              throw new Error(
                `Local server responded with status: ${res.status}`,
              );
            }

            // If we got here, Local is alive AND healthy!
            console.log(
              "[LucaLink] Local LAN detected! Switching to Local Mode. 🚀",
            );
            targetUrl = localUrl;
            usingLocal = true;
          } catch {
            console.log(
              "[LucaLink] Local LAN unreachable, falling back to Relay. ☁️",
            );
          }
        }

        console.log(
          `[LucaLink] Connecting to ${targetUrl} as ${deviceType} (${
            usingLocal ? "LAN" : "RELAY"
          })`,
        );

        this.socket = io(targetUrl, {
          path: usingLocal ? "/mobile/socket.io" : "/socket.io", // Local uses specific path, Relay uses root
          transports: ["polling", "websocket"],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          query: usingLocal
            ? { deviceId, clientType: deviceType, token }
            : undefined, // Local expects auth in query
        });

        this.socket.on("connect", () => {
          console.log("[LucaLink] Socket.IO connected, registering device...");

          // Register with the relay server
          this.socket?.emit("register", {
            deviceId,
            type: deviceType,
            name: `Luca ${deviceType === "desktop" ? "Desktop" : "Mobile"}`,
            token,
          });
        });

        this.socket.on("registered", (data) => {
          console.log("[LucaLink] Device registered:", data);

          this.updateState({
            connected: true,
            deviceId,
            pairingToken: token,
            error: null,
          });

          this.upsertDeviceTrustFromRuntimeDevice(
            {
              deviceId,
              type: deviceType,
              name: `Luca ${deviceType === "desktop" ? "Desktop" : "Mobile"}`,
              lastSeen: Date.now(),
            },
            true,
            "connected",
          );

          // Setup guest handlers for Primary Host room mode
          if (deviceType === "desktop") {
            this.setupGuestHandlers();
          }

          resolve();
        });

        this.socket.on("message", async (message: LucaLinkMessage) => {
          console.log("[LucaLink] Received message:", message.type);
          this.observeRuntimeEventForDiagnostics({
            eventName:
              message.type === "SENSOR_PULSE"
                ? "SENSOR_PULSE"
                : message.type === "sync"
                  ? "sync"
                  : "message",
            payload: message,
            sourceDeviceId: message.source,
            targetDeviceId: message.target,
          });

          // --- NEURAL HARDENING: Decrypt secure messages ---
          if (message.secure && message.payload) {
            try {
              const sessionData = await sessionManager.recoverSessionByDevice(
                message.source,
              );
              if (sessionData) {
                console.log(
                  `[LucaLink] 🔓 Unlocking Secure Packet from ${message.source}...`,
                );
                message.payload = await CryptoService.decryptSecureMessage(
                  message.payload as EncryptedMessage,
                  sessionData.sharedSecret,
                );

                // --- VISUAL FEEDBACK: Express Thinking on thought arrival ---
                import("./iot/CognitiveExpressor").then(
                  ({ cognitiveExpressor }) => {
                    cognitiveExpressor.expressThinking();
                  },
                );
              } else {
                console.warn(
                  `[LucaLink] ⚠️ Received secure message but no session found for ${message.source}`,
                );
                return; // Drop unverified secure message
              }
            } catch (e) {
              console.error(
                "[LucaLink] ❌ Neural Fracture: Failed to decrypt secure packet:",
                e,
              );
              return; // Drop corrupted packet
            }
          }

          // Handle registry sync
          if (message.type === "sync" && message.sync?.type === "registry") {
            const devices = message.sync.data as LucaLinkDevice[];
            this.syncDeviceTrustRegistryFromConnectedDevices(devices);
            this.updateState({ connectedDevices: devices });
            this.observeRuntimeEventForDiagnostics({
              eventName: "registry",
              payload: { type: "registry", devices },
              sourceDeviceId: message.source,
              targetDeviceId: message.target,
            });

            // --- MESH BOOT: Activate Consciousness Layer when mesh has 2+ devices ---
            // We boot lazily — only when there's actually a mesh to manage.
            if (devices.length >= 2) {
              import("./consciousnessLayer").then(({ consciousnessLayer }) => {
                if (consciousnessLayer.getStatus() === "DORMANT") {
                  console.log(
                    "[LucaLink] 🌌 Mesh detected. Booting Consciousness Layer...",
                  );
                  consciousnessLayer.boot().catch((e) => {
                    console.error("[LucaLink] Consciousness boot failed:", e);
                  });
                }
              });
            }
          }

          // Forward to message listeners
          this.messageListeners.forEach((listener) => listener(message));

          // --- SOVEREIGN AUTO-HYDRATION: Handle Mission Sync ---
          if (
            message.type === "sync" &&
            message.sync?.type === "mission" &&
            typeof message.sync.data === "string"
          ) {
            const goldEgg = message.sync.data;
            console.log(
              "[LucaLink] Received Mission Sync. Triggering Neural re-hydration...",
            );

            // We use dynamic import to avoid circular dependency with lucaService
            import("./lucaService").then(({ lucaService }) => {
              lucaService.importSovereignMission(goldEgg).catch((e) => {
                console.error("[TELEPORT] Auto-hydration failed:", e);
              });
            });
          }

          // --- MESH OBSERVATION: Handle Sensor Pulses (2050 Alien Tech) ---
          if (message.type === "SENSOR_PULSE" && message.payload) {
            import("./meshObservationService").then(
              ({ meshObservationService }) => {
                meshObservationService.registerNodePulse(
                  message.payload as any,
                );
              },
            );

            // --- COGNITIVE SHARDING: Feed health signals to the Living Brain ---
            import("./cognitiveShardingEngine").then(
              ({ cognitiveShardingEngine }) => {
                const pulse = message.payload as any;
                cognitiveShardingEngine.ingestHealthSignal({
                  deviceId: pulse.deviceId || message.source,
                  battery: pulse.payload?.battery ?? -1,
                  cpuLoad: pulse.payload?.cpuLoad ?? 30,
                  signalStrength: pulse.payload?.signalStrength ?? 70,
                  isActive: pulse.payload?.isActive ?? true,
                  npuAvailable: pulse.payload?.npuAvailable ?? false,
                  lastHeartbeat: Date.now(),
                });
              },
            );
          }
        });

        this.socket.on("error", (error: { message: string }) => {
          console.error("[LucaLink] Server error:", error.message);
          this.updateState({ error: error.message });
          reject(new Error(error.message));
        });

        this.socket.on("disconnect", (reason) => {
          console.log("[LucaLink] Disconnected:", reason);
          this.updateState({
            connected: false,
            connectedDevices: [],
          });
        });

        this.socket.on("connect_error", (error) => {
          console.error("[LucaLink] Connection error:", error);
          this.updateState({
            connected: false,
            error: `Connection failed: ${error.message}`,
          });
          reject(error);
        });
      })().catch(reject);
    });
  }

  /**
   * Send a message to a specific device or all devices
   */
  send(
    targetDeviceId: string | "all",
    type: string,
    payload: unknown,
  ): boolean {
    if (!this.socket || !this.state.connected || !this.state.deviceId) {
      console.warn("[LucaLink] Cannot send: not connected");
      return false;
    }

    const message: LucaLinkMessage = {
      id: this.generateDeviceId(),
      type,
      source: this.state.deviceId,
      target: targetDeviceId,
      timestamp: Date.now(),
      payload,
    };

    if (
      this.runtimeEnforcementMode !== "disabled" ||
      this.getSoftEnforcementMode() !== "disabled"
    ) {
      const runtimeEnforcement = this.evaluateRuntimeEnforcementForOutbound({
        scope: type === "sync" ? "outbound-sync" : "outbound-send",
        eventName:
          type === "SENSOR_PULSE"
            ? "SENSOR_PULSE"
            : type === "sync"
              ? "sync"
              : "message",
        payload: message,
        sourceDeviceId: message.source,
        targetDeviceId: message.target,
      });
      if (runtimeEnforcement.blocked) {
        console.warn(
          "[LucaLink] Runtime enforcement blocked outbound send:",
          runtimeEnforcement,
        );
        return false;
      }
    }

    this.observeRuntimeEventForDiagnostics({
      eventName:
        type === "SENSOR_PULSE"
          ? "SENSOR_PULSE"
          : type === "sync"
            ? "sync"
            : "message",
      payload: message,
      sourceDeviceId: message.source,
      targetDeviceId: message.target,
    });

    this.socket.emit("message", message);
    return true;
  }

  /**
   * Broadcast mission state for Live-Wire Synchronicity
   */
  syncMission(goldEgg: string): void {
    if (!this.socket || !this.state.connected) return;

    console.log("[LucaLink] Broadcasting Mission State (Live-Wire Sync)");
    const syncMessage: LucaLinkMessage = {
      id: this.generateDeviceId(),
      type: "sync",
      source: this.state.deviceId || "unknown",
      target: "all",
      timestamp: Date.now(),
      sync: {
        type: "mission",
        data: goldEgg,
      },
    };

    this.observeRuntimeEventForDiagnostics({
      eventName: "sync",
      payload: syncMessage,
      sourceDeviceId: syncMessage.source,
      targetDeviceId: syncMessage.target,
    });

    this.socket.emit("message", syncMessage);
  }

  /**
   * Disconnect from the relay
   */
  disconnect(): void {
    this.state.connectedDevices.forEach((device) => {
      markTrustedDeviceDisconnected(this.deviceTrustRegistry, device.deviceId);
    });
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.updateState({
      connected: false,
      deviceId: null,
      pairingToken: null,
      connectedDevices: [],
      error: null,
    });
  }

  /**
   * Get the pairing URL for QR code (includes relay URL + token + local URL)
   */
  async getPairingUrl(): Promise<string | null> {
    if (!this.state.pairingToken) return null;

    const relayUrl = this.getRelayUrl();
    const localIp = await this.getLocalIp();

    let url = `luca://pair?relay=${encodeURIComponent(relayUrl)}&token=${
      this.state.pairingToken
    }`;

    // Append Local URL if found (Port 3003 is the WS_PORT)
    if (localIp) {
      // Construct the full local URL
      // If IP is 192.168.1.10, local URL is http://192.168.1.10:3003
      const localUrl = `http://${localIp}:3003`;
      url += `&local=${encodeURIComponent(localUrl)}`;
    }

    return url;
  }

  /**
   * Parse a pairing URL (from QR scan)
   */
  static parsePairingUrl(
    url: string,
  ): { relay: string; token: string; local?: string } | null {
    try {
      // Handle both luca:// and https:// formats
      const urlObj = new URL(url.replace("luca://", "https://placeholder/"));
      const relay = urlObj.searchParams.get("relay");
      const token = urlObj.searchParams.get("token");
      const local = urlObj.searchParams.get("local");

      if (relay && token) {
        return {
          relay: decodeURIComponent(relay),
          token,
          local: local ? decodeURIComponent(local) : undefined,
        };
      }
    } catch (e) {
      console.error("[LucaLink] Failed to parse pairing URL:", e);
    }
    return null;
  }

  /**
   * Get current state
   */
  getState(): LucaLinkState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  /**
   * Subscribe to messages
   */
  onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  /**
   * Enable default-off LucaLink soft enforcement controls.
   * Disabled and observe-only modes never block runtime behavior.
   */
  enableSoftEnforcement(options: LucaLinkSoftEnforcementOptions = {}): void {
    this.softEnforcementOptions = {
      ...this.softEnforcementOptions,
      ...options,
      mode: options.mode ?? "observe-only",
    };
  }

  /**
   * Disable LucaLink soft enforcement and restore no-block behavior.
   */
  disableSoftEnforcement(): void {
    this.softEnforcementOptions = { mode: "disabled" };
  }

  getSoftEnforcementMode(): LucaLinkSoftEnforcementMode {
    return this.softEnforcementOptions.mode ?? "disabled";
  }

  enableRuntimeEnforcement(
    mode: LucaLinkRuntimeEnforcementMode = "observe-only",
  ): void {
    this.runtimeEnforcementMode = mode;
  }

  disableRuntimeEnforcement(): void {
    this.runtimeEnforcementMode = "disabled";
  }

  getRuntimeEnforcementMode(): LucaLinkRuntimeEnforcementMode {
    return this.runtimeEnforcementMode;
  }

  evaluateRuntimeEnforcement(
    input: LucaLinkRuntimeEnforcementInput,
  ): LucaLinkRuntimeEnforcementResult {
    return this.evaluateRuntimeEnforcementWithMode(
      input,
      this.runtimeEnforcementMode,
    );
  }

  private evaluateRuntimeEnforcementForOutbound(
    input: LucaLinkRuntimeEnforcementInput,
  ): LucaLinkRuntimeEnforcementResult {
    const effectiveMode: LucaLinkRuntimeEnforcementMode =
      this.runtimeEnforcementMode !== "disabled"
        ? this.runtimeEnforcementMode
        : this.getSoftEnforcementMode();
    return this.evaluateRuntimeEnforcementWithMode(input, effectiveMode);
  }

  private evaluateRuntimeEnforcementWithMode(
    input: LucaLinkRuntimeEnforcementInput,
    mode: LucaLinkRuntimeEnforcementMode,
  ): LucaLinkRuntimeEnforcementResult {
    const result = evaluateLucaLinkRuntimeEnforcement(input, {
      mode,
      candidates: this.getRuntimeShadowCandidateManifests(),
      queueApproval: (_gateResult, context) => {
        const softEnforcement = context.softEnforcement;
        if (!softEnforcement.requiresPrimaryHostApproval)
          return { warnings: [], errors: [] };
        const queued = this.queueApprovalForSoftEnforcementResult(
          softEnforcement,
          {
            eventName: input.eventName,
            requestedByDeviceId: input.sourceDeviceId,
            requestedTargetDeviceId: input.targetDeviceId,
            payload: input.payload,
          },
        );
        return {
          request: queued.request ? { id: queued.request.id } : undefined,
          warnings: queued.warnings,
          errors: queued.errors,
        };
      },
      evaluateContinuation: (tokenId, context) =>
        this.evaluateContinuationBridge(tokenId, {
          requestedByDeviceId: input.sourceDeviceId,
          requestedTargetDeviceId: input.targetDeviceId,
          permission: context.permission,
          lane: context.lane,
          eventName: input.eventName,
          now: input.now,
        }),
      prepareContinuation: (tokenId, context) =>
        this.prepareSafeContinuation(tokenId, {
          requestedByDeviceId: input.sourceDeviceId,
          requestedTargetDeviceId: input.targetDeviceId,
          permission: context.permission,
          lane: context.lane,
          eventName: input.eventName,
          now: input.now,
        }),
      allowSafeContinuation: true,
    });
    this.recordRuntimeEnforcementAudit(result);
    return result;
  }

  getRuntimeEnforcementAudit(): LucaLinkRuntimeEnforcementAuditRecord[] {
    return [...this.runtimeEnforcementAudit];
  }

  getRuntimeEnforcementSummary(): LucaLinkRuntimeEnforcementAuditSummary {
    return summarizeLucaLinkRuntimeEnforcementAudit(
      this.runtimeEnforcementAudit,
    );
  }

  clearRuntimeEnforcementAudit(): void {
    this.runtimeEnforcementAudit = [];
  }

  private recordRuntimeEnforcementAudit(
    result: LucaLinkRuntimeEnforcementResult,
  ): void {
    this.runtimeEnforcementAudit = [
      ...this.runtimeEnforcementAudit,
      createLucaLinkRuntimeEnforcementAuditRecord(result),
    ].slice(-this.runtimeEnforcementAuditLimit);
  }

  getHandoffs(): LucaLinkHandoffRequest[] {
    return listLucaLinkHandoffs(this.handoffRegistry);
  }

  getPendingHandoffs(): LucaLinkHandoffRequest[] {
    return listPendingLucaLinkHandoffs(this.handoffRegistry);
  }

  getHandoffSummary(): LucaLinkHandoffRegistrySummary {
    return summarizeLucaLinkHandoffRegistry(this.handoffRegistry);
  }

  clearHandoffs(): LucaLinkHandoffMutationResult {
    return clearLucaLinkHandoffRegistry(this.handoffRegistry);
  }

  private createAndRegisterHandoff(
    input: LucaLinkHandoffRequestInput,
  ): LucaLinkHandoffMutationResult {
    const preview =
      input.payloadPreview ??
      createLucaLinkHandoffPayloadPreview(input.payload, {
        kind: input.kind,
        summary: input.summary,
      });
    const targetDevice = input.targetDeviceId
      ? this.deviceTrustRegistry.devices.find(
          (device) => device.deviceId === input.targetDeviceId,
        )
      : undefined;
    const sourceDevice = input.sourceDeviceId
      ? this.deviceTrustRegistry.devices.find(
          (device) => device.deviceId === input.sourceDeviceId,
        )
      : undefined;
    const initialRequest = createLucaLinkHandoffRequest(
      {
        ...input,
        payloadPreview: preview,
      },
      { defaultTtlMs: this.handoffRegistry.defaultTtlMs },
    );
    const policy = evaluateLucaLinkHandoffPolicy({
      kind: initialRequest.kind,
      sourceDeviceId: initialRequest.sourceDeviceId,
      targetDeviceId: initialRequest.targetDeviceId,
      sourceDevice,
      targetDevice,
      risk: initialRequest.risk,
      payloadPreview: initialRequest.payloadPreview,
      requestedByDeviceId: initialRequest.requestedByDeviceId,
    });

    const request = createLucaLinkHandoffRequest(
      {
        ...initialRequest,
        status: policy.blocked
          ? "blocked"
          : policy.requiresPrimaryHostApproval
            ? "pending"
            : "draft",
        requiresPrimaryHostApproval: policy.requiresPrimaryHostApproval,
        warnings: [...initialRequest.warnings, ...policy.warnings],
        errors: [...initialRequest.errors, ...policy.errors],
        reason: policy.explain,
      },
      {
        now: initialRequest.createdAt,
        defaultTtlMs: this.handoffRegistry.defaultTtlMs,
      },
    );

    if (policy.requiresPrimaryHostApproval) {
      const queued = enqueueLucaLinkApprovalRequest(this.approvalQueue, {
        source: "manual",
        requestedByDeviceId: request.requestedByDeviceId,
        requestedTargetDeviceId: request.targetDeviceId,
        approvalHostId: this.state.deviceId ?? undefined,
        approvalHostRole: "primary",
        eventName: "lucalink-handoff",
        lane: request.kind === "memory-intent" ? "memory" : request.kind,
        permission: `handoff.${request.kind}`,
        risk: request.risk,
        title: `Approve ${request.kind.replace("-", " ")} handoff?`,
        summary: request.summary,
        reason:
          "Primary Host approval is required before this LucaLink handoff can move forward.",
        explain: policy.explain,
        payloadPreview: request.payloadPreview,
        envelopeId: request.id,
        envelopeType: "lucalink-handoff",
        warnings: request.warnings,
        errors: request.errors,
      });
      request.approvalRequestId = queued.request?.id;
    }

    return registerLucaLinkHandoff(this.handoffRegistry, request);
  }

  createConversationHandoff(
    input: Parameters<typeof createConversationHandoffPayload>[0] &
      Partial<LucaLinkHandoffRequestInput>,
  ): LucaLinkHandoffMutationResult {
    const payload = createConversationHandoffPayload(input);
    return this.createAndRegisterHandoff({
      ...input,
      kind: "conversation",
      title: input.title ?? input.conversationTitle ?? "Conversation handoff",
      summary:
        input.summary ??
        "Continue this conversation on another trusted LucaLink device.",
      payload,
    });
  }

  createMemoryIntentHandoff(
    input: Parameters<typeof createMemoryIntentHandoffPayload>[0] &
      Partial<LucaLinkHandoffRequestInput>,
  ): LucaLinkHandoffMutationResult {
    const payload = createMemoryIntentHandoffPayload(input);
    return this.createAndRegisterHandoff({
      ...input,
      kind: "memory-intent",
      title: input.title ?? "Memory intent handoff",
      summary:
        input.summary ??
        "Intent-only memory namespace continuation; no raw memory database is transferred.",
      payload,
      requiresPrimaryHostApproval: true,
    });
  }

  createMissionHandoff(
    input: Parameters<typeof createMissionHandoffPayload>[0] &
      Partial<LucaLinkHandoffRequestInput>,
  ): LucaLinkHandoffMutationResult {
    const payload = createMissionHandoffPayload(input);
    return this.createAndRegisterHandoff({
      ...input,
      kind: "mission",
      title: input.title ?? input.missionTitle ?? "Mission handoff",
      payload,
      requiresPrimaryHostApproval: true,
    });
  }

  createArtifactHandoff(
    input: Parameters<typeof createArtifactHandoffPayload>[0] &
      Partial<LucaLinkHandoffRequestInput>,
  ): LucaLinkHandoffMutationResult {
    const payload = createArtifactHandoffPayload(input);
    return this.createAndRegisterHandoff({
      ...input,
      kind: "artifact",
      title: input.title ?? "Artifact handoff",
      payload,
      requiresPrimaryHostApproval: true,
    });
  }

  createSettingsContextHandoff(
    input: Parameters<typeof createSettingsContextHandoffPayload>[0] &
      Partial<LucaLinkHandoffRequestInput>,
  ): LucaLinkHandoffMutationResult {
    const payload = createSettingsContextHandoffPayload(input);
    return this.createAndRegisterHandoff({
      ...input,
      kind: "settings-context",
      title: input.title ?? "Settings context handoff",
      payload,
    });
  }

  createModelContextHandoff(
    input: Parameters<typeof createModelContextHandoffPayload>[0] &
      Partial<LucaLinkHandoffRequestInput>,
  ): LucaLinkHandoffMutationResult {
    const payload = createModelContextHandoffPayload(input);
    return this.createAndRegisterHandoff({
      ...input,
      kind: "model-context",
      title: input.title ?? "Model context handoff",
      payload,
      requiresPrimaryHostApproval: true,
    });
  }

  approveHandoff(
    handoffId: string,
    options?: { now?: number; approvedByDeviceId?: string; reason?: string },
  ): LucaLinkHandoffMutationResult {
    return approveLucaLinkHandoff(this.handoffRegistry, handoffId, options);
  }

  declineHandoff(
    handoffId: string,
    options?: { now?: number; reason?: string },
  ): LucaLinkHandoffMutationResult {
    return declineLucaLinkHandoff(this.handoffRegistry, handoffId, options);
  }

  cancelHandoff(
    handoffId: string,
    options?: { now?: number; reason?: string },
  ): LucaLinkHandoffMutationResult {
    return cancelLucaLinkHandoff(this.handoffRegistry, handoffId, options);
  }

  markHandoffAccepted(
    handoffId: string,
    options?: { now?: number; reason?: string },
  ): LucaLinkHandoffMutationResult {
    return markLucaLinkHandoffAccepted(
      this.handoffRegistry,
      handoffId,
      options,
    );
  }

  getHandoff(handoffId: string): LucaLinkHandoffRequest | undefined {
    return getLucaLinkHandoff(this.handoffRegistry, handoffId);
  }

  getHandoffKinds(): LucaLinkHandoffKind[] {
    return [
      "conversation",
      "memory-intent",
      "mission",
      "artifact",
      "settings-context",
      "model-context",
    ];
  }

  getPendingApprovalRequests(): LucaLinkApprovalRequest[] {
    return getPendingLucaLinkApprovalRequests(this.approvalQueue);
  }

  getApprovalRequests(): LucaLinkApprovalRequest[] {
    return listLucaLinkApprovalRequests(this.approvalQueue);
  }

  getApprovalQueueSummary(): LucaLinkApprovalQueueSummary {
    return summarizeLucaLinkApprovalQueue(this.approvalQueue);
  }

  approveApprovalRequest(
    requestId: string,
    decision?: LucaLinkApprovalDecisionInput,
  ): LucaLinkApprovalMutationResult {
    return approveLucaLinkApprovalRequest(
      this.approvalQueue,
      requestId,
      decision,
    );
  }

  denyApprovalRequest(
    requestId: string,
    decision?: LucaLinkApprovalDecisionInput,
  ): LucaLinkApprovalMutationResult {
    return denyLucaLinkApprovalRequest(this.approvalQueue, requestId, decision);
  }

  cancelApprovalRequest(
    requestId: string,
    decision?: LucaLinkApprovalDecisionInput,
  ): LucaLinkApprovalMutationResult {
    return cancelLucaLinkApprovalRequest(
      this.approvalQueue,
      requestId,
      decision,
    );
  }

  clearApprovalQueue(): LucaLinkApprovalMutationResult {
    return clearLucaLinkApprovalQueue(this.approvalQueue);
  }

  getApprovalSurfaces(): LucaLinkApprovalSurfaceRecord[] {
    return this.getHostConnections({ refresh: true }).map((hostConnection) =>
      deriveLucaLinkApprovalSurface(hostConnection, {
        currentPrimaryHostId:
          this.state.deviceId ??
          this.hostConnectionRegistry.records.find(
            (record) => record.hostClass === "primary-host",
          )?.id,
      }),
    );
  }

  getApprovalSurfaceSummary(): LucaLinkApprovalSurfaceSummary {
    return summarizeLucaLinkApprovalSurfaces(this.getApprovalSurfaces());
  }

  evaluateApprovalSurfacesForRequest(
    requestId: string,
  ): LucaLinkApprovalSurfaceEvaluation[] {
    const request = getLucaLinkApprovalRequest(this.approvalQueue, requestId);
    return this.getApprovalSurfaces().map((surface) =>
      evaluateLucaLinkApprovalSurfaceForRequest(surface, request),
    );
  }

  rankApprovalSurfacesForRequest(
    requestId: string,
  ): LucaLinkApprovalSurfaceRecord[] {
    return rankEligibleApprovalSurfaces(
      this.getApprovalSurfaces(),
      getLucaLinkApprovalRequest(this.approvalQueue, requestId),
    );
  }

  createApprovalSurfacePreviewForRequest(requestId: string): {
    request?: LucaLinkApprovalRequest;
    surfaces: LucaLinkApprovalSurfaceRecord[];
    evaluations: LucaLinkApprovalSurfaceEvaluation[];
    summary: LucaLinkApprovalSurfaceSummary;
  } {
    const request = getLucaLinkApprovalRequest(this.approvalQueue, requestId);
    const surfaces = this.getApprovalSurfaces();
    return {
      request,
      surfaces,
      evaluations: surfaces.map((surface) =>
        evaluateLucaLinkApprovalSurfaceForRequest(surface, request),
      ),
      summary: summarizeLucaLinkApprovalSurfaces(surfaces),
    };
  }

  getBridgeReviews(): LucaLinkBridgeReviewRecord[] {
    return listBridgeReviews(this.bridgeReviewRegistry);
  }

  getBridgeReviewSummary(): LucaLinkBridgeReviewSummary {
    return summarizeBridgeReviews(this.getBridgeReviews());
  }

  createBridgeReviewFromBlueprint(
    input: Partial<LucaLinkHostBridgeBlueprint>,
  ): LucaLinkBridgeReviewRecord {
    return registerBridgeReview(
      this.bridgeReviewRegistry,
      createLucaLinkBridgeReviewRecord(input),
    );
  }

  approveBridgeReviewForSandbox(
    reviewId: string,
    options?: { approvedByDeviceId?: string; now?: number },
  ): LucaLinkBridgeReviewRecord | undefined {
    const review = getBridgeReview(this.bridgeReviewRegistry, reviewId);
    if (!review) return undefined;
    return updateBridgeReview(
      this.bridgeReviewRegistry,
      approveLucaLinkBridgeReviewForSandboxModel(review, options),
    );
  }

  rejectBridgeReview(
    reviewId: string,
    options?: { reason?: string; now?: number },
  ): LucaLinkBridgeReviewRecord | undefined {
    const review = getBridgeReview(this.bridgeReviewRegistry, reviewId);
    if (!review) return undefined;
    return updateBridgeReview(
      this.bridgeReviewRegistry,
      rejectLucaLinkBridgeReviewModel(review, options),
    );
  }

  cancelBridgeReview(
    reviewId: string,
    options?: { reason?: string; now?: number },
  ): LucaLinkBridgeReviewRecord | undefined {
    const review = getBridgeReview(this.bridgeReviewRegistry, reviewId);
    if (!review) return undefined;
    return updateBridgeReview(
      this.bridgeReviewRegistry,
      cancelLucaLinkBridgeReviewModel(review, options),
    );
  }

  getEmbodiedHostCapabilityEnvelopes(): LucaLinkEmbodiedCapabilityEnvelope[] {
    return this.getHostConnections({ refresh: true }).map((hostConnection) =>
      deriveEmbodiedHostCapabilityEnvelope(hostConnection),
    );
  }

  getAdapterDrafts(): LucaLinkAdapterDraft[] {
    return listAdapterDrafts(this.adapterDraftRegistry);
  }

  getAdapterDraftSummary(): LucaLinkAdapterDraftSummary {
    return summarizeAdapterDrafts(this.getAdapterDrafts());
  }

  createAdapterDraftFromBlueprint(
    input: Partial<LucaLinkHostBridgeBlueprint>,
  ): LucaLinkAdapterDraft {
    return registerAdapterDraft(
      this.adapterDraftRegistry,
      createLucaLinkAdapterDraftFromBlueprintModel(input),
    );
  }

  createAdapterDraftFromBridgeReview(
    reviewId: string,
  ): LucaLinkAdapterDraft | undefined {
    const review = getBridgeReview(this.bridgeReviewRegistry, reviewId);
    if (!review) return undefined;
    return registerAdapterDraft(
      this.adapterDraftRegistry,
      createLucaLinkAdapterDraftFromBridgeReviewModel(review),
    );
  }

  cancelAdapterDraft(draftId: string): LucaLinkAdapterDraft | undefined {
    const draft = this.adapterDraftRegistry.records.find(
      (record) => record.id === draftId,
    );
    if (!draft) return undefined;
    return updateAdapterDraft(this.adapterDraftRegistry, {
      ...draft,
      status: "cancelled",
      updatedAt: Date.now(),
    });
  }

  clearAdapterDrafts(): void {
    this.adapterDraftRegistry.records = [];
  }

  getContinuationTokens(): LucaLinkContinuationToken[] {
    return listLucaLinkContinuationTokens(this.continuationRegistry);
  }

  getValidContinuationTokens(): LucaLinkContinuationToken[] {
    return getValidLucaLinkContinuationTokens(this.continuationRegistry);
  }

  getContinuationRegistrySummary(): LucaLinkContinuationRegistrySummary {
    return summarizeLucaLinkContinuationRegistry(this.continuationRegistry);
  }

  clearContinuationRegistry(): LucaLinkContinuationMutationResult {
    return clearLucaLinkContinuationRegistry(this.continuationRegistry);
  }

  createContinuationFromApprovalRequest(
    requestId: string,
  ): LucaLinkContinuationMutationResult {
    const request = getLucaLinkApprovalRequest(this.approvalQueue, requestId);
    if (!request) {
      return {
        valid: false,
        warnings: [`Unknown LucaLink approval request id: ${requestId}`],
        errors: [],
      };
    }

    return registerContinuationFromApprovalRequest(
      this.continuationRegistry,
      request,
    );
  }

  validateContinuationToken(
    tokenId: string,
    context?: LucaLinkContinuationValidationContext,
  ): LucaLinkContinuationValidationResult {
    return validateLucaLinkContinuationToken(
      this.continuationRegistry,
      tokenId,
      context,
    );
  }

  consumeContinuationToken(
    tokenId: string,
    context?: LucaLinkContinuationValidationContext & {
      consumedByDeviceId?: string;
      reason?: string;
    },
  ): LucaLinkContinuationMutationResult {
    return consumeLucaLinkContinuationToken(
      this.continuationRegistry,
      tokenId,
      context,
    );
  }

  cancelContinuationToken(
    tokenId: string,
    reason?: string,
  ): LucaLinkContinuationMutationResult {
    return cancelLucaLinkContinuationToken(this.continuationRegistry, tokenId, {
      reason,
    });
  }

  evaluateContinuationBridge(
    tokenId: string,
    context: Omit<LucaLinkContinuationBridgeInput, "tokenId"> = {},
  ): LucaLinkContinuationBridgeResult {
    return evaluateLucaLinkContinuationBridge(this.continuationRegistry, {
      ...context,
      tokenId,
    });
  }

  prepareSafeContinuation(
    tokenId: string,
    context: Omit<LucaLinkContinuationBridgeInput, "tokenId"> = {},
  ): LucaLinkContinuationBridgeResult {
    return prepareLucaLinkSafeContinuation(this.continuationRegistry, {
      ...context,
      tokenId,
    });
  }

  consumePreparedContinuation(
    tokenId: string,
    context: Omit<LucaLinkContinuationBridgeInput, "tokenId"> & {
      consumedByDeviceId?: string;
      reason?: string;
    } = {},
  ): LucaLinkContinuationBridgeResult {
    const prepared = prepareLucaLinkSafeContinuation(
      this.continuationRegistry,
      {
        ...context,
        tokenId,
      },
    );

    if (!prepared.preparedAction) return prepared;

    return consumePreparedLucaLinkContinuation(
      this.continuationRegistry,
      prepared.preparedAction,
      context,
    );
  }

  expireContinuationTokens(now?: number): LucaLinkContinuationMutationResult {
    return expireLucaLinkContinuationTokens(this.continuationRegistry, now);
  }

  queueApprovalForSoftEnforcementResult(
    result: LucaLinkSoftEnforcementResult,
    context: {
      eventName?: string;
      requestedByDeviceId?: string;
      requestedByRole?: string;
      requestedTargetDeviceId?: string;
      approvalHostId?: string;
      approvalHostRole?: string;
      payload?: unknown;
    } = {},
  ): LucaLinkApprovalMutationResult {
    return enqueueApprovalForSoftEnforcementResult(
      this.approvalQueue,
      result,
      context,
    );
  }

  /**
   * Evaluate a runtime event against the pure soft-enforcement model.
   * This helper is side-effect-free except for reading current candidate manifests.
   */
  evaluateRuntimeEventForSoftEnforcement(input: {
    eventName?: string;
    payload?: unknown;
  }): LucaLinkSoftEnforcementResult {
    return evaluateSoftEnforcementForLegacyEvent(input, {
      ...this.softEnforcementOptions,
      candidates: [
        ...(this.softEnforcementOptions.candidates ?? []),
        ...this.getRuntimeShadowCandidateManifests(),
      ],
    });
  }

  /**
   * Enable diagnostics-only runtime shadow observations.
   * This does not change connection, pairing, guest, WebRTC, or message flow.
   */
  enableRuntimeShadowDiagnostics(
    options: LucaLinkRuntimeShadowOptions = {},
  ): void {
    this.runtimeShadow = createLucaLinkRuntimeShadow({
      ...options,
      enabled: true,
    });
  }

  /**
   * Disable diagnostics-only runtime shadow observations.
   */
  disableRuntimeShadowDiagnostics(): void {
    this.runtimeShadow.enabled = false;
  }

  getTrustedDevices() {
    return listTrustedDevices(this.deviceTrustRegistry);
  }

  getActiveTrustedDevices() {
    return listActiveTrustedDevices(this.deviceTrustRegistry);
  }

  getDeviceTrustSummary() {
    return summarizeDeviceTrustRegistry(this.deviceTrustRegistry);
  }

  getDeviceTrustAudit() {
    return getDeviceTrustAudit(this.deviceTrustRegistry);
  }

  clearDeviceTrustAudit(): void {
    clearDeviceTrustAudit(this.deviceTrustRegistry);
  }

  renameTrustedDevice(
    deviceId: string,
    displayName: string,
    options?: LucaLinkDeviceTrustMutationOptions,
  ): LucaLinkDeviceTrustMutationResult {
    return renameTrustedDevice(
      this.deviceTrustRegistry,
      deviceId,
      displayName,
      options,
    );
  }

  setTrustedDeviceTrustLevel(
    deviceId: string,
    trustLevel: LucaLinkDeviceTrustLevel,
    options?: LucaLinkDeviceTrustMutationOptions,
  ): LucaLinkDeviceTrustMutationResult {
    return setTrustedDeviceTrustLevel(
      this.deviceTrustRegistry,
      deviceId,
      trustLevel,
      options,
    );
  }

  revokeTrustedDevice(
    deviceId: string,
    options?: LucaLinkDeviceTrustMutationOptions,
  ): LucaLinkDeviceTrustMutationResult {
    return revokeTrustedDevice(this.deviceTrustRegistry, deviceId, options);
  }

  blockTrustedDevice(
    deviceId: string,
    options?: LucaLinkDeviceTrustMutationOptions,
  ): LucaLinkDeviceTrustMutationResult {
    return blockTrustedDevice(this.deviceTrustRegistry, deviceId, options);
  }

  unblockTrustedDevice(
    deviceId: string,
    options?: LucaLinkDeviceTrustMutationOptions,
  ): LucaLinkDeviceTrustMutationResult {
    return unblockTrustedDevice(this.deviceTrustRegistry, deviceId, options);
  }

  getHostConnections(
    options: { refresh?: boolean } = {},
  ): LucaLinkHostConnectionRecord[] {
    if (options.refresh !== false) {
      this.refreshHostConnectionsFromCurrentState();
    }
    return listLucaLinkHostConnections(this.hostConnectionRegistry);
  }

  getHostConnectionSummary(
    options: { refresh?: boolean } = {},
  ): LucaLinkHostConnectionRegistrySummary {
    if (options.refresh !== false) {
      this.refreshHostConnectionsFromCurrentState();
    }
    return summarizeLucaLinkHostConnectionRegistry(this.hostConnectionRegistry);
  }

  getFreshHostConnections(): LucaLinkHostConnectionRecord[] {
    return this.getHostConnections({ refresh: true });
  }

  getFreshHostConnectionSummary(): LucaLinkHostConnectionRegistrySummary {
    return this.getHostConnectionSummary({ refresh: true });
  }

  clearHostConnections(): void {
    clearLucaLinkHostConnectionRegistry(this.hostConnectionRegistry);
  }

  refreshHostConnectionsFromCurrentState(): LucaLinkHostConnectionRecord[] {
    const now = Date.now();
    const trustedDevices = listTrustedDevices(this.deviceTrustRegistry);
    const trustByDeviceId = new Map(
      trustedDevices.map((device) => [device.deviceId, device]),
    );

    this.state.connectedDevices.forEach((device) => {
      const trusted = trustByDeviceId.get(device.deviceId);
      upsertLucaLinkHostConnection(
        this.hostConnectionRegistry,
        {
          id: device.deviceId,
          deviceId: device.deviceId,
          displayName: trusted?.displayName ?? device.name,
          deviceType: trusted?.deviceType ?? device.type,
          trustLevel: trusted?.trustLevel,
          deviceRole: trusted?.role,
          status: trusted?.status ?? "connected",
          capabilities: trusted?.capabilities,
          isCurrentPrimaryHost: device.deviceId === this.state.deviceId,
          lastSeenAt: device.lastSeen,
          connectionEvidence: [
            "Derived from current LucaLink connected device state.",
          ],
        },
        { now },
      );
    });

    trustedDevices.forEach((device) => {
      upsertLucaLinkHostConnection(
        this.hostConnectionRegistry,
        {
          id: device.deviceId,
          deviceId: device.deviceId,
          displayName: device.displayName,
          deviceType: device.deviceType,
          trustLevel: device.trustLevel,
          deviceRole: device.role,
          status: device.status,
          capabilities: device.capabilities,
          isCurrentPrimaryHost: device.deviceId === this.state.deviceId,
          lastSeenAt: device.lastSeenAt,
          connectionEvidence: [
            "Derived from local LucaLink device trust registry.",
          ],
        },
        { now },
      );
    });

    this.guestSecuritySessions.forEach((session) => {
      upsertLucaLinkHostConnection(
        this.hostConnectionRegistry,
        {
          id: session.sessionId,
          deviceId: session.sessionId,
          displayName: `Guest session ${session.sessionId}`,
          deviceType: "guest web browser",
          trustLevel: "guest",
          deviceRole: "guest",
          status: session.status,
          lastSeenAt: session.lastActivityAt ?? session.updatedAt,
          connectionEvidence: [
            "Derived from local guest security session state.",
          ],
        },
        { now },
      );
    });

    if (
      this.state.deviceId &&
      !this.hostConnectionRegistry.records.some(
        (record) => record.deviceId === this.state.deviceId,
      )
    ) {
      upsertLucaLinkHostConnection(
        this.hostConnectionRegistry,
        {
          id: this.state.deviceId,
          deviceId: this.state.deviceId,
          displayName: "Current Primary Host",
          deviceType: "desktop primary host",
          trustLevel: "owner",
          deviceRole: "primary-host",
          status: this.state.connected ? "connected" : "known",
          isCurrentPrimaryHost: true,
          connectionEvidence: [
            "Derived from current LucaLink service identity.",
          ],
        },
        { now },
      );
    }

    return listLucaLinkHostConnections(this.hostConnectionRegistry);
  }

  diagnoseHostConnection(
    input: LucaLinkHostDiagnosisInput,
  ): LucaLinkHostConnectionDiagnosis {
    return createLucaLinkHostConnectionDiagnosis(input);
  }

  planHostBridgeStrategies(
    input: LucaLinkHostConnectionDiagnosis | LucaLinkHostDiagnosisInput,
  ): LucaLinkHostBridgeStrategyPlan[] {
    const diagnosis =
      "detectedRuntimeSurfaces" in input
        ? input
        : createLucaLinkHostConnectionDiagnosis(input);
    return planLucaLinkHostBridgeStrategies(diagnosis);
  }

  createHostBridgeBlueprint(
    input: LucaLinkHostBridgeStrategyPlan | LucaLinkHostBridgeStrategyKind,
  ): LucaLinkHostBridgeBlueprint {
    return createLucaLinkHostBridgeBlueprint(input);
  }

  createHostConnectionRecord(
    input: LucaLinkHostConnectionInput,
  ): LucaLinkHostConnectionRecord {
    return createLucaLinkHostConnectionRecord(input);
  }

  getRuntimeShadowObservations(): LucaLinkRuntimeObservation[] {
    return getLucaLinkShadowObservations(this.runtimeShadow);
  }

  clearRuntimeShadowObservations(): void {
    clearLucaLinkShadowObservations(this.runtimeShadow);
  }

  getRuntimeShadowSummary(): LucaLinkRuntimeObservationSummary {
    return summarizeLucaLinkShadowObservations(this.runtimeShadow);
  }

  /**
   * Public diagnostic hook for future runtime call sites.
   * The returned observation is informational only and is never used for enforcement.
   */
  observeRuntimeEventForDiagnostics(
    input: LucaLinkRuntimeShadowEventInput,
  ): LucaLinkRuntimeObservation | undefined {
    if (!this.runtimeShadow.enabled) return undefined;

    return recordLucaLinkShadowObservation(this.runtimeShadow, input, {
      candidates: this.getRuntimeShadowCandidateManifests(),
    });
  }

  private getRuntimeShadowCandidateManifests(): LucaHostManifest[] {
    return legacyDevicesToManifests(
      this.state.connectedDevices.map((device) => ({
        deviceId: device.deviceId,
        name: device.name,
        type: device.type,
        lastSeen: device.lastSeen,
      })),
    )
      .map((result) => result.manifest)
      .filter((manifest): manifest is LucaHostManifest => !!manifest);
  }

  private updateState(partial: Partial<LucaLinkState>): void {
    if (partial.connectedDevices) {
      this.syncDeviceTrustRegistryFromConnectedDevices(
        partial.connectedDevices,
      );
      const connectedIds = new Set(
        partial.connectedDevices.map((device) => device.deviceId),
      );
      this.deviceTrustRegistry.devices.forEach((device) => {
        if (
          device.status === "connected" &&
          !connectedIds.has(device.deviceId)
        ) {
          markTrustedDeviceDisconnected(
            this.deviceTrustRegistry,
            device.deviceId,
          );
        }
      });
    }
    this.state = { ...this.state, ...partial };
    if (partial.connectedDevices) {
      this.refreshHostConnectionsFromCurrentState();
    }
    this.stateListeners.forEach((listener) => listener(this.state));
  }

  private upsertDeviceTrustFromRuntimeDevice(
    device: LucaLinkDevice,
    isCurrentPrimaryHost = false,
    status: "known" | "connected" | "disconnected" = "connected",
  ): void {
    const record = upsertTrustedDevice(this.deviceTrustRegistry, {
      deviceId: device.deviceId,
      displayName: device.name,
      deviceType: device.type,
      lastSeenAt: device.lastSeen,
      status,
      isCurrentPrimaryHost,
    });
    if (
      status === "connected" &&
      record.status !== "revoked" &&
      record.status !== "blocked"
    ) {
      markTrustedDeviceConnected(this.deviceTrustRegistry, device.deviceId, {
        now: device.lastSeen || Date.now(),
      });
    }
  }

  private syncDeviceTrustRegistryFromConnectedDevices(
    devices: LucaLinkDevice[],
  ): void {
    devices.forEach((device) => {
      this.upsertDeviceTrustFromRuntimeDevice(
        device,
        device.deviceId === this.state.deviceId,
        "connected",
      );
    });
  }

  // ========== GUEST SESSION METHODS (Primary Host room mode) ==========

  private guestSessions: Map<
    string,
    { peerConnection: RTCPeerConnection | null; sessionId: string }
  > = new Map();
  private guestMessageHandler:
    | ((sessionId: string, message: string) => void)
    | null = null;
  private guestSecuritySessions: Map<string, LucaLinkGuestSessionRecord> =
    new Map();
  private guestInboundAudit: LucaLinkGuestInboundResult[] = [];
  private readonly guestInboundAuditLimit = 100;

  getGuestSecuritySessions(): LucaLinkGuestSessionRecord[] {
    return [...this.guestSecuritySessions.values()];
  }

  getGuestSecuritySummary(): LucaLinkGuestSessionSummary {
    return summarizeLucaLinkGuestSessions(this.guestSecuritySessions.values());
  }

  getGuestInboundAudit(): LucaLinkGuestInboundResult[] {
    return [...this.guestInboundAudit];
  }

  clearGuestInboundAudit(): void {
    this.guestInboundAudit = [];
  }

  private evaluateGuestInbound(
    input: LucaLinkGuestInboundInput,
  ): LucaLinkGuestInboundResult {
    const sessionId = input.sessionId;
    let session = sessionId
      ? this.guestSecuritySessions.get(sessionId)
      : undefined;
    if (sessionId && !session) {
      session = createLucaLinkGuestSession(sessionId, { now: input.now });
      this.guestSecuritySessions.set(sessionId, session);
    }

    const result = evaluateLucaLinkGuestInbound(input, session, {
      now: input.now,
    });
    if (sessionId && result.updatedSession) {
      this.guestSecuritySessions.set(sessionId, result.updatedSession);
    }
    this.guestInboundAudit = [...this.guestInboundAudit, result].slice(
      -this.guestInboundAuditLimit,
    );
    return result;
  }

  /**
   * Generate a guest session for web access (Primary Host room mode).
   * Returns the guest URL that can be shared via QR code
   */
  async generateGuestSession(): Promise<{
    sessionId: string;
    guestUrl: string;
  } | null> {
    if (!this.socket || !this.state.connected || !this.state.deviceId) {
      console.warn("[LucaLink] Cannot generate guest session: not connected");
      return null;
    }

    const relayUrl = this.getRelayUrl();
    try {
      const response = await fetch(`${relayUrl}/api/guest/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desktopDeviceId: this.state.deviceId }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to generate guest session: ${response.statusText}`,
        );
      }

      const data = await response.json();
      console.log("[LucaLink] Guest session created:", data);

      // Store session locally
      this.guestSessions.set(data.sessionId, {
        peerConnection: null,
        sessionId: data.sessionId,
      });
      this.guestSecuritySessions.set(
        data.sessionId,
        createLucaLinkGuestSession(data.sessionId),
      );
      upsertTrustedDevice(this.deviceTrustRegistry, {
        deviceId: data.sessionId,
        displayName: `Guest session ${data.sessionId}`,
        deviceType: "guest web",
        role: "guest",
        trustLevel: "guest",
        status: "known",
        lastSeenAt: Date.now(),
        capabilities: ["chat.send", "chat.receive", "webrtc"],
      });

      return { sessionId: data.sessionId, guestUrl: data.guestUrl };
    } catch (e) {
      console.error("[LucaLink] Failed to generate guest session:", e);
      return null;
    }
  }

  /**
   * Set handler for guest messages
   */
  onGuestMessage(handler: (sessionId: string, message: string) => void): void {
    this.guestMessageHandler = handler;
  }

  /**
   * Send message/audio to a guest
   */
  sendToGuest(
    sessionId: string,
    message: string,
    audioBase64?: string,
  ): boolean {
    if (!this.socket || !this.state.connected) {
      return false;
    }

    const payload = {
      sessionId,
      message,
      audio: audioBase64,
    };
    this.observeRuntimeEventForDiagnostics({
      eventName: "desktop-to-guest",
      payload,
      sourceDeviceId: this.state.deviceId ?? undefined,
      targetDeviceId: sessionId,
    });

    this.socket.emit("desktop-to-guest", payload);
    return true;
  }

  /**
   * Initialize WebRTC for a guest session
   */
  private async initGuestWebRTC(
    sessionId: string,
  ): Promise<RTCPeerConnection | null> {
    try {
      const config: RTCConfiguration = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      };

      const pc = new RTCPeerConnection(config);

      // ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate && this.socket) {
          this.socket.emit("webrtc-ice-candidate", {
            sessionId,
            candidate: event.candidate,
            fromDesktop: true,
          });
        }
      };

      // Handle incoming audio from guest
      pc.ontrack = (event) => {
        console.log("[LucaLink] Received audio from guest");
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.play();
      };

      // Store the peer connection
      const session = this.guestSessions.get(sessionId);
      if (session) {
        session.peerConnection = pc;
      }

      return pc;
    } catch (e) {
      console.error("[LucaLink] Failed to init WebRTC:", e);
      return null;
    }
  }

  /**
   * Start the guest session (WebRTC offer) - called after auth
   */
  private async startGuestSession(sessionId: string): Promise<void> {
    console.log(`[LucaLink] Starting guest session ${sessionId} (Authorized)`);
    // Initialize WebRTC and send offer
    const pc = await this.initGuestWebRTC(sessionId);
    if (pc) {
      try {
        // Get local audio (if we want bidirectional audio)
        // For now, we'll just receive audio from guest
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);

        this.socket?.emit("webrtc-offer", {
          sessionId: sessionId,
          offer: pc.localDescription,
        });
      } catch (e) {
        console.error("[LucaLink] WebRTC offer failed:", e);
      }
    }
  }

  /**
   * Send a JSON-encoded auth control message to guest
   */
  private sendToGuestAuth(
    sessionId: string,
    type: "auth-challenge" | "auth-success" | "auth-failed",
  ): void {
    const payload = JSON.stringify({ type });
    this.sendToGuest(sessionId, payload);
  }

  /**
   * Setup guest event handlers on the socket
   */
  private setupGuestHandlers(): void {
    if (!this.socket) return;

    // Guest connected
    this.socket.on("guest-connected", async (data: { sessionId: string }) => {
      console.log("[LucaLink] Guest connected:", data.sessionId);
      this.observeRuntimeEventForDiagnostics({
        eventName: "guest-connected",
        payload: data,
        sourceDeviceId: data.sessionId,
        targetDeviceId: this.state.deviceId ?? "primary",
      });
      if (!this.guestSessions.has(data.sessionId)) {
        this.guestSessions.set(data.sessionId, {
          peerConnection: null,
          sessionId: data.sessionId,
        });
      }
      upsertTrustedDevice(this.deviceTrustRegistry, {
        deviceId: data.sessionId,
        displayName: `Guest session ${data.sessionId}`,
        deviceType: "guest web",
        role: "guest",
        trustLevel: "guest",
        status: "connected",
        lastSeenAt: Date.now(),
        capabilities: ["chat.send", "chat.receive", "webrtc"],
      });
      markTrustedDeviceConnected(this.deviceTrustRegistry, data.sessionId);
      this.evaluateGuestInbound({
        kind: "guest-connected",
        sessionId: data.sessionId,
        payload: data,
      });

      // 1. Check if PIN is required
      try {
        const res = await fetch(cortexUrl("/api/remote-access/info"));
        const info = await res.json();
        if (info.pinRequired) {
          console.log(
            `[LucaLink] PIN required for session ${data.sessionId}, sending challenge`,
          );
          const securitySession = this.guestSecuritySessions.get(
            data.sessionId,
          );
          if (securitySession) {
            this.guestSecuritySessions.set(
              data.sessionId,
              markGuestSessionAuthChallenge(securitySession),
            );
          }
          this.sendToGuestAuth(data.sessionId, "auth-challenge");
          return;
        }
      } catch (e) {
        console.error("[LucaLink] Failed to check PIN status:", e);
      }

      // If no PIN required (or check failed), proceed
      const securitySession = this.guestSecuritySessions.get(data.sessionId);
      if (securitySession) {
        this.guestSecuritySessions.set(
          data.sessionId,
          markGuestSessionActive(securitySession),
        );
      }
      await this.startGuestSession(data.sessionId);
    });

    // WebRTC answer from guest
    this.socket.on(
      "webrtc-answer",
      async (data: {
        sessionId: string;
        answer: RTCSessionDescriptionInit;
      }) => {
        this.observeRuntimeEventForDiagnostics({
          eventName: "webrtc-answer",
          payload: data,
          sourceDeviceId: data.sessionId,
          targetDeviceId: this.state.deviceId ?? "primary",
        });
        this.evaluateGuestInbound({
          kind: "webrtc-answer",
          sessionId: data.sessionId,
          payload: data,
        });
        const session = this.guestSessions.get(data.sessionId);
        if (session?.peerConnection) {
          await session.peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer),
          );
        }
      },
    );

    // ICE candidate from guest
    this.socket.on(
      "webrtc-ice-candidate",
      async (data: { sessionId: string; candidate: RTCIceCandidateInit }) => {
        this.observeRuntimeEventForDiagnostics({
          eventName: "webrtc-ice-candidate",
          payload: data,
          sourceDeviceId: data.sessionId,
          targetDeviceId: this.state.deviceId ?? "primary",
        });
        this.evaluateGuestInbound({
          kind: "webrtc-ice-candidate",
          sessionId: data.sessionId,
          payload: data,
        });
        const session = this.guestSessions.get(data.sessionId);
        if (session?.peerConnection && data.candidate) {
          await session.peerConnection.addIceCandidate(
            new RTCIceCandidate(data.candidate),
          );
        }
      },
    );

    // Message from guest (Chat or Auth Response)
    this.socket.on(
      "guest-message",
      async (data: { sessionId: string; message: string }) => {
        this.observeRuntimeEventForDiagnostics({
          eventName: "guest-message",
          payload: data,
          sourceDeviceId: data.sessionId,
          targetDeviceId: this.state.deviceId ?? "primary",
        });
        // DEBUG:
        // console.log("[LucaLink] Raw guest message:", data);

        const inboundEvaluation = this.evaluateGuestInbound({
          kind: isGuestAuthPayload(data.message)
            ? "guest-auth-response"
            : "guest-message",
          sessionId: data.sessionId,
          payload: data,
          message: data.message,
        });

        if (inboundEvaluation.decision === "deny") {
          console.warn(
            `[LucaLink] Denied unsafe guest inbound for ${data.sessionId}`,
          );
          this.sendToGuest(
            data.sessionId,
            "This guest session can only use conversation access.",
          );
          return;
        }

        if (inboundEvaluation.decision === "rate-limit") {
          console.warn(
            `[LucaLink] Rate-limited guest inbound for ${data.sessionId}`,
          );
          this.sendToGuest(
            data.sessionId,
            "This guest session is sending messages too quickly. Please wait a moment.",
          );
          return;
        }

        const inboundMessage =
          inboundEvaluation.sanitizedMessage ?? data.message;

        // 2. Check for Auth Response (JSON)
        // Relay passes message as-is. We try to parse it as JSON to see if it's a protocol message.
        if (
          typeof inboundMessage === "string" &&
          inboundMessage.startsWith("{") &&
          inboundMessage.includes("auth-response")
        ) {
          try {
            const payload = JSON.parse(inboundMessage);
            if (payload.type === "auth-response" && payload.pin) {
              console.log(
                `[LucaLink] verifying PIN for session ${data.sessionId}`,
              );

              // Verify PIN with Cortex
              const res = await fetch(
                cortexUrl("/api/remote-access/verify-pin"),
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    pin: payload.pin,
                    sessionId: data.sessionId,
                  }),
                },
              );

              if (res.ok) {
                const verifyData = await res.json();
                if (verifyData.valid) {
                  console.log(
                    `[LucaLink] PIN correct for ${data.sessionId}. starting session.`,
                  );
                  const securitySession = this.guestSecuritySessions.get(
                    data.sessionId,
                  );
                  if (securitySession) {
                    this.guestSecuritySessions.set(
                      data.sessionId,
                      markGuestSessionActive(
                        markGuestSessionAuthenticated(securitySession),
                      ),
                    );
                  }
                  this.sendToGuestAuth(data.sessionId, "auth-success");
                  await this.startGuestSession(data.sessionId);
                  return; // Don't process as chat message
                }
              }

              console.warn(
                `[LucaLink] PIN invalid for session ${data.sessionId}`,
              );
              this.sendToGuestAuth(data.sessionId, "auth-failed");
              return; // Don't process as chat message
            }
          } catch {
            // Not a valid JSON or not an auth message, treat as chat
          }
        }

        // 3. Normal Chat Message
        console.log("[LucaLink] Guest chat message:", data);
        if (this.guestMessageHandler) {
          this.guestMessageHandler(data.sessionId, inboundMessage);
        }
      },
    );

    // Guest disconnected
    this.socket.on("guest-disconnected", (data: { sessionId: string }) => {
      console.log("[LucaLink] Guest disconnected:", data.sessionId);
      this.observeRuntimeEventForDiagnostics({
        eventName: "guest-disconnected",
        payload: data,
        sourceDeviceId: data.sessionId,
        targetDeviceId: this.state.deviceId ?? "primary",
      });
      this.evaluateGuestInbound({
        kind: "guest-disconnected",
        sessionId: data.sessionId,
        payload: data,
      });
      const securitySession = this.guestSecuritySessions.get(data.sessionId);
      if (securitySession) {
        this.guestSecuritySessions.set(
          data.sessionId,
          markGuestSessionDisconnected(securitySession),
        );
      }
      markTrustedDeviceDisconnected(this.deviceTrustRegistry, data.sessionId);
      const session = this.guestSessions.get(data.sessionId);
      if (session?.peerConnection) {
        session.peerConnection.close();
      }
      this.guestSessions.delete(data.sessionId);
    });
  }

  /**
   * Initialize guest message handler with Luca AI processing
   * Call this in App.tsx or wherever Luca is initialized
   *
   * @param processMessage - Function that takes user message, returns AI response
   * @param generateAudio - Optional function to generate TTS audio (returns base64)
   */
  initGuestHandler(
    processMessage: (message: string) => Promise<string>,
    generateAudio?: (text: string) => Promise<string | null>,
  ): void {
    this.onGuestMessage(async (sessionId, message) => {
      console.log(
        `[LucaLink] Processing guest message from ${sessionId}: "${message}"`,
      );

      try {
        // Process message through Luca AI
        const response = await processMessage(message);

        // Generate audio if handler provided
        let audioBase64: string | undefined;
        if (generateAudio) {
          try {
            const audio = await generateAudio(response);
            audioBase64 = audio || undefined;
          } catch (e) {
            console.warn("[LucaLink] Audio generation failed:", e);
          }
        }

        // Send response back to guest
        this.sendToGuest(sessionId, response, audioBase64);
        console.log(`[LucaLink] Sent response to guest ${sessionId}`);
      } catch (e) {
        console.error("[LucaLink] Failed to process guest message:", e);
        this.sendToGuest(
          sessionId,
          "Sorry, I encountered an error processing your request.",
        );
      }
    });

    console.log("[LucaLink] Guest message handler initialized");
  }

  /**
   * [2050 ALIEN TECH]: Neural Beam
   * Transmits a high-fidelity neural packet to a target Satellite Node.
   * Hardened with AES-256-GCM for absolute privacy and integrity.
   */
  async beamPacket(
    targetDeviceId: string,
    packet: { type: string; payload: any },
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.socket || !this.state.connected) {
      return {
        success: false,
        error: "Transporter offline: Luca Link not connected.",
      };
    }

    if (
      this.runtimeEnforcementMode !== "disabled" ||
      this.getSoftEnforcementMode() !== "disabled"
    ) {
      const runtimeEnforcement = this.evaluateRuntimeEnforcementForOutbound({
        scope: "outbound-beam",
        eventName:
          packet.type === "SENSOR_PULSE"
            ? "SENSOR_PULSE"
            : packet.type === "sync"
              ? "sync"
              : "message",
        payload: {
          type: packet.type,
          source: this.state.deviceId || "unknown",
          target: targetDeviceId,
          payload: packet.payload,
        },
        sourceDeviceId: this.state.deviceId || "unknown",
        targetDeviceId,
      });
      if (runtimeEnforcement.blocked) {
        return {
          success: false,
          error: `Runtime enforcement blocked LucaLink beam: ${runtimeEnforcement.explain}`,
        };
      }
    }

    console.log(`[LucaLink] ⚡ Preparing Neural Beam for ${targetDeviceId}...`);

    // --- NEURAL HARDENING: Try to encrypt the payload ---
    let finalPayload = packet.payload;
    let isSecure = false;

    try {
      const sessionData =
        await sessionManager.recoverSessionByDevice(targetDeviceId);
      if (sessionData) {
        console.log(`[LucaLink] 🔐 Vaulting Neural Packet with AES-256-GCM...`);
        finalPayload = await CryptoService.createSecureMessage(
          packet.payload,
          sessionData.sharedSecret,
        );
        isSecure = true;
      } else {
        console.warn(
          `[LucaLink] ⚠️ No secure session for ${targetDeviceId}. Sending Naked Transmission.`,
        );
      }
    } catch (e) {
      console.error("[LucaLink] ❌ Cryptographic Failure during beam prep:", e);
      return { success: false, error: "Neural Encryption Failure." };
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          error:
            "Beam timed out: Satellite Node did not acknowledge transubstantiation.",
        });
      }, 15000);

      const message: LucaLinkMessage = {
        id: this.generateDeviceId(),
        type: packet.type,
        source: this.state.deviceId || "unknown",
        target: targetDeviceId,
        timestamp: Date.now(),
        payload: finalPayload,
        secure: isSecure,
      };

      this.observeRuntimeEventForDiagnostics({
        eventName:
          packet.type === "SENSOR_PULSE"
            ? "SENSOR_PULSE"
            : packet.type === "sync"
              ? "sync"
              : "message",
        payload: message,
        sourceDeviceId: message.source,
        targetDeviceId: message.target,
      });

      // Emit with acknowledgement
      this.socket?.emit("message", message, (ack: any) => {
        clearTimeout(timeout);
        if (ack && ack.success) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: ack?.error || "Neural fracture detected during beam.",
          });
        }
      });
    });
  }
}

// Export singleton
export const lucaLink = new LucaLinkService();
