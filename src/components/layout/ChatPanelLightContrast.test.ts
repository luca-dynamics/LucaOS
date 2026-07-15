import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");

describe("ChatPanel light-skin contrast", () => {
  it("uses semantic text hierarchy instead of compounding low opacity", () => {
    const source = readFileSync("src/components/layout/ChatPanel.tsx", "utf8");
    expect(source).not.toContain('greeting.suffix ? "opacity-40');
    expect(source).toContain("--luca-text-secondary");
    expect(source).toContain("--luca-text-tertiary");
    expect(source).not.toContain('className="text-sm opacity-50 text-center"');
  });
});
