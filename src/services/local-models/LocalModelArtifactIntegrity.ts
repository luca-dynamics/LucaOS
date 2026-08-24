import type { LocalModelArtifact } from "./LocalModelTypes";

export interface ArtifactIntegrityResult {
  verified: boolean;
  expectedSha256?: string;
  actualSha256?: string;
  reason: string;
}

export async function verifyLocalModelArtifact(
  artifact: LocalModelArtifact | undefined,
  bytes: ArrayBuffer | Uint8Array,
): Promise<ArtifactIntegrityResult> {
  const expected = normalizeSha256(artifact?.sha256);
  if (!expected) {
    return {
      verified: false,
      reason: "Artifact has no valid SHA-256 checksum in the canonical catalog.",
    };
  }
  if (!globalThis.crypto?.subtle) {
    return {
      verified: false,
      expectedSha256: expected,
      reason: "SHA-256 verification is unavailable in this runtime.",
    };
  }
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const digestInput = new Uint8Array(input).buffer;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", digestInput);
  const actual = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return {
    verified: actual === expected,
    expectedSha256: expected,
    actualSha256: actual,
    reason:
      actual === expected
        ? "Artifact checksum verified."
        : "Artifact checksum does not match the canonical catalog.",
  };
}

function normalizeSha256(value?: string): string | undefined {
  const normalized = value?.trim().toLowerCase().replace(/^sha256:/, "");
  return normalized && /^[a-f0-9]{64}$/.test(normalized)
    ? normalized
    : undefined;
}
