import { describe, expect, it } from "vitest";
import { MissionTapeCompressor } from "./missionTapeCompressor";
import type { MissionTapeRecord } from "./types";

describe("MissionTapeCompressor", () => {
  const compressor = new MissionTapeCompressor();

  const mockTape: MissionTapeRecord = {
    missionId: "mission-101",
    intent: "Build feature with OpenAI key sk-1234567890abcdef1234567890abcdef",
    status: "completed",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    steps: [
      {
        stepId: "step-1",
        goal: "Fetch configuration with Bearer SecretToken12345",
        status: "executed",
        notes: '{"apiKey": "AIzaSy1234567890abcdef1234567890abcdef"}',
        timestamp: new Date().toISOString(),
      },
      {
        stepId: "step-2",
        goal: "Compile source code",
        status: "verified",
        notes: "Build succeeded in 1.2s",
        timestamp: new Date().toISOString(),
      },
    ],
    guard: [],
    verification: [
      {
        stepId: "verify-1",
        passed: true,
        details: "100% tests passed",
        timestamp: new Date().toISOString(),
      },
    ],
    recovery: [],
    result: { status: "success", artifact: "dist/bundle.js" },
  };

  it("redacts sensitive keys, Bearer tokens, and passwords from input text", () => {
    const raw = "OpenAI key sk-abcdef1234567890abcdef1234567890 and Bearer mytoken123 and \"password\":\"secret123\"";
    const sanitized = compressor.sanitize(raw);

    expect(sanitized).not.toContain("sk-abcdef1234567890abcdef1234567890");
    expect(sanitized).toContain("[REDACTED_API_KEY]");
    expect(sanitized).toContain("Bearer [REDACTED_TOKEN]");
    expect(sanitized).toContain('"password":"[REDACTED]"');
  });

  it("compresses a MissionTapeRecord into ShareGPT format", () => {
    const result = compressor.compressTape(mockTape, { format: "sharegpt" });

    expect(result.formattedTrajectory).toBeDefined();
    expect(result.jsonlRow).toContain('"messages":');
    expect(result.jsonlRow).not.toContain("sk-1234567890");
    expect(result.jsonlRow).toContain("[REDACTED_API_KEY]");
    expect(result.reductionPercentage).toBeGreaterThanOrEqual(0);
  });

  it("compresses a MissionTapeRecord into Alpaca format", () => {
    const result = compressor.compressTape(mockTape, { format: "alpaca" });

    expect(result.formattedTrajectory).toBeDefined();
    expect(result.jsonlRow).toContain('"instruction":');
    expect(result.jsonlRow).toContain('"input":');
    expect(result.jsonlRow).toContain('"output":');
  });

  it("exports a dataset string with multiple JSONL rows", () => {
    const tapes: MissionTapeRecord[] = [
      mockTape,
      { ...mockTape, missionId: "mission-102", status: "failed" }, // Should be filtered out by default
      { ...mockTape, missionId: "mission-103", status: "completed" },
    ];

    const datasetJsonl = compressor.exportDataset(tapes, { filterCompletedOnly: true });
    const lines = datasetJsonl.trim().split("\n");

    expect(lines.length).toBe(2); // Only mission-101 and mission-103
    expect(lines[0]).toContain("mission-101");
    expect(lines[1]).toContain("mission-103");
  });
});
