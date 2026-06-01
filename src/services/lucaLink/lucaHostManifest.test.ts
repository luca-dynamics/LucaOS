import { describe, expect, it } from "vitest";
import {
  LUCA_HOST_MANIFEST_SCHEMA_VERSION,
  type LucaHostManifest,
} from "./lucaHostManifest";
import {
  createDefaultHostManifest,
  mergeManifestStatus,
  normalizeManifest,
  validateHostManifest,
} from "./capabilityRegistry";

const FIXED_NOW = 1_700_000_000_000;

describe("lucaHostManifest", () => {
  it("default manifest carries the v1 schema version", () => {
    const manifest = createDefaultHostManifest({
      deviceId: "dev-1",
      now: FIXED_NOW,
    });
    expect(manifest.schemaVersion).toBe("luca-host-manifest/v1");
    expect(LUCA_HOST_MANIFEST_SCHEMA_VERSION).toBe("luca-host-manifest/v1");
  });

  it("default manifest is internally consistent and conservative", () => {
    const manifest = createDefaultHostManifest({
      deviceId: "dev-1",
      platform: "unknown",
      now: FIXED_NOW,
    });

    // Unknown platform → least-privilege guest.
    expect(manifest.hostRole).toBe("guest");
    expect(manifest.trust.trustLevel).toBe("guest");
    expect(manifest.capabilities.chat).toBe(true);
    expect(manifest.capabilities.shellAccess).toBe(false);
    expect(manifest.status.online).toBe(false);
    expect(manifest.createdAt).toBe(FIXED_NOW);
    expect(manifest.updatedAt).toBe(FIXED_NOW);
    expect(validateHostManifest(manifest).valid).toBe(true);
  });

  it("validates a well-formed manifest and rejects malformed vocab", () => {
    const manifest = createDefaultHostManifest({
      deviceId: "dev-1",
      platform: "macos",
      isLocalOrigin: true,
      now: FIXED_NOW,
    });
    expect(validateHostManifest(manifest)).toEqual({
      valid: true,
      errors: [],
    });

    const broken = {
      ...manifest,
      hostRole: "wizard",
      platform: "atari",
      trust: { ...manifest.trust, trustLevel: "superuser" },
    } as unknown as LucaHostManifest;
    const result = validateHostManifest(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("normalizeManifest fills defaults without dropping provided fields", () => {
    const normalized = normalizeManifest(
      {
        deviceId: "dev-2",
        deviceName: "Studio",
        platform: "windows",
        capabilities: { shellAccess: true } as LucaHostManifest["capabilities"],
      },
      { now: FIXED_NOW },
    );

    expect(normalized.schemaVersion).toBe("luca-host-manifest/v1");
    expect(normalized.deviceName).toBe("Studio");
    expect(normalized.capabilities.shellAccess).toBe(true);
    // Untouched capability flags keep their conservative defaults.
    expect(normalized.capabilities.chat).toBe(true);
    expect(normalized.models.chatModels).toEqual([]);
    expect(validateHostManifest(normalized).valid).toBe(true);
  });

  it("mergeManifestStatus is pure and advances updatedAt", () => {
    const manifest = createDefaultHostManifest({
      deviceId: "dev-3",
      now: FIXED_NOW,
    });
    const merged = mergeManifestStatus(
      manifest,
      { online: true, activeAppState: "foreground" },
      { now: FIXED_NOW + 5_000 },
    );

    expect(merged.status.online).toBe(true);
    expect(merged.status.activeAppState).toBe("foreground");
    expect(merged.updatedAt).toBe(FIXED_NOW + 5_000);
    // Original is untouched.
    expect(manifest.status.online).toBe(false);
    expect(manifest.updatedAt).toBe(FIXED_NOW);
  });
});
