import { describe, expect, it } from "vitest";
import {
  pendingCount,
  trustStatusColor,
  trustStatusLabel,
  type TrustEvent,
} from "./trustLedgerModel";

const ev = (status: TrustEvent["status"]): TrustEvent => ({
  id: status,
  title: status,
  time: "now",
  status,
});

describe("pendingCount", () => {
  it("counts only pending events", () => {
    expect(
      pendingCount([ev("pending"), ev("completed"), ev("pending"), ev("blocked")]),
    ).toBe(2);
    expect(pendingCount([])).toBe(0);
  });
});

describe("trust status helpers", () => {
  it("labels each status in plain language", () => {
    expect(trustStatusLabel("completed")).toBe("Done");
    expect(trustStatusLabel("pending")).toBe("Waiting for you");
    expect(trustStatusLabel("blocked")).toBe("Blocked");
  });

  it("maps status to a token-backed color with fallback", () => {
    expect(trustStatusColor("completed")).toContain("--luca-success");
    expect(trustStatusColor("pending")).toContain("--luca-warning");
    expect(trustStatusColor("blocked")).toContain("--luca-danger");
  });
});
