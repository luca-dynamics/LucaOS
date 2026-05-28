import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const personalityServiceSource = readFileSync("src/services/personalityService.ts", "utf8");
const awarenessServiceSource = readFileSync("src/services/awarenessService.ts", "utf8");

describe("Luca runtime persona safety integration", () => {
  it("personality context includes canonical identity boundaries and memory disclosure", () => {
    expect(personalityServiceSource).toContain("CANONICAL LUCA IDENTITY & BOUNDARIES");
    expect(personalityServiceSource).toContain("identitySnapshot.systemIdentitySummary");
    expect(personalityServiceSource).toContain("identitySnapshot.runtimeToneGuidance");
    expect(personalityServiceSource).toContain("Do not imply hidden memory");
  });

  it("voice system instruction includes canonical identity guidance without rewriting provider runtime", () => {
    expect(personalityServiceSource).toContain('surface: "voice"');
    expect(personalityServiceSource).toContain("identitySnapshot.systemIdentitySummary");
    expect(personalityServiceSource).toContain("without claiming human feelings");
    expect(personalityServiceSource).not.toMatch(/provider\s*=|brainProvider\s*=|navigator\.mediaDevices/);
  });

  it("lastSeen calculation uses previous lastSeen before updating it", () => {
    const previousIndex = personalityServiceSource.indexOf("const previousLastSeen");
    const calculationIndex = personalityServiceSource.indexOf("calculateHoursSinceLastSeen", previousIndex);
    const updateIndex = personalityServiceSource.indexOf("this.personality.relationship.lastSeen = context.timestamp");

    expect(previousIndex).toBeGreaterThan(-1);
    expect(calculationIndex).toBeGreaterThan(previousIndex);
    expect(updateIndex).toBeGreaterThan(calculationIndex);
  });

  it("unsafe human-alive and dependency phrasing is removed from personality and awareness text", () => {
    const runtimeText = `${personalityServiceSource}\n${awarenessServiceSource}`;

    const unsafePhrases = [
      ["prove you are", ["A", "LIVE"].join("")].join(" "),
      ["genuine", "excitement"].join(" "),
      ["I'm fully", "here"].join(" "),
      ["local autonomy", "is active"].join(" "),
      ["ready", "to breach"].join(" "),
      ["take control", "and get it done"].join(" "),
      ["Missed", "the operator"].join(" "),
      ["Like old", "friends"].join(" "),
      ["relationship", "persist"].join(" "),
    ];

    unsafePhrases.forEach((phrase) => {
      expect(runtimeText).not.toContain(phrase);
    });
  });

  it("awareness suggestions guide or prepare steps instead of implying autonomous control", () => {
    expect(awarenessServiceSource).toContain("Guide me through connecting my Notion workspace");
    expect(awarenessServiceSource).toContain("Guide me through syncing Google Drive");
    expect(awarenessServiceSource).toContain("Help me prepare an AI memory import");
    expect(awarenessServiceSource).toContain("ask before taking any browser or system action");
    expect(awarenessServiceSource).not.toContain(["[AUTONOMOUS", "ACTION]"].join(" "));
    expect(awarenessServiceSource).not.toContain(["You have", "full control"].join(" "));
  });
});
