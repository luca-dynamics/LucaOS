import { describe, expect, it, beforeEach } from "vitest";
import { DiagnosticDeltaService } from "./diagnosticDeltaService";

describe("DiagnosticDeltaService", () => {
  let deltaService: DiagnosticDeltaService;

  beforeEach(() => {
    deltaService = new DiagnosticDeltaService();
  });

  it("captures baseline and detects newly introduced unclosed bracket error", () => {
    const filePath = "src/example.ts";
    const baselineCode = "function test() {\n  return true;\n}";
    const postEditCode = "function test() {\n  return true;\n"; // Unclosed brace

    deltaService.snapshotBaseline(filePath, baselineCode);
    const result = deltaService.evaluateDelta(filePath, postEditCode);

    expect(result.hasRegressions).toBe(true);
    expect(result.newErrorsCount).toBe(1);
    expect(result.alertText).toContain("[[DIAGNOSTIC_DELTA_REGRESSION]]");
    expect(result.alertText).toContain("Unclosed bracket '{'");
  });

  it("detects invalid JSON syntax error", () => {
    const filePath = "config.json";
    const validJson = '{\n  "name": "LucaOS"\n}';
    const invalidJson = '{\n  "name": "LucaOS",\n}'; // Trailing comma

    deltaService.snapshotBaseline(filePath, validJson);
    const result = deltaService.evaluateDelta(filePath, invalidJson);

    expect(result.hasRegressions).toBe(true);
    expect(result.alertText).toContain("JSON Syntax Error");
  });

  it("detects resolved errors when edit fixes syntax", () => {
    const filePath = "src/broken.ts";
    const brokenCode = "function test() {\n  return true;\n";
    const fixedCode = "function test() {\n  return true;\n}";

    deltaService.snapshotBaseline(filePath, brokenCode);
    const result = deltaService.evaluateDelta(filePath, fixedCode);

    expect(result.hasRegressions).toBe(false);
    expect(result.resolvedErrorsCount).toBe(1);
    expect(result.alertText).toContain("[[DIAGNOSTIC_DELTA_FIXED]]");
  });

  it("returns clean result when edit introduces no new regressions", () => {
    const filePath = "src/clean.ts";
    const code1 = "const a = 1;\nconst b = 2;";
    const code2 = "const a = 1;\nconst b = 2;\nconst c = 3;";

    deltaService.snapshotBaseline(filePath, code1);
    const result = deltaService.evaluateDelta(filePath, code2);

    expect(result.hasRegressions).toBe(false);
    expect(result.newErrorsCount).toBe(0);
    expect(result.alertText).toBe("");
  });
});
