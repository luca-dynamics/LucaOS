export type PlatformCapability =
  | "InternetAccess"
  | "ReadMemory"
  | "WriteMemory"
  | "CalendarAccess"
  | "FilesystemAccess"
  | "BrowserAccess";

export interface CapabilityGrant {
  workerId: string;
  capabilities: PlatformCapability[];
  signedSignature: string;
}

export class CapabilityManager {
  private grants = new Map<string, CapabilityGrant>();

  public grantCapabilities(workerId: string, capabilities: PlatformCapability[]): CapabilityGrant {
    const grant: CapabilityGrant = {
      workerId,
      capabilities,
      signedSignature: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    this.grants.set(workerId, grant);
    console.log(`🔒 [CapabilityManager] Granted capabilities [${capabilities.join(", ")}] to Worker #${workerId}`);
    return grant;
  }

  public verifyCapability(workerId: string, capability: PlatformCapability): boolean {
    const grant = this.grants.get(workerId);
    if (!grant) {
      console.warn(`🛡️ [CapabilityManager] Access DENIED: No capabilities granted to Worker #${workerId}`);
      return false;
    }
    const hasCap = grant.capabilities.includes(capability);
    if (!hasCap) {
      console.warn(`🛡️ [CapabilityManager] Access DENIED: Worker #${workerId} lacks capability '${capability}'`);
    }
    return hasCap;
  }
}
