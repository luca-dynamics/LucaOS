import { CredentialVault } from "./credentialVault";

export interface SecureVaultStoreResult {
  success: boolean;
  error?: string;
}

export interface SecureVaultRetrieveResult extends SecureVaultStoreResult {
  site?: string;
  username?: string;
  password?: string;
  metadata?: Record<string, unknown>;
}

export interface SecureVaultListEntry {
  site: string;
  username?: string;
  metadata?: Record<string, unknown>;
  updated_at?: number;
}

export interface SecureVaultLike {
  store(
    site: string,
    username: string,
    password: string,
  ): Promise<SecureVaultStoreResult>;
  retrieve(site: string): Promise<SecureVaultRetrieveResult>;
  delete(site: string): Promise<SecureVaultStoreResult>;
  hasCredentials(site: string): Promise<boolean>;
  list(): Promise<SecureVaultListEntry[]>;
}

function isElectronVaultAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.luca?.vault);
}

class SecureVaultFrontendWrapper implements SecureVaultLike {
  private readonly credentialVault = new CredentialVault();

  async store(
    site: string,
    username: string,
    password: string,
  ): Promise<SecureVaultStoreResult> {
    if (!isElectronVaultAvailable()) {
      return { success: false, error: "Vault IPC not available" };
    }

    try {
      return await this.credentialVault.store(site, username, password);
    } catch (error) {
      return this.toFailure(error);
    }
  }

  async retrieve(site: string): Promise<SecureVaultRetrieveResult> {
    if (!isElectronVaultAvailable()) {
      return { success: false, error: "Vault IPC not available" };
    }

    try {
      return await this.credentialVault.retrieve(site);
    } catch (error) {
      return this.toFailure(error);
    }
  }

  async delete(site: string): Promise<SecureVaultStoreResult> {
    if (!isElectronVaultAvailable()) {
      return { success: false, error: "Vault IPC not available" };
    }

    try {
      const result = await this.credentialVault.delete(site);
      return typeof result === "object" &&
        result !== null &&
        "success" in result
        ? (result as SecureVaultStoreResult)
        : { success: true };
    } catch (error) {
      return this.toFailure(error);
    }
  }

  async hasCredentials(site: string): Promise<boolean> {
    if (!isElectronVaultAvailable()) return false;

    try {
      return await this.credentialVault.hasCredentials(site);
    } catch {
      return false;
    }
  }

  async list(): Promise<SecureVaultListEntry[]> {
    if (!isElectronVaultAvailable()) return [];

    try {
      return await this.credentialVault.list();
    } catch {
      return [];
    }
  }

  private toFailure(error: unknown): SecureVaultStoreResult {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const secureVault: SecureVaultLike = new SecureVaultFrontendWrapper();
export default secureVault;
