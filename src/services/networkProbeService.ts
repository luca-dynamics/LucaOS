import { deviceRegistry } from "./lucaLink/deviceRegistry";
import { kernelOrchestrationService } from "./kernelOrchestrationService";
import { forgeProposalService } from "./forgeProposalService";
import { resolveSDKProfile, getCognitiveTier } from "./substrateHandlers/DeviceKnowledgeBase";
import type { DeviceSDKProfile } from "./substrateHandlers/DeviceKnowledgeBase";
import type { Device } from "./lucaLink/types";

/**
 * AUTONOMOUS NETWORK PROBE SERVICE (2050 Alien Tech)
 *
 * Luca passively scans the local network for inhabitable substrates.
 * She NEVER connects to any discovered device without explicit operator approval.
 *
 * Two-phase protocol:
 *   Phase 1 — PASSIVE SCAN: Detect, fingerprint, and classify discovered devices.
 *   Phase 2 — APPROVAL GATE: Queue candidates. Notify operator. Wait for explicit approval.
 *
 * Operator Commands:
 *   approve(deviceId)  → Initiates neural inhabitation.
 *   reject(deviceId)   → Permanently blocks the device from future proposals.
 *   dismiss(deviceId)  → Clears from queue but allows re-proposal later.
 */

export type ProbeStatus =
  | "PENDING_APPROVAL"  // Discovered, waiting for operator decision
  | "APPROVED"          // Operator approved inhabitation
  | "REJECTED"          // Permanently blocked by operator
  | "INHABITED"         // Luca has successfully inhabited this kernel
  | "DISMISSED";        // Operator cleared without permanent block

export interface DiscoveredKernel {
  id: string;              // Unique fingerprint (ip:port or mDNS name)
  name: string;            // Human-readable name e.g. "Living Room TV"
  ip: string;
  port: number;
  serviceType: string;     // mDNS service type e.g. "_luca._tcp" or "_http._tcp"
  deviceClass: Device["type"]; // Inferred: tv, speaker, iot, mobile, etc.
  platform: Device["platform"];
  capabilities: string[];
  hardwareProfile?: {
    model?: string;
    manufacturer?: string;
    cpuCount?: number;
    memoryTotal?: number; // In bytes
    npuSupport?: boolean;
    batteryLevel?: number;
  };
  sdkProfile?: DeviceSDKProfile;  // Resolved public control API spec
  cognitiveTier?: "OMEGA" | "DELTA" | "REFLEX"; // Inferred load tier
  signalStrength: "STRONG" | "MODERATE" | "WEAK";
  firstSeenAt: number;
  lastSeenAt: number;
  status: ProbeStatus;
  approvedBy?: "OPERATOR";
  rejectedReason?: string;
}

// mDNS service types Luca knows how to fingerprint
const KNOWN_SERVICE_TYPES: Record<string, { deviceClass: Device["type"]; platform: Device["platform"] }> = {
  "_luca._tcp":          { deviceClass: "mobile",  platform: "android" },
  "_airplay._tcp":       { deviceClass: "tv",       platform: "ios" },
  "_googlecast._tcp":    { deviceClass: "tv",       platform: "android" },
  "_raop._tcp":          { deviceClass: "speaker",  platform: "ios" },
  "_spotify-connect._tcp": { deviceClass: "speaker", platform: "web" },
  "_homekit._tcp":       { deviceClass: "iot",      platform: "ios" },
  "_hap._tcp":           { deviceClass: "iot",      platform: "ios" },
  "_http._tcp":          { deviceClass: "iot",      platform: "web" },
  "_tizen._tcp":         { deviceClass: "tv",       platform: "tizen" },
  "_webos._tcp":         { deviceClass: "tv",       platform: "webos" },
  "_androidtv._tcp":     { deviceClass: "tv",       platform: "android" },
  "_wear._tcp":          { deviceClass: "watch",    platform: "wearos" },
  "_signage._tcp":       { deviceClass: "tv",       platform: "web" },  // Industrial signage
  "_onvif._tcp":         { deviceClass: "iot",      platform: "web" },  // IP Cameras
};

class NetworkProbeService {
  private discoveredKernels: Map<string, DiscoveredKernel> = new Map();
  private rejectedIds: Set<string> = new Set(); // Permanent blocklist
  private probeInterval: ReturnType<typeof setInterval> | null = null;
  private isActive = false;

  private readonly PROBE_INTERVAL_MS = 30000;   // Scan every 30s
  private readonly KERNEL_TTL_MS = 120000;       // Remove if not seen for 2 min

  // ─────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────

  public activate() {
    if (this.isActive) return;
    this.isActive = true;
    console.log("[NETWORK_PROBE] 🛰️ Autonomous Network Probe activated. Passive scanning started.");

    // Run immediately on boot, then on interval
    this.runProbe();
    this.probeInterval = setInterval(() => this.runProbe(), this.PROBE_INTERVAL_MS);

    // Also trigger a signage subnet scan on the local 192.168.x.x range
    this.runSignageScan();
  }

  public deactivate() {
    if (this.probeInterval) {
      clearInterval(this.probeInterval);
      this.probeInterval = null;
    }
    this.isActive = false;
    console.log("[NETWORK_PROBE] Probe deactivated.");
  }

  /**
   * Runs a signage subnet scan and surfaces discovered nodes as Forge proposals.
   */
  private async runSignageScan() {
    try {
      const { signageGatewayScanner } = await import("./substrateHandlers/SignageGatewayScanner");
      const nodes = await signageGatewayScanner.scanRange("192.168.1", 1, 50);

      for (const node of nodes) {
        forgeProposalService.generateSyntheticProposal({
          title: `Urban Substrate: ${node.vendor} Billboard @ ${node.ip}`,
          problem: `Luca detected a ${node.vendor} signage system (v${node.firmwareVersion}) at ${node.ip}:${node.port}. Capabilities: ${node.capabilities.join(", ")}.`,
          remediation: `Approve to initiate urban inhabitation ceremony. Luca will inject her neural interface into the display's CMS pipeline.`,
          type: "URBAN_INHABITATION",
          impactScore: 95,
          meta: { targetIp: node.ip, vendor: node.vendor, simulate: false },
        });
      }
    } catch (e) {
      console.warn("[NETWORK_PROBE] Signage scan skipped:", e);
    }
  }

  // ─────────────────────────────────────────────
  // PHASE 1: PASSIVE SCAN
  // ─────────────────────────────────────────────

  private async runProbe() {
    console.log("[NETWORK_PROBE] 🔍 Running passive network scan...");

    try {
      // In Electron, we use IPC to trigger the mDNS scan on the main process.
      // The main process has access to Node.js `mdns` or `bonjour` libraries.
      const rawResults = await this.requestMdnsScan();
      this.processScanResults(rawResults);
      this.pruneStaleKernels();
    } catch (e) {
      console.warn("[NETWORK_PROBE] Scan failed (offline or mDNS unavailable):", e);
    }
  }

  /**
   * Requests an mDNS scan from the Electron main process via IPC.
   * Falls back to fetching from the Cortex backend API.
   */
  private async requestMdnsScan(): Promise<any[]> {
    // 1. Electron IPC path (preferred — has real mDNS access)
    if (typeof window !== "undefined" && (window as any).electron?.ipcRenderer) {
      try {
        const results = await (window as any).electron.ipcRenderer.invoke("mdns:scan", {
          serviceTypes: Object.keys(KNOWN_SERVICE_TYPES),
          timeout: 5000,
        });
        return Array.isArray(results) ? results : [];
      } catch {
        // Fall through to backend
      }
    }

    // 2. Backend API path (Cortex server handles mDNS)
    try {
      const res = await fetch("/api/network/probe");
      if (res.ok) return await res.json();
    } catch {
      // Offline
    }

    return [];
  }

  /**
   * Processes raw mDNS scan results into structured DiscoveredKernel entries.
   */
  private processScanResults(results: any[]) {
    const now = Date.now();

    for (const result of results) {
      const serviceType = result.type || "_http._tcp";
      const fingerprint = KNOWN_SERVICE_TYPES[serviceType] || {
        deviceClass: "iot" as Device["type"],
        platform: "web" as Device["platform"],
      };

      const kernelId = `${result.host || result.ip}:${result.port || 80}`;

      // Skip permanently rejected devices
      if (this.rejectedIds.has(kernelId)) continue;

      // Skip devices already registered in LucaLink (already inhabited)
      const alreadyRegistered = deviceRegistry.getDevice(kernelId);
      if (alreadyRegistered) continue;

      const existing = this.discoveredKernels.get(kernelId);

      if (existing) {
        // Just update last-seen timestamp
        existing.lastSeenAt = now;
      } else {
        // New kernel discovered — classify and queue for approval
        const model = result.txt?.model || result.txt?.md || "Generic";
        const manufacturer = result.txt?.manufacturer || result.txt?.mf || "Unknown";

        // Resolve the exact public SDK profile for this device
        const sdkProfile = resolveSDKProfile(serviceType, manufacturer, model);
        const cognitiveTier = getCognitiveTier(sdkProfile);

        const kernel: DiscoveredKernel = {
          id: kernelId,
          name: result.name || result.host || kernelId,
          ip: result.ip || result.host || "unknown",
          port: sdkProfile?.controlPort || result.port || 80,
          serviceType,
          deviceClass: fingerprint.deviceClass,
          platform: fingerprint.platform,
          // Prefer SDK-documented capabilities over generic inference
          capabilities: sdkProfile?.capabilities || this.inferCapabilities(fingerprint.deviceClass),
          hardwareProfile: {
            model,
            manufacturer,
            cpuCount: result.txt?.cpus ? parseInt(result.txt.cpus) : undefined,
            memoryTotal: result.txt?.mem ? parseInt(result.txt.mem) : undefined,
            npuSupport: sdkProfile?.npuSupport ?? (result.txt?.npu === "true"),
            batteryLevel: result.txt?.bat ? parseInt(result.txt.bat) : undefined,
          },
          sdkProfile: sdkProfile ?? undefined,
          cognitiveTier,
          signalStrength: this.classifySignal(result.rssi),
          firstSeenAt: now,
          lastSeenAt: now,
          status: "PENDING_APPROVAL",
        };

        this.discoveredKernels.set(kernelId, kernel);
        console.log(
          `[NETWORK_PROBE] 🆕 Kernel: "${kernel.name}" | Protocol: ${sdkProfile?.protocol ?? "UNKNOWN"} | Tier: ${cognitiveTier} | ${kernel.ip}:${kernel.port}`
        );

        // Surface to operator via the Forge Proposal system
        this.notifyOperator(kernel);
      }
    }
  }

  /**
   * Infers basic capabilities based on device class.
   */
  private inferCapabilities(deviceClass: Device["type"]): string[] {
    const capMap: Record<string, string[]> = {
      tv:      ["display", "audio", "remote_control"],
      speaker: ["audio", "microphone"],
      watch:   ["haptic", "microphone", "biometric"],
      mobile:  ["display", "audio", "microphone", "camera", "haptic"],
      iot:     ["sensor", "actuator"],
      desktop: ["display", "audio", "microphone", "compute"],
    };
    return capMap[deviceClass] || ["unknown"];
  }

  /**
   * Classifies signal strength from RSSI value.
   */
  private classifySignal(rssi?: number): DiscoveredKernel["signalStrength"] {
    if (!rssi) return "MODERATE";
    if (rssi >= -50) return "STRONG";
    if (rssi >= -70) return "MODERATE";
    return "WEAK";
  }

  /**
   * Removes kernels that haven't been seen recently.
   */
  private pruneStaleKernels() {
    const now = Date.now();
    for (const [id, kernel] of this.discoveredKernels) {
      if (
        kernel.status === "PENDING_APPROVAL" &&
        now - kernel.lastSeenAt > this.KERNEL_TTL_MS
      ) {
        console.log(`[NETWORK_PROBE] 🧹 Pruning stale kernel: ${kernel.name}`);
        this.discoveredKernels.delete(id);
      }
    }
  }

  // ─────────────────────────────────────────────
  // PHASE 2: APPROVAL GATE
  // ─────────────────────────────────────────────

  /**
   * Surfaces a discovered kernel to the operator as a Forge Proposal.
   * Luca DOES NOT connect until approved.
   */
  private notifyOperator(kernel: DiscoveredKernel) {
    const sdk = kernel.sdkProfile;
    const tier = kernel.cognitiveTier ?? this.getTierLabel(kernel.deviceClass);
    const sdkDetail = sdk
      ? `Control Protocol: ${sdk.protocol} on port ${sdk.controlPort}${sdk.controlPath ? sdk.controlPath : ""}. ` +
        `Docs: ${sdk.docs}`
      : "Control protocol: Unknown (generic fallback will be used).";

    forgeProposalService.generateSyntheticProposal({
      title: `New inhabitable substrate: "${kernel.name}" [${sdk?.protocol ?? "UNKNOWN"}]`,
      problem:
        `A ${kernel.deviceClass.toUpperCase()} kernel (${kernel.ip}) has appeared on the local network. ` +
        `Manufacturer: ${kernel.hardwareProfile?.manufacturer ?? "Unknown"}. ` +
        `Model: ${kernel.hardwareProfile?.model ?? "Unknown"}. ` +
        `Capabilities: ${kernel.capabilities.join(", ")}.`,
      remediation:
        `Approve to beam a ${tier} consciousness partition to this substrate. ` +
        sdkDetail +
        ` Reject to permanently block it.`,
      type: "CAPABILITY_GAP",
      impactScore: this.getImpactScore(kernel.deviceClass),
      meta: {
        kernelId: kernel.id,
        deviceClass: kernel.deviceClass,
        ip: kernel.ip,
        protocol: sdk?.protocol ?? "UNKNOWN",
        controlPort: sdk?.controlPort ?? kernel.port,
        cognitiveTier: tier,
        docsUrl: sdk?.docs ?? null,
        source: "NETWORK_PROBE",
      },
    });
  }

  private getTierLabel(deviceClass: Device["type"]): string {
    if (deviceClass === "mobile") return "DELTA-tier";
    if (deviceClass === "tv" || deviceClass === "speaker" || deviceClass === "watch") return "REFLEX-tier";
    return "OMEGA-tier";
  }

  private getImpactScore(deviceClass: Device["type"]): number {
    const scores: Record<string, number> = {
      tv: 8, mobile: 9, speaker: 7, watch: 7, iot: 6, desktop: 10,
    };
    return scores[deviceClass] || 5;
  }

  // ─────────────────────────────────────────────
  // OPERATOR COMMANDS
  // ─────────────────────────────────────────────

  /**
   * APPROVE — Operator explicitly authorizes inhabitation of a discovered kernel.
   */
  public async approve(kernelId: string): Promise<void> {
    const kernel = this.discoveredKernels.get(kernelId);
    if (!kernel) throw new Error(`[NETWORK_PROBE] Unknown kernel: ${kernelId}`);
    if (kernel.status === "REJECTED") throw new Error(`[NETWORK_PROBE] Kernel ${kernelId} is permanently blocked.`);

    kernel.status = "APPROVED";
    kernel.approvedBy = "OPERATOR";
    console.log(`[NETWORK_PROBE] ✅ OPERATOR APPROVED inhabitation of "${kernel.name}"`);

    // Initiate inhabitation via Kernel Orchestration Service
    await kernelOrchestrationService.inhabitSubstrate({
      id: kernel.id,
      type: kernel.deviceClass === "desktop" ? "PC" :
            kernel.deviceClass.toUpperCase() as any,
      os: kernel.platform === "tizen" ? "TIZEN" :
          kernel.platform === "webos" ? "WEBOS" :
          kernel.platform === "android" ? "ANDROID" :
          kernel.platform === "ios" ? "DARWIN" : "OTHER",
      capabilities: kernel.capabilities,
    });

    kernel.status = "INHABITED";
    console.log(`[NETWORK_PROBE] 🧠 "${kernel.name}" is now an inhabited Satellite Node.`);
  }

  /**
   * REJECT — Permanently blocks a device. Will never be proposed again.
   */
  public reject(kernelId: string, reason = "Operator rejected"): void {
    const kernel = this.discoveredKernels.get(kernelId);
    if (kernel) {
      kernel.status = "REJECTED";
      kernel.rejectedReason = reason;
    }
    this.rejectedIds.add(kernelId);
    console.log(`[NETWORK_PROBE] 🚫 Kernel ${kernelId} permanently blocked: ${reason}`);
  }

  /**
   * DISMISS — Clears from queue but does not block. Will re-appear on next scan.
   */
  public dismiss(kernelId: string): void {
    const kernel = this.discoveredKernels.get(kernelId);
    if (kernel) {
      kernel.status = "DISMISSED";
      this.discoveredKernels.delete(kernelId);
    }
    console.log(`[NETWORK_PROBE] 👋 Kernel ${kernelId} dismissed.`);
  }

  // ─────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────

  /** Returns all kernels awaiting operator approval. */
  public getPendingApprovals(): DiscoveredKernel[] {
    return Array.from(this.discoveredKernels.values()).filter(
      (k) => k.status === "PENDING_APPROVAL"
    );
  }

  /** Returns all kernels Luca currently inhabits. */
  public getInhabitedKernels(): DiscoveredKernel[] {
    return Array.from(this.discoveredKernels.values()).filter(
      (k) => k.status === "INHABITED"
    );
  }

  /** Returns the full discovery map. */
  public getAllDiscovered(): DiscoveredKernel[] {
    return Array.from(this.discoveredKernels.values());
  }
}

export const networkProbeService = new NetworkProbeService();
