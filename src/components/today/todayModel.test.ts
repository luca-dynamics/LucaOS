import { describe, expect, it } from "vitest";
import { greetingForHour, todayActionStatusLabel } from "./todayModel";

describe("greetingForHour", () => {
  it("maps hours to time-of-day greetings", () => {
    expect(greetingForHour(2)).toBe("Good night");
    expect(greetingForHour(8)).toBe("Good morning");
    expect(greetingForHour(14)).toBe("Good afternoon");
    expect(greetingForHour(20)).toBe("Good evening");
    expect(greetingForHour(23)).toBe("Good night");
  });
});

describe("todayActionStatusLabel", () => {
  it("labels pending as Approve and done as Done", () => {
    expect(todayActionStatusLabel("pending")).toBe("Approve");
    expect(todayActionStatusLabel("done")).toBe("Done");
    expect(todayActionStatusLabel("info")).toBe("");
  });
});
