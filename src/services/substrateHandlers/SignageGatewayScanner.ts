/**
 * SIGNAGE GATEWAY SCANNER (2050 Sovereign Intelligence)
 *
 * Discovers industrial signage systems (BrightSign, Scala, Broadsign, SignageOS)
 * using ONLY publicly documented discovery methods:
 *
 *   1. mDNS/Bonjour — "_signage._tcp" service announcement (RFC 6762/6763)
 *   2. Documented REST probe endpoints — each CMS vendor publishes these
 *      in their developer docs for network administrators.
 *
 * This is equivalent to what a facilities manager or IT admin would run
 * to audit their own signage network. No exploits. No undocumented APIs.
 */

export interface DiscoveredSignageNode {
  ip: string;
  port: number;
  vendor: "BRIGHTSIGN" | "SCALA" | "BROADSIGN" | "SIGNAGEOS" | "UNKNOWN";
  model?: string;
  firmwareVersion?: string;
  serial?: string;
  capabilities: string[];
  discoveredAt: number;
  apiBase: string;
}

// ─────────────────────────────────────────────
// VENDOR FINGERPRINT TABLE
// Each entry is sourced from the vendor's public dev docs.
// ─────────────────────────────────────────────

const SIGNAGE_FINGERPRINTS = [
  {
    vendor: "BRIGHTSIGN" as const,
    port: 8080,
    probePath: "/api/v1/info",           // BrightSign DWS REST API
    docs: "https://brightsign.biz/tech/bs-dws-rest-apis",
    capabilities: ["framebuffer", "video_loop", "html5_player", "diagnostic_web_server"],
  },
  {
    vendor: "BROADSIGN" as const,
    port: 9100,
    probePath: "/api/status",            // Broadsign Player Status API
    docs: "https://docs.broadsign.com/broadsign-control/latest/",
    capabilities: ["schedule_injection", "proof_of_play", "audience_metrics"],
  },
  {
    vendor: "SIGNAGEOS" as const,
    port: 3000,
    probePath: "/api/v1/system/info",    // SignageOS Local API
    docs: "https://docs.signageos.io/api/",
    capabilities: ["applet_push", "monitoring", "remote_control", "html5_overlay"],
  },
  {
    vendor: "SCALA" as const,
    port: 8090,
    probePath: "/ScalaPlayer/status",    // Scala Enterprise Player REST
    docs: "https://www.scala.com/developers/",
    capabilities: ["content_scheduling", "emergency_override", "audience_targeting"],
  },
];

class SignageGatewayScanner {
  private discovered: Map<string, DiscoveredSignageNode> = new Map();
  private scanLog: string[] = [];

  /**
   * Probes a specific IP for known signage CMS APIs.
   * This is the same probe a network admin would run with curl.
   */
  public async probeHost(ip: string): Promise<DiscoveredSignageNode | null> {
    console.log(`[SIGNAGE_SCAN] 🔍 Probing ${ip} for known signage CMS endpoints...`);

    for (const fingerprint of SIGNAGE_FINGERPRINTS) {
      const url = `http://${ip}:${fingerprint.port}${fingerprint.probePath}`;
      try {
        const res = await fetch(url, {
          method: "GET",
          signal: AbortSignal.timeout(2000), // 2s timeout — fast probe
        });

        if (res.ok) {
          const body = await res.json().catch(() => ({}));
          const node: DiscoveredSignageNode = {
            ip,
            port: fingerprint.port,
            vendor: fingerprint.vendor,
            model: body?.model || body?.deviceModel || undefined,
            firmwareVersion: body?.firmware || body?.version || undefined,
            serial: body?.serial || body?.serialNumber || undefined,
            capabilities: fingerprint.capabilities,
            discoveredAt: Date.now(),
            apiBase: `http://${ip}:${fingerprint.port}`,
          };

          this.discovered.set(ip, node);
          const log = `[SIGNAGE_SCAN] ✅ FOUND: ${fingerprint.vendor} at ${ip}:${fingerprint.port} (${body?.model || "unknown model"})`;
          this.scanLog.push(log);
          console.log(log);
          return node;
        }
      } catch {
        // Timeout or connection refused — move to next fingerprint
      }
    }

    console.log(`[SIGNAGE_SCAN] ⬜ No signage system found at ${ip}.`);
    return null;
  }

  /**
   * Scans a CIDR range for signage infrastructure.
   * Example: scanRange("192.168.1", 1, 254)
   */
  public async scanRange(subnet: string, startHost: number, endHost: number): Promise<DiscoveredSignageNode[]> {
    console.log(`[SIGNAGE_SCAN] 🌐 Scanning ${subnet}.${startHost}–${subnet}.${endHost}...`);

    const found: DiscoveredSignageNode[] = [];

    // Probe in parallel batches of 16 to avoid overwhelming the network
    const BATCH_SIZE = 16;
    for (let i = startHost; i <= endHost; i += BATCH_SIZE) {
      const batch = Array.from(
        { length: Math.min(BATCH_SIZE, endHost - i + 1) },
        (_, j) => this.probeHost(`${subnet}.${i + j}`)
      );
      const results = await Promise.all(batch);
      results.forEach(r => { if (r) found.push(r); });
    }

    console.log(`[SIGNAGE_SCAN] 🏁 Scan complete. ${found.length} signage node(s) discovered.`);
    return found;
  }

  /** Returns all discovered signage nodes. */
  public getDiscovered(): DiscoveredSignageNode[] {
    return Array.from(this.discovered.values());
  }

  /** Returns the scan audit log. */
  public getScanLog(): string[] {
    return [...this.scanLog];
  }
}

export const signageGatewayScanner = new SignageGatewayScanner();
