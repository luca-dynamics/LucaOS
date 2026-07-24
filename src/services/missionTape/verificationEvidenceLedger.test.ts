import { describe, expect, it, beforeEach } from "vitest";
import { VerificationEvidenceLedger } from "./verificationEvidenceLedger";

describe("VerificationEvidenceLedger", () => {
  let ledger: VerificationEvidenceLedger;

  beforeEach(() => {
    ledger = new VerificationEvidenceLedger();
  });

  it("records verification evidence and canonicalizes command", async () => {
    const record = await ledger.recordEvidence({
      command: "npx vitest run   src/test.ts ",
      passed: true,
      exitCode: 0,
      scope: "src/test.ts",
      outputSummary: "✓ 4/4 tests passed",
    });

    expect(record.canonicalCommand).toBe("npx vitest run src/test.ts");
    expect(record.passed).toBe(true);
    expect(record.exitCode).toBe(0);
    expect(record.scope).toBe("src/test.ts");
  });

  it("retrieves latest proof for a command", async () => {
    await ledger.recordEvidence({
      command: "npm test",
      passed: false,
      exitCode: 1,
      outputSummary: "Failed 1 test",
    });

    await ledger.recordEvidence({
      command: "npm test",
      passed: true,
      exitCode: 0,
      outputSummary: "Passed all tests",
    });

    const latest = await ledger.getLatestProof("npm test");
    expect(latest).not.toBeNull();
    expect(latest?.passed).toBe(true);
    expect(latest?.outputSummary).toBe("Passed all tests");
  });

  it("queries evidence by file or repo scope", async () => {
    await ledger.recordEvidence({
      command: "pytest tests/unit",
      passed: true,
      exitCode: 0,
      scope: "tests/unit/test_app.py",
    });

    const scopeEvidence = await ledger.getEvidenceForScope("tests/unit");
    expect(scopeEvidence.length).toBe(1);
    expect(scopeEvidence[0].passed).toBe(true);
  });

  it("prunes expired evidence older than TTL", async () => {
    const record = await ledger.recordEvidence({
      command: "cargo test",
      passed: true,
      exitCode: 0,
    });

    // Artificially age timestamp
    (record as any).timestamp = "2020-01-01T00:00:00.000Z";

    const pruned = await ledger.clearExpiredEvidence(30);
    expect(pruned).toBe(1);

    const recent = await ledger.listRecentEvidence();
    expect(recent.length).toBe(0);
  });
});
