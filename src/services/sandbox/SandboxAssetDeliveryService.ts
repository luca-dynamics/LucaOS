export interface SandboxAssetManifestEntry { id: string; version: string; url: string; sizeBytes: number; sha256: string; platforms: Array<"windows" | "linux" | "macos">; }
export interface SandboxAssetManifest { schemaVersion: 1; issuedAt: string; expiresAt: string; assets: SandboxAssetManifestEntry[]; signature: string; }
export interface SandboxAssetStore { size(id: string): Promise<number>; append(id: string, chunk: Uint8Array): Promise<void>; commit(id: string, metadata: { version: string; sha256: string }): Promise<void>; remove(id: string): Promise<void>; read(id: string): Promise<Uint8Array>; }

const canonicalManifest = (manifest: SandboxAssetManifest) => JSON.stringify({ schemaVersion: manifest.schemaVersion, issuedAt: manifest.issuedAt, expiresAt: manifest.expiresAt, assets: manifest.assets });
const hex = (bytes: Uint8Array) => [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

export class SandboxAssetDeliveryService {
  constructor(private readonly store: SandboxAssetStore, private readonly publicKey: Uint8Array, private readonly fetchImpl: typeof fetch = fetch, private readonly now = () => Date.now()) {}
  async verifyManifest(manifest: SandboxAssetManifest): Promise<void> {
    if (manifest.schemaVersion !== 1 || Date.parse(manifest.expiresAt) <= this.now()) throw new Error("Sandbox asset manifest is invalid or expired.");
    if (manifest.assets.some((asset) => !/^https:\/\//.test(asset.url) || asset.sizeBytes <= 0 || asset.sizeBytes > 16 * 1024 ** 3 || !/^[a-f0-9]{64}$/i.test(asset.sha256))) throw new Error("Sandbox asset manifest contains an invalid asset.");
    const key = await crypto.subtle.importKey("raw", this.publicKey as BufferSource, { name: "Ed25519" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("Ed25519", key, Uint8Array.from(atob(manifest.signature), (c) => c.charCodeAt(0)), new TextEncoder().encode(canonicalManifest(manifest)));
    if (!valid) throw new Error("Sandbox asset manifest signature is invalid.");
  }
  async install(manifest: SandboxAssetManifest, assetId: string, platform: SandboxAssetManifestEntry["platforms"][number]): Promise<void> {
    await this.verifyManifest(manifest); const asset = manifest.assets.find((item) => item.id === assetId && item.platforms.includes(platform)); if (!asset) throw new Error("Sandbox asset is not available for this platform.");
    let offset = await this.store.size(asset.id); if (offset > asset.sizeBytes) { await this.store.remove(asset.id); offset = 0; }
    const response = await this.fetchImpl(asset.url, { headers: offset ? { Range: `bytes=${offset}-` } : {}, redirect: "error" });
    if (!response.ok || !response.body || (offset > 0 && response.status !== 206)) { await this.store.remove(asset.id); throw new Error("Sandbox asset download failed."); }
    const reader = response.body.getReader(); let received = offset;
    try { for (;;) { const { done, value } = await reader.read(); if (done) break; received += value.byteLength; if (received > asset.sizeBytes) throw new Error("Sandbox asset exceeded its declared size."); await this.store.append(asset.id, value); } const bytes = await this.store.read(asset.id); const digest = hex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as BufferSource))); if (bytes.byteLength !== asset.sizeBytes || digest !== asset.sha256.toLowerCase()) throw new Error("Sandbox asset integrity verification failed."); await this.store.commit(asset.id, { version: asset.version, sha256: digest }); } catch (error) { await this.store.remove(asset.id); throw error; }
  }
}
