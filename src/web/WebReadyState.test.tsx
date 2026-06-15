import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");
const source = readFileSync("src/web/WebReadyState.tsx", "utf8");

describe("WebReadyState", () => {
  it("exposes the explicit continuation action", () => {
    expect(source).toContain("onContinueToShell: () => void");
    expect(source).toContain("onClick={onContinueToShell}");
    expect(source).toContain("Continue to LucaOS Web Shell");
  });
});
