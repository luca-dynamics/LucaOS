import { describe, expect, it } from "vitest";
import { verifyLocalModelArtifact } from "../LocalModelArtifactIntegrity";

describe("LocalModelArtifactIntegrity", () => {
  it("verifies catalog SHA-256 checksums", async () => {
    const result = await verifyLocalModelArtifact(
      { sha256: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824" },
      new TextEncoder().encode("hello"),
    );
    expect(result.verified).toBe(true);
  });

  it("rejects missing and mismatched checksums", async () => {
    await expect(
      verifyLocalModelArtifact(undefined, new Uint8Array()),
    ).resolves.toMatchObject({ verified: false });
    await expect(
      verifyLocalModelArtifact(
        { sha256: "0".repeat(64) },
        new TextEncoder().encode("hello"),
      ),
    ).resolves.toMatchObject({ verified: false });
  });
});
